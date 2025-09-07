// js/dashboard.js
(async function () {
  // wait for required globals
  async function waitFor(checkFn, timeout = 6000) {
    const start = Date.now();
    while (!checkFn()) {
      if (Date.now() - start > timeout) return false;
      await new Promise(r => setTimeout(r, 80));
    }
    return true;
  }

  const ready = await waitFor(() => window.supabaseClient && window.authManager && window.db, 8000);
  if (!ready) {
    console.error('dashboard.js: supabaseClient/authManager/db not ready.');
    return;
  }

  // wait for authManager init to finish
  if (typeof window.authManager.waitUntilReady === 'function') {
    await window.authManager.waitUntilReady();
  }

  // set username UI
  try {
    const userNameEl = document.getElementById('userName');
    const gradeEl = document.getElementById('userGrade');
    const profile = window.authManager.getProfile();
    const user = window.authManager.getCurrentUser();

    if (userNameEl) {
      userNameEl.textContent = profile?.full_name || profile?.name || user?.email || 'Student';
    }
    if (gradeEl) {
      gradeEl.textContent = profile?.grade || '';
    }
  } catch (e) {
    console.warn('dashboard: could not set user name', e);
  }

  console.log('dashboard: authManager state', window.authManager.getCurrentUser(), window.authManager.getProfile());

  // load videos
  async function loadVideos() {
    try {
      let rows = [];
      const res = await window.db.listVideos();
      rows = res?.data ?? res ?? [];

      console.log('dashboard: loaded videos', rows.length);
      const grid = document.getElementById('videoGrid');
      if (!grid) {
        console.warn('dashboard: #videoGrid not found in DOM');
        return;
      }
      grid.innerHTML = '';

      rows.forEach((v, idx) => {
        const vid = v.id || v.video_id;
        const yMatch = (v.video_url || '').match(/(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([0-9A-Za-z_-]{11})/);
        const yid = yMatch ? yMatch[1] : null;
        const thumb = v.thumbnail_url || (yid ? https://img.youtube.com/vi/${yid}/hqdefault.jpg : '');

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
          <div class="video-thumbnail">
            ${thumb ? <img src="${thumb}" alt="${(v.title || 'video')}" /> : ''}
            <div class="play-button">▶</div>
            ${v.duration_seconds ? <div class="video-duration">${Math.floor(v.duration_seconds/60)}:${String(v.duration_seconds%60).padStart(2,'0')}</div> : ''}
          </div>
          <div class="video-info">
            <h3 class="video-title">${v.title || 'Untitled'}</h3>
            <p class="video-description">${v.description || ''}</p>
          </div>
        `;

        card.addEventListener('click', (e) => {
          e.preventDefault();
          if (!vid) {
            console.error('dashboard: clicked video missing id', v);
            alert('Video id missing. Contact admin.');
            return;
          }
          if (window.VideoHandler && typeof window.VideoHandler.openVideo === 'function') {
            window.VideoHandler.openVideo(vid);
          } else {
            // fallback
            const target = video-player.html?id=${encodeURIComponent(vid)};
            console.log('dashboard: fallback redirect to', target);
            location.href = target;
          }
        });

        grid.appendChild(card);
      });

      if (rows.length === 0) {
        grid.innerHTML = '<div style="color:#666">No videos yet.</div>';
      }
    } catch (err) {
      console.error('dashboard.loadVideos error', err);
      const grid = document.getElementById('videoGrid');
      if (grid) grid.innerHTML = <div style="color:red">Error loading videos: ${err.message || err}</div>;
    }
  }

  // load initial data
  await loadVideos();

  // expose reload for debugging
  window._reloadDashboardVideos = loadVideos;
})();
