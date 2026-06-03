# FileSync 🔄

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase)

A simple, fully free web application that allows users to upload files from one device and download them on another by logging into the same account. 

**[🔗 Access the App Here (Deployed on Vercel)](#)** *(Replace # with your actual vercel link once deployed)*

---

## 🌟 Features

- **Username Authentication**: Login with just a username and password.
- **Secure File Storage**: Files are private and only accessible to the owner.
- **Cross-Device Sync**: Upload on your phone, download on your computer.
- **Modern UI**: Clean, minimal, dark-mode design using Tailwind CSS.
- **100% Free**: No credit card or payment required to use.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/)

---

## 💻 Local Development (For Contributors)

If you'd like to contribute or run the project locally, you will need to set up your own Supabase instance, as the production database credentials are kept private.

### 1. Setup Supabase
1. Create a free project on [Supabase](https://supabase.com/).
2. Run the SQL script located in `schema.sql` in your Supabase SQL Editor to create the necessary tables, storage buckets, and RLS policies.
3. Get your `Project URL` and `anon public` key from **Project Settings -> API**.

### 2. Configure Environment
Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.local.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## 📝 Future Enhancements Roadmap

- [ ] Transfer codes / QR code sharing
- [ ] File preview (images, pdfs)
- [ ] Automatic file expiration (e.g., delete after 24 hours)
- [ ] Clipboard text syncing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
