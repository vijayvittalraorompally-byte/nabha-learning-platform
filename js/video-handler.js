// js/video-handler.js - Video Management System
import { supabase } from './supabase.js'
import auth from './auth.js'

class VideoHandler {
  constructor() {
    this.currentVideo = null
    this.progressInterval = null
    this.init()
  }

  init() {
    // Initialize video player if on video page
    const videoPlayer = document.getElementById('videoPlayer')
    if (videoPlayer) {
      this.setupVideoPlayer(videoPlayer)
    }
  }

  // Upload video (for teachers)
  async uploadVideo(videoData) {
    try {
      const user = auth.getCurrentUser()
      const profile = auth.getUserProfile()
      
      if (!user || !profile || profile.role !== 'teacher') {
        throw new Error('Only teachers can upload videos')
      }

      // Insert video record into database
      const { data, error } = await supabase
        .from('videos')
        .insert([{
          title: videoData.title,
          description: videoData.description,
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          teacher_id: user.id,
          duration: videoData.duration,
          subject: videoData.subject,
          grade_level: videoData.grade_level,
          is_public: videoData.is_public || true
        }])
        .select()
        .single()

      if (error) throw error

      this.showAlert('Video uploaded successfully!', 'success')
      return { success: true, data }
    } catch (error) {
      console.error('Upload error:', error)
      this.showAlert(error.message, 'error')
      return { success: false, error: error.message }
    }
  }

  // Get all videos (for students and teachers)
  async getAllVideos(filters = {}) {
    try {
      let query = supabase
        .from('videos')
        .select(`
          *,
          profiles:teacher_id (
            full_name
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.subject) {
        query = query.eq('subject', filters.subject)
      }
      
      if (filters.grade_level) {
        query = query.eq('grade_level', filters.grade_level)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching videos:', error)
      return { success: false, error: error.message }
    }
  }

  // Get videos by teacher (for teacher dashboard)
  async getTeacherVideos(teacherId) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching teacher videos:', error)
      return { success: false, error: error.message }
    }
  }

  // Get single video with progress (for students)
  async getVideoWithProgress(videoId) {
    try {
      const user = auth.getCurrentUser()
      
      // Get video details
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:teacher_id (
            full_name
          )
        `)
        .eq('id', videoId)
        .single()

      if (videoError) throw videoError

      // Get user's progress if logged in
      let progress = null
      if (user) {
        const { data: progressData } = await supabase
          .from('video_progress')
          .select('*')
          .eq('video_id', videoId)
          .eq('student_id', user.id)
          .single()
        
        progress = progressData
      }

      // Increment view count
      await supabase
        .from('videos')
        .update({ view_count: (video.view_count || 0) + 1 })
        .eq('id', videoId)

      return { success: true, data: { video, progress } }
    } catch (error) {
      console.error('Error fetching video:', error)
      return { success: false, error: error.message }
    }
  }

  // Setup video player with custom controls
  setupVideoPlayer(videoElement) {
    const container = videoElement.closest('.video-container')
    const playPauseBtn = container.querySelector('.play-pause-btn')
    const progressBar = container.querySelector('.progress-bar')
    const progressFill = container.querySelector('.progress-fill')
    const timeDisplay = container.querySelector('.time-display')

    // Play/Pause functionality
    playPauseBtn?.addEventListener('click', () => {
      if (videoElement.paused) {
        videoElement.play()
        playPauseBtn.innerHTML = '⏸️'
      } else {
        videoElement.pause()
        playPauseBtn.innerHTML = '▶️'
      }
    })

    // Progress bar functionality
    progressBar?.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      videoElement.currentTime = percent * videoElement.duration
    })

    // Update progress and time
    videoElement.addEventListener('timeupdate', () => {
      const percent = (videoElement.currentTime / videoElement.duration) * 100
      if (progressFill) {
        progressFill.style.width = `${percent}%`
      }
      
      if (timeDisplay) {
        const current = this.formatTime(videoElement.currentTime)
        const duration = this.formatTime(videoElement.duration)
        timeDisplay.textContent = `${current} / ${duration}`
      }

      // Save progress for logged-in students
      this.saveProgress(videoElement.currentTime)
    })

    // Video ended
    videoElement.addEventListener('ended', () => {
      playPauseBtn.innerHTML = '▶️'
      this.markVideoComplete()
    })

    // Load saved progress
    this.loadSavedProgress(videoElement)

    // Start progress tracking
    this.startProgressTracking(videoElement)
  }

  // Save video progress
  async saveProgress(currentTime) {
    const user = auth.getCurrentUser()
    const profile = auth.getUserProfile()
    
    if (!user || !profile || profile.role !== 'student' || !this.currentVideo) {
      return
    }

    try {
      const { error } = await supabase
        .from('video_progress')
        .upsert([{
          video_id: this.currentVideo.id,
          student_id: user.id,
          progress_seconds: Math.floor(currentTime),
          last_watched: new Date().toISOString()
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  // Load saved progress
  async loadSavedProgress(videoElement) {
    const user = auth.getCurrentUser()
    const profile = auth.getUserProfile()
    
    if (!user || !profile || profile.role !== 'student' || !this.currentVideo) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('progress_seconds')
        .eq('video_id', this.currentVideo.id)
        .eq('student_id', user.id)
        .single()

      if (error || !data) return

      // Resume from saved position
      if (data.progress_seconds > 10) { // Only resume if more than 10 seconds watched
        const resume = confirm(`Resume from ${this.formatTime(data.progress_seconds)}?`)
        if (resume) {
          videoElement.currentTime = data.progress_seconds
        }
      }
    } catch (error) {
      console.error('Error loading saved progress:', error)
    }
  }

  // Mark video as complete
  async markVideoComplete() {
    const user = auth.getCurrentUser()
    const profile = auth.getUserProfile()
    
    if (!user || !profile || profile.role !== 'student' || !this.currentVideo) {
      return
    }

    try {
      await supabase
        .from('video_progress')
        .upsert([{
          video_id: this.currentVideo.id,
          student_id: user.id,
          progress_seconds: this.currentVideo.duration || 0,
          completed: true,
          last_watched: new Date().toISOString()
        }])

      this.showAlert('Video completed! 🎉
