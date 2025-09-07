// js/dashboard.js
(async function(){
  await new Promise(r => setTimeout(r, 120));

  async function loadVideos() {
    try {
      let res;
      if (window.db?.listVideos) {
        res = await window.db.listVideos();
        if (res?.data !== undefined) res = res.data;
      }
      const videos = res || [];
      console.log('Loaded videos:', videos);

      const grid = document.getElementById('videoGrid');
      grid.innerHTML = '';

      videos.forEach(v => {
        const vid = v.id || v.video_id;
        const yid = v.video_url?.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
        const thumb = v.thumbnail_url || (yid ? https://img.youtube.com/vi/${yid}/hqdefault.jpg : '');

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
          <div class="video-thumbnail">
            ${thumb ? <img src="${thumb}" alt="${v.title}"> : ''}
            <div class="play-button">▶</div>
          </div>
          <div class="video-info">
            <h3 class="video-title">${v.title || 'Untitled'}</h3>
            <p class="video-description">${v.description || ''}</p>
          </div>
        `;

        card.addEventListener('click', () => {
          if (window.VideoHandler?.openVideo) {
            window.VideoHandler.openVideo(vid);
          } else {
            console.warn('VideoHandler missing — fallback');
            location.href = video-player.html?id=${encodeURIComponent(vid)};
          }
        });

        grid.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading videos', err);
      document.getElementById('videoGrid').innerHTML =
        <div style="color:red">Error loading videos: ${err.message}</div>;
    }
  }

  // call loader
  loadVideos();
})();
