// js/auth.js
// Auth manager for Nabha Learning Platform
// Depends on: ./supabase.js which must export auth and db objects.
// This file creates a global authManager (for use from non-module HTML onclicks)
// and also exports the class + default instance for module-based imports.

import { auth, db } from './supabase.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.currentProfile = null;
    this._initialized = false;
    this.init();
  }

  // Initialize: check existing session and start listening for auth changes
  async init() {
    try {
      // Get current session (Supabase v2)
      const { data: { session } = {} } = await auth.getSession();
      if (session?.user) {
        await this.setCurrentUser(session.user);
      }

      // Listen for auth state changes
      auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            await this.setCurrentUser(session.user);
            // Redirect to the appropriate dashboard after sign in
            this.redirectToDashboard();
          } else if (event === 'SIGNED_OUT') {
            // Clear local state and redirect to login
            this.currentUser = null;
            this.currentProfile = null;
            // Ensure we don't redirect if user is already on login/index
            this.redirectToLogin();
          } else if (event === 'USER_UPDATED' && session?.user) {
            // Keep currentUser in sync
            await this.setCurrentUser(session.user);
          }
        } catch (e) {
          console.error('onAuthStateChange handler error:', e);
        }
      });

      this._initialized = true;
    } catch (error) {
      console.error('AuthManager.init error:', error);
    }
  }

  // Set current user and load profile from DB (db.getProfile must exist)
  async setCurrentUser(user) {
    this.currentUser = user;
    try {
      // db.getProfile(userId) should return profile object or null
      if (db && typeof db.getProfile === 'function') {
        this.currentProfile = await db.getProfile(user.id);
      } else {
        // Fallback: try to read profiles table directly if db helper missing
        try {
          const { data, error } = await auth.supabase // intentionally won't work if not wired; try alternative below
            ? await auth.supabase
            : {};
        } catch (_) {}
        // If db.getProfile isn't available, attempt to fetch from 'profiles' table
        try {
          const { data: profileData, error: profileError } = await auth.client
            ? await auth.client.from('profiles').select('*').eq('id', user.id).single()
            : await this._fetchProfileDirect(user.id);
          if (!profileError && profileData) this.currentProfile = profileData;
        } catch (err) {
          // ignore - profile will remain null
        }
      }
    } catch (error) {
      console.error('Error fetching profile in setCurrentUser:', error);
    }
  }

  // Helper: fallback direct profile fetch if db.getProfile is not provided
  async _fetchProfileDirect(userId) {
    try {
      // Attempt to use the same supabase client available on auth (some setups)
      if (auth && auth.getUser) {
        // try to get client from imported module if available
        if (typeof window !== 'undefined' && window.supabaseClient) {
          return await window.supabaseClient.from('profiles').select('*').eq('id', userId).single();
        }
      }
      return { data: null, error: new Error('No DB helper available') };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Sign up a new user. options: fullName, role, schoolName, gradeLevel
  async signUp(email, password, fullName = '', role = 'student', schoolName = '', gradeLevel = null) {
    try {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            school_name: schoolName,
            grade_level: gradeLevel,
          }
        }
      });

      if (error) throw error;

      // data may contain user immediately (if no email confirm required) or not
      const newUserId = data?.user?.id || data?.id || null;

      // If we have an id, try to upsert profile (safe if auth trigger already created profile)
      if (newUserId) {
        const profileData = {
          id: newUserId,
          email,
          full_name: fullName || email,
          role,
          school_name: schoolName || null,
          grade_level: gradeLevel ? parseInt(gradeLevel) : null,
          created_at: new Date().toISOString()
        };

        if (db && typeof db.upsertProfile === 'function') {
          await db.upsertProfile(profileData);
        } else {
          // Fallback direct insert/upsert to 'profiles' table
          try {
            if (typeof window !== 'undefined' && window.supabaseClient) {
              await window.supabaseClient.from('profiles').upsert(profileData, { onConflict: 'id' });
            }
          } catch (err) {
            console.warn('Profile upsert fallback failed:', err);
          }
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || error };
    }
  }

  // Sign in with email/password
  async signIn(email, password) {
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // set current user/profile
      if (data?.user) {
        await this.setCurrentUser(data.user);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || error };
    }
  }

  // Sign out and redirect to login page
  async signOut() {
    try {
      // Optional: update online status in DB before sign out (if you track it)
      try {
        if (this.currentUser) {
          // try update profiles table if available
          if (db && typeof db.updateProfile === 'function') {
            await db.updateProfile(this.currentUser.id, { is_online: false, last_active: new Date().toISOString() });
          } else if (typeof window !== 'undefined' && window.supabaseClient) {
            await window.supabaseClient.from('profiles').update({ is_online: false, last_active: new Date().toISOString() }).eq('id', this.currentUser.id);
          }
        }
      } catch (e) {
        // ignore but log
        console.warn('Failed to update online status during signOut:', e);
      }

      const { error } = await auth.signOut();
      if (error) throw error;

      // Clear local state
      this.currentUser = null;
      this.currentProfile = null;

      // Force redirect to login page (safe fallback)
      // use location.replace so back button doesn't return to protected pages
      window.location.replace('login.html');

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message || error };
    }
  }

  // Update profile via db helper (expects db.updateProfile to exist)
  async updateProfile(updates = {}) {
    if (!this.currentUser) {
      return { success: false, error: 'No authenticated user' };
    }
    try {
      if (db && typeof db.updateProfile === 'function') {
        const updated = await db.updateProfile(this.currentUser.id, updates);
        this.currentProfile = updated;
        return { success: true, profile: updated };
      } else if (typeof window !== 'undefined' && window.supabaseClient) {
        const { data, error } = await window.supabaseClient.from('profiles').update(updates).eq('id', this.currentUser.id).single();
        if (error) throw error;
        this.currentProfile = data;
        return { success: true, profile: data };
      } else {
        throw new Error('No DB helper available to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message || error };
    }
  }

  // Convenience checks
  isAuthenticated() {
    return !!this.currentUser;
  }
  isTeacher() {
    return this.currentProfile?.role === 'teacher';
  }
  isStudent() {
    return this.currentProfile?.role === 'student';
  }

  // Accessors
  getCurrentUser() {
    return this.currentUser;
  }
  getCurrentProfile() {
    return this.currentProfile;
  }

  // Redirect helpers
  redirectToLogin() {
    // If already on login/index, don't redirect
    const path = window.location.pathname.split('/').pop();
    if (path && (path.includes('login.html') || path.includes('index.html'))) return;
    // replace so back button won't return to dashboard
    window.location.replace('login.html');
  }

  redirectToDashboard() {
    // If we don't have profile yet, try to fetch it then redirect
    const doRedirect = () => {
      if (this.isTeacher()) {
        window.location.replace('teacher-dashboard.html');
      } else if (this.isStudent()) {
        window.location.replace('student-dashboard.html');
      } else {
        window.location.replace('dashboard.html');
      }
    };

    if (this.currentProfile) {
      doRedirect();
      return;
    }

    // try to fetch profile then redirect
    (async () => {
      try {
        if (this.currentUser) await this.setCurrentUser(this.currentUser);
      } catch (e) {
        console.warn('redirectToDashboard: setCurrentUser failed', e);
      } finally {
        doRedirect();
      }
    })();
  }

  // UI helpers for display names & initials
  getUserInitials() {
    if (!this.currentProfile?.full_name) {
      return (this.currentUser?.email?.charAt(0) || 'U').toUpperCase();
    }
    const names = this.currentProfile.full_name.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  getDisplayName() {
    return this.currentProfile?.full_name || this.currentUser?.email || 'User';
  }
}

// Instantiate and expose globally for non-module HTML usage
const authManager = new AuthManager();

// Expose to window for HTML files that call authManager.* directly (onclick handlers)
if (typeof window !== 'undefined') {
  window.authManager = authManager;
}

export { AuthManager };
export default authManager;
