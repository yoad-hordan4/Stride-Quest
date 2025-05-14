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
      option.text = `${trail.name} (Distance: ${trail.distance_km} km away)`;
      select.appendChild(option);
    });
    document.getElementById('trailInfo').innerHTML = `
        <h3>${trail.name}</h3>
        <p><strong>ID:</strong> ${trail.id}</p>
        <p><strong>Location:</strong> ${trail.latitude}, ${trail.longitude}</p>
        <p><strong>Trail length:</strong> ${trail.length_km ?? 'unknown'} km</p>
        <p><strong>Distance from you:</strong> ${selected?.distance_km ?? 'N/A'} km</p>
        `;
    });
}

function getTrailInfo() {
    const trailId = document.getElementById('trailSelect').value;
    const selected = nearbyTrails.find(t => t.id == trailId); // ✅ capture trail
  
    fetch(`http://localhost:8000/trails/${trailId}`)
      .then(res => res.json())
      .then(trail => {
        document.getElementById('trailInfo').innerHTML = `
          <h3>${trail.name}</h3>
          <p><strong>ID:</strong> ${trail.id}</p>
          <p><strong>Location:</strong> ${trail.latitude}, ${trail.longitude}</p>
          <p><strong>Distance from you:</strong> ${selected?.distance_km ?? 'N/A'} km</p>
        `;
      });
  }
  

function showError(error) {
  alert("Error getting location: " + error.message);
}
