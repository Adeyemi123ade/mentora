import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  adminInvite: { findUnique: vi.fn(), update: vi.fn() },
  student: { findMany: vi.fn() },
  savedTutor: { deleteMany: vi.fn() },
  tutorView: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn(), createMany: vi.fn() },
  userPreferences: { deleteMany: vi.fn() },
  paymentMethod: { deleteMany: vi.fn() },
  tutorAvailability: { deleteMany: vi.fn() },
  tutorProfile: { deleteMany: vi.fn() },
}));
vi.mock('../db.js', () => ({ default: db }));

const supabaseMock = vi.hoisted(() => ({
  supabase: {},
  supabaseAdmin: { auth: { admin: { deleteUser: vi.fn(), generateLink: vi.fn() } } },
}));
vi.mock('../lib/supabase.js', () => supabaseMock);

const studentServiceMock = vi.hoisted(() => ({ deleteStudent: vi.fn() }));
vi.mock('./student.service.js', () => studentServiceMock);

const emailServiceMock = vi.hoisted(() => ({ sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() }));
vi.mock('./email.service.js', () => emailServiceMock);
vi.mock('./loginEvent.service.js', () => ({ logEvent: vi.fn() }));

import { syncUserFromSupabase, deleteAccount, requestPasswordReset } from './auth.service.js';

const supabaseUser = {
  id: 'sb-1',
  email: 'invitee@example.com',
  user_metadata: {},
  app_metadata: {},
  email_confirmed_at: '2026-01-01T00:00:00Z',
};

const createdUser = {
  id: 'user-1',
  email: 'invitee@example.com',
  name: 'invitee',
  role: 'ADMIN',
  emailVerified: true,
  hasPassword: false,
  photoUrl: null,
  phone: null,
  location: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(null); // no existing row by supabaseUserId or email
  db.user.findMany.mockResolvedValue([]);
  db.adminInvite.findUnique.mockResolvedValue(null);
});

describe('syncUserFromSupabase — admin invite promotion', () => {
  it('materializes a brand-new user as ADMIN when a PENDING AdminInvite matches their email', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', status: 'PENDING' });
    db.user.create.mockResolvedValue({ ...createdUser, role: 'ADMIN' });

    const result = await syncUserFromSupabase(supabaseUser);

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN' }) })
    );
    expect(db.adminInvite.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: expect.objectContaining({ status: 'ACCEPTED' }),
    });
    expect(result.role).toBe('ADMIN');
  });

  it('falls back to the default PARENT role when no invite exists for the email', async () => {
    db.adminInvite.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ ...createdUser, role: 'PARENT' });

    await syncUserFromSupabase(supabaseUser);

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'PARENT' }) })
    );
    expect(db.adminInvite.update).not.toHaveBeenCalled();
  });

  it('does not promote to ADMIN for an invite that was already accepted or revoked', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', status: 'REVOKED' });
    db.user.create.mockResolvedValue({ ...createdUser, role: 'PARENT' });

    await syncUserFromSupabase(supabaseUser);

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'PARENT' }) })
    );
    expect(db.adminInvite.update).not.toHaveBeenCalled();
  });
});

describe('syncUserFromSupabase — orphaned reemergence trace', () => {
  const supabaseUserWithPassword = { ...supabaseUser, app_metadata: { providers: ['email'] } };

  it('notifies every admin when a password-having Supabase identity has no matching local User row', async () => {
    db.user.create.mockResolvedValue({ ...createdUser, hasPassword: true });
    db.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);

    await syncUserFromSupabase(supabaseUserWithPassword);

    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'ADMIN' } }));
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'admin-1', title: 'Account re-created with no history' }),
        expect.objectContaining({ userId: 'admin-2', title: 'Account re-created with no history' }),
      ],
    });
  });

  it('does not fail the sign-in if notifying admins errors', async () => {
    db.user.create.mockResolvedValue({ ...createdUser, hasPassword: true });
    db.user.findMany.mockRejectedValue(new Error('db down'));

    await expect(syncUserFromSupabase(supabaseUserWithPassword)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('does not trace a genuine first-time Google sign-in (no password set yet)', async () => {
    db.user.create.mockResolvedValue({ ...createdUser, hasPassword: false });

    await syncUserFromSupabase(supabaseUser); // default app_metadata: {} — no providers

    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });

  it('does not trace a brand-new admin invite acceptance even though it will have a password', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', status: 'PENDING' });
    db.user.create.mockResolvedValue({ ...createdUser, role: 'ADMIN', hasPassword: true });

    await syncUserFromSupabase(supabaseUserWithPassword);

    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  beforeEach(() => {
    db.student.findMany.mockResolvedValue([]);
    supabaseMock.supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });
  });

  it('anonymizes the account instead of hard-deleting, so it always succeeds even with historical records', async () => {
    await deleteAccount('user-1', 'sb-1');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: 'Deleted user',
        phone: null,
        location: null,
        photoUrl: null,
        supabaseUserId: null,
        accountStatus: 'DEACTIVATED',
      }),
    });
    const updateCall = db.user.update.mock.calls[0][0];
    expect(updateCall.data.email).toMatch(/^deleted-user-1-[0-9a-f]+@deleted\.mentora\.dev$/);
    expect(supabaseMock.supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('sb-1');
  });

  it("deletes the parent's own students through the existing, tested deleteStudent flow", async () => {
    db.student.findMany.mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }]);

    await deleteAccount('parent-1', 'sb-parent-1');

    expect(studentServiceMock.deleteStudent).toHaveBeenCalledWith('parent-1', 'student-1');
    expect(studentServiceMock.deleteStudent).toHaveBeenCalledWith('parent-1', 'student-2');
  });

  it('cleans up saved tutors, tutor views, notifications, preferences, payment methods, and tutor-only data', async () => {
    await deleteAccount('user-1', 'sb-1');

    expect(db.savedTutor.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ parentId: 'user-1' }, { tutorId: 'user-1' }] } });
    expect(db.tutorView.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ parentId: 'user-1' }, { tutorId: 'user-1' }] } });
    expect(db.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(db.userPreferences.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(db.paymentMethod.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(db.tutorAvailability.deleteMany).toHaveBeenCalledWith({ where: { tutorId: 'user-1' } });
    expect(db.tutorProfile.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('does not fail the whole deletion if Supabase auth cleanup errors', async () => {
    supabaseMock.supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ error: { message: 'boom' } });
    await expect(deleteAccount('user-1', 'sb-1')).resolves.toBeUndefined();
  });
});

describe('requestPasswordReset', () => {
  beforeEach(() => {
    supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
      data: { properties: { email_otp: '482913', action_link: 'https://mentora.dev/reset-password?token=abc' } },
      error: null,
    });
    emailServiceMock.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it('generates a recovery OTP code server-side and delivers it through the app email pipeline (not supabase.auth.resetPasswordForEmail)', async () => {
    await requestPasswordReset('user@example.com');

    expect(supabaseMock.supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recovery', email: 'user@example.com' })
    );
    expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      '482913'
    );
  });

  it('does not throw and does not send an email for an address with no account (anti-enumeration)', async () => {
    supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'User not found' },
    });

    await expect(requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(emailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('surfaces a real error for a genuine delivery failure', async () => {
    supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'Internal error' },
    });

    await expect(requestPasswordReset('user@example.com')).rejects.toMatchObject({
      statusCode: 502,
      code: 'RESET_EMAIL_FAILED',
    });
  });
});
