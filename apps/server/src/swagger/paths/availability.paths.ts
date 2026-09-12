import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createAvailabilitySlotSchema } from '../../validation/availability.schemas.js';

const tags = ['Tutor Availability'];
const auth = [{ bearerAuth: [] }];
const desc = 'TUTOR role only — enforced by a local requireTutor(req) check inside each handler (not the requireRole middleware).';

registry.registerPath({
  method: 'get', path: '/api/tutor/availability', tags, security: auth,
  summary: "Get the caller's own weekly availability slots", description: desc,
  responses: { ...common.ok(z.object({ slots: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/tutor/availability', tags, security: auth,
  summary: 'Add a weekly availability slot', description: desc,
  request: { body: { content: { 'application/json': { schema: createAvailabilitySlotSchema } } } },
  responses: { ...common.created(z.object({ slot: entity('') }), 'Availability added'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'delete', path: '/api/tutor/availability/{id}', tags, security: auth,
  summary: 'Remove an availability slot', description: desc,
  request: { params: z.object({ id: z.string() }) },
  responses: { ...common.okNoData('Availability removed'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});
