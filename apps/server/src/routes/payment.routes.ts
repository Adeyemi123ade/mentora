import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { paymentInitializeRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { initializePaymentSchema, confirmReferenceSchema } from '../validation/payment.schemas.js';
import * as paymentService from '../services/payment.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

router.post('/initialize', paymentInitializeRateLimit, validate(initializePaymentSchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.initializePayment(req.user!.id, req.user!.email, req.body.amount, req.body.purpose);
  res.status(201).json({ success: true, message: 'Payment initialized', data: result });
}));

router.post('/wallet/confirm', validate(confirmReferenceSchema), asyncHandler(async (req: Request, res: Response) => {
  const wallet = await paymentService.confirmWalletTopup(req.user!.id, req.body.reference);
  res.json({ success: true, message: 'Wallet topped up', data: { wallet } });
}));

router.get('/wallet', asyncHandler(async (req: Request, res: Response) => {
  const wallet = await paymentService.getWallet(req.user!.id);
  res.json({ success: true, message: 'OK', data: { wallet } });
}));

router.post('/methods/confirm', validate(confirmReferenceSchema), asyncHandler(async (req: Request, res: Response) => {
  const methods = await paymentService.confirmPaymentMethod(req.user!.id, req.body.reference);
  res.status(201).json({ success: true, message: 'Payment method saved', data: { methods } });
}));

router.get('/methods', asyncHandler(async (req: Request, res: Response) => {
  const methods = await paymentService.listPaymentMethods(req.user!.id);
  res.json({ success: true, message: 'OK', data: { methods } });
}));

router.delete('/methods/:id', asyncHandler(async (req: Request, res: Response) => {
  await paymentService.deletePaymentMethod(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Payment method removed' });
}));

router.get('/transactions', asyncHandler(async (req: Request, res: Response) => {
  const transactions = await paymentService.listTransactions(req.user!.id);
  res.json({ success: true, message: 'OK', data: { transactions } });
}));

router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const summary = await paymentService.getSummary(req.user!.id);
  res.json({ success: true, message: 'OK', data: { summary } });
}));

export default router;
