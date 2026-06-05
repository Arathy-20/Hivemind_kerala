/* ═══════════════════════════════════════════════════════════════
   doctors.js — Doctor data, rendering, filtering, and sorting
   ─────────────────────────────────────────────────────────────────
   WHAT THIS FILE DOES:
   1. Defines MOCK_DOCTORS — fallback data if Supabase is unavailable
   2. fetchDoctorsAPI() — loads real doctors from Supabase
   3. renderSkeletons() — shows loading placeholders (shimmer cards)
   4. renderDoctors()   — renders actual doctor cards from data
   5. Filter system     — search, specialty filter, chips, sort
═══════════════════════════════════════════════════════════════ */

import { supabase, DAY_NAMES, HOURS, MONTHS } from './config.js';

/* ── UTILITY HELPERS ─────────────────────────────────────────────
   Small functions used by both doctors.js and booking.js.
   Exported so booking.js can import and reuse them.
   ────────────────────────────────────────────────────────────────── */

// available_days is stored in Supabase as "1,2,3" (text) → convert to Set{1,2,3}
// Day numbers: 0=Sunday, 1=Monday ... 6=Saturday
export function parseAvailableDays(raw){
  if(!raw) return new Set();
  if(Array.isArray(raw)) return new Set(raw.map(Number));
  return new Set(String(raw).split(',').map(s=>Number(s.trim())).filter(n=>!isNaN(n)));
}

// excluded_dates stored as "2025-12-25,2026-01-01" → Set{"2025-12-25", "2026-01-01"}
export function parseExcludedDates(raw){
  if(!raw) return new Set();
  if(Array.isArray(raw)) return new Set(raw.map(s=>s.trim()));
  return new Set(String(raw).split(',').map(s=>s.trim()).filter(Boolean));
}

// Formats a date as "YYYY-MM-DD" — the format used in Supabase
// padStart ensures single digits get a leading zero: 5 → "05"
export function fmtDate(y,m,d){
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// [1,3,5] → "Mon, Wed, Fri"
export function daysLabel(raw){
  const n = parseAvailableDays(raw);
  return n.size ? [...n].sort().map(x=>DAY_NAMES[x]).join(', ') : '';
}

// 4.5 → "★★★★½"
export function starsHtml(rating){
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let s = '★'.repeat(full);
  if(half) s += '½';
  return s;
}

// Generates a random booking reference like "HM-X7K2P"
export function generateRef(){
  return 'HM-' + Math.random().toString(36).slice(2,7).toUpperCase();
}

/** Simulated network delay */
const delay = ms => new Promise(r => setTimeout(r, ms));

/** Mock doctors dataset — NEW rich data */
const MOCK_DOCTORS = [
  {
    id: 'd001', name: 'Dr. Amina Rasheed', specialty: 'Psychologist',
    specialtyKey: 'psychologist',
    bio: 'Specialises in cognitive-behavioural therapy and anxiety disorders. Fluent in Malayalam and English.',
    experience: 12, degrees: ['M.Phil Clinical Psychology', 'RCI Licensed'],
    rating: 4.9, reviews: 184, price: 800,
    location: 'Malappuram', available_days: [1,2,3,4,5],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Amina+Rasheed&size=200&background=ede8f5&color=4a3b7a&rounded=true&bold=true&font-size=0.38',
    available_today: true,
  },
  {
    id: 'd002', name: 'Dr. Suresh Menon', specialty: 'Psychiatrist',
    specialtyKey: 'psychiatrist',
    bio: 'Board-certified psychiatrist with expertise in mood disorders, schizophrenia, and medication management.',
    experience: 18, degrees: ['MD Psychiatry', 'AIIMS Delhi', 'NIMHANS Fellow'],
    rating: 4.8, reviews: 312, price: 1200,
    location: 'Kozhikode', available_days: [1,3,5],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Suresh+Menon&size=200&background=d1fae5&color=065f46&rounded=true&bold=true&font-size=0.38',
    available_today: false,
  },
  {
    id: 'd003', name: 'Ms. Fathima Nasrin', specialty: 'Counsellor',
    specialtyKey: 'counsellor',
    bio: 'Relationship and family counsellor helping individuals navigate life transitions and interpersonal conflict.',
    experience: 7, degrees: ['MSc Counselling Psychology', 'BACP Accredited'],
    rating: 4.7, reviews: 97, price: 600,
    location: 'Malappuram', available_days: [0,2,4,6],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Fathima+Nasrin&size=200&background=fef3c7&color=92400e&rounded=true&bold=true&font-size=0.38',
    available_today: true,
  },
  {
    id: 'd004', name: 'Dr. Rajan Pillai', specialty: 'Therapist',
    specialtyKey: 'therapist',
    bio: 'Trauma-informed therapist using EMDR and mindfulness-based approaches for PTSD and stress.',
    experience: 14, degrees: ['MA Psychology', 'EMDR Certified', 'Mindfulness Practitioner'],
    rating: 4.6, reviews: 145, price: 900,
    location: 'Thrissur', available_days: [1,2,3,4,5],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Rajan+Pillai&size=200&background=ede8f5&color=4a3b7a&rounded=true&bold=true&font-size=0.38',
    available_today: false,
  },
  {
    id: 'd005', name: 'Dr. Priya Nair', specialty: 'Child Specialist',
    specialtyKey: 'child',
    bio: 'Child and adolescent psychiatrist focusing on ADHD, autism spectrum, and developmental disorders.',
    experience: 10, degrees: ['MD Psychiatry', 'Child & Adolescent Fellowship'],
    rating: 4.9, reviews: 208, price: 1100,
    location: 'Malappuram', available_days: [1,3,4,5],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Priya+Nair&size=200&background=d1fae5&color=065f46&rounded=true&bold=true&font-size=0.38',
    available_today: true,
  },
  {
    id: 'd006', name: 'Mr. Arun Kumar', specialty: 'Counsellor',
    specialtyKey: 'counsellor',
    bio: 'Specialises in career counselling, adolescent issues, and substance-use support with a compassionate approach.',
    experience: 5, degrees: ['MSc Counselling', 'Career Counselling Certification'],
    rating: 4.4, reviews: 52, price: 500,
    location: 'Malappuram', available_days: [2,4,6],
    excluded_dates: [],
    image_url: 'https://ui-avatars.com/api/?name=Arun+Kumar&size=200&background=fef3c7&color=92400e&rounded=true&bold=true&font-size=0.38',
    available_today: true,
  },
];

/* ── fetchDoctorsAPI() ────────────────────────────────────────────
   Fetches all doctors from the Supabase 'doctors' table.
   If Supabase fails (network error, etc.), falls back to MOCK_DOCTORS
   so the page never shows blank.

   'async/await' pattern: await pauses until Supabase responds,
   then we process the data. Any error jumps to the catch block.
   ────────────────────────────────────────────────────────────────── */
export async function fetchDoctorsAPI() {
  try {
    // supabase.from('doctors').select('*') = "SELECT * FROM doctors"
    const { data, error } = await supabase
      .from('doctors')
      .select('*');
    if (error) throw error;

    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun, 1=Mon...

    return data.map(d => {
      // available_days is stored as "1,2,3" comma-separated text
      const availDays = d.available_days
        ? d.available_days.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        : [1,2,3,4,5];

      // excluded_dates is a single date string — wrap in array
      const excludedDates = d.excluded_dates
        ? (Array.isArray(d.excluded_dates) ? d.excluded_dates : [d.excluded_dates])
        : [];

      // experience column contains "Anxiety & Stress- Depression- CBT Therapy" style text
      // use it as bio since bio is NULL, and set experience to 0
      const bio = d.bio || '';
      const expText = d.experience || '';

      return {
        id:             d.id,
        name:           d.name,
        specialty:      d.specialty,
        specialtyKey:   (d.specialty || '').toLowerCase().replace(/[^a-z]/g, '_'),
        bio:            bio || expText || 'Specialist in ' + d.specialty,
        experience:     0,
        degrees:        expText ? expText.split('-').map(s => s.trim()).filter(Boolean) : [],
        rating:         d.rating || 4.5,
        reviews:        d.reviews || 0,
        price:          d.price || 800,
        location:       d.location || 'Kerala',
        available_days: availDays,
        excluded_dates: excludedDates,
        image_url:      d.image_url ||
          'https://ui-avatars.com/api/?name=' + encodeURIComponent(d.name) +
          '&size=200&background=ede8f5&color=4a3b7a&rounded=true&bold=true&font-size=0.38',
        available_today: availDays.includes(todayDay),
      };
    });
  } catch(e) {
    console.warn('Could not load doctors from Supabase, using mock data:', e);
    return JSON.parse(JSON.stringify(MOCK_DOCTORS)); // fallback
  }
}

/* ── submitBookingAPI(payload) ────────────────────────────────────
   Saves a confirmed booking to the Supabase 'bookings' table.
   payload contains: doctor_id, doctor_name, booking_date,
   booking_time, patient_name, patient_phone.
   Returns a booking reference number (e.g. "HM-X7K2P").
   ────────────────────────────────────────────────────────────────── */
async function submitBookingAPI(payload) {
  const ref = 'HM-' + Math.random().toString(36).slice(2,7).toUpperCase();

  // Column names must match exactly what's in your Supabase bookings table
  const { error } = await supabase.from('bookings').insert([{
    doctor_id:     payload.doctor_id,
    doctor_name:   payload.doctor_name,
    booking_date:  payload.booking_date,
    booking_time:  String(payload.booking_time), // your table uses text
    patient_name:  payload.patient_name,
    patient_phone: payload.patient_phone,
  }]);

  if (error) throw new Error('Booking could not be saved: ' + error.message);
  return { success: true, ref };
}

/* ══════════════════════════════════════════════════════════════════
   APP STATE — Shared variables used across multiple functions
   ──────────────────────────────────────────────────────────────────
   These are declared at the top level of the module so every
   function below can read and update them.
   ══════════════════════════════════════════════════════════════════ */

export let allDoctors = [];      // All doctors loaded from Supabase
export let visibleDoctors = [];  // Doctors currently shown after filtering/sorting

let currentDoctor = null;        // The doctor the user is booking with
let currentYear, currentMonth;   // Calendar navigation state
let selectedDate, selectedSlot;  // What the user has picked so far

// Tracks which slots are already booked: key = "doctorId-date-hour" → true
const bookedSlots = {};

// Which filter chips are currently active (e.g. "Available Today", "4★+")
let activeChips = new Set();

/* ═════════════════════════════════════════════
   SKELETON LOADERS
   ═════════════════════════════════════════════ */
export function renderSkeletons(count = 6) {
  const grid = document.getElementById('doctorsGrid');
  grid.innerHTML = Array.from({length: count}, () => `
    <div class="skeleton-card" role="status" aria-label="Loading specialist">
      <div style="display:flex;gap:14px;align-items:center;">
        <div class="skel skel-avatar"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="skel skel-line w-3/4"></div>
          <div class="skel skel-line w-1/2"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div class="skel skel-line w-full"></div>
        <div class="skel skel-line w-2/3"></div>
      </div>
      <div style="display:flex;gap:6px;">
        <div class="skel skel-line" style="width:70px;height:24px;border-radius:99px;"></div>
        <div class="skel skel-line" style="width:90px;height:24px;border-radius:99px;"></div>
      </div>
      <div class="skel skel-btn"></div>
    </div>
  `).join('');
}

/* ═════════════════════════════════════════════
   RENDER DOCTORS
   ═════════════════════════════════════════════ */
export function renderDoctors(list, isInitialLoad = false) {
  // On the initial load (called from main.js after fetchDoctorsAPI),
  // populate allDoctors so the filter system has data to work with.
  // On filter calls (from applyFiltersAndSort), isInitialLoad is false
  // so we don't overwrite allDoctors with the already-filtered subset.
  if (isInitialLoad) {
    allDoctors = list;
  }
  // visibleDoctors always reflects what is currently on screen —
  // booking.js uses this to look up which doctor was clicked.
  visibleDoctors = list;

  const grid = document.getElementById('doctorsGrid');
  const count = document.getElementById('resultsCount');

  count.innerHTML = list.length
    ? `Showing <strong>${list.length}</strong> specialist${list.length!==1?'s':''}`
    : '';

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state" role="status">
        <svg width="52" height="52" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="8" stroke="#b8aed4" stroke-width="1.5"/>
          <path d="M21 21l-4.35-4.35" stroke="#b8aed4" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M8 11h6M11 8v6" stroke="#b8aed4" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No specialists match your current filters. Try adjusting your search.</p>
        <button class="reset-btn" onclick="resetFilters()" aria-label="Clear all filters">Clear all filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((doc, idx) => {
    const avail  = daysLabel(doc.available_days);
    const expYrs = doc.experience ? `${doc.experience} yrs exp` : '';
    const price  = doc.price ? `₹${doc.price}` : '';
    const degs   = (doc.degrees||[]).join(' · ');

    return `
    <article class="doctor-card" role="listitem" aria-label="Dr. ${doc.name}, ${doc.specialty}">
      <div class="dc-head">
        <img class="dc-photo" src="${doc.image_url}" alt="Photo of ${doc.name}" loading="lazy" width="60" height="60"/>
        <div class="dc-info">
          <h3>${doc.name}</h3>
          <div class="specialty">${doc.specialty}</div>
          ${doc.location ? `<div class="location"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>${doc.location}</div>` : ''}
          <div class="verified-badge" tabindex="0" aria-label="Verified professional">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4" stroke="#2d7a58" stroke-width="2" stroke-linecap="round"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#2d7a58" stroke-width="1.5"/></svg>
            Verified
            <span class="verified-tooltip" role="tooltip">License verified by Hivemind team</span>
          </div>
        </div>
        <div style="margin-left:auto;flex-shrink:0;">
          <div class="online-badge"><span class="pulse" aria-hidden="true"></span>${doc.available_today ? 'Today' : 'Online'}</div>
        </div>
      </div>

      <!-- Rating row -->
      <div class="dc-rating" aria-label="Rating: ${doc.rating} out of 5, ${doc.reviews} reviews">
        <span class="stars" aria-hidden="true">${starsHtml(doc.rating)}</span>
        <span class="rating-num">${doc.rating}</span>
        <span class="reviews-count">(${doc.reviews} reviews)</span>
      </div>

      <!-- Meta -->
      <div class="dc-meta">
        ${expYrs ? `<div class="dc-meta-item"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#b8aed4" stroke-width="1.5"/><path d="M12 8v4l3 3" stroke="#b8aed4" stroke-width="1.5" stroke-linecap="round"/></svg>${expYrs}</div>` : ''}
        ${degs ? `<div class="dc-meta-item" style="font-size:.74rem;color:var(--ink-faint);">${degs}</div>` : ''}
      </div>

      ${doc.bio ? `<div class="dc-bio">${doc.bio}</div>` : ''}

      ${avail ? `<div class="dc-avail" aria-label="Available days: ${avail}"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#6c4fbf" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6c4fbf" stroke-width="1.5" stroke-linecap="round"/></svg><span>Available: ${avail}</span></div>` : ''}

      <!-- Price row -->
      ${price ? `<div class="dc-price"><span class="price-label">Consultation fee</span><span class="price-val">${price} / session</span></div>` : ''}

      <div class="dc-footer">
        <button class="book-btn" data-idx="${idx}" aria-label="Book appointment with ${doc.name}">
          Book Appointment
        </button>
      </div>
    </article>`;
  }).join('');

  // Attach click handlers
  grid.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = ''; }, 150);
      openCalendar(parseInt(btn.dataset.idx));
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   FILTER + SORT SYSTEM
   ──────────────────────────────────────────────────────────────────
   Three ways to filter: text search, specialty dropdown, filter chips.
   Plus a sort dropdown (rating, price, experience).
   All filters work together — applyFiltersAndSort() runs them all at once.
   ══════════════════════════════════════════════════════════════════ */
let searchDebounceTimer = null; // Used to delay search while user is still typing

/* ── applyFiltersAndSort() ────────────────────────────────────────
   Reads all current filter values, filters the allDoctors array,
   sorts the result, then re-renders the doctor cards.
   Called every time any filter changes.
   ────────────────────────────────────────────────────────────────── */
export function applyFiltersAndSort() {
  const q         = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const specialty = document.getElementById('filterSpecialty').value;
  const sort      = document.getElementById('sortBy').value;

  const todayFilter   = activeChips.has('today');
  const ratingFilter  = activeChips.has('rating');
  const today = new Date().getDay();

  let list = allDoctors.filter(doc => {
    // Text search
    const matchText = !q ||
      (doc.name||'').toLowerCase().includes(q) ||
      (doc.specialty||'').toLowerCase().includes(q) ||
      (doc.bio||'').toLowerCase().includes(q);
    // Specialty
    const matchSpec = !specialty || doc.specialtyKey === specialty;
    // Available today chip
    const matchToday = !todayFilter || doc.available_today;
    // 4★ chip
    const matchRating = !ratingFilter || doc.rating >= 4.0;
    return matchText && matchSpec && matchToday && matchRating;
  });

  // Sort
  if (sort === 'rating')      list = [...list].sort((a,b) => b.rating - a.rating);
  if (sort === 'price-low')   list = [...list].sort((a,b) => a.price - b.price);
  if (sort === 'price-high')  list = [...list].sort((a,b) => b.price - a.price);
  if (sort === 'experience')  list = [...list].sort((a,b) => b.experience - a.experience);

  visibleDoctors = list;
  renderDoctors(list);
}

/* ── filterDoctors() ─────────────────────────────────────────────
   Called on every keystroke in the search box.
   Uses "debouncing" — waits 220ms after the user stops typing before
   actually filtering. Without this, it would re-render on every letter
   typed which is slow and causes flickering.
   ────────────────────────────────────────────────────────────────── */
export function filterDoctors() {
  clearTimeout(searchDebounceTimer); // Cancel the previous timer
  searchDebounceTimer = setTimeout(applyFiltersAndSort, 220); // Start a new one
}

export function toggleChip(id) {
  const chip = document.getElementById('chip-'+id);
  if (activeChips.has(id)) {
    activeChips.delete(id);
    chip.classList.remove('active');
    chip.setAttribute('aria-pressed', 'false');
  } else {
    activeChips.add(id);
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');
  }
  applyFiltersAndSort();
}

/* ── resetFilters() ──────────────────────────────────────────────
   Clears all filters and re-renders the full doctor list.
   Called by the "Clear all filters" button in the empty state.
   ────────────────────────────────────────────────────────────────── */
export function resetFilters() {
  document.getElementById('searchInput').value    = '';
  document.getElementById('filterSpecialty').value = '';
  document.getElementById('sortBy').value          = 'default';
  activeChips.clear();
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-pressed', 'false');
  });
  applyFiltersAndSort();
}
