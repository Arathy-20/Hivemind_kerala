/* ═══════════════════════════════════════════════════════════════
   chatbot.js — Myna AI assistant (powered by Google Gemini)
   ─────────────────────────────────────────────────────────────────
   HOW IT WORKS:
   1. User types a message → sendChat() is called
   2. sendChat() builds conversation history (last 10 messages)
   3. Sends to Supabase Edge Function (gemini-proxy) — NOT directly to Gemini
   4. The proxy adds the secret API key server-side and calls Gemini
   5. Gemini's reply comes back and is displayed in the chat window

   WHY A PROXY?
   API keys in frontend JavaScript are visible to anyone (Ctrl+U).
   Google scans public repos and revokes exposed keys automatically.
   The Supabase Edge Function holds the key securely on their servers.
═══════════════════════════════════════════════════════════════ */

import { GEMINI_PROXY_URL } from './config.js';

/* ── CHAT STATE ───────────────────────────────────────────────────
   One object holds all chatbot state — clean and easy to debug.
   ────────────────────────────────────────────────────────────────── */
const HM_CHAT = {
  open: false,       // Is the chat window currently visible?
  messages: [],      // Full conversation history: [{role, content}, ...]
  loading: false,    // Are we waiting for Gemini's reply right now?

  // System prompt: tells Gemini who it is and how to behave.
  // Sent with every request so Gemini never "forgets" its role.
  systemPrompt: `You are Myna, a warm and knowledgeable AI assistant for Hivemind — a mental health booking platform in Kerala, India. Your role is to:

1. Help patients find the right therapist based on their needs
2. Explain how the booking process works (browse doctors → pick a slot → fill details → confirm)
3. Answer questions about mental health support in a caring, non-clinical way
4. Help users navigate the Hivemind platform
5. Provide gentle emotional support and encourage professional help

Available specialists on Hivemind:
- Dr. Ayesha Nair — Clinical Psychologist, Perinthalmanna (Anxiety, Depression, CBT)
- Dr. Fathima Zahra — Child & Adolescent Therapist, Kottakkal (Child Therapy, ADHD)
- Dr. Nancy Thomas — Counseling Psychologist, Malappuram (Marriage Counseling, Grief)
- Dr. Raj Menon — Psychiatrist, Angadippuram (OCD, Bipolar, Medication Management)

Booking fee: ₹800/session. Users must create an account first.
Contact: hivemindkerala@gmail.com | Phone: +91 77369 09085

Important rules:
- Always be warm, empathetic, and non-judgmental
- Never diagnose mental health conditions
- For emergencies or suicidal thoughts, immediately provide iCall helpline: 9152987821
- Keep responses concise (2-4 sentences max unless detailed explanation is needed)
- Respond in the same language the user writes in (Malayalam or English)
- Never reveal that you are built on Gemini or any specific AI model — just say you are Myna`
};

/* ── toggleChat() ─────────────────────────────────────────────────
   Opens/closes the chat window. CSS handles the animation via
   the 'open' class. Shows welcome message on the very first open.
   ────────────────────────────────────────────────────────────────── */
export function toggleChat() {
  HM_CHAT.open = !HM_CHAT.open;
  const btn = document.getElementById('hm-chat-btn');
  const win = document.getElementById('hm-chat-window');
  btn.classList.toggle('open', HM_CHAT.open);
  win.classList.toggle('open', HM_CHAT.open);

  if (HM_CHAT.open && HM_CHAT.messages.length === 0) {
    appendBotMessage("Hi! I'm Myna 👋 I'm here to help you find the right mental health support on Hivemind. What's on your mind today?");
  }
  if (HM_CHAT.open) {
    setTimeout(() => document.getElementById('hm-chat-input')?.focus(), 300);
  }
}

/* ── appendBotMessage(text) ───────────────────────────────────────
   Creates a left-side bubble (Myna's message) and saves to history.
   ────────────────────────────────────────────────────────────────── */
function appendBotMessage(text) {
  const msgs = document.getElementById('hm-chat-messages');
  const div  = document.createElement('div');
  div.className = 'hm-msg bot';
  div.innerHTML = `
    <div class="hm-msg-avatar">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="hm-msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  HM_CHAT.messages.push({ role: 'assistant', content: text });
}

/* ── appendUserMessage(text) ──────────────────────────────────────
   Creates a right-side bubble (user's message) and saves to history.
   Uses the logged-in user's initial as their avatar.
   ────────────────────────────────────────────────────────────────── */
function appendUserMessage(text) {
  const msgs    = document.getElementById('hm-chat-messages');
  const name    = sessionStorage.getItem('hm_user') || localStorage.getItem('hm_user') || 'You';
  const initial = name.charAt(0).toUpperCase();
  const div     = document.createElement('div');
  div.className = 'hm-msg user';
  div.innerHTML = `
    <div class="hm-msg-bubble">${text}</div>
    <div class="hm-msg-avatar" style="background:linear-gradient(135deg,#3d9e78,#2d7a58);">${initial}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  HM_CHAT.messages.push({ role: 'user', content: text });
}

/* ── showTyping() / hideTyping() ──────────────────────────────────
   Shows/hides the animated "..." bubble while waiting for Gemini.
   The three bouncing dots are CSS animation (see .hm-typing in styles.css).
   ────────────────────────────────────────────────────────────────── */
function showTyping() {
  const msgs = document.getElementById('hm-chat-messages');
  const div  = document.createElement('div');
  div.className = 'hm-msg bot';
  div.id        = 'hm-typing-indicator';
  div.innerHTML = `
    <div class="hm-msg-avatar">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="hm-typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
  document.getElementById('hm-typing-indicator')?.remove();
}

/* ── hideQuickReplies() ───────────────────────────────────────────
   Hides the preset question buttons after the user's first message.
   ────────────────────────────────────────────────────────────────── */
function hideQuickReplies() {
  const qr = document.getElementById('hm-quick-replies');
  if (qr) qr.style.display = 'none';
}

/* ── sendChat() ───────────────────────────────────────────────────
   Main function — called on Enter key or send button click.

   FLOW:
   1. Read + clear input, show the user's message
   2. Show typing indicator
   3. Build conversation history in Gemini's required format:
      [{role: 'user'|'model', parts: [{text: '...'}]}]
   4. POST to Supabase Edge Function (adds API key, calls Gemini)
   5. Display Gemini's reply
   6. On error, show friendly fallback message
   ────────────────────────────────────────────────────────────────── */
export async function sendChat() {
  const input = document.getElementById('hm-chat-input');
  const text  = input.value.trim();
  if (!text || HM_CHAT.loading) return; // Guard: no empty/double sends

  input.value = '';
  input.style.height = 'auto';
  hideQuickReplies();
  appendUserMessage(text);

  HM_CHAT.loading = true;
  document.getElementById('hm-chat-send').disabled = true;
  showTyping();

  try {
    // Take last 10 messages and convert to Gemini format
    // Our format: {role: 'user'|'assistant', content: '...'}
    // Gemini format: {role: 'user'|'model', parts: [{text: '...'}]}
    const rawHistory = HM_CHAT.messages.slice(-10);
    const contents   = [];

    for (const m of rawHistory) {
      const role = m.role === 'assistant' ? 'model' : 'user';
      // Gemini requires strictly alternating roles — skip consecutive same-role messages
      if (contents.length > 0 && contents[contents.length - 1].role === role) continue;
      contents.push({ role, parts: [{ text: m.content }] });
    }
    // Gemini requires the conversation to start with a 'user' message
    while (contents.length > 0 && contents[0].role !== 'user') contents.shift();

    const response = await fetch(GEMINI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gemini full error:', JSON.stringify(errData));
      throw new Error('API error ' + response.status);
    }

    const data  = await response.json();
    // Navigate the nested Gemini response structure to get the text
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm having trouble responding right now. Please try again.";

    hideTyping();
    appendBotMessage(reply);

  } catch(e) {
    hideTyping();
    appendBotMessage("I'm having a little trouble connecting right now. Please try again in a moment, or reach us at hivemindkerala@gmail.com 💜");
  } finally {
    // Always re-enable the send button, even if there was an error
    HM_CHAT.loading = false;
    document.getElementById('hm-chat-send').disabled = false;
    document.getElementById('hm-chat-input')?.focus();
  }
}

/* ── sendQuick(text) ─────────────────────────────────────────────
   Called by the preset quick-reply buttons.
   Fills the input and triggers sendChat() as if the user typed it.
   ────────────────────────────────────────────────────────────────── */
export function sendQuick(text) {
  document.getElementById('hm-chat-input').value = text;
  sendChat();
}
