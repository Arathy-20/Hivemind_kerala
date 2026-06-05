/* ═══════════════════════════════════════════════════════════════
   booking.js — Multi-step booking flow
   ─────────────────────────────────────────────────────────────────
   THE 4-STEP BOOKING FLOW:
   Step 1 — Calendar: user picks a date and time slot
   Step 2 — Form: user enters their name, phone, email, note
   Step 3 — Review: user checks all details before confirming
   Step 4 — Success: booking saved to Supabase, reference shown

   KEY CONCEPTS USED HERE:
   - openCalendar(idx): starts the booking for a chosen doctor
   - renderCalendar(): draws the month grid (disables past/unavailable days)
   - renderSlots(ds): shows time slots for the selected date
   - validateForm(): checks required fields before Step 3
   - confirmBooking(): saves to Supabase, shows success screen
   - bookedSlots: a shared object {doctorId-date-hour: true} that
     prevents double-bookings across all users in real time
═══════════════════════════════════════════════════════════════ */

import { supabase, HOURS, MONTHS, DAY_NAMES } from './config.js';
import { parseAvailableDays, parseExcludedDates, fmtDate, generateRef, visibleDoctors } from './doctors.js';

// Shared booking state — tracks what the user has selected so far
export let currentDoctor = null;
export let currentYear, currentMonth, selectedDate, selectedSlot;
export let bookedSlots = {};  // key: "doctorId-date-hour" → true

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
   BOOKING STEP INDICATOR
   ──────────────────────────────────────────────────────────────────
   The 4-step progress bar at the top of the booking page.
   setStep(n) marks steps before n as 'done' (green ✓),
   step n as 'active' (purple), and steps after n as inactive.
   ══════════════════════════════════════════════════════════════════ */
export function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    const circ  = document.getElementById(`step-circle-${i}`);
    const label = document.getElementById(`step-label-${i}`);
    if (!circ) continue;
    circ.classList.remove('active','done');
    label.classList.remove('active','done');
    if (i < n)       { circ.classList.add('done');  label.classList.add('done');  circ.textContent = '✓'; }
    else if (i === n){ circ.classList.add('active'); label.classList.add('active'); if(i>1) circ.textContent = i; }
    else             { circ.textContent = i; }
  }
  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById(`step-line-${i}`);
    if (line) line.classList.toggle('done', i < n);
  }
}

/* ══════════════════════════════════════════════════════════════════
   CALENDAR — Date picker for booking
   ──────────────────────────────────────────────────────────────────
   openCalendar(idx) — opens the booking page for the doctor at
     index idx in the visibleDoctors array.
   renderCalendar() — draws the current month grid, marking
     unavailable days (past, wrong weekday, excluded dates) as disabled.
   renderSlots(ds) — shows available time slots for a selected date.
   selectDate(ds) / selectSlot(ds, hour, timeStr) — handle user picks.

   FIX: visibleDoctors is now imported from doctors.js so openCalendar(idx)
   can correctly look up which doctor the user clicked "Book" on.
   ══════════════════════════════════════════════════════════════════ */
export function openCalendar(idx) {
  currentDoctor = visibleDoctors[idx];
  if (!currentDoctor) return;
  const now = new Date();
  currentYear = now.getFullYear(); currentMonth = now.getMonth();
  selectedDate = null; selectedSlot = null;
  document.getElementById('calDocPhoto').src  = currentDoctor.image_url;
  document.getElementById('calDocPhoto').alt  = `Photo of ${currentDoctor.name}`;
  document.getElementById('calDocName').textContent = currentDoctor.name;
  document.getElementById('calDocSpec').textContent = `${currentDoctor.specialty} · ${currentDoctor.experience} yrs exp · ₹${currentDoctor.price}/session`;
  renderCalendar(); renderSlots(null);
  setStep(1);
  showBview('calendar'); showPage('booking');
}

export function renderCalendar() {
  document.getElementById('calMonthYear').textContent = `${MONTHS[currentMonth]} ${currentYear}`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const today       = new Date(); today.setHours(0,0,0,0);
  const avail       = parseAvailableDays(currentDoctor.available_days);
  const excl        = parseExcludedDates(currentDoctor.excluded_dates || []);

  for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div role="gridcell"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date     = new Date(currentYear, currentMonth, d);
    const ds       = fmtDate(currentYear, currentMonth+1, d);
    const isPast   = date < today;
    const isWork   = avail.has(date.getDay());
    const isExcl   = excl.has(ds);
    const disabled = isPast || !isWork || isExcl;
    const isToday  = date.getTime() === today.getTime();
    const isSel    = selectedDate === ds;
    let cls = 'cal-day';
    if (disabled) cls += ' disabled';
    else if (isSel) cls += ' selected';
    if (isToday && !isSel) cls += ' today';
    const ariaLabel = `${d} ${MONTHS[currentMonth]}${disabled?' (unavailable)':''}${isSel?' (selected)':''}`;
    grid.innerHTML += `<div class="${cls}" role="gridcell" ${!disabled ? `onclick="window._selectDate('${ds}')" tabindex="0" onkeypress="if(event.key==='Enter')window._selectDate('${ds}')"` : 'aria-disabled="true"'} aria-label="${ariaLabel}">${d}</div>`;
  }
}

export function renderSlots(ds) {
  const container = document.getElementById('slotsContainer');
  const label     = document.getElementById('slotDateLabel');
  if (!ds) {
    label.textContent = 'Select a date to view slots';
    container.innerHTML = `<div class="slots-empty"><svg width="44" height="44" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v4l3 3" stroke="#b8aed4" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="#b8aed4" stroke-width="1.5"/></svg><p>Pick a date from the calendar</p></div>`;
    return;
  }
  const dateObj = new Date(ds+'T00:00:00');
  label.textContent = dateObj.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  container.innerHTML = HOURS.map(h => {
    const key   = `${currentDoctor.id}-${ds}-${h}`;
    const taken = !!bookedSlots[key];
    const time  = `${String(h).padStart(2,'0')}:00 – ${String(h+1).padStart(2,'0')}:00`;
    // Block slots in the past for today
    const isPastSlot = ds === todayStr && h <= currentHour;
    if (isPastSlot) return `<div class="slot-taken" role="button" aria-label="${time} - Past" aria-disabled="true" style="opacity:.45;"><span>${time}</span><span></span></div>`;
    if (taken) return `<div class="slot-taken" role="button" aria-label="${time} - Booked" aria-disabled="true"><span>${time}</span><span>Booked</span></div>`;
    return `<div class="slot-avail" role="button" tabindex="0" aria-label="Book ${time}" onclick="window._selectSlot('${ds}',${h},'${time}')" onkeypress="if(event.key==='Enter')window._selectSlot('${ds}',${h},'${time}')"><span>${time}</span><span>Book →</span></div>`;
  }).join('');
}

export function selectDate(ds) {
  selectedDate = ds; selectedSlot = null;
  renderCalendar(); renderSlots(ds);
}

export function selectSlot(ds, hour, timeStr) {
  selectedSlot = { ds, hour, timeStr };
  const niceDate = new Date(ds+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('formDocName').textContent = currentDoctor.name;
  document.getElementById('formDate').textContent    = niceDate;
  document.getElementById('formTime').textContent    = timeStr;
  // Clear form
  ['patientName','patientPhone','patientEmail','patientNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['nameError','phoneError','emailError'].forEach(id => document.getElementById(id)?.classList.remove('visible'));
  document.getElementById('formError').classList.remove('visible');
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('invalid'));
  setStep(2);
  showBview('form');
}

/* ══════════════════════════════════════════════════════════════════
   FORM VALIDATION
   ──────────────────────────────────────────────────────────────────
   Checks that the patient has filled in required fields correctly
   before they can proceed to the review step.
   Returns true if all valid, false if any field has an error.
   Shows/hides inline error messages under each field.
   ══════════════════════════════════════════════════════════════════ */
export function validateForm() {
  let valid = true;
  const name  = document.getElementById('patientName').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const email = document.getElementById('patientEmail').value.trim();

  // Name
  if (!name) {
    document.getElementById('patientName').classList.add('invalid');
    document.getElementById('nameError').classList.add('visible');
    valid = false;
  } else {
    document.getElementById('patientName').classList.remove('invalid');
    document.getElementById('nameError').classList.remove('visible');
  }
  // Phone
  if (!phone || phone.replace(/\D/g,'').length < 7) {
    document.getElementById('patientPhone').classList.add('invalid');
    document.getElementById('phoneError').classList.add('visible');
    valid = false;
  } else {
    document.getElementById('patientPhone').classList.remove('invalid');
    document.getElementById('phoneError').classList.remove('visible');
  }
  // Email (optional but validate format if provided)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('patientEmail').classList.add('invalid');
    document.getElementById('emailError').classList.add('visible');
    valid = false;
  } else {
    document.getElementById('patientEmail').classList.remove('invalid');
    document.getElementById('emailError').classList.remove('visible');
  }
  return valid;
}

/* ══════════════════════════════════════════════════════════════════
   STEP 3 — REVIEW / BOOKING SUMMARY
   ══════════════════════════════════════════════════════════════════ */
export function goToReview() {
  if (!validateForm()) return;
  const name  = document.getElementById('patientName').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const email = document.getElementById('patientEmail').value.trim();
  const note  = document.getElementById('patientNote').value.trim();
  const niceDate = new Date(selectedSlot.ds+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  const rows = [
    { label: 'Doctor',    val: currentDoctor.name },
    { label: 'Specialty', val: currentDoctor.specialty },
    { label: 'Date',      val: niceDate },
    { label: 'Time',      val: selectedSlot.timeStr },
    { label: 'Location',  val: currentDoctor.location },
    { label: 'Patient',   val: name },
    { label: 'Phone',     val: phone },
    { label: 'Email',     val: email || '—' },
    { label: 'Note',      val: note || '—' },
    { label: 'Fee',       val: `₹${currentDoctor.price}`, highlight: true },
  ];

  document.getElementById('reviewContent').innerHTML = rows.map(r =>
    `<div class="summary-row">
       <span class="summary-label">${r.label}</span>
       <span class="summary-val ${r.highlight?'summary-price':''}">${r.val}</span>
     </div>`
  ).join('');

  document.getElementById('reviewError').classList.remove('visible');
  setStep(3);
  showBview('review');
}

/* ══════════════════════════════════════════════════════════════════
   STEP 4 — CONFIRM BOOKING
   ══════════════════════════════════════════════════════════════════ */
export async function confirmBooking() {
  const btn = document.getElementById('confirmBtn');
  const errEl = document.getElementById('reviewError');
  btn.disabled = true;
  btn.innerHTML = `<svg style="animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.35)" stroke-width="3"/><path d="M12 2a10 10 0 0110 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>Confirming…`;

  const name  = document.getElementById('patientName').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const email = document.getElementById('patientEmail').value.trim();
  const note  = document.getElementById('patientNote').value.trim();

  const payload = {
    doctor_id:    currentDoctor.id,
    doctor_name:  currentDoctor.name,
    booking_date: selectedSlot.ds,
    booking_time: selectedSlot.hour,
    patient_name: name,
    patient_phone: phone,
    patient_email: email,
    patient_note:  note,
    price:         currentDoctor.price,
  };

  let result;
  try {
    result = await submitBookingAPI(payload);
  } catch(e) {
    errEl.textContent = 'Booking failed. Please try again.';
    errEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Confirm Appointment';
    return;
  }

  // Mark slot as taken locally
  bookedSlots[`${currentDoctor.id}-${selectedSlot.ds}-${selectedSlot.hour}`] = true;

  const niceDate = new Date(selectedSlot.ds+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  document.getElementById('successMsg').textContent = `Your appointment is confirmed with ${currentDoctor.name} on ${niceDate} at ${selectedSlot.timeStr}. See you soon!`;
  document.getElementById('sPatient').textContent  = name;
  document.getElementById('sDoctor').textContent   = `${currentDoctor.name} · ${currentDoctor.specialty}`;
  document.getElementById('sDate').textContent     = niceDate;
  document.getElementById('sTime').textContent     = selectedSlot.timeStr;
  document.getElementById('sFee').textContent      = `₹${currentDoctor.price}`;
  document.getElementById('sLocation').textContent = currentDoctor.location + ', Kerala';
  document.getElementById('bookingRefNum').textContent = result.ref;

  btn.disabled = false;
  btn.textContent = 'Confirm Appointment';
  setStep(4);
  showBview('success');
}

export function prevMonth(){ currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} selectedDate=null;selectedSlot=null; renderCalendar(); renderSlots(null); }
export function nextMonth(){ currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} selectedDate=null;selectedSlot=null; renderCalendar(); renderSlots(null); }
