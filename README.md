
# 🧠 Hivemind — Mental Health Appointment Booking Platform

> A web application where patients in Kerala can find, browse, and book appointments with verified mental health specialists. Built with vanilla JavaScript, Supabase, and Google Gemini AI.

**Live Demo:** [https://arathy-20.github.io/Hivemind/](https://arathy-20.github.io/Hivemind/)

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Database Schema](#database-schema)
- [Security](#security)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## About the Project

Hivemind addresses the gap in accessible mental health services in Kerala by providing a simple, trustworthy platform where:
- **Patients** can browse verified specialists, check availability, and book sessions online
- **Myna** (AI chatbot) guides users through the platform and answers mental health questions
- **Specialists** are listed with real-time availability pulled from a live database

Built as a student project by a 2nd year engineering student from Kerala.

---

## Features

### 🔐 Authentication
- Email + OTP verification via Gmail SMTP
- Google OAuth (published on Google Cloud Console)
- 3-step registration flow with password strength indicator
- "Remember Me" using localStorage / sessionStorage
- Forgot password via Supabase email reset
- Unconfirmed email detection with resend option

### 🏥 Doctor Listing
- All doctors loaded from Supabase database (live data)
- Filter by specialty, search by name/keyword
- Filter chips: Available Today, Top Rated, Budget-Friendly, etc.
- Sort by: Default, Rating, Price, Experience
- Skeleton loading placeholders while data fetches
- Fallback to mock data if Supabase is unreachable

### 📅 Booking Flow (4 steps)
1. **Calendar** — Pick a date (unavailable days greyed out based on doctor's schedule)
2. **Form** — Enter patient name, phone, email, and optional note
3. **Review** — See all booking details before confirming
4. **Success** — Booking saved to Supabase, reference number shown

### 🤖 Myna — AI Chatbot
- Powered by Google Gemini 2.5 Flash
- Secure proxy via Supabase Edge Function (API key never exposed in browser)
- Maintains conversation history (last 10 messages)
- Quick-reply preset buttons for common questions
- Typing indicator animation
- Friendly fallback on API errors

### 📌 Upcoming Session Reminder
- Banner at top of homepage showing next appointment
- Counts down: "3 days away", "Tomorrow at 2:00 PM", etc.
- Queries Supabase for patient's future bookings by name

### 📬 Contact Form
- Popup modal with name, email, message fields
- Sends to hivemindkerala@gmail.com via Formspree
- No backend required

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript | UI and logic |
| Database | Supabase (PostgreSQL) | Doctor and booking data |
| Auth | Supabase Auth + Gmail SMTP | Email OTP + Google OAuth |
| AI | Google Gemini 2.5 Flash | Myna chatbot |
| AI Proxy | Supabase Edge Functions (Deno) | Secure API key handling |
| Email | Formspree | Contact form submissions |
| Hosting | GitHub Pages | Static site deployment |

**Why no framework?**
This project intentionally uses no React, Vue, or Angular — to demonstrate strong understanding of core web fundamentals.

---

## Project Structure

```
Hivemind/
│
├── index.html              # Entry point — smart redirect to login or home
├── login.html              # Authentication page (login / register / OTP / forgot)
├── home.html               # Main app (doctors, booking, chatbot, reminder)
│
├── css/
│   ├── login.css           # Styles for the login/auth page
│   └── styles.css          # Styles for the main homepage
│
├── js/
│   ├── config.js           # Supabase client + shared constants (HOURS, MONTHS, etc.)
│   ├── auth.js             # checkAuth(), doLogout() — session management
│   ├── doctors.js          # fetchDoctorsAPI(), renderDoctors(), filter/sort system
│   ├── booking.js          # Calendar, slot picker, form validation, confirmBooking()
│   ├── chatbot.js          # Myna AI — sendChat(), toggleChat(), conversation state
│   ├── contact.js          # Contact popup — openContactPopup(), submitContactPopup()
│   ├── session.js          # loadUpcomingSession() — reminder banner
│   └── main.js             # init() — entry point, wires all modules together
│
└── supabase/
    └── functions/
        └── gemini-proxy/
            └── index.ts    # Edge Function — secure Gemini API proxy
```

### Module Dependency Map

```
main.js
  ├── config.js       (Supabase, constants)
  ├── auth.js         (imports config.js)
  ├── doctors.js      (imports config.js)
  ├── booking.js      (imports config.js + doctors.js)
  ├── chatbot.js      (imports config.js)
  ├── contact.js      (no imports — pure DOM)
  └── session.js      (imports config.js)
```

---

## How It Works

### Login Flow
```
User enters email + password
        ↓
Supabase checks credentials
        ↓
On success → save name to sessionStorage
        ↓
Redirect to home.html?user=Name
        ↓
home.html reads ?user= param → shows nav with user's name
```

### Booking Flow
```
User clicks "Book Session" on a doctor card
        ↓
Calendar loads → greyed dates = past / wrong weekday / excluded dates
        ↓
User picks date → time slots appear (checks bookedSlots for taken ones)
        ↓
User fills form → validates fields
        ↓
Review screen → user confirms
        ↓
INSERT into Supabase bookings table
        ↓
Success screen with reference number (HM-XXXXX)
```

### Myna Chatbot Flow
```
User types message in chat window
        ↓
Browser sends message to Supabase Edge Function
(no API key in browser code)
        ↓
Edge Function reads GEMINI_API_KEY from secrets
        ↓
Calls Gemini API with message + system prompt
        ↓
Returns reply to browser
        ↓
Displayed in chat window
```

---

## Database Schema

### `doctors` table
| Column | Type | Description |
|---|---|---|
| id | int | Primary key |
| name | text | Doctor's full name |
| specialty | text | e.g. "Clinical Psychologist" |
| bio | text | Short description |
| experience | int | Years of experience |
| location | text | City in Kerala |
| image_url | text | Profile photo URL |
| available_days | text | Comma-separated day numbers "1,2,3" (0=Sun) |
| excluded_dates | text | Comma-separated "YYYY-MM-DD" dates to block |

### `bookings` table
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| doctor_id | int | References doctors.id |
| doctor_name | text | Denormalized for easy queries |
| booking_date | text | "YYYY-MM-DD" |
| booking_time | text | Hour as string "9", "14" etc. |
| patient_name | text | Full name entered by patient |
| patient_phone | text | Phone number |

---

## Security

| What | How it's protected |
|---|---|
| Gemini API key | Stored as Supabase Edge Function secret. Never in browser code. |
| Gmail SMTP password | Stored in Supabase dashboard only. Never in code. |
| Supabase service_role key | Never used in frontend. Only in Edge Functions. |
| Supabase anon key | Public by design — safe when Row Level Security (RLS) is enabled. |
| Formspree form ID | Public — worst case: contact form spam. |

**Important:** Enable Row Level Security (RLS) on your Supabase tables to ensure the anon key cannot be abused.

---

## Getting Started

### Prerequisites
- A [Supabase](https://supabase.com) account (free)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini
- A [Formspree](https://formspree.io) account (free) for contact form
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/Hivemind.git
cd Hivemind
```

2. **Update Supabase credentials** in `js/config.js`
```javascript
export const supabase = createClient(
  'YOUR_SUPABASE_PROJECT_URL',
  'YOUR_SUPABASE_ANON_KEY'
);
```

3. **Update Gemini proxy URL** in `js/config.js`
```javascript
export const GEMINI_PROXY_URL = 'YOUR_SUPABASE_PROJECT_URL/functions/v1/gemini-proxy';
```

4. **Deploy the Edge Function**
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy gemini-proxy
```

5. **Add secrets in Supabase Dashboard** → Edge Functions → Secrets
```
GEMINI_API_KEY         = your Google Gemini API key
SUPABASE_URL           = your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY = your Supabase service role key
```

6. **Create the database tables** in Supabase SQL editor (see schema above)

7. **Update Formspree form ID** in `js/contact.js`

---

## Deployment

This project is hosted on **GitHub Pages** (free static hosting).

```bash
git add .
git commit -m "Your message"
git push origin main
```

GitHub Pages automatically serves the updated files within 1-2 minutes.

**Note:** The Supabase Edge Function is deployed separately via the Supabase CLI and does not go through GitHub Pages.

---

## Roadmap

- [ ] Doctor dashboard — doctors can view their upcoming appointments
- [ ] Booking confirmation emails to patients
- [ ] Razorpay payment integration
- [ ] RAG-powered Myna — AI fetches live doctor data before answering
- [ ] Patient appointment history page
- [ ] Admin panel for managing doctors

---

## Contact

**Arathy** — 2nd Year Engineering Student, Kerala

📧 hivemindkerala@gmail.com
📱 +91 77369 09085

---

*Built with care for mental health accessibility in Kerala. 💜*
