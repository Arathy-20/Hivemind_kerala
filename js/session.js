/* ═══════════════════════════════════════════════════════════════
   session.js — Upcoming session reminder banner
   ─────────────────────────────────────────────────────────────────
   Shows a reminder banner at the top of the homepage if the
   logged-in user has an upcoming appointment.

   FLOW:
   1. Get patient name from sessionStorage / localStorage / URL param
   2. Query Supabase bookings table filtered by patient_name + future dates
   3. Find the next slot that hasn't passed yet (today's past slots excluded)
   4. Calculate countdown: days / hours / minutes until appointment
   5. Update banner text and make it visible
═══════════════════════════════════════════════════════════════ */

import { supabase } from './config.js';

export /* ── loadUpcomingSession() ────────────────────────────────────────
   Shows the reminder banner at the top of the homepage if the
   logged-in user has an upcoming appointment.

   Flow:
   1. Get the patient's name from storage
   2. Query Supabase bookings table for their future bookings
   3. Find the next upcoming slot (not already passed)
   4. Calculate how far away it is (days/hours/minutes)
   5. Update the banner HTML and make it visible
   ────────────────────────────────────────────────────────────────── */
export async function loadUpcomingSession() {
  // Get patient name from storage — used to look up their bookings
                      localStorage.getItem('hm_user') ||
                      new URLSearchParams(window.location.search).get('user');
  if (!patientName) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Fetch upcoming bookings for this patient
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('patient_name', patientName)
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error || !bookings || bookings.length === 0) return;

    // Find the next upcoming slot (not already passed today)
    const next = bookings.find(b => {
      if (b.booking_date > today) return true;
      if (b.booking_date === today && parseInt(b.booking_time) > currentHour) return true;
      return false;
    });

    if (!next) return;

    // Format date nicely
    const dateObj = new Date(next.booking_date + 'T00:00:00');
    const niceDate = dateObj.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const hour = parseInt(next.booking_time);
    const timeStr = `${String(hour).padStart(2,'0')}:00 – ${String(hour+1).padStart(2,'0')}:00`;

    // Calculate countdown
    const apptDate = new Date(next.booking_date + 'T' + String(hour).padStart(2,'0') + ':00:00');
    const now = new Date();
    const diffMs = apptDate - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let countdown = '';
    if (diffDays > 0) countdown = `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    else if (diffHours > 0) countdown = `In ${diffHours}h ${diffMins}m`;
    else if (diffMins > 0) countdown = `In ${diffMins} minutes`;
    else countdown = 'Starting now';

    // Update the banner
    document.getElementById('reminder-detail').textContent =
      `${next.doctor_name} · ${next.doctor_name.includes('Dr') ? '' : 'Session'}`;
    document.getElementById('reminder-detail').textContent =
      next.doctor_name;
    document.getElementById('reminder-time').textContent =
      `${niceDate} · ${timeStr}`;
    document.getElementById('reminder-countdown').textContent = countdown;

    // Show the banner
    document.getElementById('reminder-banner').classList.add('visible');
  } catch(e) {
    console.warn('Could not load upcoming session:', e);
  }
}
