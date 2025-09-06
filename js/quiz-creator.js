class QuizCreator {
  constructor() {
    this.questions = []
    this.init()
  }

  init() {
    const form = document.getElementById("createQuizForm")
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault()
        this.submitQuiz()
      })
    }
  }

  addQuestion() {
    const idx = this.questions.length
    this.questions.push({})

    const container = document.createElement("div")
    container.className = "question-editor"
    container.innerHTML = `
      <h4>Question ${idx + 1}</h4>
      <label>English Text:</label>
      <input type="text" id="q_${idx}_en" required>
      <label>Punjabi Text:</label>
      <input type="text" id="q_${idx}_pa">

      <label>Type:</label>
      <select id="q_${idx}_type" onchange="quizCreator.renderOptions(${idx})">
        <option value="multiple_choice">Multiple Choice</option>
        <option value="true_false">True/False</option>
        <option value="short_answer">Short Answer</option>
      </select>

      <div id="q_${idx}_options"></div>
      <label>Correct Answer:</label>
      <input type="text" id="q_${idx}_correct" required>
      <label>Marks:</label>
      <input type="number" id="q_${idx}_marks" value="1" min="1">
    `
    document.getElementById("questionsList").appendChild(container)
    this.renderOptions(idx)
  }

  renderOptions(idx) {
    const type = document.getElementById(q_${idx}_type).value
    const container = document.getElementById(q_${idx}_options)
    if (type === "multiple_choice") {
      container.innerHTML = `
        <label>Option A (English):</label>
        <input type="text" id="q_${idx}_optA">
        <label>Option A (Punjabi):</label>
        <input type="text" id="q_${idx}_optA_pa">

        <label>Option B (English):</label>
        <input type="text" id="q_${idx}_optB">
        <label>Option B (Punjabi):</label>
        <input type="text" id="q_${idx}_optB_pa">

        <label>Option C (English):</label>
        <input type="text" id="q_${idx}_optC">
        <label>Option C (Punjabi):</label>
        <input type="text" id="q_${idx}_optC_pa">

        <label>Option D (English):</label>
        <input type="text" id="q_${idx}_optD">
        <label>Option D (Punjabi):</label>
        <input type="text" id="q_${idx}_optD_pa">
      `
    } else {
      container.innerHTML = ""
    }
  }

  async submitQuiz() {
    try {
      const quiz = {
        title: document.getElementById("quizTitle").value,
        title_punjabi: document.getElementById("quizTitlePunjabi").value,
        description: document.getElementById("quizDescription").value,
        description_punjabi: document.getElementById("quizDescriptionPunjabi").value,
        teacher_id: authManager.getCurrentUser().id,
        course_id: document.getElementById("quizCourse").value,
        time_limit_minutes: parseInt(document.getElementById("quizTimeLimit").value),
        total_marks: 0
      }

      const { data: quizRow, error: quizError } = await supabaseClient
        .from("quizzes")
        .insert([quiz])
        .select()
        .single()

      if (quizError) throw quizError

      // Insert questions
      let totalMarks = 0
      for (let i = 0; i < this.questions.length; i++) {
        const qType = document.getElementById(q_${i}_type).value
        const marks = parseInt(document.getElementById(q_${i}_marks).value)

        const question = {
          quiz_id: quizRow.id,
          question_text: document.getElementById(q_${i}_en).value,
          question_text_punjabi: document.getElementById(q_${i}_pa).value,
          question_type: qType,
          correct_answer: document.getElementById(q_${i}_correct).value,
          marks,
          sequence_order: i,
          options: {}
        }

        if (qType === "multiple_choice") {
          question.options = {
            A: document.getElementById(q_${i}_optA).value,
            A_pa: document.getElementById(q_${i}_optA_pa).value,
            B: document.getElementById(q_${i}_optB).value,
            B_pa: document.getElementById(q_${i}_optB_pa).value,
            C: document.getElementById(q_${i}_optC).value,
            C_pa: document.getElementById(q_${i}_optC_pa).value,
            D: document.getElementById(q_${i}_optD).value,
            D_pa: document.getElementById(q_${i}_optD_pa).value
          }
        }

        const { error: qError } = await supabaseClient.from("quiz_questions").insert([question])
        if (qError) throw qError
        totalMarks += marks
      }

      // Update quiz total marks
      await supabaseClient.from("quizzes").update({ total_marks: totalMarks }).eq("id", quizRow.id)

      alert("✅ Quiz created successfully")
      document.getElementById("createQuizModal").style.display = "none"
      this.questions = []
      document.getElementById("questionsList").innerHTML = ""
    } catch (err) {
      console.error("Quiz create error:", err)
      alert("❌ Could not create quiz")
    }
  }
}

window.quizCreator = new QuizCreator()
