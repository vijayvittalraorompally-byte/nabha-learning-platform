// js/video-handler.js
(function () {
  window.VideoHandler = {
    openVideo(id) {
      if (!id) {
        console.error('VideoHandler.openVideo called without id');
        return;
      }
      const url = video-player.html?id=${encodeURIComponent(id)};
      console.log('VideoHandler: redirecting to', url);
      location.href = url;
    }
  };
  console.log('video-handler.js initialized');
})();
