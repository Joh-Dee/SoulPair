'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

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

const QUOTES = [
  `ABC, you are still in my thoughts even when I am busy.`,
  `Even silence feels warm when ABC is near.`,
  `I hope ABC is smiling right now.`,
  `Missing ABC feels like a quiet habit.`,
  `Somewhere, ABC is my calm place.`,
  `Thinking of ABC is the softest thing I do.`,
  `Distance means nothing when ABC is everything.`
];

const moodGrid = document.getElementById('mood-grid');
const setMoodBtn = document.getElementById('set-mood-btn');
const bottomSheet = document.getElementById('bottom-sheet');
const sheetOverlay = document.getElementById('sheet-overlay');
const moodLabelText = document.getElementById('mood-label-text');
const myMoodText = document.getElementById('my-mood-text');
const myMoodEmoji = document.getElementById('my-mood-emoji');
const romanticText = document.getElementById('romantic-text');
const toast = document.getElementById('toast');
const lottieContainer = document.getElementById('lottie-container');
const missuBtn = document.getElementById('missu-btn');
const ringFill = document.getElementById('ring-fill');

let lottieAnim = null;
let currentMood = null;

function loadLottie(path) {

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

function buildMoodGrid() {

  moodGrid.innerHTML = '';

  MOODS.forEach(mood => {

    const item = document.createElement('div');

    item.className = 'mood-item';

    item.innerHTML = `
      <span class="mood-item-emoji">${mood.emoji}</span>
      <span class="mood-item-name">${mood.label}</span>
    `;

    item.addEventListener('click', () => {
      selectMood(mood);
    });

    moodGrid.appendChild(item);
  });
}

function openSheet() {
  bottomSheet.classList.add('active');
  sheetOverlay.classList.add('active');
}

function closeSheet() {
  bottomSheet.classList.remove('active');
  sheetOverlay.classList.remove('active');
}

setMoodBtn.addEventListener('click', openSheet);
sheetOverlay.addEventListener('click', closeSheet);

function selectMood(mood) {

  currentMood = mood.id;

  moodLabelText.textContent = mood.label;
  myMoodText.textContent = mood.label;
  myMoodEmoji.textContent = mood.emoji;

  loadLottie(mood.lottie);

  showToast(`Mood updated: ${mood.label}`);

  closeSheet();
}

function showToast(message) {

  toast.textContent = message;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

let quoteIndex = 0;
let charIndex = 0;
let deleting = false;

function typeEffect() {

  const currentQuote = QUOTES[quoteIndex];

  if (!deleting) {

    romanticText.textContent = currentQuote.slice(0, charIndex++);

    if (charIndex > currentQuote.length) {
      deleting = true;
      setTimeout(typeEffect, 2200);
      return;
    }

    setTimeout(typeEffect, 40);

  } else {

    romanticText.textContent = currentQuote.slice(0, charIndex--);

    if (charIndex < 0) {
      deleting = false;
      quoteIndex = (quoteIndex + 1) % QUOTES.length;
    }

    setTimeout(typeEffect, 20);
  }
}

const LONG_PRESS_MS = 2000;
const RING_LENGTH = 339.3;

let pressTimer = null;
let startTime = 0;
let rafId = null;

function animateRing() {

  const elapsed = Date.now() - startTime;

  const progress = Math.min(elapsed / LONG_PRESS_MS, 1);

  ringFill.style.strokeDashoffset = RING_LENGTH * (1 - progress);

  if (progress < 1) {
    rafId = requestAnimationFrame(animateRing);
  }
}

function startPress(e) {

  e.preventDefault();

  startTime = Date.now();

  animateRing();

  pressTimer = setTimeout(() => {

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    showToast(' Flutter sent to ABC');

    ringFill.style.strokeDashoffset = RING_LENGTH;

  }, LONG_PRESS_MS);
}

function cancelPress() {

  clearTimeout(pressTimer);

  cancelAnimationFrame(rafId);

  ringFill.style.strokeDashoffset = RING_LENGTH;
}

missuBtn.addEventListener('touchstart', startPress, { passive: false });
missuBtn.addEventListener('mousedown', startPress);

missuBtn.addEventListener('touchend', cancelPress);
missuBtn.addEventListener('mouseup', cancelPress);
missuBtn.addEventListener('mouseleave', cancelPress);
missuBtn.addEventListener('touchcancel', cancelPress);

buildMoodGrid();
typeEffect();
loadLottie('assets/lottie/free.json');
