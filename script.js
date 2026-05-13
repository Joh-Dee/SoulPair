const SUPABASE_URL = 'https://ehjfkrabnbgbfiaqlwfd.supabase.co';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MOODS = [
  {
    id:'teaching',
    label:"I'm Teaching",
    file:'teaching.json'
  },
  {
    id:'busy',
    label:"I'm Busy",
    file:'busy.json'
  },
  {
    id:'sleeping',
    label:"I'm Sleeping",
    file:'sleeping.json'
  },
  {
    id:'free',
    label:"I'm Free Now",
    file:'free.json'
  },
  {
    id:'studying',
    label:"I'm Studying",
    file:'studying.json'
  },
  {
    id:'sad',
    label:"I Feel Sad",
    file:'sad.json'
  },
  {
    id:'working',
    label:"I'm Working",
    file:'working.json'
  },
  {
    id:'tired',
    label:"I'm Tired",
    file:'tired.json'
  }
];

let MY_ROLE = localStorage.getItem('soulpair_role');
let PARTNER_ROLE = null;
let PARTNER_NAME = null;
let myMood = null;
let partnerMood = null;
let lottieAnim = null;

const introPage = document.getElementById('intro-page');
const dashboardPage = document.getElementById('dashboard-page');
const identityCards = document.querySelectorAll('.identity-card');
const quoteText = document.getElementById('quote-text');
const moodGrid = document.getElementById('mood-grid');
const overlay = document.getElementById('overlay');
const moodSheet = document.getElementById('mood-sheet');
const openMoodBtn = document.getElementById('open-mood-btn');
const currentMoodLabel = document.getElementById('current-mood-label');
const myMoodText = document.getElementById('my-mood-text');
const partnerMoodText = document.getElementById('partner-mood-text');
const partnerMoodTitle = document.getElementById('partner-mood-title');
const toast = document.getElementById('toast');

const QUOTES = [
  'Somewhere, CHO is my calm place.',
  'Even silence feels warm with CHO.',
  'Thinking about CHO feels peaceful.',
  'Distance means nothing when love is real.',
  'CHO is still in my thoughts tonight.'
];

function setIdentity(role){

  localStorage.setItem('soulpair_role',role);

  MY_ROLE = role;

  if(role === 'tmw'){
    PARTNER_ROLE = 'cho';
    PARTNER_NAME = 'CHO';

    document.getElementById('my-profile').src = 'boy.jpg';
    document.getElementById('partner-profile').src = 'girl.jpg';
    document.getElementById('my-name').textContent = 'TMW';
    document.getElementById('partner-name').textContent = 'CHO';
  }

  else{
    PARTNER_ROLE = 'tmw';
    PARTNER_NAME = 'TMW';

    document.getElementById('my-profile').src = 'girl.jpg';
    document.getElementById('partner-profile').src = 'boy.jpg';
    document.getElementById('my-name').textContent = 'CHO';
    document.getElementById('partner-name').textContent = 'TMW';
  }

  partnerMoodTitle.textContent = PARTNER_NAME + ' Mood';

  introPage.classList.remove('active');
  dashboardPage.classList.add('active');

  startQuotes();
  buildMoodGrid();
  loadInitialMood();
  subscribeMood();
}

identityCards.forEach(card=>{
  card.addEventListener('click',()=>{
    setIdentity(card.dataset.role);
  });
});

if(MY_ROLE){
  setIdentity(MY_ROLE);
}

function buildMoodGrid(){

  moodGrid.innerHTML = '';

  MOODS.forEach(mood=>{

    const item = document.createElement('div');

    item.className = 'mood-item';

    item.innerHTML = `
      <div>${mood.label}</div>
    `;

    item.onclick = ()=>selectMood(mood);

    moodGrid.appendChild(item);

  });
}

openMoodBtn.onclick = ()=>{
  overlay.classList.add('active');
  moodSheet.classList.add('active');
}

overlay.onclick = closeSheet;

function closeSheet(){
  overlay.classList.remove('active');
  moodSheet.classList.remove('active');
}

async function selectMood(mood){

  myMood = mood.id;

  currentMoodLabel.textContent = mood.label;

  myMoodText.textContent = mood.label;

  loadLottie(mood.file);

  closeSheet();

  showToast('Mood Updated');

  await db
  .from('mood_state')
  .upsert({
    role:MY_ROLE,
    mood:mood.id
  });
}

function loadLottie(file){

  if(lottieAnim){
    lottieAnim.destroy();
  }

  lottieAnim = lottie.loadAnimation({
    container:document.getElementById('lottie-container'),
    renderer:'svg',
    loop:true,
    autoplay:true,
    path:'lottie/' + file
  });
}

async function loadInitialMood(){

  const { data } = await db
  .from('mood_state')
  .select('*');

  if(!data) return;

  data.forEach(row=>{

    const moodObj = MOODS.find(x=>x.id === row.mood);

    if(!moodObj) return;

    if(row.role === MY_ROLE){

      myMoodText.textContent = moodObj.label;
      currentMoodLabel.textContent = moodObj.label;
      loadLottie(moodObj.file);
    }

    if(row.role === PARTNER_ROLE){
      partnerMoodText.textContent = moodObj.label;
    }

  });
}

function subscribeMood(){

  db.channel('mood-sync')

  .on(
    'postgres_changes',
    {
      event:'UPDATE',
      schema:'public',
      table:'mood_state'
    },

    payload=>{

      const row = payload.new;

      const moodObj = MOODS.find(x=>x.id === row.mood);

      if(!moodObj) return;

      if(row.role === PARTNER_ROLE){

        partnerMoodText.textContent = moodObj.label;

        showToast(PARTNER_NAME + ' updated mood');
      }

    }

  )

  .subscribe();
}

function startQuotes(){

  let i = 0;

  quoteText.textContent = QUOTES[0].replaceAll('CHO',PARTNER_NAME);

  setInterval(()=>{

    i++;

    if(i >= QUOTES.length){
      i = 0;
    }

    quoteText.textContent = QUOTES[i].replaceAll('CHO',PARTNER_NAME);

  },4000);
}

function showToast(text){

  toast.textContent = text;

  toast.classList.add('show');

  setTimeout(()=>{
    toast.classList.remove('show');
  },2000);
}

const buzzBtn = document.getElementById('buzz-btn');

let pressTimer = null;

buzzBtn.addEventListener('touchstart',startPress);
buzzBtn.addEventListener('mousedown',startPress);

buzzBtn.addEventListener('touchend',cancelPress);
buzzBtn.addEventListener('mouseup',cancelPress);

function startPress(){

  pressTimer = setTimeout(async ()=>{

    if(navigator.vibrate){
      navigator.vibrate(200);
    }

    showToast('Flutter sent to ' + PARTNER_NAME);

    await db
    .from('buzz')
    .insert({
      sender_role:MY_ROLE
    });

  },2000);
}

function cancelPress(){
  clearTimeout(pressTimer);
}
