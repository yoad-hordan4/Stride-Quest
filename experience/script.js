'use strict';
// usually incase chrome doesnt give permission access to location
const DEFAULT_LAT = 32.1670;
const DEFAULT_LON = 34.8045;

let nearbyTrails = [];
const BASE_URL = `${window.location.origin}`;

let currentCheckpointIndex = 0;
let currentTrail = null;
let currentCheckpoint = null;
let watcherId = null;
let locationIntervalId = null;
let map, userMarker, checkpointMarkers = [];
let trailLine = null;
let walkedPath = null;
let walkedPoints = [];
let currentPhotoUrl = null;
let currentPhotoBlob = null;
let capturedPhotos = JSON.parse(localStorage.getItem('capturedPhotos') || '[]');

let hasFirstFix = false; // becomes true after first real GPS fix to avoid default-origin path

let totalQuestions = 0;     // number of quiz questions in the current trail
let correctAnswers = 0;     // number of correct answers the user gave

// expose public functions so buttons can call them
window.getLocation = getLocation;
window.getTrailInfo = getTrailInfo;
window.startHike = startHike;
window.exitGame = exitGame;
window.skipToNextCheckpoint = skipToNextCheckpoint;
window.checkAnswer = checkAnswer;
window.nextCheckpoint = nextCheckpoint;
window.takePhoto = takePhoto;
window.retakePhoto = retakePhoto;
window.submitPhoto = submitPhoto;
window.viewGallery = viewGallery;

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
  // Show last score if present
  try {
    const scores = JSON.parse(localStorage.getItem('trailScores') || '{}');
    const last = scores[String(selected.id)];
    if (last) {
      const scoreEl = document.createElement('p');
      scoreEl.innerHTML = `<strong>Last score:</strong> ${last.correct} / ${last.total} (${last.percent}%)`;
      info.appendChild(scoreEl);
    }
  } catch (e) { /* ignore */ }
  info.style.display = 'block';
}

function startHike(trailId) {
    currentTrail = nearbyTrails.find(t => t.id == trailId);
    currentCheckpointIndex = 0;
    hasFirstFix = false;

    // Reset score for this hike
    correctAnswers = 0;
    // Count questions for this trail (defensive: only count checkpoints that have a quiz object)
    totalQuestions = Array.isArray(currentTrail.checkpoints)
      ? currentTrail.checkpoints.filter(cp => cp && cp.quiz && typeof cp.quiz.question === 'string').length
      : 0;

    if (!currentTrail || !currentTrail.checkpoints?.length) {
      alert("No checkpoints available for this trail.");
      return;
    }

    // hide all pre-game UI
    document.getElementById('preGame').style.display = 'none';
    document.getElementById('trailInfo').style.display = 'none';
    document.getElementById('trailSelectArea').style.display = 'none';
    document.getElementById('exitGame').style.display = 'block';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('photoArea').innerHTML = '';
    currentPhotoUrl = null;
    capturedPhotos = [];
    localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
    walkedPoints = [];
    if (walkedPath) { walkedPath.remove(); walkedPath = null; }

    // clear previous content just in case
    document.getElementById('trailInfo').innerHTML = '';
    document.getElementById('gameArea').innerHTML = `
      <h2>🗺️ ${currentTrail.name} - Hike in Progress</h2>
      <p>${currentTrail.history}</p>

      <div id="progressDisplay">
        <progress id="trailProgress" value="0" max="1" style="width:100%;"></progress>
        <p id="progressLabel">Checkpoint 1 of ${currentTrail.checkpoints.length}</p>
      </div>

      <div id="map" style="height: 80vh; margin-top: 20px;"></div>

      <div id="checkpointArea" style="margin-top:20px;">
        <p><strong>Next checkpoint:</strong> ${currentTrail.checkpoints[0].title}</p>
        <button onclick="skipToNextCheckpoint()">🚀 Skip to next (dev only)</button>
      </div>
    `;

    console.log(`Starting hike on: ${currentTrail.name}`);
    console.log(`Current checkpoint: ${currentTrail.checkpoints[0].title}`);

    // show map even before we have a location
    initMap(DEFAULT_LAT, DEFAULT_LON);

    // start live tracking
    watcherId = navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      if (!map) initMap(lat, lon);
      handlePositionUpdate(pos);
    }, showError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });

    if (locationIntervalId) clearInterval(locationIntervalId);
    locationIntervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!map) initMap(lat, lon);
        handlePositionUpdate(pos);
      }, showError, { enableHighAccuracy: true });
    }, 5000);

    updateProgress();
}
  

function exitGame() {
    if (confirm("Are you sure you want to exit the hike?")) {
      document.getElementById('preGame').style.display = 'block';
      document.getElementById('trailInfo').style.display = 'none';
      document.getElementById('trailSelectArea').style.display = 'none';
      document.getElementById('gameArea').style.display = 'none';
      document.getElementById('exitGame').style.display = 'none';
      document.getElementById('photoArea').innerHTML = '';
      currentPhotoUrl = null;
  
      // clear game state
      document.getElementById('gameArea').innerHTML = '';
      currentCheckpointIndex = 0;
      currentTrail = null;
  
      if (watcherId) {
        navigator.geolocation.clearWatch(watcherId);
      }
      if (locationIntervalId) {
        clearInterval(locationIntervalId);
        locationIntervalId = null;
      }
    }
}
  

function handlePositionUpdate(position) {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;

  if (!hasFirstFix) {
    // First real GPS fix: initialize the walked path without connecting from defaults
    if (!map) initMap(userLat, userLon);
    walkedPoints = [[userLat, userLon]];
    if (walkedPath) { walkedPath.remove(); walkedPath = null; }
    if (map) {
      walkedPath = L.polyline(walkedPoints, { color: 'orange' }).addTo(map);
    }
    hasFirstFix = true;
  }

  if (map && userMarker) {
    userMarker.setLatLng([userLat, userLon]);
    map.setView([userLat, userLon]);
  }
  if (hasFirstFix) {
    walkedPoints.push([userLat, userLon]);
    if (walkedPath) {
      walkedPath.setLatLngs(walkedPoints);
    } else if (map) {
      walkedPath = L.polyline(walkedPoints, { color: 'orange' }).addTo(map);
    }
  }
  fetch(`${BASE_URL}/progress/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trail_id: currentTrail.id,
      checkpoint_index: currentCheckpointIndex,
      latitude: userLat,
      longitude: userLon
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.reached) {
        triggerCheckpoint(currentTrail.checkpoints[currentCheckpointIndex]);
      }
    })
    .catch(err => console.error('Error checking progress:', err));
}

function triggerCheckpoint(cp) {
  currentCheckpoint = cp;
  updateProgress();
  playBeep();
  if ("vibrate" in navigator) navigator.vibrate(300);
  navigator.geolocation.clearWatch(watcherId);
  if (locationIntervalId) {
    clearInterval(locationIntervalId);
    locationIntervalId = null;
  }
  document.getElementById('checkpointArea').innerHTML = `
    <h3>📍 ${cp.title}</h3>
    <p><strong>Quiz:</strong> ${cp.quiz.question}</p>
    ${cp.quiz.options.map(opt => `<button onclick="checkAnswer('${opt}', '${cp.quiz.answer}')">${opt}</button>`).join('')}
  `;
}

function checkAnswer(selected, correct) {
  const result = selected === correct
    ? "Correct! Great job."
    : `Oh no! The correct answer was: ${correct}`;
  if (selected === correct) { correctAnswers++; }

  if (currentCheckpoint?.challenge?.type === 'photo') {
    document.getElementById('checkpointArea').innerHTML = `
      <p>${result}</p>
      <p>${currentCheckpoint.challenge.prompt}</p>
      <button onclick="takePhoto()">📸 Take Photo</button>
    `;
  } else {
    document.getElementById('checkpointArea').innerHTML = `
      <p>${result}</p>
      <button onclick="nextCheckpoint()">➡️ Continue</button>
    `;
  }
}

function nextCheckpoint() {
  currentCheckpointIndex++;
  if (currentCheckpointIndex >= currentTrail.checkpoints.length) {
    const percentScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    document.getElementById('checkpointArea').innerHTML = `
      <h3>🎉 Trail Complete!</h3>
      <p><strong>Your Score:</strong> ${correctAnswers} / ${totalQuestions} (${percentScore}%)</p>
      <div style="margin-top:0.75rem;">
        <button onclick="viewGallery()">📷 View Photos</button>
        <button onclick="exitGame()">🏠 Done</button>
      </div>
    `;
    try {
      // Persist last score per trail for future use
      const scores = JSON.parse(localStorage.getItem('trailScores') || '{}');
      scores[String(currentTrail.id)] = { correct: correctAnswers, total: totalQuestions, percent: percentScore, finishedAt: new Date().toISOString() };
      localStorage.setItem('trailScores', JSON.stringify(scores));
    } catch (e) {
      console.warn('Could not persist score:', e);
    }
    document.getElementById('photoArea').innerHTML = '';
    currentPhotoUrl = null;
    if (watcherId) navigator.geolocation.clearWatch(watcherId);
    if (locationIntervalId) { clearInterval(locationIntervalId); locationIntervalId = null; }
    return;
  }

  const cp = currentTrail.checkpoints[currentCheckpointIndex];
  document.getElementById('checkpointArea').innerHTML = `
    <p><strong>Next checkpoint:</strong> ${cp.title}</p>
    <button onclick="skipToNextCheckpoint()">Skip to next (dev only)</button>
  `;
  document.getElementById('photoArea').innerHTML = '';
  currentPhotoUrl = null;

  if (watcherId) navigator.geolocation.clearWatch(watcherId);
  watcherId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (!map) initMap(lat, lon);
    handlePositionUpdate(pos);
  }, showError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });

  if (locationIntervalId) clearInterval(locationIntervalId);
  locationIntervalId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      if (!map) initMap(lat, lon);
      handlePositionUpdate(pos);
    }, showError, { enableHighAccuracy: true });
  }, 5000);

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



function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const playNote = (freq, start, duration, vol = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle"; // Smooth tone
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

    // Soft fade in/out
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  };

  // Melody: C5 (523), D5 (587), G5 (784)
  playNote(523.25, 0, 0.2);     // C5
  playNote(587.33, 0.25, 0.2);   // D5
  playNote(783.99, 0.5, 0.25);    // G5
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
      // Do not append default point to walked path; wait for real GPS fix
      if (walkedPath) walkedPath.setLatLngs(walkedPoints);
    }
  } else {
    showPosition({ coords: { latitude: DEFAULT_LAT, longitude: DEFAULT_LON } });
  }
}

function initMap(lat, lon) {
  if (map) {
    map.remove(); // destroy previous map instance
  }

  map = L.map('map').setView([lat, lon], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  userMarker = L.circleMarker([lat, lon], {
    radius: 8,
    color: 'red',
    fillColor: 'red',
    fillOpacity: 1
  }).addTo(map).bindPopup("You are here").openPopup();
  checkpointMarkers = currentTrail.checkpoints.map(cp =>
    L.marker([cp.lat, cp.lon]).addTo(map).bindPopup(cp.title)
  );

  const points = (currentTrail.gpx_points && currentTrail.gpx_points.length)
    ? currentTrail.gpx_points.map(p => [p.lat, p.lon])
    : currentTrail.checkpoints.map(cp => [cp.lat, cp.lon]);
  if (trailLine) trailLine.remove();
  trailLine = L.polyline(points, { color: 'blue' }).addTo(map);

  // Do not seed walked path here; wait for first real GPS fix
  walkedPoints = [];
  if (walkedPath) { walkedPath.remove(); walkedPath = null; }
}

function takePhoto() {
  const camInput = document.getElementById('cameraInput');
  if (camInput) {
    camInput.value = '';
    camInput.click();
  } else {
    alert('Camera input element not found.');
  }
}

function displayPhoto(photoUrl) {
  const photoArea = document.getElementById('photoArea');
  photoArea.innerHTML = `
    <img src="${photoUrl}" alt="Captured Photo" style="width:50%; border-radius:8px; margin-top:1rem;">
    <div style="margin-top:1rem;">
      <button onclick="retakePhoto()">Retake</button>
      <button onclick="submitPhoto()">Submit</button>
      <button onclick="nextCheckpoint()">➡️ Continue</button>
    </div>
  `;
}

function retakePhoto() {
  takePhoto();
}

function submitPhoto() {
  if (!currentPhotoBlob || !currentCheckpoint?.challenge?.keyword) return;
  const fd = new FormData();
  fd.append('image', currentPhotoBlob, 'photo.jpg');
  fd.append('keyword', currentCheckpoint.challenge.keyword);
  fetch(`${BASE_URL}/challenges/validate`, {
    method: 'POST',
    body: fd
  })
    .then(res => res.json())
    .then(data => {
      const photoArea = document.getElementById('photoArea');
      const percent = Math.round((data.score || 0) * 100);
      const resultMsg = data.valid
        ? `Photo accepted! Score: ${percent}%`
        : `Photo did not match (score ${percent}%).`;
      photoArea.innerHTML = `
        <img src="${currentPhotoUrl}" alt="Captured Photo" style="width:50%; border-radius:8px; margin-top:1rem;">
        <p>${resultMsg}</p>
        <div style="margin-top:1rem;">
          <button onclick="nextCheckpoint()">➡️ Continue</button>
        </div>
      `;
      capturedPhotos.push(currentPhotoUrl);
      localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      document.getElementById('checkpointArea').innerHTML = `
        <button onclick="nextCheckpoint()">➡️ Continue</button>
      `;
    })
    .catch(err => {
      console.error('Error submitting photo:', err);
    });
}

function viewGallery() {
  window.location.href = 'gallery.html';
}

// initialize camera input handling
document.addEventListener('DOMContentLoaded', () => {
  const camInput = document.getElementById('cameraInput');
  if (camInput) {
    camInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) return;
      currentPhotoBlob = file;
      const reader = new FileReader();
      reader.onload = e => {
        currentPhotoUrl = e.target.result;
        displayPhoto(currentPhotoUrl);
      };
      reader.readAsDataURL(file);
    });
  }
});


