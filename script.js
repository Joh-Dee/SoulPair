'use strict';

const SUPABASE_URL =
'https://ehjfkrabnbgbfiaqlwfd.supabase.co';

const SUPABASE_ANON =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

const STATUSES = [
  {id:'free',label:'Free',emoji:''},
  {id:'busy',label:'Busy',emoji:''},
  {id:'working',label:'Working',emoji:''},
  {id:'studying',label:'Studying',emoji:''},
  {id:'teaching',label:'Teaching',emoji:''},
  {id:'sleeping',label:'Sleeping',emoji:''},
  {id:'tired',label:'Tired',emoji:'😮'},
  {id:'missing',label:'Missing You',emoji:''}
];

const QUOTES = [
  'Even silence feels warm when you exist.',
  'Distance means nothing when someone means everything.',
  'You are still in my thoughts.',
  'Somewhere, you are my calm place.'
];

const $ = id => document.getElementById(id);

let MY_ROLE = null;
let PARTNER_ROLE = null;

const rolePage = $('role-page');
const app = $('app');

function initRole(){

  const saved = localStorage.getItem('soulpair_role');

  if(saved){
    setRole(saved);
    return;
  }

  rolePage.classList.remove('hidden');

  document.querySelectorAll('.role-card')
  .forEach(card=>{

    card.onclick=()=>{

      const role = card.dataset.role;

      localStorage.setItem(
        'soulpair_role',
        role
      );

      setRole(role);

    };

  });

}

function setRole(role){

  MY_ROLE = role;
  PARTNER_ROLE =
  role === 'boy'
  ? 'girl'
  : 'boy';

  rolePage.classList.add('hidden');
  app.classList.remove('hidden');

  startApp();

}

async function startApp(){

  buildStatusGrid();

  await loadState();

  subscribeRealtime();

  startTyping();

  setupSheet();

  setupMissButton();

}

function buildStatusGrid(){

  const grid = $('status-grid');

  STATUSES.forEach(status=>{

    const item =
    document.createElement('div');

    item.className='status-item';

    item.innerHTML=`
      <div class="status-emoji">
        ${status.emoji}
      </div>

      <div>
        ${status.label}
      </div>
    `;

    item.onclick=()=>{
      updateStatus(status);
    };

    grid.appendChild(item);

  });

}

async function updateStatus(status){

  await db
  .from('couple_state')
  .upsert({
    role:MY_ROLE,
    current_status:status.label,
    updated_at:new Date()
  },{
    onConflict:'role'
  });

  closeSheet();

  showToast(
    `${status.label} updated`
  );

}

async function loadState(){

  const {data} =
  await db
  .from('couple_state')
  .select('*');

  if(!data) return;

  data.forEach(row=>{

    if(row.role===MY_ROLE){

      $('my-status').textContent =
      row.current_status;

      $('my-time').textContent =
      timeAgo(row.updated_at);

    }

    if(row.role===PARTNER_ROLE){

      $('partner-status').textContent =
      row.current_status;

      $('partner-time').textContent =
      timeAgo(row.updated_at);

    }

  });

}

function subscribeRealtime(){

  db.channel('couple-sync')

  .on(
    'postgres_changes',
    {
      event:'*',
      schema:'public',
      table:'couple_state'
    },
    payload=>{

      const row = payload.new;

      if(!row) return;

      if(row.role===MY_ROLE){

        $('my-status').textContent =
        row.current_status;

        $('my-time').textContent =
        timeAgo(row.updated_at);

      }

      if(row.role===PARTNER_ROLE){

        $('partner-status').textContent =
        row.current_status;

        $('partner-time').textContent =
        timeAgo(row.updated_at);

      }

    }
  )

  .subscribe();

}

function timeAgo(date){

  const sec =
  Math.floor(
    (Date.now()-new Date(date))/1000
  );

  if(sec<60) return 'just now';

  const min=Math.floor(sec/60);

  if(min<60) return `${min}m ago`;

  const hr=Math.floor(min/60);

  return `${hr}h ago`;

}

/* typing */

let q=0;
let c=0;

function startTyping(){

  const el = $('typing-text');

  setInterval(()=>{

    const text=QUOTES[q];

    el.textContent=
    text.slice(0,c);

    c++;

    if(c>text.length){

      c=0;

      q=(q+1)%QUOTES.length;

    }

  },60);

}

/* sheet */

function setupSheet(){

  $('open-sheet-btn').onclick=()=>{
    openSheet();
  };

  $('sheet-overlay').onclick=()=>{
    closeSheet();
  };

}

function openSheet(){

  $('sheet').classList.add('active');
  $('sheet-overlay').classList.add('active');

}

function closeSheet(){

  $('sheet').classList.remove('active');
  $('sheet-overlay').classList.remove('active');

}

/* toast */

let toastTimer;

function showToast(msg){

  const toast = $('toast');

  toast.textContent=msg;

  toast.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer=setTimeout(()=>{
    toast.classList.remove('show');
  },2500);

}

/* miss button */

const LONG_PRESS = 2000;

let pressing=false;
let startTime=0;
let raf;

function setupMissButton(){

  const btn = $('miss-btn');

  btn.addEventListener(
    'touchstart',
    startPress,
    {passive:false}
  );

  btn.addEventListener(
    'mousedown',
    startPress
  );

  [
    'mouseup',
    'mouseleave',
    'touchend',
    'touchcancel'
  ].forEach(ev=>{

    btn.addEventListener(ev,cancelPress);

  });

}

function startPress(e){

  e.preventDefault();

  pressing=true;

  startTime=Date.now();

  tick();

}

function tick(){

  if(!pressing) return;

  const elapsed =
  Date.now()-startTime;

  const progress =
  Math.min(elapsed/LONG_PRESS,1);

  $('ring-fill').style.strokeDashoffset =
  339.3*(1-progress);

  if(progress>=1){

    finishPress();

    return;

  }

  raf=requestAnimationFrame(tick);

}

function cancelPress(){

  pressing=false;

  cancelAnimationFrame(raf);

  $('ring-fill').style.strokeDashoffset =
  339.3;

}

async function finishPress(){

  pressing=false;

  cancelAnimationFrame(raf);

  $('ring-fill').style.strokeDashoffset =
  339.3;

  if(navigator.vibrate){
    navigator.vibrate([80,40,120]);
  }

  await db
  .from('buzz')
  .insert({
    sender_role:MY_ROLE
  });

  showToast('Flutter sent ');

}

/* buzz realtime */

db.channel('buzz-sync')

.on(
  'postgres_changes',
  {
    event:'INSERT',
    schema:'public',
    table:'buzz'
  },
  payload=>{

    if(
      payload.new.sender_role
      !==
      MY_ROLE
    ){
      showBuzz();
    }

  }
)

.subscribe();

function showBuzz(){

  const overlay =
  $('buzz-overlay');

  overlay.classList.add('active');

  if(navigator.vibrate){
    navigator.vibrate([100,50,100]);
  }

  setTimeout(()=>{
    overlay.classList.remove('active');
  },3000);

}

initRole();
