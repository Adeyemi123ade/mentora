import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';
import { buildOpenApiDocument } from './swagger/index.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import studentRouter from './routes/student.routes.js';
import notificationRouter from './routes/notification.routes.js';
import userRouter from './routes/user.routes.js';
import bookingRouter from './routes/booking.routes.js';
import learningGoalRouter from './routes/learningGoal.routes.js';
import savedTutorRouter from './routes/savedTutor.routes.js';
import tutorViewRouter from './routes/tutorView.routes.js';
import reviewRouter from './routes/review.routes.js';
import messageRouter from './routes/message.routes.js';
import paymentRouter from './routes/payment.routes.js';
import tutorProfileRouter from './routes/tutorProfile.routes.js';
import availabilityRouter from './routes/availability.routes.js';
import tutorDashboardRouter from './routes/tutorDashboard.routes.js';
import adminRouter from './routes/admin.routes.js';
import tutorsRouter from './routes/tutors.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import operationsRouter from './routes/operations.routes.js';
import studentExperienceRouter from './routes/studentExperience.routes.js';
import meetingRouter from './routes/meeting.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Render (and most PaaS hosts) put the app behind one reverse-proxy hop. Without this,
// Express's req.ip resolves to the proxy's internal address for every request instead of
// the real client IP, which silently turns every per-IP rate limiter below into a single
// shared bucket for the entire deployment — indistinguishable from an accidental global cap.
app.set('trust proxy', 1);

// Matches localhost/127.0.0.1 plus RFC1918 private LAN ranges (10.x, 172.16-31.x,
// 192.168.x) — dev-only, so testers on the same WiFi (e.g. http://192.168.1.104:5173)
// can reach the API from their own phone/laptop, not just the machine running it.
const DEV_ORIGIN_PATTERN =
  /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}):\d+$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === env.CLIENT_URL) return true;
  if (env.NODE_ENV !== 'production') {
    return DEV_ORIGIN_PATTERN.test(origin);
  }
  return false;
}

app.use(helmet());
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    callback(isAllowedOrigin(origin) ? null : new Error('Origin is not allowed by CORS'), isAllowedOrigin(origin));
  },
  credentials: true,
}));

// Paystack sends a signed raw JSON body — parse it as a buffer before the JSON body parser.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// Registered ahead of every other /api/* router on purpose: operationsRouter below is also
// mounted at the bare /api prefix and applies requireAuth unconditionally to everything that
// reaches it, so /api/docs would 401 before ever being matched if it were registered later.
// helmet's default CSP also blocks Swagger UI's inline script/style — scoped removal for just
// this path rather than weakening CSP for the rest of the API.
const openApiDocument = buildOpenApiDocument();
app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));
app.use(
  '/api/docs',
  (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.removeHeader('Content-Security-Policy');
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/students', studentRouter);
app.use('/api/student', studentExperienceRouter);
app.use('/api/meetings', meetingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/users', userRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/learning-goals', learningGoalRouter);
app.use('/api/saved-tutors', savedTutorRouter);
app.use('/api/tutor-views', tutorViewRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/messages', messageRouter);
app.use('/api/payments', paymentRouter);
app.use('/api', operationsRouter);
app.use('/api/tutor-profile', tutorProfileRouter);
app.use('/api/tutor/availability', availabilityRouter);
app.use('/api/tutor/dashboard', tutorDashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tutors', tutorsRouter);

app.use(errorHandler);

app.listen(env.PORT, env.HOST, () => {
  console.log(`MENTORA API listening on http://${env.HOST}:${env.PORT}`);
});
