// supabase.js
// Wait for the Supabase CDN to load
function initializeSupabase() {
  // Check if supabase is available
  if (typeof supabase === 'undefined') {
    console.error('Supabase CDN not loaded yet');
    return null;
  }

  const SUPABASE_URL = 'https://cooggqcwbgngqcaypbky.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvb2dncWN3YmduZ3FjYXlwYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDYwNjAsImV4cCI6MjA3MjU4MjA2MH0.aJAOPyV6JqpfjqlQvL6okQTpu9VuC7jixGNVJ1AABHg';

  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Make it globally available
  window.supabaseClient = supabaseClient;
  return supabaseClient;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSupabase);
} else {
  initializeSupabase();
}
