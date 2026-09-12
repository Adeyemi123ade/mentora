import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import type { ReactNode, FormEvent } from 'react';
import type { SignupRole, Gender, SkillInterest, Student } from '@mentora/shared';
import { SIGNUP_ROLES, SKILL_INTERESTS, GENDERS } from '@mentora/shared';
import studentPortrait from './assets/mentora-avatar.webp';
import mentoraLogo from './assets/mentora-logo.jpg';
import webDevelopmentCourseImage from './assets/course-web-development.jpeg';
import financialLiteracyCourseImage from './assets/course-financial-literacy.jpeg';
import artificialIntelligenceCourseImage from './assets/course-artificial-intelligence.webp';
import digitalMarketingCourseImage from './assets/course-digital-marketing.jpeg';
import { apiRequest, ApiError } from './lib/api';
import { AuthProvider, useAuth, roleHome, postAuthDestination } from './context/AuthContext';
import type { AppRole } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { SiteFooter } from './components/SiteFooter';
import { PasswordCriteria, passwordMeetsCriteria } from './components/PasswordCriteria';
const DashboardShell = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardShell })));
const DashboardHomePage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardHomePage })));
const MyStudentsPage = lazy(() => import('./pages/MyStudentsPage').then((module) => ({ default: module.MyStudentsPage })));
const SavedTutorsPage = lazy(() => import('./pages/SavedTutorsPage').then((module) => ({ default: module.SavedTutorsPage })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then((module) => ({ default: module.DiscoveryPage })));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage').then((module) => ({ default: module.TutorProfilePage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage').then((module) => ({ default: module.MyBookingsPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((module) => ({ default: module.MessagesPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const TutorInboxPage = lazy(() => import('./pages/TutorInboxPage').then((module) => ({ default: module.TutorInboxPage })));
const TutorDashboardShell = lazy(() => import('./pages/TutorDashboardPage').then((module) => ({ default: module.TutorDashboardShell })));
const TutorDashboardHomePage = lazy(() => import('./pages/TutorDashboardPage').then((module) => ({ default: module.TutorDashboardHomePage })));
const TutorBookingsPage = lazy(() => import('./pages/TutorBookingsPage').then((module) => ({ default: module.TutorBookingsPage })));
const TutorStudentsPage = lazy(() => import('./pages/TutorStudentsPage').then((module) => ({ default: module.TutorStudentsPage })));
const TutorReviewsPage = lazy(() => import('./pages/TutorReviewsOverviewPage').then((module) => ({ default: module.TutorReviewsPage })));
const TutorAvailabilityPage = lazy(() => import('./pages/TutorAvailabilityPage').then((module) => ({ default: module.TutorAvailabilityPage })));
const TutorEarningsPage = lazy(() => import('./pages/TutorEarningsPage').then((module) => ({ default: module.TutorEarningsPage })));
const TutorSettingsPage = lazy(() => import('./pages/TutorSettingsPage').then((module) => ({ default: module.TutorSettingsPage })));
const TutorCompleteProfilePage = lazy(() => import('./pages/TutorCompleteProfilePage').then((module) => ({ default: module.TutorCompleteProfilePage })));
const TutorProfileOverviewPage = lazy(() => import('./pages/TutorProfileOverviewPage').then((module) => ({ default: module.TutorProfileOverviewPage })));
const TutorVerificationPage = lazy(() => import('./pages/TutorVerificationPage').then((module) => ({ default: module.TutorVerificationPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const StudentDashboardPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentDashboardPage })));
const StudentLessonDetailsPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentLessonDetailsPage })));
const StudentLessonsPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentLessonsPage })));
const StudentLoginPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentLoginPage })));
const StudentNotificationsPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentNotificationsPage })));
const StudentProfilePage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentProfilePage })));
const StudentProgressPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentProgressPage })));
const StudentResourcesPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentResourcesPage })));
const StudentSettingsPage = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentSettingsPage })));
const StudentShell = lazy(() => import('./pages/StudentExperience').then((module) => ({ default: module.StudentShell })));
const LegalHelpPage = lazy(() => import('./pages/LegalHelpPage').then((module) => ({ default: module.LegalHelpPage })));
import {
  MailIcon,
  LockIcon,
  UserFieldIcon,
  BoyIcon,
  GirlIcon,
  UsersIcon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  ChartIcon,
  TrophyIcon,
  GoogleIcon,
  ClipboardIcon,
  CheckIcon,
  LightbulbIcon,
  UsersPlusIcon,
  CalendarIcon,
  RobotIcon,
  CodeIcon,
  MicIcon,
  RocketIcon,
  DotsIcon,
} from './components/Icons';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/#courses' },
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'About Us', href: '/#about' },
];

const featureTiles = [
  { title: 'Learn Your Way', description: 'Access video lessons, quizzes and notes anytime, anywhere.', icon: 'book' },
  { title: 'Expert Tutors', description: 'Learn from verified tutors who are passionate about teaching.', icon: 'cap' },
  { title: 'Track Progress', description: 'Monitor your learning journey and achieve your goals.', icon: 'chart' },
  { title: 'Secure & Reliable', description: 'Your data and payments are safe with us.', icon: 'shield' },
];

const courses = [
  { title: 'Product Design', category: 'Product Design', level: 'Beginner', image: webDevelopmentCourseImage, imageAlt: 'Digital product interface representing product design' },
  { title: 'Financial Literacy', category: 'Financial Literacy', level: 'Beginner', image: financialLiteracyCourseImage, imageAlt: 'Coin growth chart representing financial literacy' },
  { title: 'Artificial Intelligence', category: 'Artificial Intelligence', level: 'Intermediate', image: artificialIntelligenceCourseImage, imageAlt: 'Artificial brain and circuitry representing artificial intelligence' },
  { title: 'Public Speaking', category: 'Public Speaking', level: 'Beginner', image: digitalMarketingCourseImage, imageAlt: 'Microphone representing public speaking' },
];

const steps = [
  { title: 'Explore', description: 'Browse courses and find the perfect one for you.', icon: 'search' },
  { title: 'Learn', description: 'Access lessons, join live classes and complete quizzes.', icon: 'play' },
  { title: 'Track', description: 'Monitor your progress and improve every day.', icon: 'chart' },
  { title: 'Achieve', description: 'Earn certificates and achieve your learning goals.', icon: 'trophy' },
];

function BrandMark() {
  return <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />;
}

import { Routes, Route, Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

function LandingPage() {
  const courseCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCourses = (direction: -1 | 1) => {
    const carousel = courseCarouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({ left: direction * Math.max(carousel.clientWidth * 0.8, 260), behavior: 'smooth' });
  };

  return (
    <main className="landing-content">
      <section className="hero-section">
        <div className="hero-copy">
          <h1>
            The Smarter Way
            <br />
            to Learn. <span>Anywhere,</span>
            <br />
            Anytime.
          </h1>
          <p>
            Mentora connects learners with expert tutors, engaging courses, and the tools you need to achieve your goals.
          </p>

          <div className="cta-row">
            <Link to="/login?mode=signup&role=PARENT" className="btn btn-primary large" role="button">Get Started <span aria-hidden="true">→</span></Link>
            <button className="btn btn-secondary large" type="button" disabled title="Demo video is not available yet">
              <span className="play-badge" aria-hidden="true">▶</span> Watch Demo
            </button>
          </div>

          <div className="social-proof">
            <div className="proof-copy">
              <span>A trusted partner in your learning journey</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Student illustration">
          <div className="hero-ring">
            <div className="hero-photo-wrap">
              <img src={studentPortrait} alt="Student learning with Mentora" className="hero-photo" fetchPriority="high" />
            </div>

            <div className="hero-badge hero-badge-courses">
              <span className="hero-badge-icon" aria-hidden="true"><GraduationCapIcon className="hero-course-cap" /></span>
              <div>
                <strong>Online Learning</strong>
                <span>Explore available courses</span>
              </div>
            </div>

            <div className="hero-badge hero-badge-classes">
              <span className="hero-badge-avatars" aria-hidden="true">
                <span className="mini-avatar mini-avatar-a" />
                <span className="mini-avatar mini-avatar-b" />
                <span className="mini-avatar mini-avatar-c" />
              </span>
              <div>
                <strong>Live Classes</strong>
                <span>Join and learn together</span>
              </div>
            </div>

            <div className="hero-badge hero-badge-certificates">
              <span className="hero-badge-icon" aria-hidden="true">🏆</span>
              <div>
                <strong>Certificates</strong>
                <span>Earn &amp; Shine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section-card" aria-label="Mentora learning features">
        <div className="feature-grid">
          {featureTiles.map((tile) => (
            <article key={tile.title} className="feature-card">
              <div className={`feature-icon ${tile.icon}`} aria-hidden="true">
                {tile.icon === 'book' && <span className="icon-book" />}
                {tile.icon === 'cap' && <span className="icon-cap" />}
                {tile.icon === 'chart' && <span className="icon-chart" />}
                {tile.icon === 'shield' && <span className="icon-shield" />}
              </div>
              <h3>{tile.title}</h3>
              <p>{tile.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="courses-section" id="courses">
        <div className="section-heading">
          <h2>Popular Courses</h2>
          <Link to="/login?mode=signup&role=PARENT" aria-label="Create an account to explore tutors">Explore with Mentora <span>→</span></Link>
        </div>

        <div className="course-carousel-shell">
          <button className="course-carousel-btn" type="button" onClick={() => scrollCourses(-1)} aria-label="Show previous courses">‹</button>
          <div className="course-grid" ref={courseCarouselRef}>
            {courses.map((course) => (
              <article key={course.title} className="course-card">
                <div className="course-image">
                  <img src={course.image} alt={course.imageAlt} loading="lazy" decoding="async" />
                </div>
                <h3>{course.title}</h3>
                <div className="rating-row">
                  <span className="level-pill">{course.level}</span>
                </div>
              </article>
            ))}
          </div>
          <button className="course-carousel-btn" type="button" onClick={() => scrollCourses(1)} aria-label="Show more courses">›</button>
        </div>
      </section>

      <section className="steps-section" id="how-it-works">
        <h2>How Mentora Works</h2>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <div key={step.title} className="step-card">
              <div className="step-index">{index + 1}</div>
              <div className={`step-icon ${step.icon}`} aria-hidden="true">
                {step.icon === 'search' && <span>⌕</span>}
                {step.icon === 'play' && <span>▶</span>}
                {step.icon === 'chart' && <span>▤</span>}
                {step.icon === 'trophy' && <span>🏆</span>}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-panel" id="about">
        <div className="cta-brand" aria-hidden="true"><GraduationCapIcon /></div>
        <div className="cta-copy">
          <h2>Ready to start your learning journey?</h2>
          <p>Join Mentora today and unlock your potential.</p>
        </div>
          <Link to="/login?mode=signup&role=PARENT" className="btn btn-primary light" role="button">
          Get Started <span aria-hidden="true">→</span>
          </Link>
      </section>
    </main>
  );
}

const ROLE_LABELS: Record<SignupRole, string> = {
  PARENT: 'Parent',
  TUTOR: 'Tutor',
};

const ROLE_ICONS: Record<SignupRole, ReactNode> = {
  PARENT: <UsersIcon />,
  TUTOR: <UserFieldIcon />,
};

function IconInputField({
  icon,
  label,
  name,
  type = 'text',
  placeholder,
  required,
  minLength,
  error,
  onValueChange,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  error?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <label className={error ? 'field field-invalid' : 'field'}>
      <span>{label}{required && <span className="req" aria-hidden="true">*</span>}</span>
      <div className="input-icon-wrap">
        {icon}
        <input name={name} type={type} placeholder={placeholder} required={required} minLength={minLength} aria-invalid={Boolean(error)} onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined} />
      </div>
      {error && <span className="field-error-text" role="alert">{error}</span>}
    </label>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  required,
  minLength,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={error ? 'field field-invalid' : 'field'}>
      <span>{label}{required && <span className="req" aria-hidden="true">*</span>}</span>
      <div className="input-icon-wrap">
        <LockIcon className="input-icon" />
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="input-icon-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <span className="field-error-text" role="alert">{error}</span>}
    </label>
  );
}

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  return (
    <div className="password-strength">
      <div className="password-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < score ? `bar-filled strength-${score}` : 'bar-empty'} />
        ))}
      </div>
      <span className="password-strength-label">Password strength: <strong>{label}</strong></span>
    </div>
  );
}

function AuthSideIllustration() {
  return (
    <svg viewBox="0 0 300 180" width="100%" style={{ height: 'auto' }} aria-hidden="true">
      <path d="M20 150c-4-16-2-30 8-40" stroke="#3fae6a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="8" y="150" width="30" height="18" rx="4" fill="var(--primary-soft)" />
      <rect x="52" y="158" width="70" height="12" rx="3" fill="var(--primary)" />
      <rect x="58" y="146" width="58" height="12" rx="3" fill="#f7b267" />
      <rect x="104" y="66" width="120" height="80" rx="8" fill="var(--card)" stroke="var(--primary)" strokeWidth="4" />
      <rect x="116" y="78" width="96" height="54" rx="4" fill="var(--primary-soft)" />
      <rect x="144" y="94" width="40" height="40" rx="8" fill="var(--primary)" />
      <path d="M156 114h16M164 104v20" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="90" y="146" width="148" height="10" rx="5" fill="var(--primary)" />
      <rect x="244" y="138" width="28" height="30" rx="4" fill="var(--primary-dark)" />
      <line x1="251" y1="138" x2="246" y2="108" stroke="#f7b267" strokeWidth="4" strokeLinecap="round" />
      <line x1="262" y1="138" x2="268" y2="112" stroke="#44b7a1" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 40C90 8 180 4 262 28" stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 6" fill="none" opacity="0.5" />
      <path d="M257 20l14-8-4 15-5-3-5 6-2-8-8-2z" fill="var(--primary)" />
    </svg>
  );
}

function VerifySideIllustration() {
  return (
    <svg viewBox="0 0 300 190" width="100%" style={{ height: 'auto' }} aria-hidden="true">
      <path d="M25 168c-4-18-2-34 10-46" stroke="#3fae6a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="10" y="168" width="30" height="18" rx="4" fill="var(--primary-soft)" />

      <rect x="70" y="95" width="180" height="95" rx="10" fill="var(--primary-soft)" />
      <path d="M70 103 160 158 250 103" stroke="var(--primary)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="118" y="52" width="84" height="68" rx="8" fill="var(--card)" stroke="var(--primary)" strokeWidth="3" />
      <image href={mentoraLogo} x="140" y="68" width="40" height="36" />

      <circle cx="222" cy="90" r="16" fill="#10b981" />
      <path d="m215 90 5 5 10-11" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M55 42C105 10 195 6 268 32" stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 6" fill="none" opacity="0.5" />
      <path d="M263 24l14-8-4 15-5-3-5 6-2-8-8-2z" fill="var(--primary)" />
    </svg>
  );
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readableAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (/failed to fetch|network request failed|load failed/i.test(message)) {
    return "We can't connect to Mentora right now. Check your internet connection and try again. If the problem continues, please try again in a few minutes.";
  }
  return message || fallback;
}

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(() => searchParams.get('mode') === 'signup' ? 'signup' : 'login');

  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginFieldErrors, setLoginFieldErrors] = useState<Record<string, string>>({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [signupRole, setSignupRole] = useState<SignupRole>(() => searchParams.get('role') === 'TUTOR' ? 'TUTOR' : 'PARENT');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupFieldErrors, setSignupFieldErrors] = useState<Record<string, string>>({});
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);

  const signupPasswordMismatch =
    signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword;

  const handleLoginSubmit = async (e: any) => {
    e.preventDefault();
    if (loginSubmitting) return;
    setLoginError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    const nextFieldErrors: Record<string, string> = {};
    if (isBlank(email)) nextFieldErrors.email = 'Please enter your email address.';
    else if (!isValidEmail(email)) nextFieldErrors.email = 'Please enter a valid email address.';
    if (isBlank(password)) nextFieldErrors.password = 'Please enter your password.';
    setLoginFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setLoginSubmitting(true);
    try {
      const user = await signIn(email, password);
      navigate(await postAuthDestination(user));
    } catch (err) {
      const message = readableAuthError(err, 'We could not sign you in. Please try again.');
      if (message.toLowerCase().includes('invalid login credentials')) {
        // This also fires for a returning user whose account only has a Google
        // credential (no password was ever set) — point them at both working
        // paths instead of implying they might not have an account at all.
        setLoginError("We couldn't sign you in with those details. If you originally signed up with Google, use \"Sign in with Google\" below. Otherwise, double-check your email and password, or reset your password to set one.");
      } else if (message.toLowerCase().includes('email not confirmed')) {
        navigate(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        setLoginError(message);
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: any) => {
    e.preventDefault();
    if (signupSubmitting) return;
    setSignupError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const confirmPassword = signupConfirmPassword;

    const nextFieldErrors: Record<string, string> = {};
    if (isBlank(name) || name.trim().length < 2) nextFieldErrors.name = 'Please enter your full name (at least 2 characters).';
    if (isBlank(email)) nextFieldErrors.email = 'Please enter your email address.';
    else if (!isValidEmail(email)) nextFieldErrors.email = 'Please enter a valid email address.';
    if (isBlank(confirmPassword)) nextFieldErrors.confirmPassword = 'Please confirm your password.';
    setSignupFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setSignupError('Please fix the highlighted fields before continuing.');
      return;
    }

    if (!passwordMeetsCriteria(signupPassword)) {
      setSignupFieldErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.' }));
      setSignupError('Please fix the highlighted fields before continuing.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setSignupFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      setSignupError('Passwords do not match');
      return;
    }

    setSignupSubmitting(true);
    try {
      await signUp({ name: name.trim(), email, password: signupPassword, role: signupRole });
      navigate(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message = readableAuthError(err, 'We could not create your account. Please try again.');
      if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already been registered')) {
        setSignupError('An account with this email already exists. Try signing in instead.');
      } else {
        setSignupError(message);
      }
    } finally {
      setSignupSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setSignupError(null);
    if (oauthSubmitting) return;
    setOauthSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = readableAuthError(err, 'Google sign-in is unavailable right now.');
      setMode('login');
      setLoginError(message);
    } finally {
      setOauthSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand">
            <BrandMark />
            <span>Mentora</span>
          </div>

          {mode === 'login' ? (
            <>
              <h1>Welcome back!<br /><span className="accent">Let's continue</span> your learning journey.</h1>
              <p>Sign in to access your personalized dashboard, track your progress, and connect with expert tutors.</p>
            </>
          ) : (
            <>
              <h1>Your Learning Journey Starts <span className="accent accent-underline">Here</span></h1>
              <p>Create your Mentora account and begin a learning journey built around your real goals and activity.</p>
            </>
          )}

          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-icon"><GraduationCapIcon /></span>
              <div>
                <strong>Expert Tutors</strong>
                <span>Learn from verified and experienced tutors.</span>
              </div>
            </li>
            <li>
              <span className="auth-feature-icon"><ShieldCheckIcon /></span>
              <div>
                <strong>Safe &amp; Secure</strong>
                <span>Your data and payments are always protected.</span>
              </div>
            </li>
            <li>
              <span className="auth-feature-icon"><ChartIcon /></span>
              <div>
                <strong>Track Progress</strong>
                <span>Monitor learning and achieve your goals.</span>
              </div>
            </li>
            <li>
              <span className="auth-feature-icon"><TrophyIcon /></span>
              <div>
                <strong>Certificates</strong>
                <span>Earn certificates and showcase your skills.</span>
              </div>
            </li>
          </ul>

          <div className="auth-illustration">
            <AuthSideIllustration />
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          {mode === 'login' ? (
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <h2>Sign in to Mentora</h2>
              <p>Welcome back! Please enter your details.</p>

              <IconInputField icon={<MailIcon className="input-icon" />} label="Email address" name="email" type="email" placeholder="Enter your email address" required error={loginFieldErrors.email} onValueChange={() => setLoginFieldErrors((p) => ({ ...p, email: '' }))} />
              <PasswordField label="Password" name="password" placeholder="Enter your password" required error={loginFieldErrors.password} onChange={() => setLoginFieldErrors((p) => ({ ...p, password: '' }))} />

              <div className="form-actions">
                <label className="checkbox"><input type="checkbox" /> Remember me</label>
                <Link to="/forgot-password" className="link-btn">Forgot password?</Link>
              </div>

              {loginError && <p className="form-error" role="alert">{loginError}</p>}

              <button className="btn btn-primary full" type="submit" disabled={loginSubmitting}>
                {loginSubmitting && <span className="spinner" aria-hidden="true" />}
                {loginSubmitting ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="or-row">or</div>

              <button type="button" className="btn btn-secondary full google-btn" onClick={handleGoogleSignIn} disabled={oauthSubmitting}>
                {oauthSubmitting && <span className="spinner" aria-hidden="true" />}
                <GoogleIcon /> {oauthSubmitting ? 'Redirecting…' : 'Sign in with Google'}
              </button>

              <p className="auth-switch">Don't have an account? <button type="button" className="link-btn" onClick={() => setMode('signup')}>Create account</button></p>
              <p className="auth-switch">Are you a student? <Link to="/student-login" className="link-btn">Use your Student ID</Link></p>
            </form>
          ) : (
            <form className="create-form" onSubmit={handleSignupSubmit}>
              <h2>Create your account</h2>
              <p>Join Mentora and start your learning journey.</p>

              <span className="field-label-standalone">I'm joining as <span className="req" aria-hidden="true">*</span></span>
              <div className="role-options">
                {SIGNUP_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={signupRole === role ? 'role active' : 'role'}
                    aria-pressed={signupRole === role}
                    onClick={() => setSignupRole(role)}
                  >
                    <span className="role-icon">{ROLE_ICONS[role]}</span>
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>

              <IconInputField icon={<UserFieldIcon className="input-icon" />} label="Full name" name="name" placeholder="Enter your full name" required error={signupFieldErrors.name} onValueChange={() => setSignupFieldErrors((p) => ({ ...p, name: '' }))} />
              <IconInputField icon={<MailIcon className="input-icon" />} label="Email address" name="email" type="email" placeholder="Enter your email address" required error={signupFieldErrors.email} onValueChange={() => setSignupFieldErrors((p) => ({ ...p, email: '' }))} />
              <PasswordField label="Password" name="password" placeholder="Create a password" required minLength={8} value={signupPassword} onChange={(value) => { setSignupPassword(value); setSignupFieldErrors((p) => ({ ...p, password: '' })); }} error={signupFieldErrors.password} />
              <PasswordCriteria password={signupPassword} />
              <PasswordStrengthMeter password={signupPassword} />
              <PasswordField label="Confirm password" name="confirmPassword" placeholder="Confirm your password" required minLength={8} value={signupConfirmPassword} onChange={(value) => { setSignupConfirmPassword(value); setSignupFieldErrors((p) => ({ ...p, confirmPassword: '' })); }} error={signupPasswordMismatch ? 'Passwords do not match' : signupFieldErrors.confirmPassword} />

              {signupError && <p className="form-error" role="alert">{signupError}</p>}

              <button className="btn btn-primary full" type="submit" disabled={signupSubmitting}>
                {signupSubmitting && <span className="spinner" aria-hidden="true" />}
                {signupSubmitting ? 'Creating account…' : 'Create account'}
              </button>

              <p className="auth-disclaimer">By continuing, you agree to our <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>

              <p className="auth-switch">Already have an account? <button type="button" className="link-btn" onClick={() => setMode('login')}>Sign in</button></p>

              <div className="or-row">or</div>
              <button type="button" className="btn btn-secondary full google-btn" onClick={handleGoogleSignIn} disabled={oauthSubmitting}>
                {oauthSubmitting && <span className="spinner" aria-hidden="true" />}
                <GoogleIcon /> {oauthSubmitting ? 'Redirecting…' : 'Sign up with Google'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function VerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, initializing, verifyEmailOtp, resendSignupOtp } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (initializing || !user) return;
    void postAuthDestination(user).then((destination) => navigate(destination, { replace: true }));
  }, [initializing, navigate, user]);

  async function handleVerify(enteredCode: string) {
    if (verifying) return;
    const trimmed = enteredCode.trim();
    setError(null);

    if (!email) {
      setError('We need your email address to verify your account. Please go back and try signing up again.');
      return;
    }
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    try {
      const profile = await verifyEmailOtp(email, trimmed);
      const dest = await postAuthDestination(profile);
      navigate(dest, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/expired/i.test(message)) {
        setError('That code has expired. Request a new one and try again.');
      } else if (/invalid|incorrect|otp|not found/i.test(message)) {
        setError('That code is incorrect. Check your inbox and try again, or request a new code.');
      } else {
        setError('We couldn’t verify that code right now. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendSignupOtp(email);
      setSent(true);
      setCooldown(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not resend the code. Please try again.';
      setError(message);
    } finally {
      setResending(false);
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      void handleVerify(digits);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand">
            <BrandMark />
            <span>Mentora</span>
          </div>
          <h1>Enter the<br /><span className="accent">6-digit code</span> we sent you</h1>
          <p>We've emailed a one-time verification code to <strong>{email || 'your email'}</strong>. Enter it below to activate your account.</p>

          <div className="verify-tip">
            <span className="verify-tip-icon"><ShieldCheckIcon /></span>
            <span>This helps us keep your account safe and secure.</span>
          </div>

          <div className="auth-illustration">
            <VerifySideIllustration />
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          <div className="verify-form">
            <div className="verify-header">
              <span className="verify-icon-circle"><img src={mentoraLogo} alt="" aria-hidden="true" /></span>
              <div>
                <h2>Verify your email</h2>
                <p>Enter the code to activate your account.</p>
              </div>
            </div>

            {email && (
              <div className="email-badge">
                <MailIcon className="input-icon" />
                <span>{email}</span>
                <span className="pending-tag">Pending</span>
              </div>
            )}

            <label className={`field ${error ? 'field-invalid' : ''}`}>
              <span>Verification code <span className="req" aria-hidden="true">*</span></span>
              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={verifying}
                autoFocus
                aria-invalid={Boolean(error)}
              />
            </label>

            {sent && <p className="form-success" role="status">A new code is on its way. Please check your inbox.</p>}
            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="btn btn-primary full" type="button" onClick={() => void handleVerify(code)} disabled={verifying || code.length !== 6}>
              {verifying && <span className="spinner" aria-hidden="true" />}
              {verifying ? 'Verifying…' : 'Verify email'}
            </button>

            <div className="verify-tip">
              <span className="verify-tip-icon"><LightbulbIcon /></span>
              <div>
                <strong>Didn't get the code?</strong>
                <span>Check your spam or promotions folder, or request a new one below.</span>
              </div>
            </div>

            <div className="resend-row">
              <button type="button" className="btn btn-secondary full" onClick={() => void resendCode()} disabled={resending || cooldown > 0}>
                {resending && <span className="spinner" aria-hidden="true" />}
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>

            <button type="button" className="btn btn-ghost full" onClick={() => navigate('/login')}>
              Use a different email
            </button>

            <div className="verify-divider" />
            <div className="security-note">
              <LockIcon className="input-icon" /> Your information is protected with enterprise-grade security.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const started = useRef(false);
  const [status, setStatus] = useState<'processing' | 'set-password' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing your Google sign-in...');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState(false);
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function finishSignIn() {
    const profile = await refreshUser();
    if (!profile) throw new Error('Your Mentora profile could not be loaded.');
    const destination = await postAuthDestination(profile);
    setStatus('success');
    setMessage('Sign-in successful. Taking you to your account...');
    setTimeout(() => navigate(destination, { replace: true }), 900);
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordMeetsCriteria(newPassword)) {
      setPasswordError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError(null);
    setSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await finishSignIn();
    } catch (err) {
      setPasswordError(readableAuthError(err, 'Could not set your password. Please try again.'));
    } finally {
      setSettingPassword(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Google did not return an active session.');

        const profile = await refreshUser();
        if (!profile) throw new Error('Your Mentora profile could not be loaded.');

        if (!profile.hasPassword) {
          setStatus('set-password');
          setMessage('One last step — set a password so you can also sign in directly with your email next time.');
          return;
        }

        await finishSignIn();
      } catch (err) {
        setStatus('error');
        setMessage(readableAuthError(err, 'We could not complete your Google sign-in. Please try again.'));
      }
    })();
    // Run once for this callback URL. Auth helpers are intentionally captured
    // from the mounted provider so status renders cannot restart the exchange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand"><BrandMark /><span>Mentora</span></div>
          <h1>Welcome to<br /><span className="accent">Mentora</span></h1>
          <p>Securely connecting your Google account to your Mentora profile.</p>
        </div>
        <div className="auth-main">
          <div className="verify-form" role="status" aria-live="polite">
            <div className="verify-header">
              <span className={`verify-icon-circle ${status === 'success' ? 'success' : ''}`}>
                {status === 'success' ? <CheckIcon /> : status === 'error' ? <ShieldCheckIcon /> : <GoogleIcon />}
              </span>
              <div>
                <h2>{status === 'success' ? 'Sign-in successful' : status === 'error' ? 'Google sign-in failed' : status === 'set-password' ? 'Set your password' : 'Signing you in'}</h2>
                <p>{message}</p>
              </div>
            </div>
            {status === 'processing' && <span className="spinner" aria-hidden="true" />}
            {status === 'set-password' && (
              <form onSubmit={handleSetPassword} className="mystudents-edit-form">
                <PasswordField label="Password" name="password" placeholder="Create a password" required minLength={8} value={newPassword} onChange={setNewPassword} />
                <PasswordCriteria password={newPassword} />
                <PasswordField label="Confirm password" name="confirmPassword" placeholder="Confirm your password" required minLength={8} value={confirmPassword} onChange={setConfirmPassword} error={passwordMismatch ? 'Passwords do not match' : undefined} />
                {passwordError && <p className="photo-uploader-error">{passwordError}</p>}
                <button type="submit" className="btn btn-primary full" disabled={settingPassword}>{settingPassword ? 'Saving…' : 'Set Password & Continue'}</button>
              </form>
            )}
            {status === 'error' && <Link to="/login" className="btn btn-primary full">Back to sign in</Link>}
          </div>
        </div>
      </div>
    </main>
  );
}

function ForgotPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);

    // Read straight from the form on submit — this field is intentionally
    // uncontrolled (IconInputField has no `value` prop), so a separate `email`
    // state variable here would never actually reflect what was typed.
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();

    if (isBlank(email)) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(email);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand">
            <BrandMark />
            <span>Mentora</span>
          </div>
          <h1>Reset your<br /><span className="accent">password</span></h1>
          <p>Enter the email address linked to your account and we'll send you a 6-digit code to reset your password.</p>

          <div className="verify-tip">
            <span className="verify-tip-icon"><ShieldCheckIcon /></span>
            <span>The code is valid for a limited time and can only be used once.</span>
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Forgot your password?</h2>
            <p>No worries — we'll help you get back in.</p>

            <IconInputField icon={<MailIcon className="input-icon" />} label="Email address" name="email" type="email" placeholder="Enter your email address" required />

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="btn btn-primary full" type="submit" disabled={submitting}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              {submitting ? 'Sending code…' : 'Send reset code'}
            </button>

            <p className="auth-switch">Remembered your password? <Link to="/login" className="link-btn">Sign in</Link></p>
          </form>
        </div>
      </div>
    </main>
  );
}

function ResetPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('We need your email address. Please go back and request a new reset code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (!passwordMeetsCriteria(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/expired/i.test(message)) {
        setError('That code has expired. Request a new one below.');
      } else if (/invalid|incorrect|otp|not found|token/i.test(message)) {
        setError('That code is incorrect. Check your inbox and try again, or request a new code.');
      } else {
        setError(message || 'Could not reset your password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await sendPasswordResetEmail(email);
      setResent(true);
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <div className="auth-side">
            <div className="auth-side-brand"><BrandMark /><span>Mentora</span></div>
            <h1>Password<br /><span className="accent">updated</span></h1>
            <p>Your password has been changed successfully. You can now sign in with your new password.</p>
          </div>
          <div className="auth-main">
            <div className="verify-form">
              <div className="verify-header">
                <span className="verify-icon-circle success"><CheckIcon /></span>
                <div>
                  <h2>All set!</h2>
                  <p>Use your new password to sign in.</p>
                </div>
              </div>
              <button className="btn btn-primary full" onClick={() => navigate('/login')}>Back to sign in</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand"><BrandMark /><span>Mentora</span></div>
          <h1>Enter your<br /><span className="accent">reset code</span></h1>
          <p>We've emailed a 6-digit code to <strong>{email || 'your email'}</strong>. Enter it below along with your new password.</p>

          <div className="verify-tip">
            <span className="verify-tip-icon"><ShieldCheckIcon /></span>
            <span>This helps us confirm it's really you before changing your password.</span>
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Reset your password</h2>
            <p>Enter the code we emailed you and choose a new password.</p>

            {!email && (
              <p className="form-error" role="alert">
                We couldn't find your email for this reset request. <Link to="/forgot-password">Start over</Link> to get a new code.
              </p>
            )}

            {email && (
              <div className="email-badge">
                <MailIcon className="input-icon" />
                <span>{email}</span>
                <span className="pending-tag">Pending</span>
              </div>
            )}

            <label className={`field ${error && !passwordMismatch ? 'field-invalid' : ''}`}>
              <span>Reset code <span className="req" aria-hidden="true">*</span></span>
              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(error)}
              />
            </label>

            <PasswordField label="New password" name="password" placeholder="Create a new password" required minLength={8} value={password} onChange={setPassword} />
            <PasswordCriteria password={password} />
            <PasswordStrengthMeter password={password} />
            <PasswordField label="Confirm new password" name="confirmPassword" placeholder="Confirm your new password" required minLength={8} value={confirmPassword} onChange={setConfirmPassword} error={passwordMismatch ? 'Passwords do not match' : undefined} />

            {resent && <p className="form-success" role="status">A new code is on its way. Please check your inbox.</p>}
            {error && !passwordMismatch && <p className="form-error" role="alert">{error}</p>}

            <button className="btn btn-primary full" type="submit" disabled={submitting}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              {submitting ? 'Updating…' : 'Reset password'}
            </button>

            <div className="resend-row">
              <button type="button" className="btn btn-secondary full" onClick={() => void resendCode()} disabled={!email || resending || cooldown > 0}>
                {resending && <span className="spinner" aria-hidden="true" />}
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function AcceptInvitePage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [invalidMessage, setInvalidMessage] = useState('This invite link is invalid.');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    let active = true;
    if (!token) {
      setInvalidMessage('This invite link is missing or malformed.');
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const res = await apiRequest<{ email: string }>(`/api/admin/invites/verify?token=${encodeURIComponent(token)}`);
        if (!active) return;
        if (!res.data) throw new Error('This invite link is invalid or has expired.');
        setEmail(res.data.email);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setInvalidMessage(err instanceof ApiError ? err.message : 'This invite link is invalid or has expired.');
        setStatus('invalid');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);

    if (!passwordMeetsCriteria(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/admin/invites/accept', { method: 'POST', body: JSON.stringify({ token, password }) });
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : readableAuthError(err, 'Could not activate your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-side">
          <div className="auth-side-brand">
            <BrandMark />
            <span>Mentora</span>
          </div>
          <h1>You've been<br /><span className="accent">invited</span> to Mentora</h1>
          <p>Set a password to activate your administrator account.</p>

          <div className="verify-tip">
            <span className="verify-tip-icon"><ShieldCheckIcon /></span>
            <span>This invite link is single-use and expires 10 minutes after it's sent.</span>
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          {status === 'checking' && (
            <div className="auth-loading">
              <span className="spinner" aria-hidden="true" />
              <span>Checking your invite…</span>
            </div>
          )}

          {status === 'invalid' && (
            <div className="login-form">
              <h2>This invite link isn't valid</h2>
              <p>{invalidMessage}</p>
              <p>Ask an admin to send you a new invite from the Admins section of the dashboard.</p>
              <Link className="btn btn-secondary full" to="/login">Back to sign in</Link>
            </div>
          )}

          {status === 'ready' && (
            <form className="login-form" onSubmit={handleSubmit}>
              <h2>Set your password</h2>
              <p>Setting up the administrator account for <strong>{email}</strong>.</p>

              <PasswordField label="Password" name="password" placeholder="Create a password" required minLength={8} value={password} onChange={setPassword} />
              <PasswordCriteria password={password} />
              <PasswordStrengthMeter password={password} />
              <PasswordField label="Confirm password" name="confirmPassword" placeholder="Confirm your password" required minLength={8} value={confirmPassword} onChange={setConfirmPassword} error={passwordMismatch ? 'Passwords do not match' : undefined} />

              {error && <p className="form-error" role="alert">{error}</p>}

              <button className="btn btn-primary full" type="submit" disabled={submitting}>
                {submitting && <span className="spinner" aria-hidden="true" />}
                {submitting ? 'Setting up…' : 'Activate account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function RequireAuth({ role, children }: { role?: AppRole; children: ReactNode }) {
  const { user, initializing, hasSession, authError, refreshUser } = useAuth();

  if (initializing) {
    return (
      <div className="auth-loading">
        <span className="spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!user && hasSession) {
    return (
      <div className="auth-loading">
        <strong>We could not load your account yet.</strong>
        <span>{authError ?? 'Your session is still active. Please try again.'}</span>
        <button type="button" className="btn btn-primary" onClick={() => void refreshUser()}>Try again</button>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

const ONBOARDING_STEPS = ['Create Account', 'Verify Email', 'Add Child', 'Explore Tutors'];

function OnboardingStepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="stepper">
      {ONBOARDING_STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const status = stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'current' : 'upcoming';
        return (
          <li key={label} className={`stepper-item stepper-${status}`}>
            <span className="stepper-circle">{status === 'done' ? <CheckIcon /> : stepNumber}</span>
            <span className="stepper-label">{label}</span>
            {stepNumber < ONBOARDING_STEPS.length && (
              <span className={status === 'done' ? 'stepper-connector done' : 'stepper-connector'} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const GENDER_LABELS: Record<Gender, string> = {
  BOY: 'Boy',
  GIRL: 'Girl',
  UNSPECIFIED: 'Prefer not to say',
};

const GENDER_ICONS: Record<Gender, ReactNode> = {
  BOY: <BoyIcon />,
  GIRL: <GirlIcon />,
  UNSPECIFIED: <UserFieldIcon />,
};

const SKILL_INTEREST_META: Record<SkillInterest, { label: string; icon: ReactNode }> = {
  AI: { label: 'AI', icon: <RobotIcon /> },
  CODING: { label: 'Coding', icon: <CodeIcon /> },
  PUBLIC_SPEAKING: { label: 'Public Speaking', icon: <MicIcon /> },
  ENTREPRENEURSHIP: { label: 'Entrepreneurship', icon: <RocketIcon /> },
  FINANCIAL_LITERACY: { label: 'Financial Literacy', icon: <ChartIcon /> },
  OTHER: { label: 'Other', icon: <DotsIcon /> },
};

const STUDENT_AGES = Array.from({ length: 11 }, (_, i) => i + 8);

// Session-scoped, tied to one specific student's id — not "does this parent
// have any student" (that broke "Add a Student" for a parent who already had
// one: clicking it re-showed whichever student happened to come back first
// from the API instead of a blank form for a new one).
const ADD_STUDENT_SESSION_KEY = 'mentora:onboarding:created-student-id';

function wasPageReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entry?.type === 'reload';
  } catch {
    return false;
  }
}

function AddStudentPage() {
  const navigate = useNavigate();
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('BOY');
  const [grade, setGrade] = useState('');
  const [interests, setInterests] = useState<SkillInterest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [studentPassword, setStudentPassword] = useState('');
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    // "Add a Student" always means create a NEW student — this confirmation
    // must only reappear if the user hits an actual browser refresh on the
    // exact confirmation screen right after creating that specific student.
    // Any ordinary navigation here (clicking "Add a Student" from the
    // dashboard, however many students already exist) must open a blank form.
    const lastCreatedId = sessionStorage.getItem(ADD_STUDENT_SESSION_KEY);
    if (!lastCreatedId || !wasPageReload()) return;

    apiRequest<{ students: Student[] }>('/api/students')
      .then((res) => {
        const match = (res.data?.students ?? []).find((s) => s.id === lastCreatedId);
        if (match) setCreatedStudent((current) => current ?? match);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyStudentId() {
    if (!createdStudent) return;
    try {
      await navigator.clipboard.writeText(createdStudent.loginId);
    } catch {
      const area = document.createElement('textarea');
      area.value = createdStudent.loginId;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setIdCopied(true);
    window.setTimeout(() => setIdCopied(false), 1800);
  }

  function toggleInterest(interest: SkillInterest) {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get('fullName') ?? '');

    const nextFieldErrors: Record<string, string> = {};
    if (isBlank(fullName)) nextFieldErrors.fullName = 'Please enter your child\u2019s full name.';
    if (isBlank(age)) nextFieldErrors.age = 'Please select your child\u2019s age.';
    if (interests.length === 0) nextFieldErrors.interests = 'Please select at least one skill interest.';
    if (!passwordMeetsCriteria(studentPassword)) nextFieldErrors.studentPassword = 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError('Please fix the highlighted fields before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest<{ student: Student }>('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          age: age ? Number(age) : undefined,
          gender,
          grade: grade.trim() || undefined,
          interests,
          password: studentPassword,
        }),
      });
      const student = response.data?.student ?? null;
      setCreatedStudent(student);
      if (student) sessionStorage.setItem(ADD_STUDENT_SESSION_KEY, student.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the child profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page onboarding-page">
      <div className="onboarding-topbar">
        <div className="auth-side-brand">
          <BrandMark />
          <span>Mentora</span>
        </div>
        <OnboardingStepper currentStep={3} />
      </div>

      <div className="auth-shell">
        <div className="auth-side">
          <h1>Let's add<br />your first <span className="accent">child</span></h1>
          <p>Tell us about your child so we can recommend the best tutors and learning experiences.</p>

          <div className="verify-tip">
            <span className="verify-tip-icon"><UsersIcon /></span>
            <span className="verify-tip-text">You can always add more children later from your dashboard.</span>
          </div>

          <div className="auth-illustration onboarding-illustration">
            <div className="student-photo-frame">
              <img src={studentPortrait} alt="" aria-hidden="true" />
              <span className="student-photo-badge"><GraduationCapIcon /></span>
            </div>
          </div>

          <div className="auth-side-footer">
            <div className="security-note">
              <ShieldCheckIcon className="input-icon" /> Your information is safe and always protected.
            </div>
            <div className="auth-side-copyright">© 2026 Mentora. All rights reserved.</div>
          </div>
        </div>

        <div className="auth-main">
          {createdStudent ? (
            <div className="add-student-form student-access-success">
              <span className="verify-icon-circle success"><CheckIcon /></span>
              <h2>Child profile created</h2>
              <p>Give this Child ID and the password you created to {createdStudent.fullName}. No administrator approval is required.</p>
              <div className="student-login-id-result"><span>Child ID</span><strong>{createdStudent.loginId}</strong><button type="button" className="btn btn-secondary" onClick={copyStudentId}>{idCopied ? 'Copied' : 'Copy ID'}</button></div>
              <p className="field-hint">For security, Mentora will not display the password again. You can reset it from My Children.</p>
              <button type="button" className="btn btn-primary full" onClick={() => { sessionStorage.removeItem(ADD_STUDENT_SESSION_KEY); navigate('/dashboard'); }}>Continue to dashboard</button>
            </div>
          ) : <form className="add-student-form" onSubmit={handleSubmit}>
            <div className="verify-header">
              <span className="verify-icon-circle"><UsersPlusIcon /></span>
              <div>
                <h2>Add your first child</h2>
                <p>This helps us connect them with the right tutors and learning opportunities.</p>
              </div>
            </div>

            <IconInputField icon={<UserFieldIcon className="input-icon" />} label="Child's full name" name="fullName" placeholder="Enter your child's full name" required error={fieldErrors.fullName} />

            <div className="form-row-2col">
              <label className={`field ${fieldErrors.age ? 'field-invalid' : ''}`}>
                <span>Age <span className="req" aria-hidden="true">*</span></span>
                <div className="input-icon-wrap">
                  <select value={age} onChange={(e) => setAge(e.target.value)} aria-invalid={Boolean(fieldErrors.age)}>
                    <option value="">Select age</option>
                    {STUDENT_AGES.map((a) => (
                      <option key={a} value={a}>{a} years old</option>
                    ))}
                  </select>
                </div>
                {fieldErrors.age && <span className="field-error-text" role="alert">{fieldErrors.age}</span>}
              </label>

              <div className="field">
                <span>Gender</span>
                <div className="gender-options">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={gender === g ? 'gender-option active' : 'gender-option'}
                      aria-pressed={gender === g}
                      onClick={() => setGender(g)}
                    >
                      {GENDER_ICONS[g]} {GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <span className="field-hint">8 – 18 years old</span>

            <label className="field">
              <span className="field-label-nowrap">Grade / Level <span className="field-label-note">(optional)</span></span>
              <div className="input-icon-wrap">
                <GraduationCapIcon className="input-icon" />
                <input name="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Select grade or level" />
              </div>
            </label>
            <span className="field-hint">E.g. JSS 1, SS 2, Grade 10</span>

            <span className="field-label-standalone">Skill interests <span className="req" aria-hidden="true">*</span> <span className="field-label-note">(Select all that apply)</span></span>
            <div className={`interest-grid ${fieldErrors.interests ? 'interest-grid-invalid' : ''}`}>
              {SKILL_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={interests.includes(interest) ? 'interest-card active' : 'interest-card'}
                  aria-pressed={interests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  <span className="interest-icon">{SKILL_INTEREST_META[interest].icon}</span>
                  <span className="interest-label">{SKILL_INTEREST_META[interest].label}</span>
                  <span className="interest-checkbox" aria-hidden="true">{interests.includes(interest) && <CheckIcon />}</span>
                </button>
              ))}
            </div>
            {fieldErrors.interests && <span className="field-error-text" role="alert">{fieldErrors.interests}</span>}
            <span className="field-hint">You can update these interests anytime from the child's profile.</span>

            <PasswordField label="Child's password" name="studentPassword" placeholder="Create your child's password" required minLength={8} value={studentPassword} onChange={(value) => { setStudentPassword(value); setFieldErrors((current) => ({ ...current, studentPassword: '' })); }} error={fieldErrors.studentPassword} />
            <PasswordCriteria password={studentPassword} />
            <p className="field-hint">Only you can reset this password from your parent account.</p>

            <div className="verify-tip">
              <span className="verify-tip-icon"><LightbulbIcon /></span>
              <span className="verify-tip-text">Selecting interests helps us personalize course recommendations and tutor matches.</span>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="btn btn-primary full google-btn" type="submit" disabled={submitting}>
              {submitting && <span className="spinner" aria-hidden="true" />}
              <UsersPlusIcon /> {submitting ? 'Creating…' : 'Create Child Profile'}
            </button>

            <div className="or-row">or</div>

            <button type="button" className="btn btn-secondary full google-btn" onClick={() => { sessionStorage.removeItem(ADD_STUDENT_SESSION_KEY); navigate('/dashboard'); }}>
              <EyeIcon /> Skip for now
            </button>

            <p className="auth-switch">You can add a child later and still explore tutors.</p>
          </form>}
        </div>
      </div>
    </main>
  );
}


function SiteLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="mentora-page">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-icon" aria-label="Mentora logo">
            <BrandMark />
          </div>
          <span className="brand-name">Mentora</span>
        </div>

        <nav className="main-nav" aria-label="Main menu">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className={item.label === 'Home' ? 'active' : ''}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="auth-actions">
          <Link to="/login" className="btn btn-ghost desktop-auth-action">Log in</Link>
          <Link to="/login?mode=signup&role=PARENT" className="btn btn-primary desktop-auth-action">Sign up</Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="mobile-menu" aria-label="Mobile menu">
            <Link to="/login?mode=signup&role=PARENT" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            <a href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          </nav>
        )}
      </header>

      {children}

      <SiteFooter />
    </div>
  );
}

// Dark mode is only ever reachable from inside the authenticated app shells (dashboard,
// tutor, student, admin) — everything before that (landing, login, signup, verify, onboarding)
// stays light regardless of a theme previously chosen inside the dashboard, since none of
// those pre-dashboard pages render a theme toggle to switch back.
const DASHBOARD_PATH_PREFIXES = ['/dashboard', '/tutor', '/student', '/admin'];

function App() {
  const location = useLocation();
  useEffect(() => {
    const isDashboardRoute = DASHBOARD_PATH_PREFIXES.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
    );
    if (!isDashboardRoute) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [location.pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={<main className="auth-loading"><div className="spinner" aria-label="Loading page" /></main>}>
        <Routes>
        <Route path="/" element={<SiteLayout><LandingPage /></SiteLayout>} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/student-login" element={<StudentLoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/terms" element={<LegalHelpPage kind="terms" />} />
        <Route path="/privacy" element={<LegalHelpPage kind="privacy" />} />
        <Route path="/help/faq" element={<LegalHelpPage kind="faq" />} />
        <Route path="/onboarding/add-student" element={<RequireAuth role="PARENT"><AddStudentPage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth role="PARENT"><DashboardShell><DashboardHomePage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/tutors" element={<RequireAuth role="PARENT"><DashboardShell><DiscoveryPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/tutors/:id" element={<RequireAuth role="PARENT"><DashboardShell><TutorProfilePage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/tutors/:id/book" element={<RequireAuth role="PARENT"><DashboardShell><BookingPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/notifications" element={<RequireAuth role="PARENT"><DashboardShell><NotificationsPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/bookings" element={<RequireAuth role="PARENT"><DashboardShell><MyBookingsPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/messages" element={<RequireAuth role="PARENT"><DashboardShell><MessagesPage /></DashboardShell></RequireAuth>} />
        <Route path="/tutor" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorDashboardHomePage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/bookings" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorBookingsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/students" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorStudentsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/messages" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorInboxPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/availability" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorAvailabilityPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/earnings" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorEarningsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/reviews" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorReviewsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/profile" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorProfileOverviewPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/profile/edit" element={<RequireAuth role="TUTOR"><TutorCompleteProfilePage editMode /></RequireAuth>} />
        <Route path="/tutor/settings" element={<RequireAuth role="TUTOR"><TutorDashboardShell><TutorSettingsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/tutor/notifications" element={<RequireAuth role="TUTOR"><TutorDashboardShell><NotificationsPage /></TutorDashboardShell></RequireAuth>} />
        <Route path="/onboarding/tutor-profile" element={<RequireAuth role="TUTOR"><TutorCompleteProfilePage /></RequireAuth>} />
        <Route path="/onboarding/tutor-verification" element={<RequireAuth role="TUTOR"><TutorVerificationPage /></RequireAuth>} />
        <Route path="/dashboard/students" element={<RequireAuth role="PARENT"><DashboardShell><MyStudentsPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/saved" element={<RequireAuth role="PARENT"><DashboardShell><SavedTutorsPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/payments" element={<RequireAuth role="PARENT"><DashboardShell><PaymentsPage /></DashboardShell></RequireAuth>} />
        <Route path="/dashboard/settings" element={<RequireAuth role="PARENT"><DashboardShell><SettingsPage /></DashboardShell></RequireAuth>} />
        <Route path="/admin/*" element={<RequireAuth role="ADMIN"><AdminPage /></RequireAuth>} />
        <Route path="/student" element={<RequireAuth role="STUDENT"><StudentShell><StudentDashboardPage /></StudentShell></RequireAuth>} />
        <Route path="/student/lessons" element={<RequireAuth role="STUDENT"><StudentShell><StudentLessonsPage /></StudentShell></RequireAuth>} />
        <Route path="/student/lessons/:id" element={<RequireAuth role="STUDENT"><StudentShell><StudentLessonDetailsPage /></StudentShell></RequireAuth>} />
        <Route path="/student/resources" element={<RequireAuth role="STUDENT"><StudentShell><StudentResourcesPage /></StudentShell></RequireAuth>} />
        <Route path="/student/progress" element={<RequireAuth role="STUDENT"><StudentShell><StudentProgressPage /></StudentShell></RequireAuth>} />
        <Route path="/student/notifications" element={<RequireAuth role="STUDENT"><StudentShell><StudentNotificationsPage /></StudentShell></RequireAuth>} />
        <Route path="/student/profile" element={<RequireAuth role="STUDENT"><StudentShell><StudentProfilePage /></StudentShell></RequireAuth>} />
        <Route path="/student/settings" element={<RequireAuth role="STUDENT"><StudentShell><StudentSettingsPage /></StudentShell></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

function NotFoundPage() {
  return <main className="auth-loading"><div><h1>Page not found</h1><p>The page you requested does not exist or may have moved.</p><Link className="btn btn-primary" to="/">Return to Mentora</Link></div></main>;
}

export default App;
