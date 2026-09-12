import { z } from 'zod';

export const createDisputeSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
});

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10).max(5000),
  bookingId: z.string().optional(),
});

export const replyOwnSupportTicketSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
