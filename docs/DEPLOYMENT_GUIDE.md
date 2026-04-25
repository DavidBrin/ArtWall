# Digital Art Wall Deployment Guide

## Purpose

This guide explains the recommended low-cost deployment path from the implementation plan:

- Frontend and API: Vercel
- Database and realtime sync: Supabase

This walkthrough is written for someone who has never deployed a website before. It assumes the app in this repository follows the plan in [IMPLEMENTATION_PLAN.md](</c:/Users/david/Documents/Software Projects/ArtWall/docs/IMPLEMENTATION_PLAN.md>).

## Cost Expectation

- Vercel Hobby plan: free
- Supabase free plan: free
- Domain name: optional

If you use the free subdomains from both platforms, the expected cost is `$0`.

## What You Will End Up With

When you finish this guide, you should have:

- A live public website on a `*.vercel.app` URL
- A Supabase database storing shared wall strokes
- Realtime updates flowing from Supabase to the site
- Environment variables set in Vercel
- A publish workflow where pushing code updates redeploys the site

## Before You Start

You will need:

- A GitHub account
- A Vercel account
- A Supabase account
- Git installed on your computer
- Node.js 20 or newer installed on your computer
- This project saved in a local folder on your machine

Recommended account setup:

- Sign up for Vercel using GitHub if possible
- Sign up for Supabase using GitHub if possible

That makes connecting everything easier.

## Important Project Assumptions

This deployment guide follows the implementation plan exactly:

- The app is a Next.js project
- The backend is implemented with Next.js Route Handlers
- The data model uses a `strokes` table
- Realtime uses Supabase Postgres changes
- Public anonymous read and insert are allowed
- No destructive anonymous endpoint is deployed in v1

## Environment Variables

These are the environment variables this project should need for the recommended v1 setup:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` is your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the client-safe anonymous key from Supabase.
- Do not expose the Supabase `service_role` key in client code.
- For this v1 plan, you should not need the `service_role` key at all because public read and insert are handled through RLS policies.

## Part 1: Create the Supabase Project

### 1. Create your project

1. Go to `https://supabase.com/dashboard`.
2. Click `New project`.
3. Choose your organization.
4. Enter a project name like `digital-art-wall`.
5. Create a strong database password and save it somewhere safe.
6. Pick a region close to you or your users.
7. Click `Create new project`.

Wait for Supabase to finish provisioning the project. This can take a couple of minutes.

### 2. Find your project URL and key

After the project is ready:

1. Open the project dashboard.
2. Open the `Connect` area or the API settings for the project.
3. Copy these values:
   - Project URL
   - Anon/public key

Save them somewhere temporary because you will need them again in Vercel.

## Part 2: Create the Database Table

### 1. Open the SQL Editor

1. In Supabase, open your project.
2. Click `SQL Editor`.
3. Create a new query.

### 2. Run the setup SQL

Paste this SQL and run it:

```sql
create extension if not exists pgcrypto;

create or replace function public.stroke_points_are_normalized(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and jsonb_array_length(payload) between 2 and 2048
    and not exists (
      select 1
      from jsonb_array_elements(payload) as point
      where jsonb_typeof(point) <> 'array'
        or jsonb_array_length(point) <> 2
        or jsonb_typeof(point -> 0) <> 'number'
        or jsonb_typeof(point -> 1) <> 'number'
        or (point ->> 0)::double precision < 0
        or (point ->> 0)::double precision > 1
        or (point ->> 1)::double precision < 0
        or (point ->> 1)::double precision > 1
    );
$$;

create table if not exists public.strokes (
  id uuid primary key default gen_random_uuid(),
  points jsonb not null,
  color text not null,
  width integer not null,
  client_id text not null,
  created_at timestamptz not null default now(),
  constraint strokes_points_normalized check (public.stroke_points_are_normalized(points)),
  constraint strokes_color_hex check (color ~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'),
  constraint strokes_width_range check (width between 1 and 24),
  constraint strokes_client_id_length check (char_length(client_id) between 1 and 128)
);

create index if not exists strokes_created_at_desc_idx
on public.strokes (created_at desc);

alter table public.strokes enable row level security;

drop policy if exists "Public read strokes" on public.strokes;
create policy "Public read strokes"
on public.strokes
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert strokes" on public.strokes;
create policy "Public insert strokes"
on public.strokes
for insert
to anon, authenticated
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'strokes'
  ) then
    alter publication supabase_realtime add table public.strokes;
  end if;
end
$$;
```

What this does:

- Creates the `strokes` table from the plan
- Adds the `created_at` index
- Turns on Row Level Security
- Allows anonymous visitors to read strokes
- Allows anonymous visitors to insert strokes
- Adds the table to the realtime publication so live updates can stream to clients

### 3. If you rerun the SQL later

The SQL above is designed to be rerun safely:

- `create table if not exists` leaves the table alone if it already exists
- `drop policy if exists` and `create policy` refresh the public policies cleanly
- The realtime block only adds `public.strokes` if it is not already in `supabase_realtime`
- The normalized-points function prevents malformed direct inserts from corrupting the shared wall feed

## Part 3: Put the Code on GitHub

Vercel works best for beginners when it deploys directly from GitHub.

### 1. Create a GitHub repository

1. Go to `https://github.com`.
2. Click `New repository`.
3. Name it something like `digital-art-wall`.
4. Keep it public or private. Either works with Vercel.
5. Create the repository.

### 2. Upload your local project

From your project folder, use Git to upload the code to GitHub.

If this folder is not already a Git repository, run:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPO_URL` with the URL GitHub shows you for your new repository.

If Git asks you to sign in, complete the GitHub authentication flow and then rerun the push command if needed.

## Part 4: Create the Vercel Project

### 1. Import the GitHub repository

1. Go to `https://vercel.com/dashboard`.
2. Click `Add New...`
3. Click `Project`.
4. Import the GitHub repository you just created.
5. If Vercel asks for GitHub access, allow it.

### 2. Confirm project settings

For a standard Next.js app, Vercel usually detects everything automatically.

Check these values before deploying:

- Framework Preset: `Next.js`
- Root Directory: the project root
- Build Command: leave the default unless the project says otherwise
- Output Directory: leave the default unless the project says otherwise

For the planned stack, the defaults should be correct.

## Part 5: Add Environment Variables in Vercel

Before the first real deployment, add the Supabase variables.

### 1. Open the environment variable settings

In your Vercel project:

1. Open `Settings`
2. Open `Environment Variables`

### 2. Add these variables

Add both variables below and assign them to:

- Production
- Preview
- Development

Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Tips:

- Paste the exact values from Supabase.
- Do not add extra spaces.
- Any environment variable change in Vercel only applies to new deployments, so redeploy after changes.

## Part 6: Deploy the Site

### 1. Start the first deployment

After the environment variables are saved:

1. Go back to the `Deploy` screen if needed.
2. Click `Deploy`.

Vercel will:

- Install dependencies
- Build the Next.js app
- Publish the site

When it finishes, Vercel will show you a live URL like:

```text
https://your-project-name.vercel.app
```

That is your public website.

### 2. If you added environment variables after the first deploy

If you deployed once before adding the variables:

1. Open the project in Vercel
2. Go to `Deployments`
3. Open the latest deployment
4. Click `Redeploy`

This makes sure the build sees the new variables.

## Part 7: Verify the Deployment

After the site is live, test these things in order:

### 1. Open the homepage

Visit your `*.vercel.app` URL and confirm:

- The page loads
- The canvas fills the screen
- Only the small `Menu` and `About` controls are visible

### 2. Test the health endpoint

Visit:

```text
https://your-project-name.vercel.app/api/health
```

Expected result:

```json
{ "ok": true }
```

### 3. Test drawing

Try drawing on the wall and confirm:

- A stroke appears immediately on your screen
- Refreshing the page keeps the stroke

### 4. Test realtime sync

Open the site in:

- two browser tabs, or
- a desktop browser and a phone

Draw in one window and confirm the other one updates shortly after.

### 5. Test install and export

Open the menu and confirm:

- Install or home-screen guidance appears where supported
- Save/export as PNG works

## Part 8: How to Publish Updates Later

After the site is connected to GitHub, future updates are simple:

1. Make your code changes locally.
2. Commit them.
3. Push them to GitHub.

Example:

```powershell
git add .
git commit -m "Update drawing behavior"
git push
```

Vercel will automatically create a new deployment.

If you push to your main production branch, Vercel will publish a new production deployment.

## Optional: Use the Vercel CLI Later

You do not need the CLI for the beginner path, but it can help later.

Install it with:

```powershell
npm install -g vercel
```

Useful commands:

```powershell
vercel
vercel --prod
vercel env pull
```

What they do:

- `vercel`: creates a preview deployment
- `vercel --prod`: creates a production deployment
- `vercel env pull`: downloads your Vercel environment variables for local development

## Optional: Add a Custom Domain

You do not need to buy a domain for this project.

If you want one later:

1. Buy a domain from a registrar
2. Open your Vercel project
3. Go to `Settings` -> `Domains`
4. Add the domain
5. Follow Vercel's DNS instructions

This is the only part likely to cost money. A basic domain is often under `$10` per year.

## Troubleshooting

### The site deployed, but the data does not load

Check:

- `NEXT_PUBLIC_SUPABASE_URL` is correct
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- You redeployed after adding or changing environment variables

### Drawing works locally, but not on the deployed site

Check:

- The `strokes` table exists in Supabase
- RLS policies were created
- The API routes were deployed successfully
- The browser console does not show a failed network request

### Realtime does not update across tabs

Check:

- `public.strokes` was added to the `supabase_realtime` publication
- The client is subscribing to `INSERT` events on `public.strokes`
- You are testing with a freshly deployed version that has the correct environment variables

### The build fails on Vercel

Check:

- The repository actually contains a valid Next.js app
- The `package.json` file exists
- Dependencies install locally
- The project builds locally before you push

### I changed an environment variable and nothing happened

On Vercel, environment variable changes only apply to new deployments.

Redeploy the project after every environment-variable change.

## Suggested Launch Checklist

- Supabase project created
- `strokes` table created
- RLS enabled
- Public read policy created
- Public insert policy created
- Realtime enabled for `public.strokes`
- GitHub repository created
- Code pushed to GitHub
- Vercel project imported
- Vercel environment variables added
- Production deployment completed
- Homepage loads
- `/api/health` returns `{ "ok": true }`
- Drawing persists after refresh
- Realtime works between two sessions
- Install/export behavior verified

## References

This guide follows the project plan and was checked against current official platform docs:

- Vercel Next.js overview: `https://vercel.com/docs/concepts/next.js/overview`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Supabase Next.js quickstart: `https://supabase.com/docs/guides/getting-started/quickstarts/nextjs`
- Supabase Row Level Security: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase Postgres Changes / Realtime: `https://supabase.com/docs/guides/realtime/postgres-changes`
