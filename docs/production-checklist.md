# Production Checklist

## Vercel Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CANVAS_TOKEN_ENCRYPTION_KEY`
- `CRON_SECRET`

Canvas OAuth, when the school developer key is available:

- `CANVAS_CLIENT_ID`
- `CANVAS_CLIENT_SECRET`
- `CANVAS_OAUTH_REDIRECT_URI=https://your-domain.com/api/canvas/oauth/callback`
- `CANVAS_OAUTH_SCOPES`

Optional:

- `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` only if demo mode should be publicly available.

## Supabase

Apply migrations to production after linking the project:

```bash
supabase link
supabase db push --dry-run
supabase db push
```

Confirm Auth URL configuration:

- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback` and `https://your-domain.com/auth/confirm`

## Canvas Sync

Manual user sync:

```bash
POST /api/canvas/sync
```

Queued production worker:

```bash
curl "https://your-domain.com/api/jobs/canvas-sync" \
  -H "Authorization: Bearer $CRON_SECRET"
```

The worker processes queued `sync_runs` and requires `SUPABASE_SERVICE_ROLE_KEY` because it runs outside a user session.
Vercel Cron invokes this route with `GET` and automatically sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is configured.
