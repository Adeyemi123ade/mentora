import type { Prisma } from '@prisma/client';
import type { TransactionType } from '@mentora/shared';
import type { PaymentMethodDto, TransactionDto, WalletDto, PaymentsSummary, InitializePaymentResponse } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { paystackFetch } from '../lib/paystack.js';

type TxClient = Prisma.TransactionClient;

const CARD_VERIFICATION_AMOUNT = 50;

type PaystackAuthorization = {
  authorization_code: string;
  card_type?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  bank?: string;
  reusable?: boolean;
};

type PaystackVerifyData = {
  status: 'success' | 'failed' | 'abandoned';
  amount: number;
  currency: string;
  reference: string;
  customer: { email: string };
  authorization?: PaystackAuthorization;
};

function isVerifiedNgnPayment(verified: PaystackVerifyData, amountNaira: number): boolean {
  return verified.status === 'success'
    && verified.currency === 'NGN'
    && verified.amount === amountNaira * 100;
}

function generateReference(): string {
  return `mentora_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyData> {
  return paystackFetch<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
}

async function upsertPaymentMethod(userId: string, authorization?: PaystackAuthorization): Promise<void> {
  if (!authorization?.reusable || !authorization.authorization_code) return;
  await prisma.paymentMethod.upsert({
    where: { authorizationCode: authorization.authorization_code },
    update: {
      cardType: authorization.card_type ?? 'card',
      last4: authorization.last4 ?? '',
      expMonth: authorization.exp_month ?? '',
      expYear: authorization.exp_year ?? '',
      bank: authorization.bank ?? null,
    },
    create: {
      userId,
      authorizationCode: authorization.authorization_code,
      cardType: authorization.card_type ?? 'card',
      last4: authorization.last4 ?? '',
      expMonth: authorization.exp_month ?? '',
      expYear: authorization.exp_year ?? '',
      bank: authorization.bank ?? null,
    },
  });
}

async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function describeTransaction(type: TransactionType): string {
  if (type === 'WALLET_TOPUP') return 'Wallet top up';
  if (type === 'CARD_VERIFICATION') return 'Card verification';
  return 'Session booking';
}

export async function initializePayment(
  userId: string,
  email: string,
  amount: number,
  purpose: TransactionType
): Promise<InitializePaymentResponse> {
  const finalAmount = purpose === 'CARD_VERIFICATION' ? CARD_VERIFICATION_AMOUNT : amount;
  const reference = generateReference();

  await prisma.transaction.create({
    data: {
      userId,
      type: purpose,
      source: 'CARD',
      amount: finalAmount,
      status: 'PENDING',
      reference,
      description: describeTransaction(purpose),
    },
  });

  return { reference, amount: finalAmount, email };
}

export async function confirmWalletTopup(userId: string, reference: string): Promise<WalletDto> {
  const pending = await prisma.transaction.findUnique({ where: { reference } });
  if (!pending || pending.userId !== userId || pending.type !== 'WALLET_TOPUP') {
    throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }
  if (pending.status === 'SUCCESS') {
    const wallet = await getOrCreateWallet(userId);
    return { balance: wallet.balance };
  }

  const verified = await verifyPaystackTransaction(reference);
  if (!isVerifiedNgnPayment(verified, pending.amount)) {
    await prisma.transaction.update({ where: { reference }, data: { status: 'FAILED' } });
    throw new AppError(400, 'Payment could not be verified', 'PAYMENT_NOT_VERIFIED');
  }

  const wallet = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({ where: { reference }, data: { status: 'SUCCESS' } });
    await upsertPaymentMethod(userId, verified.authorization);
    const updated = await tx.wallet.upsert({
      where: { userId },
      update: { balance: { increment: pending.amount } },
      create: { userId, balance: pending.amount },
    });
    await tx.notification.create({
      data: {
        userId,
        title: 'Wallet top-up successful',
        body: `₦${pending.amount.toLocaleString()} was added to your wallet.`,
      },
    });
    return updated;
  });

  return { balance: wallet.balance };
}

export async function confirmPaymentMethod(userId: string, reference: string): Promise<PaymentMethodDto[]> {
  const pending = await prisma.transaction.findUnique({ where: { reference } });
  if (!pending || pending.userId !== userId || pending.type !== 'CARD_VERIFICATION') {
    throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
  }
  if (pending.status !== 'SUCCESS') {
    const verified = await verifyPaystackTransaction(reference);
    if (!isVerifiedNgnPayment(verified, pending.amount)) {
      await prisma.transaction.update({ where: { reference }, data: { status: 'FAILED' } });
      throw new AppError(400, 'Payment could not be verified', 'PAYMENT_NOT_VERIFIED');
    }
    if (!verified.authorization?.reusable) {
      await prisma.transaction.update({ where: { reference }, data: { status: 'FAILED' } });
      throw new AppError(400, 'This card cannot be saved for future payments', 'CARD_NOT_REUSABLE');
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { reference }, data: { status: 'SUCCESS' } });
      await upsertPaymentMethod(userId, verified.authorization);
      await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: pending.amount } },
        create: { userId, balance: pending.amount },
      });
    });
  }

  return listPaymentMethods(userId);
}

export async function verifyBookingPayment(userId: string, reference: string, expectedTotal: number): Promise<string> {
  const pending = await prisma.transaction.findUnique({ where: { reference } });
  if (!pending || pending.userId !== userId || pending.type !== 'BOOKING_PAYMENT') {
    throw new AppError(404, 'Payment not found', 'TRANSACTION_NOT_FOUND');
  }
  if (pending.bookingId) {
    throw new AppError(409, 'This payment has already been used for a booking', 'PAYMENT_ALREADY_USED');
  }
  if (pending.amount !== expectedTotal) {
    throw new AppError(400, 'Payment amount does not match the booking total', 'AMOUNT_MISMATCH');
  }

  const verified = await verifyPaystackTransaction(reference);
  if (!isVerifiedNgnPayment(verified, pending.amount)) {
    await prisma.transaction.update({ where: { reference }, data: { status: 'FAILED' } });
    throw new AppError(400, 'Payment could not be verified', 'PAYMENT_NOT_VERIFIED');
  }

  await upsertPaymentMethod(userId, verified.authorization);
  return reference;
}

export async function attachBookingToCardPayment(tx: TxClient, reference: string, bookingId: string): Promise<void> {
  const result = await tx.transaction.updateMany({
    where: { reference, bookingId: null, status: 'PENDING' },
    data: { status: 'SUCCESS', bookingId },
  });
  if (result.count !== 1) {
    throw new AppError(409, 'This payment has already been used for a booking', 'PAYMENT_ALREADY_USED');
  }
}

/**
 * Refunds a card payment that was verified but never attached to a booking — e.g. the booking's
 * slot got taken by someone else in the instant between payment verification and booking
 * creation. The atomic claim below prevents double-refunding if this is ever called twice for
 * the same reference; a failed Paystack call reverts the claim so the transaction stays visible
 * for retry instead of being silently marked refunded when it wasn't.
 */
export async function refundOrphanedCardPayment(reference: string): Promise<void> {
  const claimed = await prisma.transaction.updateMany({
    where: { reference, bookingId: null, status: 'PENDING', source: 'CARD' },
    data: { status: 'REFUNDED' },
  });
  if (claimed.count !== 1) return;

  try {
    await paystackFetch('/refund', {
      method: 'POST',
      body: JSON.stringify({ transaction: reference }),
    });
  } catch (err) {
    await prisma.transaction.update({ where: { reference }, data: { status: 'PENDING' } });
    throw err;
  }
}

export async function chargeWalletForBooking(tx: TxClient, userId: string, bookingId: string, amount: number): Promise<void> {
  const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
  if (wallet.balance < amount) {
    throw new AppError(400, 'Insufficient wallet balance', 'INSUFFICIENT_BALANCE');
  }
  await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
  await tx.transaction.create({
    data: {
      userId,
      type: 'BOOKING_PAYMENT',
      source: 'WALLET',
      amount,
      status: 'SUCCESS',
      reference: generateReference(),
      bookingId,
      description: describeTransaction('BOOKING_PAYMENT'),
    },
  });
}

export async function refundBookingPayment(bookingId: string): Promise<void> {
  const transaction = await prisma.transaction.findFirst({
    where: { bookingId, type: 'BOOKING_PAYMENT', status: 'SUCCESS' },
  });
  if (!transaction) return;

  if (transaction.source === 'CARD') {
    await paystackFetch('/refund', {
      method: 'POST',
      body: JSON.stringify({ transaction: transaction.reference }),
    });
    await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'REFUNDED' } });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { userId: transaction.userId },
        update: { balance: { increment: transaction.amount } },
        create: { userId: transaction.userId, balance: transaction.amount },
      });
      await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'REFUNDED' } });
    });
  }
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethodDto[]> {
  const methods = await prisma.paymentMethod.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return methods.map((m) => ({
    id: m.id,
    cardType: m.cardType,
    last4: m.last4,
    expMonth: m.expMonth,
    expYear: m.expYear,
    bank: m.bank,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function deletePaymentMethod(userId: string, id: string): Promise<void> {
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method || method.userId !== userId) {
    throw new AppError(404, 'Payment method not found', 'PAYMENT_METHOD_NOT_FOUND');
  }
  await prisma.paymentMethod.delete({ where: { id } });
}

export async function getWallet(userId: string): Promise<WalletDto> {
  const wallet = await getOrCreateWallet(userId);
  return { balance: wallet.balance };
}

export async function listTransactions(userId: string): Promise<TransactionDto[]> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, status: 'SUCCESS' },
    include: { booking: true },
    orderBy: { createdAt: 'asc' },
  });

  return transactions
    .map((t, index) => ({
      id: t.id,
      invoiceNumber: `INV-${t.createdAt.getFullYear()}-${String(index + 1).padStart(4, '0')}`,
      type: t.type,
      source: t.source,
      amount: t.amount,
      status: t.status,
      description: t.booking ? `Session with ${t.booking.tutorName}` : t.description,
      createdAt: t.createdAt.toISOString(),
      bookingId: t.bookingId,
      tutorName: t.booking?.tutorName ?? null,
      subject: t.booking?.subject ?? null,
      sessionDate: t.booking ? t.booking.date.toISOString() : null,
    }))
    .reverse();
}

export async function handleWebhookEvent(payload: { event: string; data?: { reference?: string } }): Promise<void> {
  if (payload.event !== 'charge.success' && payload.event !== 'charge.failed') return;
  const reference = payload.data?.reference;
  if (!reference) return;

  // Reconciles payments that never reached a client-side confirm step (e.g. the
  // browser was closed mid-checkout). Idempotent: only touches PENDING rows.
  const status = payload.event === 'charge.success' ? 'SUCCESS' : 'FAILED';
  await prisma.transaction.updateMany({ where: { reference, status: 'PENDING' }, data: { status } });
}

export async function getSummary(userId: string): Promise<PaymentsSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bookingPayments = await prisma.transaction.findMany({
    where: { userId, type: 'BOOKING_PAYMENT', status: 'SUCCESS' },
    include: { booking: true },
  });

  const totalSpent = bookingPayments.reduce((sum, t) => sum + t.amount, 0);
  const paidThisMonth = bookingPayments.filter((t) => t.createdAt >= startOfMonth).reduce((sum, t) => sum + t.amount, 0);
  const scheduledUpcoming = bookingPayments
    .filter((t) => t.booking && t.booking.status !== 'CANCELLED' && t.booking.date > now)
    .reduce((sum, t) => sum + t.amount, 0);

  const wallet = await getOrCreateWallet(userId);

  return { totalSpent, paidThisMonth, scheduledUpcoming, walletBalance: wallet.balance };
}
