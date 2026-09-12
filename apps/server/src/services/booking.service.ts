import type { Booking as PrismaBooking, Prisma, Student } from '@prisma/client';
import type { Booking, CreateBookingPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import * as paymentService from './payment.service.js';

type BookingWithStudent = PrismaBooking & { student: Student };
type DbClient = Prisma.TransactionClient | typeof prisma;

const PLATFORM_FEE_RATE = 0.1;
const ACTIVE_BOOKING_STATUSES = ['CONFIRMED', 'COMPLETED'] as const;

function parseBookingDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Choose a valid session date', 'INVALID_DATE');
  }
  return date;
}

async function assertSlotAvailable(
  db: DbClient,
  tutorId: string,
  studentId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<void> {
  const availability = await db.tutorAvailability.findFirst({
    where: {
      tutorId,
      dayOfWeek: date.getUTCDay(),
      startTime: { lte: startTime },
      endTime: { gte: endTime },
    },
  });
  if (!availability) {
    throw new AppError(409, 'The tutor is not available at that time', 'TUTOR_NOT_AVAILABLE');
  }

  const conflict = await db.booking.findFirst({
    where: {
      date,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      OR: [{ tutorId }, { studentId }],
    },
    select: { tutorId: true },
  });
  if (conflict) {
    const message = conflict.tutorId === tutorId
      ? 'That tutor time has already been booked'
      : 'The selected student already has a lesson at that time';
    throw new AppError(409, message, 'BOOKING_CONFLICT');
  }
}

function toBooking(booking: BookingWithStudent): Booking {
  return {
    id: booking.id,
    studentId: booking.studentId,
    studentName: booking.student.fullName,
    studentGrade: booking.student.grade,
    tutorId: booking.tutorId,
    tutorName: booking.tutorName,
    tutorTitle: booking.tutorTitle,
    tutorPhotoUrl: booking.tutorPhotoUrl,
    subject: booking.subject,
    specificTopic: booking.specificTopic,
    format: booking.format,
    date: booking.date.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    message: booking.message,
    price: booking.price,
    platformFee: booking.platformFee,
    total: booking.total,
    status: booking.status,
    approvalStatus: booking.approvalStatus,
    createdAt: booking.createdAt.toISOString(),
  };
}

export async function createBooking(parentId: string, payload: CreateBookingPayload): Promise<Booking> {
  const student = await prisma.student.findUnique({ where: { id: payload.studentId } });
  if (!student || student.parentId !== parentId) {
    throw new AppError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  }

  const tutor = await prisma.user.findFirst({
    where: {
      id: payload.tutorId,
      role: 'TUTOR',
      accountStatus: 'ACTIVE',
      tutorProfile: { verificationStatus: 'APPROVED' },
    },
    include: { tutorProfile: true },
  });
  if (!tutor?.tutorProfile || tutor.tutorProfile.sessionPrice === null) {
    throw new AppError(404, 'This tutor is not available for booking', 'TUTOR_NOT_BOOKABLE');
  }
  if (!tutor.tutorProfile.subjects.includes(payload.subject)) {
    throw new AppError(400, 'Choose a subject offered by this tutor', 'SUBJECT_NOT_OFFERED');
  }

  const date = parseBookingDate(payload.date);
  const sessionStart = new Date(`${date.toISOString().slice(0, 10)}T${payload.startTime}:00.000Z`);
  if (sessionStart <= new Date()) {
    throw new AppError(400, 'Choose a future session time', 'SESSION_IN_PAST');
  }

  const price = tutor.tutorProfile.sessionPrice;
  const platformFee = Math.round(price * PLATFORM_FEE_RATE);
  const total = price + platformFee;

  // Check before contacting the payment provider, then repeat inside the
  // serializable transaction to close the concurrent-booking window.
  await assertSlotAvailable(prisma, tutor.id, student.id, date, payload.startTime, payload.endTime);

  if (payload.paymentSource === 'CARD') {
    await paymentService.verifyBookingPayment(parentId, payload.paystackReference!, total);
  }

  let booking: BookingWithStudent;
  try {
    booking = await prisma.$transaction(async (tx) => {
      await assertSlotAvailable(tx, tutor.id, student.id, date, payload.startTime, payload.endTime);
      const created = await tx.booking.create({
        data: {
          parentId,
          studentId: payload.studentId,
          tutorId: tutor.id,
          tutorName: tutor.name,
          tutorTitle: tutor.tutorProfile!.professionalTitle ?? 'Tutor',
          tutorPhotoUrl: tutor.tutorProfile!.photoUrl ?? tutor.photoUrl,
          subject: payload.subject,
          specificTopic: payload.specificTopic,
          format: payload.format,
          date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          message: payload.message,
          price,
          platformFee,
          total,
        },
        include: { student: true },
      });

      if (payload.paymentSource === 'CARD') {
        await paymentService.attachBookingToCardPayment(tx, payload.paystackReference!, created.id);
      } else {
        await paymentService.chargeWalletForBooking(tx, parentId, created.id, total);
      }

      await tx.notification.create({
        data: {
          userId: parentId,
          title: 'Payment successful',
          body: `Your payment for ${payload.subject} with ${tutor.name} was successful.`,
        },
      });

      return created;
    }, { isolationLevel: 'Serializable' });
  } catch (err) {
    // The card was already verified/captured before this transaction ran (see
    // verifyBookingPayment above) — if the booking itself couldn't be created (e.g. someone
    // else took the slot in that instant), refund the now-orphaned charge rather than leaving
    // it captured with no booking attached. Wallet payments don't need this: the debit happens
    // inside this same transaction, so it rolls back automatically.
    if (payload.paymentSource === 'CARD') {
      await paymentService.refundOrphanedCardPayment(payload.paystackReference!).catch((refundErr) => {
        console.error('[booking] Failed to auto-refund an orphaned verified payment:', payload.paystackReference, refundErr);
      });
    }
    throw err;
  }

  return toBooking(booking);
}

export async function listBookings(parentId: string): Promise<Booking[]> {
  const bookings = await prisma.booking.findMany({
    where: { parentId },
    include: { student: true },
    orderBy: { date: 'asc' },
  });

  return bookings.map(toBooking);
}
