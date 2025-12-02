# Quiz App dengan Admin Dashboard

## Overview
Website Quiz interaktif dengan fitur admin dashboard untuk mengelola pertanyaan, waktu mulai, dan limit peserta. Dilengkapi dengan animasi countdown yang menarik dan maskot kartun.

## Struktur Proyek

```
├── server/                 # Backend (Express.js)
│   ├── index.ts           # Entry point server
│   ├── routes.ts          # API routes
│   ├── auth.ts            # JWT authentication
│   └── db.ts              # Database connection
├── shared/
│   └── schema.ts          # Drizzle ORM schema
├── client/                # Frontend components
│   ├── pages/
│   │   ├── AdminLogin.tsx     # Halaman login admin
│   │   ├── AdminDashboard.tsx # Dashboard untuk kelola quiz
│   │   ├── AdminPage.tsx      # Wrapper halaman admin
│   │   └── QuizPage.tsx       # Halaman utama quiz
│   └── components/
│       ├── CountdownScreen.tsx # Animasi countdown (Ready, 5, 4, 3, 2, 1)
│       ├── BlurredQuiz.tsx    # Tampilan blur sebelum quiz dimulai
│       └── TooLateScreen.tsx  # Halaman jika terlambat
├── components/            # Komponen quiz utama
│   └── QuizCard.tsx       # Kartu pertanyaan quiz
├── api/                   # Vercel serverless API
│   └── index.ts           # API routes untuk production
├── App.tsx                # Root component dengan routing
└── index.tsx              # Entry point React
```

## Fitur

### Admin Dashboard (`/admin`)
- Login dengan username dan password (JWT-based)
- Setup admin pertama kali
- Kelola pengaturan quiz:
  - Judul quiz
  - Waktu mulai (countdown sebelum quiz bisa dibuka)
  - Durasi countdown
  - Maksimal peserta (limit hanya berlaku untuk peserta yang sudah completed)
  - Link redirect setelah selesai
  - Status aktif/nonaktif
- Kelola pertanyaan (1-5 pertanyaan):
  - Teks pertanyaan
  - Jawaban benar
  - Petunjuk/hints (opsional)
- Lihat daftar peserta

### Quiz Page (`/`)
- **Blur Mode**: Quiz di-blur sebelum waktu mulai dengan countdown timer
- **Animasi Countdown**: "Ready?" lalu 5, 4, 3, 2, 1, "GO!" dengan maskot kartun
- **Join Tanpa Limit**: Peserta bisa join quiz kapan saja
- **Limit Peserta Completed**: Limit hanya berlaku saat peserta selesai (completed)
  - Jika sudah max peserta completed, tampilkan "Terlambat" dengan maskot sedih
- **Quiz Interaktif**: Jawab pertanyaan satu per satu
- **Redirect**: Setelah selesai, redirect ke link yang sudah diatur

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Express.js, TypeScript, JWT Auth
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Authentication**: JWT (localStorage), Bcrypt password hashing (12 rounds)
- **Deployment**: Vercel (serverless compatible)

## Security Features
- **JWT Authentication**: Token-based, stored in localStorage, serverless-compatible
- **Brute Force Protection**: Max 5 login attempts, 15-minute lockout
- **Password Hashing**: Bcrypt with 12 rounds
- **Input Validation**: Username min 3 chars, password min 6 chars, auto-trim
- **SQL Injection Prevention**: Drizzle ORM parameterized queries
- **CORS**: Configured for development

## API Endpoints

### Admin
- `GET /api/admin/exists` - Cek apakah admin sudah ada
- `POST /api/admin/setup` - Buat admin pertama
- `POST /api/admin/login` - Login admin (returns JWT token)
- `POST /api/admin/logout` - Logout admin
- `GET /api/admin/check` - Cek status autentikasi (requires JWT)

### Quiz
- `GET /api/quiz/settings` - Get pengaturan quiz (admin only, requires JWT)
- `POST /api/quiz/settings` - Simpan pengaturan quiz (admin only, requires JWT)
- `GET /api/quiz/public` - Get quiz aktif untuk peserta (checks if limit reached via completed participants)
- `POST /api/quiz/join` - Daftar sebagai peserta (no limit on join)
- `POST /api/quiz/complete` - Tandai quiz selesai (checks if limit reached before allowing completion)
- `GET /api/quiz/participants` - Lihat daftar peserta (admin only, requires JWT)

## Database Schema

### Tables
1. **admins** - Akun admin dengan password ter-hash
2. **quiz_settings** - Pengaturan quiz (judul, waktu, limit, dll)
3. **questions** - Daftar pertanyaan dengan hints
4. **participants** - Peserta yang join quiz (tracking join dan completion)

## Participant Limit Logic

**PENTING**: Limit peserta hanya berlaku untuk yang sudah **COMPLETED**, bukan yang join:

1. **Join Phase**: Peserta bisa join kapan saja, TANPA batasan jumlah
   - API `/api/quiz/join` selalu berhasil (tidak ada limit check)
   
2. **Completion Phase**: Saat peserta submit jawaban terakhir
   - API `/api/quiz/complete` check: apakah jumlah completed participants sudah max?
   - Jika belum max → mark as completed, allow redirect
   - Jika sudah max → return error "tooLate", show too late screen

3. **Contoh Skenario**:
   - Max peserta = 4
   - Peserta A, B, C, D bisa join semua (4 orang join)
   - Jika A selesai lebih dulu → 1 completed, slot tersisa 3
   - Jika B selesai → 2 completed, slot tersisa 2
   - ...
   - Jika D selesai → 4 completed, slot penuh
   - Jika peserta baru E datang sekarang → E bisa join, tapi saat E submit akan dapat "tooLate"

## Cara Pakai

1. Buka `/admin` untuk masuk ke dashboard
2. Jika pertama kali, buat akun admin (username min 3 karakter, password min 6 karakter)
3. Refresh halaman, form akan berubah ke Login
4. Login dengan akun baru
5. Setup quiz:
   - Set judul quiz
   - Set waktu mulai (peserta akan melihat countdown)
   - Set maksimal peserta (untuk limit completed participants)
   - Set link redirect
   - Tambah pertanyaan (1-5)
   - Aktifkan quiz
6. Peserta buka `/` untuk ikut quiz
7. Jika belum waktunya, mereka akan melihat blur + countdown
8. Saat countdown selesai, tampil animasi "Ready, 5, 4, 3, 2, 1, GO!"
9. Quiz dimulai, peserta menjawab pertanyaan
10. Saat submit jawaban terakhir:
    - Jika slot masih tersedia → selesai & redirect
    - Jika slot sudah penuh → "Terlambat" dengan maskot sedih

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (managed by Replit)

## Scripts
- `npm run dev` - Jalankan development server (frontend + backend)
- `npm run db:push` - Push schema ke database

## Recent Changes (Dec 1, 2025)

### Bug Fixes
- ✅ Fixed layout bugs: All pages now use `fixed inset-0` instead of `min-h-screen` for full-screen coverage
  - Admin Login page
  - Quiz Waiting (BlurredQuiz)
  - Quiz Loading state
  - Quiz Playing state
  - Too Late screen
  - No Quiz screen

### Logic Changes
- ✅ Fixed participant limit logic:
  - Limit now applies only to COMPLETED participants, not all joined participants
  - Updated `/api/quiz/public` to only count completed participants
  - Updated `/api/quiz/join` to allow anyone to join without limit
  - Updated `/api/quiz/complete` to check and enforce limit before marking complete
  - Frontend QuizCard now calls `/api/quiz/complete` and handles "tooLate" response
  - Shows "Terlambat" screen if completed limit reached

### Authentication
- ✅ Switched from Express sessions to JWT tokens
  - JWT stored in localStorage for better serverless compatibility
  - Brute force protection (5 attempts, 15-min lockout) on login
  - Bcrypt password hashing (12 rounds)
  - Admin database reset (user must create new account)

