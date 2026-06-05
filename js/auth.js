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
   2. sessionStorage (fastest — set by the URL param handler on first load)
   3. Supabase session (for Google OAuth users on page refresh)
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

   FIX: Priority order changed so sessionStorage (the current session's
   name written by the URL param on first load) always wins over the
   Supabase session object. This prevents a previous user's Supabase
   session (stored in localStorage by the default Supabase client) from
   overwriting the newly logged-in user's name.
   ────────────────────────────────────────────────────────────────── */
export async function checkAuth() {
  // Clean up the URL after Google OAuth redirect
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  // 1. URL param — freshly redirected from email/OTP login
  //    Also saves to sessionStorage so refreshes keep the right name.
  try {
    const params  = new URLSearchParams(window.location.search);
    const urlName = params.get('user');
    if (urlName) {
      const name = decodeURIComponent(urlName);
      sessionStorage.setItem('hm_user', name);
      applyNav(name);
      // Clean the ?user= param from the URL bar (looks cleaner)
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
  } catch(e) {}

  // 2. sessionStorage — same tab after URL param was consumed on first load
  //    This runs on every refresh and correctly reflects the current session.
  try {
    const cached = sessionStorage.getItem('hm_user');
    if (cached) { applyNav(cached); return; }
  } catch(e) {}

  // 3. Supabase session — only reached for Google OAuth users who have no
  //    sessionStorage entry yet (e.g. first load after OAuth redirect with
  //    hash token instead of ?user= param)
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      const isOAuthUser   = user.app_metadata?.provider === 'google';
      const wasRegistered = user.user_metadata?.first_name;

      // Block Google users who never completed the registration form
      if (isOAuthUser && !wasRegistered) {
        await supabase.auth.signOut();
        sessionStorage.removeItem('hm_oauth_check');
        window.location.href = 'login.html?error=not_registered';
        return;
      }

      const name = (
        ((user.user_metadata?.first_name || '') + ' ' + (user.user_metadata?.last_name || '')).trim() ||
        user.user_metadata?.full_name ||
        user.email.split('@')[0]
      );
      applyNav(name);
      return;
    }
  } catch(e) { console.warn('Auth check:', e); }
}

/* ── doLogout() ──────────────────────────────────────────────────
   Signs out of Supabase, clears ALL storage keys, redirects to login.

   FIX: sessionStorage is now cleared BEFORE the redirect so the inline
   script in home.html (which runs on every DOMContentLoaded) cannot
   read the old name and re-apply it to the nav during the redirect flash.
   ────────────────────────────────────────────────────────────────── */
export async function doLogout() {
  // Clear storage FIRST — before anything async — so no stale name flashes
  sessionStorage.removeItem('hm_user');
  localStorage.removeItem('hm_user');
  localStorage.removeItem('hm_remember');

  // Then sign out of Supabase (async, clears the session token)
  try { await supabase.auth.signOut(); } catch(e) {}

  window.location.href = 'login.html';
}
