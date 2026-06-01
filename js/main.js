/* ═══════════════════════════════════════════════════════════════
   main.js — App entry point
   ─────────────────────────────────────────────────────────────────
   This file ties everything together.

   IT IS THE ONLY FILE that imports from all others.
   Think of it as the "manager" — it doesn't do much itself,
   but it connects all the pieces and starts the app.

   IMPORT CHAIN:
   main.js
   ├── config.js      (Supabase, constants)
   ├── auth.js        (checkAuth, doLogout)
   ├── doctors.js     (fetchDoctorsAPI, renderDoctors, filters, helpers)
   ├── booking.js     (calendar, form, confirm — imports from doctors.js)
   ├── chatbot.js     (Myna AI — imports GEMINI_PROXY_URL from config.js)
   ├── contact.js     (popup form)
   └── session.js     (upcoming session reminder)

   HOW MODULES WORK:
   Each file uses 'export' to make functions available.
   This file uses 'import' to bring them in.
   The browser downloads all files in parallel — faster than one big file.
═══════════════════════════════════════════════════════════════ */

import { supabase }                             from './config.js';
import { checkAuth, doLogout }                  from './auth.js';
import {
  fetchDoctorsAPI, renderDoctors, renderSkeletons,
  filterDoctors, toggleChip, resetFilters
}                                               from './doctors.js';
import {
  bookedSlots,
  prevMonth, nextMonth,
  goToReview, confirmBooking, setStep,
  openCalendar
}                                               from './booking.js';
import { toggleChat, sendChat, sendQuick }      from './chatbot.js';
import {
  openContactPopup, closeContactPopup,
  copyPhone, submitContactPopup
}                                               from './contact.js';
import { loadUpcomingSession }                  from './session.js';

/* ── WIRE GLOBALS ─────────────────────────────────────────────────
   Module functions are scoped — not accessible from HTML onclick="".
   We assign them to window so the stub functions in the inline
   <script> block (in the HTML file) can call them via window._name().
   This is the bridge between the HTML and the module system.
   ────────────────────────────────────────────────────────────────── */
window._filterDoctors  = filterDoctors;
window._toggleChip     = toggleChip;
window._prevMonth      = prevMonth;
window._nextMonth      = nextMonth;
window._goToReview     = goToReview;
window._confirmBooking = confirmBooking;
window._setStep        = setStep;
window._doLogout       = doLogout;
window.openCalendar    = openCalendar;
window.resetFilters    = resetFilters;
window.toggleChat      = toggleChat;
window.sendChat        = sendChat;
window.sendQuick       = sendQuick;
window.openContactPopup  = openContactPopup;
window.closeContactPopup = closeContactPopup;
window.copyPhone         = copyPhone;
window.submitContactPopup = submitContactPopup;

/* ── init() ───────────────────────────────────────────────────────
   Startup function — runs when the page finishes loading.
   Order matters:
   1. checkAuth()           → show correct nav state (login vs user avatar)
   2. loadUpcomingSession() → show reminder banner if user has a booking
   3. Load booked slots     → so calendar shows real-time availability
   4. renderSkeletons()     → show shimmer placeholders immediately
   5. fetchDoctorsAPI()     → load real doctors from Supabase
   6. renderDoctors()       → replace skeletons with real cards
   ────────────────────────────────────────────────────────────────── */
async function init() {
  checkAuth();
  loadUpcomingSession();

  // Pre-load all existing bookings so the calendar correctly marks taken slots
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('doctor_id, booking_date, booking_time');
    if (bookings) {
      bookings.forEach(b => {
        // Key format: "doctorId-YYYY-MM-DD-hour" → true
        bookedSlots[`${b.doctor_id}-${b.booking_date}-${parseInt(b.booking_time)}`] = true;
      });
    }
  } catch(e) { console.warn('Could not load booked slots:', e); }

  renderSkeletons(6);

  try {
    const doctors = await fetchDoctorsAPI();
    renderDoctors(doctors);
  } catch(e) {
    document.getElementById('doctorsGrid').innerHTML = `
      <div class="empty-state" role="alert">
        <p>Unable to load specialists. Please refresh.</p>
        <button class="reset-btn" onclick="init()">Retry</button>
      </div>`;
  }
}

/* ── Start the app when the page is ready ─────────────────────── */
document.addEventListener('DOMContentLoaded', () => init());
