// supabase.js - Centralized Supabase Configuration
// Make sure this matches your actual Supabase project credentials

// Supabase Configuration
const SUPABASE_URL = 'https://cooggqcwbgngqcaypbky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvb2dncWN3YmduZ3FjYXlwYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDYwNjAsImV4cCI6MjA3MjU4MjA2MH0.aJAOPyV6JqpfjqlQvL6okQTpu9VuC7jixGNVJ1AABHg';

let supabaseClient = null;

// Initialize Supabase client
function initializeSupabase() {
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include the CDN script.');
        return null;
    }
    
    try {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Make it globally available
        window.supabaseClient = supabaseClient;
        
        console.log('Supabase client initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

// Authentication helper functions
const auth = {
    // Sign up new user
    async signUp(email, password, userData) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            
            // If signup successful and user data provided, insert into users table
            if (data.user && userData) {
                const { error: insertError } = await supabaseClient
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: email,
                        ...userData
                    });
                
                if (insertError) throw insertError;
            }
            
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },
    
    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },
    
    // Sign out user
    async signOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            return { error };
        } catch (error) {
            return { error };
        }
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            return { user, error };
        } catch (error) {
            return { user: null, error };
        }
    },
    
    // Get user profile
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }
};

// Database helper functions
const db = {
    // Get user by ID
    async getUser(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },
    
    // Update user profile
    async updateUser(userId, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },
    
    // Get all students (for teachers)
    async getStudents() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('role', 'student')
                .order('created_at', { ascending: false });
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    },
    
    // Get all teachers
    async getTeachers() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('role', 'teacher')
                .order('created_at', { ascending: false });
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }
};

// Utility functions
const utils = {
    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Generate random ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// Initialize when DOM is ready
function initWhenReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSupabase);
    } else {
        initializeSupabase();
    }
}

// Auto-initialize
initWhenReady();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, db, utils, initializeSupabase };
} else {
    // Browser environment
    window.supabaseAuth = auth;
    window.supabaseDB = db;
    window.supabaseUtils = utils;
}
