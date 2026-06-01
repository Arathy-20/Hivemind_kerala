/* ═══════════════════════════════════════════════════════════════
   login.js — Authentication logic
   ─────────────────────────────────────────────────────────────
   doLogin()      Email + password sign in
   doSocial()     Google OAuth sign in
   regStep()      3-step registration flow
   doVerify()     OTP verification
   doResend()     Resend OTP
   doForgot()     Password reset email
   switchView()   Switch between login/register/forgot
   showSuccess()  Save session → redirect to home
═══════════════════════════════════════════════════════════════ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* ── Supabase client ─────────────────────────────────────────────
   storage: sessionStorage → session clears when tab closes.
   If "Remember Me" is checked, showSuccess() copies to localStorage.
   ────────────────────────────────────────────────────────────────── */
const supabase = createClient(
  'https://zmekwbeejlkqnrajwplv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZWt3YmVlamxrcW5yYWp3cGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDI1MzgsImV4cCI6MjA4NzIxODUzOH0.vnFDEL7nOjEI-G3dJDY9kXB7ekwj3RqKATrtIZoGJm8',
  { auth: { storage: window.sessionStorage, persistSession: true } }
);

/* ── API wrappers — all Supabase calls are here ────────────────── */
async function apiLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

async function apiRegister({ email, password, firstName, lastName, phone }) {
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { first_name: firstName, last_name: lastName, phone } }
  });
  if (error) throw new Error(error.message);
}

async function apiSendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://arathy-20.github.io/Hivemind/login.html'
  });
  if (error) throw new Error(error.message);
}

async function apiVerifyOTP(token) {
  const { error } = await supabase.auth.verifyOtp({
    email: regData.email, token, type: 'signup'
  });
  if (error) throw new Error(error.message);
}

function switchView(name){
  document.querySelectorAll('.auth-view').forEach(v=>v.classList.remove('active'));
  const el=document.getElementById('view-'+name);if(el)el.classList.add('active');
  if(name==='forgot'){
    document.getElementById('fp-a')?.classList.add('active');
    document.getElementById('fp-b')?.classList.remove('active');
  }
  clearAlerts();
}

function showAlert(id,tid,msg,type='error'){
  const el=document.getElementById(id);
  const tel=document.getElementById(tid);
  if(!el||!tel)return;
  el.className=`alert alert-${type} visible`;
  tel.textContent=msg;
}
function clearAlerts(){document.querySelectorAll('.alert').forEach(a=>a.classList.remove('visible'));}

function toggleEye(iid,eid){
  const i=document.getElementById(iid),e=document.getElementById(eid);
  const s=i.type==='password';
  i.type=s?'text':'password';
  e.innerHTML=s
    ?`<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
    :`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>`;
}

const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function fieldErr(iid,eid,show){
  const i=document.getElementById(iid),e=document.getElementById(eid);
  if(!i||!e)return;
  i.classList.toggle('is-invalid',show);
  e.classList.toggle('show',show);
}

function liveEmail(iid,eid){
  const v=document.getElementById(iid).value.trim();
  if(!v){fieldErr(iid,eid,false);return;}
  fieldErr(iid,eid,!isEmail(v));
  document.getElementById(iid).classList.toggle('is-valid',isEmail(v));
}

function liveStrength(pw){
  const w=document.getElementById('strength-wrap'),b=document.getElementById('strength-bar'),t=document.getElementById('strength-text');
  if(!pw){w.classList.remove('show');return;}
  w.classList.add('show');
  let s=0;
  if(pw.length>=8)s++;if(pw.length>=12)s++;
  if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;
  const L=[{w:'20%',c:'#ef4444',l:'Weak'},{w:'40%',c:'#f97316',l:'Fair'},{w:'60%',c:'#eab308',l:'Good'},{w:'80%',c:'#22c55e',l:'Strong'},{w:'100%',c:'#10b981',l:'Very strong'}];
  const lv=L[Math.min(s,4)];
  b.style.width=lv.w;b.style.background=lv.c;t.textContent=lv.l;t.style.color=lv.c;
}

function liveConfirm(){
  const pw=document.getElementById('r-pw').value,c=document.getElementById('r-confirm').value;
  const err=document.getElementById('r-confirm-err'),ok=document.getElementById('r-confirm-ok'),inp=document.getElementById('r-confirm');
  if(!c){err.classList.remove('show');ok.classList.remove('show');inp.classList.remove('is-invalid','is-valid');return;}
  const m=pw===c;
  err.classList.toggle('show',!m);ok.classList.toggle('show',m);
  inp.classList.toggle('is-invalid',!m);inp.classList.toggle('is-valid',m);
}

function setBusy(id,busy,lbl){
  const b=document.getElementById(id);if(!b)return;
  b.disabled=busy;
  if(busy) b.innerHTML=`<svg style="animation:spin 1s linear infinite" width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" stroke-width="3"/><path d="M12 2a10 10 0 0110 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg> ${lbl}`;
  else b.textContent=lbl;
}

async function doLogin(){
  clearAlerts();
  const email=document.getElementById('login-email').value.trim();
  const pw=document.getElementById('login-pw').value;
  let ok=true;
  if(!email||!isEmail(email)){fieldErr('login-email','login-email-err',true);ok=false;}
  else fieldErr('login-email','login-email-err',false);
  if(pw.length<6){fieldErr('login-pw','login-pw-err',true);ok=false;}
  else fieldErr('login-pw','login-pw-err',false);
  if(!ok)return;
  setBusy('login-btn',true,'Signing in…');
  try{
    const u=await apiLogin(email,pw);
    const name=(u.user_metadata?.first_name||'')+(u.user_metadata?.last_name?' '+u.user_metadata.last_name:'')||u.email;
    showSuccess(name);
  }catch(e){
    let msg = e.message;
    if(msg.toLowerCase().includes('email not confirmed')){
      msg = 'Your email is not confirmed yet. Click below to resend your verification code.';
      setTimeout(()=>{
        const row = document.getElementById('resend-confirm-row');
        if(row) row.style.display='block';
        // Store the email so resend knows where to send
        window._unconfirmedEmail = email;
      }, 100);
    } else if(msg.toLowerCase().includes('invalid login credentials')){
      msg = 'Incorrect email or password. Please check and try again.';
    }
    showAlert('login-alert','login-alert-txt', msg);
  }finally{
    setBusy('login-btn',false,'Sign in to your account');
  }
}

async function doSocial(provider){
  const btn = document.getElementById('google-btn');
  if(btn){ btn.disabled=true; btn.textContent='Checking…'; }

  // Step 1: Use Google to get the user's email without creating a session
  // We can't check email before OAuth redirect, so instead we:
  // After Google redirects back, check if user was already registered via email/password
  // We do this by storing a flag BEFORE redirecting, then checking on homepage

  // Store flag so homepage knows to verify registration
  try { sessionStorage.setItem('hm_oauth_check', '1'); } catch(e){}

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: 'https://arathy-20.github.io/Hivemind/home.html',
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) throw error;
  } catch(e) {
    if(btn){ btn.disabled=false; btn.textContent='Continue with Google'; }
    showAlert('login-alert', 'login-alert-txt', 'Could not connect to Google. Please try again.');
  }
}

let regData={};

function updateStepUI(s){
  for(let i=1;i<=3;i++){
    const c=document.getElementById('rc'+i),l=document.getElementById('rl'+i);
    if(!c)continue;
    c.classList.remove('active','done');l.classList.remove('active','done');
    if(i<s){c.classList.add('done');c.textContent='✓';l.classList.add('done');}
    else if(i===s){c.classList.add('active');c.textContent=i;l.classList.add('active');}
    else{c.textContent=i;}
  }
  for(let i=1;i<=2;i++){
    const ln=document.getElementById('rln'+i);
    if(ln)ln.classList.toggle('done',i<s);
  }
}

function showRegPane(id){
  document.querySelectorAll('.reg-pane').forEach(p=>p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

async function regStep(from,dir){
  clearAlerts();
  if(dir==='back'){updateStepUI(from);showRegPane('rp'+from);return;}
  if(from===1){
    const email=document.getElementById('r-email').value.trim();
    const pw=document.getElementById('r-pw').value;
    const con=document.getElementById('r-confirm').value;
    const terms=document.getElementById('r-terms').checked;
    let ok=true;
    if(!email||!isEmail(email)){fieldErr('r-email','r-email-err',true);ok=false;}else fieldErr('r-email','r-email-err',false);
    if(pw.length<8){fieldErr('r-pw','r-pw-err',true);ok=false;}else fieldErr('r-pw','r-pw-err',false);
    if(pw!==con){fieldErr('r-confirm','r-confirm-err',true);ok=false;}else fieldErr('r-confirm','r-confirm-err',false);
    if(!terms){showAlert('reg-alert','reg-alert-txt','Please agree to the Terms of Service.');ok=false;}
    if(!ok)return;
    regData.email=email;regData.password=pw;
    updateStepUI(2);showRegPane('rp2');
  } else if(from===2){
    const fn=document.getElementById('r-fname').value.trim();
    const ln=document.getElementById('r-lname').value.trim();
    const ph=document.getElementById('r-phone').value.trim();
    let ok=true;
    if(!fn){fieldErr('r-fname','r-fname-err',true);ok=false;}else fieldErr('r-fname','r-fname-err',false);
    if(!ln){fieldErr('r-lname','r-lname-err',true);ok=false;}else fieldErr('r-lname','r-lname-err',false);
    if(!ph||ph.replace(/\D/g,'').length<7){fieldErr('r-phone','r-phone-err',true);ok=false;}else fieldErr('r-phone','r-phone-err',false);
    if(!ok)return;
    const btns=document.querySelectorAll('#rp2 button');
    btns.forEach(b=>b.disabled=true);
    try{
      await apiRegister({email:regData.email,password:regData.password,firstName:fn,lastName:ln,phone:ph});
      regData.firstName=fn;regData.lastName=ln;
    }catch(e){
      showAlert('reg-alert','reg-alert-txt',e.message);
      btns.forEach(b=>b.disabled=false);return;
    }
    btns.forEach(b=>b.disabled=false);
    document.getElementById('otp-email-show').textContent=regData.email;
    updateStepUI(3);showRegPane('rp3');
    startTimer();
    document.querySelectorAll('.otp-box')[0]?.focus();
  } else if(from===3&&dir==='back'){
    updateStepUI(2);showRegPane('rp2');
  }
}

// OTP single input — auto-verify when 6+ digits entered
document.addEventListener('DOMContentLoaded',()=>{
  const inp = document.getElementById('otp-single');
  if(inp){
    inp.addEventListener('input',()=>{
      inp.value = inp.value.replace(/\D/g,'');
      // auto-submit at 8 digits
      if(inp.value.length === 8) doVerify();
    });
  }
});

async function doVerify(){
  const inp = document.getElementById('otp-single');
  const code = inp ? inp.value.trim() : '';
  if(code.length < 8){showAlert('otp-alert','otp-alert-txt','Please enter the full 8-digit code from your email.');return;}
  setBusy('verify-btn',true,'Verifying…');
  try{
    await apiVerifyOTP(code);
    showSuccess(regData.firstName+' '+regData.lastName);
  }catch(e){
    showAlert('otp-alert','otp-alert-txt',e.message);
    const otpInp = document.getElementById('otp-single');
    if(otpInp){ otpInp.value=''; otpInp.focus(); }
  }finally{
    setBusy('verify-btn',false,'Verify & create account');
  }
}

let ti=null;
function startTimer(){
  clearInterval(ti);
  let s=60;
  const btn=document.getElementById('resend-btn');
  btn.disabled=true;
  btn.innerHTML=`Resend in <span class="resend-timer" id="resend-timer">${s}s</span>`;
  ti=setInterval(()=>{
    s--;
    const t=document.getElementById('resend-timer');
    if(t)t.textContent=s+'s';
    if(s<=0){clearInterval(ti);btn.disabled=false;btn.textContent='Resend code';}
  },1000);
}

async function doResend(){
  // Clear the single OTP input
  const inp = document.getElementById('otp-single');
  if(inp) inp.value = '';
  clearAlerts();
  startTimer();
  // Resend signup OTP — call signUp again with same credentials
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: regData.email
  });
  if(error) showAlert('otp-alert','otp-alert-txt', error.message);
}

async function doForgot(){
  clearAlerts();
  const email=document.getElementById('forgot-email').value.trim();
  if(!email||!isEmail(email)){fieldErr('forgot-email','forgot-email-err',true);return;}
  fieldErr('forgot-email','forgot-email-err',false);
  setBusy('forgot-btn',true,'Sending…');
  try{
    await apiSendReset(email);
    document.getElementById('forgot-sent-to').textContent=email;
    document.getElementById('fp-a').classList.remove('active');
    document.getElementById('fp-b').classList.add('active');
  }catch(e){
    showAlert('forgot-alert','forgot-alert-txt',e.message);
  }finally{
    setBusy('forgot-btn',false,'Send reset link');
  }
}

function showSuccess(name){
  try { sessionStorage.setItem('hm_user', name); } catch(e){}
  try {
    const remember = document.getElementById('remember-me')?.checked || window._rememberMe;
    if (remember) {
      localStorage.setItem('hm_user', name);
      localStorage.setItem('hm_remember', '1');
    } else {
      localStorage.removeItem('hm_user');
      localStorage.removeItem('hm_remember');
    }
  } catch(e){}
  window.location.href = 'home.html?user=' + encodeURIComponent(name);
}

document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.getAttribute('role')==='button')e.target.click();
});

// Sign out
async function doLogout(){
  await supabase.auth.signOut();
  switchView('login');
  document.getElementById('login-email').value = '';
  document.getElementById('login-pw').value = '';
}
window.doLogout = doLogout;

// Go back to step 1 (email field) when user wants to change email
function goChangeEmail(){
  updateStepUI(1);
  showRegPane('rp1');
  // Clear email field so user can type a new one
  const emailEl = document.getElementById('r-email');
  if(emailEl){ emailEl.value=''; emailEl.classList.remove('is-valid','is-invalid'); }
  regData = {};
}
window.goChangeEmail = goChangeEmail;

// Resend signup confirmation to unconfirmed email
async function resendConfirmation(){
  const email = window._unconfirmedEmail || document.getElementById('login-email').value.trim();
  if(!email) return;
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if(error) throw error;
    // Hide login form, show OTP screen in register flow
    regData.email = email;
    // Switch to register view at OTP step
    switchView('register');
    updateStepUI(3);
    showRegPane('rp3');
    document.getElementById('otp-email-show').textContent = email;
    startTimer();
    document.getElementById('otp-single')?.focus();
  } catch(e) {
    showAlert('login-alert','login-alert-txt', 'Could not resend: ' + e.message);
  }
}
window.resendConfirmation = resendConfirmation;

// Expose to HTML onclick attributes (required for type="module")
window.switchView   = switchView;

// Show error if redirected back from homepage due to unregistered Google account
(function checkLoginError() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'not_registered') {
    showAlert('login-alert', 'login-alert-txt',
      'No account found for that Google email. Please register first using "Create a free account".');
  }
})();
window.toggleEye    = toggleEye;
window.doLogin      = doLogin;
window.doSocial     = doSocial;
window.doForgot     = doForgot;
window.doVerify     = doVerify;
window.doResend     = doResend;
window.regStep      = regStep;
window.liveEmail    = liveEmail;
window.liveStrength = liveStrength;
window.liveConfirm  = liveConfirm;
