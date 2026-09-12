import type { User } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { UserSummary, UpdateProfilePayload, SignupPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js';
import * as loginEventService from './loginEvent.service.js';
import { deleteStudent } from './student.service.js';

const SIGNUP_ROLE_VALUES = new Set(['PARENT', 'TUTOR']);

function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    hasPassword: user.hasPassword,
    photoUrl: user.photoUrl,
    phone: user.phone,
    location: user.location,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Supabase links an 'email' identity (and adds it to app_metadata.providers) the moment
 * a password is set on an account — whether at signup or later via password reset — so
 * this stays accurate for Google-only accounts without a separate local flag to maintain.
 */
export function metadataHasPassword(metadata: Record<string, unknown> | undefined): boolean {
  const providers = metadata?.providers;
  return Array.isArray(providers) && providers.includes('email');
}

function metadataName(metadata: Record<string, unknown> | undefined, fallback: string): string {
  if (typeof metadata?.name === 'string' && metadata.name.trim()) return metadata.name.trim();
  if (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) return metadata.full_name.trim();
  return fallback;
}

function metadataRole(metadata: Record<string, unknown> | undefined): 'STUDENT' | 'PARENT' | 'TUTOR' | null {
  const role = metadata?.role;
  return typeof role === 'string' && SIGNUP_ROLE_VALUES.has(role) ? (role as 'STUDENT' | 'PARENT' | 'TUTOR') : null;
}

function metadataPhotoUrl(metadata: Record<string, unknown> | undefined): string | null {
  const avatar = metadata?.avatar_url;
  return typeof avatar === 'string' && avatar ? avatar : null;
}

/** Ensures a local `User` row exists for the given Supabase user and keeps it in sync. */
export async function syncUserFromSupabase(
  supabaseUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    email_confirmed_at?: string | null;
  },
): Promise<UserSummary> {
  const email = supabaseUser.email ?? '';
  const name = metadataName(supabaseUser.user_metadata, email.split('@')[0] || 'Mentora user');
  const photoUrl = metadataPhotoUrl(supabaseUser.user_metadata);
  const emailVerified = Boolean(supabaseUser.email_confirmed_at);
  const hasPassword = metadataHasPassword(supabaseUser.app_metadata);

  let user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseUserId: supabaseUser.id, emailVerified },
      });
    } else {
      // A pending AdminInvite is the only way a brand-new account can become ADMIN —
      // that row is only ever created by an existing admin via adminService.inviteAdmin.
      const pendingInvite = await prisma.adminInvite.findUnique({ where: { email } });
      const isAcceptingAdminInvite = pendingInvite?.status === 'PENDING';

      // A Supabase identity that already has a password credential (set at signup, via
      // password reset, or after a first Google login) can only reach this "create new
      // local user" branch if its matching local User row is missing — every path that
      // sets a password creates that row synchronously in the same request. That
      // combination should be impossible unless the local row was deleted directly in
      // Supabase, outside the app, so it's traced rather than silently re-created as if
      // this were a genuine first-time signup.
      const isOrphanedReemergence = hasPassword && !isAcceptingAdminInvite;

      user = await prisma.user.create({
        data: {
          supabaseUserId: supabaseUser.id,
          email,
          name,
          // Public users may only become parents or tutors. Student identities are
          // provisioned and linked by the parent-owned student workflow.
          role: isAcceptingAdminInvite ? 'ADMIN' : (metadataRole(supabaseUser.app_metadata) ?? 'PARENT'),
          photoUrl,
          emailVerified,
          hasPassword,
        },
      });

      if (isAcceptingAdminInvite) {
        await prisma.adminInvite.update({
          where: { id: pendingInvite!.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
      }

      if (isOrphanedReemergence) {
        await traceOrphanedReemergence(email, supabaseUser.id);
      }
    }
  }

  const nameChanged = user.name !== name;
  const emailChanged = user.email !== email;
  const photoChanged = photoUrl !== null && user.photoUrl !== photoUrl;
  const verificationChanged = user.emailVerified !== emailVerified;
  const hasPasswordChanged = user.hasPassword !== hasPassword;
  if (nameChanged || emailChanged || photoChanged || verificationChanged || hasPasswordChanged) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: nameChanged ? name : user.name,
        email: emailChanged ? email : user.email,
        photoUrl: photoChanged ? photoUrl : user.photoUrl,
        emailVerified,
        hasPassword,
      },
    });
  }

  return toUserSummary(user);
}

/**
 * Best-effort trace for an account that reappeared with no local history (see the
 * isOrphanedReemergence comment above) — logs server-side and notifies every admin, so there's
 * a visible record even though the original booking/message history genuinely can't be
 * recovered. Never allowed to fail the sign-in itself.
 */
async function traceOrphanedReemergence(email: string, supabaseUserId: string): Promise<void> {
  try {
    console.warn(`[auth] Re-created a local account for ${email} (supabaseUserId ${supabaseUserId}) with no matching prior record — this account already had a password set in Supabase, which should be impossible unless its local record was deleted outside the app.`);
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'Account re-created with no history',
          body: `${email} just signed in but had no local record, even though their Supabase login already had a password set. Their account was likely deleted directly in Supabase rather than through the app — their prior booking/message history could not be recovered.`,
        })),
      });
    }
  } catch (err) {
    console.error('[auth] Failed to record the orphaned-reemergence trace:', err);
  }
}

export async function getMe(userId: string): Promise<UserSummary> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toUserSummary(user);
}

export async function signInStudent(loginId: string, password: string) {
  const student = await prisma.student.findUnique({
    where: { loginId },
    include: { accountUser: true },
  });
  if (!student?.accountUser || student.accountUser.role !== 'STUDENT') {
    throw new AppError(401, 'The Student ID or password is incorrect.', 'INVALID_STUDENT_LOGIN');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: student.accountUser.email,
    password,
  });
  if (error || !data.session) {
    throw new AppError(401, 'The Student ID or password is incorrect.', 'INVALID_STUDENT_LOGIN');
  }
  await loginEventService.logEvent(student.accountUser.id, 'LOGIN');
  return { session: data.session, user: toUserSummary(student.accountUser) };
}

export async function updatePhoto(userId: string, photoUrl: string | null): Promise<UserSummary> {
  const user = await prisma.user.update({ where: { id: userId }, data: { photoUrl } });
  return toUserSummary(user);
}

export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<UserSummary> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: payload.name, phone: payload.phone, location: payload.location },
  });
  return toUserSummary(user);
}

export async function logout(userId: string): Promise<void> {
  await loginEventService.logEvent(userId, 'LOGOUT');
}

/**
 * Creates an unconfirmed Supabase account without invoking hosted email, then
 * delivers the generated OTP through the API-owned SMTP configuration.
 */
export async function signup(payload: SignupPayload): Promise<UserSummary> {
  const { name, email, password, role } = payload;

  if (!supabaseAdmin) {
    throw new AppError(503, 'Sign-up is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
    app_metadata: { role },
  });

  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      throw new AppError(409, 'An account with this email already exists. Try signing in instead.', 'EMAIL_TAKEN');
    }
    if (/fetch failed|network|unable to connect/i.test(error.message)) {
      throw new AppError(503, "We couldn't connect to the account service. Please try again in a few minutes.", 'AUTH_SERVICE_UNAVAILABLE');
    }
    console.error('[auth] Supabase signup failed:', error.message);
    throw new AppError(502, 'Could not create your account. Please try again.', 'SIGNUP_FAILED');
  }

  const authUser = data.user;
  if (!authUser) {
    throw new AppError(502, 'Could not create your account. Please try again.', 'SIGNUP_FAILED');
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { supabaseUserId: authUser.id, emailVerified: false, hasPassword: true, role },
    });
  } else {
    user = await prisma.user.create({
      data: { supabaseUserId: authUser.id, email, name, role, emailVerified: false, hasPassword: true },
    });
  }

  await sendSignupOtp(email);

  return toUserSummary(user);
}

// Per-email cooldown for OTP sends, independent of the per-IP rate limiter on the
// /resend-otp route (rateLimit.ts) — that one protects against one IP hammering many
// addresses; this one protects a single address from being flooded from many IPs/devices.
// In-memory by design, matching the existing rate-limit middleware's storage model.
// Matches the 30s countdown already shown in the frontend's resend button (App.tsx)
// so a user who waits out the visible timer never hits this as a surprise 429.
const OTP_EMAIL_COOLDOWN_MS = 30_000;
const lastOtpSentAt = new Map<string, number>();

/** Generates a Supabase OTP and sends it through the API-owned SMTP provider. */
export async function sendSignupOtp(email: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Sign-up is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const key = email.trim().toLowerCase();
  const lastSent = lastOtpSentAt.get(key);
  const now = Date.now();
  if (lastSent && now - lastSent < OTP_EMAIL_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((OTP_EMAIL_COOLDOWN_MS - (now - lastSent)) / 1000);
    throw new AppError(429, `Please wait ${waitSeconds}s before requesting another code.`, 'OTP_COOLDOWN');
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/verify?email=${encodeURIComponent(email)}`,
    },
  });

  if (error || !data?.properties?.email_otp) {
    console.error('[auth] Failed to generate signup OTP:', error?.message ?? 'no OTP in response');
    throw new AppError(502, 'Could not generate a verification code. Please try again.', 'OTP_GENERATE_FAILED');
  }

  await sendVerificationEmail(email, data.properties.email_otp);
  lastOtpSentAt.set(key, now);
}

/**
 * Generates the reset link server-side and delivers it through the API-owned
 * SMTP configuration, matching sendSignupOtp — Supabase's own hosted email
 * dispatch (used by the plain `supabase.auth.resetPasswordForEmail` client
 * call) is not reliably configured for this project, which is exactly why
 * signup already avoids it. Silently no-ops for an email with no account so
 * the caller can't use this to enumerate registered addresses.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Password reset is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/reset-password`,
    },
  });

  if (error || !data?.properties?.email_otp) {
    if (error && /user not found/i.test(error.message)) return;
    console.error('[auth] Failed to generate password reset code:', error?.message ?? 'no email_otp in response');
    throw new AppError(502, 'Could not send the password reset email. Please try again.', 'RESET_EMAIL_FAILED');
  }

  await sendPasswordResetEmail(email, data.properties.email_otp);
}

/**
 * A hard delete of the User row is blocked whenever historical records other
 * accounts or audit trails still reference it (disputes, admin actions,
 * verification reviews, a tutor's past bookings, support correspondence —
 * intentionally non-cascading, see docs/architecture/database-access-and-migrations.md).
 * "Delete Account" anonymizes instead of hard-deleting so it always succeeds:
 * personal data is scrubbed and the account is permanently disabled, while
 * rows other people's history depends on stay intact but de-identified.
 */
export async function deleteAccount(userId: string, supabaseUserId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Account deletion is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const students = await prisma.student.findMany({ where: { parentId: userId } });
  for (const student of students) {
    await deleteStudent(userId, student.id);
  }

  await prisma.savedTutor.deleteMany({ where: { OR: [{ parentId: userId }, { tutorId: userId }] } });
  await prisma.tutorView.deleteMany({ where: { OR: [{ parentId: userId }, { tutorId: userId }] } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.userPreferences.deleteMany({ where: { userId } });
  await prisma.paymentMethod.deleteMany({ where: { userId } });
  await prisma.tutorAvailability.deleteMany({ where: { tutorId: userId } });
  await prisma.tutorProfile.deleteMany({ where: { userId } });

  const placeholderEmail = `deleted-${userId}-${randomBytes(4).toString('hex')}@deleted.mentora.dev`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: placeholderEmail,
      name: 'Deleted user',
      phone: null,
      location: null,
      photoUrl: null,
      supabaseUserId: null,
      accountStatus: 'DEACTIVATED',
      suspendedAt: new Date(),
      suspensionReason: 'Account deleted by user',
    },
  });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
  if (error) {
    console.warn(`[auth] Public user ${userId} anonymized but Supabase auth user cleanup failed: ${error.message}`);
  }
}
