import { z } from 'zod';
import { registry } from '../registry.js';

const tags = ['Health'];
const okSchema = z.object({ success: z.literal(true), message: z.string(), data: z.object({ app: z.string(), status: z.string().optional(), version: z.string().optional() }) });

registry.registerPath({
  method: 'get', path: '/api/health', tags, summary: 'Health check', description: 'Public, unauthenticated.',
  responses: { 200: { description: 'API is running', content: { 'application/json': { schema: okSchema } } } },
});

registry.registerPath({
  method: 'get', path: '/api', tags, summary: 'API root', description: 'Public, unauthenticated.',
  responses: { 200: { description: 'MENTORA API is ready', content: { 'application/json': { schema: okSchema } } } },
});
