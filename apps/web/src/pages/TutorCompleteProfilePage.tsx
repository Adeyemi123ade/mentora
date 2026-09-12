import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TutorProfileDto } from '@mentora/shared';
import {
  TUTOR_COUNTRIES,
  TUTOR_LANGUAGES,
  TUTOR_SUBJECTS,
  TUTOR_GRADE_LEVELS,
  TUTOR_EXPERIENCE_OPTIONS,
  TUTOR_QUALIFICATION_OPTIONS,
  TUTOR_SESSION_DURATIONS,
} from '@mentora/shared';
import { apiRequest, ApiError } from '../lib/api';
import { MultiSelectField } from '../components/MultiSelectField';
import { DocumentUploader } from '../components/DocumentUploader';
import tutorOnboardingIllustration from '../assets/tutor-onboarding.png';
import {
  CameraIcon,
  ShieldCheckIcon,
  GlobeIcon,
  PinIcon,
  BookIcon,
  UsersIcon,
  SlidersIcon,
  GraduationCapIcon,
  VideoIcon,
  UserFieldIcon,
  ClockIcon,
  WalletIcon,
  LightbulbIcon,
  CheckIcon,
  ChevronLeftIcon,
} from '../components/Icons';

const STEP_NAV = [
  { key: 'basic', label: 'Basic Information', icon: UserFieldIcon },
  { key: 'expertise', label: 'Expertise', icon: GraduationCapIcon },
  { key: 'preferences', label: 'Teaching Preferences', icon: SlidersIcon },
  { key: 'pricing', label: 'Pricing', icon: WalletIcon },
] as const;

const REQUIRED_FIELD_COUNT = 13;

const REQUIRED_FIELDS: { key: string; section: string; message: string }[] = [
  { key: 'photoUrl', section: 'basic', message: 'Please add a profile photo.' },
  { key: 'professionalTitle', section: 'basic', message: 'Please enter your professional title.' },
  { key: 'bio', section: 'basic', message: 'Please write a short bio.' },
  { key: 'country', section: 'location', message: 'Please select your country.' },
  { key: 'city', section: 'location', message: 'Please enter your city.' },
  { key: 'languages', section: 'location', message: 'Please select at least one language.' },
  { key: 'subjects', section: 'expertise', message: 'Please select at least one subject or skill.' },
  { key: 'gradeLevels', section: 'expertise', message: 'Please select at least one grade level.' },
  { key: 'yearsExperience', section: 'expertise', message: 'Please select your years of experience.' },
  { key: 'qualification', section: 'expertise', message: 'Please select your highest qualification.' },
  { key: 'teachingFormats', section: 'preferences', message: 'Please select at least one teaching format.' },
  { key: 'sessionDurationMinutes', section: 'preferences', message: 'Please select a session duration.' },
  { key: 'sessionPrice', section: 'pricing', message: 'Please enter a valid session price.' },
];

export function TutorCompleteProfilePage({ editMode = false }: { editMode?: boolean }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TutorProfileDto | null>(null);
  const [saving, setSaving] = useState<'idle' | 'later' | 'continue'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [professionalTitle, setProfessionalTitle] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [teachingFormats, setTeachingFormats] = useState<string[]>([]);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
  const [sessionPrice, setSessionPrice] = useState('');

  const basicRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const expertiseRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const refs: Record<string, RefObject<HTMLDivElement>> = {
    basic: basicRef,
    location: locationRef,
    expertise: expertiseRef,
    preferences: preferencesRef,
    pricing: pricingRef,
  };

  useEffect(() => {
    apiRequest<{ profile: TutorProfileDto }>('/api/tutor-profile/me')
      .then((res) => {
        const p = res.data?.profile;
        if (!p) return;
        if (!editMode && p.verificationStatus !== 'NOT_SUBMITTED') {
          navigate('/tutor');
          return;
        }
        setProfile(p);
        setProfessionalTitle(p.professionalTitle ?? '');
        setBio(p.bio ?? '');
        setCountry(p.country ?? '');
        setCity(p.city ?? '');
        setLanguages(p.languages);
        setSubjects(p.subjects);
        setGradeLevels(p.gradeLevels);
        setYearsExperience(p.yearsExperience ?? '');
        setQualification(p.qualification ?? '');
        setTeachingFormats(p.teachingFormats);
        setSessionDurationMinutes(p.sessionDurationMinutes ? String(p.sessionDurationMinutes) : '');
        setSessionPrice(p.sessionPrice !== null ? String(p.sessionPrice) : '');
      })
      .catch(() => {});
  }, [navigate]);

  const completionPercent = useMemo(() => {
    const filled = [
      profile?.photoUrl,
      professionalTitle.trim(),
      bio.trim(),
      country,
      city.trim(),
      languages.length > 0,
      subjects.length > 0,
      gradeLevels.length > 0,
      yearsExperience,
      qualification,
      teachingFormats.length > 0,
      sessionDurationMinutes,
      sessionPrice !== '',
    ].filter(Boolean).length;
    return Math.round((filled / REQUIRED_FIELD_COUNT) * 100);
  }, [profile, professionalTitle, bio, country, city, languages, subjects, gradeLevels, yearsExperience, qualification, teachingFormats, sessionDurationMinutes, sessionPrice]);

  function toggleFormat(format: string) {
    setTeachingFormats((prev) => (prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]));
  }

  function validateRequired(): Record<string, string> {
    const errors: Record<string, string> = {};
    const values: Record<string, unknown> = {
      photoUrl: profile?.photoUrl,
      professionalTitle: professionalTitle.trim(),
      bio: bio.trim(),
      country,
      city: city.trim(),
      languages: languages.length > 0,
      subjects: subjects.length > 0,
      gradeLevels: gradeLevels.length > 0,
      yearsExperience,
      qualification,
      teachingFormats: teachingFormats.length > 0,
      sessionDurationMinutes,
      sessionPrice: sessionPrice !== '',
    };
    for (const field of REQUIRED_FIELDS) {
      if (!values[field.key]) errors[field.key] = field.message;
    }
    const priceNum = Number(sessionPrice);
    if (sessionPrice !== '' && (!Number.isFinite(priceNum) || priceNum <= 0)) {
      errors.sessionPrice = 'Please enter a valid session price.';
    }
    return errors;
  }

  async function save(mode: 'later' | 'continue') {
    if (mode === 'continue') {
      const errors = validateRequired();
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setError('Please complete all required fields highlighted below before continuing.');
        const firstSection = REQUIRED_FIELDS.find((f) => errors[f.key])?.section;
        if (firstSection) refs[firstSection].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } else {
      setFieldErrors({});
    }

    setSaving(mode);
    setError(null);
    try {
      await apiRequest('/api/tutor-profile/me', {
        method: 'PATCH',
        body: JSON.stringify({
          professionalTitle: professionalTitle.trim() || undefined,
          bio: bio.trim() || undefined,
          country: country || undefined,
          city: city.trim() || undefined,
          languages,
          subjects,
          gradeLevels,
          yearsExperience: yearsExperience || undefined,
          qualification: qualification || undefined,
          teachingFormats,
          sessionDurationMinutes: sessionDurationMinutes ? Number(sessionDurationMinutes) : undefined,
          sessionPrice: sessionPrice !== '' ? Number(sessionPrice) : undefined,
          markProfileCompleted: mode === 'continue' && !editMode,
        }),
      });
      navigate(editMode ? '/tutor' : mode === 'continue' ? '/onboarding/tutor-verification' : '/tutor');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setSaving('idle');
    }
  }

  return (
    <div className="tutor-onb-page">
      <header className="tutor-onb-topbar">
        <div className="dash-brand"><span>Mentora</span></div>
        {editMode ? (
          <button type="button" className="tprofile-back" onClick={() => navigate('/tutor')}><ChevronLeftIcon /> Back to dashboard</button>
        ) : (
          <div className="tutor-onb-stepper">
            <span className="tutor-onb-step done"><CheckIcon /> Email verified</span>
            <span className="tutor-onb-step-line" />
            <span className="tutor-onb-step active"><span className="tutor-onb-step-num">2</span> Complete Profile</span>
            <span className="tutor-onb-step-line" />
            <span className="tutor-onb-step upcoming"><span className="tutor-onb-step-num">3</span> Verification</span>
          </div>
        )}
      </header>

      <div className="tutor-onb-layout">
        <aside className="tutor-onb-sidebar">
          <span className="tutor-onb-badge">{editMode ? 'Your profile' : 'Almost there!'}</span>
          <h1>{editMode ? 'Edit your tutor profile' : "Let's build your tutor profile"}</h1>
          <p>{editMode ? 'Keep your profile up to date to attract more students.' : 'Complete your profile to help parents and students learn more about you.'}</p>

          <div className="tutor-onb-tip">
            <ShieldCheckIcon />
            <div>
              <strong>Your information is safe with us.</strong>
              <span>We use enterprise-grade encryption to protect your data and documents.</span>
            </div>
          </div>

          <img src={tutorOnboardingIllustration} alt="" aria-hidden="true" className="tutor-onb-illustration" />

          <div className="tutor-onb-progress-card">
            <div className="tutor-onb-progress-head">
              <span>Profile completion</span>
              <strong>{completionPercent}%</strong>
            </div>
            <div className="tutor-onb-progress-bar"><span style={{ width: `${completionPercent}%` }} /></div>
            <p>Complete all sections to submit for verification.</p>
          </div>

          <nav className="tutor-onb-step-nav">
            {STEP_NAV.map((step) => {
              const Icon = step.icon;
              return (
                <button key={step.key} type="button" onClick={() => refs[step.key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  <Icon /> {step.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="tutor-onb-main">
          <section className="dash-card" ref={basicRef}>
            <h2>Profile picture</h2>
            <p className="booking-section-hint">Add a clear photo. This helps build trust with parents and students.</p>
            <div className="tutor-onb-photo-row">
              <DocumentUploader
                kind="photo"
                label="Upload photo"
                hint="JPG, PNG or WebP (Max. 5MB)"
                fileUrl={profile?.photoUrl ?? null}
                icon={<CameraIcon />}
                onChange={(p) => setProfile(p)}
                invalid={Boolean(fieldErrors.photoUrl)}
                invalidMessage={fieldErrors.photoUrl}
                required
              />
            </div>

            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.professionalTitle ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Professional title <span className="req" aria-hidden="true">*</span></label>
                <input type="text" placeholder="e.g. Mathematics Tutor, Physics Teacher" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} maxLength={160} aria-invalid={Boolean(fieldErrors.professionalTitle)} />
                {fieldErrors.professionalTitle && <span className="tutor-onb-error-text" role="alert">{fieldErrors.professionalTitle}</span>}
              </div>
            </div>

            <div className={`tutor-onb-field ${fieldErrors.bio ? 'tutor-onb-field-invalid' : ''}`}>
              <label className="tutor-onb-label">Short bio <span className="req" aria-hidden="true">*</span></label>
              <textarea
                placeholder="Tell students and parents a little about yourself, your teaching style and experience..."
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                rows={4}
                aria-invalid={Boolean(fieldErrors.bio)}
              />
              {fieldErrors.bio && <span className="tutor-onb-error-text" role="alert">{fieldErrors.bio}</span>}
              <span className="tutor-onb-char-count">{bio.length}/300</span>
            </div>
          </section>

          <section className="dash-card" ref={locationRef}>
            <h2>Location &amp; Languages</h2>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.country ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Country <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-select-with-icon">
                  <GlobeIcon />
                  <select value={country} onChange={(e) => setCountry(e.target.value)} aria-invalid={Boolean(fieldErrors.country)}>
                    <option value="">Select your country</option>
                    {TUTOR_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {fieldErrors.country && <span className="tutor-onb-error-text" role="alert">{fieldErrors.country}</span>}
              </div>
              <div className={`tutor-onb-field ${fieldErrors.city ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">City <span className="req" aria-hidden="true">*</span></label>
                <div className="tutor-onb-select-with-icon">
                  <PinIcon />
                  <input type="text" placeholder="Enter your city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} aria-invalid={Boolean(fieldErrors.city)} />
                </div>
                {fieldErrors.city && <span className="tutor-onb-error-text" role="alert">{fieldErrors.city}</span>}
              </div>
            </div>

            <MultiSelectField
              label="Languages you speak"
              hint="Select all that apply"
              icon={<GlobeIcon />}
              options={TUTOR_LANGUAGES}
              selected={languages}
              onChange={setLanguages}
              placeholder="Select languages"
              required
              error={fieldErrors.languages}
            />
          </section>

          <section className="dash-card" ref={expertiseRef}>
            <h2>Expertise</h2>
            <div className="tutor-onb-grid-2">
              <MultiSelectField
                label="Subjects / Skills"
                hint="Select the subjects or skills you can teach"
                icon={<BookIcon />}
                options={TUTOR_SUBJECTS}
                selected={subjects}
                onChange={setSubjects}
                placeholder="Select subjects / skills"
                required
                error={fieldErrors.subjects}
              />
              <MultiSelectField
                label="Student age / Grade levels"
                hint="Select the age range or grade levels you teach"
                icon={<UsersIcon />}
                options={TUTOR_GRADE_LEVELS}
                selected={gradeLevels}
                onChange={setGradeLevels}
                placeholder="Select age / grade levels"
                required
                error={fieldErrors.gradeLevels}
              />
            </div>

            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.yearsExperience ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Years of experience <span className="req" aria-hidden="true">*</span></label>
                <p className="booking-section-hint">Total years of teaching experience</p>
                <div className="tutor-onb-select-with-icon">
                  <SlidersIcon />
                  <select value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} aria-invalid={Boolean(fieldErrors.yearsExperience)}>
                    <option value="">Select experience</option>
                    {TUTOR_EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {fieldErrors.yearsExperience && <span className="tutor-onb-error-text" role="alert">{fieldErrors.yearsExperience}</span>}
              </div>
              <div className={`tutor-onb-field ${fieldErrors.qualification ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Highest qualification <span className="req" aria-hidden="true">*</span></label>
                <p className="booking-section-hint">Your highest educational qualification</p>
                <div className="tutor-onb-select-with-icon">
                  <GraduationCapIcon />
                  <select value={qualification} onChange={(e) => setQualification(e.target.value)} aria-invalid={Boolean(fieldErrors.qualification)}>
                    <option value="">Select qualification</option>
                    {TUTOR_QUALIFICATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {fieldErrors.qualification && <span className="tutor-onb-error-text" role="alert">{fieldErrors.qualification}</span>}
              </div>
            </div>
          </section>

          <section className="dash-card" ref={preferencesRef}>
            <h2>Teaching preferences</h2>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.teachingFormats ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Teaching format <span className="req" aria-hidden="true">*</span></label>
                <p className="booking-section-hint">How do you prefer to teach?</p>
                <div className="tutor-onb-format-row">
                  <button type="button" className={teachingFormats.includes('ONLINE') ? 'tutor-onb-format-card active' : 'tutor-onb-format-card'} onClick={() => toggleFormat('ONLINE')}>
                    <VideoIcon />
                    <strong>Online</strong>
                    <span>Teach students virtually</span>
                  </button>
                  <button type="button" className={teachingFormats.includes('IN_PERSON') ? 'tutor-onb-format-card active' : 'tutor-onb-format-card'} onClick={() => toggleFormat('IN_PERSON')}>
                    <UserFieldIcon />
                    <strong>In-person</strong>
                    <span>Teach students face-to-face</span>
                  </button>
                </div>
                {fieldErrors.teachingFormats && <span className="tutor-onb-error-text" role="alert">{fieldErrors.teachingFormats}</span>}
              </div>
              <div className={`tutor-onb-field ${fieldErrors.sessionDurationMinutes ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Session duration <span className="req" aria-hidden="true">*</span></label>
                <p className="booking-section-hint">Default length of your sessions</p>
                <div className="tutor-onb-select-with-icon">
                  <ClockIcon />
                  <select value={sessionDurationMinutes} onChange={(e) => setSessionDurationMinutes(e.target.value)} aria-invalid={Boolean(fieldErrors.sessionDurationMinutes)}>
                    <option value="">Select duration</option>
                    {TUTOR_SESSION_DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <span className="tutor-onb-inline-hint"><LightbulbIcon /> You can adjust this later in Settings.</span>
                {fieldErrors.sessionDurationMinutes && <span className="tutor-onb-error-text" role="alert">{fieldErrors.sessionDurationMinutes}</span>}
              </div>
            </div>
          </section>

          <section className="dash-card" ref={pricingRef}>
            <h2>Pricing</h2>
            <div className="tutor-onb-grid-2">
              <div className={`tutor-onb-field ${fieldErrors.sessionPrice ? 'tutor-onb-field-invalid' : ''}`}>
                <label className="tutor-onb-label">Session price <span className="req" aria-hidden="true">*</span></label>
                <p className="booking-section-hint">Set your fee for a single session</p>
                <div className="tutor-onb-price-row">
                  <span className="tutor-onb-currency">₦ NGN</span>
                  <input type="number" min={0} step={100} placeholder="0.00" value={sessionPrice} onChange={(e) => setSessionPrice(e.target.value)} aria-invalid={Boolean(fieldErrors.sessionPrice)} />
                </div>
                <span className="tutor-onb-inline-hint">You can change this anytime.</span>
                {fieldErrors.sessionPrice && <span className="tutor-onb-error-text" role="alert">{fieldErrors.sessionPrice}</span>}
              </div>
              <div className="tutor-onb-price-tip">
                <LightbulbIcon />
                <span>Tip: Research shows tutors with clear pricing get more booking requests.</span>
              </div>
            </div>
          </section>

          {error && <p className="photo-uploader-error">{error}</p>}

          <div className="tutor-onb-actions">
            {editMode ? (
              <button type="button" className="btn btn-primary full" disabled={saving !== 'idle'} onClick={() => save('continue')}>
                {saving === 'continue' && <span className="spinner" aria-hidden="true" />}
                {saving === 'continue' ? 'Saving…' : 'Save Changes'}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" disabled={saving !== 'idle'} onClick={() => save('later')}>
                  {saving === 'later' && <span className="spinner" aria-hidden="true" />}
                  {saving === 'later' ? 'Saving…' : <><ChevronLeftIcon /> Save &amp; continue later</>}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving !== 'idle'} onClick={() => save('continue')}>
                  {saving === 'continue' && <span className="spinner" aria-hidden="true" />}
                  {saving === 'continue' ? 'Saving…' : 'Continue to verification'}
                </button>
              </>
            )}
          </div>
          <p className="tutor-onb-footnote"><ShieldCheckIcon /> You can review and edit this information anytime.</p>
        </div>
      </div>
    </div>
  );
}
