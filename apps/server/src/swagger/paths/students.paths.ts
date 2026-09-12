import { z } from 'zod';
import { registry } from '../registry.js';
import { common, successBody } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { createStudentSchema, resetStudentPasswordSchema, updateStudentSchema } from '../../validation/student.schemas.js';

const tags = ['Students (Parent-managed)'];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const idParam = z.object({ id: z.string().openapi({ description: 'Student profile ID' }) });
const auth = [{ bearerAuth: [] }];
const desc = 'PARENT role only (requireRole). A "Student" here is the child profile a parent manages, distinct from that child\'s own login account.';

registry.registerPath({
  method: 'post', path: '/api/students', tags, security: auth,
  summary: 'Create a child profile and its Student login account',
  description: desc + ' Also creates the Student ID + password login for the child (services/student.service.ts createStudent).',
  request: { body: jsonBody(createStudentSchema) },
  responses: { ...common.created(z.object({ student: entity('Created Student record, including its generated Student ID (loginId).') })), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/students', tags, security: auth,
  summary: "List the caller's children", description: desc,
  responses: { ...common.ok(z.object({ students: entityArray('Student records owned by this parent.') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'patch', path: '/api/students/{id}', tags, security: auth,
  summary: 'Update a child profile', description: desc,
  request: { params: idParam, body: jsonBody(updateStudentSchema) },
  responses: { ...common.ok(z.object({ student: entity('Updated Student record.') })), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.notFound('Student not found or not owned by this parent') },
});

registry.registerPath({
  method: 'delete', path: '/api/students/{id}', tags, security: auth,
  summary: 'Remove a child profile', description: desc,
  request: { params: idParam },
  responses: { ...common.okNoData('Student removed'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'post', path: '/api/students/{id}/photo', tags, security: auth,
  summary: "Upload a child's profile photo", description: desc + ' Max 5MB (multer limit).',
  request: { params: idParam, body: { content: { 'multipart/form-data': { schema: z.object({ photo: z.any().openapi({ type: 'string', format: 'binary', description: 'Image file' }) }) } } } },
  responses: { ...common.ok(z.object({ student: entity('Updated Student record with the new photoUrl.') }), 'Photo updated'), ...common.badRequest('No photo file was provided, or file exceeds 5MB'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'delete', path: '/api/students/{id}/photo', tags, security: auth,
  summary: "Remove a child's profile photo", description: desc,
  request: { params: idParam },
  responses: { ...common.ok(z.object({ student: entity('Updated Student record with photoUrl cleared.') }), 'Photo removed'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'post', path: '/api/students/{id}/reset-password', tags, security: auth,
  summary: "Reset a child's Student-login password", description: desc,
  request: { params: idParam, body: jsonBody(resetStudentPasswordSchema) },
  responses: { ...common.ok(z.object({ student: entity('Student record (password itself is never returned).') }), 'Student password updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});
