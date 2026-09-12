import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import type { UserSummary, UserPreferences, AccountSummary, ActivityOverview, Student } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PhotoUploader } from '../components/PhotoUploader';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { ComingSoonModal } from '../components/ComingSoonModal';
import { useTheme } from '../hooks/useTheme';
import {
  UserFieldIcon,
  SettingsIcon,
  BellIcon,
  ShieldCheckIcon,
  WalletIcon,
  UsersIcon,
  SlidersIcon,
  HelpCircleIcon,
  InfoIcon,
  MailIcon,
  LockIcon,
  PhoneIcon,
  CalendarIcon,
  ChevronRightIcon,
  CheckIcon,
  TrashIcon,
  ClockIcon,
  ChartIcon,
  TrophyIcon,
  BookIcon,
  ChatIcon,
  StarIcon,
  MegaphoneIcon,
  MoonIcon,
} from '../components/Icons';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent Account',
  STUDENT: 'Student Account',
  TUTOR: 'Tutor Account',
  ADMIN: 'Admin Account',
};

export type TabKey = 'profile' | 'account' | 'notifications' | 'privacy' | 'payments' | 'parental' | 'preferences' | 'help';

export const SETTINGS_NAV: { key: TabKey; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: 'profile', label: 'Profile', icon: UserFieldIcon },
  { key: 'account', label: 'Account', icon: SettingsIcon },
  { key: 'notifications', label: 'Notifications', icon: BellIcon },
  { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheckIcon },
  { key: 'payments', label: 'Payment Methods', icon: WalletIcon },
  { key: 'parental', label: 'Parental Controls', icon: UsersIcon },
  { key: 'preferences', label: 'App Preferences', icon: SlidersIcon },
  { key: 'help', label: 'Help & Support', icon: HelpCircleIcon },
];

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const requestedTab = params.get('section') as TabKey | null;
  const tab: TabKey = SETTINGS_NAV.some((item) => item.key === requestedTab) ? requestedTab! : 'profile';
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [overview, setOverview] = useState<ActivityOverview | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    apiRequest<{ preferences: UserPreferences }>('/api/users/me/preferences').then((r) => setPreferences(r.data?.preferences ?? null)).catch(() => {});
    apiRequest<{ summary: AccountSummary }>('/api/users/me/account-summary').then((r) => setSummary(r.data?.summary ?? null)).catch(() => {});
    apiRequest<{ overview: ActivityOverview }>('/api/users/me/activity-overview').then((r) => setOverview(r.data?.overview ?? null)).catch(() => {});
    apiRequest<{ students: Student[] }>('/api/students').then((r) => setStudents(r.data?.students ?? [])).catch(() => setStudents([]));
  }, []);

  async function updatePreference(patch: Partial<UserPreferences>) {
    setPreferences((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await apiRequest('/api/users/me/preferences', { method: 'PATCH', body: JSON.stringify(patch) });
    } catch {
      apiRequest<{ preferences: UserPreferences }>('/api/users/me/preferences').then((r) => setPreferences(r.data?.preferences ?? null)).catch(() => {});
    }
  }

  return (
    <div className="settings-shell">
      <h1 className="settings-title">Settings</h1>
      <p className="settings-subtitle">Manage your account, preferences and app settings.</p>

      <div className="settings-main">
        {tab === 'profile' && (
          <ProfileTab
            user={user}
            summary={summary}
            onEdit={() => setEditProfileOpen(true)}
            onPhotoChanged={() => { void refreshUser(); }}
          />
        )}
        {tab === 'account' && <AccountTab user={user} onProfileUpdated={() => { void refreshUser(); }} />}
        {tab === 'notifications' && <NotificationsTab preferences={preferences} onUpdate={updatePreference} />}
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'payments' && <PaymentsTab />}
        {tab === 'parental' && (
          <ParentalControlsTab overview={overview} preferences={preferences} onUpdate={updatePreference} students={students} />
        )}
        {tab === 'preferences' && <AppPreferencesTab />}
        {tab === 'help' && <HelpTab />}
      </div>

      {editProfileOpen && user && (
        <EditProfileModal
          user={user}
          onClose={() => setEditProfileOpen(false)}
          onSaved={() => {
            void refreshUser();
            setEditProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProfileTab({
  user,
  summary,
  onEdit,
  onPhotoChanged,
}: {
  user: UserSummary | null;
  summary: AccountSummary | null;
  onEdit: () => void;
  onPhotoChanged: (photoUrl: string | null) => void;
}) {
  const [helpModal, setHelpModal] = useState<'center' | 'contact' | null>(null);

  return (
    <div className="settings-main settings-two-col">
      <div className="settings-col-main">
        <section className="dash-card settings-card">
          <div className="tprofile-section-heading spread">
            <h2>Profile Information</h2>
            <button type="button" className="mystudents-view-link" onClick={onEdit}><UserFieldIcon /> Edit</button>
          </div>
          <p className="booking-section-hint">Update your personal information and how others see you.</p>

          {user && (
            <div className="settings-profile-row">
              <PhotoUploader
                name={user.name}
                photoUrl={user.photoUrl}
                uploadUrl="/api/users/me/photo"
                deleteUrl="/api/users/me/photo"
                onChange={onPhotoChanged}
                avatarClassName="settings-avatar-lg"
              />
              <div className="settings-profile-fields">
                <div className="settings-field-row"><span>Full Name</span><strong>{user.name}</strong></div>
                <div className="settings-field-row">
                  <span>Email Address</span>
                  <strong>{user.email} {user.emailVerified && <span className="settings-verified-badge">Verified</span>}</strong>
                </div>
                <div className="settings-field-row"><span>Phone Number</span><strong>{user.phone || 'Not set'}</strong></div>
                <div className="settings-field-row"><span>Location</span><strong>{user.location || 'Not set'}</strong></div>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="settings-col-side">
        <div className="dash-card settings-card">
          <h2>Account Summary</h2>
          <div className="settings-summary-list">
            <div className="settings-summary-row"><UserFieldIcon /><div><span>Account Type</span><strong>{user ? (ROLE_LABELS[user.role] ?? user.role) : '—'}</strong></div></div>
            <div className="settings-summary-row"><CalendarIcon /><div><span>Member Since</span><strong>{user ? formatMemberSince(user.createdAt) : '—'}</strong></div></div>
            <div className="settings-summary-row"><UsersIcon /><div><span>Children</span><strong>{summary?.studentCount ?? '—'} Children</strong></div></div>
            <div className="settings-summary-row"><BookIcon /><div><span>Total Bookings</span><strong>{summary?.totalBookings ?? '—'} Bookings</strong></div></div>
          </div>
        </div>

        <div className="dash-card settings-card">
          <h2>Need Help?</h2>
          <p className="booking-section-hint">We're here to help you with any questions or concerns.</p>
          <div className="settings-help-links">
            <button type="button" className="settings-help-link-btn" onClick={() => setHelpModal('center')}>Help Center <span aria-hidden="true">→</span></button>
            <button type="button" className="settings-help-link-btn" onClick={() => setHelpModal('contact')}>Contact Support <span aria-hidden="true">→</span></button>
            <Link className="settings-help-link-btn" to="/help/faq">FAQ <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </aside>

      {helpModal === 'center' && <ComingSoonModal title="Help Center" onClose={() => setHelpModal(null)} />}
      {helpModal === 'contact' && <ComingSoonModal title="Contact Support" onClose={() => setHelpModal(null)} />}
    </div>
  );
}

function EditProfileModal({ user, onClose, onSaved }: { user: UserSummary; onClose: () => void; onSaved: (u: UserSummary) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [location, setLocation] = useState(user.location ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ user: UserSummary }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone: phone || undefined, location: location || undefined }),
      });
      if (res.data?.user) onSaved(res.data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <label className="field"><span>Full name</span><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        <label className="field"><span>Phone number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" /></label>
        <label className="field"><span>Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" /></label>
        {error && <p className="photo-uploader-error">{error}</p>}
        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </Modal>
  );
}

function AccountTab({ user, onProfileUpdated }: { user: UserSummary | null; onProfileUpdated: () => void }) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <div className="settings-main">
      <section className="dash-card settings-card">
        <div className="tprofile-section-heading spread">
          <h2>Account Information</h2>
        </div>
        {user && (
          <div className="settings-profile-row">
            <Avatar name={user.name} photoUrl={user.photoUrl} className="settings-avatar-lg" />
            <div className="settings-profile-fields">
              <div className="settings-field-row"><span>Full Name</span><strong>{user.name}</strong></div>
              <div className="settings-field-row">
                <span>Email Address</span>
                <strong>{user.email} {user.emailVerified && <span className="settings-verified-badge">Verified</span>}</strong>
              </div>
              <div className="settings-field-row"><span>Phone Number</span><strong>{user.phone || 'Not set'}</strong></div>
              <div className="settings-field-row"><span>Location</span><strong>{user.location || 'Not set'}</strong></div>
            </div>
          </div>
        )}
      </section>

      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><LockIcon /></div>
        <div className="settings-row-info"><strong>Change Password</strong><span>Update your password regularly to keep your account secure.</span></div>
        <button type="button" className="btn btn-secondary" onClick={() => setPasswordModalOpen(true)}><LockIcon /> Change Password</button>
      </section>

      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><MailIcon /></div>
        <div className="settings-row-info"><strong>Email Address</strong><span>Update the email address associated with your account.</span></div>
        <button type="button" className="btn btn-secondary" onClick={() => setEmailModalOpen(true)}><MailIcon /> Update Email</button>
      </section>

      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><ShieldCheckIcon /></div>
        <div className="settings-row-info"><strong>Two-Factor Authentication</strong><span>Add an extra layer of security to your account.</span></div>
        <span className="settings-coming-soon">Coming Soon</span>
      </section>

      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><UserFieldIcon /></div>
        <div className="settings-row-info"><strong>Account Type</strong><span>You are currently using a {user ? (ROLE_LABELS[user.role] ?? user.role) : ''}.</span></div>
      </section>

      <h3 className="settings-danger-zone-heading">Danger Zone</h3>
      <section className="dash-card settings-card settings-row-card settings-danger-card">
        <div className="settings-row-icon settings-danger-icon"><TrashIcon /></div>
        <div className="settings-row-info"><strong>Delete Account</strong><span>Once you delete your account, all your data will be permanently removed. This action cannot be undone.</span></div>
        <button type="button" className="btn settings-btn-danger" onClick={() => setDeleteModalOpen(true)}><TrashIcon /> Delete Account</button>
      </section>

      {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} />}
      {emailModalOpen && <ChangeEmailModal onClose={() => setEmailModalOpen(false)} onUpdated={onProfileUpdated} />}
      {deleteModalOpen && <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      {done ? (
        <p className="booking-section-hint">Your password has been updated.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mystudents-edit-form">
          <label className="field"><span>New password</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></label>
          <label className={passwordMismatch ? 'field field-invalid' : 'field'}><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} aria-invalid={passwordMismatch} />{passwordMismatch && <span className="field-error-text" role="alert">Passwords do not match</span>}</label>
          {error && <p className="photo-uploader-error">{error}</p>}
          <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Updating…' : 'Update Password'}</button>
        </form>
      )}
    </Modal>
  );
}

function ChangeEmailModal({ onClose, onUpdated }: { onClose: () => void; onUpdated: () => void }) {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: window.location.origin },
      );
      if (updateError) throw updateError;
      onUpdated();
      navigate(`/verify?email=${encodeURIComponent(newEmail.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Update Email Address" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <p className="booking-section-hint">We'll send a confirmation to your new address before it becomes active.</p>
        <label className="field"><span>New email address</span><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></label>
        {error && <p className="photo-uploader-error">{error}</p>}
        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Updating…' : 'Update Email'}</button>
      </form>
    </Modal>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      setError('Type DELETE to confirm.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/users/me', { method: 'DELETE' });
      await supabase.auth.signOut().catch(() => {});
      navigate('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Delete Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <p className="photo-uploader-error">This permanently deletes your account, your children's profiles, bookings, reviews and everything else tied to it. This cannot be undone.</p>
        <label className="field"><span>Type DELETE to confirm</span><input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required /></label>
        {error && <p className="photo-uploader-error">{error}</p>}
        <button type="submit" className="btn settings-btn-danger full" disabled={submitting}>{submitting ? 'Deleting…' : 'Permanently Delete Account'}</button>
      </form>
    </Modal>
  );
}

function ToggleRow({ icon, title, description, checked, onChange }: { icon: ReactNode; title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings-toggle-row">
      <span className="settings-row-icon">{icon}</span>
      <div className="settings-row-info"><strong>{title}</strong><span>{description}</span></div>
      <button type="button" className={checked ? 'settings-switch on' : 'settings-switch'} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

function NotificationsTab({ preferences, onUpdate }: { preferences: UserPreferences | null; onUpdate: (patch: Partial<UserPreferences>) => void }) {
  if (!preferences) return <div className="settings-main" />;
  return (
    <div className="settings-main">
      <section className="dash-card settings-card">
        <h2>Notify me about</h2>
        <p className="booking-section-hint">Choose which updates you want to hear about.</p>
        <ToggleRow icon={<CalendarIcon />} title="Bookings & Reminders" description="Get notified about new bookings, session reminders and schedule changes." checked={preferences.bookingReminders} onChange={(v) => onUpdate({ bookingReminders: v })} />
        <ToggleRow icon={<ChatIcon />} title="Messages" description="Get notified when you receive a new message from a tutor." checked={preferences.messageNotifications} onChange={(v) => onUpdate({ messageNotifications: v })} />
        <ToggleRow icon={<ClockIcon />} title="Upcoming Sessions" description="Receive reminders before your upcoming sessions." checked={preferences.sessionReminders} onChange={(v) => onUpdate({ sessionReminders: v })} />
        <ToggleRow icon={<WalletIcon />} title="Payments" description="Get notified about successful payments and receipts." checked={preferences.paymentNotifications} onChange={(v) => onUpdate({ paymentNotifications: v })} />
        <ToggleRow icon={<StarIcon />} title="Review Reminders" description="Get reminded to review tutors after completed sessions." checked={preferences.reviewNotifications} onChange={(v) => onUpdate({ reviewNotifications: v })} />
        <ToggleRow icon={<MegaphoneIcon />} title="Announcements" description="Important updates and news from Mentora." checked={preferences.announcements} onChange={(v) => onUpdate({ announcements: v })} />
      </section>

      <section className="dash-card settings-card">
        <h2>Delivery Preferences</h2>
        <ToggleRow icon={<MailIcon />} title="Email Notifications" description="Receive notifications via email." checked={preferences.emailNotifications} onChange={(v) => onUpdate({ emailNotifications: v })} />
        <ToggleRow icon={<PhoneIcon />} title="Push Notifications" description="Receive push notifications on your device. (Coming soon — preference is saved for when this launches.)" checked={preferences.pushNotifications} onChange={(v) => onUpdate({ pushNotifications: v })} />
      </section>

      <section className="dash-card settings-card settings-quiet-hours-card">
        <div className="settings-toggle-row">
          <span className="settings-row-icon"><MoonIcon /></span>
          <div className="settings-row-info"><strong>Quiet Hours</strong><span>Pause non-urgent notifications during these hours.</span></div>
          <button
            type="button"
            className={preferences.quietHoursEnabled ? 'settings-switch on' : 'settings-switch'}
            role="switch"
            aria-checked={preferences.quietHoursEnabled}
            onClick={() => onUpdate({ quietHoursEnabled: !preferences.quietHoursEnabled })}
          >
            <span />
          </button>
        </div>
        {preferences.quietHoursEnabled && (
          <div className="settings-quiet-hours-range">
            <label>
              From
              <input type="time" value={preferences.quietHoursStart} onChange={(e) => onUpdate({ quietHoursStart: e.target.value })} />
            </label>
            <label>
              To
              <input type="time" value={preferences.quietHoursEnd} onChange={(e) => onUpdate({ quietHoursEnd: e.target.value })} />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="settings-main">
      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><ShieldCheckIcon /></div>
        <div className="settings-row-info"><strong>Two-Factor Authentication</strong><span>Add an extra layer of security to your account.</span></div>
        <span className="settings-coming-soon">Coming Soon</span>
      </section>
      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><SettingsIcon /></div>
        <div className="settings-row-info"><strong>Manage Devices</strong><span>View and manage devices logged in to your account.</span></div>
        <span className="settings-coming-soon">Coming Soon</span>
      </section>
      <section className="dash-card settings-card settings-row-card">
        <div className="settings-row-icon"><UsersIcon /></div>
        <div className="settings-row-info"><strong>Blocked Tutors</strong><span>Manage tutors you don't want to appear in your search.</span></div>
        <span className="settings-coming-soon">Coming Soon</span>
      </section>
      <p className="booking-section-hint">Need to change your password or delete your account? Head to the Account tab.</p>
    </div>
  );
}

function PaymentsTab() {
  return (
    <div className="settings-main">
      <div className="mystudents-empty">
        <p>Manage saved cards, your wallet and transaction history from the Payments page.</p>
        <Link to="/dashboard/payments" className="btn btn-primary">Go to Payments</Link>
      </div>
    </div>
  );
}

function ParentalControlsTab({
  overview,
  preferences,
  onUpdate,
  students,
}: {
  overview: ActivityOverview | null;
  preferences: UserPreferences | null;
  onUpdate: (patch: Partial<UserPreferences>) => void;
  students: Student[] | null;
}) {
  const [limitDraft, setLimitDraft] = useState('');

  useEffect(() => {
    if (preferences) setLimitDraft(preferences.dailyScreenTimeLimit != null ? String(preferences.dailyScreenTimeLimit) : '');
  }, [preferences?.dailyScreenTimeLimit]);

  return (
    <div className="settings-main">
      <section className="dash-card settings-card">
        <h2>Activity Overview</h2>
        <p className="booking-section-hint">Real activity across all your children's booked sessions.</p>
        <div className="mystudents-stats-grid settings-activity-grid">
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-blue"><ClockIcon /></span>
            <div><strong>{overview ? `${overview.totalSessionHours}h` : '—'}</strong><span>Total Session Time</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-green"><CheckIcon /></span>
            <div><strong>{overview?.sessionsCompleted ?? '—'}</strong><span>Sessions Completed</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-purple"><ChartIcon /></span>
            <div><strong>{overview?.tutorsWorkedWith ?? '—'}</strong><span>Tutors Worked With</span></div>
          </div>
          <div className="mystudents-stat-card">
            <span className="mystudents-stat-icon tone-orange"><TrophyIcon /></span>
            <div><strong>{overview?.bookingStreakWeeks ?? '—'}</strong><span>Week Streak</span></div>
          </div>
        </div>
      </section>

      {preferences && (
        <section className="dash-card settings-card">
          <h2>Quick Controls</h2>
          <p className="booking-section-hint">Manage learning and safety preferences for your children.</p>

          <div className="settings-toggle-row">
            <span className="settings-row-icon"><ClockIcon /></span>
            <div className="settings-row-info"><strong>Daily Screen Time Limit</strong><span>Set a daily time limit for using Mentora (in minutes). Saved, not yet enforced.</span></div>
            <input
              type="number"
              min={0}
              max={1440}
              className="settings-inline-input"
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              onBlur={() => onUpdate({ dailyScreenTimeLimit: limitDraft ? Number(limitDraft) : null })}
              placeholder="No limit"
            />
          </div>

          <ToggleRow icon={<ShieldCheckIcon />} title="Content Filtering" description="Restrict content to age-appropriate learning materials." checked={preferences.contentFiltering} onChange={(v) => onUpdate({ contentFiltering: v })} />
          <ToggleRow icon={<UsersIcon />} title="Tutor Notes About Your Child" description="Allow tutors to send one-way notes or updates about your child. Your child cannot reply or chat directly with tutors — only you can." checked={preferences.directMessaging} onChange={(v) => onUpdate({ directMessaging: v })} />
          <ToggleRow icon={<SlidersIcon />} title="Search Restrictions" description="Limit search to approved subjects and tutors only." checked={preferences.searchRestrictions} onChange={(v) => onUpdate({ searchRestrictions: v })} />
        </section>
      )}

      <section className="dash-card settings-card">
        <h2>Your Children</h2>
        <p className="booking-section-hint">Manage each child's profile from My Children.</p>
        {students === null ? null : students.length === 0 ? (
          <p className="booking-section-hint">No children added yet.</p>
        ) : (
          <div className="settings-student-list">
            {students.map((s) => (
              <div key={s.id} className="settings-student-row">
                <Avatar name={s.fullName} photoUrl={s.photoUrl} className="mystudents-session-avatar" />
                <div><strong>{s.fullName}</strong><span>{s.grade || 'Grade not set'}</span></div>
                <span className="dash-status-pill online">Active</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {preferences && (
        <section className="dash-card settings-card">
          <h2>Activity Alerts</h2>
          <p className="booking-section-hint">Get notified about important activity.</p>
          <ToggleRow icon={<MailIcon />} title="Weekly Activity Summary" description="Receive a summary of your child's progress." checked={preferences.weeklyActivitySummary} onChange={(v) => onUpdate({ weeklyActivitySummary: v })} />
          <ToggleRow icon={<ShieldCheckIcon />} title="Unusual Activity Alerts" description="Get notified about unusual login or activity." checked={preferences.unusualActivityAlerts} onChange={(v) => onUpdate({ unusualActivityAlerts: v })} />
        </section>
      )}
    </div>
  );
}

function AppPreferencesTab() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="settings-main">
      <section className="dash-card settings-card">
        <h2>App Preferences</h2>
        <div className="settings-toggle-row">
          <span className="settings-row-icon"><SlidersIcon /></span>
          <div className="settings-row-info"><strong>Dark Mode</strong><span>Currently {theme === 'dark' ? 'On' : 'Off'}.</span></div>
          <button type="button" className={theme === 'dark' ? 'settings-switch on' : 'settings-switch'} role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme}>
            <span />
          </button>
        </div>
        <div className="settings-field-row settings-fixed-pref"><span>Language</span><strong>English (US)</strong></div>
        <div className="settings-field-row settings-fixed-pref"><span>Currency</span><strong>NGN (₦) — the only currency Mentora supports today</strong></div>
        <div className="settings-field-row settings-fixed-pref"><span>Timezone</span><strong>WAT (UTC+1) — all sessions are scheduled in this timezone</strong></div>
      </section>
    </div>
  );
}

function HelpTab() {
  const [helpModal, setHelpModal] = useState<'center' | 'contact' | null>(null);

  return (
    <div className="settings-main">
      <section className="dash-card settings-card">
        <h2>Help &amp; Support</h2>
        <div className="settings-help-links settings-help-links-block">
          <button type="button" className="settings-help-link-btn" onClick={() => setHelpModal('center')}><HelpCircleIcon /> Help Center <ChevronRightIcon /></button>
          <button type="button" className="settings-help-link-btn" onClick={() => setHelpModal('contact')}><MailIcon /> Contact Support <ChevronRightIcon /></button>
          <Link className="settings-help-link-btn" to="/help/faq"><InfoIcon /> FAQ <ChevronRightIcon /></Link>
        </div>
      </section>

      {helpModal === 'center' && <ComingSoonModal title="Help Center" onClose={() => setHelpModal(null)} />}
      {helpModal === 'contact' && <ComingSoonModal title="Contact Support" onClose={() => setHelpModal(null)} />}
    </div>
  );
}

