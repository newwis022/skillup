# SkillUp — free starter prototype

SkillUp is a responsive, dark navy / purple / lime social-learning PWA concept.

## What works in this prototype
- Responsive layout for mobile, tablet, and desktop browsers.
- Demo daily quiz; completing it adds 100 demo XP.
- Create text posts, like posts, add comments, search the feed.
- Follow/unfollow sample creators.
- Demo progress and interactions are saved in this browser using localStorage.
- Web app manifest and service worker for install/offline shell support.

## What is NOT implemented yet
- Real sign-up or sign-in (email, Google, Facebook, or phone).
- Server-side profiles, friend requests, real-time private messages.
- Real media upload, video hosting, livestreaming, product listings/payments.
- Server-side moderation, reporting queues, production security.
- Shared data between devices or users. Demo changes are local to one browser.

Do not use this prototype to collect real users' personal information. Do not enter passwords or sensitive data.

## Run locally
Open `index.html` in a browser for a basic preview. For service-worker/PWA behavior, use a local web server (for example VS Code Live Server) or HTTPS hosting.

## Free publishing with GitHub Pages
1. Create a GitHub account at https://github.com/.
2. Create a **public** repository named `skillup` (or another name you choose).
3. Upload the contents of this folder to the repository root. `index.html` should be at the root, not inside another nested folder.
4. Open repository **Settings → Pages**.
5. Under build/deployment, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
6. Wait for GitHub Pages to publish. The URL will look like `https://YOUR-USERNAME.github.io/skillup/`.
7. Open the URL on your phone and test. HTTPS is required for service workers and PWA installation.
8. If the page was already open, refresh after deployment. If an older version stays cached, close the app and reload; a future update can add a version refresh prompt.

GitHub Pages hosts static files only. It does not provide a secure database, authentication, private messaging backend, or video infrastructure.

## Suggested next backend phase
Use Supabase (free tier, with usage and plan limits) for database and auth. Before connecting it:
- Create tables with user ownership and relationship rules.
- Enable Row Level Security (RLS) on every exposed table.
- Write and test explicit policies for reading/updating each record.
- Never put a Supabase `service_role` key or other secret in browser code.
- Configure Google/Facebook OAuth redirect URLs and provider credentials.
- Treat phone/SMS verification as a potentially paid feature.
- Set media upload size/type limits and access rules.
- Add block/report flows and moderation before allowing public user-generated content.

Free hosting and backend quotas can change. Livestreaming and heavy video bandwidth are unlikely to remain free at meaningful scale.


## Backend foundation (prepared, not connected)
The `supabase/schema.sql` file is a starter schema for profiles, posts, friendships, comments, likes, conversations/messages, notifications, blocks, reports, and learning progress. It enables Row Level Security and includes starter policies.

**This is not yet production-ready.** In particular, friend-request state transitions and conversation creation/member additions need hardened server-side functions; storage policies, OAuth configuration, rate limits, moderation workflows, and multi-user security tests are still required. Do not paste production secrets into the frontend or publish real personal data until these are complete.

### Apply later
1. Create a Supabase project and open its SQL Editor.
2. Review `supabase/schema.sql`, then run it in the new project.
3. Configure Auth providers and redirect URLs in Supabase.
4. Add only the project URL and publishable/anon key to client configuration. Never expose the `service_role` key.
5. Test every operation as at least two separate users before connecting it to the website.
