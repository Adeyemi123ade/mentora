import { describe, expect, it } from 'vitest';
import { createDisputeSchema, createSupportTicketSchema, replyOwnSupportTicketSchema } from './operations.schemas.js';

// Regression: these schemas used to be wrapped as z.object({ body: z.object({...}) }), but
// middleware/validate.ts calls schema.safeParse(req.body) directly — the wrapper made it
// impossible for any parent or tutor to open a dispute or contact support. Each schema here
// must describe the payload shape directly, matching exactly what the client sends as req.body.

describe('parent/tutor dispute & support schemas accept the flat payload shape the API actually sends', () => {
  it('createDisputeSchema', () => {
    expect(createDisputeSchema.safeParse({
      bookingId: 'booking-1',
      reason: 'Tutor no-show',
      description: 'The tutor did not join the scheduled session and has not responded.',
    }).success).toBe(true);
  });

  it('createSupportTicketSchema', () => {
    expect(createSupportTicketSchema.safeParse({
      subject: 'Trouble uploading a document',
      category: 'Technical',
      message: 'I keep getting an error when I try to upload my verification document.',
    }).success).toBe(true);
  });

  it('replyOwnSupportTicketSchema', () => {
    expect(replyOwnSupportTicketSchema.safeParse({ body: 'Following up on this — any update?' }).success).toBe(true);
  });
});
