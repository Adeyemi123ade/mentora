import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createBookingSchema } from '../../validation/booking.schemas.js';

const tags = ['Bookings'];
const auth = [{ bearerAuth: [] }];
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/booking.routes.ts).";

registry.registerPath({
  method: 'post', path: '/api/bookings', tags, security: auth,
  summary: 'Create a booking and pay for it',
  description:
    desc +
    ' Price/platformFee/total in the request are NOT trusted — services/booking.service.ts re-derives them ' +
    "server-side from the tutor's stored session price before charging, and rejects a mismatch " +
    "(AMOUNT_MISMATCH). For paymentSource:CARD, paystackReference must reference a payment already " +
    'verified server-side against Paystack; for WALLET it debits the wallet inside the same transaction ' +
    'as the booking, so a slot conflict rolls back the charge too.',
  request: { body: { content: { 'application/json': { schema: createBookingSchema } } } },
  responses: {
    ...common.created(z.object({ booking: entity('') }), 'Booking confirmed'),
    ...common.validationError,
    ...common.unauthorized,
    ...common.forbidden(desc),
    ...common.badRequest('Payment amount does not match the booking total, or the slot is no longer available'),
    ...common.conflict('This tutor/student slot was just booked by someone else'),
  },
});

registry.registerPath({
  method: 'get', path: '/api/bookings', tags, security: auth,
  summary: "List the caller's bookings", description: desc,
  responses: { ...common.ok(z.object({ bookings: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});
