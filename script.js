'use strict';

const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const MOODS = [
  {
    id:'sleeping',
    label:'Sleeping',
    emoji:'',
    file:'sleeping.json'
  },
  {
    id:'busy',
    label:'Busy',
    emoji:'',
    file:'busy.json'
  },
  {
    id:'studying',
    label:'Studying',
    emoji:'',
    file:'studying.json'
  },
  {
    id:'working',
    label:'Working',
    emoji:'',
    file:'working.json'
  },
  {
    id:'free',
    label:'Free Now',
    emoji:'',
    file:'free.json'
  },
  {
    id:'sad',
    label:'Feeling Sad',
    emoji:'',
    file:'sad.json'
  }
];

const identityScreen = document.getElementById('identity-screen');
const dashboard = document.getElementById('dashboard');

const typingText = document.getElementById('typing-text');

const overlay = document.getElementById('overlay');
const sheet = document.getElementById('sheet');
const moodGrid = document.getElementById('mood-grid');

const myMoodLabel = document.getElementById('my-mood-label');
const partnerMoodLabel = document.getElementById('partner-mood-label');

const openSheetBtn = document.getElementById('open-sheet-btn');

const toast = document.getElementById('toast');

const missBtn = document.getElementById('miss-btn');
const ringFill = document.getElementById('ring-fill');

const myLottie = document.getElementById('my-lottie');
const partnerLottie = document.getElementById('partner-lottie');

let myRole = localStorage.getItem('soulpair_role');
let partnerRole = '';

let myAnimation = null;
let partnerAnimation = null;

if(myRole){
  startDashboard();
}else{
  identityScreen.classList.remove('hidden');
}

// SELECT ROLE

document.querySelectorAll('.identity-card').forEach(card=>{
  card.addEventListener('click',()=>{

    const role = card.dataset.role;

    localStorage.setItem('soulpair_role', role);

    myRole = role;

    startDashboard();
  });
});

function startDashboard(){

  identityScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');

  partnerRole = myRole === 'tmw' ? 'cho' : 'tmw';

  buildMoodGrid();
  startTyping();
  subscribeMood();
  loadInitialMood();
}

// TYPING

const quotes = [
  'CHO is always somewhere in your heart.',
  'Even silence feels warm tonight.',
  'Distance means nothing when love feels close.',
  'Some hearts stay connected quietly.'
];

let qIndex = 0;
let charIndex = 0;
let deleting = false;

function startTyping(){

  setInterval(()=>{

    const current = quotes[qIndex];

    if(!deleting){
      charIndex++;
      typingText.textContent = current.slice(0,charIndex);

      if(charIndex >= current.length){
        deleting = true;
      }

    }else{

      charIndex--;
      typingText.textContent = current.slice(0,charIndex);

      if(charIndex <= 0){
        deleting = false;
        qIndex = (qIndex + 1) % quotes.length;
      }
    }

  },70);
}

// SHEET

openSheetBtn.addEventListener('click',()=>{
  overlay.classList.add('show');
  sheet.classList.add('show');
});

overlay.addEventListener('click', closeSheet);

function closeSheet(){
  overlay.classList.remove('show');
  sheet.classList.remove('show');
}

// BUILD MOODS

function buildMoodGrid(){

  moodGrid.innerHTML = '';

  MOODS.forEach(mood=>{

    const div = document.createElement('div');

    div.className = 'mood-item';

    div.innerHTML = `
      <span>${mood.emoji}</span>
      <p>${mood.label}</p>
    `;

    div.addEventListener('click',()=>{
      selectMood(mood);
    });

    moodGrid.appendChild(div);
  });
}

// SELECT MOOD

async function selectMood(mood){

  myMoodLabel.textContent = mood.label;

  loadLottie(myLottie,mood.file,'mine');

  closeSheet();

  showToast('Mood Updated');

  await db.from('mood_state').upsert({
    role: myRole,
    mood: mood.id,
    updated_at: new Date().toISOString()
  });
}

// LOAD INITIAL

async function loadInitialMood(){

  const { data } = await db
  .from('mood_state')
  .select('*');

  if(!data) return;

  data.forEach(row=>{

    const mood = MOODS.find(m=>m.id === row.mood);

    if(!mood) return;

    if(row.role === myRole){
      myMoodLabel.textContent = mood.label;
      loadLottie(myLottie,mood.file,'mine');
    }

    if(row.role === partnerRole){
      partnerMoodLabel.textContent = mood.label;
      loadLottie(partnerLottie,mood.file,'partner');
    }
  });
}

// REALTIME

function subscribeMood(){

  db.channel('mood-sync')
  .on(
    'postgres_changes',
    {
      event:'*',
      schema:'public',
      table:'mood_state'
    },
    payload=>{

      const row = payload.new;

      if(!row) return;

      if(row.role !== partnerRole) return;

      const mood = MOODS.find(m=>m.id === row.mood);

      if(!mood) return;

      partnerMoodLabel.textContent = mood.label;

      loadLottie(partnerLottie,mood.file,'partner');
    }
  )
  .subscribe();
}

// LOTTIE

function loadLottie(container,file,type){

  try{

    if(type === 'mine' && myAnimation){
      myAnimation.destroy();
    }

    if(type === 'partner' && partnerAnimation){
      partnerAnimation.destroy();
    }

    const anim = lottie.loadAnimation({
      container,
      renderer:'svg',
      loop:true,
      autoplay:true,
      path:file
    });

    if(type === 'mine'){
      myAnimation = anim;
    }else{
      partnerAnimation = anim;
    }

  }catch(err){
    console.log(err);
  }
}

// TOAST

let toastTimeout;

function showToast(text){

  toast.textContent = text;

  toast.classList.add('show');

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(()=>{
    toast.classList.remove('show');
  },2000);
}

// MISS BUTTON

const LONG_PRESS = 2000;
const RING_LENGTH = 339.3;

let pressing = false;
let startTime = 0;
let raf;
let timer;

function startPress(e){

  e.preventDefault();

  pressing = true;

  startTime = Date.now();

  missBtn.classList.add('pressing');

  timer = setTimeout(()=>{

    finishPress();

  },LONG_PRESS);

  animateRing();
}

function animateRing(){

  if(!pressing) return;

  const elapsed = Date.now() - startTime;

  const progress = Math.min(elapsed / LONG_PRESS,1);

  ringFill.style.strokeDashoffset = RING_LENGTH * (1 - progress);

  raf = requestAnimationFrame(animateRing);
}

function cancelPress(){

  pressing = false;

  clearTimeout(timer);

  cancelAnimationFrame(raf);

  ringFill.style.strokeDashoffset = RING_LENGTH;

  missBtn.classList.remove('pressing');
}

async function finishPress(){

  pressing = false;

  cancelAnimationFrame(raf);

  missBtn.classList.remove('pressing');

  ringFill.style.strokeDashoffset = RING_LENGTH;

  showToast('Flutter Sent ');

  if(navigator.vibrate){
    navigator.vibrate([80,50,120]);
  }

  await db.from('buzz').insert({
    sender_role:myRole
  });
}

missBtn.addEventListener('touchstart',startPress,{passive:false});
missBtn.addEventListener('mousedown',startPress);

missBtn.addEventListener('touchend',cancelPress);
missBtn.addEventListener('mouseup',cancelPress);
missBtn.addEventListener('mouseleave',cancelPress);
missBtn.addEventListener('touchcancel',cancelPress);
