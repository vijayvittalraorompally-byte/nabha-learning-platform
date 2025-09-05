import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://cooggqcwbgngqcaypbky.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvb2dncWN3YmduZ3FjYXlwYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDYwNjAsImV4cCI6MjA3MjU4MjA2MH0.aJAOPyV6JqpfjqlQvL6okQTpu9VuC7jixGNVJ1AABHg'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper functions for common operations
export const auth = supabase.auth

// Database helper functions
export const db = {
  // Profile operations
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Video operations
  async getVideos(teacherId = null) {
    let query = supabase
      .from('videos')
      .select(`
        *,
        profiles!videos_teacher_id_fkey(full_name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getVideo(videoId) {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        profiles!videos_teacher_id_fkey(full_name)
      `)
      .eq('id', videoId)
      .single()
    
    if (error) throw error
    return data
  },

  async createVideo(videoData) {
    const { data, error } = await supabase
      .from('videos')
      .insert([videoData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateVideo(videoId, updates) {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteVideo(videoId) {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
    
    if (error) throw error
  },

  // Quiz operations
  async getQuizzes(teacherId = null, videoId = null) {
    let query = supabase
      .from('quizzes')
      .select(`
        *,
        profiles!quizzes_teacher_id_fkey(full_name),
        videos(title)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    if (videoId) {
      query = query.eq('video_id', videoId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getQuiz(quizId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        profiles!quizzes_teacher_id_fkey(full_name),
        videos(title),
        quiz_questions(*)
      `)
      .eq('id', quizId)
      .single()
    
    if (error) throw error
    return data
  },

  async createQuiz(quizData) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateQuiz(quizId, updates) {
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteQuiz(quizId) {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
    
    if (error) throw error
  },

  // Quiz questions operations
  async createQuizQuestion(questionData) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert([questionData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateQuizQuestion(questionId, updates) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteQuizQuestion(questionId) {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
    
    if (error) throw error
  },

  // Video progress operations
  async getVideoProgress(studentId, videoId) {
    const { data, error } = await supabase
      .from('video_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('video_id', videoId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateVideoProgress(studentId, videoId, progressData) {
    const { data, error } = await supabase
      .from('video_progress')
      .upsert([{
        student_id: studentId,
        video_id: videoId,
        ...progressData
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Quiz attempts operations
  async getQuizAttempt(studentId, quizId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async createQuizAttempt(attemptData) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .upsert([attemptData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Analytics operations
  async logAnalytics(analyticsData) {
    const { error } = await supabase
      .from('real_time_analytics')
      .insert([analyticsData])
    
    if (error) throw error
  },

  async getAnalytics(teacherId, startDate, endDate) {
    let query = supabase
      .from('real_time_analytics')
      .select(`
        *,
        profiles!real_time_analytics_student_id_fkey(full_name),
        videos(title),
        quizzes(title)
      `)
      .order('timestamp', { ascending: false })

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }

    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data, error } = await query
    if (error) throw error

    // Filter by teacher's content
    return data.filter(item => 
      (item.videos && item.videos.teacher_id === teacherId) ||
      (item.quizzes && item.quizzes.teacher_id === teacherId)
    )
  }
}

// Real-time subscriptions
export const subscriptions = {
  subscribeToVideoProgress(studentId, callback) {
    return supabase
      .channel('video_progress')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_progress',
        filter: `student_id=eq.${studentId}`
      }, callback)
      .subscribe()
  },

  subscribeToAnalytics(teacherId, callback) {
    return supabase
      .channel('analytics')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'real_time_analytics'
      }, callback)
      .subscribe()
  }
}

export default supabase
