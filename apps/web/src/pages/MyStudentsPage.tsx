import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Student, Booking, LearningGoal, Gender, SkillInterest, GoalCategory } from '@mentora/shared';
import { GENDERS, SKILL_INTERESTS, GOAL_CATEGORIES } from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { PhotoUploader } from '../components/PhotoUploader';
import { Modal } from '../components/Modal';
import { PasswordCriteria, passwordMeetsCriteria } from '../components/PasswordCriteria';
import {
  GraduationCapIcon,
  BookIcon,
  ChartIcon,
  StarIcon,
  DotsIcon,
  EditIcon,
  TargetIcon,
  TrashIcon,
  ChatIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  CheckIcon,
  UserFieldIcon,
  RobotIcon,
  CodeIcon,
  MicIcon,
  RocketIcon,
  TrophyIcon,
  XIcon,
  BoyIcon,
  GirlIcon,
  LockIcon,
} from '../components/Icons';

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

const GOAL_CATEGORY_META: Record<GoalCategory, { label: string; icon: ReactNode; tone: string }> = {
  MATH: { label: 'Math', icon: <TargetIcon />, tone: 'purple' },
  CODING: { label: 'Coding', icon: <CodeIcon />, tone: 'green' },
  READING: { label: 'Reading', icon: <BookIcon />, tone: 'orange' },
  SCIENCE: { label: 'Science', icon: <ChartIcon />, tone: 'blue' },
  SPEAKING: { label: 'Speaking', icon: <MicIcon />, tone: 'purple' },
  GENERAL: { label: 'General', icon: <StarIcon />, tone: 'blue' },
};

const STUDENT_AGES = Array.from({ length: 11 }, (_, i) => i + 8);

function progressMeta(progress: number | null): { tone: string; text: string } {
  if (progress === null) return { tone: 'neutral', text: 'Not yet assessed — set a starting point in Edit Profile.' };
  if (progress >= 70) return { tone: 'green', text: 'Good progress! Keep it up.' };
  if (progress >= 40) return { tone: 'orange', text: 'Making steady progress.' };
  return { tone: 'red', text: "Keep practicing. You're improving!" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function MyStudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [goals, setGoals] = useState<LearningGoal[] | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [passwordStudent, setPasswordStudent] = useState<Student | null>(null);
  const [goalModal, setGoalModal] = useState<{ mode: 'add' | 'edit'; goal: LearningGoal | null } | null>(null);
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students').then((r) => setStudents(r.data?.students ?? [])).catch(() => setStudents([]));
    apiRequest<{ bookings: Booking[] }>('/api/bookings').then((r) => setBookings(r.data?.bookings ?? [])).catch(() => setBookings([]));
    apiRequest<{ goals: LearningGoal[] }>('/api/learning-goals').then((r) => setGoals(r.data?.goals ?? [])).catch(() => setGoals([]));
  }, []);

  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id || !students) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    const timeout = setTimeout(() => setHighlightedId(null), 2000);
    return () => clearTimeout(timeout);
  }, [location.hash, students]);

  function handlePhotoChange(studentId: string, photoUrl: string | null) {
    setStudents((prev) => prev?.map((s) => (s.id === studentId ? { ...s, photoUrl } : s)) ?? prev);
  }

  async function handleRemove(student: Student) {
    setOpenMenuId(null);
    if (!window.confirm(`Remove ${student.fullName}? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/students/${student.id}`, { method: 'DELETE' });
      setStudents((prev) => prev?.filter((s) => s.id !== student.id) ?? prev);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not remove student. Please try again.');
    }
  }

  const nextSessionFor = (studentId: string): Booking | null => {
    if (!bookings) return null;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const upcoming = bookings
      .filter((b) => b.studentId === studentId && b.status === 'CONFIRMED' && new Date(b.date) >= startOfToday)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] ?? null;
  };

  const subjectsFor = (studentId: string): string[] => {
    if (!bookings) return [];
    return Array.from(new Set(bookings.filter((b) => b.studentId === studentId).map((b) => b.subject)));
  };

  const stats = useMemo(() => {
    const studentsCount = students?.length ?? 0;
    const now = new Date();
    const activeBookings = bookings?.filter(
      (b) => b.status === 'CONFIRMED' && new Date(b.date).getMonth() === now.getMonth() && new Date(b.date).getFullYear() === now.getFullYear(),
    ).length ?? 0;
    const withProgress = students?.filter((s) => s.overallProgress != null) ?? [];
    const avgProgress = withProgress.length > 0
      ? Math.round((withProgress.reduce((sum, s) => sum + (s.overallProgress ?? 0), 0) / withProgress.length) * 10) / 10
      : null;
    const subjectsCount = bookings ? new Set(bookings.map((b) => b.subject)).size : 0;
    return { studentsCount, activeBookings, avgProgress, subjectsCount };
  }, [students, bookings]);

  const visibleGoals = showAllGoals ? goals ?? [] : (goals ?? []).slice(0, 3);

  return (
    <div className="mystudents-page">
      <div className="mystudents-header">
        <div>
          <h1>My Children</h1>
          <p>Manage your children's profiles, learning goals and progress.</p>
        </div>
        <Link to="/onboarding/add-student" className="btn btn-primary">+ Add Child</Link>
      </div>

      <div className="mystudents-stats-grid">
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-blue"><GraduationCapIcon /></span>
          <div><strong>{stats.studentsCount}</strong><span>Children</span><em>Active profiles</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-green"><BookIcon /></span>
          <div><strong>{stats.activeBookings}</strong><span>Active Bookings</span><em>This month</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-purple"><ChartIcon /></span>
          <div><strong>{stats.avgProgress ?? '—'}{stats.avgProgress !== null ? '%' : ''}</strong><span>Avg. Progress</span><em>Across all children</em></div>
        </div>
        <div className="mystudents-stat-card">
          <span className="mystudents-stat-icon tone-orange"><StarIcon /></span>
          <div><strong>{stats.subjectsCount}</strong><span>Subjects</span><em>Being studied</em></div>
        </div>
      </div>

      {students === null ? null : students.length === 0 ? (
        <div className="mystudents-empty">
          <p>You haven't added a child yet.</p>
          <Link to="/onboarding/add-student" className="btn btn-primary">Add a Child <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <div className="mystudents-list">
          {students.map((student) => {
            const meta = progressMeta(student.overallProgress);
            const subjects = subjectsFor(student.id);
            const nextSession = nextSessionFor(student.id);

            return (
              <article key={student.id} id={student.id} className={student.id === highlightedId ? 'mystudents-card highlight' : 'mystudents-card'}>
                <button type="button" className="mystudents-menu-trigger" onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)} aria-label="Child actions">
                  <DotsIcon />
                </button>
                {openMenuId === student.id && (
                  <div className="mystudents-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => { setEditingStudent(student); setOpenMenuId(null); }}><EditIcon /> Edit Profile</button>
                    <a role="menuitem" href="#learning-goals" onClick={() => setOpenMenuId(null)}><TargetIcon /> Learning Goals</a>
                    <a role="menuitem" href="#learning-goals" onClick={() => setOpenMenuId(null)}><ChartIcon /> View Progress</a>
                    <Link role="menuitem" to="/dashboard/messages" onClick={() => setOpenMenuId(null)}><ChatIcon /> Message Tutors</Link>
                    <button type="button" role="menuitem" className="danger" onClick={() => handleRemove(student)}><TrashIcon /> Remove</button>
                  </div>
                )}

                <div className="mystudents-col mystudents-col-profile">
                  <PhotoUploader
                    name={student.fullName}
                    photoUrl={student.photoUrl}
                    uploadUrl={`/api/students/${student.id}/photo`}
                    deleteUrl={`/api/students/${student.id}/photo`}
                    onChange={(photoUrl) => handlePhotoChange(student.id, photoUrl)}
                    avatarClassName="mystudents-avatar"
                  />
                  <div className="mystudents-name-block">
                    <strong>{student.fullName}</strong>
                    {student.grade && <span className="mystudents-grade-pill">{student.grade}</span>}
                  </div>
                  <span className="mystudents-agegender">
                    {student.age ? `Age ${student.age}` : 'Age not set'} · {GENDER_LABELS[student.gender] ?? student.gender}
                  </span>
                  <span className="mystudents-login-id">Child ID: <strong>{student.loginId}</strong></span>
                  <div className="mystudents-card-actions">
                    <button type="button" className="mystudents-view-link" onClick={() => setEditingStudent(student)}>
                      View Full Profile <span aria-hidden="true">→</span>
                    </button>
                    <button type="button" className="mystudents-view-link" onClick={() => setPasswordStudent(student)}>
                      <LockIcon /> Reset Password
                    </button>
                  </div>
                </div>

                <div className="mystudents-col mystudents-col-progress">
                  <span className="mystudents-col-heading">Overall Progress</span>
                  <strong className={`mystudents-progress-value tone-${meta.tone}`}>
                    {student.overallProgress != null ? `${student.overallProgress}%` : '—'}
                  </strong>
                  <div className="mystudents-progress-bar">
                    <span className={`tone-${meta.tone}`} style={{ width: `${student.overallProgress ?? 0}%` }} />
                  </div>
                  <p className="mystudents-progress-note">{meta.text}</p>

                  <span className="mystudents-col-heading">Subjects ({subjects.length})</span>
                  {subjects.length > 0 ? (
                    <div className="mystudents-subject-tags">
                      {subjects.map((s) => <span key={s} className="disc-tag">{s}</span>)}
                    </div>
                  ) : (
                    <span className="mystudents-agegender">No subjects yet</span>
                  )}
                </div>

                <div className="mystudents-col mystudents-col-session">
                  <span className="mystudents-col-heading">Next Session</span>
                  {nextSession ? (
                    <>
                      <span className="mystudents-session-line"><CalendarIcon /> {formatDate(nextSession.date)}</span>
                      <span className="mystudents-session-line"><ClockIcon /> {nextSession.startTime} – {nextSession.endTime}</span>
                      <div className="mystudents-session-tutor">
                        <Avatar name={nextSession.tutorName} photoUrl={nextSession.tutorPhotoUrl} className="mystudents-session-avatar" />
                        <strong>{nextSession.tutorName}</strong>
                      </div>
                    </>
                  ) : (
                    <span className="mystudents-agegender">No upcoming sessions</span>
                  )}
                  <Link to="/dashboard/bookings" className="btn btn-secondary mystudents-session-btn">View Bookings</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {students && students.length > 0 && (
        <section className="dash-card mystudents-goals-card" id="learning-goals">
          <div className="tprofile-section-heading spread">
            <div>
              <h2 className="dash-goals-title">Learning Goals</h2>
              <p className="booking-section-hint">Set goals for your children and track their achievements.</p>
            </div>
            <div className="mystudents-goals-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setGoalModal({ mode: 'add', goal: null })}>+ Add Goal</button>
              {goals && goals.length > 3 && (
                <button type="button" className="mystudents-view-link" onClick={() => setShowAllGoals((v) => !v)}>
                  {showAllGoals ? 'Show less' : 'View All Goals'} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>

          {goals === null ? null : goals.length === 0 ? (
            <p className="mystudents-agegender">No learning goals yet. Add one to start tracking progress.</p>
          ) : (
            <div className="mystudents-goal-list">
              {visibleGoals.map((goal) => {
                const catMeta = GOAL_CATEGORY_META[goal.category] ?? GOAL_CATEGORY_META.GENERAL;
                return (
                  <button type="button" key={goal.id} className="mystudents-goal-row" onClick={() => setGoalModal({ mode: 'edit', goal })}>
                    <span className={`tprofile-badge tone-${catMeta.tone}`}>{catMeta.icon}</span>
                    <div className="mystudents-goal-info">
                      <strong>{goal.title}</strong>
                      <span>{goal.studentName}</span>
                    </div>
                    <div className="mystudents-goal-progress">
                      <div className="mystudents-progress-bar small"><span className="tone-purple" style={{ width: `${goal.progress}%` }} /></div>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="mystudents-goal-date">
                      <span>Target Date</span>
                      <strong><CalendarIcon /> {formatDate(goal.targetDate)}</strong>
                    </div>
                    <ChevronRightIcon />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {students && students.length > 0 && !bannerDismissed && (
        <div className="dash-sticky-banner">
          <span className="dash-sticky-icon"><TrophyIcon /></span>
          <div className="dash-sticky-copy">
            <strong>Every step counts!</strong>
            <span>Encourage your children and celebrate their progress.</span>
          </div>
          <Link to="/dashboard/tutors" className="btn btn-primary">Find More Tutors <span aria-hidden="true">→</span></Link>
          <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}>
            <XIcon />
          </button>
        </div>
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={(updated) => {
            setStudents((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
            setEditingStudent(null);
          }}
        />
      )}

      {goalModal && (
        <GoalModal
          mode={goalModal.mode}
          goal={goalModal.goal}
          students={students ?? []}
          onClose={() => setGoalModal(null)}
          onSaved={(goal) => {
            setGoals((prev) => {
              if (!prev) return [goal];
              const exists = prev.some((g) => g.id === goal.id);
              return exists ? prev.map((g) => (g.id === goal.id ? goal : g)) : [...prev, goal];
            });
            setGoalModal(null);
          }}
          onDeleted={(id) => {
            setGoals((prev) => prev?.filter((g) => g.id !== id) ?? prev);
            setGoalModal(null);
          }}
        />
      )}
      {passwordStudent && <ResetStudentPasswordModal student={passwordStudent} onClose={() => setPasswordStudent(null)} />}
    </div>
  );
}

function ResetStudentPasswordModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!passwordMeetsCriteria(password)) { setError('Use at least 8 characters with uppercase, lowercase, a number, and a special character.'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try { await apiRequest(`/api/students/${student.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }); setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not reset the password.'); }
    finally { setSubmitting(false); }
  }
  return <Modal title={`Reset ${student.fullName.split(' ')[0]}'s Password`} onClose={onClose}>
    {done ? (
      <div className="mystudents-password-form">
        <p className="booking-section-hint">{student.fullName.split(' ')[0]}'s password has been updated. Give them the new password to sign in.</p>
        <button type="button" className="btn btn-primary full" onClick={onClose}>Done</button>
      </div>
    ) : (
      <form onSubmit={submit} className="mystudents-password-form">
        <p>Child ID: <strong>{student.loginId}</strong></p>
        <label><span>New password</span><input type="password" value={password} onChange={(event)=>setPassword(event.target.value)} autoComplete="new-password" /></label>
        <PasswordCriteria password={password} />
        <label className={mismatch ? 'field-invalid' : ''}><span>Confirm password</span><input className={mismatch ? 'invalid' : ''} type="password" value={confirm} onChange={(event)=>setConfirm(event.target.value)} autoComplete="new-password" aria-invalid={mismatch} />{mismatch && <small>Passwords do not match</small>}</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary full" disabled={submitting}>{submitting && <span className="spinner" />}{submitting ? 'Updating...' : "Update Child's Password"}</button>
      </form>
    )}
  </Modal>;
}

function EditStudentModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: (s: Student) => void }) {
  const [fullName, setFullName] = useState(student.fullName);
  const [age, setAge] = useState(student.age ? String(student.age) : '');
  const [gender, setGender] = useState<Gender>(student.gender);
  const [grade, setGrade] = useState(student.grade ?? '');
  const [interests, setInterests] = useState<SkillInterest[]>(student.interests as SkillInterest[]);
  const [overallProgress, setOverallProgress] = useState(student.overallProgress != null ? String(student.overallProgress) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(interest: SkillInterest) {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ student: Student }>(`/api/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          age: age ? Number(age) : undefined,
          gender,
          grade: grade || undefined,
          interests,
          overallProgress: overallProgress !== '' ? Number(overallProgress) : undefined,
        }),
      });
      if (res.data?.student) onSaved(res.data.student);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit ${student.fullName.split(' ')[0]}'s Profile`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        <label className="field">
          <span>Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
        </label>

        <div className="mystudents-form-row">
          <label className="field">
            <span>Age</span>
            <select value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="">Not set</option>
              {STUDENT_AGES.map((a) => <option key={a} value={a}>{a} years old</option>)}
            </select>
          </label>

          <div className="field">
            <span>Gender</span>
            <div className="gender-options">
              {GENDERS.map((g) => (
                <button key={g} type="button" className={gender === g ? 'gender-option active' : 'gender-option'} onClick={() => setGender(g)}>
                  {GENDER_ICONS[g]} {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="field">
          <span>Grade / Level</span>
          <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="E.g. JSS 1, SS 2, Grade 10" />
        </label>

        <label className="field">
          <span>Overall progress (%)</span>
          <input type="number" min={0} max={100} value={overallProgress} onChange={(e) => setOverallProgress(e.target.value)} placeholder="Not yet assessed" />
        </label>

        <span className="field-label-standalone">Skill interests</span>
        <div className="interest-grid">
          {SKILL_INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              className={interests.includes(interest) ? 'interest-card active' : 'interest-card'}
              onClick={() => toggleInterest(interest)}
            >
              <span className="interest-icon">{SKILL_INTEREST_META[interest].icon}</span>
              <span className="interest-label">{SKILL_INTEREST_META[interest].label}</span>
              <span className="interest-checkbox" aria-hidden="true">{interests.includes(interest) && <CheckIcon />}</span>
            </button>
          ))}
        </div>

        {error && <p className="photo-uploader-error">{error}</p>}

        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </Modal>
  );
}

function GoalModal({
  mode,
  goal,
  students,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: 'add' | 'edit';
  goal: LearningGoal | null;
  students: Student[];
  onClose: () => void;
  onSaved: (g: LearningGoal) => void;
  onDeleted: (id: string) => void;
}) {
  const [studentId, setStudentId] = useState(goal?.studentId ?? students[0]?.id ?? '');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'GENERAL');
  const [targetDate, setTargetDate] = useState(goal ? goal.targetDate.slice(0, 10) : '');
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'add') {
        const res = await apiRequest<{ goal: LearningGoal }>('/api/learning-goals', {
          method: 'POST',
          body: JSON.stringify({ studentId, title, category, targetDate, progress }),
        });
        if (res.data?.goal) onSaved(res.data.goal);
      } else if (goal) {
        const res = await apiRequest<{ goal: LearningGoal }>(`/api/learning-goals/${goal.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, category, targetDate, progress }),
        });
        if (res.data?.goal) onSaved(res.data.goal);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    if (!window.confirm('Delete this learning goal?')) return;
    try {
      await apiRequest(`/api/learning-goals/${goal.id}`, { method: 'DELETE' });
      onDeleted(goal.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this goal.');
    }
  }

  return (
    <Modal title={mode === 'add' ? 'Add Learning Goal' : 'Edit Learning Goal'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mystudents-edit-form">
        {mode === 'add' && (
          <label className="field">
            <span>Child</span>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </label>
        )}

        <label className="field">
          <span>Goal title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Improve in Mathematics" required minLength={2} />
        </label>

        <div className="mystudents-form-row">
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
              {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{GOAL_CATEGORY_META[c].label}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Target date</span>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
          </label>
        </div>

        <label className="field">
          <span>Progress: {progress}%</span>
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
        </label>

        {error && <p className="photo-uploader-error">{error}</p>}

        <button type="submit" className="btn btn-primary full" disabled={submitting}>{submitting ? 'Saving…' : mode === 'add' ? 'Add Goal' : 'Save Changes'}</button>
        {mode === 'edit' && (
          <button type="button" className="mystudents-delete-goal" onClick={handleDelete}>
            <TrashIcon /> Delete Goal
          </button>
        )}
      </form>
    </Modal>
  );
}
