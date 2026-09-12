import { z } from 'zod';
import { registry } from '../registry.js';
import { common } from '../responses.js';
import { entity, entityArray } from '../schemas.js';

const tags = ['Notifications'];
const auth = [{ bearerAuth: [] }];
const idParam = z.object({ id: z.string() });

registry.registerPath({
  method: 'get', path: '/api/notifications', tags, security: auth,
  summary: "List the current user's notifications",
  responses: { ...common.ok(z.object({ notifications: entityArray('') })), ...common.unauthorized },
});

registry.registerPath({
  method: 'post', path: '/api/notifications/{id}/read', tags, security: auth,
  summary: 'Mark one notification as read',
  request: { params: idParam },
  responses: { ...common.ok(z.object({ notification: entity('') }), 'Notification marked as read'), ...common.unauthorized, ...common.notFound() },
});

registry.registerPath({
  method: 'post', path: '/api/notifications/read-all', tags, security: auth,
  summary: 'Mark all notifications as read',
  responses: { ...common.okNoData('All notifications marked as read'), ...common.unauthorized },
});
