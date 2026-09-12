import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity } from '../schemas.js';
import { updateMeetingSchema } from '../../validation/meeting.schemas.js';

const tags = ['Meetings'];
const auth = [{ bearerAuth: [] }];
const bookingIdParam = z.object({ bookingId: z.string() });

registry.registerPath({
  method: 'get', path: '/api/meetings/{bookingId}', tags, security: auth,
  summary: 'Get the meeting/join info for a booking',
  description: 'PARENT, STUDENT, TUTOR, or ADMIN who is a participant on the booking (services/meeting.service.ts getMeeting enforces participation).',
  request: { params: bookingIdParam },
  responses: { ...common.ok(z.object({ meeting: entity('Meeting link/provider info; join URL is only populated inside the booking\'s availability window (meetingPolicy.ts).') })), ...common.unauthorized, ...common.forbidden(), ...common.notFound('Booking not found or caller is not a participant') },
});

registry.registerPath({
  method: 'put', path: '/api/meetings/{bookingId}', tags, security: auth,
  summary: 'Set/update the meeting link for a booking',
  description: 'TUTOR only. The tutor provides their own video-call link (Google Meet/Zoom/Teams/Other) for the session.',
  request: { params: bookingIdParam, body: { content: { 'application/json': { schema: updateMeetingSchema } } } },
  responses: { ...common.okNoData('Meeting details updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden('TUTOR role required'), ...common.notFound() },
});
