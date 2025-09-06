<!-- js/auth.js -->
<script>
(() => {
  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.currentProfile = null;
      this.init();
    }

    async init() {
      try {
        const { data: { session } = {} } = await window.auth.getSession();
        if (session?.user) {
          await this.setCurrentUser(session.user);
        }

        // listen for auth changes
        window.auth.onAuthStateChange(async (event, session) => {
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              await this.setCurrentUser(session.user);
              this.redirectToDashboard();
            } else if (event === 'SIGNED_OUT') {
              this.currentUser = null;
              this.currentProfile = null;
              window.location.replace('login.html');
            }
          } catch (err) {
            console.error('onAuthStateChange handler error', err);
          }
        });
      } catch (e) {
        console.error('AuthManager init error', e);
      }
    }

    async setCurrentUser(user) {
      this.currentUser = user;
      try {
        const profile = await window.db.getProfile(user.id);
        if (profile && !profile.full_name && profile.name) profile.full_name = profile.name;
        this.currentProfile = profile;
      } catch (e) {
        console.warn('Error fetching profile', e);
      }
    }

    async signUp(email, password, fullName, role='student', schoolName=null, gradeLevel=null) {
      const { data, error } = await window.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, role, school_name: schoolName, grade_level: gradeLevel } }
      });
      if (error) throw error;
      const userId = data?.user?.id || data?.id;
      if (userId) {
        try {
          await window.db.upsertProfile({
            id: userId,
            email,
            full_name: fullName || email,
            role,
            school_name: schoolName,
            grade_level: gradeLevel
          });
        } catch (e) { /* ignore */ }
      }
      return data;
    }

    async signIn(email, password) {
      const { data, error } = await window.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) await this.setCurrentUser(data.user);
      return data;
    }

    async signOut() {
      try {
        if (this.currentUser) {
          // attempt to update online flag
          try {
            await window.supabaseClient.from('profiles').update({ is_online: false, last_active: new Date().toISOString() }).eq('id', this.currentUser.id);
          } catch {}
        }
        const { error } = await window.auth.signOut();
        if (error) throw error;
        this.currentUser = null;
        this.currentProfile = null;
        window.location.replace('login.html');
      } catch (e) {
        console.error('Sign out error', e);
        alert('Logout failed. See console.');
      }
    }

    isAuthenticated() { return !!this.currentUser; }
    isTeacher() { return this.currentProfile?.role === 'teacher'; }
    isStudent() { return this.currentProfile?.role === 'student'; }
    getDisplayName() { return this.currentProfile?.full_name || this.currentUser?.email || 'User'; }
    getProfile() { return this.currentProfile; }

    redirectToDashboard() {
      if (this.currentProfile) {
        if (this.currentProfile.role === 'teacher') window.location.replace('teacher-dashboard.html');
        else if (this.currentProfile.role === 'student') window.location.replace('student-dashboard.html');
        else window.location.replace('dashboard.html');
      } else {
        // try to refresh profile, then redirect
        (async () => { if (this.currentUser) await this.setCurrentUser(this.currentUser); this.redirectToDashboard(); })();
      }
    }
  }

  window.authManager = new AuthManager();
})();
</script>
