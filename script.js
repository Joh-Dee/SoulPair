'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

// ============ DOM READY ============

let db;
let MY_ROLE = '';
let PARTNER_ROLE = '';
let myAnim = null;
let partnerAnim = null;
let myUpdatedAt = null;
let partnerUpdatedAt = null;

const $ = id => document.getElementById(id);

const STATUS = [
  { id: 'free', label: 'Free', file: 'free.json' },
  { id: 'teaching', label: 'Teaching', file: 'teaching.json' },
  { id: 'busy', label: 'Busy', file: 'busy.json' },
  { id: 'eating', label: 'eating', file: 'eating.json' },
  { id: 'tired', label: 'Tired', file: 'tired.json' },
  { id: 'studying', label: 'Studying', file: 'studying.json' },
  { id: 'sleeping', label: 'Sleeping', file: 'sleeping.json' },
  { id: 'working', label: 'Working', file: 'working.json' }
];

const QUOTES = [
  'Even silence feels warm when you exist.',
  'Distance means nothing when someone means everything.',
  'You are still in my thoughts.',
  'Somewhere, you are my calm place.'
];

// ============ INIT ============

document.addEventListener('DOMContentLoaded', () => {
  // Supabase client ဖန်တီး
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error(' Supabase CDN not loaded');
    return;
  }

  init();
});

function init() {
  const saved = localStorage.getItem('soulpair_role');

  // Valid role ရှိရင် Main App တန်းဝင်
  if (saved === 'boy' || saved === 'girl') {
    applyRole(saved);
    return;
  }

  // Invalid data ရှင်းပြီး Role Page ပြ
  localStorage.removeItem('soulpair_role');

  // Role cards ကို Event Listener ချိတ်
  const cards = document.querySelectorAll('.role-card');

  cards.forEach(card => {
    const handleSelect = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const role = card.dataset.role;
      if (!role) return;

      localStorage.setItem('soulpair_role', role.toLowerCase());
      applyRole(role.toLowerCase());
    };

    // Click နဲ့ Touch နှစ်မျိုးလုံးအတွက်
    card.addEventListener('click', handleSelect);
    card.addEventListener('touchend', handleSelect);
  });
}

// ============ APPLY ROLE ============

function applyRole(role) {
  role = role.toLowerCase();

  if (role === 'boy') {
    MY_ROLE = 'boy';
    PARTNER_ROLE = 'girl';
    $('myAvatar').src = 'boy.jpg';
    $('partnerAvatar').src = 'girl.jpg';
  } else {
    MY_ROLE = 'girl';
    PARTNER_ROLE = 'boy';
    $('myAvatar').src = 'girl.jpg';
    $('partnerAvatar').src = 'boy.jpg';
  }

  // Page switch
  $('rolePage').classList.add('hidden');
  $('app').classList.remove('hidden');

  startApp();
}

// ============ START APP ============

async function startApp() {
  buildStatusList();
  await loadStates();
  subscribeRealtime();
  subscribeBuzz();
  setupSheet();
  setupFlutter();
  startTyping();
  setInterval(updateTimes, 1000);
}

// ============ BUILD STATUS LIST ============

function buildStatusList() {
  $('statusList').innerHTML = '';

  STATUS.forEach(status => {
    const div = document.createElement('div');
    div.className = 'status-item';
    div.textContent = status.label;

    div.addEventListener('click', () => updateStatus(status));
    div.addEventListener('touchend', (e) => {
      e.preventDefault();
      updateStatus(status);
    });

    $('statusList').appendChild(div);
  });
}

// ============ UPDATE STATUS ============

async function updateStatus(status) {
  const now = new Date().toISOString();

  const { error } = await db
    .from('couple_state')
    .upsert({
      role: MY_ROLE,
      current_status: status.id,
      updated_at: now
    }, {
      onConflict: 'role'
    });

  if (error) {
    console.error('Update error:', error);
    showToast('Failed to update');
    return;
  }

  renderMy(status.id, now);
  closeSheet();
  showToast('Status updated ');
}

// ============ LOAD STATES ============

async function loadStates() {
  const { data, error } = await db
    .from('couple_state')
    .select('*');

  if (error) {
    console.error('Load error:', error);
    return;
  }

  if (!data) return;

  data.forEach(row => {
    if (row.role === MY_ROLE) {
      renderMy(row.current_status, row.updated_at);
    }
    if (row.role === PARTNER_ROLE) {
      renderPartner(row.current_status, row.updated_at);
    }
  });
}

// ============ RENDER ============

function renderMy(statusId, time) {
  const status = STATUS.find(s => s.id === statusId);
  if (!status) return;

  $('myStatus').textContent = status.label;
  myUpdatedAt = time;
  loadLottie('my', status.file);
}

function renderPartner(statusId, time) {
  const status = STATUS.find(s => s.id === statusId);
  if (!status) return;

  $('partnerStatus').textContent = status.label;
  partnerUpdatedAt = time;
  loadLottie('partner', status.file);
}

// ============ LOTTIE ============

function loadLottie(type, file) {
  const container = type === 'my' ? $('myLottie') : $('partnerLottie');

  // ရှိပြီးသား animation ကို ဖျက်
  if (type === 'my' && myAnim) {
    myAnim.destroy();
    myAnim = null;
  }
  if (type === 'partner' && partnerAnim) {
    partnerAnim.destroy();
    partnerAnim = null;
  }

  // Container ရှင်း
  container.innerHTML = '';

  // Animation အသစ် ဖန်တီး
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: file
  });

  if (type === 'my') {
    myAnim = anim;
  } else {
    partnerAnim = anim;
  }
}

// ============ REALTIME ============

// ============ REALTIME ============

function subscribeRealtime() {
  db.channel('couple-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_state' },
      payload => {
        const row = payload.new;
        if (!row) return;

        if (row.role === PARTNER_ROLE) {
          renderPartner(row.current_status, row.updated_at);
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        console.log(' Realtime connected!');
      }
    });
}

// ============ TIME ============

function updateTimes() {
  if (myUpdatedAt) {
    $('myTime').textContent = timeAgo(myUpdatedAt);
  }
  if (partnerUpdatedAt) {
    $('partnerTime').textContent = timeAgo(partnerUpdatedAt);
  }
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date)) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

// ============ TYPING ============

// ============ TYPING ============

let quoteIndex = 0;
let charIndex = 0;
let deleting = false;
let typingTimer = null;
let isTypingPaused = false;

function startTyping() {
  const el = $('typingText');

  function type() {
    if (isTypingPaused) return;

    const quote = QUOTES[quoteIndex];

    if (!deleting) {
      el.textContent = quote.slice(0, charIndex++);
      if (charIndex > quote.length) {
        deleting = true;
        typingTimer = setTimeout(type, 2000);
        return;
      }
      typingTimer = setTimeout(type, 160);
    } else {
      el.textContent = quote.slice(0, charIndex--);
      if (charIndex < 0) {
        deleting = false;
        quoteIndex = (quoteIndex + 1) % QUOTES.length;
        typingTimer = setTimeout(type, 600);
        return;
      }
      typingTimer = setTimeout(type, 26);
    }
  }

  type();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isTypingPaused = true;
      clearTimeout(typingTimer);
    } else {
      isTypingPaused = false;
      type();
    }
  });
        }
// ============ SHEET ============

function setupSheet() {
  $('openSheetBtn').addEventListener('click', openSheet);

  $('openSheetBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    openSheet();
  });

  $('overlay').addEventListener('click', closeSheet);

  $('overlay').addEventListener('touchend', (e) => {
    e.preventDefault();
    closeSheet();
  });

  // ===== Browser / Android Back Button =====
  window.addEventListener('popstate', () => {
    if ($('sheet').classList.contains('active')) {
      closeSheetSilent();
    }
  });

  // ===== Swipe Down =====
  let startY = 0;
  let endY = 0;

  $('sheetHandle').addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  });

  $('sheetHandle').addEventListener('touchmove', (e) => {
    endY = e.touches[0].clientY;
  });

  $('sheetHandle').addEventListener('touchend', () => {
    if (endY - startY > 80) {
      closeSheet();
    }

    startY = 0;
    endY = 0;
  });
}

// ===== OPEN =====
function openSheet() {

  // Prevent duplicate history states
  if ($('sheet').classList.contains('active')) return;

  $('sheet').classList.add('active');
  $('overlay').classList.add('active');

  // Push history state safely
  history.pushState(
    { sheetOpen: true },
    '',
    window.location.href
  );
}

// ===== CLOSE =====
function closeSheet() {

  if (!$('sheet').classList.contains('active')) return;

  $('sheet').classList.remove('active');
  $('overlay').classList.remove('active');

  // Only go back if this state belongs to sheet
  if (history.state && history.state.sheetOpen) {
    history.back();
  }
}

// ===== CLOSE WITHOUT HISTORY =====
function closeSheetSilent() {
  $('sheet').classList.remove('active');
  $('overlay').classList.remove('active');
}

// ============ TOAST ============

let toastTimer;

function showToast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $('toast').classList.remove('show');
  }, 2500);
}

// ============ FLUTTER ============

const LONG_PRESS = 2000;
const RING = 351.8;
let pressing = false;
let startPressTime = 0;
let raf;

function setupFlutter() {
  const btn = $('flutterBtn');

  btn.addEventListener('touchstart', beginPress, { passive: false });
  btn.addEventListener('mousedown', beginPress);

  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
    btn.addEventListener(event, stopPress);
  });
}

function beginPress(e) {
  e.preventDefault();
  pressing = true;
  startPressTime = Date.now();
  tickPress();
}

function tickPress() {
  if (!pressing) return;

  const elapsed = Date.now() - startPressTime;
  const progress = Math.min(elapsed / LONG_PRESS, 1);
  $('ringFill').style.strokeDashoffset = RING * (1 - progress);

  if (progress >= 1) {
    finishPress();
    return;
  }

  raf = requestAnimationFrame(tickPress);
}

function stopPress() {
  pressing = false;
  cancelAnimationFrame(raf);
  $('ringFill').style.strokeDashoffset = RING;
}

async function finishPress() {
  pressing = false;
  cancelAnimationFrame(raf);
  $('ringFill').style.strokeDashoffset = RING;

  await db.from('buzz').insert({ sender_role: MY_ROLE });
  
  showToast('Miss you sent ');
  
  // ကိုယ့်ဘက်မှာလည်း Vibration
  if (navigator.vibrate) {
    navigator.vibrate([120, 60, 120]);
  }
  
  // ကိုယ့်ဘက်မှာလည်း Buzz Effect
  showBuzz();
}

// ============ BUZZ ============

function subscribeBuzz() {
  db.channel('buzz-sync')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'buzz' },
      payload => {
        if (payload.new.sender_role !== MY_ROLE) {
          showBuzz();
        }
      }
    )
    .subscribe();
}

function showBuzz() {
  $('buzzOverlay').classList.add('active');

  if (navigator.vibrate) {
    navigator.vibrate([120, 60, 120]);
  }

  setTimeout(() => {
    $('buzzOverlay').classList.remove('active');
  }, 3000);
}
