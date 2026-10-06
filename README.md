# FileSync

FileSync is a simple cloud-based file transfer and storage platform that allows users to upload files from one device and access them from another using the same account.

Designed for students and everyday users, FileSync eliminates the need for USB drives, email attachments, QR code logins, or third-party messaging apps when transferring files between devices.

## Features

* Username and password authentication
* Secure file uploads
* Access files from any device
* Download files anytime
* Delete unwanted files
* Personal file dashboard
* Responsive design for mobile and desktop
* Secure user-specific file access

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Supabase Authentication
* Supabase Database
* Supabase Storage
* Vercel Deployment

## How It Works

1. Create an account with a username and password.
2. Upload files from your device.
3. Log in from another device using the same account.
4. Access and download your uploaded files instantly.

## Security

* Authentication required for file access.
* Users can only view and manage their own files.
* File metadata is securely stored in the database.
* Storage access is protected through Supabase policies.

## Use Cases

* Transfer files between phone and laptop.
* Access study materials from college computers.
* Store important documents online.
* Quickly share files across personal devices.

## Live Demo

Add your deployed Vercel URL here:

```text
https://your-project-name.vercel.app
```

## Installation

Clone the repository:

```bash
git clone https://github.com/your-username/filesync.git
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file and add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CRON_SECRET=your_cron_secret
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Supabase Inactivity Prevention (Keep-Alive Cron)

Supabase Free tier projects automatically pause after 7 consecutive days of inactivity. FileSync includes an automated daily keep-alive mechanism to keep your project active:

1. **Database RPC Function (`keep_alive`)**:
   Execute the SQL snippet from `schema.sql` (Section 6) in the **Supabase SQL Editor**:
   ```sql
   create or replace function public.keep_alive()
   returns jsonb
   language sql
   security definer
   set search_path = public
   as $$
     select jsonb_build_object(
       'status', 'ok',
       'timestamp', now()
     );
   $$;

   grant execute on function public.keep_alive() to anon, authenticated, service_role;
   ```
   This executes a lightweight, harmless query that generates database activity without touching or modifying user or file data.

2. **API Endpoint (`/api/keep-supabase-alive`)**:
   Invokes the Supabase `keep_alive()` function. Protected by `CRON_SECRET` using timing-safe bearer token verification.

3. **Vercel Cron (`vercel.json`)**:
   Automatically pings `/api/keep-supabase-alive` once every day at 00:00 UTC (`0 0 * * *`).

### Configuring in Production (Vercel)

1. Generate a secure random secret:
   ```bash
   openssl rand -hex 32
   ```
2. Go to your **Vercel Project Settings > Environment Variables** and add:
   * `CRON_SECRET`: The generated random secret
   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
3. Deploy to Vercel. Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` when triggering the daily cron.

### Manual Verification

You can test the keep-alive endpoint with `curl`:

```bash
curl -i -H "Authorization: Bearer <your_cron_secret>" https://your-project.vercel.app/api/keep-supabase-alive
```

Expected response (`200 OK`):
```json
{
  "success": true,
  "message": "Supabase keep-alive ping successful",
  "data": {
    "status": "ok",
    "timestamp": "2026-10-06T04:26:00.000000+00:00"
  },
  "timestamp": "2026-10-06T04:26:00.123Z"
}
```

## Future Enhancements

* Transfer codes
* QR-based sharing
* Cloud clipboard sync
* File previews
* File expiration
* Storage analytics
* Dark mode improvements

## License

This project is licensed under the MIT License.

---

Built with ❤️ using Next.js, Supabase, and Vercel.
