import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { startConversationSchema, sendMessageSchema } from '../../validation/message.schemas.js';

const tags = ['Messages'];
const auth = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().openapi({ description: 'Conversation ID' }) });
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = "PARENT or TUTOR only (router.use(requireAuth, requireRole('PARENT','TUTOR')) in routes/message.routes.ts). A conversation can only be started between a parent and tutor who share an active (non-cancelled) booking.";

registry.registerPath({
  method: 'get', path: '/api/messages/conversations', tags, security: auth,
  summary: "List the caller's conversations", description: desc,
  responses: { ...common.ok(z.object({ conversations: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/messages/conversations', tags, security: auth,
  summary: 'Start (or fetch existing) conversation with a counterpart', description: desc,
  request: { body: jsonBody(startConversationSchema) },
  responses: { ...common.created(z.object({ conversation: entity('') }), 'Conversation ready'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.notFound('No shared active booking with that counterpart') },
});

registry.registerPath({
  method: 'get', path: '/api/messages/conversations/{id}/messages', tags, security: auth,
  summary: 'List messages in a conversation', description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ messages: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound('Conversation not found or caller is not a participant') },
});

registry.registerPath({
  method: 'post', path: '/api/messages/conversations/{id}/messages', tags, security: auth,
  summary: 'Send a message in a conversation', description: desc,
  request: { params: idParam, body: jsonBody(sendMessageSchema) },
  responses: { ...common.created(z.object({ message: entity('') }), 'Message sent'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/messages/conversations/{id}/students', tags, security: auth,
  summary: 'List students relevant to a conversation (for tagging a message to a specific child)', description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ students: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/messages/unread-count', tags, security: auth,
  summary: 'Count unread messages across all conversations', description: desc,
  responses: { ...common.ok(z.object({ count: z.number().int() })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/messages/messageable-parents', tags, security: auth,
  summary: 'List parents the caller (a tutor) can message', description: desc + ' Relevant for TUTOR callers.',
  responses: { ...common.ok(z.object({ parents: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/messages/messageable-tutors', tags, security: auth,
  summary: 'List tutors the caller (a parent) can message', description: desc + ' Relevant for PARENT callers.',
  responses: { ...common.ok(z.object({ tutors: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});
