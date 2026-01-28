# HiddenCash

Mobile app that searches state unclaimed property databases, shows users money they're owed, and guides them to claim it.

## Tech Stack

- **Mobile**: Expo (React Native) with file-based routing
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **Scraper**: Python + Playwright, hosted on Railway
- **Payments**: RevenueCat
- **Notifications**: Expo Push Notifications

## Project Structure

```
hiddencash/
├── apps/mobile/           # Expo React Native app
│   ├── app/               # File-based routing screens
│   ├── components/        # Reusable components
│   └── lib/               # Utilities and hooks
├── packages/scraper/      # Python scraper worker
│   ├── worker/            # Main worker logic
│   └── scrapers/          # State-specific scrapers (50 states)
└── supabase/              # Supabase configuration
    ├── migrations/        # Database migrations
    └── functions/         # Edge functions (API)
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase CLI
- Expo CLI

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for scraper)
- `EXPO_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL (for Expo)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Same as SUPABASE_ANON_KEY (for Expo)
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` - RevenueCat iOS API key
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` - RevenueCat Android API key

### 3. Database Setup

Run migrations:

```bash
cd supabase
supabase db reset
```

### 4. Mobile App Setup

```bash
cd apps/mobile
npm install
npx expo start
```

### 5. Scraper Setup

```bash
cd packages/scraper
pip install -r requirements.txt
playwright install chromium
python -m worker.main
```

### 6. Edge Functions

Deploy edge functions:

```bash
supabase functions deploy create-search
supabase functions deploy get-results
supabase functions deploy register-push-token
```

## Development

### Running Locally

1. Start Supabase local development:
   ```bash
   supabase start
   ```

2. Start the mobile app:
   ```bash
   npm run mobile:start
   ```

3. Start the scraper worker:
   ```bash
   cd packages/scraper && python -m worker.main
   ```

### Testing

- **Mobile**: `npm run mobile test`
- **Scraper**: `cd packages/scraper && pytest`
- **Edge Functions**: `supabase functions serve`

## Deployment

### Mobile App

1. Configure `app.json` with your EAS project ID
2. Build: `eas build --platform all`
3. Submit: `eas submit --platform all`

### Scraper (Railway)

1. Connect your repository to Railway
2. Set environment variables
3. Deploy from the `packages/scraper` directory

### Supabase

Edge functions are auto-deployed when pushed to main branch if GitHub integration is configured.

## RevenueCat Setup

1. Create a RevenueCat project
2. Configure products:
   - `hiddencash_monthly` - $9.99/month
   - `hiddencash_annual` - $39.99/year
   - `hiddencash_lifetime` - $79.99 one-time
3. Create an entitlement called `premium`
4. Add your API keys to environment variables

## Architecture

### Search Flow

1. User enters name and selects states
2. App calls `create-search` edge function
3. Edge function creates search jobs in database
4. Scraper worker polls for pending jobs
5. Worker checks cache or scrapes state website
6. Results saved to claims table
7. Push notification sent to user
8. User views results in app

### Subscription Flow

1. User taps upgrade in app
2. RevenueCat presents paywall
3. Purchase processed through App Store/Play Store
4. RevenueCat webhook updates `user_subscriptions` table
5. App checks entitlement on each session

## License

Proprietary - All rights reserved
