// js/app.js

// Ensure auth + db are loaded
import authManager from './auth.js'
import { db } from './supabase.js'

// Bootstrapping the app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App starting...')

  // Make sure user session is loaded
  await authManager.init?.()

  // If on student dashboard, load dashboard content
  if (window.location.pathname.includes('student-dashboard.html')) {
    console.log('Loading student dashboard data...')
    // load courses, videos, quizzes, etc.
    if (window.loadStudentDashboard) {
      await window.loadStudentDashboard()
    }
  }

  // If on teacher dashboard, load teacher-specific logic
  if (window.location.pathname.includes('teacher-dashboard.html')) {
    console.log('Loading teacher dashboard data...')
    if (window.loadTeacherDashboard) {
      await window.loadTeacherDashboard()
    }
  }

  // Register SW (safe check)
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registered')
    } catch (err) {
      console.warn('SW registration failed', err)
    }
  }
})
