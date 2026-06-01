/* ═══════════════════════════════════════════════════════════════
   auth.js — Authentication: session check and logout
   ─────────────────────────────────────────────────────────────────
   Hivemind has two login methods:
   1. Email + OTP (via Supabase Auth + Gmail SMTP)
   2. Google OAuth (via Supabase Auth + Google Cloud)

   After login, the user's name is stored in:
   - sessionStorage['hm_user'] — lasts until tab is closed
   - localStorage['hm_user']  — lasts until browser cleared (Remember Me)

   checkAuth() reads from three sources in priority order:
   1. URL param ?user=Name (set by login page redirect)
   2. Supabase session (for Google OAuth)
   3. sessionStorage (for page refreshes)
═══════════════════════════════════════════════════════════════ */

import { supabase } from './config.js';

/* ── applyNav(name) ───────────────────────────────────────────────
   Updates the nav bar to show the logged-in user's avatar + name,
   and hides the "Sign In" button.
   Called by checkAuth() once we know who the user is.
   ────────────────────────────────────────────────────────────────── */
function applyNav(name) {
  const loginBtn  = document.getElementById('nav-login-btn');
  const userNav   = document.getElementById('user-nav');
  const navAvatar = document.getElementById('nav-avatar');
  const navName   = document.getElementById('nav-username');
  if (loginBtn)  loginBtn.style.display = 'none';
  if (userNav)   userNav.classList.add('visible');
  if (navAvatar) navAvatar.textContent = name.charAt(0).toUpperCase();
  if (navName)   navName.textContent   = name;
  sessionStorage.setItem('hm_user', name);
}

/* ── checkAuth() ─────────────────────────────────────────────────
   Runs on every page load. Checks if a user is logged in and
   updates the nav bar accordingly.
   ────────────────────────────────────────────────────────────────── */
export async function checkAuth() {
  // 1. URL param — freshly redirected from email/OTP login
  try {
    const params  = new URLSearchParams(window.location.search);
    const urlName = params.get('user');
    if (urlName) { applyNav(decodeURIComponent(urlName)); return; }
  } catch(e) {}

  // 2. Supabase session — for Google OAuth users
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      const isOAuthUser    = user.app_metadata?.provider === 'google';
      const wasRegistered  = user.user_metadata?.first_name;

      // Block Google users who never completed the registration form
      if (isOAuthUser && !wasRegistered) {
        await supabase.auth.signOut();
        sessionStorage.removeItem('hm_oauth_check');
        window.location.href = 'login.html?error=not_registered';
        return;
      }

      // Use the name they entered during registration (not their Google name)
      const name = (
        ((user.user_metadata?.first_name || '') + ' ' + (user.user_metadata?.last_name || '')).trim() ||
        user.user_metadata?.full_name ||
        user.email.split('@')[0]
      );
      applyNav(name);
      return;
    }
  } catch(e) { console.warn('Auth check:', e); }

  // 3. sessionStorage fallback — same tab, page refresh
  try {
    const cached = sessionStorage.getItem('hm_user');
    if (cached) { applyNav(cached); return; }
  } catch(e) {}
}

/* ── doLogout() ──────────────────────────────────────────────────
   Signs out of Supabase, clears all local storage, redirects to login.
   ────────────────────────────────────────────────────────────────── */
export async function doLogout() {
  try { await supabase.auth.signOut(); } catch(e) {}
  sessionStorage.removeItem('hm_user');
  localStorage.removeItem('hm_user');
  localStorage.removeItem('hm_remember');
  window.location.href = 'login.html';
}
