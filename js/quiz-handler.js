// quiz-handler.js
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
    this.setupLangSync()
  }

  setupLangSync() {
    const langSel = document.getElementById("globalLang")
    if (langSel) {
      langSel.addEventListener("change", () => {
        if (this.currentQuiz) this.renderQuiz()
      })
    }
  }

  setupQuizModal() {
    if (!document.getElementById("quizModal")) {
      const modal = document.createElement("div")
      modal.id = "quizModal"
      modal.className = "modal quiz-modal"
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close" onclick="quizHandler.closeQuiz()">&times;</span>
          <div id="quizContainer"></div>
        </div>
      `
      document.body.appendChild(modal)
    }
  }

  async startQuiz(quizId) {
    try {
      const { data: quiz, error: quizError } = await supabaseClient
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single()

      if (quizError) throw quizError

      const { data: questions, error: questionsError } = await supabaseClient
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("sequence_order")

      if (questionsError) throw questionsError

      this.currentQuiz = { ...quiz, questions }
      this.startTime = new Date()
      this.timeRemaining = quiz.time_limit_minutes * 60
      this.answers = {}

      this.renderQuiz()
      this.startTimer()

      document.getElementById("quizModal").style.display = "block"
    } catch (err) {
      console.error("Quiz load error:", err)
      alert("❌ Failed to load quiz.")
    }
  }

  renderQuiz() {
    if (!this.currentQuiz) return
    const lang = document.getElementById("globalLang")?.value || "en"
    const texts = this.getLangTexts(lang)

    const container = document.getElementById("quizContainer")
    container.innerHTML = `
      <div class="quiz-header">
        <h2>${this.currentQuiz.title}</h2>
        <div class="quiz-timer">
          <span>${texts.timeRemaining}: </span>
          <span id="timeRemaining">${this.formatTime(this.timeRemaining)}</span>
        </div>
      </div>

      <p>${this.currentQuiz.description || ""}</p>
      <div class="quiz-meta">
        <span>${texts.totalQuestions}: ${this.currentQuiz.questions.length}</span>
        <span>${texts.totalMarks}: ${this.currentQuiz.total_marks}</span>
      </div>

      <form id="quizForm">
        <div class="questions-container">
          ${this.renderQuestions(lang)}
        </div>
        <div class="quiz-actions">
          <button type="button" onclick="quizHandler.submitQuiz()" class="btn primary">
            ${texts.submit}
          </button>
          <button type="button" onclick="quizHandler.closeQuiz()" class="btn secondary">
            ${texts.cancel}
          </button>
        </div>
      </form>
    `
  }

  renderQuestions(lang) {
    return this.currentQuiz.questions
      .map((q, i) => `
      <div class="question-container">
        <div class="question-header">
          <h4>${this.getLangText(q.question_text, q.question_text_punjabi, lang)}</h4>
          <span>${q.marks} mark${q.marks > 1 ? "s" : ""}</span>
        </div>
        <div class="answer-options">${this.renderAnswerOptions(q, i, lang)}</div>
      </div>
    `)
      .join("")
  }

  renderAnswerOptions(q, idx, lang) {
    switch (q.question_type) {
      case "multiple_choice":
        return this.renderMultipleChoice(q, idx, lang)
      case "true_false":
        return this.renderTrueFalse(idx, lang)
      case "short_answer":
        return this.renderShortAnswer(idx, lang)
      default:
        return "<p>❓ Unknown type</p>"
    }
  }

  renderMultipleChoice(q, idx, lang) {
    const opts = q.options || {}
    return Object.keys(opts)
      .map(
        k => `
      <label>
        <input type="radio" name="q_${idx}" value="${k}" 
          onchange="quizHandler.saveAnswer(${idx}, '${k}')">
        ${this.getLangText(opts[k], opts[k + "_pa"], lang)}
      </label>`
      )
      .join("")
  }

  renderTrueFalse(idx, lang) {
    const texts = this.getLangTexts(lang)
    return `
      <label>
        <input type="radio" name="q_${idx}" value="true" 
          onchange="quizHandler.saveAnswer(${idx}, 'true')"> ${texts.true}
      </label>
      <label>
        <input type="radio" name="q_${idx}" value="false" 
          onchange="quizHandler.saveAnswer(${idx}, 'false')"> ${texts.false}
      </label>`
  }

  renderShortAnswer(idx, lang) {
    return <textarea onchange="quizHandler.saveAnswer(${idx}, this.value)" rows="3"></textarea>
  }

  saveAnswer(idx, ans) {
    this.answers[idx] = ans
  }

  startTimer() {
    clearInterval(this.timerInterval)
    this.timerInterval = setInterval(() => {
      this.timeRemaining--
      const el = document.getElementById("timeRemaining")
      if (el) el.textContent = this.formatTime(this.timeRemaining)

      if (this.timeRemaining <= 0) this.submitQuiz(true)
    }, 1000)
  }

  async submitQuiz(auto = false) {
    try {
      if (!auto && !confirm("Submit quiz?")) return

      let score = 0
      this.currentQuiz.questions.forEach((q, i) => {
        if (this.answers[i] && this.answers[i] === q.correct_answer) {
          score += q.marks
        }
      })

      const endTime = new Date()
      const timeTaken = Math.floor((endTime - this.startTime) / 1000)

      await supabaseClient.from("quiz_attempts").insert({
        quiz_id: this.currentQuiz.id,
        student_id: authManager.getCurrentUser().id,
        answers: this.answers,
        score,
        total_marks: this.currentQuiz.total_marks,
        is_completed: true,
        time_taken_seconds: timeTaken,
        completed_at: new Date().toISOString()
      })

      alert(✅ Quiz submitted! Score: ${score}/${this.currentQuiz.total_marks})
      this.closeQuiz()
    } catch (err) {
      console.error("Quiz submit error:", err)
      alert("❌ Could not submit quiz.")
    }
  }

  closeQuiz() {
    clearInterval(this.timerInterval)
    this.currentQuiz = null
    document.getElementById("quizModal").style.display = "none"
  }

  // Helpers
  formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return ${m}:${s.toString().padStart(2, "0")}
  }

  getLangText(en, pa, lang) {
    return lang === "pa" ? pa || en : en
  }

  getLangTexts(lang) {
    return lang === "pa"
      ? { timeRemaining: "ਬਾਕੀ ਸਮਾਂ", totalQuestions: "ਕੁੱਲ ਪ੍ਰਸ਼ਨ", totalMarks: "ਕੁੱਲ ਅੰਕ", submit: "ਜਮ੍ਹਾਂ ਕਰੋ", cancel: "ਰੱਦ ਕਰੋ", true: "ਸਹੀ", false: "ਗਲਤ" }
      : { timeRemaining: "Time Remaining", totalQuestions: "Total Questions", totalMarks: "Total Marks", submit: "Submit Quiz", cancel: "Cancel", true: "True", false: "False" }
  }
}

window.quizHandler = new QuizHandler()
