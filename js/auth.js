// js/auth.js (plain browser script)
(function () {
  if (!window.supabaseClient) {
    console.error('auth.js: window.supabaseClient missing. Load js/supabase.js first.');
    return;
  }

  const auth = window.supabaseClient.auth;

  function safeLog() {
    if (console && console.log) console.log.apply(console, arguments);
  }

  function AuthManager() {
    this.currentUser = null;
    this.currentProfile = null;
    this.ready = false;
    this._initPromise = this.init();
  }

  AuthManager.prototype.init = async function () {
    try {
      // get existing session
      const { data } = await auth.getSession();
      const session = data?.session ?? null;
      if (session?.user) {
        this.currentUser = session.user;
        await this._fetchProfile();
      } else {
        // fallback: try getUser
        const uu = await auth.getUser();
        if (uu?.data?.user) {
          this.currentUser = uu.data.user;
          await this._fetchProfile();
        }
      }

      // listen to auth changes
      auth.onAuthStateChange((event, session) => {
        safeLog('auth event', event);
        if (event === 'SIGNED_IN' && session?.user) {
          this.currentUser = session.user;
          this._fetchProfile().catch(e => console.error(e));
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.currentProfile = null;
        }
      });
    } catch (err) {
      console.error('AuthManager.init error', err);
    } finally {
      this.ready = true;
    }
  };

  AuthManager.prototype._fetchProfile = async function () {
    if (!this.currentUser) return;
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles') // change to 'profiles' if your project uses that table name
        .select('*')
        .eq('id', this.currentUser.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.warn('get profile error', error);
      } else {
        this.currentProfile = data ?? null;
      }
    } catch (e) {
      console.error('fetch profile failed', e);
    }
  };

  AuthManager.prototype.waitUntilReady = function () {
    if (this.ready) return Promise.resolve();
    return this._initPromise;
  };

  AuthManager.prototype.getCurrentUser = function () { return this.currentUser; };
  AuthManager.prototype.getProfile = function () { return this.currentProfile; };
  AuthManager.prototype.signOut = async function () { await auth.signOut(); this.currentUser = null; this.currentProfile = null; };

  // expose global
  window.authManager = new AuthManager();
  safeLog('auth.js initialized');
})();
