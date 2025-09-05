import { auth, db } from './supabase.js'

class AuthManager {
  constructor() {
    this.currentUser = null
    this.currentProfile = null
    this.init()
  }

  async init() {
    // Check for existing session
    const { data: { session } } = await auth.getSession()
    if (session) {
      await this.setCurrentUser(session.user)
    }

    // Listen for auth changes
    auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.setCurrentUser(session.user)
        this.redirectToDashboard()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.currentProfile = null
        this.redirectToLogin()
      }
    })
  }

  async setCurrentUser(user) {
    this.currentUser = user
    try {
      this.currentProfile = await db.getProfile(user.id)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async signUp(email, password, fullName, role = 'student') {
    try {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message }
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }
  }

  async signOut() {
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  }

  async updateProfile(updates) {
    if (!this.currentUser) {
      throw new Error('No authenticated user')
    }

    try {
      this.currentProfile = await db.updateProfile(this.currentUser.id, updates)
      return { success: true, profile: this.currentProfile }
    } catch (error) {
      console.error('Profile update error:', error)
      return { success: false, error: error.message }
    }
  }

  isAuthenticated() {
    return !!this.currentUser
  }

  isTeacher() {
    return this.currentProfile?.role === 'teacher'
  }

  isStudent() {
    return this.currentProfile?.role === 'student'
  }

  getCurrentUser() {
    return this.currentUser
  }

  getCurrentProfile() {
    return this.currentProfile
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      this.redirectToLogin()
      return false
    }
    return true
  }

  requireTeacher() {
    if (!this.requireAuth()) return false
    
    if (!this.isTeacher()) {
      alert('Access denied. Teacher role required.')
      this.redirectToDashboard()
      return false
    }
    return true
  }

  requireStudent() {
    if (!this.requireAuth()) return false
    
    if (!this.isStudent()) {
      alert('Access denied. Student role required.')
      this.redirectToDashboard()
      return false
    }
    return true
  }

  redirectToLogin() {
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('index.html')) {
      window.location.href = 'login.html'
    }
  }

  redirectToDashboard() {
    if (this.isTeacher()) {
      window.location.href = 'teacher-dashboard.html'
    } else if (this.isStudent()) {
      window.location.href = 'student-dashboard.html'
    } else {
      window.location.href = 'dashboard.html'
    }
  }

  // Utility method to get user initials for avatar
  getUserInitials() {
    if (!this.currentProfile?.full_name) {
      return this.currentUser?.email?.charAt(0).toUpperCase() || 'U'
    }
    
    const names = this.currentProfile.full_name.split(' ')
    return names.length >= 2 
      ? (names[0].charAt(0) + names[1].charAt(0)).toUpperCase()
      : names[0].charAt(0).toUpperCase()
  }

  // Format user display name
  getDisplayName() {
    return this.currentProfile?.full_name || 
           this.currentUser?.email || 
           'User'
  }
}

// Create global auth manager instance
const authManager = new AuthManager()

// Export both the class and instance for flexibility
export { AuthManager }
export default authManager
