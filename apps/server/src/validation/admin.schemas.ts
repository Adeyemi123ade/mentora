import { z } from 'zod';
import { PASSWORD_PATTERN } from './auth.schemas.js';

export const rejectTutorSchema = z.object({
  reason: z.string().trim().min(10, 'Please give the tutor a specific reason (at least 10 characters)').max(500),
});

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const acceptAdminInviteSchema = z.object({
  token: z.string().trim().min(10, 'This invite link is invalid.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(PASSWORD_PATTERN, 'Password must include uppercase, lowercase, a number, and a special character.'),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});

export const setUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
  reason: z.string().trim().min(5).max(500),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'CLOSED']),
  resolution: z.string().trim().min(5).max(2000),
  refund: z.boolean().default(false),
});

export const moderateReviewSchema = z.object({
  status: z.enum(['PUBLISHED', 'FLAGGED', 'UNDER_REVIEW', 'REMOVED']),
  reason: z.string().trim().min(5).max(1000),
});

export const replySupportTicketSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  internal: z.boolean().default(false),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const saveSettingsSchema = z.object({
  values: z.record(z.unknown()),
});
