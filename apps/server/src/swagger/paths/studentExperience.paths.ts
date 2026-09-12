import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';

const tags = ['Student Experience'];
const auth = [{ bearerAuth: [] }];
const desc = "STUDENT role only (router.use(requireAuth, requireRole('STUDENT')) in routes/studentExperience.routes.ts). This is the student's own read-only portal — a student cannot message tutors or manage bookings directly (that stays parent-managed).";

registry.registerPath({
  method: 'get', path: '/api/student/overview', tags, security: auth,
  summary: 'Dashboard overview for the logged-in student', description: desc,
  responses: { ...common.ok(z.object({ overview: entity('Summary from services/studentExperience.service.ts getOverview.') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/student/lessons', tags, security: auth,
  summary: "List the student's lessons/bookings", description: desc,
  responses: { ...common.ok(z.object({ lessons: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/student/progress', tags, security: auth,
  summary: 'Learning progress summary', description: desc,
  responses: { ...common.ok(z.object({ progress: entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/student/resources', tags, security: auth,
  summary: 'Learning resources', description: desc + ' Not implemented yet — always returns an empty list with supported:false (routes/studentExperience.routes.ts).',
  responses: { ...common.ok(z.object({ resources: z.array(z.unknown()), supported: z.literal(false) }), 'Learning resources are not available yet'), ...common.unauthorized, ...common.forbidden(desc) },
});
