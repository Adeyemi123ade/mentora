import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, userSummarySchema } from '../schemas.js';
import { updateProfileSchema, updatePreferencesSchema } from '../../validation/account.schemas.js';

const tags = ['Users (Account/Profile)'];
const auth = [{ bearerAuth: [] }];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });

registry.registerPath({
  method: 'post', path: '/api/users/me/photo', tags, security: auth,
  summary: 'Upload the current user\'s profile photo', description: 'Any authenticated role. Max 5MB. Replaces and deletes the previous photo from storage.',
  request: { body: { content: { 'multipart/form-data': { schema: z.object({ photo: z.any().openapi({ type: 'string', format: 'binary' }) }) } } } },
  responses: { ...common.ok(z.object({ user: userSummarySchema }), 'Photo updated'), ...common.badRequest('No photo file was provided, or file exceeds 5MB'), ...common.unauthorized },
});

registry.registerPath({
  method: 'delete', path: '/api/users/me/photo', tags, security: auth,
  summary: "Remove the current user's profile photo",
  responses: { ...common.ok(z.object({ user: userSummarySchema }), 'Photo removed'), ...common.unauthorized },
});

registry.registerPath({
  method: 'patch', path: '/api/users/me', tags, security: auth,
  summary: 'Update the current user\'s profile (name/phone/location)',
  request: { body: jsonBody(updateProfileSchema) },
  responses: { ...common.ok(z.object({ user: userSummarySchema }), 'Profile updated'), ...common.validationError, ...common.unauthorized },
});

registry.registerPath({
  method: 'delete', path: '/api/users/me', tags, security: auth,
  summary: 'Delete (anonymize) the current account',
  description:
    'This is not a hard delete — services/auth.service.ts deleteAccount scrubs PII (email becomes ' +
    'deleted-{id}-{hash}@deleted.mentora.dev, name becomes "Deleted user") and deactivates the account, ' +
    'preserving booking/payment history for integrity. The Supabase auth identity is also removed.',
  responses: { ...common.okNoData('Account deleted'), ...common.unauthorized },
});

registry.registerPath({
  method: 'get', path: '/api/users/me/preferences', tags, security: auth,
  summary: 'Get notification/privacy preferences',
  responses: { ...common.ok(z.object({ preferences: entity('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'patch', path: '/api/users/me/preferences', tags, security: auth,
  summary: 'Update notification/privacy preferences',
  description: 'Fields cover notification toggles plus parental-control settings (quiet hours, content filtering, screen-time limit) — see the schema for the full list.',
  request: { body: jsonBody(updatePreferencesSchema) },
  responses: { ...common.ok(z.object({ preferences: entity('') }), 'Preferences updated'), ...common.validationError, ...common.unauthorized },
});

registry.registerPath({
  method: 'get', path: '/api/users/me/account-summary', tags, security: auth,
  summary: "Account summary (used by the Settings page)",
  responses: { ...common.ok(z.object({ summary: entity('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'get', path: '/api/users/me/activity-overview', tags, security: auth,
  summary: 'Recent account activity overview',
  responses: { ...common.ok(z.object({ overview: entity('') })), ...common.unauthorized },
});
