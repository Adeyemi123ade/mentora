import { randomBytes } from 'node:crypto';
import type { AdminPendingTutorDto, AdminInviteDto } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { supabaseAdmin } from '../lib/supabase.js';
import * as storageService from './storage.service.js';
import { sendAdminInviteEmail } from './email.service.js';

const INVITE_TTL_MS = 10 * 60 * 1000;

export async function listPendingTutors(): Promise<AdminPendingTutorDto[]> {
  const profiles = await prisma.tutorProfile.findMany({
    where: { verificationStatus: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
    orderBy: { submittedAt: 'asc' },
  });

  return Promise.all(profiles.map(async (p) => ({
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
    photoUrl: p.photoUrl ?? p.user.photoUrl,
    professionalTitle: p.professionalTitle,
    bio: p.bio,
    country: p.country,
    city: p.city,
    subjects: p.subjects,
    languages: p.languages,
    gradeLevels: p.gradeLevels,
    yearsExperience: p.yearsExperience,
    qualification: p.qualification,
    institutionName: p.institutionName,
    sessionPrice: p.sessionPrice,
    idType: p.idType,
    idFrontUrl: p.idFrontUrl ? await storageService.createDocumentSignedUrl(p.idFrontUrl) : null,
    idBackUrl: p.idBackUrl ? await storageService.createDocumentSignedUrl(p.idBackUrl) : null,
    certificateUrl: p.certificateUrl ? await storageService.createDocumentSignedUrl(p.certificateUrl) : null,
    supportingDocUrls: await Promise.all(p.supportingDocUrls.map((path) => storageService.createDocumentSignedUrl(path))),
    experienceDescription: p.experienceDescription,
    submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
  })));
}

async function findPendingProfile(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Tutor profile not found', 'PROFILE_NOT_FOUND');
  if (profile.verificationStatus !== 'PENDING') {
    throw new AppError(400, 'This tutor is not awaiting review', 'NOT_PENDING');
  }
  return profile;
}

export async function approveTutor(userId: string, reviewerId: string): Promise<void> {
  const profile = await findPendingProfile(userId);
  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { userId },
      data: { verificationStatus: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: "You're verified!",
        body: 'Your tutor profile has been approved and is now visible to parents.',
      },
    }),
    prisma.tutorVerificationEvent.create({ data: { tutorProfileId: profile.id, reviewerId, status: 'APPROVED', snapshot: { submittedAt: profile.submittedAt, subjects: profile.subjects, qualification: profile.qualification } } }),
    prisma.adminAuditLog.create({ data: { adminId: reviewerId, action: 'TUTOR_APPROVED', entityType: 'TutorProfile', entityId: profile.id } }),
  ]);
}

export async function rejectTutor(userId: string, reason: string, reviewerId: string): Promise<void> {
  const profile = await findPendingProfile(userId);
  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { userId },
      data: { verificationStatus: 'REJECTED', reviewedAt: new Date(), rejectionReason: reason },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: 'Verification update',
        body: `Your tutor verification wasn't approved: ${reason}`,
      },
    }),
    prisma.tutorVerificationEvent.create({ data: { tutorProfileId: profile.id, reviewerId, status: 'REJECTED', reason, snapshot: { submittedAt: profile.submittedAt, subjects: profile.subjects, qualification: profile.qualification } } }),
    prisma.adminAuditLog.create({ data: { adminId: reviewerId, action: 'TUTOR_REJECTED', entityType: 'TutorProfile', entityId: profile.id, reason } }),
  ]);
}

function toInviteDto(invite: { id: string; email: string; status: string; createdAt: Date; acceptedAt: Date | null; invitedBy: { name: string } }): AdminInviteDto {
  return {
    id: invite.id,
    email: invite.email,
    status: invite.status as AdminInviteDto['status'],
    invitedByName: invite.invitedBy.name,
    createdAt: invite.createdAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
  };
}

export async function listInvites(): Promise<AdminInviteDto[]> {
  const invites = await prisma.adminInvite.findMany({
    include: { invitedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return invites.map(toInviteDto);
}

/**
 * Invites a brand-new email address to become an admin. Only ever reachable through
 * requireAdmin-protected routes. Issues our own short-lived, single-use token rather
 * than a Supabase magic link, so the recipient lands directly on a Set Password page
 * (identified by the token) instead of Supabase's own redirect/session flow.
 */
export async function inviteAdmin(inviterId: string, inviterName: string, email: string): Promise<AdminInviteDto> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Admin invites are not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, 'This email already has a Mentora account. Promote them to admin from the Users list instead.', 'EMAIL_ALREADY_REGISTERED');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const link = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/accept-invite?token=${token}`;

  const invite = await prisma.adminInvite.upsert({
    where: { email },
    update: { status: 'PENDING', invitedById: inviterId, acceptedAt: null, token, expiresAt },
    create: { email, invitedById: inviterId, token, expiresAt },
    include: { invitedBy: { select: { name: true } } },
  });

  await sendAdminInviteEmail(email, inviterName, link);

  await prisma.adminAuditLog.create({
    data: { adminId: inviterId, action: 'ADMIN_INVITE_SENT', entityType: 'AdminInvite', entityId: invite.id, metadata: { email } },
  });

  return toInviteDto(invite);
}

export async function revokeInvite(actorId: string, inviteId: string): Promise<void> {
  const invite = await prisma.adminInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError(404, 'Invite not found', 'INVITE_NOT_FOUND');
  if (invite.status !== 'PENDING') throw new AppError(400, 'Only pending invites can be revoked', 'INVITE_NOT_PENDING');

  await prisma.$transaction([
    prisma.adminInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED', token: null } }),
    prisma.adminAuditLog.create({ data: { adminId: actorId, action: 'ADMIN_INVITE_REVOKED', entityType: 'AdminInvite', entityId: inviteId, metadata: { email: invite.email } } }),
  ]);
}

function findPendingInviteByToken(token: string) {
  return prisma.adminInvite.findUnique({ where: { token } });
}

/** Public lookup used by the Set Password page to identify the invited email before showing the form. */
export async function verifyInviteToken(token: string): Promise<{ email: string }> {
  const invite = await findPendingInviteByToken(token);
  if (!invite || invite.status !== 'PENDING') {
    throw new AppError(404, 'This invite link is invalid or has already been used.', 'INVITE_INVALID');
  }
  if (!invite.expiresAt || invite.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'This invite link has expired. Ask an admin to send you a new invite.', 'INVITE_EXPIRED');
  }
  return { email: invite.email };
}

/** Public completion step: creates the Supabase auth user + Mentora ADMIN account and consumes the invite. */
export async function acceptInvite(token: string, password: string): Promise<{ email: string }> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Admin invites are not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const invite = await findPendingInviteByToken(token);
  if (!invite || invite.status !== 'PENDING') {
    throw new AppError(404, 'This invite link is invalid or has already been used.', 'INVITE_INVALID');
  }
  if (!invite.expiresAt || invite.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'This invite link has expired. Ask an admin to send you a new invite.', 'INVITE_EXPIRED');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new AppError(409, 'This email already has a Mentora account. Try signing in instead.', 'EMAIL_ALREADY_REGISTERED');
  }

  const displayName = invite.email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName },
    app_metadata: { role: 'ADMIN' },
  });

  if (error || !data.user) {
    console.error('[admin] Failed to create invited admin account:', error?.message ?? 'no user in response');
    throw new AppError(502, 'Could not activate your account. Please try again.', 'INVITE_ACCEPT_FAILED');
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        supabaseUserId: data.user.id,
        email: invite.email,
        name: displayName,
        role: 'ADMIN',
        emailVerified: true,
        hasPassword: true,
      },
    }),
    prisma.adminInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), token: null } }),
  ]);

  return { email: invite.email };
}
