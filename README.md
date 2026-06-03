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

Create a `.env.local` file and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
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
