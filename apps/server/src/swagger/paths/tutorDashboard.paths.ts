import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';

const tags = ['Tutor Dashboard'];
const auth = [{ bearerAuth: [] }];
const desc = 'TUTOR role only — enforced by a local requireTutor(req) check inside each handler (not the requireRole middleware).';
const idParam = z.object({ id: z.string().openapi({ description: 'Booking ID' }) });

const simpleGet = (path: string, summary: string, dataKey: string, arrayShape = false) =>
  registry.registerPath({
    method: 'get', path, tags, security: auth, summary, description: desc,
    responses: { ...common.ok(z.object({ [dataKey]: arrayShape ? entityArray('') : entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
  });

simpleGet('/api/tutor/dashboard/summary', 'Dashboard summary stats', 'summary');
simpleGet('/api/tutor/dashboard/activity', 'Recent activity feed', 'activity', true);
simpleGet('/api/tutor/dashboard/profile-strength', 'Profile-completeness score', 'strength');
simpleGet('/api/tutor/dashboard/bookings', "List the tutor's bookings", 'bookings', true);
simpleGet('/api/tutor/dashboard/bookings-summary', 'Bookings summary counts', 'summary');
simpleGet('/api/tutor/dashboard/students', "List the tutor's students", 'students', true);
simpleGet('/api/tutor/dashboard/reviews', 'Reviews received by the tutor', 'reviews', true);

const bookingAction = (action: 'accept' | 'decline' | 'cancel', message: string, refunds = false) =>
  registry.registerPath({
    method: 'post', path: `/api/tutor/dashboard/bookings/{id}/${action}`, tags, security: auth,
    summary: `${action[0].toUpperCase()}${action.slice(1)} a booking request` + (refunds ? ' (refunds the parent)' : ''),
    description: desc,
    request: { params: idParam },
    responses: { ...common.okNoData(message), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
  });
bookingAction('accept', 'Booking accepted');
bookingAction('decline', 'Booking declined and refunded', true);
bookingAction('cancel', 'Booking cancelled and refunded', true);

registry.registerPath({
  method: 'get', path: '/api/tutor/dashboard/calendar', tags, security: auth,
  summary: 'Get a month of calendar days with booking counts', description: desc + ' year/month are validated inline (not a shared Zod schema) — both required integers.',
  request: { query: z.object({ year: z.coerce.number().int(), month: z.coerce.number().int().min(1).max(12) }) },
  responses: { ...common.ok(z.object({ days: entityArray('') })), ...common.badRequest('year and month query params are required'), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'patch', path: '/api/tutor/dashboard/students/{id}/progress', tags, security: auth,
  summary: "Update a student's progress percentage", description: desc + ' progressPercent/note are validated inline (not a shared Zod schema).',
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Student ID' }) }),
    body: { content: { 'application/json': { schema: z.object({ progressPercent: z.number().int().min(0).max(100), note: z.string().optional() }) } } },
  },
  responses: { ...common.okNoData('Progress updated'), ...common.badRequest('progressPercent must be an integer between 0 and 100'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});
