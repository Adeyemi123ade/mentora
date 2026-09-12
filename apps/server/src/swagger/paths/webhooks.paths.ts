import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';

const tags = ['Webhooks'];

registry.registerPath({
  method: 'post', path: '/webhooks/paystack', tags,
  summary: 'Paystack payment webhook',
  description:
    'Not under /api and not bearer-authenticated — Paystack calls this directly. Instead it is secured by ' +
    'verifying the `x-paystack-signature` header (HMAC-SHA512 of the raw body using the Paystack secret key, ' +
    'compared with crypto.timingSafeEqual). Mounted before the JSON body parser in index.ts so the raw body ' +
    'bytes are available for signature verification. Idempotent — only updates transactions still in PENDING ' +
    'status, so a retried webhook delivery is a safe no-op. Rate-limited (paystackWebhookRateLimit).',
  request: {
    headers: z.object({ 'x-paystack-signature': z.string() }),
    body: { content: { 'application/json': { schema: z.object({ event: z.string(), data: z.object({ reference: z.string().optional() }).optional() }) } } },
  },
  responses: {
    ...common.ok(z.object({}).partial(), 'Webhook processed'),
    ...common.badRequest('Invalid webhook payload (missing signature header or unparseable body)'),
    401: { description: 'Invalid webhook signature', content: { 'application/json': { schema: z.object({ success: z.literal(false), message: z.string(), error: z.literal('INVALID_SIGNATURE') }) } } },
    ...common.rateLimited(),
  },
});
