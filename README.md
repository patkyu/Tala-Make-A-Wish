# Tala: constellation of dreams

Place your dreams as stars, connect them into a constellation, add photos and Spotify songs, then publish it to a shared galaxy.

Stack: Next.js 16 (App Router, TypeScript), Supabase (Postgres, Auth, Storage), Vercel.

---

## 1. What you need

- Node.js 20.9 or newer (`node -v`)
- A free Supabase account: https://supabase.com
- A free Vercel account connected to GitHub: https://vercel.com

## 2. Set up Supabase

1. **Create a project** in the Supabase dashboard. Pick the Singapore region (closest to PH). Save the database password somewhere safe.
2. **Run the schema.** Go to **SQL Editor**, click **New query**, paste all of `supabase/schema.sql`, then click **Run**. This creates:
   - tables `constellations`, `stars`, `connections`
   - Row Level Security rules (who can read and write what)
   - the `dream-photos` storage bucket and its upload rules
3. **Check it worked.** Open **Table Editor**: you should see the three tables, each marked RLS enabled. Open **Storage**: you should see `dream-photos`.
4. **Get your keys.** Go to **Project Settings > API Keys** (or **Connect** at the top). Copy:
   - Project URL
   - Publishable key (starts with `sb_publishable_`). The legacy `anon` key also works if that's what your project shows.
5. **Set auth URLs.** Go to **Authentication > URL Configuration**:
   - Site URL: `http://localhost:3000` for now (change it to your Vercel URL later)
   - Redirect URLs: add `http://localhost:3000/**`

Email sign-in (magic link) is on by default, so there's nothing else to enable.

## 3. Run it locally

```bash
cd tala
npm install
cp .env.local.example .env.local
```

Open `.env.local` and paste your Project URL and publishable key. Then:

```bash
npm run dev
```

Open http://localhost:3000.

Try the full flow:

1. **Start your constellation** sends you to sign in. Enter your email and open the link it sends.
2. Tap the sky to add dreams. Add a title, text, a photo, and a Spotify link.
3. Use **Connect to another dream** and tap stars to draw lines.
4. Tap **Publish**, then **Publish** again in the sheet.
5. Open the share link in an incognito window. You should see it without signing in.
6. Open `/galaxy`. Your constellation should be there.

> Supabase's built-in email sender only allows a few emails per hour. That's fine for testing. Before a real launch, add your own SMTP (Resend, Brevo, etc.) under **Authentication > Emails > SMTP Settings**.

## 4. Deploy to Vercel

1. Push the project to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Tala: first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/tala.git
   git push -u origin main
   ```
   `.env.local` is in `.gitignore`, so your keys won't be pushed.
2. In Vercel, click **Add New > Project** and import the repo. The framework is detected as Next.js automatically.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Click **Deploy**. You'll get a URL like `https://tala-xyz.vercel.app`.
5. Back in Supabase **Authentication > URL Configuration**:
   - Site URL: `https://tala-xyz.vercel.app`
   - Redirect URLs: add `https://tala-xyz.vercel.app/**` (keep the localhost one for development)

Without step 5, magic links will send people back to localhost.

## 5. Project structure

```
app/
  page.tsx                 Landing page
  login/                   Magic link sign-in
  auth/callback/route.ts   Turns the email link into a session
  auth/signout/route.ts    Sign out
  edit/page.tsx            Loads or creates your constellation, renders the editor
  c/[slug]/page.tsx        Public shared page for one constellation
  galaxy/page.tsx          All published constellations
components/
  Editor.tsx               The builder: place, drag, connect, edit, publish
  Viewer.tsx               Read-only constellation view
  Galaxy.tsx               Pan and zoom galaxy, golden-angle spiral layout
  SkyLayer.tsx             Draws stars and lines (shared by all three views)
  Starfield.tsx            Twinkling background
  DreamCard.tsx            Read-only dream details
  SpotifyEmbed.tsx         Spotify player iframe
lib/
  supabase/client.ts       Supabase client for the browser
  supabase/server.ts       Supabase client for server components and routes
  supabase/proxy.ts        Refreshes the session, guards /edit
  dreams.ts                Photo URLs, Spotify link parsing, image resizing
  types.ts                 Shared TypeScript types
proxy.ts                   Next.js 16 proxy (formerly middleware.ts)
supabase/schema.sql        Database, security rules, storage bucket
```

## 6. How the security works

All the rules live in the database (`supabase/schema.sql`), not in the frontend, so nobody can bypass them by calling the Supabase API directly.

| Who | Can read | Can write |
|---|---|---|
| Anyone (not signed in) | Published constellations, their stars and lines | Nothing |
| Signed-in user | Published ones plus their own draft | Only their own constellation, stars, lines |
| Photo uploads | Anyone with the URL (public bucket) | Only inside `dream-photos/<their-user-id>/` |

Other guards: one constellation per user, 60 dreams max, text length limits, and Spotify IDs validated by format.

Note: the photo bucket is public, so a draft's photo is viewable by anyone who has its exact URL. The file names include random IDs, so they can't be guessed, but don't treat drafts as truly secret.

## 7. How data flows in the editor

- Changes show instantly on screen, then save in the background. The top right shows **Saving…** or **Saved**.
- Typing is debounced (saves after you pause), dragging saves when you let go.
- Photos are resized in the browser to 1080px JPEG before upload.
- A new star you close without filling in is deleted automatically.
- If a save fails, a message appears at the top explaining which change didn't save.

## 8. Good next steps

- **Report button + moderation queue.** Add a `reports` table and a way to hide constellations. Do this before sharing publicly.
- **Share previews.** Add `app/c/[slug]/opengraph-image.tsx` to render the constellation as an image for Messenger and Facebook link previews.
- **Custom links.** Let users pick their slug (`/c/pat-dreams`) instead of the random one.
- **Galaxy performance.** Past a few hundred constellations, load them by region as the user pans instead of all at once.
- **Google sign-in.** Add it under **Authentication > Providers**; the callback route already handles it.
