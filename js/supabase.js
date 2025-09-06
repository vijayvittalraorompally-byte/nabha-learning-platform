import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2'

// Replace with your actual Supabase project details
const SUPABASE_URL = 'https://cooggqcwbgngqcaypbky.supabase.co' // e.g., 'https://xxxxxxxxxxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvb2dncWN3YmduZ3FjYXlwYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDYwNjAsImV4cCI6MjA3MjU4MjA2MH0.aJAOPyV6JqpfjqlQvL6okQTpu9VuC7jixGNVJ1AABHg' // Your anon public key

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Auth instance
export const auth = supabase.auth

// Database helper class
class Database {
  constructor(client) {
    this.client = client
  }

  // Profile operations
  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    return data
  }

  async updateProfile(userId, updates) {
    const { data, error } = await this.client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getAllProfiles() {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  // Course operations
  async getCourses() {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        *,
        instructor:profiles!courses_instructor_id_fkey(full_name, avatar_url)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  async getCourse(courseId) {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        *,
        instructor:profiles!courses_instructor_id_fkey(full_name, avatar_url),
        videos(id, title, description, duration_seconds, thumbnail_url, created_at)
      `)
      .eq('id', courseId)
      .single()
    
    if (error) throw error
    return data
  }

  async createCourse(courseData) {
    const { data, error } = await this.client
      .from('courses')
      .insert(courseData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async updateCourse(courseId, updates) {
    const { data, error } = await this.client
      .from('courses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', courseId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Video operations
  async getVideos(courseId = null) {
    let query = this.client
      .from('videos')
      .select(`
        *,
        teacher:profiles!videos_teacher_id_fkey(full_name, avatar_url),
        course:courses(title)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async getVideo(videoId) {
    const { data, error } = await this.client
      .from('videos')
      .select(`
        *,
        teacher:profiles!videos_teacher_id_fkey(full_name, avatar_url),
        course:courses(title, description)
      `)
      .eq('id', videoId)
      .single()
    
    if (error) throw error
    return data
  }

  async createVideo(videoData) {
    const { data, error } = await this.client
      .from('videos')
      .insert(videoData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async updateVideoProgress(videoId, studentId, progressSeconds) {
    const { data, error } = await this.client
      .from('video_progress')
      .upsert({
        video_id: videoId,
        student_id: studentId,
        progress_seconds: progressSeconds,
        last_watched: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getVideoProgress(videoId, studentId) {
    const { data, error } = await this.client
      .from('video_progress')
      .select('*')
      .eq('video_id', videoId)
      .eq('student_id', studentId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    return data
  }

  // Quiz operations
  async getQuizzes(courseId = null) {
    let query = this.client
      .from('quizzes')
      .select(`
        *,
        teacher:profiles!quizzes_teacher_id_fkey(full_name),
        course:courses(title)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async getQuiz(quizId) {
    const { data, error } = await this.client
      .from('quizzes')
      .select(`
        *,
        teacher:profiles!quizzes_teacher_id_fkey(full_name),
        course:courses(title),
        questions:quiz_questions(*)
      `)
      .eq('id', quizId)
      .single()
    
    if (error) throw error
    return data
  }

  async createQuiz(quizData) {
    const { data, error } = await this.client
      .from('quizzes')
      .insert(quizData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async createQuizQuestion(questionData) {
    const { data, error } = await this.client
      .from('quiz_questions')
      .insert(questionData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async submitQuizAttempt(attemptData) {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .insert(attemptData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getQuizAttempts(quizId, studentId) {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  // File operations
  async uploadFile(file, bucket = 'files', path = '') {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = path ? `${path}/${fileName}` : fileName
    
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(filePath, file)
    
    if (error) throw error
    
    // Get public URL
    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      ...data,
      publicUrl: urlData.publicUrl
    }
  }

  async createFileRecord(fileData) {
    const { data, error } = await this.client
      .from('files')
      .insert(fileData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Analytics and progress
  async getStudentProgress(studentId, courseId = null) {
    let query = this.client
      .from('student_progress')
      .select(`
        *,
        course:courses(title, thumbnail_url)
      `)
      .eq('student_id', studentId)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async updateStudentProgress(studentId, courseId, progressData) {
    const { data, error } = await this.client
      .from('student_progress')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        ...progressData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Activity logging
  async logActivity(userId, activityType, activityData = {}) {
    const { data, error } = await this.client
      .from('activity_log')
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getRecentActivity(userId, limit = 10) {
    const { data, error } = await this.client
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }

  // Notifications
  async createNotification(userId, title, message, type = 'info') {
    const { data, error } = await this.client
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async getNotifications(userId, unreadOnly = false) {
    let query = this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async markNotificationAsRead(notificationId) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // Real-time subscriptions
  subscribeToTable(table, callback, filter = null) {
    let channel = this.client
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          ...(filter && { filter })
        }, 
        callback
      )
      .subscribe()

    return channel
  }

  unsubscribe(channel) {
    this.client.removeChannel(channel)
  }
}

// Create database instance
const db = new Database(supabase)

// Export everything
export { supabase, db }
export default supabase
