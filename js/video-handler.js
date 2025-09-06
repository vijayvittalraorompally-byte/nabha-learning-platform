<!-- js/video-handler.js -->
<script>
(() => {
  window.VideoHandler = {
    async getVideoById(id) {
      const { data, error } = await window.db.getVideo(id);
      if (error) throw error;
      return data;
    }
  };
})();
</script>
