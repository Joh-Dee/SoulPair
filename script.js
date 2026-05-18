// script.js

const SUPABASE_URL = "https://ehjfkrabnbgbfiaqlwfd.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmZnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const roleScreen = document.getElementById("roleScreen");
const mainScreen = document.getElementById("mainScreen");

const myProfile = document.getElementById("myProfile");
const partnerProfile = document.getElementById("partnerProfile");

const myStatusEl = document.getElementById("myStatus");
const partnerStatusEl = document.getElementById("partnerStatus");

const myTimeEl = document.getElementById("myTime");
const partnerTimeEl = document.getElementById("partnerTime");

const myLottieBox = document.getElementById("myLottie");
const partnerLottieBox = document.getElementById("partnerLottie");

const statusBtn = document.getElementById("statusBtn");

const bottomSheet = document.getElementById("bottomSheet");
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetHandle = document.getElementById("sheetHandle");

const flutterBtn = document.getElementById("flutterBtn");
const progressCircle = document.getElementById("progressCircle");
const flutterOverlay = document.getElementById("flutterOverlay");

const quoteText = document.getElementById("quoteText");

const quotes = [
  "Even silence feels warm with you.",
  "Two souls. One quiet connection.",
  "Distance disappears when hearts stay close.",
  "You are my calm place.",
  "Some feelings never need words.",
  "Love lives in small moments.",
  "Still choosing you every day.",
  "Our hearts speak softly together."
];

const statusMap = {
  Free: "free.json",
  Teaching: "teaching.json",
  Busy: "busy.json",
  Sad: "sad.json",
  Tired: "tired.json",
  Studying: "studying.json",
  Sleeping: "sleeping.json",
  Working: "working.json"
};

let myRole = localStorage.getItem("soulpair_role");
let partnerRole = myRole === "boy" ? "girl" : "boy";

let myLottie = null;
let partnerLottie = null;

let myData = null;
let partnerData = null;

function init() {
  if (myRole === "boy" || myRole === "girl") {
    startApp();
  } else {
    roleScreen.classList.remove("hidden");
  }
}

document.querySelectorAll(".role-card").forEach((card) => {
  card.addEventListener("click", async () => {
    const role = card.dataset.role;

    localStorage.setItem("soulpair_role", role);

    myRole = role;
    partnerRole = role === "boy" ? "girl" : "boy";

    startApp();
  });
});

async function startApp() {
  roleScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");

  setupProfiles();

  await ensureRoleRow(myRole);
  await ensureRoleRow(partnerRole);

  await fetchInitialState();

  subscribeRealtime();

  startTimeUpdater();

  startQuotes();
}

function setupProfiles() {
  if (myRole === "boy") {
    myProfile.src = "boy.jpg";
    partnerProfile.src = "girl.jpg";
  } else {
    myProfile.src = "girl.jpg";
    partnerProfile.src = "boy.jpg";
  }
}

async function ensureRoleRow(role) {
  const { data } = await supabase
    .from("couple_state")
    .select("*")
    .eq("role", role)
    .maybeSingle();

  if (!data) {
    await supabase.from("couple_state").insert({
      role,
      current_status: "Free",
      updated_at: new Date().toISOString()
    });
  }
}

async function fetchInitialState() {
  const { data } = await supabase
    .from("couple_state")
    .select("*");

  if (!data) return;

  const mine = data.find((x) => x.role === myRole);
  const partner = data.find((x) => x.role === partnerRole);

  if (mine) {
    myData = mine;
    renderMyCard();
  }

  if (partner) {
    partnerData = partner;
    renderPartnerCard();
  }
}

function renderMyCard() {
  if (!myData) return;

  myStatusEl.textContent = myData.current_status;

  loadLottie(
    "my",
    statusMap[myData.current_status] || "free.json"
  );
}

function renderPartnerCard() {
  if (!partnerData) return;

  partnerStatusEl.textContent = partnerData.current_status;

  loadLottie(
    "partner",
    statusMap[partnerData.current_status] || "free.json"
  );
}

function loadLottie(type, file) {
  if (type === "my") {
    if (myLottie) {
      myLottie.destroy();
      myLottie = null;
      myLottieBox.innerHTML = "";
    }

    myLottie = lottie.loadAnimation({
      container: myLottieBox,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: file
    });
  }

  if (type === "partner") {
    if (partnerLottie) {
      partnerLottie.destroy();
      partnerLottie = null;
      partnerLottieBox.innerHTML = "";
    }

    partnerLottie = lottie.loadAnimation({
      container: partnerLottieBox,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: file
    });
  }
}

async function updateStatus(status) {
  const payload = {
    current_status: status,
    updated_at: new Date().toISOString()
  };

  await supabase
    .from("couple_state")
    .update(payload)
    .eq("role", myRole);

  myData = {
    ...myData,
    ...payload
  };

  renderMyCard();
}

function subscribeRealtime() {
  supabase
    .channel("couple_state_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "couple_state"
      },
      (payload) => {
        const row = payload.new;

        if (!row) return;

        if (row.role === myRole) {
          myData = row;
          renderMyCard();
        }

        if (row.role === partnerRole) {
          partnerData = row;
          renderPartnerCard();
        }
      }
    )
    .subscribe();
}

function timeAgo(dateString) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function startTimeUpdater() {
  setInterval(() => {
    if (myData?.updated_at) {
      myTimeEl.textContent = timeAgo(myData.updated_at);
    }

    if (partnerData?.updated_at) {
      partnerTimeEl.textContent = timeAgo(partnerData.updated_at);
    }
  }, 1000);
}

/* SHEET */

function openSheet() {
  bottomSheet.classList.add("active");
  sheetBackdrop.classList.remove("hidden");
}

function closeSheet() {
  bottomSheet.classList.remove("active");
  sheetBackdrop.classList.add("hidden");
}

statusBtn.addEventListener("click", openSheet);

sheetBackdrop.addEventListener("click", closeSheet);

document.querySelectorAll(".sheet-item").forEach((item) => {
  item.addEventListener("click", async () => {
    const status = item.dataset.status;

    await updateStatus(status);

    closeSheet();
  });
});

/* DRAG */

let startY = 0;
let currentY = 0;
let dragging = false;

sheetHandle.addEventListener("touchstart", (e) => {
  dragging = true;
  startY = e.touches[0].clientY;
});

window.addEventListener("touchmove", (e) => {
  if (!dragging) return;

  currentY = e.touches[0].clientY - startY;

  if (currentY > 0) {
    bottomSheet.style.transform = `translateY(${currentY}px)`;
  }
});

window.addEventListener("touchend", () => {
  if (!dragging) return;

  dragging = false;

  if (currentY > 100) {
    closeSheet();
  }

  bottomSheet.style.transform = "";

  currentY = 0;
});

/* QUOTES */

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeQuote(text) {
  quoteText.textContent = "";

  for (let i = 0; i <= text.length; i++) {
    quoteText.textContent = text.slice(0, i);
    await sleep(60);
  }

  await sleep(2200);

  for (let i = text.length; i >= 0; i--) {
    quoteText.textContent = text.slice(0, i);
    await sleep(28);
  }

  await sleep(300);
}

async function startQuotes() {
  while (true) {
    const quote =
      quotes[Math.floor(Math.random() * quotes.length)];

    await typeQuote(quote);
  }
}

/* FLUTTER */

const radius = 40;
const circumference = 2 * Math.PI * radius;

progressCircle.style.strokeDasharray = circumference;
progressCircle.style.strokeDashoffset = circumference;

let holdInterval = null;
let holdStart = 0;
let flutterTriggered = false;

function resetProgress() {
  progressCircle.style.strokeDashoffset = circumference;
}

function createHeart() {
  const heart = document.createElement("div");

  heart.className = "float-heart";
  heart.textContent = "";

  const rect = flutterBtn.getBoundingClientRect();

  heart.style.left = rect.left + rect.width / 2 - 10 + "px";
  heart.style.top = rect.top + "px";

  flutterOverlay.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 1800);
}

function sendFlutter() {
  flutterTriggered = true;

  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      createHeart();
    }, i * 80);
  }

  navigator.vibrate?.(80);
}

function holdStartAction() {
  flutterTriggered = false;
  holdStart = Date.now();

  holdInterval = setInterval(() => {
    const elapsed = Date.now() - holdStart;
    const progress = Math.min(elapsed / 2000, 1);

    progressCircle.style.strokeDashoffset =
      circumference - circumference * progress;

    if (progress >= 1 && !flutterTriggered) {
      sendFlutter();
    }
  }, 16);
}

function holdEndAction() {
  clearInterval(holdInterval);
  resetProgress();
}

flutterBtn.addEventListener("touchstart", holdStartAction);
flutterBtn.addEventListener("mousedown", holdStartAction);

window.addEventListener("touchend", holdEndAction);
window.addEventListener("mouseup", holdEndAction);

init();
