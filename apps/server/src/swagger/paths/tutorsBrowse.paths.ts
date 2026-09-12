import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';

const tags = ['Tutors (Browse)'];
const auth = [{ bearerAuth: [] }];
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/tutors.routes.ts). Despite the name, this is not public — a parent must be signed in to browse tutors.";
const idParam = z.object({ id: z.string().openapi({ description: 'Tutor (User) ID' }) });

registry.registerPath({
  method: 'get', path: '/api/tutors', tags, security: auth,
  summary: 'List approved, verified tutors', description: desc,
  responses: { ...common.ok(z.object({ tutors: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/tutors/{id}', tags, security: auth,
  summary: 'Get one approved tutor\'s public profile', description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ tutor: entity('') })), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound('Tutor not found (or not approved/verified)') },
});

registry.registerPath({
  method: 'get', path: '/api/tutors/{id}/reviews', tags, security: auth,
  summary: 'List a tutor\'s public reviews', description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ reviews: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/tutors/{id}/availability', tags, security: auth,
  summary: 'List a tutor\'s weekly availability slots', description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ slots: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});
