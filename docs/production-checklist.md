# Production Checklist

## Vercel Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CANVAS_TOKEN_ENCRYPTION_KEY`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-5.2`)

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

External scheduler worker:

```bash
curl "https://your-domain.com/api/jobs/canvas-sync?staleMinutes=2&limit=5" \
  -H "Authorization: Bearer $CRON_SECRET"
```

The worker processes queued `sync_runs` and connected Canvas accounts whose `last_synced_at` is older than `staleMinutes`.
It requires `SUPABASE_SERVICE_ROLE_KEY` because it runs outside a user session.

For the approved MVP setup, configure an external scheduler to call that URL every 2 minutes. Keep `CRON_SECRET` private and send it as the bearer token.
