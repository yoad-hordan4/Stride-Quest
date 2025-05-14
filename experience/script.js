let nearbyTrails = [];
const BASE_URL = `${window.location.origin}`;

let currentCheckpointIndex = 0;
let currentTrail = null;
let watcherId = null;
let map, userMarker, checkpointMarkers = [];

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

  console.log("🌐 Fetching from:", `${BASE_URL}/trails/nearby`);
  fetch(`${BASE_URL}/trails/nearby`, {
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
  })
  .catch(error => {
    console.error("❌ Failed to fetch trails:", error);
  });
}

function getTrailInfo() {
  const trailId = document.getElementById('trailSelect').value;
  const selected = nearbyTrails.find(t => t.id == trailId);

  if (!selected) {
    alert("Trail not found.");
    return;
  }

  document.getElementById('trailInfo').innerHTML = `
    <h3>${selected.name}</h3>
    <p><strong>Location:</strong> ${selected.closest_city}</p>
    <p><strong>Trail length:</strong> ${selected.length_km ?? 'unknown'} km</p>
    <p><strong>Distance from you:</strong> ${selected.distance_km ?? 'N/A'} km</p>
    <p><strong>History:</strong> ${selected.history ?? 'No history available.'}</p>
    <button onclick="startHike(${selected.id})">Start Hike</button>
  `;
}

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

    <div id="map" style="height: 300px; margin-top: 20px;"></div>

    <div id="checkpointArea" style="margin-top:20px;">
      <p><strong>Next checkpoint:</strong> ${currentTrail.checkpoints[0].title}</p>
      <button onclick="skipToNextCheckpoint()">🚀 Skip to next (dev only)</button>
    </div>
  `;

  watcherId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    if (!map) {
      initMap(lat, lon);
    } else {
      userMarker.setLatLng([lat, lon]);
    }

    handlePositionUpdate(pos);
  }, showError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });

  updateProgress();
}

function handlePositionUpdate(position) {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;

  const checkpoint = currentTrail.checkpoints[currentCheckpointIndex];
  const dist = getDistance(userLat, userLon, checkpoint.lat, checkpoint.lon);
  console.log(`🛰️ Distance to checkpoint: ${dist.toFixed(2)} km`);

  if (dist < 0.05) {
    triggerCheckpoint(checkpoint);
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
    navigator.vibrate(300);
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

function skipToNextCheckpoint() {
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

  watcherId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    if (!map) {
      initMap(lat, lon);
    } else {
      userMarker.setLatLng([lat, lon]);
    }

    handlePositionUpdate(pos);
  }, showError, {
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
    console.warn("📛 Geolocation error:", error.message);
  
    const banner = document.getElementById("errorBanner");
    banner.style.display = "block";
    banner.textContent = "⚠️ Location error: " + error.message;
  
    // Dev fallback (optional):
    console.log("🧪 Using fallback location: Tel Aviv");
    showPosition({ coords: { latitude: 32.0853, longitude: 34.7818 } });
}

function initMap(lat, lon) {
  map = L.map('map').setView([lat, lon], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  userMarker = L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();

  checkpointMarkers = currentTrail.checkpoints.map(cp => {
    return L.marker([cp.lat, cp.lon])
      .addTo(map)
      .bindPopup(cp.title);
  });
}