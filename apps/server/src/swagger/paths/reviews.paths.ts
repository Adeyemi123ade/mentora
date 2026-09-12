import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createReviewSchema } from '../../validation/review.schemas.js';

const tags = ['Reviews'];
const auth = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string() });
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/review.routes.ts).";

registry.registerPath({
  method: 'post', path: '/api/reviews', tags, security: auth,
  summary: 'Submit a review for a completed booking', description: desc,
  request: { body: { content: { 'application/json': { schema: createReviewSchema } } } },
  responses: { ...common.created(z.object({ review: entity('') }), 'Review submitted'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/reviews', tags, security: auth,
  summary: 'List reviews the caller has written', description: desc,
  responses: { ...common.ok(z.object({ reviews: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/reviews/reviewable-bookings', tags, security: auth,
  summary: 'List completed bookings that are still eligible for a review', description: desc,
  responses: { ...common.ok(z.object({ bookings: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'delete', path: '/api/reviews/{id}', tags, security: auth,
  summary: 'Delete a review the caller wrote', description: desc,
  request: { params: idParam },
  responses: { ...common.okNoData('Review removed'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});
