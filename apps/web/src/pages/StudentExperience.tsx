import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Booking, MeetingInfo, Notification, StudentOverview, StudentProgressSummary } from '@mentora/shared';
import mentoraLogo from '../assets/mentora-logo.jpg';
import learningBooks from '../assets/student-learning-books.png';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { ReferralModal } from '../components/ReferralModal';
import { Modal } from '../components/Modal';
import { LogoutButton } from '../components/LogoutButton';
import {
  BellIcon, BookIcon, CalendarIcon, ChartIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon,
  ClockIcon, GraduationCapIcon, HelpCircleIcon, HomeIcon, LightbulbIcon, LockIcon, LogOutIcon,
  MenuIcon, NoteIcon, SearchIcon, SettingsIcon, ShieldCheckIcon, TrophyIcon, UserFieldIcon,
  VideoIcon, XIcon,
} from '../components/Icons';

export function StudentLoginPage() {
  const { signInStudent } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const close = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/login', { replace: true });
  };
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submitting) return; setError('');
    if (!/^MEN-[A-F0-9]{8}$/i.test(loginId.trim())) { setError('Enter the Student ID provided by your parent, for example MEN-12AB34CD.'); return; }
    if (!password) { setError('Enter your student password.'); return; }
    setSubmitting(true);
    try { const user = await signInStudent(loginId.trim().toUpperCase(), password); navigate(user.role === 'STUDENT' ? '/student' : '/login', { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign you in. Check your Student ID and password.'); }
    finally { setSubmitting(false); }
  }
  return <main className="student-login-page"><button type="button" className="student-login-close" onClick={close} aria-label="Close student sign in"><XIcon/></button><section><div className="student-brand"><img src={mentoraLogo} alt=""/><strong>Mentora</strong></div><img src={learningBooks} alt="Graduation cap resting on books beside a pencil cup"/><h1>Your learning starts here</h1><p>Open your lessons, resources and progress in one safe place.</p></section><form onSubmit={submit}><h1>Student sign in</h1><p>Use the Student ID and password provided by your parent.</p><label><span>Student ID</span><div><GraduationCapIcon/><input value={loginId} onChange={(event)=>setLoginId(event.target.value.toUpperCase())} placeholder="MEN-12AB34CD" autoComplete="username"/></div></label><label><span>Password</span><div><LockIcon/><input type={showPassword?'text':'password'} value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword((value)=>!value)}>{showPassword?'Hide':'Show'}</button></div></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary full" disabled={submitting}>{submitting&&<span className="spinner"/>}{submitting?'Signing in...':'Sign in'}</button><p className="student-login-help">Forgot your password? Ask your parent to reset it from their Mentora account.</p><Link to="/login">Parent or tutor sign in</Link></form></main>;
}

const STUDENT_NAV = [
  { label: 'Dashboard', to: '/student', icon: HomeIcon },
  { label: 'My Lessons', to: '/student/lessons', icon: CalendarIcon },
  { label: 'Learning Resources', to: '/student/resources', icon: BookIcon },
  { label: 'My Progress', to: '/student/progress', icon: ChartIcon },
  { label: 'Notifications', to: '/student/notifications', icon: BellIcon },
  { label: 'Profile', to: '/student/profile', icon: UserFieldIcon },
  { label: 'Settings', to: '/student/settings', icon: SettingsIcon },
] as const;

function useStudentOverview() {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<{ overview: StudentOverview }>('/api/student/overview')
      .then((res) => setData(res.data?.overview ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your student profile.'));
  }, []);
  return { data, error };
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="student-state-panel">{children}</div>;
}

function StudentTopbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return (
    <header className="student-topbar">
      <button className="student-menu-button" type="button" aria-label="Open navigation" onClick={onMenu}><MenuIcon /></button>
      <Link to="/student" className="student-topbar-brand">
        <img src={mentoraLogo} alt="" aria-hidden="true" className="brand-logo-img" />
        <span>Mentora</span>
      </Link>
      <form onSubmit={(event) => { event.preventDefault(); navigate(`/student/resources?q=${encodeURIComponent(query)}`); }} role="search" className="student-global-search">
        <SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons and resources..." aria-label="Search lessons and resources" />
      </form>
      <Link to="/student/notifications" className="student-icon-button" aria-label="Notifications"><BellIcon /></Link>
      <ThemeToggle />
      <Link to="/student/profile" className="student-top-profile">
        <Avatar name={user?.name ?? 'Student'} photoUrl={user?.photoUrl} className="student-top-avatar" />
        <ChevronDownIcon />
      </Link>
    </header>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data } = useStudentOverview();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <div className="student-layout">
      {open && <button type="button" className="student-sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`student-sidebar ${open ? 'open' : ''}`}>
        <div className="student-brand"><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation"><XIcon /></button></div>
        <nav aria-label="Student navigation">
          {STUDENT_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === '/student' ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return <Link key={item.to} to={item.to} className={active ? 'active' : ''}><Icon /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="student-sidebar-bottom">
          <div className="student-encouragement"><TrophyIcon /><strong>Keep learning!</strong><p>Consistent effort builds progress.</p><div><span style={{ width: `${data?.overallProgress ?? 0}%` }} /></div><small>{data?.overallProgress ?? 0}% complete</small></div>
          <Link to="/student/profile" className="student-identity"><Avatar name={user?.name ?? 'Student'} photoUrl={data?.student.photoUrl ?? user?.photoUrl} className="student-side-avatar" /><span><strong>{user?.name ?? 'Student'}</strong><small>Student</small></span></Link>
          <LogoutButton className="btn btn-secondary full"><LogOutIcon /> Sign out</LogoutButton>
        </div>
      </aside>
      <div className="student-main"><StudentTopbar onMenu={() => setOpen(true)} /><main className="student-content">{children}</main></div>
    </div>
  );
}

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function MeetingAccessButton({ bookingId }: { bookingId: string }) {
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function openMeeting() {
    setLoading(true); setError('');
    try {
      const response = await apiRequest<{ meeting: MeetingInfo }>(`/api/meetings/${bookingId}`);
      setMeeting(response.data?.meeting ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Meeting access is unavailable.');
    } finally { setLoading(false); }
  }
  const availabilityMessage = meeting?.availability === 'NOT_CONFIGURED'
    ? 'Your tutor has not added the meeting link yet.'
    : meeting?.availability === 'TOO_EARLY'
      ? 'Meeting access opens 15 minutes before the lesson.'
      : meeting?.availability === 'ENDED'
        ? 'The meeting access window has ended.'
        : '';
  return <>
    <button type="button" className="btn btn-primary" onClick={openMeeting} disabled={loading}>{loading ? 'Checking...' : 'Join Meeting'}</button>
    {error && <span className="form-error" role="alert">{error}</span>}
    {meeting && <Modal title="Lesson Meeting" onClose={() => setMeeting(null)}>
      <div className="tbook-detail">
        <div className="tbook-detail-row"><span>Subject</span><strong>{meeting.subject}</strong></div>
        <div className="tbook-detail-row"><span>Tutor</span><strong>{meeting.tutorName}</strong></div>
        <div className="tbook-detail-row"><span>Schedule</span><strong>{formatLessonDate(meeting.date)}, {meeting.startTime}–{meeting.endTime}</strong></div>
        {meeting.joinUrl
          ? <a className="btn btn-primary full" href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">Open secure meeting</a>
          : <p className="student-muted-note">{availabilityMessage}</p>}
      </div>
    </Modal>}
  </>;
}

function LessonCard({ lesson, details = true }: { lesson: Booking; details?: boolean }) {
  const completed = lesson.status === 'COMPLETED';
  const cancelled = lesson.status === 'CANCELLED';
  return <article className="student-lesson-card">
    <span className="student-card-icon"><CalendarIcon /></span>
    <div><h3>{lesson.subject}</h3><p>with {lesson.tutorName}</p><small>{formatLessonDate(lesson.date)} · {lesson.startTime} - {lesson.endTime}</small></div>
    <span className={`student-status ${lesson.status.toLowerCase()}`}>{lesson.status.toLowerCase()}</span>
    <div className="student-lesson-actions">
      {!completed && !cancelled && <MeetingAccessButton bookingId={lesson.id} />}
      {details && <Link className="btn btn-secondary" to={`/student/lessons/${lesson.id}`}>View details</Link>}
    </div>
  </article>;
}

function useLessons() {
  const [lessons, setLessons] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest<{ lessons: Booking[] }>('/api/student/lessons').then((res) => setLessons(res.data?.lessons ?? [])).catch((err) => setError(err instanceof Error ? err.message : 'Could not load lessons.')); }, []);
  return { lessons, error };
}

export function StudentDashboardPage() {
  const { data, error } = useStudentOverview();
  const { lessons } = useLessons();
  const upcoming = (lessons ?? []).filter((item) => item.status === 'CONFIRMED').slice(0, 3);
  if (error) return <StatePanel>{error}</StatePanel>;
  if (!data) return <StatePanel><span className="spinner" /> Loading your dashboard...</StatePanel>;
  return <>
    <div className="student-page-heading"><div><h1>Welcome back, {data.student.fullName.split(' ')[0]}!</h1><p>Stay focused and keep making progress every day.</p></div></div>
    <section className="student-goal-banner">
      <img src={learningBooks} alt="Graduation cap resting on books beside a pencil cup" />
      <div><h2>Today's Learning Goal</h2><p>Stay focused, learn with confidence and achieve more.</p><Link to="/student/progress" className="btn btn-secondary">View progress</Link></div>
      <div className="student-banner-stat"><span>Progress</span><strong>{data.overallProgress}%</strong><div><i style={{ width: `${data.overallProgress}%` }} /></div></div>
      <div className="student-banner-next"><span>Next lesson</span>{upcoming[0] ? <><strong>{upcoming[0].subject}</strong><small>{formatLessonDate(upcoming[0].date)}, {upcoming[0].startTime}</small></> : <small>No upcoming lesson</small>}</div>
    </section>
    <div className="student-dashboard-grid"><section className="student-panel"><header><h2>My Lessons</h2><Link to="/student/lessons">View all</Link></header>{upcoming.length ? upcoming.map((item) => <LessonCard key={item.id} lesson={item} />) : <StatePanel>No upcoming lessons are scheduled.</StatePanel>}</section>
      <section className="student-panel"><header><h2>Learning Progress</h2></header><div className="student-progress-focus"><strong>{data.overallProgress}%</strong><p>Overall completion</p><div><span style={{ width: `${data.overallProgress}%` }} /></div><Link to="/student/progress" className="btn btn-secondary full">View detailed progress</Link></div></section></div>
    <section className="student-panel"><header><h2>Quick access</h2></header><div className="student-quick-grid"><Link to="/student/lessons"><VideoIcon /><strong>My Lessons</strong><small>View your scheduled learning.</small></Link><Link to="/student/resources"><BookIcon /><strong>Learning Resources</strong><small>Access materials provided for you.</small></Link><Link to="/student/progress"><ChartIcon /><strong>My Progress</strong><small>Track completed lessons.</small></Link><Link to="/student/notifications"><BellIcon /><strong>Notifications</strong><small>See important learning updates.</small></Link></div></section>
  </>;
}

export function StudentLessonsPage() {
  const { lessons, error } = useLessons(); const [tab, setTab] = useState<'upcoming'|'today'|'completed'>('upcoming');
  const filtered = useMemo(() => (lessons ?? []).filter((item) => tab === 'completed' ? item.status === 'COMPLETED' : tab === 'today' ? item.status === 'CONFIRMED' && new Date(item.date).toDateString() === new Date().toDateString() : item.status === 'CONFIRMED'), [lessons, tab]);
  return <><div className="student-page-heading"><div><h1>My Lessons</h1><p>Your upcoming and completed learning sessions.</p></div></div><section className="student-panel"><div className="student-tabs" role="tablist">{(['upcoming','today','completed'] as const).map((value) => <button key={value} role="tab" aria-selected={tab===value} className={tab===value?'active':''} onClick={() => setTab(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>{error ? <StatePanel>{error}</StatePanel> : lessons === null ? <StatePanel><span className="spinner" /> Loading lessons...</StatePanel> : filtered.length ? filtered.map((item) => <LessonCard key={item.id} lesson={item} />) : <StatePanel>No {tab} lessons found.</StatePanel>}</section></>;
}

export function StudentLessonDetailsPage() {
  const { id } = useParams(); const { lessons, error } = useLessons(); const lesson = lessons?.find((item) => item.id === id);
  if (error) return <StatePanel>{error}</StatePanel>; if (!lessons) return <StatePanel>Loading lesson...</StatePanel>; if (!lesson) return <StatePanel>Lesson not found.</StatePanel>;
  return <><Link to="/student/lessons" className="student-back-link"><ChevronLeftIcon /> Back to lessons</Link><section className="student-panel student-detail"><div className="student-card-icon"><GraduationCapIcon /></div><h1>{lesson.subject}</h1><p>{lesson.specificTopic || 'No lesson topic has been added yet.'}</p><dl><div><dt>Tutor</dt><dd>{lesson.tutorName}</dd></div><div><dt>Date</dt><dd>{formatLessonDate(lesson.date)}</dd></div><div><dt>Time</dt><dd>{lesson.startTime} - {lesson.endTime}</dd></div><div><dt>Format</dt><dd>{lesson.format.replaceAll('_',' ')}</dd></div><div><dt>Status</dt><dd>{lesson.status}</dd></div></dl>{lesson.status === 'CONFIRMED' && <MeetingAccessButton bookingId={lesson.id} />}<p className="student-muted-note">For changes or communication with the tutor, please ask your parent.</p></section></>;
}

type StudentResource = { id: string; title: string; description?: string; url?: string };

export function StudentResourcesPage() {
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') ?? ''); const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<StudentResource[]>([]); const [supported, setSupported] = useState(false);
  useEffect(() => { apiRequest<{ resources: StudentResource[]; supported: boolean }>('/api/student/resources').then((res) => { setResources(res.data?.resources ?? []); setSupported(Boolean(res.data?.supported)); }).finally(() => setLoading(false)); }, []);
  const visible = resources.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
  return <><div className="student-page-heading"><div><h1>Learning Resources</h1><p>Materials shared to support your lessons will appear here.</p></div></div><div className="student-filter-row"><label><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources..." /></label><select aria-label="Subject filter"><option>All subjects</option></select><select aria-label="Resource type filter"><option>All types</option></select></div><section className="student-panel">{loading ? <StatePanel>Loading resources...</StatePanel> : !supported || !visible.length ? <StatePanel><BookIcon /><h2>No learning resources yet</h2><p>Your tutor can provide resources through your parent-managed learning arrangement.</p></StatePanel> : visible.map((r) => <div className="student-resource" key={r.id}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer"><strong>{r.title}</strong></a> : <strong>{r.title}</strong>}{r.description && <p>{r.description}</p>}</div>)}</section></>;
}

export function StudentProgressPage() {
  const [data, setData] = useState<StudentProgressSummary | null>(null); const [error, setError] = useState('');
  useEffect(() => { apiRequest<{ progress: StudentProgressSummary }>('/api/student/progress').then((res) => setData(res.data?.progress ?? null)).catch((err) => setError(err instanceof Error ? err.message : 'Could not load progress.')); }, []);
  if (error) return <StatePanel>{error}</StatePanel>; if (!data) return <StatePanel>Loading progress...</StatePanel>;
  return <><div className="student-page-heading"><div><h1>My Progress</h1><p>Track your learning journey and completed lessons.</p></div></div><div className="student-metric-grid"><article><BookIcon /><span>Overall progress</span><strong>{data.overallProgress}%</strong></article><article><CheckIcon /><span>Lessons completed</span><strong>{data.lessonsCompleted}</strong></article><article><CalendarIcon /><span>Total lessons</span><strong>{data.totalLessons}</strong></article></div><section className="student-panel"><header><h2>Subject progress</h2></header>{data.subjects.length ? data.subjects.map((item) => <div className="student-subject-progress" key={item.subject}><span><strong>{item.subject}</strong><small>{item.completedLessons} of {item.totalLessons} completed</small></span><div><i style={{ width: `${item.progress}%` }} /></div><b>{item.progress}%</b></div>) : <StatePanel>Progress will appear after lessons are completed.</StatePanel>}</section></>;
}

export function StudentNotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null); const [tab, setTab] = useState<'all'|'unread'|'read'>('all');
  const load = () => apiRequest<{ notifications: Notification[] }>('/api/notifications').then((res) => setItems(res.data?.notifications ?? []));
  useEffect(() => { void load(); }, []); const visible = (items ?? []).filter((item) => tab==='all' || (tab==='read' ? item.readAt : !item.readAt));
  return <><div className="student-page-heading"><div><h1>Notifications</h1><p>Important one-way updates about your lessons and learning.</p></div><button className="btn btn-secondary" onClick={() => apiRequest('/api/notifications/read-all',{method:'POST'}).then(load)}>Mark all as read</button></div><section className="student-panel"><div className="student-tabs">{(['all','unread','read'] as const).map((value)=><button key={value} className={tab===value?'active':''} onClick={()=>setTab(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>{items===null?<StatePanel>Loading notifications...</StatePanel>:visible.length?visible.map((item)=><button type="button" className={`student-notification ${item.readAt?'':'unread'}`} key={item.id} onClick={()=>apiRequest(`/api/notifications/${item.id}/read`,{method:'POST'}).then(load)}><BellIcon/><span><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></span></button>):<StatePanel>No {tab === 'all' ? '' : tab} notifications.</StatePanel>}</section></>;
}

export function StudentProfilePage() {
  const { user } = useAuth(); const { data, error } = useStudentOverview(); if (error) return <StatePanel>{error}</StatePanel>; if (!data) return <StatePanel>Loading profile...</StatePanel>;
  const student = data.student;
  return <><div className="student-profile-grid"><section className="student-panel student-profile-identity"><Avatar name={student.fullName} photoUrl={student.photoUrl} className="student-profile-avatar"/><div><h1>{student.fullName}</h1><span className="student-role-pill">Student</span><p><UserFieldIcon /> {student.loginId}</p><p><CalendarIcon /> Joined {formatLessonDate(data.memberSince)}</p></div></section><section className="student-panel"><header><h2>Learning Snapshot</h2></header><div className="student-snapshot"><div><BookIcon/><strong>{data.lessonsCompleted}</strong><span>Lessons completed</span></div><div><ChartIcon/><strong>{data.overallProgress}%</strong><span>Overall progress</span></div></div></section><section className="student-panel"><header><h2>Personal Information</h2></header><dl className="student-info-list"><div><dt>Full name</dt><dd>{student.fullName}</dd></div><div><dt>Age</dt><dd>{student.age ?? 'Not provided'}</dd></div><div><dt>Grade / Level</dt><dd>{student.grade ?? 'Not provided'}</dd></div><div><dt>Learning interests</dt><dd>{student.interests.join(', ') || 'Not provided'}</dd></div></dl></section><section className="student-panel"><header><h2>Account & Security</h2></header><dl className="student-info-list"><div><dt>Student ID</dt><dd>{student.loginId}</dd></div><div><dt>Account type</dt><dd>Student Account</dd></div><div><dt>Password</dt><dd>Managed by your parent</dd></div><div><dt>Parent account</dt><dd>{data.parentName}</dd></div></dl></section></div></>;
}

export function StudentSettingsPage() {
  const navigate = useNavigate();
  const [referralOpen, setReferralOpen] = useState(false);
  return <main className="student-settings-page"><header><button type="button" className="student-icon-button" onClick={()=>navigate('/student')} aria-label="Back to student dashboard"><ChevronLeftIcon/></button><div><h1>Settings</h1><p>Manage your preferences and find support.</p></div></header><div className="student-settings-grid"><section><UserFieldIcon/><div><h2>Account</h2><p>Your parent manages your profile details and password.</p><span><LockIcon/> Password managed by parent</span></div></section><section><LightbulbIcon/><div><h2>Preferences</h2><p>Choose how Mentora looks on this device.</p><span><ThemeToggle/> Appearance</span></div></section><section><ShieldCheckIcon/><div><h2>Privacy & Safety</h2><p>Your learning account is linked to and managed by your parent.</p><span><ShieldCheckIcon/> Protected student account</span></div></section><section><HelpCircleIcon/><div><h2>Support</h2><p>Ask your parent for account help or contact Mentora support.</p><a href="mailto:helpdesk@mentora.dev"><HelpCircleIcon/> Contact support</a></div></section><section><TrophyIcon/><div><h2>Invite Friends</h2><p>Share Mentora with friends and families. Rewards are not currently available.</p><button type="button" className="btn btn-secondary" onClick={()=>setReferralOpen(true)}>Share Mentora</button></div></section></div><LogoutButton className="btn btn-secondary student-settings-signout"><LogOutIcon/> Sign out</LogoutButton>{referralOpen&&<ReferralModal onClose={()=>setReferralOpen(false)}/>}</main>;
}
