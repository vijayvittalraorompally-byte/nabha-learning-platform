// js/auth.js - Enhanced Authentication System
import { supabase } from './supabase.js'

class AuthManager {
  constructor() {
    this.currentUser = null
    this.userProfile = null
    this.init()
  }

  async init() {
    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      this.currentUser = user
      await this.loadUserProfile()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.currentUser = session.user
        await this.loadUserProfile()
        this.redirectToDashboard()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.userProfile = null
        this.redirectToLogin()
      }
    })
  }

  // Sign up new user
  async signUp(email, password, userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      })

      if (error) throw error

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: email,
            full_name: userData.fullName,
            role: userData.role,
            grade_level: userData.role === 'student' ? userData.gradeLevel : null,
            subject_specialization: userData.role === 'teacher' ? userData.subject : null,
            created_at: new Date().toISOString()
          }])

        if (profileError) throw profileError
      }

      return { success: true, data }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign in user
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (error) throw error

      this.currentUser = data.user
      await this.loadUserProfile()

      return { success: true, data }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      this.currentUser = null
      this.userProfile = null
      
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  }

  // Load user profile
  async loadUserProfile() {
    if (!this.currentUser) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error) throw error

      this.userProfile = data
      return { success: true, data }
    } catch (error) {
      console.error('Load profile error:', error)
      return { success: false, error: error.message }
    }
  }

  // Update user profile
  async updateProfile(updates) {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select()
        .single()

      if (error) throw error

      this.userProfile = { ...this.userProfile, ...data }
      return { success: true, data }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser
  }

  // Get user profile
  getUserProfile() {
    return this.userProfile
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser
  }

  // Check if user has specific role
  hasRole(role) {
    return this.userProfile?.role === role
  }

  // Redirect to appropriate dashboard
  redirectToDashboard() {
    if (!this.userProfile) return

    const currentPath = window.location.pathname
    
    // Don't redirect if already on correct dashboard
    if (currentPath.includes('dashboard')) return

    if (this.userProfile.role === 'student') {
      window.location.href = '/student-dashboard.html'
    } else if (this.userProfile.role === 'teacher') {
      window.location.href = '/teacher-dashboard.html'
    }
  }

  // Redirect to login
  redirectToLogin() {
    const currentPath = window.location.pathname
    if (!currentPath.includes('login') && !currentPath.includes('index')) {
      window.location.href = '/login.html'
    }
  }

  // Protect route (call this on protected pages)
  async protectRoute(requiredRole = null) {
    if (!this.isAuthenticated()) {
      this.redirectToLogin()
      return false
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      this.showAlert('Access denied. Insufficient permissions.', 'error')
      this.redirectToDashboard()
      return false
    }

    return true
  }

  // Show alert message
  showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div')
    alert.className = `alert alert-${type}`
    alert.innerHTML = `
      <span>${message}</span>
      <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `

    // Add to page
    const alertContainer = document.getElementById('alertContainer') || document.body
    alertContainer.appendChild(alert)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove()
      }
    }, 5000)
  }

  // Format time helper
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Get user statistics
  async getUserStats() {
    if (!this.currentUser) return null

    try {
      if (this.userProfile.role === 'student') {
        // Get student statistics
        const { data: videoProgress } = await supabase
          .from('video_progress')
          .select('*')
          .eq('student_id', this.currentUser.id)

        const { data: quizResults } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('student_id', this.currentUser.id)

        const completedVideos = videoProgress?.filter(p => p.completed).length || 0
        const totalWatchTime = videoProgress?.reduce((sum, p) => sum + (p.progress_seconds || 0), 0) || 0
        const averageScore = quizResults?.length > 0 
          ? quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length 
          : 0

        return {
          completedVideos,
          totalWatchTime,
          averageScore,
          quizzesCompleted: quizResults?.length || 0
        }
      } else if (this.userProfile.role === 'teacher') {
        // Get teacher statistics
        const { data: videos } = await supabase
          .from('videos')
          .select('*')
          .eq('teacher_id', this.currentUser.id)

        const { data: quizzes } = await supabase
          .from('quizzes')
          .select('*')
          .eq('teacher_id', this.currentUser.id)

        const totalViews = videos?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0

        return {
          videosUploaded: videos?.length || 0,
          quizzesCreated: quizzes?.length || 0,
          totalViews
        }
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return null
    }
  }
}

// Create global auth instance
const auth = new AuthManager()

export default auth
