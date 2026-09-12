import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';
import { initializePaymentSchema, confirmReferenceSchema } from '../../validation/payment.schemas.js';

const tags = ['Payments'];
const auth = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string().openapi({ description: 'Payment method ID' }) });
const jsonBody = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const desc = "PARENT role only (router.use(requireAuth, requireRole('PARENT')) in routes/payment.routes.ts).";

registry.registerPath({
  method: 'post', path: '/api/payments/initialize', tags, security: auth,
  summary: 'Initialize a Paystack payment (card charge, wallet top-up, or card verification)',
  description:
    desc +
    ' Rate-limited (paymentInitializeRateLimit). This step alone does not move money or attach anything — ' +
    'it opens a Paystack transaction reference for the frontend to complete via the Paystack popup. The ' +
    'amount here is only authoritative for wallet top-ups/card verification; for an actual booking payment, ' +
    'POST /api/bookings independently re-derives and verifies the real amount server-side before charging.',
  request: { body: jsonBody(initializePaymentSchema) },
  responses: { ...common.created(entity('Paystack authorization_url/reference for the frontend to open.')), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.rateLimited() },
});

registry.registerPath({
  method: 'post', path: '/api/payments/wallet/confirm', tags, security: auth,
  summary: 'Confirm a wallet top-up after Paystack checkout',
  description: desc + ' Independently re-verifies the transaction against Paystack server-to-server before crediting the wallet.',
  request: { body: jsonBody(confirmReferenceSchema) },
  responses: { ...common.ok(z.object({ wallet: entity('') }), 'Wallet topped up'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.badRequest('Payment could not be verified, or amount/status mismatch') },
});

registry.registerPath({
  method: 'get', path: '/api/payments/wallet', tags, security: auth,
  summary: "Get the caller's wallet balance", description: desc,
  responses: { ...common.ok(z.object({ wallet: entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'post', path: '/api/payments/methods/confirm', tags, security: auth,
  summary: 'Save a card as a reusable payment method after a verification charge',
  description: desc + ' Confirms a small CARD_VERIFICATION charge against Paystack, then stores the reusable authorization.',
  request: { body: jsonBody(confirmReferenceSchema) },
  responses: { ...common.created(z.object({ methods: entityArray('') }), 'Payment method saved'), ...common.validationError, ...common.unauthorized, ...common.forbidden(desc), ...common.badRequest('This card cannot be saved for future payments, or verification failed') },
});

registry.registerPath({
  method: 'get', path: '/api/payments/methods', tags, security: auth,
  summary: 'List saved payment methods (cards)', description: desc,
  responses: { ...common.ok(z.object({ methods: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'delete', path: '/api/payments/methods/{id}', tags, security: auth,
  summary: 'Delete a saved payment method', description: desc,
  request: { params: idParam },
  responses: { ...common.okNoData('Payment method removed'), ...common.unauthorized, ...common.forbidden(desc), ...common.notFound() },
});

registry.registerPath({
  method: 'get', path: '/api/payments/transactions', tags, security: auth,
  summary: "List the caller's transactions", description: desc,
  responses: { ...common.ok(z.object({ transactions: entityArray('') })), ...common.unauthorized, ...common.forbidden(desc) },
});

registry.registerPath({
  method: 'get', path: '/api/payments/summary', tags, security: auth,
  summary: 'Spending summary (used by the Payments page)', description: desc,
  responses: { ...common.ok(z.object({ summary: entity('') })), ...common.unauthorized, ...common.forbidden(desc) },
});
