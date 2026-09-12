import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Student, SavedTutor, PublicTutorDto } from '@mentora/shared';
import { apiRequest } from '../lib/api';
import { CATEGORY_LABELS } from '../data/tutors';
import { adaptPublicTutor } from '../lib/tutorAdapter';
import { InitialsAvatar } from '../components/Avatar';
import { ComingSoonModal } from '../components/ComingSoonModal';
import type { CategoryKey, Tutor, TutorType, Availability, SessionType } from '../data/tutors';
import {
  SearchIcon,
  HeartIcon,
  StarIcon,
  CheckIcon,
  GraduationCapIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersIcon,
  GridIcon,
  SparkleIcon,
  XIcon,
  RobotIcon,
  CodeIcon,
  ChartIcon,
  MicIcon,
  MathIcon,
  BriefcaseIcon,
} from '../components/Icons';

const CATEGORIES: { key: CategoryKey; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: 'ai', label: CATEGORY_LABELS.ai, icon: RobotIcon },
  { key: 'coding', label: CATEGORY_LABELS.coding, icon: CodeIcon },
  { key: 'data', label: CATEGORY_LABELS.data, icon: ChartIcon },
  { key: 'speaking', label: CATEGORY_LABELS.speaking, icon: MicIcon },
  { key: 'math', label: CATEGORY_LABELS.math, icon: MathIcon },
  { key: 'business', label: CATEGORY_LABELS.business, icon: BriefcaseIcon },
];

type SortKey = 'best' | 'rating' | 'priceLow' | 'priceHigh' | 'experience';

type FilterState = {
  tutorTypes: TutorType[];
  maxPrice: number;
  experience: ('1-3' | '4-7' | '8+')[];
  availability: Availability[];
  sessionTypes: SessionType[];
  skill: string;
  language: string;
};

const DEFAULT_FILTERS: FilterState = {
  tutorTypes: [],
  maxPrice: 20000,
  experience: [],
  availability: [],
  sessionTypes: [],
  skill: '',
  language: '',
};

const PAGE_SIZE = 6;

function experienceBucket(years: number): '1-3' | '4-7' | '8+' {
  if (years >= 8) return '8+';
  if (years >= 4) return '4-7';
  return '1-3';
}

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function TutorCard({ tutor, saved, onToggleSave }: { tutor: Tutor; saved: boolean; onToggleSave: () => void }) {
  return (
    <article className="disc-tutor-card">
      <div className="disc-tutor-top">
        {tutor.photo ? (
          <img src={tutor.photo} alt="" aria-hidden="true" className="disc-tutor-photo" />
        ) : (
          <InitialsAvatar name={tutor.name} className="disc-tutor-photo" />
        )}
        <div className="disc-tutor-top-right">
          <span className={tutor.status === 'Online' ? 'dash-status-pill online' : 'dash-status-pill busy'}>{tutor.status}</span>
          <button
            type="button"
            className={saved ? 'disc-tutor-favorite active' : 'disc-tutor-favorite'}
            aria-label={saved ? `Remove ${tutor.name} from saved tutors` : `Save ${tutor.name}`}
            aria-pressed={saved}
            onClick={onToggleSave}
          >
            <HeartIcon />
          </button>
        </div>
      </div>

      <h3>
        {tutor.name} {tutor.verified && <CheckIcon className="dash-verified-icon" />}
      </h3>
      <p className="disc-tutor-title">{tutor.title}</p>
      <p className="disc-tutor-experience">{tutor.experienceYears}+ years experience</p>

      <div className="dash-tutor-meta">
        <StarIcon className="dash-tutor-rating-icon" />
        {tutor.reviews > 0 ? <><span>{tutor.rating}</span><span className="dash-tutor-reviews">({tutor.reviews} reviews)</span></> : <span className="dash-tutor-reviews">No reviews yet</span>}
      </div>

      <div className="disc-tutor-tags">
        {tutor.tags.map((tag) => (
          <span key={tag} className="disc-tag">{tag}</span>
        ))}
      </div>

      <p className="disc-tutor-line"><GraduationCapIcon /> {tutor.education}</p>
      <p className="disc-tutor-line"><ClockIcon /> {tutor.availabilityLabel}</p>

      <div className="disc-tutor-footer">
        <span className="disc-tutor-price">From ₦{tutor.price.toLocaleString()} / session</span>
        <Link to={`/dashboard/tutors/${tutor.id}`} className="btn btn-secondary">View Profile</Link>
      </div>
    </article>
  );
}

export function DiscoveryPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [students, setStudents] = useState<Student[] | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [category, setCategory] = useState<'all' | CategoryKey>('all');
  const [sort, setSort] = useState<SortKey>('best');
  const [page, setPage] = useState(1);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [realTutors, setRealTutors] = useState<PublicTutorDto[] | null>(null);

  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students')
      .then((res) => {
        const list = res.data?.students ?? [];
        setStudents(list);
        if (list.length > 0) setActiveStudentId(list[0].id);
      })
      .catch(() => setStudents([]));
    apiRequest<{ saved: SavedTutor[] }>('/api/saved-tutors')
      .then((res) => setSavedIds(new Set((res.data?.saved ?? []).map((s) => s.tutorId))))
      .catch(() => {});
    apiRequest<{ tutors: PublicTutorDto[] }>('/api/tutors')
      .then((res) => setRealTutors(res.data?.tutors ?? []))
      .catch(() => setRealTutors([]));
  }, []);

  const allTutors = useMemo(() => (realTutors ?? []).map(adaptPublicTutor), [realTutors]);
  const allSkills = useMemo(() => Array.from(new Set(allTutors.flatMap((t) => t.tags))).sort(), [allTutors]);

  const activeStudent = students?.find((s) => s.id === activeStudentId) ?? null;
  const studentFirstName = activeStudent?.fullName.split(' ')[0] ?? null;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = allTutors.filter((tutor) => {
      if (term && !`${tutor.name} ${tutor.title} ${tutor.tags.join(' ')}`.toLowerCase().includes(term)) return false;
      if (category !== 'all' && tutor.category !== category) return false;
      if (appliedFilters.tutorTypes.length > 0 && !appliedFilters.tutorTypes.includes(tutor.type)) return false;
      if (tutor.price > appliedFilters.maxPrice) return false;
      if (appliedFilters.experience.length > 0 && !appliedFilters.experience.includes(experienceBucket(tutor.experienceYears))) return false;
      if (appliedFilters.availability.length > 0 && !appliedFilters.availability.includes(tutor.availability)) return false;
      if (appliedFilters.sessionTypes.length > 0 && !appliedFilters.sessionTypes.some((s) => tutor.sessionTypes.includes(s))) return false;
      if (appliedFilters.skill && !tutor.tags.includes(appliedFilters.skill)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'priceLow') return a.price - b.price;
      if (sort === 'priceHigh') return b.price - a.price;
      if (sort === 'experience') return b.experienceYears - a.experienceYears;
      return b.rating * b.reviews - a.rating * a.reviews;
    });

    return list;
  }, [allTutors, searchTerm, category, appliedFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function runSearch() {
    setSearchTerm(searchInput);
    setPage(1);
  }

  function selectCategory(key: 'all' | CategoryKey) {
    setCategory(key);
    setPage(1);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setPage(1);
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function toggleSave(tutor: Tutor) {
    const alreadySaved = savedIds.has(tutor.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(tutor.id);
      else next.add(tutor.id);
      return next;
    });

    const request = alreadySaved
      ? apiRequest(`/api/saved-tutors/${tutor.id}`, { method: 'DELETE' })
      : apiRequest('/api/saved-tutors', { method: 'POST', body: JSON.stringify({ tutorId: tutor.id }) });

    request.catch(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(tutor.id);
        else next.delete(tutor.id);
        return next;
      });
    });
  }

  // A tutor is selected for a child profile, never for the signed-in parent.
  const headerName = studentFirstName;

  return (
    <>
      <section className="disc-header">
        <div>
          <h1>
            Find the right tutor{headerName ? (
              <>
                {' '}for{' '}
                {students && students.length > 1 ? (
                  <span className="disc-student-picker">
                    <button type="button" className="disc-student-picker-btn" onClick={() => setStudentMenuOpen((v) => !v)}>
                      <span className="disc-student-name">{headerName}</span>
                      <ChevronDownIcon />
                    </button>
                    {studentMenuOpen && (
                      <div className="disc-student-menu" role="menu">
                        {students.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="menuitem"
                            className={s.id === activeStudentId ? 'active' : ''}
                            onClick={() => {
                              setActiveStudentId(s.id);
                              setStudentMenuOpen(false);
                            }}
                          >
                            {s.fullName}
                          </button>
                        ))}
                      </div>
                    )}
                  </span>
                ) : (
                  <span className="disc-student-name">{headerName}</span>
                )}
              </>
            ) : null}
          </h1>
          <p>
            {activeStudent
              ? 'Search, compare and connect with verified tutors.'
              : 'Add a child profile to receive personalized tutor recommendations.'}
          </p>
        </div>
        <Link to="/dashboard/saved" className="btn btn-secondary disc-saved-link">
          <HeartIcon /> Saved Tutors{savedIds.size > 0 ? ` (${savedIds.size})` : ''}
        </Link>
      </section>

      <div className="disc-searchbar">
        <label className="disc-search-input">
          <SearchIcon />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search by subject, skill or tutor name..."
            aria-label="Search tutors"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={runSearch}>Search</button>
      </div>

      <div className="disc-categories-row">
        <div className="disc-categories" ref={pillsRef}>
          <button
            type="button"
            className={category === 'all' ? 'disc-category-pill active' : 'disc-category-pill'}
            onClick={() => selectCategory('all')}
          >
            <GridIcon /> All Categories
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                type="button"
                className={category === c.key ? 'disc-category-pill active' : 'disc-category-pill'}
                onClick={() => selectCategory(c.key)}
              >
                <Icon /> {c.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="disc-categories-scroll"
          aria-label="Scroll categories"
          onClick={() => pillsRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="disc-layout">
        <aside className="disc-filters">
          <div className="disc-filters-heading">
            <h2>Filters</h2>
            <button type="button" onClick={resetFilters}>Reset</button>
          </div>

          <div className="disc-filter-group">
            <label htmlFor="disc-skill">Subject / Skill</label>
            <select
              id="disc-skill"
              value={draftFilters.skill}
              onChange={(e) => setDraftFilters((f) => ({ ...f, skill: e.target.value }))}
            >
              <option value="">Select subject or skill</option>
              {allSkills.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          <div className="disc-filter-group">
            <span className="disc-filter-label">Tutor Type</span>
            <label className="disc-checkbox">
              <input type="checkbox" checked={draftFilters.tutorTypes.length === 0} onChange={() => setDraftFilters((f) => ({ ...f, tutorTypes: [] }))} />
              All Tutor Types
            </label>
            {([['professional', 'Professional Tutor'], ['university', 'University Student'], ['expert', 'Industry Expert']] as [TutorType, string][]).map(([value, label]) => (
              <label className="disc-checkbox" key={value}>
                <input
                  type="checkbox"
                  checked={draftFilters.tutorTypes.includes(value)}
                  onChange={() => setDraftFilters((f) => ({ ...f, tutorTypes: toggleInArray(f.tutorTypes, value) }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="disc-filter-group">
            <span className="disc-filter-label">Price Range (per session)</span>
            <input
              type="range"
              min={2000}
              max={20000}
              step={500}
              value={draftFilters.maxPrice}
              onChange={(e) => setDraftFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))}
              className="disc-price-slider"
              aria-label="Maximum price per session"
            />
            <div className="disc-price-labels">
              <span>₦2,000</span>
              <span>{draftFilters.maxPrice >= 20000 ? '₦20,000+' : `₦${draftFilters.maxPrice.toLocaleString()}`}</span>
            </div>
          </div>

          <div className="disc-filter-group">
            <span className="disc-filter-label">Experience</span>
            <label className="disc-checkbox">
              <input type="checkbox" checked={draftFilters.experience.length === 0} onChange={() => setDraftFilters((f) => ({ ...f, experience: [] }))} />
              All Experience
            </label>
            {([['1-3', '1 – 3 years'], ['4-7', '4 – 7 years'], ['8+', '8+ years']] as ['1-3' | '4-7' | '8+', string][]).map(([value, label]) => (
              <label className="disc-checkbox" key={value}>
                <input
                  type="checkbox"
                  checked={draftFilters.experience.includes(value)}
                  onChange={() => setDraftFilters((f) => ({ ...f, experience: toggleInArray(f.experience, value) }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="disc-filter-group">
            <span className="disc-filter-label">Availability</span>
            {([['now', 'Available Now'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends']] as [Availability, string][]).map(([value, label]) => (
              <label className="disc-checkbox" key={value}>
                <input
                  type="checkbox"
                  checked={draftFilters.availability.includes(value)}
                  onChange={() => setDraftFilters((f) => ({ ...f, availability: toggleInArray(f.availability, value) }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="disc-filter-group">
            <span className="disc-filter-label">Session Type</span>
            {([['online', 'Online'], ['in-person', 'In-person']] as [SessionType, string][]).map(([value, label]) => (
              <label className="disc-checkbox" key={value}>
                <input
                  type="checkbox"
                  checked={draftFilters.sessionTypes.includes(value)}
                  onChange={() => setDraftFilters((f) => ({ ...f, sessionTypes: toggleInArray(f.sessionTypes, value) }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="disc-filter-group">
            <label htmlFor="disc-language">Language</label>
            <select
              id="disc-language"
              value={draftFilters.language}
              onChange={(e) => setDraftFilters((f) => ({ ...f, language: e.target.value }))}
            >
              <option value="">Select language</option>
              <option value="English">English</option>
              <option value="Yoruba">Yoruba</option>
              <option value="Hausa">Hausa</option>
              <option value="Igbo">Igbo</option>
              <option value="French">French</option>
            </select>
          </div>

          <button type="button" className="btn btn-primary full" onClick={applyFilters}>Apply Filters</button>
          <button type="button" className="btn btn-secondary full disc-more-filters">
            <SlidersIcon /> More Filters
          </button>
        </aside>

        <div className="disc-results">
          <div className="disc-results-heading">
            <span>{filtered.length} tutor{filtered.length === 1 ? '' : 's'} found</span>
            <label className="disc-sort">
              Sort by
              <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}>
                <option value="best">Best Match</option>
                <option value="rating">Highest Rated</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="experience">Most Experienced</option>
              </select>
            </label>
          </div>

          {realTutors === null ? (
            <div className="disc-empty"><p>Loading verified tutors...</p></div>
          ) : pageItems.length > 0 ? (
            <div className="disc-tutor-grid">
              {pageItems.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} saved={savedIds.has(tutor.id)} onToggleSave={() => toggleSave(tutor)} />
              ))}
            </div>
          ) : (
            <div className="disc-empty">
              <p>No tutors match your filters right now.</p>
              <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset filters</button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="disc-pagination" aria-label="Tutor results pages">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <ChevronLeftIcon />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === currentPage ? 'active' : ''}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                <ChevronRightIcon />
              </button>
            </nav>
          )}
        </div>
      </div>

      {!bannerDismissed && (
        <div className="dash-sticky-banner">
          <span className="dash-sticky-icon"><GraduationCapIcon /></span>
          <div className="dash-sticky-copy">
            <strong>Not sure who to choose?</strong>
            <span>Tell us what you need and we'll recommend the best tutors{headerName ? ` for ${headerName}` : ''}.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setComingSoonOpen(true)}>
            <SparkleIcon /> Get Recommendations
          </button>
          <button type="button" className="dash-sticky-close" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}>
            <XIcon />
          </button>
        </div>
      )}

      {comingSoonOpen && (
        <ComingSoonModal
          title="Get Recommendations"
          message="Personalised tutor recommendations are being prepared. Check back soon!"
          onClose={() => setComingSoonOpen(false)}
        />
      )}
    </>
  );
}
