# Fitnessify AI

Fitnessify AI is now a full-stack investor demo with:

- Secure server-side authentication using hashed passwords and HTTP-only cookies
- SQLite-backed user, profile, and report persistence
- Server-side OpenRouter integration for report generation and chat
- Safer frontend rendering for user and model-generated content
- Static landing, onboarding, dashboard, PDF export, and check-in flows

## Tech Stack

- Node.js 20+
- Express
- Better SQLite3
- bcryptjs
- jsonwebtoken
- Vanilla HTML, CSS, JavaScript

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Set the required values in `.env`:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
JWT_SECRET=replace-with-a-long-random-secret
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-2.0-flash-001
COOKIE_SECURE=false
APP_URL=http://localhost:3000
```

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Production Deployment

This app is best deployed on platforms that support a persistent filesystem or attached volume because SQLite is used for app data.

Good options:

- Railway
- Render with a persistent disk
- Fly.io with a mounted volume
- Any VPS or Docker host

Avoid serverless or ephemeral-filesystem deployments unless you migrate app data from SQLite to an external database.

### Environment Variables

- `PORT`: Server port
- `HOST`: Bind address. Use `0.0.0.0` on hosted platforms and containers.
- `NODE_ENV`: Set to `production` for production deploys.
- `JWT_SECRET`: Long random secret for signed sessions
- `OPENROUTER_API_KEY`: Server-side OpenRouter key
- `OPENROUTER_MODEL`: OpenRouter model ID used for report generation and chat
- `APP_URL`: Public app URL sent to OpenRouter as the referer
- `COOKIE_SECURE`: Set to `true` in production behind HTTPS

Production will fail fast if `NODE_ENV=production` is set without `JWT_SECRET`.

### Docker

Build and run:

```bash
docker build -t fitnessify-ai .
docker run --env-file .env -p 3000:3000 fitnessify-ai
```

## Important Notes

- The app no longer exposes API keys in client-side code.
- Passwords are never stored in plain text.
- Email addresses are normalized to lowercase.
- AI output is generated server-side and escaped before rendering.
- The database lives at `data/fitnessify.db`.
- Login/signup, chat, report generation, and analytics event endpoints include basic in-memory rate limiting for a single-process deployment.
- Lightweight demo analytics are stored in the `analytics_events` table for signup starts, onboarding completion, report generation, PDF downloads, Vita chat usage, and check-in completion.

## Recommended Next Upgrades

- Move from SQLite to Postgres if you expect multi-instance production traffic.
- Add password reset and email verification.
- Add a real analytics dashboard or export for the stored demo telemetry.
- Add branded screenshots or a custom favicon for polish.
