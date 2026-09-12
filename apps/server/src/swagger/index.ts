import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry.js';

// Side-effect imports: each one registers its router's paths into the shared registry.
// Import order doesn't matter — registerPath calls are independent of each other.
import './paths/health.paths.js';
import './paths/auth.paths.js';
import './paths/students.paths.js';
import './paths/studentExperience.paths.js';
import './paths/meetings.paths.js';
import './paths/notifications.paths.js';
import './paths/users.paths.js';
import './paths/bookings.paths.js';
import './paths/learningGoals.paths.js';
import './paths/savedTutors.paths.js';
import './paths/tutorViews.paths.js';
import './paths/reviews.paths.js';
import './paths/messages.paths.js';
import './paths/payments.paths.js';
import './paths/tutorProfile.paths.js';
import './paths/availability.paths.js';
import './paths/tutorDashboard.paths.js';
import './paths/tutorsBrowse.paths.js';
import './paths/admin.paths.js';
import './paths/operations.paths.js';
import './paths/webhooks.paths.js';

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Mentora API',
      version: '0.1.0',
      description:
        'Generated from the actual Express routes, middleware, and Zod validation schemas in apps/server/src — ' +
        'not a hand-designed spec. Every response documented here follows the same envelope every route handler ' +
        'actually returns: `{ success, message, data? }` on success, `{ success: false, message, error? }` on ' +
        'failure (see middleware/errorHandler.ts). Response `data` payloads are precisely modeled where the shape ' +
        'was verified (e.g. UserSummary); elsewhere the outer key name is verified from the route handler but the ' +
        'inner object is intentionally left generic rather than guessed field-by-field — see the accompanying audit ' +
        'report for that scope note.',
    },
    servers: [{ url: '/', description: 'Same origin as this docs page' }],
  });
}
