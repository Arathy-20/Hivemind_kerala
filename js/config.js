/* ═══════════════════════════════════════════════════════════════
   config.js — App-wide constants and Supabase client
   ─────────────────────────────────────────────────────────────────
   This is the ONLY file that knows about Supabase credentials.
   Every other file imports { supabase } from here.
   If you ever change your Supabase project, you only edit this file.
═══════════════════════════════════════════════════════════════ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* ── Supabase client ──────────────────────────────────────────────
   The anon key is safe to expose — it only has public read/write
   access that you control via Row Level Security in Supabase dashboard.
   ────────────────────────────────────────────────────────────────── */
export const supabase = createClient(
  'https://zmekwbeejlkqnrajwplv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZWt3YmVlamxrcW5yYWp3cGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDI1MzgsImV4cCI6MjA4NzIxODUzOH0.vnFDEL7nOjEI-G3dJDY9kXB7ekwj3RqKATrtIZoGJm8'
);

/* ── Booking time slots ───────────────────────────────────────────
   Hours available for appointments (24h format, skipping 12 = lunch)
   ────────────────────────────────────────────────────────────────── */
export const HOURS     = [9, 10, 11, 13, 14, 15, 16];

/* ── Calendar label arrays ───────────────────────────────────────── */
export const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MONTHS    = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];

/* ── Supabase proxy URL for Gemini (Edge Function) ────────────────
   Never call Gemini directly from the browser — use this proxy.
   The proxy holds the Gemini API key securely on Supabase servers.
   ────────────────────────────────────────────────────────────────── */
export const GEMINI_PROXY_URL = 'https://zmekwbeejlkqnrajwplv.supabase.co/functions/v1/gemini-proxy';
