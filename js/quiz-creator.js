<!-- js/quiz-creator.js -->
<script>
(() => {
  const QuizCreator = {
    async createQuizWithQuestions(quizData, questions) {
      try {
        if (!window.authManager || !window.authManager.isTeacher()) return { success:false, error:'Not authorized' };
        quizData.teacher_id = window.authManager.currentUser.id;
        quizData.created_at = new Date().toISOString();
        const { data: quiz, error: qErr } = await window.db.createQuiz(quizData);
        if (qErr) return { success:false, error: qErr.message || qErr };

        for (let i=0;i<questions.length;i++){
          const q = questions[i];
          const payload = {
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || {},
            correct_answer: q.correct_answer,
            marks: q.marks || 1,
            sequence_order: i,
            created_at: new Date().toISOString()
          };
          await window.db.createQuizQuestion(payload);
        }
        return { success:true, quiz };
      } catch (e) { return { success:false, error: e.message || e };}
    },

    renderQuickUI(container) {
      if (!container) return;
      container.innerHTML = `
        <form id="qc_form">
          <div><label>Quiz title</label><input id="qc_title" style="width:100%;padding:.4rem" required /></div>
          <div style="margin-top:.4rem"><label>Description</label><textarea id="qc_desc" style="width:100%;padding:.4rem"></textarea></div>
          <div style="margin-top:.4rem"><label>Time limit (minutes)</label><input id="qc_time" type="number" value="30" style="width:120px;padding:.4rem" /></div>
          <h4 style="margin-top:.6rem">Questions</h4>
          <div id="qc_qs"></div>
          <div style="margin-top:.4rem"><button type="button" id="qc_add">Add question</button></div>
          <div style="margin-top:.6rem"><button class="btn" type="submit">Create Quiz</button></div>
          <div id="qc_feedback" style="margin-top:.5rem"></div>
        </form>
      `;
      const qs = container.querySelector('#qc_qs');
      function addQ() {
        const wrapper = document.createElement('div');
        wrapper.style = 'padding:.5rem;border:1px solid #eee;margin-bottom:.6rem';
        wrapper.innerHTML = `
          <div><input class="q_text" placeholder="Question text" style="width:100%;padding:.3rem" /></div>
          <div style="margin-top:.3rem">
            <select class="q_type">
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short answer</option>
            </select>
          </div>
          <div style="margin-top:.3rem"><textarea class="q_options" placeholder='{"A":"Option 1","B":"Option 2"}' style="width:100%;height:60px"></textarea></div>
          <div style="margin-top:.3rem">
            <input class="q_correct" placeholder="Correct answer (e.g. B or true)" />
            <input class="q_marks" type="number" value="1" style="width:80px;margin-left:.6rem" />
            <button type="button" class="q_remove" style="margin-left:.6rem">Remove</button>
          </div>
        `;
        wrapper.querySelector('.q_remove').addEventListener('click', ()=>wrapper.remove());
        qs.appendChild(wrapper);
      }
      addQ();
      container.querySelector('#qc_add').addEventListener('click', addQ);

      container.querySelector('#qc_form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = container.querySelector('#qc_title').value.trim();
        const desc = container.querySelector('#qc_desc').value.trim();
        const time = parseInt(container.querySelector('#qc_time').value,10) || 30;
        const qBlocks = Array.from(qs.querySelectorAll('div'));
        const questions = qBlocks.map((b) => {
          let opts = {};
          try { opts = JSON.parse(b.querySelector('.q_options').value || '{}'); } catch {}
          return {
            question_text: b.querySelector('.q_text').value || '',
            question_type: b.querySelector('.q_type').value,
            options: opts,
            correct_answer: b.querySelector('.q_correct').value || '',
            marks: parseInt(b.querySelector('.q_marks').value,10) || 1
          };
        });
        const total_marks = questions.reduce((s,q)=>s+(q.marks||1),0);
        const fb = container.querySelector('#qc_feedback');
        fb.textContent = 'Creating...';
        const resp = await QuizCreator.createQuizWithQuestions({ title, description: desc, time_limit_minutes: time, total_marks }, questions);
        if (resp.success) { fb.style.color='green'; fb.textContent = 'Quiz created'; e.target.reset(); qs.innerHTML=''; addQ(); }
        else { fb.style.color='red'; fb.textContent = 'Error: ' + (resp.error || 'unknown'); }
      });
    }
  };

  window.QuizCreator = QuizCreator;
})();
</script>
