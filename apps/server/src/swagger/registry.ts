import { z } from 'zod';
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Must run before any schema in this app calls `.openapi(...)`. This file is imported
// first (directly or transitively) by every other swagger/* module for exactly that reason.
extendZodWithOpenApi(z);

/**
 * Single shared registry every path file registers into. Auth uses a Supabase-issued
 * bearer access token (see middleware/requireAuth.ts — it reads `Authorization: Bearer
 * <token>` and validates it via supabase.auth.getUser), so that's the only security
 * scheme this API actually has.
 */
export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    "Supabase Auth access token. Obtained client-side via Supabase's own sign-in/sign-up flows " +
    '(this API has no /login route of its own — see the Authentication tag\'s notes). Sent as ' +
    '`Authorization: Bearer <access_token>`. Validated per-request against Supabase (middleware/requireAuth.ts), ' +
    'not by verifying the JWT locally.',
});
