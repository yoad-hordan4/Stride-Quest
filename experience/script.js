'use strict';

const DEFAULT_LAT = 32.1670;
const DEFAULT_LON = 34.8045;

let nearbyTrails = [];
const BASE_URL = `${window.location.origin}`;

let currentCheckpointIndex = 0;
let currentTrail = null;
let watcherId = null;
let map, userMarker, checkpointMarkers = [];
let trailLine = null;

// ✅ Expose public functions so buttons can call them
window.getLocation = getLocation;
window.getTrailInfo = getTrailInfo;
window.startHike = startHike;
window.exitGame = exitGame;
window.skipToNextCheckpoint = skipToNextCheckpoint;
window.checkAnswer = checkAnswer;
window.nextCheckpoint = nextCheckpoint;



function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function showPosition(position) {
  let lat, lon;

  if (position && position.coords) {
    lat = position.coords.latitude;
    lon = position.coords.longitude;
  } else {
    alert("⚠️ Location not available. Using default location.");
    lat = DEFAULT_LAT;
    lon = DEFAULT_LON;
  }

  fetch(`${BASE_URL}/trails/nearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lon, radius_km: 200 })
  })
  .then(res => res.json())
  .then(data => {
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
    console.error("Failed to fetch trails:", error);
  });
}

function getTrailInfo() {
  const trailId = document.getElementById('trailSelect').value;
  const selected = nearbyTrails.find(t => t.id == trailId);

  if (!selected) return alert("Trail not found.");

  const info = document.getElementById('trailInfo');
  info.innerHTML = `
    <h3>${selected.name}</h3>
    <p><strong>Location:</strong> ${selected.closest_city}</p>
    <p><strong>Trail length:</strong> ${selected.length_km ?? 'unknown'} km</p>
    <p><strong>Distance from you:</strong> ${selected.distance_km ?? 'N/A'} km</p>
    <p><strong>History:</strong> ${selected.history ?? 'No history available.'}</p>
    <button onclick="startHike(${selected.id})">Start Hike</button>
  `;
  info.style.display = 'block';
}

function startHike(trailId) {
    currentTrail = nearbyTrails.find(t => t.id == trailId);
    currentCheckpointIndex = 0;
  
    if (!currentTrail || !currentTrail.checkpoints?.length) {
      alert("No checkpoints available for this trail.");
      return;
    }
  
    // 👉 Hide all pre-game UI
    document.getElementById('preGame').style.display = 'none';
    document.getElementById('trailInfo').style.display = 'none';
    document.getElementById('trailSelectArea').style.display = 'none';
    document.getElementById('exitGame').style.display = 'block';
    document.getElementById('gameArea').style.display = 'block';
  
    // 🚨 Clear previous content just in case
    document.getElementById('trailInfo').innerHTML = '';
    document.getElementById('gameArea').innerHTML = `
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
  
    console.log(`🚶‍♂️ Starting hike on: ${currentTrail.name}`);
    console.log(`⏩ Current checkpoint: ${currentTrail.checkpoints[0].title}`);

    // 📍 Show map even before we have a location
    initMap(DEFAULT_LAT, DEFAULT_LON);

    // 📍 Start live tracking
    watcherId = navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      if (!map) initMap(lat, lon);
      else userMarker.setLatLng([lat, lon]);
      handlePositionUpdate(pos);
    }, showError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
  
    updateProgress();
}
  

function exitGame() {
    if (confirm("Are you sure you want to exit the hike?")) {
      document.getElementById('preGame').style.display = 'block';
      document.getElementById('trailInfo').style.display = 'none';
      document.getElementById('trailSelectArea').style.display = 'none';
      document.getElementById('gameArea').style.display = 'none';
      document.getElementById('exitGame').style.display = 'none';
  
      // Clear game state
      document.getElementById('gameArea').innerHTML = '';
      currentCheckpointIndex = 0;
      currentTrail = null;
  
      if (watcherId) {
        navigator.geolocation.clearWatch(watcherId);
      }
    }
}
  

function handlePositionUpdate(position) {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;
  const checkpoint = currentTrail.checkpoints[currentCheckpointIndex];
  const dist = getDistance(userLat, userLon, checkpoint.lat, checkpoint.lon);
  if (dist < 0.05) triggerCheckpoint(checkpoint);
}

function triggerCheckpoint(cp) {
  updateProgress();
  playBeep();
  if ("vibrate" in navigator) navigator.vibrate(300);
  navigator.geolocation.clearWatch(watcherId);
  document.getElementById('checkpointArea').innerHTML = `
    <h3>📍 ${cp.title}</h3>
    <p><strong>Quiz:</strong> ${cp.quiz.question}</p>
    ${cp.quiz.options.map(opt => `<button onclick="checkAnswer('${opt}', '${cp.quiz.answer}')">${opt}</button>`).join('')}
  `;
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
  currentCheckpointIndex++;
  if (currentCheckpointIndex >= currentTrail.checkpoints.length) {
    document.getElementById('checkpointArea').innerHTML = `<h3>🎉 Trail Complete!</h3>`;
    return;
  }

  const cp = currentTrail.checkpoints[currentCheckpointIndex];
  document.getElementById('checkpointArea').innerHTML = `
    <p><strong>Next checkpoint:</strong> ${cp.title}</p>
    <button onclick="skipToNextCheckpoint()">🚀 Skip to next (dev only)</button>
  `;

  watcherId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (!map) initMap(lat, lon);
    else userMarker.setLatLng([lat, lon]);
    handlePositionUpdate(pos);
  }, showError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });

  updateProgress();
}

function skipToNextCheckpoint() {
  triggerCheckpoint(currentTrail.checkpoints[currentCheckpointIndex]);
}

function updateProgress() {
  const total = currentTrail.checkpoints.length;
  const current = currentCheckpointIndex;
  const progress = Math.min(current / total, 1);
  document.getElementById('trailProgress').value = progress;
  document.getElementById('progressLabel').innerText = `Checkpoint ${current + 1} of ${total}`;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function toRad(value) {
  return value * Math.PI / 180;
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function showError(error) {
  document.getElementById("errorBanner").style.display = "block";
  document.getElementById("errorBanner").textContent =
    "⚠️ Location error: " + error.message + " Using default location.";

  if (currentTrail) {
    if (!map) {
      initMap(DEFAULT_LAT, DEFAULT_LON);
    }
    if (userMarker) {
      userMarker.setLatLng([DEFAULT_LAT, DEFAULT_LON]);
    }
  } else {
    showPosition({ coords: { latitude: DEFAULT_LAT, longitude: DEFAULT_LON } });
  }
}

function initMap(lat, lon) {
    if (map) {
      map.remove(); // ✅ destroy previous map instance
    }

    map = L.map('map').setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    userMarker = L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();
    checkpointMarkers = currentTrail.checkpoints.map(cp =>
      L.marker([cp.lat, cp.lon]).addTo(map).bindPopup(cp.title)
    );

    const points = (currentTrail.gpx_points && currentTrail.gpx_points.length)
      ? currentTrail.gpx_points.map(p => [p.lat, p.lon])
      : currentTrail.checkpoints.map(cp => [cp.lat, cp.lon]);
    if (trailLine) trailLine.remove();
    trailLine = L.polyline(points, { color: 'blue' }).addTo(map);
  }

function  take_photo(){
  
}