import { z } from 'zod';
import { registry } from '../registry.js';
import { common, successBody, successBodyNoData } from '../responses.js';
import { userSummarySchema } from '../schemas.js';
import { resetPasswordSchema, signupSchema, resendOtpSchema, studentLoginSchema } from '../../validation/auth.schemas.js';

const tags = ['Authentication'];
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });

registry.registerPath({
  method: 'post',
  path: '/api/auth/student-login',
  tags,
  summary: "Sign in a Student account using its Mentora Student ID",
  description:
    'Students do not have an email/password Supabase identity of their own — their parent creates ' +
    'a Student ID + password (see POST /api/students). This exchanges those credentials for a real ' +
    'Supabase session (services/auth.service.ts signInStudent). Rate-limited per IP+loginId.',
  request: { body: jsonBody(studentLoginSchema) },
  responses: {
    ...common.ok(z.object({ session: z.object({ access_token: z.string(), refresh_token: z.string() }), user: userSummarySchema }), 'Signed in'),
    ...common.validationError,
    ...common.badRequest('The Student ID or password is incorrect'),
    ...common.rateLimited('Too many student sign-in attempts'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags,
  summary: 'Get the current authenticated user',
  description: 'First authenticated request for a new Supabase account also materializes its local Mentora profile.',
  security: [{ bearerAuth: [] }],
  responses: {
    ...common.ok(z.object({ user: userSummarySchema })),
    ...common.unauthorized,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags,
  summary: 'Record a logout event for the current user',
  description: 'Does not itself invalidate the Supabase session — the client calls supabase.auth.signOut() separately (see lib/api.ts logout()). This only logs a LOGOUT LoginEvent server-side.',
  security: [{ bearerAuth: [] }],
  responses: { ...common.okNoData('Logged out'), ...common.unauthorized },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/reset-password',
  tags,
  summary: 'Request a password-reset email',
  description:
    'Always returns 200 with the same message whether or not the email has an account, to avoid leaking ' +
    'which addresses are registered (services/auth.service.ts requestPasswordReset).',
  request: { body: jsonBody(resetPasswordSchema) },
  responses: { ...common.okNoData(), ...common.validationError, ...common.rateLimited('Too many password reset requests') },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/signup',
  tags,
  summary: 'Create a new Parent or Tutor account',
  description:
    'Creates an unconfirmed Supabase account and emails a 6-digit verification code (the Supabase ' +
    'account starts unconfirmed; the code is delivered via the app\'s own email service, not Supabase\'s ' +
    'hosted mail). Role is restricted to PARENT or TUTOR — students are never self-registered.',
  request: { body: jsonBody(signupSchema) },
  responses: {
    ...common.created(z.object({ user: userSummarySchema }), 'Account created'),
    ...common.validationError,
    ...common.conflict('An account with this email already exists'),
    ...common.rateLimited('Too many sign-up attempts'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/resend-otp',
  tags,
  summary: 'Resend the 6-digit signup verification code',
  description: '30-second per-email cooldown in addition to the per-IP rate limit (services/auth.service.ts sendSignupOtp).',
  request: { body: jsonBody(resendOtpSchema) },
  responses: {
    ...common.okNoData('A new verification code has been sent'),
    ...common.validationError,
    ...common.rateLimited('Too many verification code requests, or the 30s per-email cooldown is still active'),
  },
});
