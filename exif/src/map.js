// Peta Leaflet, dimuat hanya saat pengguna menyalakannya.
// Satu-satunya permintaan jaringan: ubin OpenStreetMap (koordinat ubin, bukan foto).

export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'U' : 'S'; // Utara, Selatan
  const ew = lon >= 0 ? 'T' : 'B'; // Timur, Barat
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lon).toFixed(5)}° ${ew}`;
}

// CSS Leaflet dipasang sekali, saat peta pertama kali dinyalakan. File ada di vendor/, tanpa CDN.
function loadLeafletCss() {
  if (document.querySelector('link[data-leaflet]')) return Promise.resolve();
  return new Promise((ok, fail) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './vendor/leaflet.css';
    link.dataset.leaflet = '';
    link.onload = ok;
    link.onerror = () => {
      link.remove();
      fail(new Error('CSS Leaflet gagal dimuat'));
    };
    document.head.append(link);
  });
}

// Kembalikan fungsi untuk mematikan peta.
export async function showMap(container, lat, lon, { accuracy = null } = {}) {
  // Modul ESM Leaflet tidak punya default export, jadi dipakai sebagai namespace (L.map, L.tileLayer, ...).
  const [L] = await Promise.all([import('../vendor/leaflet.esm.js'), loadLeafletCss()]);
  const map = L.map(container, { attributionControl: true }).setView([lat, lon], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  if (accuracy) L.circle([lat, lon], { radius: accuracy, color: '#17695a', weight: 2, fillOpacity: 0.12 }).addTo(map);
  L.circleMarker([lat, lon], { radius: 9, color: '#b3261e', fillColor: '#b3261e', fillOpacity: 0.6 }).addTo(map);
  return () => map.remove();
}
