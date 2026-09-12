import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SavedTutor, PublicTutorDto, PublicTutorReviewDto } from '@mentora/shared';
import { getTutorById, getWeeklySchedule, DEFAULT_FAQS } from '../data/tutors';
import { SiteFooter } from '../components/SiteFooter';
import type { FooterColumn } from '../components/SiteFooter';
import { InitialsAvatar, Avatar } from '../components/Avatar';
import { apiRequest } from '../lib/api';
import type { RealAvailabilitySlot } from '../lib/scheduling';
import { formatRealWeeklySchedule } from '../lib/scheduling';
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ShareIcon,
  BookmarkIcon,
  CheckIcon,
  PinIcon,
  ShieldCheckIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
  GlobeIcon,
  GraduationCapIcon,
  SparkleIcon,
  ChartIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  ChatIcon,
} from '../components/Icons';

const PROFILE_FOOTER_COLUMNS: FooterColumn[] = [
  { heading: 'Platform', items: ['Find a Tutor', 'How it Works', 'Pricing', 'FAQs'] },
  { heading: 'For Parents', items: ['My Children', 'My Bookings', 'Messages', 'Saved Tutors'] },
  { heading: 'For Tutors', items: ['Become a Tutor', 'Tutor Dashboard', 'Resources', 'Community'] },
  { heading: 'Support', items: ['Help Center', 'Contact Us', 'Privacy Policy', 'Terms of Service'] },
];

type TabKey = 'overview' | 'experience' | 'reviews' | 'availability' | 'faq';

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="tprofile-stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(Math.max(0, 5 - rounded))}
    </span>
  );
}

export function TutorProfilePage() {
  const { id } = useParams();
  const tutor = id ? getTutorById(id) : undefined;

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const expertiseRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const availabilityRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tutor) return;
    apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors')
      .then((res) => setSaved((res.data?.saved ?? []).some((s) => s.tutorId === tutor.id)))
      .catch(() => {});
    apiRequest('/api/tutor-views', { method: 'POST', body: JSON.stringify({ tutorId: tutor.id }) }).catch(() => {});
  }, [tutor]);

  if (!tutor) {
    return id ? <RealTutorProfileView id={id} /> : <TutorNotFound />;
  }

  const firstName = tutor.name.split(' ')[0];
  const schedule = getWeeklySchedule(tutor.status);

  const tabs: { key: TabKey; label: string; ref: RefObject<HTMLDivElement> }[] = [
    { key: 'overview', label: 'Overview', ref: expertiseRef },
    { key: 'experience', label: 'Experience', ref: experienceRef },
    { key: 'reviews', label: 'Reviews', ref: reviewsRef },
    { key: 'availability', label: 'Availability', ref: availabilityRef },
    { key: 'faq', label: 'FAQ', ref: faqRef },
  ];

  function goToTab(tab: (typeof tabs)[number]) {
    setActiveTab(tab.key);
    tab.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleToggleSave() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) {
        await apiRequest(`/api/saved-tutors/${tutor!.id}`, { method: 'DELETE' });
      } else {
        await apiRequest('/api/saved-tutors', { method: 'POST', body: JSON.stringify({ tutorId: tutor!.id }) });
      }
    } catch {
      setSaved(wasSaved);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `${tutor!.name} on Mentora`, url });
      } catch {
        // user cancelled the native share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }

  return (
    <div className="tprofile">
      <div className="tprofile-toolbar">
        <Link to="/dashboard/tutors" className="tprofile-back"><ChevronLeftIcon /> Back to search results</Link>
        <div className="tprofile-toolbar-actions">
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            <ShareIcon /> {shareStatus === 'copied' ? 'Link copied!' : 'Share'}
          </button>
          <button
            type="button"
            className={saved ? 'btn btn-secondary active' : 'btn btn-secondary'}
            aria-pressed={saved}
            onClick={handleToggleSave}
          >
            <BookmarkIcon /> {saved ? 'Saved' : 'Save Tutor'}
          </button>
        </div>
      </div>

      <div className="tprofile-layout">
        <div className="tprofile-main">
          <section className="dash-card tprofile-header-card">
            <div className="tprofile-header-top">
              {tutor.photo ? (
                <img src={tutor.photo} alt="" aria-hidden="true" className="tprofile-photo" />
              ) : (
                <InitialsAvatar name={tutor.name} className="tprofile-photo" />
              )}

              <div className="tprofile-header-info">
                <h1>{tutor.name} {tutor.verified && <CheckIcon className="dash-verified-icon" />}</h1>
                <p className="tprofile-title">{tutor.title}</p>
                <div className="tprofile-status-row">
                  <span className={tutor.status === 'Online' ? 'dash-status-pill online' : 'dash-status-pill busy'}>{tutor.status}</span>
                  <span className="tprofile-location"><PinIcon /> {tutor.location}</span>
                </div>
              </div>

              {tutor.verified && (
                <div className="tprofile-verified-box">
                  <span className="tprofile-verified-box-icon"><ShieldCheckIcon /></span>
                  <div>
                    <strong>Verified Tutor</strong>
                    <span>Identity and qualifications verified</span>
                    <a href="#trust">View Verification <span aria-hidden="true">→</span></a>
                  </div>
                </div>
              )}
            </div>

            <div className="tprofile-stats-row">
              <span><StarIcon className="dash-tutor-rating-icon" /> <strong>{tutor.rating}</strong> ({tutor.reviews} reviews)</span>
              <span><TrophyIcon /> {tutor.experienceYears}+ years experience</span>
              <span><UsersIcon /> {tutor.studentsTaught}+ students taught</span>
            </div>

            <div className="tprofile-tags">
              {tutor.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="disc-tag">{tag}</span>
              ))}
              {tutor.tags.length > 5 && <span className="disc-tag">+{tutor.tags.length - 5}</span>}
            </div>
          </section>

          <section className="dash-card">
            <h2>About {firstName}</h2>
            <p className="tprofile-bio">{tutor.bio}</p>

            <div className="tprofile-about-grid">
              <div>
                <h3><GlobeIcon /> Languages</h3>
                <p>{tutor.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
              </div>
              <div>
                <h3><GraduationCapIcon /> Education</h3>
                <p>{tutor.educationDetail}</p>
              </div>
            </div>

            <nav className="tprofile-tabs" aria-label="Profile sections">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? 'active' : ''}
                  onClick={() => goToTab(tab)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </section>

          <section className="dash-card" ref={expertiseRef}>
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-purple"><SparkleIcon /></span>
              <div>
                <h2>Expertise</h2>
                <p>Subjects and skills I can help with.</p>
              </div>
            </div>
            <div className="tprofile-chip-grid">
              {tutor.expertise.map((item) => (
                <span key={item} className="disc-tag">{item}</span>
              ))}
            </div>
          </section>

          <section className="dash-card" ref={experienceRef}>
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-green"><ChartIcon /></span>
              <div>
                <h2>Experience</h2>
                <p>My teaching and professional journey.</p>
              </div>
            </div>

            <div className="tprofile-experience-stats">
              <div className="tprofile-experience-stat">
                <UsersIcon />
                <div>
                  <strong>{tutor.experienceYears}+ years</strong>
                  <span>Teaching Experience</span>
                </div>
              </div>
              <div className="tprofile-experience-stat">
                <UsersIcon />
                <div>
                  <strong>{tutor.studentsTaught}+</strong>
                  <span>Students Taught</span>
                </div>
              </div>
            </div>

            <div className="tprofile-history">
              {tutor.experienceHistory.map((job) => (
                <div key={`${job.role}-${job.org}`} className="tprofile-history-row">
                  <BriefcaseIcon />
                  <div>
                    <strong>{job.role}</strong>
                    <span>{job.org}</span>
                  </div>
                  <span className="tprofile-period">{job.period}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dash-card" ref={availabilityRef}>
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-blue"><CalendarIcon /></span>
              <div>
                <h2>Availability</h2>
                <p>Times I'm usually available for sessions.</p>
              </div>
            </div>

            <div className="tprofile-schedule">
              {schedule.map((d, i) => (
                <div key={d.day} className={!d.hours ? 'tprofile-day off' : i === 1 ? 'tprofile-day highlight' : 'tprofile-day'}>
                  <strong>{d.day}</strong>
                  <span>{d.hours ?? 'Not Available'}</span>
                </div>
              ))}
            </div>
            <p className="tprofile-tz-note"><ClockIcon /> All times are shown in WAT (West Africa Time)</p>
          </section>

          <section className="dash-card">
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-orange"><ShieldCheckIcon /></span>
              <div>
                <h2>What you'll learn</h2>
                <p>Outcomes you can expect from learning with me.</p>
              </div>
            </div>
            <div className="tprofile-outcomes">
              {tutor.outcomes.map((outcome) => (
                <div key={outcome} className="tprofile-outcome"><CheckIcon /> <span>{outcome}</span></div>
              ))}
            </div>
          </section>

          <section className="dash-card" ref={reviewsRef}>
            <div className="tprofile-section-heading spread">
              <div className="tprofile-section-heading">
                <span className="tprofile-badge tone-blue"><ChatIcon /></span>
                <div>
                  <h2>Reviews</h2>
                  <p>What my students are saying.</p>
                </div>
              </div>
              <Link to="/dashboard/reviews">View all reviews <span aria-hidden="true">→</span></Link>
            </div>

            <div className="tprofile-reviews-row">
              <div className="tprofile-rating-summary">
                <strong>{tutor.rating}</strong>
                <Stars rating={tutor.rating} />
                <span>{tutor.reviews} reviews</span>
                <div className="tprofile-rating-bars">
                  {tutor.ratingBreakdown.map((b) => (
                    <div key={b.stars} className="tprofile-rating-bar-row">
                      <span>{b.stars} {b.stars === 1 ? 'Star' : 'Stars'}</span>
                      <div className="tprofile-rating-bar"><span style={{ width: `${b.percent}%` }} /></div>
                      <span>{b.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tprofile-review-list">
                {tutor.reviewsList.map((review) => (
                  <div key={`${review.name}-${review.date}`} className="tprofile-review-card">
                    <InitialsAvatar name={review.name} className="tprofile-review-avatar" />
                    <div>
                      <div className="tprofile-review-head">
                        <strong>{review.name}</strong>
                        {review.verified && <span className="tprofile-review-verified">Verified Student</span>}
                      </div>
                      <div className="tprofile-review-meta">
                        <Stars rating={review.rating} />
                        <span>{review.date}</span>
                      </div>
                      <p>{review.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="tprofile-cta-banner">
            <span className="dash-sticky-icon"><GraduationCapIcon /></span>
            <div className="dash-sticky-copy">
              <strong>Ready to achieve your learning goals?</strong>
              <span>Book a session with {firstName} and start your journey today.</span>
            </div>
            <Link to={`/dashboard/tutors/${tutor.id}/book`} className="btn btn-primary">Book a Session Now <span aria-hidden="true">→</span></Link>
          </section>
        </div>

        <aside className="tprofile-sidebar">
          <div className="dash-card tprofile-booking-card">
            <span className="tprofile-price-label">From</span>
            <strong className="tprofile-price">₦{tutor.price.toLocaleString()}<span> / session</span></strong>

            <div className="tprofile-session-pills">
              <span>{tutor.sessionTypes.includes('online') ? 'Online' : 'In-person'}</span>
              <span>1-on-1 Session</span>
            </div>

            <Link to={`/dashboard/tutors/${tutor.id}/book`} className="btn btn-primary full"><CalendarIcon /> Book a Session</Link>
            <Link to={`/dashboard/messages?tutor=${tutor.id}`} className="btn btn-secondary full"><ChatIcon /> Message Tutor</Link>
            <p className="tprofile-response-time">Avg. response time: {tutor.avgResponseTime}</p>

            <div className="tprofile-guarantees">
              <span><CheckIcon /> Quality teaching</span>
              <span><CheckIcon /> Flexible scheduling</span>
              <span><CheckIcon /> Satisfaction guarantee</span>
            </div>
          </div>

          <div className="dash-card" id="trust">
            <h2>Verified &amp; Trusted</h2>
            <div className="tprofile-trust-list">
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>ID Verified</strong><span>Government ID verified</span></div>
              </div>
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>Education Verified</strong><span>{tutor.education}</span></div>
              </div>
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>Background Checked</strong><span>Completed</span></div>
              </div>
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>Community Rating</strong><span>{tutor.rating}/5 from {tutor.reviews} students</span></div>
              </div>
            </div>
          </div>

          <div className="dash-card" ref={faqRef}>
            <h2>Frequently Asked Questions</h2>
            <div className="tprofile-faq-list">
              {tutor.faqs.map((faq, i) => (
                <div key={faq.question} className="tprofile-faq-item">
                  <button
                    type="button"
                    aria-expanded={openFaqIndex === i}
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDownIcon className={openFaqIndex === i ? 'open' : ''} />
                  </button>
                  {openFaqIndex === i && <p>{faq.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <SiteFooter
        tagline="Connecting learners with expert tutors for better learning outcomes."
        columns={PROFILE_FOOTER_COLUMNS}
      />
    </div>
  );
}

function TutorNotFound() {
  return (
    <div className="dash-coming-soon">
      <h2>Tutor not found</h2>
      <p>This tutor profile doesn't exist or may have been removed.</p>
      <Link to="/dashboard/tutors" className="btn btn-primary">Back to search results</Link>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return '1 month ago';
  return `${months} months ago`;
}

function ratingBreakdownFromReviews(reviews: PublicTutorReviewDto[]): { stars: number; percent: number }[] {
  const total = reviews.length;
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    return { stars, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

/** A leaner, honest detail view for real self-registered tutors — no fabricated
 * experience history, canned reviews, or response-time claims; every stat shown
 * here is computed from real bookings, reviews and availability. */
function RealTutorProfileView({ id }: { id: string }) {
  const [tutor, setTutor] = useState<PublicTutorDto | null | undefined>(undefined);
  const [reviews, setReviews] = useState<PublicTutorReviewDto[]>([]);
  const [availability, setAvailability] = useState<RealAvailabilitySlot[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiRequest<{ tutor: PublicTutorDto }>(`/api/tutors/${id}`)
      .then((res) => setTutor(res.data?.tutor ?? null))
      .catch(() => setTutor(null));
    apiRequest<{ reviews: PublicTutorReviewDto[] }>(`/api/tutors/${id}/reviews`)
      .then((res) => setReviews(res.data?.reviews ?? []))
      .catch(() => {});
    apiRequest<{ slots: RealAvailabilitySlot[] }>(`/api/tutors/${id}/availability`)
      .then((res) => setAvailability(res.data?.slots ?? []))
      .catch(() => {});
    apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors')
      .then((res) => setSaved((res.data?.saved ?? []).some((s) => s.tutorId === id)))
      .catch(() => {});
    apiRequest('/api/tutor-views', { method: 'POST', body: JSON.stringify({ tutorId: id }) }).catch(() => {});
  }, [id]);

  async function handleToggleSave() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) await apiRequest(`/api/saved-tutors/${id}`, { method: 'DELETE' });
      else await apiRequest('/api/saved-tutors', { method: 'POST', body: JSON.stringify({ tutorId: id }) });
    } catch {
      setSaved(wasSaved);
    }
  }

  if (tutor === undefined) return null;
  if (tutor === null) return <TutorNotFound />;

  const firstName = tutor.name.split(' ')[0];
  const schedule = formatRealWeeklySchedule(availability);
  const breakdown = ratingBreakdownFromReviews(reviews);
  const location = [tutor.city, tutor.country].filter(Boolean).join(', ') || 'Location not set';

  return (
    <div className="tprofile">
      <div className="tprofile-toolbar">
        <Link to="/dashboard/tutors" className="tprofile-back"><ChevronLeftIcon /> Back to search results</Link>
        <div className="tprofile-toolbar-actions">
          <button
            type="button"
            className={saved ? 'btn btn-secondary active' : 'btn btn-secondary'}
            aria-pressed={saved}
            onClick={handleToggleSave}
          >
            <BookmarkIcon /> {saved ? 'Saved' : 'Save Tutor'}
          </button>
        </div>
      </div>

      <div className="tprofile-layout">
        <div className="tprofile-main">
          <section className="dash-card tprofile-header-card">
            <div className="tprofile-header-top">
              <Avatar name={tutor.name} photoUrl={tutor.photoUrl} className="tprofile-photo" />

              <div className="tprofile-header-info">
                <h1>{tutor.name} <CheckIcon className="dash-verified-icon" /></h1>
                <p className="tprofile-title">{tutor.professionalTitle ?? 'Tutor'}</p>
                <div className="tprofile-status-row">
                  <span className="tprofile-location"><PinIcon /> {location}</span>
                </div>
              </div>

              <div className="tprofile-verified-box">
                <span className="tprofile-verified-box-icon"><ShieldCheckIcon /></span>
                <div>
                  <strong>Verified Tutor</strong>
                  <span>Identity and qualifications verified</span>
                  <a href="#trust">View Verification <span aria-hidden="true">→</span></a>
                </div>
              </div>
            </div>

            <div className="tprofile-stats-row">
              <span><StarIcon className="dash-tutor-rating-icon" /> <strong>{tutor.rating || 'New'}</strong> {tutor.reviewCount > 0 ? `(${tutor.reviewCount} reviews)` : '(no reviews yet)'}</span>
              {tutor.yearsExperience && <span><TrophyIcon /> {tutor.yearsExperience} experience</span>}
              {tutor.studentsTaught > 0 && <span><UsersIcon /> {tutor.studentsTaught}+ students taught</span>}
            </div>

            <div className="tprofile-tags">
              {tutor.subjects.slice(0, 5).map((tag) => (
                <span key={tag} className="disc-tag">{tag}</span>
              ))}
              {tutor.subjects.length > 5 && <span className="disc-tag">+{tutor.subjects.length - 5}</span>}
            </div>
          </section>

          <section className="dash-card">
            <h2>About {firstName}</h2>
            <p className="tprofile-bio">{tutor.bio || `${firstName} hasn't added a bio yet.`}</p>

            <div className="tprofile-about-grid">
              <div>
                <h3><GlobeIcon /> Languages</h3>
                <p>{tutor.languages.length > 0 ? tutor.languages.join(', ') : 'Not specified'}</p>
              </div>
              <div>
                <h3><GraduationCapIcon /> Education</h3>
                <p>{tutor.qualification ?? 'Not specified'}</p>
              </div>
            </div>
          </section>

          <section className="dash-card">
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-purple"><SparkleIcon /></span>
              <div>
                <h2>Expertise</h2>
                <p>Subjects and skills I can help with.</p>
              </div>
            </div>
            <div className="tprofile-chip-grid">
              {tutor.subjects.map((item) => (
                <span key={item} className="disc-tag">{item}</span>
              ))}
            </div>
          </section>

          <section className="dash-card">
            <div className="tprofile-section-heading">
              <span className="tprofile-badge tone-blue"><CalendarIcon /></span>
              <div>
                <h2>Availability</h2>
                <p>Times I'm usually available for sessions.</p>
              </div>
            </div>

            <div className="tprofile-schedule">
              {schedule.map((d) => (
                <div key={d.day} className={!d.hours ? 'tprofile-day off' : 'tprofile-day'}>
                  <strong>{d.day}</strong>
                  <span>{d.hours ?? 'Not Available'}</span>
                </div>
              ))}
            </div>
            <p className="tprofile-tz-note"><ClockIcon /> All times are shown in WAT (West Africa Time)</p>
          </section>

          <section className="dash-card">
            <div className="tprofile-section-heading spread">
              <div className="tprofile-section-heading">
                <span className="tprofile-badge tone-blue"><ChatIcon /></span>
                <div>
                  <h2>Reviews</h2>
                  <p>What my students are saying.</p>
                </div>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="tprofile-reviews-row">
                <div className="tprofile-rating-summary">
                  <strong>{tutor.rating}</strong>
                  <Stars rating={tutor.rating} />
                  <span>{tutor.reviewCount} reviews</span>
                  <div className="tprofile-rating-bars">
                    {breakdown.map((b) => (
                      <div key={b.stars} className="tprofile-rating-bar-row">
                        <span>{b.stars} {b.stars === 1 ? 'Star' : 'Stars'}</span>
                        <div className="tprofile-rating-bar"><span style={{ width: `${b.percent}%` }} /></div>
                        <span>{b.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tprofile-review-list">
                  {reviews.map((review, i) => (
                    <div key={i} className="tprofile-review-card">
                      <InitialsAvatar name={review.parentName} className="tprofile-review-avatar" />
                      <div>
                        <div className="tprofile-review-head">
                          <strong>{review.parentName}</strong>
                          <span className="tprofile-review-verified">Verified Parent</span>
                        </div>
                        <div className="tprofile-review-meta">
                          <Stars rating={review.rating} />
                          <span>{formatRelative(review.createdAt)}</span>
                        </div>
                        <p>{review.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="booking-section-hint">This tutor doesn't have any reviews yet.</p>
            )}
          </section>

          <section className="tprofile-cta-banner">
            <span className="dash-sticky-icon"><GraduationCapIcon /></span>
            <div className="dash-sticky-copy">
              <strong>Ready to achieve your learning goals?</strong>
              <span>Book a session with {firstName} and start your journey today.</span>
            </div>
            <Link to={`/dashboard/tutors/${tutor.id}/book`} className="btn btn-primary">Book a Session Now <span aria-hidden="true">→</span></Link>
          </section>
        </div>

        <aside className="tprofile-sidebar">
          <div className="dash-card tprofile-booking-card">
            <span className="tprofile-price-label">From</span>
            <strong className="tprofile-price">{tutor.sessionPrice ? `₦${tutor.sessionPrice.toLocaleString()}` : 'Not set'}<span> / session</span></strong>

            <div className="tprofile-session-pills">
              <span>{tutor.teachingFormats.includes('IN_PERSON') ? 'Online & In-person' : 'Online'}</span>
              <span>1-on-1 Session</span>
            </div>

            <Link to={`/dashboard/tutors/${tutor.id}/book`} className="btn btn-primary full"><CalendarIcon /> Book a Session</Link>
            <Link to={`/dashboard/messages?tutor=${tutor.id}`} className="btn btn-secondary full"><ChatIcon /> Message Tutor</Link>
          </div>

          <div className="dash-card" id="trust">
            <h2>Verified &amp; Trusted</h2>
            <div className="tprofile-trust-list">
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>ID Verified</strong><span>Government ID reviewed by Mentora</span></div>
              </div>
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>Education Verified</strong><span>{tutor.qualification ?? 'Reviewed by Mentora'}</span></div>
              </div>
              <div className="tprofile-trust-row">
                <CheckIcon />
                <div><strong>Community Rating</strong><span>{tutor.reviewCount > 0 ? `${tutor.rating}/5 from ${tutor.reviewCount} students` : 'No reviews yet'}</span></div>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <h2>Frequently Asked Questions</h2>
            <div className="tprofile-faq-list">
              {DEFAULT_FAQS.map((faq) => (
                <details key={faq.question} className="tprofile-faq-item">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
