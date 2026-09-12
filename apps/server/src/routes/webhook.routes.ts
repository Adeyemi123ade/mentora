import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { paystackWebhookRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/AppError.js';
import { paystackSecretKey } from '../lib/paystack.js';
import * as paymentService from '../services/payment.service.js';

const router = Router();

router.post('/paystack', paystackWebhookRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  if (!Buffer.isBuffer(raw) || !signature) {
    throw new AppError(400, 'Invalid webhook payload', 'INVALID_WEBHOOK');
  }

  const computed = crypto.createHmac('sha512', paystackSecretKey()).update(raw).digest('hex');
  const computedBuf = Buffer.from(computed, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  if (computedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(computedBuf, signatureBuf)) {
    throw new AppError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
  }

  const payload = JSON.parse(raw.toString('utf8')) as { event: string; data?: { reference?: string } };
  await paymentService.handleWebhookEvent(payload);
  res.json({ success: true });
}));

export default router;
