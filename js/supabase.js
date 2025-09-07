// js/supabase.js (plain browser script)
(function () {
  // Replace these with your Supabase project details
  const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybWNqaWp0aG1memxmcXFocXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDIzMDQsImV4cCI6MjA3MjcxODMwNH0.dnose_pvGlKlE4OO4NojCFiR0DATKoRYlFm4qbm_GpM';
  const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

  if (!window.supabase) {
    console.error('Supabase CDN not loaded. Make sure <script src="https://unpkg.com/@supabase/supabase-js@2"></script> is included BEFORE this file.');
    return;
  }

  // create client and attach globally
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // simple DB helper
  window.db = {
    async listVideos() {
      try {
        const res = await window.supabaseClient.from('videos').select('*').order('created_at', { ascending: false }).limit(500);
        return res; // { data, error }
      } catch (e) {
        console.error('listVideos error', e);
        return { data: [], error: e };
      }
    },

    async getVideo(id) {
      try {
        const res = await window.supabaseClient.from('videos').select('*').eq('id', id).single();
        return res; // { data, error }
      } catch (e) {
        console.error('getVideo error', e);
        return { data: null, error: e };
      }
    },

    async upsertVideoProgress({ video_id, student_id, progress_seconds = 0, completed = false, last_watched = new Date().toISOString() }) {
      try {
        const payload = { video_id, student_id, progress_seconds, completed, last_watched };
        const res = await window.supabaseClient.from('video_progress').upsert(payload, { onConflict: ['video_id', 'student_id'] });
        return res;
      } catch (e) {
        console.error('upsertVideoProgress error', e);
        return { data: null, error: e };
      }
    },

    async listCourses() {
      try {
        const res = await window.supabaseClient.from('courses').select('*').order('created_at', { ascending: false }).limit(200);
        return res;
      } catch (e) {
        console.error('listCourses error', e);
        return { data: [], error: e };
      }
    },

    async listQuizzes() {
      try {
        const res = await window.supabaseClient.from('quizzes').select('*').order('created_at', { ascending: false }).limit(200);
        return res;
      } catch (e) {
        console.error('listQuizzes error', e);
        return { data: [], error: e };
      }
    },

    async listAssignments() {
      try {
        const res = await window.supabaseClient.from('assignments').select('*').order('created_at', { ascending: false }).limit(200);
        return res;
      } catch (e) {
        console.error('listAssignments error', e);
        return { data: [], error: e };
      }
    }
  };

  console.log('supabase.js initialized');
})();
