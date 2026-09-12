import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createLearningGoalSchema, updateLearningGoalSchema } from '../../validation/learningGoal.schemas.js';

const tags = ['Learning Goals'];
const auth = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string() });
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = 'Any authenticated role (no requireRole on this router) — used by parents to set goals for a child.';

registry.registerPath({
  method: 'post', path: '/api/learning-goals', tags, security: auth,
  summary: 'Create a learning goal', description: desc,
  request: { body: jsonBody(createLearningGoalSchema) },
  responses: { ...common.created(z.object({ goal: entity('') })), ...common.validationError, ...common.unauthorized },
});

registry.registerPath({
  method: 'get', path: '/api/learning-goals', tags, security: auth,
  summary: 'List learning goals', description: desc,
  responses: { ...common.ok(z.object({ goals: entityArray('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'patch', path: '/api/learning-goals/{id}', tags, security: auth,
  summary: 'Update a learning goal', description: desc,
  request: { params: idParam, body: jsonBody(updateLearningGoalSchema) },
  responses: { ...common.ok(z.object({ goal: entity('') }), 'Learning goal updated'), ...common.validationError, ...common.unauthorized, ...common.notFound() },
});

registry.registerPath({
  method: 'delete', path: '/api/learning-goals/{id}', tags, security: auth,
  summary: 'Delete a learning goal', description: desc,
  request: { params: idParam },
  responses: { ...common.okNoData('Learning goal removed'), ...common.unauthorized, ...common.notFound() },
});
