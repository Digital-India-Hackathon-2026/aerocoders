// ==========================================
// 1. GLOBAL CORE APPLICATION STATE
// ==========================================
let appState = {
    authenticated: false,
    authMode: 'login',
    selectedAirline: 'Air India',
    selectedClass: 'Economy',
    allowances: { cabin: 7.0, checkin: 15.0 },
    scannedItems: [], 
    currentPrediction: null,
    cameraStream: null
};

// ==========================================
// 2. DATA MODELS & RULE ENGINE MATRIX
// ==========================================
const simulatedMockBackends = [
    { item_category: 'Power Bank', emoji: '🔋', placement_logic: 'CABIN_ONLY', handling_notes: 'Must be under 20,000mAh.' },
    { item_category: 'Perfume Bottle', emoji: '🧴', placement_logic: 'BOTH', handling_notes: 'Max 100ml in cabin allowed.' },
    { item_category: 'Dry Cell Batteries', emoji: '🪫', placement_logic: 'CHECKIN_ONLY', handling_notes: 'Prohibited from loose cabin stowage.' },
    { item_category: 'Lighter', emoji: '🔥', placement_logic: 'PROHIBITED', handling_notes: 'Completely banned on aircraft operations.' }
];

const tierRuleMatrix = {
    'Economy': { cabin: 7.0, checkin: 15.0 },
    'Flex Plus': { cabin: 7.0, checkin: 20.0 },
    'Business': { cabin: 12.0, checkin: 35.0 },
    'First Class': { cabin: 15.0, checkin: 40.0 }
};

// ==========================================
// 3. AUTHENTICATION MODULE (LOCAL SANDBOX)
// ==========================================
function handleEmailAuthSubmit(event) {
    event.preventDefault(); // Stop standard page refreshing anomalies
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error-msg');
    
    errorEl.classList.add('hidden');

    // Structural input validation check
    if (!email.includes('@') || email.length < 5) {
        errorEl.textContent = "❌ Check email structure. Must be a valid format.";
        errorEl.classList.remove('hidden');
        return;
    }

    if (password.length < 4) {
        errorEl.textContent = "❌ Password must be at least 4 characters.";
        errorEl.classList.remove('hidden');
        return;
    }

    if (appState.authMode === 'login') {
        // Log in locally instantly 
        executeAppSessionHandshake("Verifying local user sandbox...", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100");
    } else {
        alert("🚀 Account registered locally! Toggling back to Sign In form.");
        toggleAuthMode();
    }
}

function handleGoogleLocalAuth() {
    const googleUserAvatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100";
    executeAppSessionHandshake("Connecting secure Google OAuth Profile channel...", googleUserAvatar);
}

function toggleAuthMode() {
    const title = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleLink = document.getElementById('auth-toggle-link');
    document.getElementById('auth-error-msg').classList.add('hidden');
    
    if (appState.authMode === 'login') {
        appState.authMode = 'signup';
        title.textContent = "Create Account Pipeline";
        submitBtn.textContent = "Register Profile";
        toggleLink.textContent = "Already have an account? Sign In";
    } else {
        appState.authMode = 'login';
        title.textContent = "Secure Identity Gateway";
        submitBtn.textContent = "Sign In";
        toggleLink.textContent = "Don't have an account? Create one";
    }
}

function executeAppSessionHandshake(message, resolvedAvatar) {
    const loader = document.getElementById('auth-loading-screen');
    const txt = document.getElementById('auth-loading-text');
    
    loader.classList.remove('hidden');
    txt.textContent = message;

    setTimeout(() => {
        document.getElementById('user-avatar').src = resolvedAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
        appState.authenticated = true;
        loader.classList.add('hidden');
        document.getElementById('view-auth').classList.add('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        navigateTo('home');
    }, 1200);
}

function logout() {
    appState.authenticated = false;
    stopCameraHardware();
    document.getElementById('main-nav').classList.add('hidden');
    navigateTo('auth');
}

// ==========================================
// 4. CORE VIEW NAVIGATION CONTROLLER
// ==========================================
function navigateTo(viewId) {
    ['auth', 'home', 'scanner', 'checklist'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(`view-${viewId}`).classList.remove('hidden');

    if(viewId !== 'auth') {
        document.querySelectorAll('.nav-link').forEach(el => {
            el.className = "nav-link text-zinc-400 hover:text-white pb-2 transition-all text-sm font-semibold";
        });
        const activeNavBtn = Array.from(document.querySelectorAll('.nav-link')).find(el => {
            return el.textContent.toLowerCase() === (viewId === 'scanner' ? 'ai capture' : viewId);
        });
        if (activeNavBtn) activeNavBtn.className = "nav-link text-green-400 border-b-2 border-green-400 pb-2 transition-all text-sm font-semibold";
    }

    if(viewId === 'scanner') startCameraHardware();
    else stopCameraHardware();

    if(viewId === 'checklist') renderChecklist();
}

// ==========================================
// 5. HARDWARE WEB CAMERA MANAGEMENT LAYER
// ==========================================
async function startCameraHardware() {
    const video = document.getElementById('webcam-stream');
    const fallback = document.getElementById('camera-fallback-placeholder');
    const statusLabel = document.getElementById('camera-status-label');

    try {
        appState.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = appState.cameraStream;
        video.classList.remove('hidden');
        fallback.classList.add('hidden');
        statusLabel.textContent = "🟢 Shutter Array Connected Live";
        statusLabel.className = "text-xs font-semibold text-emerald-400";
    } catch (err) {
        statusLabel.textContent = "🔴 Running Sandbox Emulation Mode";
        statusLabel.className = "text-xs font-semibold text-rose-500";
    }
}

function stopCameraHardware() {
    if(appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(track => track.stop());
        appState.cameraStream = null;
    }
}

function toggleCameraHardware() {
    stopCameraHardware();
    startCameraHardware();
}

// ==========================================
// 6. AIRLINE FLIGHT DECK LOGIC CONTROLS
// ==========================================
function selectAirline(airlineName) {
    appState.selectedAirline = airlineName;
    document.getElementById('badge-ai').className = "text-[10px] uppercase font-bold tracking-widest text-zinc-500 border border-zinc-800 px-2.5 py-1 rounded-full";
    document.getElementById('badge-ai').textContent = "Inactive";
    document.getElementById('badge-indigo').className = "text-[10px] uppercase font-bold tracking-widest text-zinc-500 border border-zinc-800 px-2.5 py-1 rounded-full";
    document.getElementById('badge-indigo').textContent = "Inactive";

    document.querySelectorAll('.airline-card').forEach(el => {
        el.style.borderColor = 'transparent';
        el.style.backgroundColor = 'rgba(22, 25, 32, 0.4)';
    });
    
    const targetId = airlineName === 'Air India' ? 'airline-airindia' : 'airline-indigo';
    const badgeId = airlineName === 'Air India' ? 'badge-ai' : 'badge-indigo';
    const color = airlineName === 'Air India' ? '#f97316' : '#3b82f6';
    
    document.getElementById(targetId).style.borderColor = color;
    document.getElementById(targetId).style.backgroundColor = '#1a1e26';
    document.getElementById(badgeId).textContent = "ACTIVE ENGINE";
    document.getElementById(badgeId).className = "text-[10px] uppercase font-bold tracking-widest text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full bg-emerald-500/5";
    
    document.getElementById('class-selection-container').classList.remove('hidden');
    selectCabinClass(appState.selectedClass);
}

function selectCabinClass(className) {
    appState.selectedClass = className;
    appState.allowances = tierRuleMatrix[className];

    document.querySelectorAll('.tier-card').forEach(el => {
        el.className = "tier-card p-4 rounded-xl border border-zinc-800 bg-[#13161d] text-center transition-all hover:border-zinc-600";
    });

    if(document.getElementById(`tier-${className}`)) {
        document.getElementById(`tier-${className}`).className = "tier-card p-4 rounded-xl border border-green-500 bg-green-500/5 text-center transition-all shadow-lg";
    }

    const banner = document.getElementById('selected-airline-banner');
    banner.innerHTML = `🎯 Rules Engine: <span class="text-white">${appState.selectedAirline} (${className})</span> Cabin Limit capped at <span class="text-white">${appState.allowances.cabin} KG</span>`;
    banner.classList.remove('hidden');
}

// ==========================================
// 7. COMPUTER VISION DECK SHUTTER & EVALUATION
// ==========================================
function triggerBackendPrediction() {
    const randomPick = simulatedMockBackends[Math.floor(Math.random() * simulatedMockBackends.length)];
    appState.currentPrediction = randomPick;

    document.getElementById('animated-item-target').textContent = randomPick.emoji;
    document.getElementById('animated-item-label').textContent = `Inference Output: ${randomPick.item_category}`;
    document.getElementById('weight-input-container').classList.remove('hidden');
    document.getElementById('item-weight').focus();
}

function executeAnimateDropAllocation(item, parsedWeight) {
    let targetTray = 'cabin';
    if(item.placement_logic === 'CHECKIN_ONLY') targetTray = 'checkin';
    if(item.placement_logic === 'PROHIBITED') {
        alert(`❌ Danger Object Detected: ${item.item_category} is strictly banned across all compartments!`);
        document.getElementById('weight-input-container').classList.add('hidden');
        document.getElementById('item-weight').value = '';
        return;
    }

    appState.scannedItems.push({
        id: Date.now(),
        name: item.item_category,
        targetBox: targetTray, 
        weight: parsedWeight,
        emoji: item.emoji,
        notes: item.handling_notes
    });

    const boxInnerList = document.getElementById(`box-${targetTray}-items`);
    if(boxInnerList.textContent === 'Empty') boxInnerList.textContent = '';
    
    boxInnerList.insertAdjacentHTML('beforeend', `<span class="inline-flex items-center bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-[11px] font-bold text-white">${item.emoji} ${parsedWeight}k</span>`);
    document.getElementById('weight-input-container').classList.add('hidden');
    document.getElementById('item-weight').value = '';
}

// ==========================================
// 8. METRIC PROGRESS AGGREGATOR DISPLAY
// ==========================================
function renderChecklist() {
    const cabinListEl = document.getElementById('checklist-cabin-list');
    const checkinListEl = document.getElementById('checklist-checkin-list');
    cabinListEl.innerHTML = '';
    checkinListEl.innerHTML = '';

    let totalCabinWeight = 0;
    let totalCheckinWeight = 0;

    appState.scannedItems.forEach(item => {
        const rowHTML = `
            <div class="bg-[#181c25] p-3.5 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <span class="text-2xl">${item.emoji}</span>
                    <div>
                        <h4 class="font-bold text-slate-200 text-xs">${item.name}</h4>
                        <p class="text-[10px] text-zinc-500 max-w-xs mt-0.5">${item.notes}</p>
                        <span class="inline-block text-[9px] font-bold text-zinc-400 bg-[#222733] px-2 py-0.5 rounded mt-1.5">${item.weight} KG</span>
                    </div>
                </div>
                <span class="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Passed</span>
            </div>
        `;
        if(item.targetBox === 'cabin') {
            totalCabinWeight += item.weight;
            cabinListEl.insertAdjacentHTML('beforeend', rowHTML);
        } else {
            totalCheckinWeight += item.weight;
            checkinListEl.insertAdjacentHTML('beforeend', rowHTML);
        }
    });

    document.getElementById('metric-cabin-weight').textContent = `${totalCabinWeight.toFixed(1)} / ${appState.allowances.cabin}.0 KG`;
    document.getElementById('metric-checkin-weight').textContent = `${totalCheckinWeight.toFixed(1)} / ${appState.allowances.checkin}.0 KG`;
    
    const progressCabinPercent = (totalCabinWeight / appState.allowances.cabin) * 100;
    const progressCheckinPercent = (totalCheckinWeight / appState.allowances.checkin) * 100;
    
    document.getElementById('progress-cabin').style.width = `${Math.min(progressCabinPercent, 100)}%`;
    document.getElementById('progress-checkin').style.width = `${Math.min(progressCheckinPercent, 100)}%`;

    const optBanner = document.getElementById('optimization-banner');
    const diagnosticsFlag = document.getElementById('metric-status-flag');
    
    if(progressCabinPercent > 100 || progressCheckinPercent > 100) {
        optBanner.classList.remove('hidden');
        diagnosticsFlag.textContent = "Overweight Alert";
        diagnosticsFlag.className = "text-sm font-black uppercase tracking-wider text-rose-500";
    } else {
        optBanner.classList.add('hidden');
        diagnosticsFlag.textContent = "Within Thresholds";
        diagnosticsFlag.className = "text-sm font-black uppercase tracking-wider text-emerald-400";
    }
}

// ==========================================
// 9. CORE APPLICATION LIFECYCLE INITIALIZER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('item-weight').addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
            const val = parseFloat(this.value);
            if(val > 0 && appState.currentPrediction) executeAnimateDropAllocation(appState.currentPrediction, val);
        }
    });
    selectAirline('Air India');
});