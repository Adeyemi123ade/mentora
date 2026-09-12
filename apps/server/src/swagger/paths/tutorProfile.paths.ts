import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity } from '../schemas.js';
import { updateTutorProfileSchema } from '../../validation/tutorProfile.schemas.js';
import { resolveAccountSchema } from '../../validation/payout.schemas.js';

const tags = ['Tutor Profile'];
const auth = [{ bearerAuth: [] }];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = "TUTOR role only — enforced by a local requireTutor(req) check inside each handler (not the requireRole middleware), which throws 403 NOT_A_TUTOR after requireAuth has already run.";

registry.registerPath({
  method: 'get', path: '/api/tutor-profile/me', tags, security: auth,
  summary: "Get the caller's tutor profile", description: desc,
  responses: { ...common.ok(z.object({ profile: entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'patch', path: '/api/tutor-profile/me', tags, security: auth,
  summary: 'Update the tutor profile (bio, subjects, pricing, teaching preferences, verification declarations)', description: desc,
  request: { body: jsonBody(updateTutorProfileSchema) },
  responses: { ...common.ok(z.object({ profile: entity('') }), 'Profile updated'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/tutor-profile/me/documents', tags, security: auth,
  summary: 'Upload a verification document (ID, certificate, photo, or supporting doc)', description: desc,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().openapi({ type: 'string', format: 'binary' }),
            kind: z.enum(['photo', 'idFront', 'idBack', 'certificate', 'supportingDoc']),
          }),
        },
      },
    },
  },
  responses: { ...common.ok(z.object({ profile: entity('') }), 'Document uploaded'), ...common.badRequest('No file provided, or an invalid document kind'), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'delete', path: '/api/tutor-profile/me/documents/{kind}', tags, security: auth,
  summary: 'Remove a previously-uploaded verification document', description: desc,
  request: {
    params: z.object({ kind: z.enum(['photo', 'idFront', 'idBack', 'certificate', 'supportingDoc']) }),
    query: z.object({ url: z.string().optional().openapi({ description: 'The specific document URL to remove, for kinds that allow multiple (supportingDoc).' }) }),
  },
  responses: { ...common.ok(z.object({ profile: entity('') }), 'Document removed'), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/tutor-profile/me/submit', tags, security: auth,
  summary: 'Submit the tutor profile for admin verification', description: desc,
  responses: { ...common.ok(z.object({ profile: entity('') }), 'Submitted for verification'), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/tutor-profile/me/payout', tags, security: auth,
  summary: 'Get the tutor\'s saved payout (bank account) details', description: desc,
  responses: { ...common.ok(z.object({ payout: entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/tutor-profile/me/payout/resolve', tags, security: auth,
  summary: 'Verify and save a payout bank account',
  description: desc + " Resolves the account name against Paystack's bank-account-resolution API server-side before saving — never trusts a client-supplied account name.",
  request: { body: jsonBody(resolveAccountSchema) },
  responses: { ...common.ok(z.object({ payout: entity('') }), 'Account verified'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.badRequest('Could not verify this bank account') },
});
