// js/quiz-creator.js
class QuizCreator {
  constructor() {
    this.questions = []
  }

  async createQuiz() {
    const title = document.getElementById("quizTitle").value
    const description = document.getElementById("quizDescription").value
    const courseId = document.getElementById("quizCourse").value
    const timeLimit = parseInt(document.getElementById("quizTimeLimit").value)

    // 1. Insert quiz
    const { data: { user } } = await supabaseClient.auth.getUser()
    const { data: quiz, error } = await supabaseClient
      .from("quizzes")
      .insert({
        title,
        description,
        course_id: courseId,
        teacher_id: user.id,
        time_limit_minutes: timeLimit,
        total_marks: this.questions.reduce((sum, q) => sum + q.marks, 0)
      })
      .select()
      .single()

    if (error) {
      alert("Error creating quiz: " + error.message)
      return
    }

    // 2. Insert questions
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i]
      await supabaseClient.from("quiz_questions").insert({
        quiz_id: quiz.id,
        question_text: q.text,
        question_type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        marks: q.marks,
        order_index: i + 1
      })
    }

    alert("Quiz created successfully ✅")
    this.questions = []
    document.getElementById("createQuizForm").reset()
    document.getElementById("createQuizModal").style.display = "none"
  }

  addQuestion() {
    const questionText = prompt("Enter question:")
    const correctAnswer = prompt("Enter correct answer:")
    const marks = parseInt(prompt("Enter marks:"))

    this.questions.push({
      text: questionText,
      type: "multiple_choice", // you can extend with options
      options: { a: "Option A", b: "Option B" }, // temporary example
      correct_answer: correctAnswer,
      marks
    })

    this.renderQuestions()
  }

  renderQuestions() {
    const container = document.getElementById("questionsList")
    container.innerHTML = this.questions
      .map(
        (q, i) => `
        <div class="question-preview">
          <strong>Q${i + 1}:</strong> ${q.text} 
          <em>(${q.marks} marks)</em>
        </div>
      `
      )
      .join("")
  }
}

const quizCreator = new QuizCreator()
window.quizCreator = quizCreator

// Hook into teacher modal buttons
document.getElementById("createQuizForm").addEventListener("submit", (e) => {
  e.preventDefault()
  quizCreator.createQuiz()
})
