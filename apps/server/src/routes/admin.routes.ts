import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  rejectTutorSchema, inviteAdminSchema, acceptAdminInviteSchema, cancelBookingSchema,
  setUserStatusSchema, resolveDisputeSchema, moderateReviewSchema, replySupportTicketSchema,
  updateSupportTicketSchema, saveSettingsSchema,
} from '../validation/admin.schemas.js';
import { adminInviteAcceptRateLimit } from '../middleware/rateLimit.js';
import * as adminService from '../services/admin.service.js';
import * as operations from '../services/adminOperations.service.js';

const router = Router();

// Public: the invited admin has no Mentora session yet, so these two must sit
// ahead of the requireAuth/requireAdmin gate applied to the rest of this router.
router.get('/invites/verify', adminInviteAcceptRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.verifyInviteToken(String(req.query.token ?? ''));
  res.json({ success: true, message: 'OK', data });
}));
router.post('/invites/accept', adminInviteAcceptRateLimit, validate(acceptAdminInviteSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.acceptInvite(req.body.token, req.body.password);
  res.json({ success: true, message: 'Account activated', data });
}));

router.use(requireAuth, requireAdmin);

router.get('/tutors/pending', asyncHandler(async (_req: Request, res: Response) => {
  const tutors = await adminService.listPendingTutors();
  res.json({ success: true, message: 'OK', data: { tutors } });
}));

router.post('/tutors/:userId/approve', asyncHandler(async (req: Request, res: Response) => {
  await adminService.approveTutor(req.params.userId, req.user!.id);
  res.json({ success: true, message: 'Tutor approved' });
}));

router.post('/tutors/:userId/reject', validate(rejectTutorSchema), asyncHandler(async (req: Request, res: Response) => {
  await adminService.rejectTutor(req.params.userId, req.body.reason, req.user!.id);
  res.json({ success: true, message: 'Tutor rejected' });
}));

const query = (req: Request) => ({ page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20, q: String(req.query.q ?? ''), role: req.query.role ? String(req.query.role) : undefined, status: req.query.status ? String(req.query.status) : undefined, type: req.query.type ? String(req.query.type) : undefined });

router.get('/dashboard', asyncHandler(async (_req, res) => res.json({ success: true, message: 'OK', data: await operations.dashboard() })));
router.get('/search', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.globalSearch(String(req.query.q ?? '')) })));
router.get('/users', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listUsers(query(req)) })));
router.get('/users/:id', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.getUserDetail(req.params.id) })));
router.post('/users/:id/status', validate(setUserStatusSchema), asyncHandler(async (req, res) => { await operations.setUserStatus(req.user!.id, req.params.id, req.body.status, req.body.reason); res.json({ success: true, message: 'Account status updated' }); }));
router.get('/bookings', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listBookings(query(req)) })));
router.post('/bookings/:id/cancel', validate(cancelBookingSchema), asyncHandler(async (req, res) => { await operations.cancelBooking(req.user!.id, req.params.id, req.body.reason); res.json({ success: true, message: 'Booking cancelled and refund processed' }); }));
router.get('/transactions', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listTransactions(query(req)) })));
router.get('/disputes', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listDisputes(query(req)) })));
router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), asyncHandler(async (req, res) => { await operations.resolveDispute(req.user!.id, req.params.id, req.body.status, req.body.resolution, req.body.refund); res.json({ success: true, message: 'Dispute updated' }); }));
router.get('/reviews/tutors', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listReviewTutors(query(req)) })));
router.get('/reviews/tutors/:id', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.tutorReviews(req.params.id, Number(req.query.page) || 1, Number(req.query.pageSize) || 20, String(req.query.sort ?? 'recent')) })));
router.post('/reviews/:id/moderate', validate(moderateReviewSchema), asyncHandler(async (req, res) => { await operations.moderateReview(req.user!.id, req.params.id, req.body.status, req.body.reason); res.json({ success: true, message: 'Review moderation updated' }); }));
router.get('/support', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listTickets(query(req)) })));
router.post('/support/:id/messages', validate(replySupportTicketSchema), asyncHandler(async (req, res) => { await operations.replyTicket(req.user!.id, req.params.id, req.body.body, req.body.internal); res.json({ success: true, message: req.body.internal ? 'Internal note added' : 'Reply sent' }); }));
router.patch('/support/:id', validate(updateSupportTicketSchema), asyncHandler(async (req, res) => { await operations.updateTicket(req.user!.id, req.params.id, req.body.status, req.body.priority); res.json({ success: true, message: 'Ticket updated' }); }));
router.get('/settings', asyncHandler(async (_req, res) => res.json({ success: true, message: 'OK', data: { settings: await operations.getSettings() } })));
router.put('/settings', validate(saveSettingsSchema), asyncHandler(async (req, res) => { await operations.saveSettings(req.user!.id, req.body.values); res.json({ success: true, message: 'Settings saved' }); }));

router.get('/invites', asyncHandler(async (_req, res) => res.json({ success: true, message: 'OK', data: { items: await adminService.listInvites() } })));
router.post('/invites', validate(inviteAdminSchema), asyncHandler(async (req, res) => {
  const invite = await adminService.inviteAdmin(req.user!.id, req.user!.name, req.body.email);
  res.status(201).json({ success: true, message: 'Invite sent', data: { invite } });
}));
router.post('/invites/:id/revoke', asyncHandler(async (req, res) => {
  await adminService.revokeInvite(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Invite revoked' });
}));

export default router;
