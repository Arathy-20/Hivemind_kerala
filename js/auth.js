/* ═══════════════════════════════════════════════════════════════
   auth.js — Authentication: session check and logout
═══════════════════════════════════════════════════════════════ */

import { supabase } from './config.js';

function applyNav(name) {
  const loginBtn  = document.getElementById('nav-login-btn');
  const userNav   = document.getElementById('user-nav');
  const navAvatar = document.getElementById('nav-avatar');
  const navName   = document.getElementById('nav-username');
  if (loginBtn)  loginBtn.style.display = 'none';
  if (userNav)   userNav.classList.add('visible');
  if (navAvatar) navAvatar.textContent = name.charAt(0).toUpperCase();
  if (navName)   navName.textContent   = name;
  // Always keep sessionStorage in sync with whoever is shown in nav
  sessionStorage.setItem('hm_user', name);
}

export async function checkAuth() {
  // Clean up hash from Google OAuth redirect
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  // 1. URL param — freshly redirected from login page
  //    login.js does: window.location.href = 'home.html?user=Name'
  //    We read it, save it to sessionStorage, but do NOT strip it here —
  //    stripping it via replaceState before the module finishes loading
  //    caused a race condition where the name was lost on slow connections.
  try {
    const params  = new URLSearchParams(window.location.search);
    const urlName = params.get('user');
    if (urlName) {
      const name = decodeURIComponent(urlName);
      sessionStorage.setItem('hm_user', name);
      applyNav(name);
      return;
    }
  } catch(e) {}

  // 2. sessionStorage — page refresh within the same tab
  try {
    const cached = sessionStorage.getItem('hm_user');
    if (cached) { applyNav(cached); return; }
  } catch(e) {}

  // 3. Supabase session — Google OAuth users whose session is in localStorage
  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      const isOAuthUser   = user.app_metadata?.provider === 'google';
      const wasRegistered = user.user_metadata?.first_name;

      if (isOAuthUser && !wasRegistered) {
        await supabase.auth.signOut();
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

  // 4. localStorage fallback — "Remember Me" was checked on last login
  try {
    const remembered  = localStorage.getItem('hm_user');
    const rememberFlag = localStorage.getItem('hm_remember');
    if (remembered && rememberFlag) {
      applyNav(remembered);
      return;
    }
  } catch(e) {}
}

export async function doLogout() {
  // Clear storage FIRST before any async work
  sessionStorage.removeItem('hm_user');
  localStorage.removeItem('hm_user');
  localStorage.removeItem('hm_remember');

  try { await supabase.auth.signOut(); } catch(e) {}

  window.location.href = 'login.html';
}
