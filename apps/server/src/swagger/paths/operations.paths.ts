import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createDisputeSchema, createSupportTicketSchema, replyOwnSupportTicketSchema } from '../../validation/operations.schemas.js';

const tags = ['Disputes & Support (Self-service)'];
const auth = [{ bearerAuth: [] }];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = 'Any authenticated role (router.use(requireAuth) only, in routes/operations.routes.ts). Mounted at the bare /api prefix. Scoped to bookings/tickets the caller owns as parent, tutor, or ticket author.';

registry.registerPath({
  method: 'post', path: '/api/disputes', tags, security: auth,
  summary: 'Open a dispute on a booking', description: desc + ' Caller must be the parent or tutor on the booking; only one active dispute per booking is allowed.',
  request: { body: jsonBody(createDisputeSchema) },
  responses: { ...common.created(z.object({ dispute: entity('') }), 'Dispute submitted'), ...common.validationError, ...common.unauthorized, ...common.notFound('Booking not found or caller is not a participant'), ...common.conflict('An active dispute already exists for this booking') },
});

registry.registerPath({
  method: 'get', path: '/api/disputes', tags, security: auth,
  summary: "List the caller's disputes (as parent or tutor)", description: desc,
  responses: { ...common.ok(z.object({ disputes: entityArray('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'post', path: '/api/support', tags, security: auth,
  summary: 'Open a support ticket', description: desc,
  request: { body: jsonBody(createSupportTicketSchema) },
  responses: { ...common.created(z.object({ ticket: entity('') }), 'Support ticket created'), ...common.validationError, ...common.unauthorized },
});

registry.registerPath({
  method: 'get', path: '/api/support', tags, security: auth,
  summary: "List the caller's support tickets", description: desc,
  responses: { ...common.ok(z.object({ tickets: entityArray('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'post', path: '/api/support/{id}/messages', tags, security: auth,
  summary: 'Reply to one of the caller\'s own support tickets', description: desc + ' Reopens the ticket to OPEN status. Cannot reply to a CLOSED ticket.',
  request: { params: z.object({ id: z.string() }), body: jsonBody(replyOwnSupportTicketSchema) },
  responses: { ...common.ok(z.object({}), 'Reply sent'), ...common.validationError, ...common.unauthorized, ...common.notFound(), ...common.conflict('This support ticket is closed') },
});
