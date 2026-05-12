'use strict';

// Supabase example credentials
const SUPABASE_URL = 'https://xyzcompany.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';

// Init supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// User selection
let currentUser = localStorage.getItem('soulpair-user') || null;
let currentMood = null;

// DOM elements
const whoPage = document.getElementById('who-page');
const dashboardPage = document.getElementById('dashboard-page');
const choices = document.querySelectorAll('.choice');
const moodLabelText = document.getElementById('mood-label-text');
const myMoodText = document.getElementById('my-mood-text');
const myMoodEmoji = document.getElementById('my-mood-emoji');
const romanticText = document.getElementById('romantic-text');
const toast = document.getElementById('toast');
const setMoodBtn = document.getElementById('set-mood-btn');
const bottomSheet = document.getElementById('bottom-sheet');
const sheetOverlay = document.getElementById('sheet-overlay');
const moodGrid = document.getElementById('mood-grid');
const lottieContainer = document.getElementById('lottie-container');
const missuBtn = document.getElementById('missu-btn');
const ringFill = document.getElementById('ring-fill');

const MOODS = [
  {id:'teaching',label:"I'm Teaching",emoji:'',lottie:'assets/lottie/teaching.json'},
  {id:'busy',label:"I'm Busy",emoji:'',lottie:'assets/lottie/busy.json'},
  {id:'sleeping',label:"I'm Sleeping",emoji:'',lottie:'assets/lottie/sleeping.json'},
  {id:'free',label:"I'm Free Now",emoji:'',lottie:'assets/lottie/free.json'},
  {id:'studying',label:"I'm Studying",emoji:'',lottie:'assets/lottie/studying.json'},
  {id:'sad',label:"I'm Feeling Sad",emoji:'',lottie:'assets/lottie/sad.json'},
  {id:'working',label:"I'm Working",emoji:'',lottie:'assets/lottie/working.json'},
  {id:'tired',label:"I'm Tired",emoji:'😮',lottie:'assets/lottie/tired.json'}
];

const QUOTES = [
  `CHO, you are still in my thoughts even when I am busy.`,
  `Even silence feels warm when CHO is near.`,
  `I hope CHO is smiling right now.`,
  `Missing CHO feels like a quiet habit.`,
  `Somewhere, CHO is my calm place.`,
  `Thinking of CHO is the softest thing I do.`,
  `Distance means nothing when CHO is everything.`
];

// --------------------
// User Selection Flow
// --------------------
if(currentUser){
  whoPage.classList.remove('active');
  dashboardPage.classList.add('active');
}else{
  whoPage.classList.add('active');
  dashboardPage.classList.remove('active');
}

choices.forEach(choice=>{
  choice.addEventListener('click',()=>{
    currentUser = choice.dataset.user;
    localStorage.setItem('soulpair-user', currentUser);
    whoPage.classList.remove('active');
    dashboardPage.classList.add('active');
  });
});

// --------------------
// Lottie Loader
// --------------------
let lottieAnim = null;
function loadLottie(path){
  if(lottieAnim) lottieAnim.destroy();
  lottieContainer.innerHTML='';
  lottieAnim = lottie.loadAnimation({
    container:lottieContainer,
    renderer:'svg',
    loop:true,
    autoplay:true,
    path
  });
}

// --------------------
// Mood Grid
// --------------------
function buildMoodGrid(){
  moodGrid.innerHTML='';
  MOODS.forEach(mood=>{
    const item = document.createElement('div');
    item.className='mood-item';
    item.innerHTML=`<span class="mood-item-emoji">${mood.emoji}</span><span class="mood-item-name">${mood.label}</span>`;
    item.addEventListener('click',()=>{
      selectMood(mood);
    });
    moodGrid.appendChild(item);
  });
}

function openSheet(){bottomSheet.classList.add('active');sheetOverlay.classList.add('active');}
function closeSheet(){bottomSheet.classList.remove('active');sheetOverlay.classList.remove('active');}

setMoodBtn.addEventListener('click',openSheet);
sheetOverlay.addEventListener('click',closeSheet);

function selectMood(mood){
  currentMood = mood.id;
  moodLabelText.textContent=mood.label;
  myMoodText.textContent=mood.label;
  myMoodEmoji.textContent=mood.emoji;
  loadLottie(mood.lottie);
  showToast(`Mood updated: ${mood.label}`);
  closeSheet();

  // save mood to Supabase
  db.from('moods').upsert({user:currentUser,mood:currentMood}).then().catch(console.error);
}

// --------------------
// Toast
// --------------------
function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>{toast.classList.remove('show');},2500);}

// --------------------
// Romantic Typing
// --------------------
let quoteIndex=0,charIndex=0,deleting=false;
function typeEffect(){
  const q = QUOTES[quoteIndex];
  if(!deleting){
    romanticText.textContent=q.slice(0,charIndex++);
    if(charIndex>q.length){deleting=true;setTimeout(typeEffect,2200);return;}
    setTimeout(typeEffect,40);
  }else{
    romanticText.textContent=q.slice(0,charIndex--);
    if(charIndex<0){deleting=false;quoteIndex=(quoteIndex+1)%QUOTES.length;}
    setTimeout(typeEffect,20);
  }
}

// --------------------
// Buzz Long Press
// --------------------
const LONG_PRESS_MS=2000;
const RING_LENGTH=339.3;
let pressTimer=null,startTime=0,rafId=null;

function animateRing(){
  const elapsed=Date.now()-startTime;
  const progress=Math.min(elapsed/LONG_PRESS_MS,1);
  ringFill.style.strokeDashoffset=RING_LENGTH*(1-progress);
  if(progress<1) rafId=requestAnimationFrame(animateRing);
}

function startPress(e){
  e.preventDefault();
  startTime=Date.now();
  animateRing();
  pressTimer=setTimeout(()=>{
    if(navigator.vibrate) navigator.vibrate([100,50,100]);
    showToast(' Flutter sent to CHO');
    ringFill.style.strokeDashoffset=RING_LENGTH;
    // send buzz to Supabase
    db.from('buzzes').insert({from:currentUser,to:'CHO',time:new Date().toISOString()}).then().catch(console.error);
  },LONG_PRESS_MS);
}

function cancelPress(){
  clearTimeout(pressTimer);
  cancelAnimationFrame(rafId);
  ringFill.style.strokeDashoffset=RING_LENGTH;
}

missuBtn.addEventListener('touchstart',startPress,{passive:false});
missuBtn.addEventListener('mousedown',startPress);
missuBtn.addEventListener('touchend',cancelPress);
missuBtn.addEventListener('mouseup',cancelPress);
missuBtn.addEventListener('mouseleave',cancelPress);
missuBtn.addEventListener('touchcancel',cancelPress);

// --------------------
// Init
// --------------------
buildMoodGrid();
typeEffect();
loadLottie('assets/lottie/free.json');
