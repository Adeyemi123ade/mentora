import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { saveTutorSchema, updateSavedTutorSchema } from '../../validation/savedTutor.schemas.js';

const tags = ['Saved Tutors'];
const auth = [{ bearerAuth: [] }];
const tutorIdParam = z.object({ tutorId: z.string() });
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/savedTutor.routes.ts).";

registry.registerPath({
  method: 'post', path: '/api/saved-tutors', tags, security: auth,
  summary: 'Save (bookmark) a tutor', description: desc,
  request: { body: jsonBody(saveTutorSchema) },
  responses: { ...common.created(z.object({ saved: entity('') }), 'Tutor saved'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/saved-tutors', tags, security: auth,
  summary: 'List saved tutors', description: desc,
  responses: { ...common.ok(z.object({ saved: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'patch', path: '/api/saved-tutors/{tutorId}', tags, security: auth,
  summary: 'Update the note on a saved tutor', description: desc,
  request: { params: tutorIdParam, body: jsonBody(updateSavedTutorSchema) },
  responses: { ...common.ok(z.object({ saved: entity('') }), 'Note updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'delete', path: '/api/saved-tutors/{tutorId}', tags, security: auth,
  summary: 'Unsave a tutor', description: desc,
  request: { params: tutorIdParam },
  responses: { ...common.okNoData('Tutor removed from saved list'), ...common.unauthorized, ...common.forbidden(desc) },
});
