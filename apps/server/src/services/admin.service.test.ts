import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
  adminInvite: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  adminAuditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../db.js', () => ({ default: db }));

const supabaseMock = vi.hoisted(() => ({
  supabaseAdmin: { auth: { admin: { createUser: vi.fn() } } },
}));
vi.mock('../lib/supabase.js', () => supabaseMock);

const emailMock = vi.hoisted(() => ({ sendAdminInviteEmail: vi.fn() }));
vi.mock('./email.service.js', () => emailMock);

// admin.service.ts also imports storage.service.js (for listPendingTutors'
// document signed URLs, not exercised below) — mock it so the real module
// never loads. It imports env.js directly, which throws at import time in
// any environment without DATABASE_URL/SUPABASE_* configured (e.g. CI).
vi.mock('./storage.service.js', () => ({ createDocumentSignedUrl: vi.fn() }));

import { inviteAdmin, listInvites, revokeInvite, verifyInviteToken, acceptInvite } from './admin.service.js';

const inviter = { id: 'admin-1', name: 'Ada Admin' };

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(null);
  emailMock.sendAdminInviteEmail.mockResolvedValue(undefined);
  db.adminInvite.upsert.mockResolvedValue({
    id: 'invite-1',
    email: 'new-admin@example.com',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    acceptedAt: null,
    invitedBy: { name: inviter.name },
  });
  db.adminAuditLog.create.mockResolvedValue({});
});

describe('inviteAdmin', () => {
  it('sends an invite email with a link carrying a fresh token and creates a PENDING AdminInvite', async () => {
    const invite = await inviteAdmin(inviter.id, inviter.name, 'new-admin@example.com');

    expect(emailMock.sendAdminInviteEmail).toHaveBeenCalledWith(
      'new-admin@example.com',
      inviter.name,
      expect.stringMatching(/^.*\/accept-invite\?token=[0-9a-f]{64}$/)
    );
    expect(db.adminInvite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'new-admin@example.com' },
        create: expect.objectContaining({ email: 'new-admin@example.com', token: expect.any(String), expiresAt: expect.any(Date) }),
      })
    );
    expect(db.adminAuditLog.create).toHaveBeenCalledOnce();
    expect(invite).toEqual({
      id: 'invite-1',
      email: 'new-admin@example.com',
      status: 'PENDING',
      invitedByName: 'Ada Admin',
      createdAt: '2026-01-01T00:00:00.000Z',
      acceptedAt: null,
    });
  });

  it('sets the invite to expire 10 minutes from now', async () => {
    const before = Date.now();
    await inviteAdmin(inviter.id, inviter.name, 'new-admin@example.com');
    const after = Date.now();

    const call = db.adminInvite.upsert.mock.calls[0][0];
    const expiresAt = call.create.expiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 10 * 60 * 1000 - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 1000);
  });

  it('rejects an email that already has a Mentora account without sending an email', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(inviteAdmin(inviter.id, inviter.name, 'parent@example.com')).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
    });
    expect(emailMock.sendAdminInviteEmail).not.toHaveBeenCalled();
  });
});

describe('listInvites', () => {
  it('maps invite rows to DTOs', async () => {
    db.adminInvite.findMany.mockResolvedValue([
      { id: 'invite-1', email: 'a@example.com', status: 'PENDING', createdAt: new Date('2026-01-01T00:00:00Z'), acceptedAt: null, invitedBy: { name: 'Ada Admin' } },
      { id: 'invite-2', email: 'b@example.com', status: 'ACCEPTED', createdAt: new Date('2026-01-02T00:00:00Z'), acceptedAt: new Date('2026-01-03T00:00:00Z'), invitedBy: { name: 'Ada Admin' } },
    ]);
    const invites = await listInvites();
    expect(invites).toHaveLength(2);
    expect(invites[1]).toEqual({
      id: 'invite-2', email: 'b@example.com', status: 'ACCEPTED', invitedByName: 'Ada Admin',
      createdAt: '2026-01-02T00:00:00.000Z', acceptedAt: '2026-01-03T00:00:00.000Z',
    });
  });
});

describe('revokeInvite', () => {
  it('revokes a pending invite, clears its token, and writes an audit log entry', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'PENDING' });
    db.$transaction.mockResolvedValue([{}, {}]);

    await revokeInvite('admin-1', 'invite-1');
    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects revoking an invite that does not exist', async () => {
    db.adminInvite.findUnique.mockResolvedValue(null);
    await expect(revokeInvite('admin-1', 'missing')).rejects.toMatchObject({ statusCode: 404, code: 'INVITE_NOT_FOUND' });
  });

  it('rejects revoking an invite that is already accepted or revoked', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'ACCEPTED' });
    await expect(revokeInvite('admin-1', 'invite-1')).rejects.toMatchObject({ statusCode: 400, code: 'INVITE_NOT_PENDING' });
  });
});

const futureExpiry = new Date(Date.now() + 5 * 60 * 1000);
const pastExpiry = new Date(Date.now() - 5 * 60 * 1000);

describe('verifyInviteToken', () => {
  it('returns the invited email for a valid, unexpired, pending token', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'new-admin@example.com', status: 'PENDING', expiresAt: futureExpiry });
    await expect(verifyInviteToken('good-token')).resolves.toEqual({ email: 'new-admin@example.com' });
  });

  it('rejects an unknown token', async () => {
    db.adminInvite.findUnique.mockResolvedValue(null);
    await expect(verifyInviteToken('bad-token')).rejects.toMatchObject({ statusCode: 404, code: 'INVITE_INVALID' });
  });

  it('rejects a token that has already been accepted', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'ACCEPTED', expiresAt: futureExpiry });
    await expect(verifyInviteToken('used-token')).rejects.toMatchObject({ statusCode: 404, code: 'INVITE_INVALID' });
  });

  it('rejects an expired token', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'PENDING', expiresAt: pastExpiry });
    await expect(verifyInviteToken('old-token')).rejects.toMatchObject({ statusCode: 410, code: 'INVITE_EXPIRED' });
  });
});

describe('acceptInvite', () => {
  beforeEach(() => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'new-admin@example.com', status: 'PENDING', expiresAt: futureExpiry });
    supabaseMock.supabaseAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'sb-user-1' } }, error: null });
    db.$transaction.mockResolvedValue([{}, {}]);
  });

  it('creates the Supabase user and the Mentora ADMIN account, then consumes the invite', async () => {
    const result = await acceptInvite('good-token', 'StrongPass1!');

    expect(supabaseMock.supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-admin@example.com', password: 'StrongPass1!', email_confirm: true })
    );
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({ email: 'new-admin@example.com' });
  });

  it('rejects an unknown or already-used token', async () => {
    db.adminInvite.findUnique.mockResolvedValue(null);
    await expect(acceptInvite('bad-token', 'StrongPass1!')).rejects.toMatchObject({ statusCode: 404, code: 'INVITE_INVALID' });
    expect(supabaseMock.supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'PENDING', expiresAt: pastExpiry });
    await expect(acceptInvite('old-token', 'StrongPass1!')).rejects.toMatchObject({ statusCode: 410, code: 'INVITE_EXPIRED' });
    expect(supabaseMock.supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('rejects if a Mentora account already exists for the invited email', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });
    await expect(acceptInvite('good-token', 'StrongPass1!')).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED' });
    expect(supabaseMock.supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('surfaces a clear error when Supabase account creation fails', async () => {
    supabaseMock.supabaseAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: { message: 'Internal error' } });
    await expect(acceptInvite('good-token', 'StrongPass1!')).rejects.toMatchObject({ statusCode: 502, code: 'INVITE_ACCEPT_FAILED' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
