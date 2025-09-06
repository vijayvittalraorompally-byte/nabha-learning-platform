// js/video-handler.js
// Video handling for both Student and Teacher
import authManager from './auth.js'

class VideoHandler {
  constructor() {
    this.currentVideo = null
  }

  // For teachers: upload video
  async uploadVideo({ title, description, url, courseId, durationSeconds }) {
    if (!authManager.isTeacher()) {
      alert("Only teachers can upload videos")
      return { success: false }
    }

    try {
      const user = authManager.getCurrentUser()

      const { data, error } = await window.supabaseClient
        .from('videos')
        .insert([{
          title,
          description,
          video_url: url,
          teacher_id: user.id,
          course_id: courseId,
          duration_seconds: durationSeconds || null,
        }])
        .select()
        .single()

      if (error) throw error

      alert("✅ Video uploaded successfully!")
      return { success: true, data }
    } catch (err) {
      console.error("Upload error:", err)
      alert("❌ Failed to upload video")
      return { success: false, error: err.message }
    }
  }

  // For students: get videos
  async getAllVideos() {
    try {
      const { data, error } = await window.supabaseClient
        .from('videos')
        .select('id, title, description, video_url, view_count, duration_seconds')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error("Error loading videos:", err)
      return []
    }
  }

  // For students: open video player modal
  playVideo(video) {
    this.currentVideo = video
    const modal = document.getElementById("videoModal")
    const player = document.getElementById("videoPlayer")

    if (player) {
      player.src = video.video_url
      document.getElementById("videoTitle").textContent = video.title
      document.getElementById("videoDescription").textContent = video.description || ""
      modal.style.display = "block"
      player.play()
    }
  }

  closeVideo() {
    const modal = document.getElementById("videoModal")
    const player = document.getElementById("videoPlayer")
    if (player) player.pause()
    modal.style.display = "none"
  }
}

const videoHandler = new VideoHandler()
window.videoHandler = videoHandler
export default videoHandler
