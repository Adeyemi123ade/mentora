import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import {
  rejectTutorSchema, inviteAdminSchema, acceptAdminInviteSchema, cancelBookingSchema,
  setUserStatusSchema, resolveDisputeSchema, moderateReviewSchema, replySupportTicketSchema,
  updateSupportTicketSchema, saveSettingsSchema,
} from '../../validation/admin.schemas.js';

const tags = ['Admin'];
const auth = [{ bearerAuth: [] }];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const adminDesc = 'ADMIN role only (router.use(requireAuth, requireAdmin) in routes/admin.routes.ts).';

// The req.params.id used across these routes is not consistently named the same underlying
// entity, so each path below labels it precisely (userId, booking id, dispute id, etc).

// --- Public (mounted ahead of the requireAuth/requireAdmin gate — see routes/admin.routes.ts) ---

registry.registerPath({
  method: 'get', path: '/api/admin/invites/verify', tags,
  summary: 'Verify an admin-invite token (public)',
  description: "No auth — the invited admin has no Mentora session yet. Used by the Set Password page to identify the invited email before showing the form. Rate-limited.",
  request: { query: z.object({ token: z.string() }) },
  responses: { ...common.ok(z.object({ email: z.string().email() })), 404: { description: 'Invite link is invalid or already used', content: { 'application/json': { schema: z.object({ success: z.literal(false), message: z.string(), error: z.literal('INVITE_INVALID') }) } } }, 410: { description: 'Invite link has expired', content: { 'application/json': { schema: z.object({ success: z.literal(false), message: z.string(), error: z.literal('INVITE_EXPIRED') }) } } }, ...common.rateLimited() },
});

registry.registerPath({
  method: 'post', path: '/api/admin/invites/accept', tags,
  summary: 'Accept an admin invite and set a password (public)',
  description: 'No auth. Creates the Supabase auth user and the local ADMIN account, consumes the invite token (single use, 10-minute expiry). Rate-limited.',
  request: { body: jsonBody(acceptAdminInviteSchema) },
  responses: { ...common.ok(z.object({ email: z.string().email() }), 'Account activated'), ...common.validationError, 404: { description: 'Invite link is invalid or already used' }, 410: { description: 'Invite link has expired' }, ...common.conflict('This email already has a Mentora account'), ...common.rateLimited() },
});

// --- Admin-gated ---

registry.registerPath({
  method: 'get', path: '/api/admin/tutors/pending', tags, security: auth, summary: 'List tutors awaiting verification', description: adminDesc,
  responses: { ...common.ok(z.object({ tutors: entityArray('Includes signed URLs for uploaded ID/certificate documents.') })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/tutors/{userId}/approve', tags, security: auth, summary: 'Approve a pending tutor', description: adminDesc,
  request: { params: z.object({ userId: z.string() }) },
  responses: { ...common.okNoData('Tutor approved'), ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'post', path: '/api/admin/tutors/{userId}/reject', tags, security: auth, summary: 'Reject a pending tutor', description: adminDesc,
  request: { params: z.object({ userId: z.string() }), body: jsonBody(rejectTutorSchema) },
  responses: { ...common.okNoData('Tutor rejected'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/dashboard', tags, security: auth, summary: 'Dashboard metrics, recent registrations, recent bookings', description: adminDesc,
  responses: { ...common.ok(entity('')), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'get', path: '/api/admin/search', tags, security: auth, summary: 'Global admin search across users/bookings/etc', description: adminDesc,
  request: { query: z.object({ q: z.string().optional() }) },
  responses: { ...common.ok(entity('Grouped results by entity type.')), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

const listQuery = z.object({
  page: z.coerce.number().int().optional().openapi({ example: 1 }),
  pageSize: z.coerce.number().int().optional().openapi({ example: 20 }),
  q: z.string().optional(),
  role: z.string().optional().openapi({ description: 'PARENT | TUTOR | STUDENT | ADMIN' }),
  status: z.string().optional().openapi({ description: "Varies by endpoint — e.g. ACTIVE/SUSPENDED/DEACTIVATED for users, or the literal 'DELETED' pseudo-status to list anonymized/deleted accounts." }),
  type: z.string().optional(),
});

registry.registerPath({
  method: 'get', path: '/api/admin/users', tags, security: auth, summary: 'List/search/filter users (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'get', path: '/api/admin/users/{id}', tags, security: auth, summary: 'Get full detail for one user (profile, role-specific data, booking history)', description: adminDesc,
  request: { params: z.object({ id: z.string() }) },
  responses: { ...common.ok(entity('')), ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'post', path: '/api/admin/users/{id}/status', tags, security: auth, summary: "Change a user's account status (activate/suspend/deactivate)", description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(setUserStatusSchema) },
  responses: { ...common.okNoData('Account status updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/bookings', tags, security: auth, summary: 'List/search/filter bookings (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/bookings/{id}/cancel', tags, security: auth, summary: 'Cancel a booking and process the refund', description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(cancelBookingSchema) },
  responses: { ...common.okNoData('Booking cancelled and refund processed'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/transactions', tags, security: auth, summary: 'List/search/filter transactions (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'get', path: '/api/admin/disputes', tags, security: auth, summary: 'List/search/filter disputes (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/disputes/{id}/resolve', tags, security: auth, summary: 'Resolve/close a dispute, optionally issuing a refund', description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(resolveDisputeSchema) },
  responses: { ...common.okNoData('Dispute updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/reviews/tutors', tags, security: auth, summary: 'List tutors for review moderation (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'get', path: '/api/admin/reviews/tutors/{id}', tags, security: auth, summary: "List one tutor's reviews (paginated, sortable)", description: adminDesc,
  request: { params: z.object({ id: z.string() }), query: z.object({ page: z.coerce.number().int().optional(), pageSize: z.coerce.number().int().optional(), sort: z.string().optional().openapi({ description: "Defaults to 'recent'." }) }) },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/reviews/{id}/moderate', tags, security: auth, summary: 'Moderate a review (publish/flag/remove)', description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(moderateReviewSchema) },
  responses: { ...common.okNoData('Review moderation updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/support', tags, security: auth, summary: 'List/search/filter support tickets (paginated)', description: adminDesc,
  request: { query: listQuery },
  responses: { ...common.ok(z.object({ items: entityArray(''), total: z.number().int() })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/support/{id}/messages', tags, security: auth, summary: 'Reply to a support ticket (optionally as an internal note)', description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(replySupportTicketSchema) },
  responses: { ...common.ok(z.object({}), 'Reply sent, or Internal note added'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'patch', path: '/api/admin/support/{id}', tags, security: auth, summary: "Update a support ticket's status/priority", description: adminDesc,
  request: { params: z.object({ id: z.string() }), body: jsonBody(updateSupportTicketSchema) },
  responses: { ...common.okNoData('Ticket updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/admin/settings', tags, security: auth, summary: 'Get platform settings', description: adminDesc,
  responses: { ...common.ok(z.object({ settings: entity('') })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'put', path: '/api/admin/settings', tags, security: auth, summary: 'Save platform settings', description: adminDesc,
  request: { body: jsonBody(saveSettingsSchema) },
  responses: { ...common.okNoData('Settings saved'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'get', path: '/api/admin/invites', tags, security: auth, summary: 'List admin invites', description: adminDesc,
  responses: { ...common.ok(z.object({ items: entityArray('') })), ...common.unauthorized, ...common.forbidden(adminDesc) },
});

registry.registerPath({
  method: 'post', path: '/api/admin/invites', tags, security: auth, summary: 'Invite a new admin by email', description: adminDesc + ' Fails if the email already has a Mentora account.',
  request: { body: jsonBody(inviteAdminSchema) },
  responses: { ...common.created(z.object({ invite: entity('') }), 'Invite sent'), ...common.validationError, ...common.unauthorized, ...common.forbidden(adminDesc), ...common.conflict('This email already has a Mentora account') },
});

registry.registerPath({
  method: 'post', path: '/api/admin/invites/{id}/revoke', tags, security: auth, summary: 'Revoke a pending admin invite', description: adminDesc,
  request: { params: z.object({ id: z.string() }) },
  responses: { ...common.okNoData('Invite revoked'), ...common.unauthorized, ...common.forbidden(adminDesc), ...common.notFound(), ...common.badRequest('Only pending invites can be revoked') },
});
