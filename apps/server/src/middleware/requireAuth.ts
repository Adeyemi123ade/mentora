import type { Request, Response, NextFunction } from 'express';
import prisma from '../db.js';
import { supabase } from '../lib/supabase.js';
import { syncUserFromSupabase, metadataHasPassword } from '../services/auth.service.js';
import { AppError } from '../lib/AppError.js';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) throw new AppError(401, 'Not authenticated');

    let supabaseUser: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
      email_confirmed_at?: string | null;
    };
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new AppError(401, 'Invalid or expired session');
      supabaseUser = data.user;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, 'Invalid or expired session');
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
      select: { id: true, email: true, name: true, role: true, emailVerified: true, hasPassword: true, supabaseUserId: true, accountStatus: true },
    });

    if (user) {
      if (user.accountStatus !== 'ACTIVE') {
        throw new AppError(403, user.accountStatus === 'SUSPENDED' ? 'This account is suspended. Contact Mentora support for help.' : 'This account has been deactivated.', 'ACCOUNT_INACTIVE');
      }
      const emailVerified = Boolean(supabaseUser.email_confirmed_at);
      const hasPassword = metadataHasPassword(supabaseUser.app_metadata);
      if (user.emailVerified !== emailVerified || user.hasPassword !== hasPassword) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified, hasPassword },
          select: { id: true, email: true, name: true, role: true, emailVerified: true, hasPassword: true, supabaseUserId: true },
        });
        req.user = updated;
      } else {
        req.user = user;
      }
      next();
      return;
    }

    // First authenticated request for this Supabase account — materialize the local profile.
    const synced = await syncUserFromSupabase(supabaseUser);
    req.user = {
      id: synced.id,
      email: synced.email,
      name: synced.name,
      role: synced.role,
      emailVerified: synced.emailVerified,
      hasPassword: synced.hasPassword,
      supabaseUserId: supabaseUser.id,
    };
    next();
  } catch (err) {
    next(err);
  }
}
