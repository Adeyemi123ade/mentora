import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type {
  TutorProfileDto,
  TutorDashboardSummary,
  TutorActivityItem,
  ProfileStrength,
  AvailabilitySlot,
  Notification,
} from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { ReferralModal } from '../components/ReferralModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { LogoutButton } from '../components/LogoutButton';
import { TUTOR_SETTINGS_NAV, type Section as TutorSettingsSection } from './TutorSettingsPage';
import mentoraLogo from '../assets/mentora-logo.jpg';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ChatIcon,
  ClockIcon,
  WalletIcon,
  StarIcon,
  UserFieldIcon,
  SettingsIcon,
  LogOutIcon,
  ShieldCheckIcon,
  CheckIcon,
  BellIcon,
  DiamondIcon,
  HelpCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  EditIcon,
  LightbulbIcon,
} from '../components/Icons';

type NavItem = { label: string; icon: (p: { className?: string }) => JSX.Element; path: string; badge?: number };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: HomeIcon, path: '/tutor' },
  { label: 'Bookings', icon: CalendarIcon, path: '/tutor/bookings' },
  { label: 'Students', icon: UsersIcon, path: '/tutor/students' },
  { label: 'Messages', icon: ChatIcon, path: '/tutor/messages' },
  { label: 'Availability', icon: ClockIcon, path: '/tutor/availability' },
  { label: 'Earnings', icon: WalletIcon, path: '/tutor/earnings' },
  { label: 'Reviews', icon: StarIcon, path: '/tutor/reviews' },
  { label: 'Profile', icon: UserFieldIcon, path: '/tutor/profile' },
  { label: 'Settings', icon: SettingsIcon, path: '/tutor/settings' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Verification in progress',
  APPROVED: 'Verified',
  REJECTED: 'Verification rejected',
  NOT_SUBMITTED: 'Not submitted',
};

export function TutorDashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<TutorProfileDto | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [strength, setStrength] = useState<ProfileStrength | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'TUTOR') {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me')
      .then((res) => {
        const p = res?.data?.profile;
        if (!p) return;
        if (!p.profileCompletedAt) {
          navigate('/onboarding/tutor-profile');
          return;
        }
        if (p.verificationStatus === 'NOT_SUBMITTED') {
          navigate('/onboarding/tutor-verification');
          return;
        }
        setProfile(p);
      })
      .catch(() => {});
  }, [user, navigate]);

  useEffect(() => {
    apiRequest<{ count: number }>('/api/messages/unread-count').then((r) => setUnreadMessages(r.data?.count ?? 0)).catch(() => {});
    apiRequest<{ notifications: Notification[] }>('/api/notifications')
      .then((r) => setUnreadNotifications((r.data?.notifications ?? []).filter((n) => !n.readAt).length))
      .catch(() => {});
    apiRequest<{ strength: ProfileStrength }>('/api/tutor/dashboard/profile-strength')
      .then((r) => setStrength(r.data?.strength ?? null))
      .catch(() => {});
  }, []);

  const navItems = NAV_ITEMS.map((item) => (item.path === '/tutor/messages' ? { ...item, badge: unreadMessages || undefined } : item));
  const isDashboardHome = location.pathname === '/tutor';
  const isSettingsRoute = location.pathname === '/tutor/settings';
  const requestedSection = searchParams.get('section') as TutorSettingsSection | null;
  const activeSettingsSection: TutorSettingsSection = TUTOR_SETTINGS_NAV.some((s) => s.id === requestedSection)
    ? requestedSection!
    : 'account';

  return (
    <div className="tdash-layout">
      <aside className="tdash-sidebar">
        <Link to="/tutor/profile" className="tdash-profile-card">
          <Avatar name={user?.name ?? ''} photoUrl={user?.photoUrl} className="tdash-profile-avatar" />
          <div className="tdash-profile-info">
            <strong>{user?.name}</strong>
            <span>{profile?.professionalTitle ?? 'Tutor'}</span>
            {profile && (
              <span className={`tdash-verify-chip ${profile.verificationStatus.toLowerCase()}`}>
                {STATUS_LABEL[profile.verificationStatus]}
              </span>
            )}
          </div>
        </Link>

        {isSettingsRoute ? (
          <nav className="tdash-nav" aria-label="Settings navigation">
            <Link to="/tutor" className="tdash-nav-link tdash-nav-back">
              <ChevronLeftIcon className="tdash-nav-back-icon" /> <span>Back to Dashboard</span>
            </Link>
            {TUTOR_SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeSettingsSection;
              return (
                <Link
                  key={item.id}
                  to={`/tutor/settings?section=${item.id}`}
                  className={active ? 'tdash-nav-link active' : 'tdash-nav-link'}
                >
                  <Icon /> <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <nav className="tdash-nav" aria-label="Tutor dashboard navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={active ? 'tdash-nav-link active' : 'tdash-nav-link'}>
                  <Icon /> <span>{item.label}</span>
                  {item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        )}

        {!isSettingsRoute && (
          <>
            <div className="dash-refer-card tdash-grow-card">
              <span className="dash-refer-icon"><DiamondIcon /></span>
              <strong>Grow your tutoring business</strong>
              <span>Keep your profile updated and get more students.</span>
              <div className="tdash-grow-progress">
                <div className="tdash-grow-bar"><span style={{ width: `${strength?.percent ?? 0}%` }} /></div>
                <em>{strength?.percent ?? 0}% complete</em>
              </div>
              <Link to="/tutor/profile" className="btn btn-secondary full">Improve profile <ChevronRightIcon /></Link>
            </div>

            <button type="button" className="btn btn-secondary full" onClick={() => setReferralOpen(true)}>Invite Friends</button>

            <a href="mailto:support@mentora.app" className="tdash-help-link"><HelpCircleIcon /> Need help? <span>Visit our Help Center</span></a>
          </>
        )}

        <LogoutButton className="tdash-logout"><LogOutIcon /> Log Out</LogoutButton>
      </aside>

      <div className="tdash-content-col">
        <header className="tdash-topbar">
          <Link to="/tutor" className="tdash-topbar-brand">
            <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />
            <span>Mentora</span>
          </Link>
          <div className="tdash-topbar-actions">
            <ThemeToggle />
            <Link to="/tutor/notifications" className="dash-bell" aria-label="Notifications">
              <BellIcon />
              {unreadNotifications > 0 && <span className="dash-bell-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
            </Link>
            <Link to="/tutor/profile" className="tdash-topbar-user">
              <Avatar name={user?.name ?? ''} photoUrl={user?.photoUrl} className="tdash-topbar-avatar" />
              <ChevronDownIcon />
            </Link>
          </div>
        </header>

        {profile?.verificationStatus === 'REJECTED' && (
          <div className="tutor-status-banner rejected">
            <ShieldCheckIcon />
            <span>{profile.rejectionReason ? `Your verification wasn't approved: ${profile.rejectionReason}` : "Your verification wasn't approved. Please contact support for details."}</span>
          </div>
        )}

        <main className="tdash-main">
          {isDashboardHome && (
            <div className="tdash-welcome">
              <h1>Welcome back, {user?.name.split(' ')[0]} 👋</h1>
              <p>Here's what's happening with your tutoring business today.</p>
            </div>
          )}
          {children}
        </main>
      </div>
      {referralOpen && <ReferralModal onClose={() => setReferralOpen(false)} />}
    </div>
  );
}

function VerificationCard({ profile }: { profile: TutorProfileDto }) {
  const [infoOpen, setInfoOpen] = useState(false);

  if (profile.verificationStatus === 'APPROVED') {
    return (
      <div className="tdash-verify-card approved">
        <span className="tdash-verify-icon approved"><CheckIcon /></span>
        <div>
          <h2>You're verified!</h2>
          <p>Your profile is approved and visible to parents. Keep your profile up to date to attract more students.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tdash-verify-card pending">
      <span className="tdash-verify-icon pending"><ShieldCheckIcon /></span>
      <div className="tdash-verify-body">
        <h2>Verification in progress</h2>
        <p>We're reviewing your information.</p>
        <p>Complete the remaining setup while you wait.</p>

        <div className="tdash-verify-steps">
          <div className="tdash-verify-step done">
            <span className="tdash-verify-step-dot"><CheckIcon /></span>
            <strong>Profile submitted</strong>
            <span>Completed</span>
          </div>
          <span className="tdash-verify-step-line done" />
          <div className="tdash-verify-step active">
            <span className="tdash-verify-step-dot"><ClockIcon /></span>
            <strong>Under review</strong>
            <span>In progress</span>
          </div>
          <span className="tdash-verify-step-line" />
          <div className="tdash-verify-step">
            <span className="tdash-verify-step-dot" />
            <strong>Approved</strong>
            <span>Pending</span>
          </div>
        </div>

        <button type="button" className="btn btn-secondary" onClick={() => setInfoOpen(true)}>Learn more about verification</button>
      </div>

      {infoOpen && (
        <Modal title="How verification works" onClose={() => setInfoOpen(false)}>
          <p className="booking-section-hint">
            Our team reviews the ID and qualification documents you submitted to confirm you are who you say you are, and that
            your teaching credentials are genuine. This keeps Mentora safe for parents and students.
          </p>
          <p className="booking-section-hint">Reviews are done by a real person and typically take 1-3 business days. You'll get an email as soon as a decision is made — you don't need to do anything else in the meantime.</p>
        </Modal>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_ICON: Record<TutorActivityItem['kind'], (p: { className?: string }) => JSX.Element> = {
  welcome: StarIcon,
  verification_submitted: ShieldCheckIcon,
  verification_approved: CheckIcon,
  booking: CalendarIcon,
  review: StarIcon,
  message: ChatIcon,
};

export function TutorDashboardHomePage() {
  const [profile, setProfile] = useState<TutorProfileDto | null>(null);
  const [summary, setSummary] = useState<TutorDashboardSummary | null>(null);
  const [activity, setActivity] = useState<TutorActivityItem[] | null>(null);
  const [strength, setStrength] = useState<ProfileStrength | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[] | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me').then((r) => setProfile(r.data?.profile ?? null)).catch(() => {});
    apiRequest<{ summary: TutorDashboardSummary }>('/api/tutor/dashboard/summary').then((r) => setSummary(r.data?.summary ?? null)).catch(() => {});
    apiRequest<{ activity: TutorActivityItem[] }>('/api/tutor/dashboard/activity').then((r) => setActivity(r.data?.activity ?? [])).catch(() => setActivity([]));
    apiRequest<{ strength: ProfileStrength }>('/api/tutor/dashboard/profile-strength').then((r) => setStrength(r.data?.strength ?? null)).catch(() => {});
    apiRequest<{ slots: AvailabilitySlot[] }>('/api/tutor/availability').then((r) => setAvailability(r.data?.slots ?? [])).catch(() => setAvailability([]));
  }, []);

  const visibleActivity = showAllActivity ? activity : activity?.slice(0, 3);
  const hasAvailability = (availability?.length ?? 0) > 0;
  const hasPayout = Boolean(profile?.payoutVerifiedAt);

  return (
    <div className="tdash-home">
      {profile && <VerificationCard profile={profile} />}

      <section className="dash-card">
        <h2>Complete your setup</h2>
        <p className="booking-section-hint">Finish these steps to get fully verified and start receiving bookings.</p>
        <div className="tdash-setup-grid">
          <div className="tdash-setup-card">
            <span className="tdash-setup-icon blue"><CalendarIcon /></span>
            <strong>{hasAvailability ? 'Availability set' : 'Set your availability'}</strong>
            <span>{hasAvailability ? `You have ${availability!.length} time slot${availability!.length === 1 ? '' : 's'} open.` : 'Tell students when you\'re available to teach.'}</span>
            <Link to="/tutor/availability" className="btn btn-primary">
              {hasAvailability ? 'Manage availability' : 'Set availability'} <ChevronRightIcon />
            </Link>
          </div>
          <div className="tdash-setup-card">
            <span className="tdash-setup-icon green"><WalletIcon /></span>
            <strong>{hasPayout ? 'Payout details verified' : 'Complete payout setup'}</strong>
            <span>{hasPayout ? `Earnings will go to ${profile?.payoutAccountName}.` : 'Add your payout details to receive your earnings.'}</span>
            <Link to="/tutor/earnings" className="btn btn-payout">
              {hasPayout ? 'Update payout details' : 'Complete now'} <ChevronRightIcon />
            </Link>
          </div>
          <div className="tdash-setup-card">
            <span className="tdash-setup-icon purple"><EditIcon /></span>
            <strong>Edit your profile</strong>
            <span>Keep your profile up to date to attract more students.</span>
            <Link to="/tutor/profile" className="btn btn-edit">Edit profile <ChevronRightIcon /></Link>
          </div>
        </div>
      </section>

      <section className="dash-card">
        <h2>Overview</h2>
        <div className="mystudents-stats-grid">
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-blue"><CalendarIcon /></span>
            <div><strong>{summary?.totalBookings ?? '—'}</strong><span>Total bookings</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-green"><ClockIcon /></span>
            <div><strong>{summary?.upcomingSessions ?? '—'}</strong><span>Upcoming sessions</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-orange"><ChatIcon /></span>
            <div><strong>{summary?.unreadMessages ?? '—'}</strong><span>Unread messages</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-purple"><WalletIcon /></span>
            <div><strong>₦{(summary?.totalEarningsThisMonth ?? 0).toLocaleString()}</strong><span>Earnings this month</span></div>
          </div>
        </div>
      </section>

      <section className="dash-card">
        <h2>Recent activity</h2>
        {activity === null ? null : activity.length === 0 ? (
          <p className="booking-section-hint">Nothing yet — your activity will show up here as you use Mentora.</p>
        ) : (
          <>
            <div className="tdash-activity-list">
              {visibleActivity!.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <div key={a.id} className="tdash-activity-row">
                    <span className="tdash-activity-icon"><Icon /></span>
                    <div className="tdash-activity-info">
                      <strong>{a.title}</strong>
                      <span>{a.description}</span>
                    </div>
                    <span className="tdash-activity-time">{timeAgo(a.createdAt)}</span>
                  </div>
                );
              })}
            </div>
            {activity.length > 3 && (
              <button type="button" className="link-btn tdash-activity-toggle" onClick={() => setShowAllActivity((v) => !v)}>
                {showAllActivity ? 'Show less' : 'View all activity'} <ChevronRightIcon />
              </button>
            )}
          </>
        )}
      </section>

      <aside className="tdash-home-sidebar">
        <section className="dash-card">
          <h2>Profile strength</h2>
          <div className="tdash-strength-row">
            <div className="tdash-strength-donut" style={{ background: `conic-gradient(var(--primary) ${strength?.percent ?? 0}%, var(--line) 0)` }}>
              <span>{strength?.percent ?? 0}%</span>
            </div>
            <div>
              <strong>{strength?.label ?? '—'}</strong>
              <p>Complete the remaining steps to boost your visibility.</p>
            </div>
          </div>
          <Link to="/tutor/profile" className="btn btn-secondary full">Improve profile</Link>
        </section>

        {profile && (
          <section className="dash-card">
            <h2>Your teaching profile</h2>
            <strong className="tdash-teaching-title">{profile.professionalTitle ?? 'Add a title'}</strong>
            {profile.yearsExperience && <span className="tdash-teaching-line">{profile.yearsExperience} experience</span>}
            {(profile.city || profile.country) && <span className="tdash-teaching-line muted">{[profile.city, profile.country].filter(Boolean).join(', ')}</span>}
            <button type="button" className="link-btn" onClick={() => setPreviewOpen(true)}>Preview my profile →</button>
          </section>
        )}

        <section className="dash-card tdash-quicklinks">
          <h2>Quick links</h2>
          <Link to="/tutor/availability">Availability <ChevronRightIcon /></Link>
          <Link to="/tutor/students">My students <ChevronRightIcon /></Link>
          <Link to="/tutor/reviews">My reviews <ChevronRightIcon /></Link>
          <a href="mailto:support@mentora.app">Help center <ChevronRightIcon /></a>
        </section>

        <section className="dash-card tdash-tips">
          <div className="tdash-tips-head"><LightbulbIcon /><h2>Tips to get more bookings</h2></div>
          <ul>
            <li className={profile?.profileCompletedAt ? 'done' : ''}><CheckIcon /> Complete your profile</li>
            <li className={profile?.photoUrl ? 'done' : ''}><CheckIcon /> Add a clear profile photo</li>
            <li className={hasAvailability ? 'done' : ''}><CheckIcon /> Set your availability</li>
            <li className={profile?.verificationStatus === 'APPROVED' ? 'done' : ''}><CheckIcon /> Get your profile verified</li>
          </ul>
        </section>
      </aside>

      {previewOpen && profile && (
        <Modal title="Profile Preview" onClose={() => setPreviewOpen(false)}>
          <p className="booking-section-hint" style={{ marginBottom: 16 }}>
            This is how your profile will appear to parents once tutor search includes your account.
          </p>
          <div className="tdash-preview-card">
            <strong>{profile.professionalTitle ?? 'Tutor'}</strong>
            {profile.bio && <p>{profile.bio}</p>}
            <div className="tdash-preview-tags">
              {profile.subjects.map((s) => <span key={s} className="tutor-onb-chip">{s}</span>)}
            </div>
            <div className="tdash-preview-meta">
              {profile.yearsExperience && <span>{profile.yearsExperience} experience</span>}
              {profile.sessionPrice !== null && <span>₦{profile.sessionPrice?.toLocaleString()} / session</span>}
              {(profile.city || profile.country) && <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
