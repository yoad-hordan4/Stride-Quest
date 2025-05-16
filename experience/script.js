// Handles both index.html and hike.html
let nearbyTrails = [];
const BASE_URL = window.location.origin;
let currentTrail = null;
let currentCheckpointIndex = 0;
let watcherId = null;
let map, userMarker;

// Page: index.html
if (
  window.location.pathname === "/experience/" ||
  window.location.pathname === "/experience/index.html"
) {
  // ✅ Expose globally for onclick in HTML
  window.getLocation = function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      alert("Geolocation not supported.");
    }
  };

  function showPosition(position) {
    fetch(`${BASE_URL}/trails/nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radius_km: 100
      })
    })
      .then(res => res.json())
      .then(data => {
        nearbyTrails = data;
        const select = document.getElementById("trailSelect");
        select.innerHTML = "";
        data.forEach(trail => {
          const opt = document.createElement("option");
          opt.value = trail.id;
          opt.text = `${trail.name} (${trail.distance_km} km away)`;
          select.appendChild(opt);
        });
        document.getElementById("trailSelectArea").style.display = "block";
      });
  }

  window.getTrailInfo = function () {
    const trailId = document.getElementById("trailSelect").value;
    const trail = nearbyTrails.find(t => t.id == trailId);
    if (!trail) return;
    document.getElementById("trailInfo").innerHTML = `
      <h3>${trail.name}</h3>
      <p><strong>Location:</strong> ${trail.closest_city}</p>
      <p><strong>Length:</strong> ${trail.length_km ?? 'unknown'} km</p>
      <p><strong>Distance:</strong> ${trail.distance_km ?? 'N/A'} km</p>
      <p><strong>History:</strong> ${trail.history ?? 'N/A'}</p>
      <img src="${trail.image_url || '/experience/images/default-stridequest.jpg'}" alt="${trail.name} image" style="width: 100%; border-radius: 12px; margin: 1rem 0;" />
      <button onclick="startHike(${trail.id})">🚀 Start Hike</button>
    `;
    document.getElementById("trailInfo").style.display = "block";
  };

  window.startHike = function (trailId) {
    localStorage.setItem("selectedTrailId", trailId);
    window.location.href = "hike.html";
  };
}

// Page: hike.html
if (window.location.pathname.includes("hike")) {
  document.addEventListener("DOMContentLoaded", () => {
    const trailId = localStorage.getItem("selectedTrailId");
    if (!trailId) return alert("No trail selected.");
    fetch(`${BASE_URL}/trails/${trailId}`)
      .then(res => res.json())
      .then(trail => {
        currentTrail = trail;
        currentCheckpointIndex = 0;
        renderGameUI();
        startTracking();
      });
  });

  function renderGameUI() {
    const trail = currentTrail;
    document.getElementById("gameArea").innerHTML = `
      <h2>${trail.name} - Hike in Progress</h2>
      <p>${trail.history}</p>
      <img src="${trail.image_url || '/experience/images/default-stridequest.jpg'}"
           alt="${trail.name} image"
           style="width: 100%; border-radius: 12px; margin: 1rem 0;" />
      <div id="progressDisplay">
        <progress id="trailProgress" value="0" max="1" style="width: 100%;"></progress>
        <p id="progressLabel">Checkpoint 1 of ${trail.checkpoints.length}</p>
      </div>
      <div id="map" style="height: 300px;"></div>
      <div id="checkpointArea">
        <p><strong>Next checkpoint:</strong> ${trail.checkpoints[0].title}</p>
        <button onclick="skipToNextCheckpoint()">🚀 Skip (dev only)</button>
      </div>
    `;
    updateProgress();
  }

  function startTracking() {
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
  }

  function handlePositionUpdate(pos) {
    const cp = currentTrail.checkpoints[currentCheckpointIndex];
    const dist = getDistance(pos.coords.latitude, pos.coords.longitude, cp.lat, cp.lon);
    if (dist < 0.05) triggerCheckpoint(cp);
  }

  function triggerCheckpoint(cp) {
    updateProgress();
    navigator.geolocation.clearWatch(watcherId);
    document.getElementById("checkpointArea").innerHTML = `
      <h3>📍 ${cp.title}</h3>
      <p><strong>Quiz:</strong> ${cp.quiz.question}</p>
      ${cp.quiz.options.map(opt =>
        `<button onclick="checkAnswer('${opt}', '${cp.quiz.answer}')">${opt}</button>`
      ).join("")}
    `;
  }

  window.skipToNextCheckpoint = () => {
    const cp = currentTrail.checkpoints[currentCheckpointIndex];
    triggerCheckpoint(cp);
  };

  window.checkAnswer = (selected, correct) => {
    const result = selected === correct
      ? "✅ Correct!"
      : `❌ The correct answer was: ${correct}`;
    document.getElementById("checkpointArea").innerHTML = `
      <p>${result}</p>
      <button onclick="nextCheckpoint()">➡️ Continue</button>
    `;
  };

  window.nextCheckpoint = () => {
    currentCheckpointIndex++;
    if (currentCheckpointIndex >= currentTrail.checkpoints.length) {
      document.getElementById("checkpointArea").innerHTML = "<h3>🎉 Trail Complete!</h3>";
      return;
    }
    const cp = currentTrail.checkpoints[currentCheckpointIndex];
    document.getElementById("checkpointArea").innerHTML = `
      <p><strong>Next checkpoint:</strong> ${cp.title}</p>
      <button onclick="skipToNextCheckpoint()">🚀 Skip (dev only)</button>
    `;
    startTracking();
    updateProgress();
  };

  window.exitGame = () => {
    if (watcherId) navigator.geolocation.clearWatch(watcherId);
    localStorage.removeItem("selectedTrailId");
    window.location.href = "index.html";
  };

  function updateProgress() {
    const total = currentTrail.checkpoints.length;
    const current = currentCheckpointIndex;
    const progress = Math.min(current / total, 1);
    document.getElementById("trailProgress").value = progress;
    document.getElementById("progressLabel").innerText = `Checkpoint ${current + 1} of ${total}`;
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

  function toRad(val) {
    return val * Math.PI / 180;
  }

  function initMap(lat, lon) {
    map = L.map("map").setView([lat, lon], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    userMarker = L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();
    currentTrail.checkpoints.forEach(cp =>
      L.marker([cp.lat, cp.lon]).addTo(map).bindPopup(cp.title)
    );
  }

  function showError(err) {
    alert("⚠️ Location error: " + err.message);
  }
}
