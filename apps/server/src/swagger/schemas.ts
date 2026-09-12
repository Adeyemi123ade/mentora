import { z } from 'zod';
import './registry.js';

/**
 * Small set of response-payload shapes worth modeling precisely because they're returned
 * by several endpoints and their exact fields are easy to verify against the code
 * (services/auth.service.ts `toUserSummary`). Most other endpoints return Prisma-shaped
 * objects that aren't worth hand-duplicating field-by-field here — those are documented at
 * the envelope + key-name level (verified accurate) rather than fully modeled; see the
 * final report for that scope decision.
 */
export const userSummarySchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['PARENT', 'STUDENT', 'TUTOR', 'ADMIN']),
    emailVerified: z.boolean(),
    hasPassword: z.boolean(),
    photoUrl: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('UserSummary');

/** Generic escape hatch for a response payload whose outer key is verified but whose inner
 * shape is a Prisma-select object not worth hand-modeling — see module doc comment above. */
export const entity = (description: string) => z.unknown().openapi({ description });
export const entityArray = (description: string) => z.array(z.unknown()).openapi({ description });
