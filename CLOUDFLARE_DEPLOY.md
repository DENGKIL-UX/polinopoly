# Cloudflare Pages Deployment Guide

## Prerequisites

1. A Cloudflare account (free tier works)
2. GitHub repository connected to Cloudflare Pages
3. Cloudflare API token and Account ID

## Setup

### 1. Get Cloudflare Credentials

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create a token with "Edit Cloudflare Workers" permissions
3. Note your Account ID from the Cloudflare dashboard sidebar

### 2. Add GitHub Secrets

In your GitHub repository, go to Settings → Secrets and Variables → Actions and add:

- `CLOUDFLARE_API_TOKEN` — your API token from step 1
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

### 3. Cloudflare Pages Dashboard Configuration

Connect your GitHub repository to Cloudflare Pages with these settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

## Files Created

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Cloudflare Worker configuration (name, assets, compatibility flags) |
| `open-next.config.ts` | OpenNext.js Cloudflare adapter config |
| `.github/workflows/deploy-cloudflare.yml` | GitHub Actions CI/CD pipeline |
| `next.config.ts` | Updated: `images.unoptimized: true` (no sharp on Workers) |

## Local Build Test

```bash
# Install dependencies
bun install

# Build for Cloudflare
npx opennextjs-cloudflare build

# Preview locally
npx wrangler dev
```

## Deployment

### Automatic (via GitHub Actions)
Push to `main` branch → GitHub Actions builds and deploys automatically.

### Manual
```bash
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

## Notes

- `nodejs_compat` flag is enabled for Next.js compatibility on Workers
- Images are set to `unoptimized: true` because `sharp` (native module) can't run on Workers
- The `.open-next/` directory is the build output (gitignored)
- The `wrangler.jsonc` configures the Worker name as `polinopoly`
