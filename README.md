# FileSync 🔄

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase)

A simple, fully free MVP web application that allows users to upload files from one device and download them on another by logging into the same account.

---

## 🌟 Features

- **Username Authentication**: Login with just a username and password (powered by Supabase).
- **Secure File Storage**: Files are private and only accessible to the owner via Row Level Security (RLS).
- **Cross-Device Sync**: Upload on your phone, download on your computer.
- **Modern UI**: Clean, minimal, dark-mode design using Tailwind CSS.
- **100% Free**: Uses Supabase's generous free tier for Database, Auth, and Storage—**no credit card required**.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Postgres, Storage)

## 🛠️ Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and create a free account (no credit card required).
2. Create a new project.
3. Once the project is provisioned, go to **Project Settings -> API** to get your `Project URL` and `anon public` key.

### 2. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Fill in your Supabase configuration values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### 3. Setup Database and Storage Schema

You need to create the table, storage bucket, and security policies.

1. Go to your Supabase project dashboard.
2. Click on **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Open the `schema.sql` file in this repository, copy its entire contents, and paste it into the SQL Editor.
5. Click **Run**. 

This script will automatically:
- Create the `files` metadata table.
- Create the `uploads` storage bucket.
- Enable Row Level Security (RLS) so users can only access their own files.

### 4. Run Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
4. Deploy!

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## 📝 Future Enhancements Roadmap

- [ ] Transfer codes / QR code sharing
- [ ] File preview (images, pdfs)
- [ ] Automatic file expiration (e.g., delete after 24 hours)
- [ ] Clipboard text syncing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
