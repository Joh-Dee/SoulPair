// ======================= CONFIG =======================
const SUPABASE_URL = "https://qmzgwmcdnzfsfqtghkhn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemd3bWNkbnpmc2ZxdGdoa2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDkzMzAsImV4cCI6MjA5MDk4NTMzMH0.tl3YdHFYufETFO9fXDgGTqPRDUwEuayO1cR04";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentCoupleId = null;
let currentProfile = null;

// DOM elements
const authCard = document.getElementById('authCard');
const profileCard = document.getElementById('profileCard');
const mainApp = document.getElementById('mainApp');
const authError = document.getElementById('authError');

// Helper: show view
function setView(viewId) {
  document.querySelectorAll('.card, .app-container').forEach(el => el.classList.remove('active-view'));
  if (viewId === 'auth') authCard.classList.add('active-view');
  if (viewId === 'profile') profileCard.classList.add('active-view');
  if (viewId === 'app') mainApp.classList.add('active-view');
}

// ======================= AUTH =======================
async function handleSignup() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || password.length < 6) {
    authError.innerText = 'Valid email & password (min 6 chars)';
    return;
  }
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) authError.innerText = error.message;
  else alert(' Signup success! Please login now.');
}

async function handleLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authError.innerText = error.message;
    return;
  }
  currentUser = data.user;
  await checkUserProfile();
}

async function checkUserProfile() {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();
  
  if (error || !profile) {
    setView('profile');
  } else {
    currentProfile = profile;
    currentCoupleId = profile.couple_id;
    if (!currentCoupleId) {
      setView('profile');
      document.getElementById('profileError').innerText = 'Please create or join a couple.';
    } else {
      await initApp();
      setView('app');
    }
  }
}

// ======================= PROFILE & COUPLE LOGIC =======================
async function createNewCouple() {
  const name = document.getElementById('profileName').value.trim();
  const startDate = document.getElementById('profileStartDate').value;
  if (!name || !startDate) {
    document.getElementById('profileError').innerText = 'Name and start date required.';
    return;
  }
  // generate invite code (6 digits)
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  // create couple
  const { data: couple, error: coupleErr } = await supabase
    .from('couples')
    .insert({ invite_code: inviteCode })
    .select()
    .single();
  if (coupleErr) {
    document.getElementById('profileError').innerText = coupleErr.message;
    return;
  }
  // create user profile
  const { error: userErr } = await supabase.from('users').insert({
    id: currentUser.id,
    email: currentUser.email,
    name: name,
    rs_start_date: startDate,
    couple_id: couple.id
  });
  if (userErr) {
    document.getElementById('profileError').innerText = userErr.message;
    return;
  }
  currentCoupleId = couple.id;
  await initApp();
  setView('app');
  alert(` Couple created! Your invite code: ${inviteCode} (share with partner)`);
}

async function joinCoupleWithCode() {
  const inviteCode = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
  const name = document.getElementById('profileName').value.trim();
  const startDate = document.getElementById('profileStartDate').value;
  if (!inviteCode || !name || !startDate) {
    document.getElementById('profileError').innerText = 'Name, start date & invite code required.';
    return;
  }
  const { data: couple, error: findErr } = await supabase
    .from('couples')
    .select('id')
    .eq('invite_code', inviteCode)
    .maybeSingle();
  if (findErr || !couple) {
    document.getElementById('profileError').innerText = 'Invalid invite code.';
    return;
  }
  const { error: userErr } = await supabase.from('users').insert({
    id: currentUser.id,
    email: currentUser.email,
    name: name,
    rs_start_date: startDate,
    couple_id: couple.id
  });
  if (userErr) {
    document.getElementById('profileError').innerText = userErr.message;
    return;
  }
  currentCoupleId = couple.id;
  await initApp();
  setView('app');
  alert(' Joined couple successfully!');
}

// ======================= APP INIT (real-time + data) =======================
async function initApp() {
  // fetch latest profile
  const { data: profile } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
  currentProfile = profile;
  currentCoupleId = profile.couple_id;
  // load days counter
  await updateDays();
  // load posts, chat, buzz feed
  await loadPosts();
  await loadChatMessages();
  await loadBuzzFeed();

  // real-time subscriptions
  supabase.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `couple_id=eq.${currentCoupleId}` }, () => loadPosts()).subscribe();
  supabase.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${currentCoupleId}` }, () => loadChatMessages()).subscribe();
  supabase.channel('public:buzz').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'buzz', filter: `couple_id=eq.${currentCoupleId}` }, () => loadBuzzFeed()).subscribe();

  // display couple code
  const { data: couple } = await supabase.from('couples').select('invite_code').eq('id', currentCoupleId).single();
  document.getElementById('displayInviteCode').innerText = couple?.invite_code || '----';
  const startDate = currentProfile.rs_start_date;
  document.getElementById('anniversaryDate').innerText = startDate ? new Date(startDate).toDateString() : 'Not set';
}

async function updateDays() {
  if (!currentProfile?.rs_start_date) return;
  const start = new Date(currentProfile.rs_start_date);
  const today = new Date();
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  document.getElementById('daysCounter').innerHTML = ` ${diffDays} days together`;
}

// ======================= POSTS =======================
async function createPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) return;
  await supabase.from('posts').insert({
    couple_id: currentCoupleId,
    user_id: currentUser.id,
    content: content
  });
  document.getElementById('postContent').value = '';
  loadPosts();
}

async function loadPosts() {
  const { data } = await supabase
    .from('posts')
    .select('*, users(name)')
    .eq('couple_id', currentCoupleId)
    .order('created_at', { ascending: false });
  const container = document.getElementById('postsList');
  if (!data?.length) { container.innerHTML = '<p> No posts yet. Share a memory!</p>'; return; }
  container.innerHTML = data.map(p => `
    <div class="post-card">
      <strong>${p.users?.name || 'Partner'}</strong><br>
      ${p.content}
      <div class="small">${new Date(p.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

// ======================= CHAT =======================
async function sendChatMessage() {
  const msg = document.getElementById('chatInput').value.trim();
  if (!msg) return;
  await supabase.from('messages').insert({
    couple_id: currentCoupleId,
    sender_id: currentUser.id,
    message: msg
  });
  document.getElementById('chatInput').value = '';
  loadChatMessages();
}

async function loadChatMessages() {
  const { data } = await supabase
    .from('messages')
    .select('*, users(name)')
    .eq('couple_id', currentCoupleId)
    .order('created_at', { ascending: true });
  const container = document.getElementById('chatMessages');
  if (!data?.length) { container.innerHTML = '<p> Start chatting!</p>'; return; }
  container.innerHTML = data.map(m => `
    <div class="chat-bubble">
      <strong>${m.users?.name || 'User'}:</strong> ${m.message}
      <div class="small">${new Date(m.created_at).toLocaleTimeString()}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

// ======================= BUZZ =======================
async function sendBuzz() {
  await supabase.from('buzz').insert({
    couple_id: currentCoupleId,
    sender_id: currentUser.id
  });
  alert(' Buzz sent!');
  loadBuzzFeed();
}

async function loadBuzzFeed() {
  const { data } = await supabase
    .from('buzz')
    .select('*, users(name)')
    .eq('couple_id', currentCoupleId)
    .order('created_at', { ascending: false })
    .limit(10);
  const list = document.getElementById('buzzList');
  if (!data?.length) { list.innerHTML = '<li>No buzz yet. Tap the buzz button!</li>'; return; }
  list.innerHTML = data.map(b => `<li> ${b.users?.name} buzzed at ${new Date(b.created_at).toLocaleTimeString()}</li>`).join('');
}

// ======================= TAB SWITCHING =======================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// ======================= EVENT LISTENERS =======================
document.getElementById('btnLogin').addEventListener('click', handleLogin);
document.getElementById('btnSignup').addEventListener('click', handleSignup);
document.getElementById('btnCreateCouple').addEventListener('click', createNewCouple);
document.getElementById('btnJoinCouple').addEventListener('click', joinCoupleWithCode);
document.getElementById('createPostBtn').addEventListener('click', createPost);
document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('buzzBtn').addEventListener('click', sendBuzz);
document.getElementById('copyCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('displayInviteCode').innerText;
  navigator.clipboard.writeText(code);
  alert('Invite code copied!');
});

// check existing session on load
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await checkUserProfile();
  } else {
    setView('auth');
  }
  setupTabs();
});
