// 1. Supabase Setup
const SUPABASE_URL = "https://ehjfkrabnbgbfiaqlwfd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamZrcmFibmJnYmZpYXFsd2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzcxMTksImV4cCI6MjA5MTE1MzExOX0.4qC2R9UyauOLhqfuMos8JX2nR02KDYJXumOEoazDa1k";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// User State (ဒီနေရာမှာ Sketchware ကပို့ပေးတဲ့ ID ကို ရယူရမယ်)
let currentUserId = null; 
let partnerId = null;

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page' + pageId).classList.add('active');
    // Active class on nav icon
    event.currentTarget.classList.add('active');
}

// 2. Real-time Listening (Partner ဆီက Miss You လာရင် Noti ပြဖို့)
function initRealtime() {
    supabase
        .channel('public:buzz')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'buzz',
            filter: `receiver_id=eq.${currentUserId}` 
        }, payload => {
            handleIncomingMiss(payload.new);
        })
        .subscribe();
}

// 3. Handle Incoming Miss (Partner Side Vibration & Noti)
function handleIncomingMiss(data) {
    const noti = document.getElementById('float-noti');
    const desc = document.getElementById('noti-desc');
    
    desc.innerText = "Your partner is missing you! ";
    noti.classList.add('active');

    // Partner Vibration Pattern (1.5s on, 1s off, 3 times)
    if (navigator.vibrate) {
        navigator.vibrate([1500, 1000, 1500, 1000, 1500]);
    }

    // Auto hide after 5 seconds
    setTimeout(() => {
        noti.classList.remove('active');
    }, 5000);
}

// 4. Send Miss You (Your Side)
document.getElementById('miss-you-btn').addEventListener('click', async () => {
    if (!partnerId) return alert("Partner not connected!");

    const feedback = document.getElementById('feedback');
    feedback.innerText = "Sending Love...";

    // Your Side Vibration (1s)
    if (navigator.vibrate) {
        navigator.vibrate(1000);
    }

    // Supabase ထဲကို Data ထည့်မယ်
    const { error } = await supabase
        .from('buzz')
        .insert([
            { 
                user_id: currentUserId, 
                receiver_id: partnerId,
                type: 'miss_you',
                content: 'I miss you so much!'
            }
        ]);

    if (!error) {
        feedback.innerText = "Sent successfully!";
        setTimeout(() => { feedback.innerText = ""; }, 2000);
    }
});

// 5. App Initialization (Sketchware ဆီက UID ကို URL ကနေ ဖတ်မယ်)
window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentUserId = urlParams.get('uid'); // Sketchware က ?uid=... ဆိုပြီး ပို့ပေးရမယ်

    if (currentUserId) {
        // Partner ID ကို couples table ကနေ ရှာမယ်
        const { data, error } = await supabase
            .from('couples')
            .select('*')
            .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
            .eq('status', 'active')
            .single();

        if (data) {
            partnerId = (data.user_one_id === currentUserId) ? data.user_two_id : data.user_one_id;
            initRealtime();
        }
    }
};
