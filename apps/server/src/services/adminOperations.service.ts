import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { refundBookingPayment } from './payment.service.js';

const pageArgs = (page = 1, pageSize = 20) => ({ skip: (Math.max(1, page) - 1) * Math.min(100, pageSize), take: Math.min(100, pageSize) });
const ref = (prefix: string) => `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
const publicId = (role: string, id: string) => `${role.slice(0, 3)}-${id.slice(-8).toUpperCase()}`;

export async function dashboard() {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const [users, parents, students, tutors, pendingTutors, bookings, recentBookings, volume, openDisputes, openTickets, recentUsers] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { role: 'PARENT' } }), prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TUTOR' } }), prisma.tutorProfile.count({ where: { verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.booking.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.booking.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { parent: true, student: true, tutor: true } }),
    prisma.transaction.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, accountStatus: true, photoUrl: true, createdAt: true } }),
  ]);
  return { metrics: { users, parents, students, tutors, pendingTutors, bookings, paymentVolume: volume._sum.amount ?? 0, openDisputes, openTickets }, recentBookings, recentUsers };
}

export async function globalSearch(query: string) {
  const q = query.trim(); if (q.length < 2) return { users: [], bookings: [], payments: [], disputes: [], tickets: [] };
  const contains = { contains: q, mode: 'insensitive' as const };
  const [users, bookings, payments, disputes, tickets] = await Promise.all([
    prisma.user.findMany({ where: { OR: [{ name: contains }, { email: contains }] }, take: 6, select: { id: true, name: true, email: true, role: true, photoUrl: true } }),
    prisma.booking.findMany({ where: { OR: [{ id: contains }, { subject: contains }, { tutorName: contains }] }, take: 6, select: { id: true, subject: true, tutorName: true, status: true } }),
    prisma.transaction.findMany({ where: { OR: [{ id: contains }, { reference: contains }] }, take: 6, select: { id: true, reference: true, amount: true, status: true } }),
    prisma.dispute.findMany({ where: { OR: [{ reference: contains }, { reason: contains }] }, take: 6, select: { id: true, reference: true, reason: true, status: true } }),
    prisma.supportTicket.findMany({ where: { OR: [{ reference: contains }, { subject: contains }] }, take: 6, select: { id: true, reference: true, subject: true, status: true } }),
  ]);
  return { users, bookings, payments, disputes, tickets };
}

const DELETED_SUSPENSION_REASON = 'Account deleted by user';

export async function listUsers(params: { page?: number; pageSize?: number; q?: string; role?: string; status?: string }) {
  const isDeleted = params.status === 'DELETED';
  const where: Prisma.UserWhereInput = {
    ...(params.role ? { role: params.role as never } : {}),
    ...(isDeleted ? { accountStatus: 'DEACTIVATED', suspensionReason: DELETED_SUSPENSION_REASON } : params.status ? { accountStatus: params.status as never } : {}),
    ...(params.q ? { OR: [{ name: { contains: params.q, mode: 'insensitive' } }, { email: { contains: params.q, mode: 'insensitive' } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, accountStatus: true, emailVerified: true, photoUrl: true, phone: true, createdAt: true, suspendedAt: true, loginEvents: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } } } }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map(x => ({ ...x, publicId: publicId(x.role, x.id), lastActive: x.loginEvents[0]?.createdAt ?? null, deletedAt: isDeleted ? x.suspendedAt : undefined, loginEvents: undefined })), total };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, accountStatus: true, emailVerified: true,
      photoUrl: true, phone: true, location: true, createdAt: true, suspendedAt: true, suspensionReason: true,
      loginEvents: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
    },
  });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

  const [bookings, tutorProfile, studentInfo, children] = await Promise.all([
    prisma.booking.findMany({
      where: { OR: [{ parentId: userId }, { tutorId: userId }] },
      orderBy: { date: 'desc' },
      take: 20,
      select: {
        id: true, subject: true, status: true, date: true, startTime: true, total: true,
        student: { select: { fullName: true } },
        tutor: { select: { name: true } },
        parent: { select: { name: true } },
      },
    }),
    user.role === 'TUTOR'
      ? prisma.tutorProfile.findUnique({
          where: { userId },
          select: { professionalTitle: true, subjects: true, gradeLevels: true, yearsExperience: true, qualification: true, verificationStatus: true, sessionPrice: true },
        })
      : null,
    user.role === 'STUDENT'
      ? prisma.student.findFirst({ where: { accountUserId: userId }, select: { fullName: true, age: true, grade: true, interests: true, overallProgress: true } })
      : null,
    user.role === 'PARENT'
      ? prisma.student.findMany({ where: { parentId: userId }, select: { id: true, fullName: true, age: true, grade: true } })
      : null,
  ]);

  const { loginEvents, ...rest } = user;
  return { user: { ...rest, publicId: publicId(user.role, user.id), lastActive: loginEvents[0]?.createdAt ?? null }, bookings, tutorProfile, studentInfo, children };
}

export async function setUserStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED', reason: string) {
  if (adminId === userId) throw new AppError(400, 'You cannot change your own account status.', 'SELF_STATUS_CHANGE');
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { accountStatus: status, suspendedAt: status === 'ACTIVE' ? null : new Date(), suspensionReason: status === 'ACTIVE' ? null : reason } }),
    prisma.adminAuditLog.create({ data: { adminId, action: `USER_${status}`, entityType: 'User', entityId: userId, reason } }),
    prisma.notification.create({ data: { userId, title: 'Account status updated', body: status === 'ACTIVE' ? 'Your Mentora account has been reactivated.' : `Your Mentora account is now ${status.toLowerCase()}. ${reason}` } }),
  ]);
}

export async function listBookings(params: { page?: number; pageSize?: number; q?: string; status?: string }) {
  const where: Prisma.BookingWhereInput = { ...(params.status ? { status: params.status as never } : {}), ...(params.q ? { OR: [{ id: { contains: params.q, mode: 'insensitive' } }, { subject: { contains: params.q, mode: 'insensitive' } }, { tutorName: { contains: params.q, mode: 'insensitive' } }, { student: { fullName: { contains: params.q, mode: 'insensitive' } } }] } : {}) };
  const [items, total] = await Promise.all([prisma.booking.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { createdAt: 'desc' }, include: { parent: { select: { id: true, name: true } }, student: { select: { id: true, fullName: true, loginId: true } }, tutor: { select: { id: true, name: true } }, transactions: { select: { status: true, reference: true } }, disputes: { select: { id: true, reference: true, status: true } } } }), prisma.booking.count({ where })]);
  return { items, total };
}

export async function cancelBooking(adminId: string, bookingId: string, reason: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { parent: true, tutor: true } });
  if (!booking) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.status !== 'CONFIRMED') throw new AppError(409, 'Only a confirmed booking can be cancelled.', 'INVALID_BOOKING_STATE');
  await refundBookingPayment(bookingId);
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
    prisma.adminAuditLog.create({ data: { adminId, action: 'BOOKING_CANCELLED', entityType: 'Booking', entityId: bookingId, reason } }),
    prisma.notification.create({ data: { userId: booking.parentId, title: 'Booking cancelled', body: `${booking.subject} was cancelled by Mentora support. ${reason}` } }),
    prisma.notification.create({ data: { userId: booking.tutorId, title: 'Booking cancelled', body: `${booking.subject} was cancelled by Mentora support. ${reason}` } }),
  ]);
}

export async function listTransactions(params: { page?: number; pageSize?: number; q?: string; status?: string; type?: string }) {
  const where: Prisma.TransactionWhereInput = { ...(params.status ? { status: params.status as never } : {}), ...(params.type ? { type: params.type as never } : {}), ...(params.q ? { OR: [{ id: { contains: params.q, mode: 'insensitive' } }, { reference: { contains: params.q, mode: 'insensitive' } }, { user: { name: { contains: params.q, mode: 'insensitive' } } }] } : {}) };
  const [items, total, sums] = await Promise.all([prisma.transaction.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true, role: true } }, booking: { select: { id: true, subject: true } } } }), prisma.transaction.count({ where }), prisma.transaction.groupBy({ by: ['status'], _sum: { amount: true }, _count: true })]);
  return { items, total, summary: sums };
}

export async function listDisputes(params: { page?: number; pageSize?: number; q?: string; status?: string }) {
  const where: Prisma.DisputeWhereInput = { ...(params.status ? { status: params.status as never } : {}), ...(params.q ? { OR: [{ reference: { contains: params.q, mode: 'insensitive' } }, { reason: { contains: params.q, mode: 'insensitive' } }] } : {}) };
  const [items, total, summary] = await Promise.all([prisma.dispute.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { createdAt: 'desc' }, include: { parent: { select: { id: true, name: true, photoUrl: true } }, tutor: { select: { id: true, name: true, photoUrl: true } }, booking: { include: { student: { select: { fullName: true } }, transactions: { select: { amount: true, status: true } } } }, events: { orderBy: { createdAt: 'asc' } } } }), prisma.dispute.count({ where }), prisma.dispute.groupBy({ by: ['status'], _count: true })]);
  return { items, total, summary };
}

export async function resolveDispute(adminId: string, disputeId: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED', resolution: string, refund: boolean) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { booking: true } });
  if (!dispute) throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');
  if (refund) await refundBookingPayment(dispute.bookingId);
  await prisma.$transaction([
    prisma.dispute.update({ where: { id: disputeId }, data: { status, resolution, resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null } }),
    prisma.disputeEvent.create({ data: { disputeId, actorId: adminId, action: status, note: resolution, metadata: { refund } } }),
    prisma.adminAuditLog.create({ data: { adminId, action: `DISPUTE_${status}`, entityType: 'Dispute', entityId: disputeId, reason: resolution, metadata: { refund } } }),
  ]);
}

export async function listReviewTutors(params: { page?: number; pageSize?: number; q?: string }) {
  const where: Prisma.UserWhereInput = { role: 'TUTOR', reviews: undefined, tutorProfile: { verificationStatus: 'APPROVED' }, ...(params.q ? { OR: [{ name: { contains: params.q, mode: 'insensitive' } }, { tutorProfile: { professionalTitle: { contains: params.q, mode: 'insensitive' } } }] } : {}) };
  const [items, total] = await Promise.all([prisma.user.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { name: 'asc' }, select: { id: true, name: true, photoUrl: true, tutorProfile: { select: { professionalTitle: true, subjects: true } }, bookingsAsTutor: { where: { review: { isNot: null } }, select: { review: { select: { rating: true, moderationStatus: true } } } } } }), prisma.user.count({ where })]);
  return { items: items.map(t => { const reviews = t.bookingsAsTutor.flatMap(b => b.review ? [b.review] : []); const visible = reviews.filter(r => r.moderationStatus !== 'REMOVED'); return { ...t, bookingsAsTutor: undefined, reviewCount: visible.length, flaggedCount: reviews.filter(r => r.moderationStatus === 'FLAGGED').length, averageRating: visible.length ? visible.reduce((a, r) => a + r.rating, 0) / visible.length : 0 }; }), total };
}

export async function tutorReviews(tutorId: string, page = 1, pageSize = 20, sort = 'recent') {
  const where: Prisma.ReviewWhereInput = { booking: { tutorId } };
  const orderBy: Prisma.ReviewOrderByWithRelationInput = sort === 'highest' ? { rating: 'desc' } : sort === 'lowest' ? { rating: 'asc' } : { createdAt: 'desc' };
  const [items, total, tutor] = await Promise.all([prisma.review.findMany({ where, ...pageArgs(page, pageSize), orderBy, include: { parent: { select: { name: true, photoUrl: true, role: true } }, booking: { select: { student: { select: { fullName: true } } } } } }), prisma.review.count({ where }), prisma.user.findUnique({ where: { id: tutorId }, select: { id: true, name: true, photoUrl: true, tutorProfile: { select: { professionalTitle: true, verificationStatus: true } } } })]);
  return { items, total, tutor };
}

export async function moderateReview(adminId: string, reviewId: string, status: 'PUBLISHED' | 'FLAGGED' | 'UNDER_REVIEW' | 'REMOVED', reason: string) {
  await prisma.$transaction([prisma.review.update({ where: { id: reviewId }, data: { moderationStatus: status, moderationReason: reason, moderatedAt: new Date(), moderatedById: adminId } }), prisma.adminAuditLog.create({ data: { adminId, action: `REVIEW_${status}`, entityType: 'Review', entityId: reviewId, reason } })]);
}

export async function listTickets(params: { page?: number; pageSize?: number; q?: string; status?: string }) {
  const where: Prisma.SupportTicketWhereInput = { ...(params.status ? { status: params.status as never } : {}), ...(params.q ? { OR: [{ reference: { contains: params.q, mode: 'insensitive' } }, { subject: { contains: params.q, mode: 'insensitive' } }, { user: { name: { contains: params.q, mode: 'insensitive' } } }] } : {}) };
  const [items, total, summary] = await Promise.all([prisma.supportTicket.findMany({ where, ...pageArgs(params.page, params.pageSize), orderBy: { updatedAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true, role: true, photoUrl: true } }, messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, role: true, photoUrl: true } } } } } }), prisma.supportTicket.count({ where }), prisma.supportTicket.groupBy({ by: ['status'], _count: true })]);
  return { items, total, summary };
}

export async function replyTicket(adminId: string, ticketId: string, body: string, internal: boolean) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, 'Support ticket not found', 'TICKET_NOT_FOUND');
  await prisma.$transaction([prisma.supportMessage.create({ data: { ticketId, authorId: adminId, body, internal } }), prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } }), prisma.adminAuditLog.create({ data: { adminId, action: internal ? 'SUPPORT_INTERNAL_NOTE' : 'SUPPORT_REPLY', entityType: 'SupportTicket', entityId: ticketId } }), ...(!internal ? [prisma.notification.create({ data: { userId: ticket.userId, title: 'Mentora support replied', body: `There is a new reply on ${ticket.reference}.` } })] : [])]);
}

export async function updateTicket(adminId: string, ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', priority: 'LOW' | 'MEDIUM' | 'HIGH') {
  await prisma.$transaction([prisma.supportTicket.update({ where: { id: ticketId }, data: { status, priority } }), prisma.adminAuditLog.create({ data: { adminId, action: 'SUPPORT_UPDATED', entityType: 'SupportTicket', entityId: ticketId, metadata: { status, priority } } })]);
}

export async function getSettings() { return prisma.adminSetting.findMany({ orderBy: { key: 'asc' } }); }
export async function saveSettings(adminId: string, values: Record<string, unknown>) {
  await prisma.$transaction([...Object.entries(values).map(([key, value]) => prisma.adminSetting.upsert({ where: { key }, update: { value: value as Prisma.InputJsonValue, updatedBy: adminId }, create: { key, value: value as Prisma.InputJsonValue, updatedBy: adminId } })), prisma.adminAuditLog.create({ data: { adminId, action: 'SETTINGS_UPDATED', entityType: 'AdminSetting', entityId: 'platform', metadata: { keys: Object.keys(values) } } })]);
}

export { publicId, ref };
