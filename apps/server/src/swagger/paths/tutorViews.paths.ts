import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';

const tags = ['Tutor Views'];
const auth = [{ bearerAuth: [] }];
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/tutorView.routes.ts). Powers the \"recently viewed\" tutor tracking.";
// Inline schema in routes/tutorView.routes.ts (not exported from validation/*), reproduced exactly here.
const logViewSchema = z.object({ tutorId: z.string().min(1) });

registry.registerPath({
  method: 'post', path: '/api/tutor-views', tags, security: auth,
  summary: 'Log that the parent viewed a tutor profile', description: desc,
  request: { body: { content: { 'application/json': { schema: logViewSchema } } } },
  responses: { ...common.okNoData('View logged'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/tutor-views/recent-count', tags, security: auth,
  summary: 'Count tutors viewed in the last 7 days', description: desc,
  responses: { ...common.ok(z.object({ count: z.number().int() })), ...common.unauthorized, ...common.forbidden(desc) },
});
