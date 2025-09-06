<!-- js/real-time.js -->
<script>
(function(){
  async function updateOnline(isOnline=true) {
    try {
      const { data: { user } } = await auth.getUser();
      if (!user) return;
      await window.supabaseClient.from('profiles').update({ is_online: isOnline, last_active: new Date().toISOString() }).eq('id', user.id);
    } catch(e){}
  }
  window.addEventListener('load', ()=>updateOnline(true));
  window.addEventListener('beforeunload', ()=>updateOnline(false));
  setInterval(()=>updateOnline(true), 30000);
  window.realTimeManager = { updateOnline };
})();
</script>
