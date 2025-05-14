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

  fetch('http://localhost:8000/trails/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lon, radius_km: 10 })
  })
  .then(res => res.json())
  .then(data => {
    nearbyTrails = data;
    const select = document.getElementById('trailSelect');
    select.innerHTML = '';
    data.forEach(trail => {
      const option = document.createElement('option');
      option.value = trail.id;
      option.text = `${trail.name} (${trail.distance_km} km)`;
      select.appendChild(option);
    });
    document.getElementById('trailSelectArea').style.display = 'block';
  });
}

function getTrailInfo() {
  const trailId = document.getElementById('trailSelect').value;
  fetch(`http://localhost:8000/trails/${trailId}`)
    .then(res => res.json())
    .then(trail => {
      document.getElementById('trailInfo').innerHTML = `
        <h3>${trail.name}</h3>
        <p><strong>ID:</strong> ${trail.id}</p>
        <p><strong>Location:</strong> ${trail.latitude}, ${trail.longitude}</p>
        <p><strong>Distance from you:</strong> ${trail.distance_km ?? 'N/A'} km</p>
      `;
    });
}

function showError(error) {
  alert("Error getting location: " + error.message);
}
