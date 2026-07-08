# PasarAPI.xyz Research — Bloomberg-Style Live Market Feeds

## What is PasarAPI.xyz?

**Pasar API** is a searchable directory of **1,390 APIs** across Southeast Asia (Malaysia, Thailand, Indonesia, Singapore, Philippines, Vietnam) and the world's major API economies. It catalogs both government open data and commercial APIs with ready-made snippets, auth requirements, and pricing.

**URL:** https://pasarapi.xyz/
**API:** https://pasarapi.xyz/api (catalogue, search, categories, individual API details)
**Total APIs cataloged:** 1,390

## Relevant APIs for Pilihan Raya Monopoly

### Malaysian Financial Data (from data.gov.my via BNM)

| API | Provider | Frequency | Auth | Use in Game |
|-----|----------|-----------|------|-------------|
| Daily Exchange Rates (1700) | BNM | Daily | None | MYR/USD ticker — live ringgit value |
| Daily Exchange Rates (0900) | BNM | Daily | None | Opening rate reference |
| Monthly Exchange Rates | BNM | Monthly | None | Historical MYR trends |
| Monthly Interest Rates | BNM | Monthly | None | OPR rate — affects rent multiplier |
| Annual Interest Rates | BNM | Annual | None | Long-term rate trends |
| Federal Government Finance (Quarterly) | BNM | Quarterly | None | Government revenue/expenditure |
| Federal Government Revenue | BNM | Quarterly | None | Tax tile amounts |
| Currency in Circulation | BNM | Monthly | None | Money supply indicator |

### Categories Available on PasarAPI

- Banking & Finance (145 APIs)
- Government Services
- Government Data
- Realtime
- Population & Society
- Housing & Property

### What's NOT directly available

- **KLCI (Kuala Lumpur Composite Index)** — Bursa Malaysia doesn't have a free public API; would need a commercial provider (e.g., Alpha Vantage, Yahoo Finance)
- **CPO (Crude Palm Oil) price** — Malaysia Palm Oil Board (MPOB) publishes monthly data but no real-time API
- **Inflation rate (CPI)** — DOSM publishes monthly CPI but no real-time API

## Implementation

### What we built

1. **`/api/market-data` route** — Next.js API endpoint that:
   - Attempts to fetch real MYR/USD exchange rate from `data.gov.my`
   - Falls back to realistic simulated data if the API is unreachable (CORS, timeout, non-JSON response)
   - Returns: KLCI, CPO, MYR/USD, inflation multiplier, federal rent bonus
   - Caches for 5 minutes (300s) with stale-while-revalidate

2. **Game integration** — The existing Bursa Malaysia ticker in GameDashboard already displays:
   - KLCI index with change percentage
   - CPO (Crude Palm Oil) price
   - MYR/USD exchange rate
   - Inflation multiplier
   - All values fluctuate each turn via the `simulateMarket()` function in game-store.ts

### Data flow

```
data.gov.my (BNM) → /api/market-data → game-store.ts simulateMarket() → Bursa ticker (GameDashboard)
```

### Limitations

- data.gov.my's API endpoint pattern is unclear (tried multiple URL patterns — CKAN, REST, OpenAPI — none returned clean JSON). The endpoint attempts the fetch but falls back to simulated data.
- For production live data, would need either:
  - A Bursa Malaysia data subscription
  - Yahoo Finance API (unofficial)
  - Alpha Vantage (free tier, 25 requests/day)
  - Or a server-side scraper that reads data.gov.my's HTML pages

### PasarAPI search commands

```bash
# Search for Malaysian finance APIs
curl "https://pasarapi.xyz/api/search?q=finance+malaysia"

# Search for exchange rate APIs
curl "https://pasarapi.xyz/api/search?q=exchange+rate+BNM"

# List all categories
curl "https://pasarapi.xyz/api/categories"

# Get API details by ID
curl "https://pasarapi.xyz/api/apis/exchangerates_daily_1700"
```
