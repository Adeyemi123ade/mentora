export const APP_NAME = 'MENTORA';

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string | Record<string, string[] | undefined>;
};

export type Role = 'STUDENT' | 'PARENT' | 'TUTOR' | 'ADMIN';

export const SIGNUP_ROLES = ['PARENT', 'TUTOR'] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  hasPassword: boolean;
  photoUrl: string | null;
  phone: string | null;
  location: string | null;
  createdAt: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyEmailPayload = {
  email: string;
  code: string;
};

export type ResendCodePayload = {
  email: string;
};

export type AuthResponseData = {
  user: UserSummary;
};

export const GENDERS = ['BOY', 'GIRL', 'UNSPECIFIED'] as const;
export type Gender = (typeof GENDERS)[number];

export const SKILL_INTERESTS = [
  'AI',
  'CODING',
  'PUBLIC_SPEAKING',
  'ENTREPRENEURSHIP',
  'FINANCIAL_LITERACY',
  'OTHER',
] as const;
export type SkillInterest = (typeof SKILL_INTERESTS)[number];

export type Student = {
  id: string;
  loginId: string;
  accessEnabled: boolean;
  fullName: string;
  age: number | null;
  gender: Gender;
  grade: string | null;
  interests: string[];
  photoUrl: string | null;
  overallProgress: number | null;
};

export type CreateStudentPayload = {
  fullName: string;
  age?: number;
  gender: Gender;
  grade?: string;
  interests: string[];
  password: string;
};

export type StudentAccount = Student & {
  email: string;
  createdAt: string;
  parentName: string;
};

export type StudentOverview = {
  student: Student;
  parentName: string;
  memberSince: string;
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;
  upcomingLessons: number;
};

export type StudentSubjectProgress = {
  subject: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
};

export type StudentProgressSummary = {
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;
  subjects: StudentSubjectProgress[];
};

export type UpdateStudentPayload = {
  fullName?: string;
  age?: number;
  gender?: Gender;
  grade?: string;
  interests?: string[];
  overallProgress?: number;
};

export const GOAL_CATEGORIES = ['MATH', 'CODING', 'READING', 'SCIENCE', 'SPEAKING', 'GENERAL'] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export type LearningGoal = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  category: GoalCategory;
  progress: number;
  targetDate: string;
  createdAt: string;
};

export type CreateLearningGoalPayload = {
  studentId: string;
  title: string;
  category: GoalCategory;
  targetDate: string;
  progress?: number;
};

export type UpdateLearningGoalPayload = {
  title?: string;
  category?: GoalCategory;
  targetDate?: string;
  progress?: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export const BOOKING_FORMATS = ['ONE_ON_ONE', 'GROUP', 'RECORDED'] as const;
export type BookingFormat = (typeof BOOKING_FORMATS)[number];

export const BOOKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_APPROVAL_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED'] as const;
export type BookingApprovalStatus = (typeof BOOKING_APPROVAL_STATUSES)[number];

export type Booking = {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade: string | null;
  tutorId: string;
  tutorName: string;
  tutorTitle: string;
  tutorPhotoUrl: string | null;
  subject: string;
  specificTopic: string | null;
  format: BookingFormat;
  date: string;
  startTime: string;
  endTime: string;
  message: string | null;
  price: number;
  platformFee: number;
  total: number;
  status: BookingStatus;
  approvalStatus: BookingApprovalStatus;
  createdAt: string;
};

export type CreateBookingPayload = {
  studentId: string;
  tutorId: string;
  tutorName: string;
  tutorTitle: string;
  tutorPhotoUrl?: string;
  subject: string;
  specificTopic?: string;
  format: BookingFormat;
  date: string;
  startTime: string;
  endTime: string;
  message?: string;
  price: number;
  platformFee: number;
  total: number;
  paymentSource: 'CARD' | 'WALLET';
  paystackReference?: string;
};

export const MEETING_PROVIDERS = ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'OTHER'] as const;
export type MeetingProvider = (typeof MEETING_PROVIDERS)[number];
export type MeetingAvailability = 'READY' | 'NOT_CONFIGURED' | 'TOO_EARLY' | 'ENDED';

export type MeetingInfo = {
  bookingId: string;
  tutorName: string;
  studentName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  provider: MeetingProvider | null;
  availability: MeetingAvailability;
  joinUrl: string | null;
};

export type UpdateMeetingPayload = {
  provider: MeetingProvider;
  meetingUrl: string;
};

export type SavedTutor = {
  id: string;
  tutorId: string;
  note: string | null;
  createdAt: string;
};

export type SaveTutorPayload = {
  tutorId: string;
  note?: string;
};

export type UpdateSavedTutorPayload = {
  note: string;
};

export type TutorView = {
  tutorId: string;
  viewedAt: string;
};

export const REVIEW_TAGS = [
  'Great Communication',
  'Explains Clearly',
  'Patient',
  'Knowledgeable',
  'On Time',
  'Professional',
  'Encouraging',
  'Structured',
  'Practical Tips',
  'Supportive',
  'Needs More Practice',
] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];

export type Review = {
  id: string;
  bookingId: string;
  tutorId: string;
  tutorName: string;
  tutorTitle: string;
  tutorPhotoUrl: string | null;
  studentName: string;
  sessionDate: string;
  sessionStartTime: string;
  rating: number;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
};

export type CreateReviewPayload = {
  bookingId: string;
  rating: number;
  title: string;
  body: string;
  tags?: string[];
};

export type ReviewableBooking = {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorTitle: string;
  tutorPhotoUrl: string | null;
  studentName: string;
  subject: string;
  date: string;
  startTime: string;
};

export type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  location?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ChangeEmailPayload = {
  newEmail: string;
  currentPassword: string;
};

export type UserPreferences = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  bookingReminders: boolean;
  sessionReminders: boolean;
  messageNotifications: boolean;
  paymentNotifications: boolean;
  reviewNotifications: boolean;
  announcements: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  contentFiltering: boolean;
  directMessaging: boolean;
  searchRestrictions: boolean;
  dailyScreenTimeLimit: number | null;
  weeklyActivitySummary: boolean;
  unusualActivityAlerts: boolean;
};

export type UpdatePreferencesPayload = Partial<UserPreferences>;

export type AccountSummary = {
  studentCount: number;
  totalBookings: number;
  memberSince: string;
};

export type ActivityOverview = {
  totalSessionHours: number;
  sessionsCompleted: number;
  tutorsWorkedWith: number;
  bookingStreakWeeks: number;
};

export type ConversationParticipant = {
  id: string;
  name: string;
  photoUrl: string | null;
  title: string | null;
};

export type ConversationSummary = {
  id: string;
  counterpart: ConversationParticipant;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  senderIsMe: boolean;
  body: string;
  studentId: string | null;
  studentName: string | null;
  readAt: string | null;
  createdAt: string;
};

export type StartConversationPayload = {
  counterpartId: string;
};

export type SendMessagePayload = {
  body: string;
  studentId?: string;
};

export const TRANSACTION_TYPES = ['BOOKING_PAYMENT', 'WALLET_TOPUP', 'CARD_VERIFICATION'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_SOURCES = ['CARD', 'WALLET'] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const TRANSACTION_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export type TransactionDto = {
  id: string;
  invoiceNumber: string;
  type: TransactionType;
  source: PaymentSource;
  amount: number;
  status: TransactionStatus;
  description: string;
  createdAt: string;
  bookingId: string | null;
  tutorName: string | null;
  subject: string | null;
  sessionDate: string | null;
};

export type PaymentMethodDto = {
  id: string;
  cardType: string;
  last4: string;
  expMonth: string;
  expYear: string;
  bank: string | null;
  createdAt: string;
};

export type WalletDto = {
  balance: number;
};

export type PaymentsSummary = {
  totalSpent: number;
  paidThisMonth: number;
  scheduledUpcoming: number;
  walletBalance: number;
};

export type InitializePaymentPayload = {
  amount: number;
  purpose: TransactionType;
};

export type InitializePaymentResponse = {
  reference: string;
  amount: number;
  email: string;
};

export const TUTOR_COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Canada'] as const;

export const TUTOR_LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Arabic', 'Fulfulde'] as const;

export const TUTOR_SUBJECTS = [
  'Python', 'Machine Learning', 'TensorFlow', 'Deep Learning', 'Data Analysis', 'Data Science',
  'JavaScript', 'React', 'Node.js', 'Web Development', 'Mobile Development', 'Flutter', 'Dart', 'Firebase',
  'Java', 'Spring Boot', 'System Design', 'Software Design', 'REST APIs', 'Git & GitHub', 'Databases', 'SQL',
  'Excel', 'Power BI', 'Data Visualization', 'Business Analytics', 'Statistics',
  'Mathematics', 'Algebra', 'Calculus', 'Geometry', 'Trigonometry', 'Exam Preparation',
  'Physics', 'Chemistry', 'Computer Vision', 'NLP',
  'Public Speaking', 'Debate', 'Confidence Building',
  'Entrepreneurship', 'Finance',
  'Product Management', 'Prompt Engineering', 'AI Fluency',
] as const;

export const TUTOR_GRADE_LEVELS = [
  'Primary (Grades 1-6)',
  'Junior Secondary (JSS 1-3)',
  'Senior Secondary (SSS 1-3)',
  'University / Undergraduate',
  'Adult Learners',
] as const;

export const TUTOR_EXPERIENCE_OPTIONS = ['Less than 1 year', '1-2 years', '3-5 years', '6-10 years', '10+ years'] as const;
export type TutorExperienceOption = (typeof TUTOR_EXPERIENCE_OPTIONS)[number];

export const TUTOR_QUALIFICATION_OPTIONS = [
  'High School Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Professional Certification',
] as const;
export type TutorQualificationOption = (typeof TUTOR_QUALIFICATION_OPTIONS)[number];

export const TUTOR_TEACHING_FORMATS = ['ONLINE', 'IN_PERSON'] as const;
export type TutorTeachingFormat = (typeof TUTOR_TEACHING_FORMATS)[number];

export const TUTOR_SESSION_DURATIONS = [30, 45, 60, 90] as const;

export const TUTOR_ID_TYPES = ['NIN', 'PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD'] as const;
export type TutorIdType = (typeof TUTOR_ID_TYPES)[number];
export const TUTOR_ID_TYPE_LABELS: Record<TutorIdType, string> = {
  NIN: 'National ID (NIN)',
  PASSPORT: 'International Passport',
  DRIVERS_LICENSE: "Driver's License",
  VOTERS_CARD: "Voter's Card",
};

export const TUTOR_VERIFICATION_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'ACTION_REQUIRED', 'REJECTED'] as const;
export type TutorVerificationStatus = (typeof TUTOR_VERIFICATION_STATUSES)[number];

export type TutorProfileDto = {
  photoUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  languages: string[];
  subjects: string[];
  gradeLevels: string[];
  yearsExperience: string | null;
  qualification: string | null;
  teachingFormats: string[];
  sessionDurationMinutes: number | null;
  sessionPrice: number | null;
  profileCompletedAt: string | null;
  idType: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  institutionName: string | null;
  certificateUrl: string | null;
  supportingDocUrls: string[];
  experienceDescription: string | null;
  declarationAccurate: boolean;
  declarationMisinfo: boolean;
  declarationConsent: boolean;
  verificationStatus: TutorVerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  payoutAccountName: string | null;
  payoutVerifiedAt: string | null;
};

export type UpdateTutorProfilePayload = Partial<
  Omit<TutorProfileDto, 'photoUrl' | 'idFrontUrl' | 'idBackUrl' | 'certificateUrl' | 'supportingDocUrls' | 'verificationStatus' | 'submittedAt' | 'reviewedAt' | 'rejectionReason' | 'profileCompletedAt'>
> & { markProfileCompleted?: boolean };

export type LoginEventDto = {
  id: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  action: 'LOGIN' | 'LOGOUT';
  createdAt: string;
};

export type AdminPendingTutorDto = {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  subjects: string[];
  languages: string[];
  gradeLevels: string[];
  yearsExperience: string | null;
  qualification: string | null;
  institutionName: string | null;
  sessionPrice: number | null;
  idType: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  certificateUrl: string | null;
  supportingDocUrls: string[];
  experienceDescription: string | null;
  submittedAt: string | null;
};

export type AdminInviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

export type AdminInviteDto = {
  id: string;
  email: string;
  status: AdminInviteStatus;
  invitedByName: string;
  createdAt: string;
  acceptedAt: string | null;
};

export type PublicTutorDto = {
  id: string;
  name: string;
  photoUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  languages: string[];
  subjects: string[];
  gradeLevels: string[];
  yearsExperience: string | null;
  qualification: string | null;
  teachingFormats: string[];
  sessionDurationMinutes: number | null;
  sessionPrice: number | null;
  rating: number;
  reviewCount: number;
  studentsTaught: number;
  availabilityDays: number[];
};

export type PublicTutorReviewDto = {
  parentName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type AvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type CreateAvailabilitySlotPayload = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type NigerianBank = { name: string; code: string };

export const NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Globus Bank', code: '00103' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Microfinance Bank', code: '50211' },
  { name: 'Moniepoint Microfinance Bank', code: '50515' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Suntrust Bank', code: '100' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank For Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

export type PayoutDetailsDto = {
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  verifiedAt: string | null;
};

export type ResolveAccountPayload = {
  bankCode: string;
  accountNumber: string;
};

export type ResolveAccountResponse = {
  accountName: string;
};

export type TutorDashboardSummary = {
  totalBookings: number;
  upcomingSessions: number;
  unreadMessages: number;
  totalEarningsThisMonth: number;
};

export type TutorActivityItem = {
  id: string;
  kind: 'welcome' | 'verification_submitted' | 'verification_approved' | 'booking' | 'review' | 'message';
  title: string;
  description: string;
  createdAt: string;
};

export type TutorBookingDto = {
  id: string;
  parentName: string;
  studentName: string;
  studentGrade: string | null;
  studentPhotoUrl: string | null;
  subject: string;
  specificTopic: string | null;
  format: BookingFormat;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: BookingStatus;
  approvalStatus: BookingApprovalStatus;
};

export type TutorStudentDto = {
  studentId: string;
  parentId: string;
  fullName: string;
  grade: string | null;
  photoUrl: string | null;
  subjects: string[];
  sessionsCount: number;
  lastSessionDate: string;
  progressPercent: number;
  progressNote: string | null;
  rating: number | null;
  reviewCount: number;
};

export type TutorCalendarDay = {
  date: string;
  count: number;
};

export type TutorBookingsSummary = {
  totalBookings: number;
  totalBookingsChangePercent: number | null;
  completed: number;
  completedChangePercent: number | null;
  earnings: number;
  earningsChangePercent: number | null;
  pending: number;
  pendingChangePercent: number | null;
};

export type UpdateStudentProgressPayload = {
  progressPercent: number;
  note?: string;
};

export type TutorReviewDto = {
  id: string;
  parentName: string;
  studentName: string;
  rating: number;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
};

export type ProfileStrength = {
  percent: number;
  label: string;
};

export const DEFAULT_ROUTE = '/';
