'use strict';

console.log(' Step 0: Script loaded');

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

let db;
let MY_ROLE = '';
let PARTNER_ROLE = '';
let myAnim = null;
let partnerAnim = null;
let myUpdatedAt = null;
let partnerUpdatedAt = null;

const $ = id => {
  const el = document.getElementById(id);
  if (!el) console.error(` Element not found: #${id}`);
  return el;
};

const STATUS = [
  { id: 'free', label: 'Free', file: 'free.json' },
  { id: 'teaching', label: 'Teaching', file: 'teaching.json' },
  { id: 'busy', label: 'Busy', file: 'busy.json' },
  { id: 'sad', label: 'Sad', file: 'sad.json' },
  { id: 'tired', label: 'Tired', file: 'tired.json' },
  { id: 'sleeping', label: 'Sleeping', file: 'sleeping.json' },
  { id: 'working', label: 'Working', file: 'working.json' }
];

const QUOTES = [
  'Even silence feels warm when you exist.',
  'Distance means nothing when someone means everything.',
  'You are still in my thoughts.',
  'Somewhere, you are my calm place.'
];

// ============ DOM READY ============

document.addEventListener('DOMContentLoaded', () => {
  console.log(' Step 1: DOM loaded');

  // Supabase client ဖန်တီး
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(' Step 2: Supabase client created');
  } else {
    console.error(' Supabase CDN not loaded!');
    return;
  }

  init();
});

// ============ INIT ============

function init() {
  console.log(' Step 3: init() called');

  const saved = localStorage.getItem('soulpair_role');
  console.log(' localStorage soulpair_role =', saved);

  // Valid role ရှိရင် Main App တန်းဝင်
  if (saved === 'boy' || saved === 'girl') {
    console.log(' Valid role found, going to applyRole');
    applyRole(saved);
    return;
  }

  // Invalid data ရှင်းပြီး Role Page ပြ
  localStorage.removeItem('soulpair_role');
  console.log(' localStorage cleared, setting up role cards');

  // Role cards ကို Event Listener ချိတ်
  const cards = document.querySelectorAll('.role-card');
  console.log(' Role cards found:', cards.length);

  if (cards.length === 0) {
    console.error(' No .role-card elements found! Check HTML.');
    return;
  }

  cards.forEach((card, index) => {
    console.log(` Setting up card ${index}:`, card.dataset.role);

    const handleSelect = (e) => {
      console.log(' Card CLICKED!');
      e.preventDefault();
      e.stopPropagation();

      const role = card.dataset.role;
      console.log(' Role from data-role:', role);

      if (!role) {
        console.error(' No data-role attribute!');
        return;
      }

      localStorage.setItem('soulpair_role', role.toLowerCase());
      console.log(' Role saved to localStorage');

      applyRole(role.toLowerCase());
    };

    // Click နဲ့ Touch နှစ်မျိုးလုံးအတွက်
    card.addEventListener('click', handleSelect);
    card.addEventListener('touchend', handleSelect);
  });

  console.log(' Step 4: Role cards ready, waiting for user click...');
}

// ============ APPLY ROLE ============

function applyRole(role) {
  console.log(' Step 5: applyRole called with role =', role);

  role = role.toLowerCase();
  console.log(' Role lowered:', role);

  if (role === 'boy') {
    console.log(' Setting up as BOY');
    MY_ROLE = 'boy';
    PARTNER_ROLE = 'girl';
    $('myAvatar').src = 'boy.jpg';
    $('partnerAvatar').src = 'girl.jpg';
  } else {
    console.log(' Setting up as GIRL');
    MY_ROLE = 'girl';
    PARTNER_ROLE = 'boy';
    $('myAvatar').src = 'girl.jpg';
    $('partnerAvatar').src = 'boy.jpg';
  }

  console.log(' MY_ROLE:', MY_ROLE, 'PARTNER_ROLE:', PARTNER_ROLE);

  // Check elements exist
  const rolePage = $('rolePage');
  const app = $('app');

  if (!rolePage) {
    console.error(' #rolePage element missing!');
    return;
  }
  if (!app) {
    console.error(' #app element missing!');
    return;
  }

  // Page switch
  rolePage.classList.add('hidden');
  app.classList.remove('hidden');

  console.log(' Step 6: Pages switched. rolePage hidden =', rolePage.classList.contains('hidden'));
  console.log(' app visible =', !app.classList.contains('hidden'));

  startApp();
}

// ============ START APP ============

async function startApp() {
  console.log(' Step 7: startApp called');
  buildStatusList();
  await loadStates();
  subscribeRealtime();
  subscribeBuzz();
  setupSheet();
  setupFlutter();
  startTyping();
  setInterval(updateTimes, 1000);
  console.log(' Step 8: App fully started!');
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
  showToast('Status updated');
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

  if (type === 'my' && myAnim) {
    myAnim.destroy();
    myAnim = null;
  }
  if (type === 'partner' && partnerAnim) {
    partnerAnim.destroy();
    partnerAnim = null;
  }

  container.innerHTML = '';

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
    .subscribe();
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

let quoteIndex = 0;
let charIndex = 0;
let deleting = false;

function startTyping() {
  const el = $('typingText');

  function type() {
    const quote = QUOTES[quoteIndex];

    if (!deleting) {
      el.textContent = quote.slice(0, charIndex++);
      if (charIndex > quote.length) {
        deleting = true;
        setTimeout(type, 2000);
        return;
      }
      setTimeout(type, 160);
    } else {
      el.textContent = quote.slice(0, charIndex--);
      if (charIndex < 0) {
        deleting = false;
        quoteIndex = (quoteIndex + 1) % QUOTES.length;
        setTimeout(type, 600);
        return;
      }
      setTimeout(type, 26);
    }
  }

  type();
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
  });
}

function openSheet() {
  $('sheet').classList.add('active');
  $('overlay').classList.add('active');
}

function closeSheet() {
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
  showToast('Flutter sent');
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
