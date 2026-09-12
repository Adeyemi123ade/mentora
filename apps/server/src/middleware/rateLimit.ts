import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

const handler = (message: string) => (_req: Request, res: Response) => {
  res.status(429).json({ success: false, message, error: 'RATE_LIMITED' });
};

export const resetPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many password reset requests. Please try again later.'),
});

export const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many sign-up attempts. Please try again later.'),
});

// Keyed by IP + the submitted Student ID (not just IP) so a distributed attacker can't spread
// brute-force attempts on one account across many IPs to dodge a per-IP-only counter.
export const studentLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${ipKeyGenerator(req.ip ?? '')}:${String(req.body?.loginId ?? '').trim().toUpperCase()}`,
  handler: handler('Too many student sign-in attempts. Please wait and try again.'),
});

export const resendOtpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many verification code requests. Please wait a moment and try again.'),
});

export const paymentInitializeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many payment attempts. Please wait a moment and try again.'),
});

export const adminInviteAcceptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many attempts. Please wait a moment and try again.'),
});

export const paystackWebhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Too many webhook events.'),
});
