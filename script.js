'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const $ = id => document.getElementById(id);

const STATUS_LIST = [
  { id: 'free', label: 'Free', emoji: '😊', file: 'free.json' },
  { id: 'teaching', label: 'Teaching', emoji: '', file: 'teaching.json' },
  { id: 'busy', label: 'Busy', emoji: '', file: 'busy.json' },
  { id: 'sad', label: 'Sad', emoji: '😔', file: 'sad.json' },
  { id: 'tired', label: 'Tired', emoji: '😮', file: 'tired.json' },
  { id: 'studying', label: 'Studying', emoji: '', file: 'studying.json' },
  { id: 'sleeping', label: 'Sleeping', emoji: '😴', file: 'sleeping.json' },
  { id: 'working', label: 'Working', emoji: '', file: 'working.json' }
];

const QUOTES = [
  'Even silence feels warm when you exist.',
  'Distance means nothing when someone means everything.',
  'Somewhere, you are my calm place.',
  'You are still in my thoughts.'
];

let MY_ROLE = null;
let PARTNER_ROLE = null;
let myUpdatedAt = null;
let partnerUpdatedAt = null;

// Lottie instances (fix double animation)
let myLottieInstance = null;
let partnerLottieInstance = null;

// Typing
let typingInterval = null;
let quoteIndex = 0, charIndex = 0, deleting = false;

// ---------- ROLE ----------
function initRole() {
  const saved = localStorage.getItem('soulpair_role');
  if (saved) {
    applyRole(saved);
    return;
  }
  document.getElementById('rolePage').classList.remove('hidden');
  document.querySelectorAll('.role-card').forEach(card => {
    card.onclick = () => {
      const role = card.dataset.role;
      localStorage.setItem('soulpair_role', role);
      applyRole(role);
    };
  });
}

function applyRole(role) {
  MY_ROLE = role;
  PARTNER_ROLE = role === 'boy' ? 'girl' : 'boy';
  document.getElementById('rolePage').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  
  const myImg = document.getElementById('myAvatar');
  const partnerImg = document.getElementById('partnerAvatar');
  if (role === 'boy') {
    myImg.src = 'boy.jpg';
    partnerImg.src = 'girl.jpg';
  } else {
    myImg.src = 'girl.jpg';
    partnerImg.src = 'boy.jpg';
  }
  startApp();
}

// ---------- LOTTIE (FIX DOUBLE) ----------
function loadLottie(container, file, isMy = true) {
  // Destroy old instance first
  if (isMy && myLottieInstance) {
    myLottieInstance.destroy();
    myLottieInstance = null;
  } else if (!isMy && partnerLottieInstance) {
    partnerLottieInstance.destroy();
    partnerLottieInstance = null;
  }
  
  container.innerHTML = '';
  
  const instance = lottie.loadAnimation({
    container: container,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: file
  });
  
  if (isMy) myLottieInstance = instance;
  else partnerLottieInstance = instance;
}

// ---------- STATUS UI ----------
function buildStatusGrid() {
  const grid = document.getElementById('statusGrid');
  grid.innerHTML = '';
  STATUS_LIST.forEach(status => {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.innerHTML = `<div class="status-emoji">${status.emoji}</div><div>${status.label}</div>`;
    item.onclick = () => updateStatus(status);
    grid.appendChild(item);
  });
}

async function updateStatus(status) {
  try {
    await db.from('couple_state').upsert({
      role: MY_ROLE,
      current_status: status.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'role' });
    showToast('Status updated');
    closeSheet();
  } catch(e) {
    console.error(e);
    showToast('Error updating');
  }
}

function renderMyStatus(statusId, updatedAt) {
  const status = STATUS_LIST.find(s => s.id === statusId);
  if (!status) return;
  document.getElementById('myStatus').textContent = status.label;
  myUpdatedAt = updatedAt;
  loadLottie(document.getElementById('myLottie'), status.file, true);
  document.getElementById('myTime').textContent = timeAgo(updatedAt);
}

function renderPartnerStatus(statusId, updatedAt) {
  const status = STATUS_LIST.find(s => s.id === statusId);
  if (!status) return;
  document.getElementById('partnerStatus').textContent = status.label;
  partnerUpdatedAt = updatedAt;
  loadLottie(document.getElementById('partnerLottie'), status.file, false);
  document.getElementById('partnerTime').textContent = timeAgo(updatedAt);
}

// ---------- TIMEAGO ----------
function timeAgo(date) {
  if (!date) return 'just now';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function startAutoTimeUpdate() {
  setInterval(() => {
    if (myUpdatedAt) document.getElementById('myTime').textContent = timeAgo(myUpdatedAt);
    if (partnerUpdatedAt) document.getElementById('partnerTime').textContent = timeAgo(partnerUpdatedAt);
  }, 1000);
}

// ---------- REALTIME (WORKING) ----------
function subscribeRealtime() {
  const channel = db.channel('couple-state-realtime');
  channel
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'couple_state' }, 
      (payload) => {
        const row = payload.new;
        if (!row) return;
        if (row.role === MY_ROLE) {
          renderMyStatus(row.current_status, row.updated_at);
        } else if (row.role === PARTNER_ROLE) {
          renderPartnerStatus(row.current_status, row.updated_at);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log(' Realtime connected');
    });
}

// ---------- TYPING ANIMATION (CLEAN) ----------
function startTyping() {
  const el = document.getElementById('typingText');
  if (typingInterval) clearInterval(typingInterval);
  
  typingInterval = setInterval(() => {
    const quote = QUOTES[quoteIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = quote.slice(0, charIndex);
      if (charIndex >= quote.length) deleting = true;
    } else {
      charIndex--;
      el.textContent = quote.slice(0, charIndex);
      if (charIndex <= 0) {
        deleting = false;
        quoteIndex = (quoteIndex + 1) % QUOTES.length;
      }
    }
  }, 70);
}

// ---------- LOAD INITIAL STATE ----------
async function loadState() {
  try {
    const { data } = await db.from('couple_state').select('*');
    if (data) {
      for (let row of data) {
        if (row.role === MY_ROLE) renderMyStatus(row.current_status, row.updated_at);
        if (row.role === PARTNER_ROLE) renderPartnerStatus(row.current_status, row.updated_at);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

// ---------- SHEET ----------
let startY = 0, currentY = 0;
function setupSheet() {
  document.getElementById('openSheetBtn').onclick = openSheet;
  document.getElementById('sheetOverlay').onclick = closeSheet;
  const handle = document.getElementById('sheetHandle');
  handle.addEventListener('touchstart', e => startY = e.touches[0].clientY);
  handle.addEventListener('touchmove', e => currentY = e.touches[0].clientY);
  handle.addEventListener('touchend', () => { if (currentY - startY > 80) closeSheet(); });
}

function openSheet() {
  document.getElementById('sheet').classList.add('active');
  document.getElementById('sheetOverlay').classList.add('active');
}

function closeSheet() {
  document.getElementById('sheet').classList.remove('active');
  document.getElementById('sheetOverlay').classList.remove('active');
}

// ---------- TOAST ----------
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---------- MISS BUTTON ----------
const LONG_PRESS = 2000;
const RING = 364.4;
let pressing = false, pressStart = 0, raf = null;

function setupMissButton() {
  const btn = document.getElementById('missBtn');
  const start = (e) => {
    e.preventDefault();
    pressing = true;
    pressStart = Date.now();
    btn.classList.add('pressing');
    tickPress();
  };
  const cancel = () => {
    if (!pressing) return;
    pressing = false;
    if (raf) cancelAnimationFrame(raf);
    btn.classList.remove('pressing');
    document.getElementById('ringFill').style.strokeDashoffset = RING;
  };
  btn.addEventListener('touchstart', start, { passive: false });
  btn.addEventListener('mousedown', start);
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => btn.addEventListener(ev, cancel));
}

function tickPress() {
  if (!pressing) return;
  const elapsed = Date.now() - pressStart;
  const progress = Math.min(elapsed / LONG_PRESS, 1);
  document.getElementById('ringFill').style.strokeDashoffset = RING * (1 - progress);
  if (progress >= 1) finishPress();
  else raf = requestAnimationFrame(tickPress);
}

async function finishPress() {
  if (!pressing) return;
  pressing = false;
  if (raf) cancelAnimationFrame(raf);
  const btn = document.getElementById('missBtn');
  btn.classList.remove('pressing');
  document.getElementById('ringFill').style.strokeDashoffset = RING;
  
  try {
    await db.from('buzz').insert({ sender_role: MY_ROLE });
    showToast('Flutter sent ');
  } catch(e) {
    console.error(e);
    showToast('Failed to send');
  }
}

function subscribeBuzz() {
  db.channel('buzz-channel')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'buzz' }, 
      (payload) => {
        if (payload.new.sender_role !== MY_ROLE) showBuzz();
      }
    )
    .subscribe();
}

function showBuzz() {
  const overlay = document.getElementById('buzzOverlay');
  overlay.classList.add('active');
  setTimeout(() => overlay.classList.remove('active'), 3000);
}

// ---------- START APP ----------
async function startApp() {
  buildStatusGrid();
  await loadState();
  subscribeRealtime();
  subscribeBuzz();
  startTyping();
  setupSheet();
  setupMissButton();
  startAutoTimeUpdate();
}

// ---------- INIT ----------
initRole();
