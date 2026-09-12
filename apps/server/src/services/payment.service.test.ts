import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  userId: string;
  type: 'BOOKING_PAYMENT' | 'WALLET_TOPUP' | 'CARD_VERIFICATION';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  reference: string;
  bookingId: string | null;
  source?: 'CARD' | 'WALLET';
};

let rows: Row[] = [];

function seed(row: Partial<Row> & Pick<Row, 'reference' | 'userId' | 'amount' | 'type'>) {
  const full: Row = { id: row.reference, status: 'PENDING', bookingId: null, ...row };
  rows.push(full);
  return full;
}

const db = vi.hoisted(() => ({
  transaction: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  paymentMethod: { upsert: vi.fn() },
  wallet: { upsert: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../db.js', () => ({ default: db }));

const paystackMock = vi.hoisted(() => ({ paystackFetch: vi.fn() }));
vi.mock('../lib/paystack.js', () => paystackMock);

import { verifyBookingPayment, handleWebhookEvent, refundOrphanedCardPayment } from './payment.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];

  db.transaction.findUnique.mockImplementation(async ({ where }: any) => rows.find((r) => r.reference === where.reference) ?? null);
  db.transaction.update.mockImplementation(async ({ where, data }: any) => {
    const row = rows.find((r) => r.reference === where.reference);
    if (!row) throw new Error('row not found');
    Object.assign(row, data);
    return { ...row };
  });
  db.transaction.updateMany.mockImplementation(async ({ where, data }: any) => {
    let count = 0;
    for (const row of rows) {
      const matches = Object.entries(where).every(([key, value]) => value === undefined || (row as any)[key] === value);
      if (matches) {
        Object.assign(row, data);
        count++;
      }
    }
    return { count };
  });
});

describe('verifyBookingPayment', () => {
  it('accepts a successfully verified payment that matches the booking total', async () => {
    seed({ reference: 'ref_ok', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    paystackMock.paystackFetch.mockResolvedValue({ status: 'success', amount: 550000, currency: 'NGN', reference: 'ref_ok', customer: { email: 'a@b.com' } });

    const ref = await verifyBookingPayment('parent-1', 'ref_ok', 5500);
    expect(ref).toBe('ref_ok');
  });

  it('rejects a reference that does not exist', async () => {
    await expect(verifyBookingPayment('parent-1', 'missing', 5500)).rejects.toMatchObject({ statusCode: 404, code: 'TRANSACTION_NOT_FOUND' });
  });

  it("rejects a reference that belongs to a different user (IDOR guard)", async () => {
    seed({ reference: 'ref_other', userId: 'someone-else', amount: 5500, type: 'BOOKING_PAYMENT' });
    await expect(verifyBookingPayment('parent-1', 'ref_other', 5500)).rejects.toMatchObject({ statusCode: 404, code: 'TRANSACTION_NOT_FOUND' });
  });

  it('rejects a payment already attached to a booking (no double-spend)', async () => {
    seed({ reference: 'ref_used', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', bookingId: 'booking-99' });
    await expect(verifyBookingPayment('parent-1', 'ref_used', 5500)).rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_ALREADY_USED' });
  });

  it('rejects when the stored amount does not match the server-computed booking total', async () => {
    seed({ reference: 'ref_mismatch', userId: 'parent-1', amount: 4000, type: 'BOOKING_PAYMENT' });
    await expect(verifyBookingPayment('parent-1', 'ref_mismatch', 5500)).rejects.toMatchObject({ statusCode: 400, code: 'AMOUNT_MISMATCH' });
    expect(paystackMock.paystackFetch).not.toHaveBeenCalled();
  });

  it('marks the transaction FAILED and rejects when Paystack reports the charge as unverified', async () => {
    seed({ reference: 'ref_fail', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    paystackMock.paystackFetch.mockResolvedValue({ status: 'failed', amount: 550000, currency: 'NGN', reference: 'ref_fail', customer: { email: 'a@b.com' } });

    await expect(verifyBookingPayment('parent-1', 'ref_fail', 5500)).rejects.toMatchObject({ statusCode: 400, code: 'PAYMENT_NOT_VERIFIED' });
    expect(rows.find((r) => r.reference === 'ref_fail')?.status).toBe('FAILED');
  });

  it('rejects when the Paystack-verified amount (kobo) does not match the expected naira amount', async () => {
    seed({ reference: 'ref_kobo', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    paystackMock.paystackFetch.mockResolvedValue({ status: 'success', amount: 100, currency: 'NGN', reference: 'ref_kobo', customer: { email: 'a@b.com' } });

    await expect(verifyBookingPayment('parent-1', 'ref_kobo', 5500)).rejects.toMatchObject({ code: 'PAYMENT_NOT_VERIFIED' });
  });
});

describe('handleWebhookEvent', () => {
  it('confirms a PENDING transaction on a valid charge.success event', async () => {
    seed({ reference: 'ref_webhook', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    await handleWebhookEvent({ event: 'charge.success', data: { reference: 'ref_webhook' } });
    expect(rows.find((r) => r.reference === 'ref_webhook')?.status).toBe('SUCCESS');
  });

  it('marks the transaction FAILED on a charge.failed event', async () => {
    seed({ reference: 'ref_webhook_fail', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    await handleWebhookEvent({ event: 'charge.failed', data: { reference: 'ref_webhook_fail' } });
    expect(rows.find((r) => r.reference === 'ref_webhook_fail')?.status).toBe('FAILED');
  });

  it('is idempotent — a duplicate/retried webhook for an already-SUCCESS transaction is a no-op', async () => {
    const row = seed({ reference: 'ref_dupe', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', status: 'SUCCESS', bookingId: 'booking-1' });

    await handleWebhookEvent({ event: 'charge.success', data: { reference: 'ref_dupe' } });

    expect(row.status).toBe('SUCCESS');
    expect(row.bookingId).toBe('booking-1');
  });

  it('ignores events with no reference', async () => {
    await handleWebhookEvent({ event: 'charge.success', data: {} });
    expect(db.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('ignores unrecognized event types without touching the database', async () => {
    seed({ reference: 'ref_unknown', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT' });
    await handleWebhookEvent({ event: 'subscription.create', data: { reference: 'ref_unknown' } });
    expect(db.transaction.updateMany).not.toHaveBeenCalled();
    expect(rows.find((r) => r.reference === 'ref_unknown')?.status).toBe('PENDING');
  });

  it('is a no-op for a reference that does not exist locally (never throws)', async () => {
    await expect(handleWebhookEvent({ event: 'charge.success', data: { reference: 'never-created' } })).resolves.toBeUndefined();
  });
});

describe('refundOrphanedCardPayment', () => {
  it('refunds a verified card payment that never got attached to a booking', async () => {
    seed({ reference: 'ref_orphan', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', source: 'CARD' });
    paystackMock.paystackFetch.mockResolvedValue({});

    await refundOrphanedCardPayment('ref_orphan');

    expect(paystackMock.paystackFetch).toHaveBeenCalledWith('/refund', expect.objectContaining({ method: 'POST' }));
    expect(rows.find((r) => r.reference === 'ref_orphan')?.status).toBe('REFUNDED');
  });

  it('reverts the claim back to PENDING (not silently REFUNDED) if the Paystack refund call fails', async () => {
    seed({ reference: 'ref_orphan_fail', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', source: 'CARD' });
    paystackMock.paystackFetch.mockRejectedValue(new Error('Paystack unavailable'));

    await expect(refundOrphanedCardPayment('ref_orphan_fail')).rejects.toThrow('Paystack unavailable');
    expect(rows.find((r) => r.reference === 'ref_orphan_fail')?.status).toBe('PENDING');
  });

  it('does not double-refund a payment that already has a booking attached', async () => {
    seed({ reference: 'ref_attached', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', source: 'CARD', bookingId: 'booking-1' });

    await refundOrphanedCardPayment('ref_attached');

    expect(paystackMock.paystackFetch).not.toHaveBeenCalled();
    expect(rows.find((r) => r.reference === 'ref_attached')?.status).toBe('PENDING');
  });

  it('is a no-op for a wallet payment (nothing to refund via Paystack)', async () => {
    seed({ reference: 'ref_wallet', userId: 'parent-1', amount: 5500, type: 'BOOKING_PAYMENT', source: 'WALLET' });

    await refundOrphanedCardPayment('ref_wallet');

    expect(paystackMock.paystackFetch).not.toHaveBeenCalled();
  });
});
