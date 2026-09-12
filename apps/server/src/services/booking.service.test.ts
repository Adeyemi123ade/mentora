import { beforeEach, describe, expect, it, vi } from 'vitest';

// A future Monday at 10:00 UTC — createBooking rejects any session start that
// isn't strictly in the future, and assertSlotAvailable keys off getUTCDay().
function nextMonday(): Date {
  const d = new Date();
  const diff = (1 - d.getUTCDay() + 7) % 7 || 7;
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff, 10, 0, 0));
  return next;
}
const FUTURE_MONDAY = nextMonday();
const FUTURE_DATE_STR = FUTURE_MONDAY.toISOString().slice(0, 10);

const student = { id: 'student-1', parentId: 'parent-1', fullName: 'Kid One', grade: '5' };
const tutorProfile = {
  verificationStatus: 'APPROVED',
  sessionPrice: 5000,
  subjects: ['Mathematics'],
  professionalTitle: 'Mathematics Tutor',
  photoUrl: null,
};
const tutor = { id: 'tutor-1', role: 'TUTOR', accountStatus: 'ACTIVE', name: 'Amaka Okafor', photoUrl: null, tutorProfile };
const availability = { tutorId: 'tutor-1', dayOfWeek: FUTURE_MONDAY.getUTCDay(), startTime: '09:00', endTime: '17:00' };

const db = vi.hoisted(() => ({
  student: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  tutorAvailability: { findFirst: vi.fn() },
  booking: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../db.js', () => ({ default: db }));

const paymentServiceMock = vi.hoisted(() => ({
  verifyBookingPayment: vi.fn(),
  attachBookingToCardPayment: vi.fn(),
  chargeWalletForBooking: vi.fn(),
  refundOrphanedCardPayment: vi.fn(),
}));
vi.mock('./payment.service.js', () => paymentServiceMock);

import { createBooking, listBookings } from './booking.service.js';

const validPayload = {
  studentId: 'student-1',
  tutorId: 'tutor-1',
  tutorName: 'Amaka Okafor',
  tutorTitle: 'Mathematics Tutor',
  subject: 'Mathematics',
  format: 'ONE_ON_ONE' as const,
  date: FUTURE_DATE_STR,
  startTime: '09:00',
  endTime: '10:00',
  message: undefined,
  price: 5000,
  platformFee: 500,
  total: 5500,
  paymentSource: 'WALLET' as const,
};

function txThatRunsCallback() {
  return vi.fn(async (fn: (tx: typeof db) => unknown, _opts?: unknown) => fn(db));
}

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.student.findUnique.mockResolvedValue(student);
    db.user.findFirst.mockResolvedValue(tutor);
    db.tutorAvailability.findFirst.mockResolvedValue(availability);
    db.booking.findFirst.mockResolvedValue(null);
    db.$transaction.mockImplementation(txThatRunsCallback());
    (db as any).booking.create = vi.fn().mockResolvedValue({
      id: 'booking-1',
      studentId: 'student-1',
      tutorId: 'tutor-1',
      tutorName: 'Amaka Okafor',
      tutorTitle: 'Mathematics Tutor',
      tutorPhotoUrl: null,
      subject: 'Mathematics',
      specificTopic: null,
      format: 'ONE_ON_ONE',
      date: FUTURE_MONDAY,
      startTime: '09:00',
      endTime: '10:00',
      message: null,
      price: 5000,
      platformFee: 500,
      total: 5500,
      status: 'CONFIRMED',
      approvalStatus: 'PENDING',
      createdAt: new Date(),
      student,
    });
    (db as any).notification = { create: vi.fn().mockResolvedValue({}) };
    paymentServiceMock.refundOrphanedCardPayment.mockResolvedValue(undefined);
  });

  it('creates a booking end-to-end for a valid wallet payment (morning slot, 09:00-10:00)', async () => {
    const booking = await createBooking('parent-1', validPayload);
    expect(booking.id).toBe('booking-1');
    expect(booking.startTime).toBe('09:00');
    expect(paymentServiceMock.chargeWalletForBooking).toHaveBeenCalledOnce();
    expect((db as any).booking.create).toHaveBeenCalledOnce();
  });

  it('creates a booking for a valid afternoon slot (14:00-15:00) within the tutor\'s stated availability', async () => {
    const booking = await createBooking('parent-1', { ...validPayload, startTime: '14:00', endTime: '15:00' });
    expect(booking.id).toBe('booking-1');
    expect((db as any).booking.create).toHaveBeenCalledOnce();
    expect((db as any).booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ startTime: '14:00', endTime: '15:00' }) })
    );
  });

  it('verifies payment and attaches it for a card payment', async () => {
    await createBooking('parent-1', { ...validPayload, paymentSource: 'CARD', paystackReference: 'ref_abc' });
    expect(paymentServiceMock.verifyBookingPayment).toHaveBeenCalledWith('parent-1', 'ref_abc', 5500);
    expect(paymentServiceMock.attachBookingToCardPayment).toHaveBeenCalledOnce();
    expect(paymentServiceMock.chargeWalletForBooking).not.toHaveBeenCalled();
  });

  it('rejects an unknown student', async () => {
    db.student.findUnique.mockResolvedValueOnce(null);
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 404, code: 'STUDENT_NOT_FOUND' });
  });

  it('rejects a student that does not belong to the requesting parent (IDOR guard)', async () => {
    db.student.findUnique.mockResolvedValueOnce({ ...student, parentId: 'someone-else' });
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 404, code: 'STUDENT_NOT_FOUND' });
  });

  it('rejects a tutor that is not found, unverified, or has no session price', async () => {
    db.user.findFirst.mockResolvedValueOnce(null);
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 404, code: 'TUTOR_NOT_BOOKABLE' });
  });

  it('rejects a subject the tutor does not offer', async () => {
    await expect(createBooking('parent-1', { ...validPayload, subject: 'Physics' })).rejects.toMatchObject({ statusCode: 400, code: 'SUBJECT_NOT_OFFERED' });
  });

  it('rejects a date it cannot parse', async () => {
    await expect(createBooking('parent-1', { ...validPayload, date: 'not-a-date' })).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_DATE' });
  });

  it('rejects a session start time in the past', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
    await expect(createBooking('parent-1', { ...validPayload, date: pastDate })).rejects.toMatchObject({ statusCode: 400, code: 'SESSION_IN_PAST' });
  });

  it('rejects a time slot outside the tutor\'s stated availability', async () => {
    db.tutorAvailability.findFirst.mockResolvedValue(null);
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 409, code: 'TUTOR_NOT_AVAILABLE' });
  });

  it('rejects a conflicting/duplicate booking for the same tutor slot', async () => {
    db.booking.findFirst.mockResolvedValue({ tutorId: 'tutor-1' });
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 409, code: 'BOOKING_CONFLICT' });
  });

  it('reports a distinct conflict message when the student (not the tutor) is double-booked', async () => {
    db.booking.findFirst.mockResolvedValue({ tutorId: 'some-other-tutor' });
    await expect(createBooking('parent-1', validPayload)).rejects.toMatchObject({ statusCode: 409, code: 'BOOKING_CONFLICT' });
  });

  it('auto-refunds an already-verified card payment if the booking transaction itself fails (e.g. slot taken in that instant)', async () => {
    db.$transaction.mockRejectedValueOnce(new Error('serialization failure'));

    await expect(createBooking('parent-1', { ...validPayload, paymentSource: 'CARD', paystackReference: 'ref_race' })).rejects.toThrow('serialization failure');

    expect(paymentServiceMock.refundOrphanedCardPayment).toHaveBeenCalledWith('ref_race');
  });

  it('does not attempt a refund for a wallet payment when the booking transaction fails (the debit rolls back with it)', async () => {
    db.$transaction.mockRejectedValueOnce(new Error('serialization failure'));

    await expect(createBooking('parent-1', validPayload)).rejects.toThrow('serialization failure');

    expect(paymentServiceMock.refundOrphanedCardPayment).not.toHaveBeenCalled();
  });
});

describe('listBookings', () => {
  it('scopes results to the requesting parent only', async () => {
    db.booking.findMany.mockResolvedValue([]);
    await listBookings('parent-1');
    expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { parentId: 'parent-1' } }));
  });
});
