import { describe, expect, it } from 'vitest';
import {
  cancelBookingSchema, setUserStatusSchema, resolveDisputeSchema, moderateReviewSchema,
  replySupportTicketSchema, updateSupportTicketSchema, saveSettingsSchema,
} from './admin.schemas.js';

// Regression: these schemas used to be wrapped as z.object({ body: z.object({...}) }), but
// middleware/validate.ts calls schema.safeParse(req.body) directly — the wrapper made every
// one of these routes reject every real request. Each schema here must describe the payload
// shape directly, matching exactly what the client sends as req.body.

describe('admin write-action schemas accept the flat payload shape the API actually sends', () => {
  it('cancelBookingSchema', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'Tutor unavailable for the session' }).success).toBe(true);
  });

  it('setUserStatusSchema', () => {
    expect(setUserStatusSchema.safeParse({ status: 'ACTIVE', reason: 'Reactivating after review' }).success).toBe(true);
  });

  it('resolveDisputeSchema', () => {
    expect(resolveDisputeSchema.safeParse({ status: 'RESOLVED', resolution: 'Refund issued to parent', refund: true }).success).toBe(true);
  });

  it('moderateReviewSchema', () => {
    expect(moderateReviewSchema.safeParse({ status: 'REMOVED', reason: 'Violates community guidelines' }).success).toBe(true);
  });

  it('replySupportTicketSchema', () => {
    expect(replySupportTicketSchema.safeParse({ body: 'Thanks for reaching out, we are looking into this.', internal: false }).success).toBe(true);
  });

  it('updateSupportTicketSchema', () => {
    expect(updateSupportTicketSchema.safeParse({ status: 'IN_PROGRESS', priority: 'HIGH' }).success).toBe(true);
  });

  it('saveSettingsSchema', () => {
    expect(saveSettingsSchema.safeParse({ values: { supportEmail: 'help@mentora.dev' } }).success).toBe(true);
  });
});
