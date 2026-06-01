/* ═══════════════════════════════════════════════════════════════
   contact.js — Contact form popup
   ─────────────────────────────────────────────────────────────────
   The contact form sends emails via Formspree — a free service that
   receives form submissions and emails them to hivemindkerala@gmail.com.
   No backend needed. Formspree URL: https://formspree.io/f/xvzdpnwe
═══════════════════════════════════════════════════════════════ */

/* ── openContactPopup(e) ─────────────────────────────────────────
   Shows the modal overlay. overflow:hidden locks the page scroll
   so the user can't scroll the background while the modal is open.
   ────────────────────────────────────────────────────────────────── */
export function openContactPopup(e) {
  if (e) e.preventDefault();
  document.getElementById('contact-popup').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/* ── closeContactPopup() ─────────────────────────────────────────
   Hides the modal and resets it to initial state so it's
   clean if the user opens it again later.
   ────────────────────────────────────────────────────────────────── */
export function closeContactPopup() {
  document.getElementById('contact-popup').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('popup-form').style.display    = 'block';
  document.getElementById('popup-success').style.display = 'none';
  document.getElementById('popup-form').reset();
}

/* ── copyPhone(btn) ──────────────────────────────────────────────
   Copies the phone number to clipboard and shows a "Copied!" tooltip.
   Uses the Clipboard API (modern browsers only).
   ────────────────────────────────────────────────────────────────── */
export function copyPhone(btn) {
  navigator.clipboard.writeText('+917736909085').then(() => {
    const tip = btn.querySelector('.copy-tip');
    tip.style.display       = 'block';
    btn.style.borderColor   = '#3d9e78';
    btn.style.color         = '#3d9e78';
    setTimeout(() => {
      tip.style.display     = 'none';
      btn.style.borderColor = 'var(--border)';
      btn.style.color       = 'var(--ink-soft)';
    }, 2000);
  });
}

/* ── submitContactPopup(e) ───────────────────────────────────────
   Submits the contact form to Formspree via fetch (no page reload).
   e.preventDefault() stops the default browser form submission.
   On success: shows the thank-you message inside the popup.
   On failure: shows an alert with the direct email address.
   ────────────────────────────────────────────────────────────────── */
export async function submitContactPopup(e) {
  e.preventDefault();
  const btn     = document.getElementById('pop-btn');
  const name    = document.getElementById('pop-name').value.trim();
  const email   = document.getElementById('pop-email').value.trim();
  const message = document.getElementById('pop-message').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('https://formspree.io/f/xvzdpnwe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        message,
        _subject: `Hivemind Contact from ${name}`,
        _replyto: email
      })
    });

    if (res.ok) {
      document.getElementById('popup-form').style.display    = 'none';
      document.getElementById('popup-success').style.display = 'block';
    } else {
      throw new Error();
    }
  } catch(err) {
    btn.disabled    = false;
    btn.textContent = 'Send Message →';
    alert('Could not send. Please email us at hivemindkerala@gmail.com');
  }
}

/* ── Close popup when clicking the dark overlay background ────── */
document.addEventListener('click', e => {
  const popup = document.getElementById('contact-popup');
  if (popup && e.target === popup) closeContactPopup();
});
