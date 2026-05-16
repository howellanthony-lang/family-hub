import { useEffect, useState } from 'react';
import { API_BASE } from '../data/mockData';

export default function PhotosScreen() {
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/photos`).then(r => r.json()).then(d => setPhotos(d.photos || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % photos.length), 8000);
    return () => clearInterval(id);
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className="screen page-enter">
        <h2>Photos</h2>
        <div className="glass-card photo-mode">
          <div>
            <h2>No photos yet</h2>
            <p className="muted">Add images to the photo folder on the Pi:</p>
            <code>{`${API_BASE.replace(':3001', '')}:~/family-hub/apps/api/data/photos/`}</code>
            <p className="muted" style={{ marginTop: 12 }}>Or set <code>PHOTO_DIR</code> in <code>.env</code> to a custom path.</p>
          </div>
        </div>
      </div>
    );
  }

  const photo = photos[current];

  return (
    <div className="screen page-enter">
      <div className="section-header">
        <h2>Photos</h2>
        <span className="muted">{current + 1} / {photos.length}</span>
      </div>
      <div className="photo-mode slideshow">
        <img src={`${API_BASE}${photo.url}`} alt={photo.name} />
        <div>
          <p className="muted">{photo.name}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center' }}>
            <button onClick={() => setCurrent(c => (c - 1 + photos.length) % photos.length)}>← Prev</button>
            <button onClick={() => setCurrent(c => (c + 1) % photos.length)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
