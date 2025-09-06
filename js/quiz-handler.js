// js/quiz-handler.js
// Quiz handling functionality

class QuizHandler {
  constructor() {
    this.currentQuiz = null
    this.startTime = null
    this.answers = {}
    this.timeRemaining = 0
    this.timerInterval = null
    this.init()
  }

  init() {
    this.setupQuizModal()
  }

  setupQuizModal() {
    // Create quiz modal if it doesn't exist
    if (!document.getElementById('quizModal')) {
      const modal = document.createElement('div')
      modal.id = 'quizModal'
      modal.className = 'modal quiz-modal'
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close" onclick="quizHandler.closeQuiz()">&times;</span>
          <div id="quizContainer">
            <!-- Quiz content will be loaded here -->
          </div>
        </div>
      `
      document.body.appendChild(modal)
    }
  }

  async startQuiz(quizId) {
    try {
      // Load quiz details
      const { data: quiz, error: quizError } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizError) throw quizError

      // Load quiz questions
      const { data: questions, error: questionsError } = await supabaseClient
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })

      if (questionsError) throw questionsError

      this.currentQuiz = { ...quiz, questions }
      this.startTime = new Date()
      this.timeRemaining = quiz.time_limit_minutes * 60
      this.answers = {}

      this.renderQuiz()
      this.startTimer()

      // Show modal
      const modal = document.getElementById('quizModal')
      modal.style.display = 'block'

      // Log quiz start
      if (window.realTimeManager) {
        realTimeManager.logActivity('quiz_started', {
          quiz_id: quizId,
          quiz_title: quiz.title
        })
      }
    } catch (error) {
      console.error('Failed to start quiz:', error)
      alert('Failed to load quiz. Please try again.')
    }
  }

  renderQuiz() {
    const container = document.getElementById('quizContainer')
    if (!container || !this.currentQuiz) return

    container.innerHTML = `
      <div class="quiz-header">
        <h2>${this.currentQuiz.title}</h2>
        <div class="quiz-timer">
          <span>Time Remaining: </span>
          <span id="timeRemaining">${this.formatTime(this.timeRemaining)}</span>
        </div>
      </div>
      
      <div class="quiz-info">
        <p>${this.currentQuiz.description || ''}</p>
        <div class="quiz-meta">
          <span>Total Questions: ${this.currentQuiz.questions.length}</span>
          <span>Total Marks: ${this.currentQuiz.total_marks}</span>
        </div>
      </div>

      <form id="quizForm">
        <div class="questions-container">
          ${this.renderQuestions()}
        </div>
        
        <div class="quiz-actions">
          <button type="button" onclick="quizHandler.submitQuiz()" class="btn primary">
            Submit Quiz
          </button>
          <button type="button" onclick="quizHandler.closeQuiz()" class="btn secondary">
            Cancel
          </button>
        </div>
      </form>
    `
  }

  renderQuestions() {
    return this.currentQuiz.questions
      .map((question, index) => {
        return `
          <div class="question-container" data-question-id="${question.id}">
            <div class="question-header">
              <h4>Question ${index + 1}</h4>
              <span class="question-marks">${question.marks} mark${question.marks > 1 ? 's' : ''}</span>
            </div>
            
            <div class="question-text">
              ${question.question_text}
            </div>
            
            <div class="answer-options">
              ${this.renderAnswerOptions(question, index)}
            </div>
          </div>
        `
      })
      .join('')
  }

  renderAnswerOptions(question, questionIndex) {
    switch (question.question_type) {
      case 'multiple_choice':
        return this.renderMultipleChoice(question, questionIndex)
      case 'true_false':
        return this.renderTrueFalse(question, questionIndex)
      case 'short_answer':
        return this.renderShortAnswer(question, questionIndex)
      default:
        return '<p>Unknown question type</p>'
    }
  }

  renderMultipleChoice(question, questionIndex) {
    const options = question.options || {}
    return Object.keys(options)
      .map(
        key => `
        <label class="option-label">
          <input type="radio" 
                 name="question_${questionIndex}" 
                 value="${key}"
                 onchange="quizHandler.saveAnswer(${questionIndex}, '${key}')">
          <span class="option-text">${options[key]}</span>
        </label>
      `
      )
      .join('')
  }

  renderTrueFalse(question, questionIndex) {
    return `
      <label class="option-label">
        <input type="radio" 
               name="question_${questionIndex}" 
               value="true"
               onchange="quizHandler.saveAnswer(${questionIndex}, 'true')">
        <span class="option-text">True</span>
      </label>
      <label class="option-label">
        <input type="radio" 
               name="question_${questionIndex}" 
               value="false"
               onchange="quizHandler.saveAnswer(${questionIndex}, 'false')">
        <span class="option-text">False</span>
      </label>
    `
  }

  renderShortAnswer(question, questionIndex) {
    return `
      <textarea 
        name="question_${questionIndex}"
        placeholder="Enter your answer here..."
        onchange="quizHandler.saveAnswer(${questionIndex}, this.value)"
        rows="3"></textarea>
    `
  }

  saveAnswer(questionIndex, answer) {
    this.answers[questionIndex] = answer
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--

      const timerElement = document.getElementById('timeRemaining')
      if (timerElement) {
        timerElement.textContent = this.formatTime(this.timeRemaining)

        // Change color when time is running out
        if (this.timeRemaining <= 300) {
          timerElement.style.color = 'red'
        } else if (this.timeRemaining <= 600) {
          timerElement.style.color = 'orange'
        }
      }

      // Auto-submit when time runs out
      if (this.timeRemaining <= 0) {
        this.submitQuiz(true)
      }
    }, 1000)
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return ${minutes}:${remainingSeconds.toString().padStart(2, '0')}
  }

  async submitQuiz(autoSubmit = false) {
    try {
      if (!autoSubmit && !confirm('Are you sure you want to submit your quiz?')) {
        return
      }

      const endTime = new Date()
      const timeTaken = Math.floor((endTime - this.startTime) / 1000)

      // Calculate score
      let score = 0
      let totalMarks = 0

      this.currentQuiz.questions.forEach((q, index) => {
        totalMarks += q.marks
        const givenAnswer = this.answers[index]

        if (
          givenAnswer &&
          givenAnswer.toString().trim().toLowerCase() ===
            q.correct_answer.toString().trim().toLowerCase()
        ) {
          score += q.marks
        }
      })

      // Save attempt to DB
      const { data: { user } } = await supabaseClient.auth.getUser()

      if (user) {
        await supabaseClient.from('quiz_attempts').insert({
          quiz_id: this.currentQuiz.id,
          student_id: user.id,
          answers: this.answers,
          score: score,
          total_marks: totalMarks,
          percentage: (score / totalMarks) * 100,
          time_taken_seconds: timeTaken,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
      }

      alert(Quiz submitted! Your score: ${score}/${totalMarks})

      if (window.realTimeManager) {
        realTimeManager.logActivity('quiz_completed', {
          quiz_id: this.currentQuiz.id,
          score,
          total: totalMarks
        })
      }

      this.closeQuiz()
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      alert('Failed to submit quiz. Please try again.')
    }
  }

  closeQuiz() {
    const modal = document.getElementById('quizModal')
    if (modal) {
      modal.style.display = 'none'
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
}

// Create a global instance
const quizHandler = new QuizHandler()
window.quizHandler = quizHandler
