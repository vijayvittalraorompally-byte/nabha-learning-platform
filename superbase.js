// Replace with your Supabase project details
const SUPABASE_URL = 'https://cooggqcwbgngqcaypbky.supabase.co'; // Get from Supabase dashboard
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvb2dncWN3YmduZ3FjYXlwYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDYwNjAsImV4cCI6MjA3MjU4MjA2MH0.aJAOPyV6JqpfjqlQvL6okQTpu9VuC7jixGNVJ1AABHg'; // Get from Supabase dashboard

// Initialize Supabase (using CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
