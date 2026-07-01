# Phase 9 — Admin Panel Security Hardening

## Production rule

Frontend admin sidebar permissions are UX only. Every `/api/admin/**` route must enforce backend authentication and permission checks.

Allowed patterns:

1. `requireAdmin(request)`
2. `requireAdminPermission(request, ADMIN_PERMISSIONS.X)`
3. `requireSuperAdmin(request)`
4. explicit `410 Gone` for disabled routes

No public admin API route is allowed.

## Protected sensitive routes

- `/api/admin/site-config`
  - `GET` requires `SETTINGS_VIEW` or `SUPER_ADMIN`
  - `PUT` requires `SETTINGS_EDIT` or `SUPER_ADMIN`
- `/api/admin/elasticsearch`
  - all methods/actions require `SUPER_ADMIN`
- tracking, health, and production QA routes remain `SUPER_ADMIN`-only.

## New guard helpers

Shared helpers live in `app/api/admin/_utils.ts`:

```ts
await requireAdmin(request);
await requireAdminPermission(request, ADMIN_PERMISSIONS.SETTINGS_EDIT);
await requireSuperAdmin(request);
```

These helpers validate the HTTP-only admin access token, active admin status, role, and permission server-side.

## Regression lock

Run before deploy:

```bash
npm run qa:admin-api-security
npm run audit:security
npm run qa:predeploy
```

The audit fails if a new `/api/admin/**/route.ts` file is added without auth guard or explicit `410 Gone`.
