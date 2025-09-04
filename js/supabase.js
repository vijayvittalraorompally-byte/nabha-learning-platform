// Replace with your Supabase project details
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Get from Supabase dashboard
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Get from Supabase dashboard

// Initialize Supabase (using CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
