// js/video-handler.js
(() => {
  window.VideoHandler = {
    openVideo(id) {
      if (!id) return;
      location.href = videoplayer.html?id=${encodeURIComponent(id)};
    },

    async getVideoById(id) {
      if (!id) throw new Error("missing id");
      if (!window.db || !window.db.getVideo) {
        throw new Error("window.db.getVideo not available");
      }
      const res = await window.db.getVideo(id);
      return res.data || res;
    }
  };
})();
