'use strict';

/* ============================================
   CONFIG
============================================ */

const SUPABASE_URL =
  'https://ehjfkrabnbgbfiaqlwfd.supabase.co';

const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const MY_ROLE = 'device_a';

const PARTNER_ROLE =
  MY_ROLE === 'device_a'
    ? 'device_b'
    : 'device_a';

const PARTNER_NAME = 'ABC';

const VAPID_KEY =
  'YOUR_VAPID_PUBLIC_KEY';

/* ============================================
   MOODS
============================================ */

const MOODS = [
  {
    id: 'teaching',
    label: "I'm Teaching",
    emoji: '',
    lottie: 'assets/lottie/teaching.json'
  },

  {
    id: 'busy',
    label: "I'm Busy",
    emoji: '',
    lottie: 'assets/lottie/busy.json'
  },

  {
    id: 'sleeping',
    label: "I'm Sleeping",
    emoji: '',
    lottie: 'assets/lottie/sleeping.json'
  },

  {
    id: 'free',
    label: "I'm Free Now",
    emoji: '',
    lottie: 'assets/lottie/free.json'
  },

  {
    id: 'studying',
    label: "I'm Studying",
    emoji: '',
    lottie: 'assets/lottie/studying.json'
  },

  {
    id: 'sad',
    label: "I'm Feeling Sad",
    emoji: '',
    lottie: 'assets/lottie/sad.json'
  },

  {
    id: 'working',
    label: "I'm Working",
    emoji: '',
    lottie: 'assets/lottie/working.json'
  },

  {
    id: 'tired',
    label: "I'm Tired",
    emoji: '😮',
    lottie: 'assets/lottie/tired.json'
  }
];

const MOOD_MAP = Object.fromEntries(
  MOODS.map(m => [m.id, m])
);

/* ============================================
   QUOTES
============================================ */

const QUOTES = [
  `${PARTNER_NAME}, you are still in my thoughts even when I am busy.`,
  `Even silence feels warm when ${PARTNER_NAME} is near.`,
  `I hope ${PARTNER_NAME} is smiling right now.`,
  `Missing ${PARTNER_NAME} feels like a quiet habit.`,
  `Somewhere, ${PARTNER_NAME} is my calm place.`,
  `The day feels different knowing ${PARTNER_NAME} exists in it.`,
  `If I close my eyes, I can almost feel ${PARTNER_NAME} here.`,
  `${PARTNER_NAME}, even the moon knows your name tonight.`,
  `Thinking of ${PARTNER_NAME} is the softest thing I do.`,
  `Distance means nothing when ${PARTNER_NAME} is everything.`
];

/* ============================================
   SUPABASE
============================================ */

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

/* ============================================
   STATE
============================================ */

let myMood = null;
let partnerMood = null;
let lottieAnim = null;

/* ============================================
   DOM
============================================ */

const $ = id => document.getElementById(id);

const lottieContainer = $('lottie-container');

const moodLabelText = $('mood-label-text');

const romanticText = $('romantic-text');

const myMoodEmoji = $('my-mood-emoji');

const myMoodText = $('my-mood-text');

const partnerMoodEmoji = $('partner-mood-emoji');

const partnerMoodText = $('partner-mood-text');

const myMoodCard = $('my-mood-card');

const partnerMoodCard = $('partner-mood-card');

const setMoodBtn = $('set-mood-btn');

const bottomSheet = $('bottom-sheet');

const sheetOverlay = $('sheet-overlay');

const moodGrid = $('mood-grid');

const toast = $('toast');

/* ============================================
   LOTTIE
============================================ */

function loadLottie(mood) {

  const moodObj = mood
    ? MOOD_MAP[mood]
    : null;

  const path = moodObj
    ? moodObj.lottie
    : 'assets/lottie/free.json';

  if (lottieAnim) {
    lottieAnim.destroy();
  }

  lottieContainer.innerHTML = '';

  lottieAnim = lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path
  });
}

/* ============================================
   BUILD MOOD GRID
============================================ */

function buildMoodGrid() {

  moodGrid.innerHTML = '';

  MOODS.forEach((mood) => {

    const item = document.createElement('div');

    item.className =
      'mood-item' +
      (myMood === mood.id
        ? ' selected'
        : '');

    item.dataset.id = mood.id;

    item.innerHTML = `
      <span class="mood-item-emoji">
        ${mood.emoji}
      </span>

      <span class="mood-item-name">
        ${mood.label}
      </span>
    `;

    item.addEventListener(
      'click',
      () => {
        selectMood(mood.id);
      }
    );

    moodGrid.appendChild(item);

  });
}

/* ============================================
   SHEET
============================================ */

function openSheet() {

  buildMoodGrid();

  sheetOverlay.classList.add('active');

  bottomSheet.classList.add('active');
}

function closeSheet() {

  sheetOverlay.classList.remove('active');

  bottomSheet.classList.remove('active');
}

setMoodBtn.addEventListener(
  'click',
  openSheet
);

sheetOverlay.addEventListener(
  'click',
  closeSheet
);

/* ============================================
   SELECT MOOD
============================================ */

async function selectMood(moodId) {

  if (moodId === myMood) {

    closeSheet();

    return;
  }

  myMood = moodId;

  closeSheet();

  updateMyMoodUI(moodId);

  loadLottie(moodId);

  buildMoodGrid();

  try {

    await db
      .from('mood_state')
      .upsert(
        {
          role: MY_ROLE,
          mood: moodId,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: 'role'
        }
      );

  } catch (e) {

    console.warn(
      'Supabase mood update error:',
      e
    );
  }

  showToast(
    `Mood set: ${MOOD_MAP[moodId].label}`
  );
}

/* ============================================
   UPDATE UI
============================================ */

function updateMyMoodUI(moodId) {

  const m = MOOD_MAP[moodId];

  if (!m) return;

  myMoodEmoji.textContent =
    m.emoji;

  myMoodText.textContent =
    m.label;

  moodLabelText.textContent =
    m.label;

  flashCard(myMoodCard);
}

function updatePartnerMoodUI(moodId) {

  const m = MOOD_MAP[moodId];

  if (!m) return;

  partnerMoodEmoji.textContent =
    m.emoji;

  partnerMoodText.textContent =
    m.label;

  flashCard(partnerMoodCard);
}

function flashCard(card) {

  card.classList.add('updated');

  setTimeout(() => {

    card.classList.remove('updated');

  }, 2000);
}

/* ============================================
   LOAD INITIAL DATA
============================================ */

async function loadInitialMoods() {

  try {

    const { data } =
      await db
        .from('mood_state')
        .select('role, mood');

    if (!data) return;

    data.forEach(row => {

      if (
        row.role === MY_ROLE
      ) {

        myMood = row.mood;

        updateMyMoodUI(row.mood);

        loadLottie(row.mood);
      }

      if (
        row.role === PARTNER_ROLE
      ) {

        partnerMood = row.mood;

        updatePartnerMoodUI(
          row.mood
        );
      }

    });

    if (!myMood) {

      moodLabelText.textContent =
        'Set your mood ';

      loadLottie(null);
    }

  } catch (e) {

    console.warn(
      'Load moods error:',
      e
    );

    loadLottie(null);
  }
}

/* ============================================
   TOAST
============================================ */

let toastTimeout = null;

function showToast(msg) {

  toast.textContent = msg;

  toast.classList.add('show');

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {

    toast.classList.remove('show');

  }, 2600);
}

/* ============================================
   TYPING EFFECT
============================================ */

let quoteIndex = 0;

let charIndex = 0;

let typingForward = true;

let typingTimeout = null;

function typeStep() {

  const quote =
    QUOTES[quoteIndex];

  if (typingForward) {

    charIndex++;

    romanticText.textContent =
      quote.slice(0, charIndex);

    if (
      charIndex >= quote.length
    ) {

      typingForward = false;

      typingTimeout =
        setTimeout(
          typeStep,
          2600
        );

      return;
    }

    typingTimeout =
      setTimeout(
        typeStep,
        42
      );

  } else {

    charIndex--;

    romanticText.textContent =
      quote.slice(0, charIndex);

    if (charIndex <= 0) {

      typingForward = true;

      quoteIndex =
        (quoteIndex + 1)
        % QUOTES.length;

      typingTimeout =
        setTimeout(
          typeStep,
          500
        );

      return;
    }

    typingTimeout =
      setTimeout(
        typeStep,
        22
      );
  }
}

function startTyping() {

  clearTimeout(
    typingTimeout
  );

  charIndex = 0;

  typingForward = true;

  typeStep();
}

/* ============================================
   INIT
============================================ */

async function init() {

  startTyping();

  await loadInitialMoods();
}

document.addEventListener(
  'DOMContentLoaded',
  init
);
