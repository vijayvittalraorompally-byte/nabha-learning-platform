<!-- js/supabase.js -->
<script>
(() => {
  // Replace with your Supabase project details if they differ
  const SUPABASE_URL = 'https://vrmcjijthmfzlfqqhqvh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybWNqaWp0aG1memxmcXFocXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDIzMDQsImV4cCI6MjA3MjcxODMwNH0.dnose_pvGlKlE4OO4NojCFiR0DATKoRYlFm4qbm_GpM';

  if (!window.supabase) {
    console.error('Supabase library not loaded (include CDN script first).');
    return;
  }

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  window.auth = window.supabaseClient.auth;

  window.db = {
    // Profiles
    async getProfile(userId) {
      try {
        const { data, error } = await window.supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn('getProfile error', e);
        return null;
      }
    },
    async upsertProfile(profile) {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Quiz operations
    async createQuiz(quiz) {
      return await window.supabaseClient.from('quizzes').insert(quiz).select().single();
    },
    async createQuizQuestion(q) {
      return await window.supabaseClient.from('quiz_questions').insert(q).select().single();
    },
    async getQuizzes() {
      return await window.supabaseClient.from('quizzes').select('*').order('created_at', { ascending: false });
    },
    async getQuiz(quizId) {
      return await window.supabaseClient
        .from('quizzes')
        .select(', quiz_questions()')
        .eq('id', quizId)
        .single();
    },
    async submitQuizAttempt(attempt) {
      return await window.supabaseClient.from('quiz_attempts').insert(attempt).select().single();
    },

    // Videos
    async createVideo(video) {
      return await window.supabaseClient.from('videos').insert(video).select().single();
    },
    async getVideos() {
      return await window.supabaseClient.from('videos').select('*').order('created_at', { ascending: false });
    },
    async getVideo(videoId) {
      return await window.supabaseClient.from('videos').select('*').eq('id', videoId).single();
    },
    async upsertVideoProgress(progress) {
      // On conflict: composite key (video_id, student_id) required in DB to work properly
      return await window.supabaseClient.from('video_progress').upsert(progress, { onConflict: ['video_id','student_id'] }).select().single();
    }
  };
})();
</script>
