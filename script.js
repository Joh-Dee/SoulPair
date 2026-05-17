'use strict';

/* SUPABASE */

const SUPABASE_URL =
'https://ehjfkrabnbgbfiaqlwfd.supabase.co';

const SUPABASE_ANON =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k';

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

/* HELPERS */

const $ = id => document.getElementById(id);

/* STATUS */

const STATUS_LIST = [

  {
    id:'free',
    label:'Free',
    emoji:'',
    file:'free.json'
  },

  {
    id:'teaching',
    label:'Teaching',
    emoji:'',
    file:'teaching.json'
  },

  {
    id:'busy',
    label:'Busy',
    emoji:'',
    file:'busy.json'
  },

  {
    id:'sad',
    label:'Sad',
    emoji:'',
    file:'sad.json'
  },

  {
    id:'tired',
    label:'Tired',
    emoji:'😮',
    file:'tired.json'
  },

  {
    id:'studying',
    label:'Studying',
    emoji:'',
    file:'studying.json'
  },

  {
    id:'sleeping',
    label:'Sleeping',
    emoji:'',
    file:'sleeping.json'
  },

  {
    id:'working',
    label:'Working',
    emoji:'',
    file:'working.json'
  }

];

const QUOTES = [

  'Even silence feels warm when you exist.',

  'Distance means nothing when someone means everything.',

  'Somewhere, you are my calm place.',

  'You are still in my thoughts.'

];

/* ROLE */

let MY_ROLE = null;
let PARTNER_ROLE = null;

function initRole(){

  const saved =
  localStorage.getItem(
    'soulpair_role'
  );

  if(saved){

    applyRole(saved);

    return;
  }

  $('rolePage')
  .classList
  .remove('hidden');

  document
  .querySelectorAll('.role-card')
  .forEach(card=>{

    card.onclick=()=>{

      const role =
      card.dataset.role;

      localStorage.setItem(
        'soulpair_role',
        role
      );

      applyRole(role);

    };

  });

}

function applyRole(role){

  MY_ROLE = role;

  PARTNER_ROLE =
  role === 'boy'
  ? 'girl'
  : 'boy';

  $('rolePage')
  .classList
  .add('hidden');

  $('app')
  .classList
  .remove('hidden');

  if(role === 'boy'){

    $('myAvatar').src =
    'boy.jpg';

    $('partnerAvatar').src =
    'girl.jpg';

  }else{

    $('myAvatar').src =
    'girl.jpg';

    $('partnerAvatar').src =
    'boy.jpg';

  }

  startApp();

}

/* APP */

async function startApp(){

  buildStatusGrid();

  await loadState();

  subscribeRealtime();

  startTyping();

  setupSheet();

  setupMissButton();

  startAutoTimeUpdate();

}

/* STATUS GRID */

function buildStatusGrid(){

  const grid =
  $('statusGrid');

  grid.innerHTML='';

  STATUS_LIST.forEach(status=>{

    const item =
    document.createElement('div');

    item.className =
    'status-item';

    item.innerHTML = `
      <div class="status-emoji">
        ${status.emoji}
      </div>

      <div>
        ${status.label}
      </div>
    `;

    item.onclick = ()=>{

      updateStatus(status);

    };

    grid.appendChild(item);

  });

}

/* UPDATE STATUS */

async function updateStatus(status){

  try{

    await db
    .from('couple_state')
    .upsert({
      role:MY_ROLE,
      current_status:status.id,
      updated_at:new Date()
    },{
      onConflict:'role'
    });

    renderMyStatus(
      status.id,
      new Date()
    );

    closeSheet();

    showToast(
      'Status updated'
    );

  }catch(e){

    console.log(e);

  }

}

/* LOAD */

async function loadState(){

  try{

    const { data } =
    await db
    .from('couple_state')
    .select('*');

    if(!data) return;

    data.forEach(row=>{

      if(row.role === MY_ROLE){

        renderMyStatus(
          row.current_status,
          row.updated_at
        );

      }

      if(
        row.role === PARTNER_ROLE
      ){

        renderPartnerStatus(
          row.current_status,
          row.updated_at
        );

      }

    });

  }catch(e){

    console.log(e);

  }

}

/* RENDER */

let myUpdatedAt = null;
let partnerUpdatedAt = null;

function renderMyStatus(
  statusId,
  updatedAt
){

  const status =
  STATUS_LIST.find(
    s=>s.id===statusId
  );

  if(!status) return;

  $('myStatus').textContent =
  status.label;

  myUpdatedAt = updatedAt;

  loadLottie(
    $('myLottie'),
    status.file
  );

}

function renderPartnerStatus(
  statusId,
  updatedAt
){

  const status =
  STATUS_LIST.find(
    s=>s.id===statusId
  );

  if(!status) return;

  $('partnerStatus').textContent =
  status.label;

  partnerUpdatedAt = updatedAt;

  loadLottie(
    $('partnerLottie'),
    status.file
  );

}

/* TIME */

function startAutoTimeUpdate(){

  setInterval(()=>{

    if(myUpdatedAt){

      $('myTime').textContent =
      timeAgo(myUpdatedAt);

    }

    if(partnerUpdatedAt){

      $('partnerTime').textContent =
      timeAgo(partnerUpdatedAt);

    }

  },1000);

}

function timeAgo(date){

  const seconds =
  Math.floor(
    (Date.now() -
    new Date(date)) / 1000
  );

  if(seconds < 60){

    return 'just now';

  }

  const mins =
  Math.floor(seconds / 60);

  if(mins < 60){

    return `${mins}m ago`;

  }

  const hrs =
  Math.floor(mins / 60);

  return `${hrs}h ago`;

}

/* LOTTIE */

function loadLottie(
  container,
  file
){

  container.innerHTML='';

  lottie.loadAnimation({

    container,
    renderer:'svg',
    loop:true,
    autoplay:true,
    path:file

  });

}

/* REALTIME */

function subscribeRealtime(){

  db.channel(
    'couple-state-sync'
  )

  .on(
    'postgres_changes',
    {
      event:'*',
      schema:'public',
      table:'couple_state'
    },
    payload=>{

      const row =
      payload.new;

      if(!row) return;

      if(
        row.role === MY_ROLE
      ){

        renderMyStatus(
          row.current_status,
          row.updated_at
        );

      }

      if(
        row.role === PARTNER_ROLE
      ){

        renderPartnerStatus(
          row.current_status,
          row.updated_at
        );

      }

    }
  )

  .subscribe();

}

/* TYPING */

let quoteIndex = 0;
let charIndex = 0;
let deleting = false;

function startTyping(){

  const el =
  $('typingText');

  setInterval(()=>{

    const quote =
    QUOTES[quoteIndex];

    if(!deleting){

      charIndex++;

      el.textContent =
      quote.slice(0,charIndex);

      if(
        charIndex >= quote.length
      ){

        deleting = true;

      }

    }else{

      charIndex--;

      el.textContent =
      quote.slice(0,charIndex);

      if(charIndex <= 0){

        deleting = false;

        quoteIndex =
        (quoteIndex + 1)
        %
        QUOTES.length;

      }

    }

  },70);

}

/* SHEET */

let startY = 0;
let currentY = 0;

function setupSheet(){

  $('openSheetBtn')
  .onclick = openSheet;

  $('sheetOverlay')
  .onclick = closeSheet;

  const handle =
  $('sheetHandle');

  handle.addEventListener(
    'touchstart',
    e=>{

      startY =
      e.touches[0].clientY;

    }
  );

  handle.addEventListener(
    'touchmove',
    e=>{

      currentY =
      e.touches[0].clientY;

    }
  );

  handle.addEventListener(
    'touchend',
    ()=>{

      if(
        currentY - startY
        >
        80
      ){

        closeSheet();

      }

    }
  );

}

function openSheet(){

  $('sheet')
  .classList
  .add('active');

  $('sheetOverlay')
  .classList
  .add('active');

}

function closeSheet(){

  $('sheet')
  .classList
  .remove('active');

  $('sheetOverlay')
  .classList
  .remove('active');

}

/* TOAST */

let toastTimeout;

function showToast(msg){

  const toast =
  $('toast');

  toast.textContent =
  msg;

  toast.classList.add(
    'show'
  );

  clearTimeout(
    toastTimeout
  );

  toastTimeout =
  setTimeout(()=>{

    toast.classList.remove(
      'show'
    );

  },2500);

}

/* MISS YOU */

const LONG_PRESS = 2000;

const RING = 364.4;

let pressing = false;

let pressStart = 0;

let raf = null;

function setupMissButton(){

  const btn =
  $('missBtn');

  btn.addEventListener(
    'touchstart',
    startPress,
    { passive:false }
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

    btn.addEventListener(
      ev,
      cancelPress
    );

  });

}

function startPress(e){

  e.preventDefault();

  pressing = true;

  pressStart = Date.now();

  $('missBtn')
  .classList
  .add('pressing');

  tickPress();

}

function tickPress(){

  if(!pressing) return;

  const elapsed =
  Date.now() -
  pressStart;

  const progress =
  Math.min(
    elapsed / LONG_PRESS,
    1
  );

  $('ringFill')
  .style
  .strokeDashoffset =
  RING * (1 - progress);

  if(progress >= 1){

    finishPress();

    return;

  }

  raf =
  requestAnimationFrame(
    tickPress
  );

}

function cancelPress(){

  pressing = false;

  cancelAnimationFrame(
    raf
  );

  $('missBtn')
  .classList
  .remove('pressing');

  $('ringFill')
  .style
  .strokeDashoffset =
  RING;

}

async function finishPress(){

  pressing = false;

  cancelAnimationFrame(
    raf
  );

  $('missBtn')
  .classList
  .remove('pressing');

  $('ringFill')
  .style
  .strokeDashoffset =
  RING;

  if(navigator.vibrate){

    navigator.vibrate([
      80,
      40,
      120
    ]);

  }

  try{

    await db
    .from('buzz')
    .insert({
      sender_role:MY_ROLE
    });

    showToast(
      'Flutter sent '
    );

  }catch(e){

    console.log(e);

  }

}

/* BUZZ */

function subscribeBuzz(){

  db.channel(
    'buzz-sync'
  )

  .on(
    'postgres_changes',
    {
      event:'INSERT',
      schema:'public',
      table:'buzz'
    },
    payload=>{

      if(
        payload.new
        .sender_role
        !==
        MY_ROLE
      ){

        showBuzz();

      }

    }
  )

  .subscribe();

}

function showBuzz(){

  $('buzzOverlay')
  .classList
  .add('active');

  if(navigator.vibrate){

    navigator.vibrate([
      100,
      50,
      100
    ]);

  }

  setTimeout(()=>{

    $('buzzOverlay')
    .classList
    .remove('active');

  },3000);

}

/* INIT */

subscribeBuzz();

initRole();
