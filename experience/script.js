let nearbyTrails = [];

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    console.log("📍 Location:", lat, lon);
  
    fetch('http://localhost:8000/trails/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon, radius_km: 100 })
    })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Nearby trails received:", data);
      nearbyTrails = data;
  
      const select = document.getElementById('trailSelect');
      select.innerHTML = '';
  
      data.forEach(trail => {
        const option = document.createElement('option');
        option.value = trail.id;
        option.text = `${trail.name} (${trail.distance_km} km away)`;
        select.appendChild(option);
      });
  
      if (data.length > 0) {
        document.getElementById('trailSelectArea').style.display = 'block';
      } else {
        alert("No nearby trails found.");
      }
  
      // DO NOT use trail here — it's out of scope
    })
    .catch(error => {
      console.error("❌ Failed to fetch trails:", error);
    });
  }
  

function getTrailInfo() {
    const trailId = document.getElementById('trailSelect').value;
    const selected = nearbyTrails.find(t => t.id == trailId); // ✅ This is the correct object
  
    if (!selected) {
      alert("Trail not found.");
      return;
    }
  
    document.getElementById('trailInfo').innerHTML = `
    <h3>${selected.name}</h3>
    <p><strong>ID:</strong> ${selected.id}</p>
    <p><strong>Location:</strong> ${selected.latitude}, ${selected.longitude}</p>
    <p><strong>Trail length:</strong> ${selected.length_km ?? 'unknown'} km</p>
    <p><strong>Distance from you:</strong> ${selected.distance_km ?? 'N/A'} km</p>
    <p><strong>History:</strong> ${selected.history ?? 'No history available.'}</p>
    <button onclick="startHike(${selected.id})">Start Hike</button>
    `;
}

let currentCheckpointIndex = 0;
let currentTrail = null;
let watcherId = null;

function startHike(trailId) {
  currentTrail = nearbyTrails.find(t => t.id == trailId);
  currentCheckpointIndex = 0;

  if (!currentTrail || !currentTrail.checkpoints?.length) {
    alert("No checkpoints available for this trail.");
    return;
  }
  console.log(`🚶‍♂️ Starting hike on: ${currentTrail.name}`);
  console.log(`⏩ Current checkpoint: ${currentTrail.checkpoints[0].title}`);


  document.getElementById('trailInfo').innerHTML = `
  <h2>🗺️ ${currentTrail.name} - Hike in Progress</h2>
  <p>${currentTrail.history}</p>

  <div id="progressDisplay">
    <progress id="trailProgress" value="0" max="1" style="width:100%;"></progress>
    <p id="progressLabel">Checkpoint 1 of ${currentTrail.checkpoints.length}</p>
  </div>

  <div id="checkpointArea" style="margin-top:20px;">
    <p><strong>Next checkpoint:</strong> ${currentTrail.checkpoints[0].title}</p>
    <button onclick="skipToNextCheckpoint()">🚀 Skip to next (dev only)</button>
  </div>
  `;


  if (navigator.geolocation) {
    watcherId = navigator.geolocation.watchPosition(handlePositionUpdate, showError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
  } else {
    alert("Geolocation is not supported by your browser.");
  }
  updateProgress();
}

function handlePositionUpdate(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
  
    const checkpoint = currentTrail.checkpoints[currentCheckpointIndex];
    const dist = getDistance(userLat, userLon, checkpoint.lat, checkpoint.lon);
    console.log(`🛰️ Distance to checkpoint: ${dist.toFixed(2)} km`);
  
    if (dist < 0.05) { // 50 meters
      triggerCheckpoint(checkpoint);
    }
}


function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
  
function toRad(value) {
    return value * Math.PI / 180;
}
  

function triggerCheckpoint(checkpoint) {
    console.log(`📍 Reached checkpoint ${currentCheckpointIndex + 1}: ${checkpoint.title}`);
    updateProgress();
    playBeep();
    if ("vibrate" in navigator) {
        navigator.vibrate(300); // vibrate 300ms
    }
    navigator.geolocation.clearWatch(watcherId);
    document.getElementById('checkpointArea').innerHTML = `
      <h3>📍 ${checkpoint.title}</h3>
      <p><strong>Quiz:</strong> ${checkpoint.quiz.question}</p>
      ${checkpoint.quiz.options.map(opt => `
        <button onclick="checkAnswer('${opt}', '${checkpoint.quiz.answer}')">${opt}</button>
      `).join('')}
    `;
}
  
  
function skipToNextCheckpoint() { //for development purposes
    const checkpoint = currentTrail.checkpoints[currentCheckpointIndex];
    triggerCheckpoint(checkpoint);
}


function checkAnswer(selected, correct) {
    const result = selected === correct
      ? "✅ Correct! Great job."
      : `❌ Oops! The correct answer was: ${correct}`;
  
    document.getElementById('checkpointArea').innerHTML = `
      <p>${result}</p>
      <button onclick="nextCheckpoint()">➡️ Continue</button>
    `;
}


function nextCheckpoint() {
    updateProgress();
    currentCheckpointIndex++;
    console.log(`➡️ Moving to checkpoint ${currentCheckpointIndex + 1}`);
    if (currentCheckpointIndex >= currentTrail.checkpoints.length) {
      document.getElementById('checkpointArea').innerHTML = `<h3>🎉 Trail Complete!</h3>`;
      return;
    }
  
    const checkpoint = currentTrail.checkpoints[currentCheckpointIndex];
    document.getElementById('checkpointArea').innerHTML = `
      <p><strong>Next checkpoint:</strong> ${checkpoint.title}</p>
      <button onclick="skipToNextCheckpoint()">🚀 Skip to next (dev only)</button>
    `;
  
    // Restart location tracking
    watcherId = navigator.geolocation.watchPosition(handlePositionUpdate, showError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
}

function updateProgress() {
    const total = currentTrail.checkpoints.length;
    const current = currentCheckpointIndex;
    const progress = Math.min(current / total, 1);
    document.getElementById('trailProgress').value = progress;
    document.getElementById('progressLabel').innerText = `Checkpoint ${current + 1} of ${total}`;
}
  

function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
}
  

function showError(error) {
  alert("Error getting location: " + error.message);
}
