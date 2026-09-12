import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Booking, BookingFormat, Student, WalletDto, InitializePaymentResponse, PublicTutorDto } from '@mentora/shared';
import type { Tutor } from '../data/tutors';
import { apiRequest, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { openPaystackCheckout } from '../lib/paystack';
import { adaptPublicTutor } from '../lib/tutorAdapter';
import { Avatar, InitialsAvatar } from '../components/Avatar';
import {
  isPastDate,
  isSameDate,
  formatBookingDate,
  formatDateForApi,
  getRealTimeSlotsForDate,
  isRealDateAvailable,
} from '../lib/scheduling';
import type { TimeSlot, RealAvailabilitySlot } from '../lib/scheduling';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  StarIcon,
  UserFieldIcon,
  BookIcon,
  VideoIcon,
  UsersIcon,
  MonitorPlayIcon,
  CalendarIcon,
  ClockIcon,
  InfoIcon,
  ShieldCheckIcon,
  CardIcon,
  WalletIcon,
} from '../components/Icons';

const FORMAT_OPTIONS: { key: BookingFormat; label: string; description: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: 'ONE_ON_ONE', label: '1-on-1 Live Session', description: 'Real-time interactive video session', icon: VideoIcon },
  { key: 'GROUP', label: 'Group Session', description: 'Learn with a small group of students', icon: UsersIcon },
  { key: 'RECORDED', label: 'Recorded Session', description: 'Tutor will share a recorded lesson', icon: MonitorPlayIcon },
];

const FORMAT_LABELS: Record<BookingFormat, string> = {
  ONE_ON_ONE: '1-on-1 Live Session',
  GROUP: 'Group Session',
  RECORDED: 'Recorded Session',
};

const PLATFORM_FEE_RATE = 0.1;
const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const INITIAL_SLOT_COUNT = 7;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarGrid(monthDate: Date): { date: Date; inMonth: boolean }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

function TutorMiniCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="booking-tutor-mini">
      {tutor.photo ? (
        <img src={tutor.photo} alt="" aria-hidden="true" className="booking-tutor-mini-photo" />
      ) : (
        <InitialsAvatar name={tutor.name} className="booking-tutor-mini-photo" />
      )}
      <div>
        <strong>{tutor.name} {tutor.verified && <CheckIcon className="dash-verified-icon" />}</strong>
        <p>{tutor.title}</p>
        <span className="booking-tutor-mini-rating"><StarIcon className="dash-tutor-rating-icon" /> {tutor.rating} ({tutor.reviews} reviews)</span>
      </div>
    </div>
  );
}

export function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [realTutorDto, setRealTutorDto] = useState<PublicTutorDto | null | undefined>(undefined);
  const [realAvailability, setRealAvailability] = useState<RealAvailabilitySlot[]>([]);

  useEffect(() => {
    if (!id) {
      setRealTutorDto(null);
      return;
    }
    apiRequest<{ tutor: PublicTutorDto }>(`/api/tutors/${id}`)
      .then((res) => setRealTutorDto(res.data?.tutor ?? null))
      .catch(() => setRealTutorDto(null));
    apiRequest<{ slots: RealAvailabilitySlot[] }>(`/api/tutors/${id}/availability`)
      .then((res) => setRealAvailability(res.data?.slots ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tutor = realTutorDto ? adaptPublicTutor(realTutorDto) : undefined;

  const [students, setStudents] = useState<Student[] | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);

  const [subject, setSubject] = useState('');
  const [specificTopic, setSpecificTopic] = useState('');
  const [format, setFormat] = useState<BookingFormat>('ONE_ON_ONE');

  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showMoreTimes, setShowMoreTimes] = useState(false);

  const [message, setMessage] = useState('');

  const [stage, setStage] = useState<'form' | 'review' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incompleteMessage, setIncompleteMessage] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [paymentSource, setPaymentSource] = useState<'CARD' | 'WALLET'>('CARD');

  const studentSectionRef = useRef<HTMLDivElement>(null);
  const subjectSectionRef = useRef<HTMLDivElement>(null);
  const formatSectionRef = useRef<HTMLDivElement>(null);
  const dateSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students')
      .then((res) => {
        const list = res.data?.students ?? [];
        setStudents(list);
        if (list.length > 0) setSelectedStudentId(list[0].id);
      })
      .catch(() => setStudents([]));
    apiRequest<{ wallet: WalletDto }>('/api/payments/wallet')
      .then((res) => setWallet(res.data?.wallet ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tutor && tutor.expertise.length > 0) setSubject((prev) => prev || tutor.expertise[0]);
  }, [tutor]);

  useEffect(() => {
    if (selectedStudentId && subject && format && selectedDate && selectedSlot) {
      setIncompleteMessage(null);
      setAttemptedSubmit(false);
    }
  }, [selectedStudentId, subject, format, selectedDate, selectedSlot]);

  if (!tutor) {
    if (realTutorDto === undefined) return null;
    return (
      <div className="dash-coming-soon">
        <h2>Tutor not found</h2>
        <p>This tutor profile doesn't exist or may have been removed.</p>
        <Link to="/dashboard/tutors" className="btn btn-primary">Back to search results</Link>
      </div>
    );
  }

  const selectedStudent = students?.find((s) => s.id === selectedStudentId) ?? null;
  const studentFirstName = selectedStudent?.fullName.split(' ')[0] ?? 'your child';
  const slots = selectedDate ? getRealTimeSlotsForDate(realAvailability, selectedDate) : [];
  const visibleSlots = showMoreTimes ? slots : slots.slice(0, INITIAL_SLOT_COUNT);

  const platformFee = Math.round(tutor.price * PLATFORM_FEE_RATE);
  const total = tutor.price + platformFee;

  const steps: { key: string; label: string; icon: (p: { className?: string }) => JSX.Element; ref: RefObject<HTMLDivElement> | null; done: boolean }[] = [
    { key: 'student', label: 'Child', icon: UserFieldIcon, ref: studentSectionRef, done: Boolean(selectedStudent) },
    { key: 'subject', label: 'Subject / Skill', icon: BookIcon, ref: subjectSectionRef, done: Boolean(subject) },
    { key: 'format', label: 'Format', icon: VideoIcon, ref: formatSectionRef, done: Boolean(format) },
    { key: 'datetime', label: 'Date & Time', icon: CalendarIcon, ref: dateSectionRef, done: Boolean(selectedDate && selectedSlot) },
    { key: 'review', label: 'Review', icon: CheckIcon, ref: null, done: stage !== 'form' },
  ];
  const firstIncomplete = steps.findIndex((s) => !s.done);
  const activeIndex = stage !== 'form' ? 4 : firstIncomplete === -1 ? 3 : firstIncomplete;

  const isComplete = Boolean(selectedStudent && subject && format && selectedDate && selectedSlot);

  function goToStep(step: (typeof steps)[number]) {
    step.ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleReviewClick() {
    if (!isComplete) {
      const missing = steps.filter((s) => s.key !== 'review' && !s.done);
      setIncompleteMessage(`Please complete: ${missing.map((s) => s.label).join(', ')} before continuing.`);
      setAttemptedSubmit(true);
      const firstMissing = missing[0];
      firstMissing?.ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setIncompleteMessage(null);
    setStage('review');
  }

  function sectionClassName(key: string): string {
    const step = steps.find((s) => s.key === key);
    return attemptedSubmit && step && !step.done ? 'dash-card booking-section-incomplete' : 'dash-card';
  }

  function handleSelectDate(date: Date) {
    if (!tutor) return;
    const available = isRealDateAvailable(realAvailability, date);
    if (!available) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowMoreTimes(false);
  }

  async function handleConfirm() {
    if (!tutor || !selectedStudent || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);

    const bookingFields = {
      studentId: selectedStudent.id,
      tutorId: tutor.id,
      tutorName: tutor.name,
      tutorTitle: tutor.title,
      tutorPhotoUrl: tutor.photo,
      subject,
      specificTopic: specificTopic.trim() || undefined,
      format,
      date: formatDateForApi(selectedDate),
      startTime: selectedSlot.startValue,
      endTime: selectedSlot.endValue,
      message: message.trim() || undefined,
      price: tutor.price,
      platformFee,
      total,
    };

    try {
      let paystackReference: string | undefined;

      if (paymentSource === 'CARD') {
        if (!user?.email) throw new Error('Could not determine your account email. Please reload and try again.');
        const init = await apiRequest<InitializePaymentResponse>('/api/payments/initialize', {
          method: 'POST',
          body: JSON.stringify({ amount: total, purpose: 'BOOKING_PAYMENT' }),
        });
        if (!init.data) throw new Error('Could not start payment. Please try again.');

        const result = await openPaystackCheckout({ email: user.email, amountNaira: total, reference: init.data.reference });
        if (!result) {
          setSubmitError('Payment was cancelled — your session was not booked.');
          setSubmitting(false);
          return;
        }
        paystackReference = result.reference;
      } else if ((wallet?.balance ?? 0) < total) {
        setSubmitError('Your wallet balance is too low for this session. Top up your wallet or pay with a card.');
        setSubmitting(false);
        return;
      }

      const res = await apiRequest<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...bookingFields, paymentSource, paystackReference }),
      });
      setCreatedBooking(res.data?.booking ?? null);
      setStage('success');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not confirm your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const stepper = (
    <div className="booking-stepper">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const state = index < activeIndex || step.done ? 'done' : index === activeIndex ? 'active' : 'upcoming';
        return (
          <button
            key={step.key}
            type="button"
            className={`booking-step booking-step-${state}`}
            onClick={() => goToStep(step)}
            disabled={!step.ref}
          >
            <span className="booking-step-icon">{state === 'done' ? <CheckIcon /> : <Icon />}</span>
            <span className="booking-step-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (stage === 'success' && createdBooking) {
    return (
      <div className="booking-success">
        <span className="booking-success-icon"><CheckIcon /></span>
        <h1>Booking Confirmed!</h1>
        <p>Your session with {createdBooking.tutorName} for {createdBooking.studentName} is booked for {formatBookingDate(new Date(createdBooking.date))} at {createdBooking.startTime}.</p>
        <div className="booking-success-actions">
          <Link to="/dashboard/bookings" className="btn btn-primary">View My Bookings <span aria-hidden="true">→</span></Link>
          <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (stage === 'review' && selectedStudent && selectedDate && selectedSlot) {
    return (
      <div className="booking-review">
        <button type="button" className="tprofile-back" onClick={() => setStage('form')}>
          <ChevronLeftIcon /> Edit Details
        </button>

        <h1>Review Your Booking</h1>
        <p>Please confirm the details below before booking.</p>

        <div className="dash-card booking-review-card">
          <TutorMiniCard tutor={tutor} />
          <div className="booking-summary-list">
            <div className="booking-summary-row">
              <UserFieldIcon />
              <div><span>Child</span><strong>{selectedStudent.fullName} {selectedStudent.grade ? `(${selectedStudent.grade})` : ''}</strong></div>
            </div>
            <div className="booking-summary-row">
              <BookIcon />
              <div><span>Subject / Skill</span><strong>{subject}{specificTopic ? ` — ${specificTopic}` : ''}</strong></div>
            </div>
            <div className="booking-summary-row">
              <VideoIcon />
              <div><span>Session Format</span><strong>{FORMAT_LABELS[format]}</strong></div>
            </div>
            <div className="booking-summary-row">
              <CalendarIcon />
              <div><span>Date &amp; Time</span><strong>{formatBookingDate(selectedDate)}<br />{selectedSlot.start} – {selectedSlot.end} (WAT)</strong></div>
            </div>
            <div className="booking-summary-row">
              <ClockIcon />
              <div><span>Duration</span><strong>1 Hour</strong></div>
            </div>
            {message && (
              <div className="booking-summary-row">
                <InfoIcon />
                <div><span>Message</span><strong>{message}</strong></div>
              </div>
            )}
          </div>

          <div className="booking-price-breakdown">
            <div><span>Subtotal</span><span>₦{tutor.price.toLocaleString()}</span></div>
            <div><span>Platform Fee</span><span>₦{platformFee.toLocaleString()}</span></div>
            <div className="booking-price-total"><span>Total</span><span>₦{total.toLocaleString()}</span></div>
          </div>

          <div className="booking-payment-source">
            <span className="field-label-standalone">Pay with</span>
            <div className="booking-payment-options">
              <button type="button" className={paymentSource === 'CARD' ? 'booking-payment-option active' : 'booking-payment-option'} onClick={() => setPaymentSource('CARD')}>
                <CardIcon /> Card
              </button>
              <button
                type="button"
                className={paymentSource === 'WALLET' ? 'booking-payment-option active' : 'booking-payment-option'}
                onClick={() => setPaymentSource('WALLET')}
                disabled={(wallet?.balance ?? 0) < total}
              >
                <WalletIcon /> Wallet (₦{(wallet?.balance ?? 0).toLocaleString()})
              </button>
            </div>
            {paymentSource === 'WALLET' && (wallet?.balance ?? 0) < total && (
              <span className="booking-payment-hint">Insufficient wallet balance for this session.</span>
            )}
          </div>

          {submitError && <p className="photo-uploader-error">{submitError}</p>}

          <button type="button" className="btn btn-primary full" disabled={submitting} onClick={handleConfirm}>
            {submitting ? 'Processing payment…' : `Pay ₦${total.toLocaleString()} & Book Session`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <Link to={`/dashboard/tutors/${tutor.id}`} className="tprofile-back"><ChevronLeftIcon /> Back to tutor profile</Link>

      <div className="booking-header">
        <div>
          <h1>Book a Session with {tutor.name}</h1>
          <p>Fill in the details below to schedule your session.</p>
        </div>
        <TutorMiniCard tutor={tutor} />
      </div>

      {stepper}

      <div className="booking-layout">
        <div className="booking-main">
          <section className={sectionClassName('student')} ref={studentSectionRef}>
            <h2 className="booking-section-title"><span className="booking-number">1</span> Select Child</h2>

            {students && students.length > 0 ? (
              <>
                <div className="booking-student-picker">
                  <button type="button" className="booking-student-trigger" onClick={() => setStudentMenuOpen((v) => !v)}>
                    {selectedStudent && (
                      <>
                        <Avatar name={selectedStudent.fullName} photoUrl={selectedStudent.photoUrl} className="booking-student-avatar" />
                        <span className="booking-student-info">
                          <strong>{selectedStudent.fullName}</strong>
                          <span>{selectedStudent.grade || 'Grade not set'}</span>
                        </span>
                      </>
                    )}
                    <ChevronDownIcon />
                  </button>
                  {studentMenuOpen && (
                    <div className="disc-student-menu booking-student-menu" role="menu">
                      {students.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="menuitem"
                          className={s.id === selectedStudentId ? 'active' : ''}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setStudentMenuOpen(false);
                          }}
                        >
                          {s.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/onboarding/add-student" className="btn btn-secondary booking-add-student">+ Add Another Child</Link>
              </>
            ) : students === null ? null : (
              <div className="mystudents-empty">
                <p>You need to add a child before booking a session.</p>
                <Link to="/onboarding/add-student" className="btn btn-primary">Add a Child <span aria-hidden="true">→</span></Link>
              </div>
            )}
          </section>

          <section className={sectionClassName('subject')} ref={subjectSectionRef}>
            <h2 className="booking-section-title"><span className="booking-number">2</span> Subject / Skill</h2>
            <p className="booking-section-hint">What would you like {studentFirstName} to learn?</p>
            <label className="booking-select-wrap">
              <BookIcon />
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {tutor.expertise.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="booking-field">
              <span>Specific topic (optional)</span>
              <input
                type="text"
                value={specificTopic}
                onChange={(e) => setSpecificTopic(e.target.value)}
                placeholder="e.g. Introduction to Machine Learning, Neural Networks..."
                maxLength={120}
              />
            </label>
          </section>

          <section className={sectionClassName('format')} ref={formatSectionRef}>
            <h2 className="booking-section-title"><span className="booking-number">3</span> Session Format</h2>
            <p className="booking-section-hint">Choose how you want the session to be conducted.</p>
            <div className="booking-format-grid">
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = format === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={active ? 'booking-format-card active' : 'booking-format-card'}
                    onClick={() => setFormat(option.key)}
                  >
                    <span className="booking-format-top">
                      <Icon />
                      <span className={active ? 'booking-radio checked' : 'booking-radio'} />
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={sectionClassName('datetime')} ref={dateSectionRef}>
            <h2 className="booking-section-title"><span className="booking-number">4</span> Date &amp; Time</h2>
            <p className="booking-section-hint">Select a date and available time.</p>

            <div className="booking-date-layout">
              <div className="booking-calendar">
                <div className="booking-calendar-header">
                  <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">
                    <ChevronLeftIcon />
                  </button>
                  <strong>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                  <button type="button" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">
                    <ChevronRightIcon />
                  </button>
                </div>
                <div className="booking-calendar-weekdays">
                  {WEEKDAY_HEADERS.map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="booking-calendar-grid">
                  {buildCalendarGrid(calendarMonth).map(({ date, inMonth }) => {
                    const available = inMonth && isRealDateAvailable(realAvailability, date);
                    const selected = selectedDate && isSameDate(date, selectedDate);
                    const past = isPastDate(date);
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        disabled={!available}
                        className={[
                          'booking-day',
                          !inMonth ? 'outside' : '',
                          selected ? 'selected' : '',
                          !available && inMonth && !past ? 'unavailable' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleSelectDate(date)}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="booking-times">
                <strong>Available times for {selectedDate ? formatBookingDate(selectedDate) : '—'}</strong>
                {selectedDate ? (
                  slots.length > 0 ? (
                    <>
                      <div className="booking-times-grid">
                        {visibleSlots.map((slot) => (
                          <button
                            key={slot.start}
                            type="button"
                            className={selectedSlot?.start === slot.start ? 'booking-time active' : 'booking-time'}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                      {!showMoreTimes && slots.length > INITIAL_SLOT_COUNT && (
                        <button type="button" className="booking-more-times" onClick={() => setShowMoreTimes(true)}>
                          View more times <ChevronDownIcon />
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="booking-section-hint">No available times on this date.</p>
                  )
                ) : (
                  <p className="booking-section-hint">Choose a date to see available times.</p>
                )}
                <p className="tprofile-tz-note"><ClockIcon /> All times are shown in WAT (West Africa Time)</p>
              </div>
            </div>
          </section>

          <section className="dash-card">
            <h2 className="booking-section-title"><span className="booking-number">5</span> Add a Message (optional)</h2>
            <p className="booking-section-hint">Anything specific the tutor should know about your learning goals?</p>
            <textarea
              className="booking-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 250))}
              placeholder="e.g. We are preparing for a STEM competition..."
              rows={3}
            />
            <span className="booking-char-count">{message.length}/250</span>
          </section>

          {incompleteMessage && (
            <p className="form-error booking-incomplete-hint" role="alert">{incompleteMessage}</p>
          )}
          <button
            type="button"
            className="btn btn-primary full booking-review-btn"
            onClick={handleReviewClick}
          >
            Review Booking <span aria-hidden="true">→</span>
          </button>
        </div>

        <aside className="booking-sidebar">
          <div className="dash-card">
            <h2>Booking Summary</h2>
            <TutorMiniCard tutor={tutor} />

            <div className="booking-summary-list">
              <div className="booking-summary-row">
                <UserFieldIcon />
                <div>
                  <span>Child</span>
                  <strong>{selectedStudent ? `${selectedStudent.fullName}${selectedStudent.grade ? ` (${selectedStudent.grade})` : ''}` : 'Not selected'}</strong>
                </div>
              </div>
              <div className="booking-summary-row">
                <BookIcon />
                <div><span>Subject / Skill</span><strong>{subject || 'Not selected'}</strong></div>
              </div>
              <div className="booking-summary-row">
                <VideoIcon />
                <div><span>Session Format</span><strong>{FORMAT_LABELS[format]}</strong></div>
              </div>
              <div className="booking-summary-row">
                <CalendarIcon />
                <div>
                  <span>Date &amp; Time</span>
                  <strong>
                    {selectedDate ? formatBookingDate(selectedDate) : 'Not selected'}
                    {selectedSlot ? <><br />{selectedSlot.start} – {selectedSlot.end} (WAT)</> : null}
                  </strong>
                </div>
              </div>
              <div className="booking-summary-row">
                <ClockIcon />
                <div><span>Duration</span><strong>1 Hour</strong></div>
              </div>
            </div>

            <div className="booking-price-breakdown">
              <div><span>Subtotal</span><span>₦{tutor.price.toLocaleString()}</span></div>
              <div><span>Platform Fee <InfoIcon /></span><span>₦{platformFee.toLocaleString()}</span></div>
              <div className="booking-price-total"><span>Total</span><span>₦{total.toLocaleString()}</span></div>
            </div>

            <div className="booking-safe-box">
              <span className="tprofile-verified-box-icon"><ShieldCheckIcon /></span>
              <div>
                <strong>Safe &amp; Secure Booking</strong>
                <span>Your payment is secure and you can reschedule or cancel according to our policy.</span>
              </div>
            </div>

            <div className="booking-perks">
              <span className="booking-perks-title">What you get</span>
              <span><CheckIcon /> High quality live session</span>
              <span><CheckIcon /> Session recording (if available)</span>
              <span><CheckIcon /> Message tutor anytime</span>
              <span><CheckIcon /> 24/7 Customer support</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
