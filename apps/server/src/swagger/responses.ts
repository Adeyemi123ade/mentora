import { z } from 'zod';
import './registry.js'; // side effect: extendZodWithOpenApi(z) must run before the .openapi() calls below

/**
 * Every route in this API replies with the same envelope (see the route handlers
 * themselves — every one calls `res.json({ success, message, data? })`, and
 * middleware/errorHandler.ts replies `{ success: false, message, error? }` on failure).
 * These helpers build that real envelope around whatever `data` shape a given endpoint
 * actually returns, instead of every path file re-describing the wrapper by hand.
 */

/** A 2xx JSON body: { success: true, message, data: <dataSchema> }. */
export function successBody<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: 'OK' }),
    data: dataSchema,
  });
}

/** A 2xx JSON body with no `data` key — several endpoints only return { success, message }. */
export const successBodyNoData = z.object({
  success: z.literal(true).openapi({ example: true }),
  message: z.string().openapi({ example: 'OK' }),
});

/** The error envelope from middleware/errorHandler.ts for a thrown AppError. */
export const errorBody = z.object({
  success: z.literal(false).openapi({ example: false }),
  message: z.string(),
  error: z.string().optional().openapi({ description: 'AppError machine-readable code, e.g. "NOT_AN_ADMIN".' }),
});

/** The 400 shape specifically from middleware/validate.ts on a failed Zod parse. */
export const validationErrorBody = z.object({
  success: z.literal(false).openapi({ example: false }),
  message: z.literal('Validation failed'),
  error: z.record(z.array(z.string())).openapi({
    description: "Zod's flattened fieldErrors — one entry per invalid field, each an array of messages.",
  }),
});

const jsonContent = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });

/** Standard response-map fragments shared across most protected endpoints. */
export const common = {
  ok: (dataSchema: z.ZodTypeAny, description = 'OK') => ({ [200]: { description, ...jsonContent(successBody(dataSchema)) } }),
  created: (dataSchema: z.ZodTypeAny, description = 'Created') => ({ [201]: { description, ...jsonContent(successBody(dataSchema)) } }),
  okNoData: (description = 'OK') => ({ [200]: { description, ...jsonContent(successBodyNoData) } }),
  validationError: { [400]: { description: 'Request failed validation', ...jsonContent(validationErrorBody) } },
  badRequest: (description = 'Bad request') => ({ [400]: { description, ...jsonContent(errorBody) } }),
  unauthorized: { [401]: { description: 'Missing or invalid bearer token', ...jsonContent(errorBody) } },
  forbidden: (description = 'Caller does not have permission') => ({ [403]: { description, ...jsonContent(errorBody) } }),
  notFound: (description = 'Resource not found') => ({ [404]: { description, ...jsonContent(errorBody) } }),
  conflict: (description = 'Conflicting state') => ({ [409]: { description, ...jsonContent(errorBody) } }),
  rateLimited: (description = 'Too many requests') => ({ [429]: { description, ...jsonContent(errorBody) } }),
  serverError: { [500]: { description: 'Unexpected server error', ...jsonContent(z.object({ success: z.literal(false), message: z.string() })) } },
};
