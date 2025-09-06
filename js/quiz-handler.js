<!-- js/quiz-handler.js -->
<script>
(() => {
  window.startQuiz = async function(quizId){
    try {
      if (!window.authManager || !window.authManager.isStudent()) { alert('Only students can take quizzes'); return; }
      const { data: quiz, error } = await window.db.getQuiz(quizId);
      if (error || !quiz) { alert('Unable to load quiz'); return; }

      // modal container
      const overlay = document.createElement('div');
      overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999';
      const box = document.createElement('div');
      box.style = 'background:#fff;color:#111;padding:1rem;border-radius:8px;width:90%;max-width:900px;max-height:90%;overflow:auto';
      box.innerHTML = <h2>${quiz.title}</h2><p>${quiz.description||''}</p><div id="q_box"></div><div style="margin-top:.6rem"><button id="submitQuiz">Submit</button> <button id="closeQuiz">Close</button></div>;
      overlay.appendChild(box); document.body.appendChild(overlay);

      const qBox = box.querySelector('#q_box');
      (quiz.quiz_questions||[]).forEach((q,idx) => {
        const qDiv = document.createElement('div');
        qDiv.style='margin-bottom:1rem;border-bottom:1px solid #eee;padding-bottom:.6rem';
        qDiv.innerHTML = <div><strong>Q${idx+1}.</strong> ${q.question_text}</div><div class="opts"></div>;
        const opts = qDiv.querySelector('.opts');
        if (q.question_type === 'multiple_choice') {
          const options = q.options || {};
          Object.keys(options).forEach(key => {
            opts.innerHTML += <label style="display:block"><input name="q${idx}" type="radio" value="${key}" /> ${key}. ${options[key]}</label>;
          });
        } else if (q.question_type === 'true_false') {
          opts.innerHTML += <label><input name="q${idx}" type="radio" value="true" /> True</label><label style="margin-left:.6rem"><input name="q${idx}" type="radio" value="false" /> False</label>;
        } else {
          opts.innerHTML += <textarea name="q${idx}" rows="2" style="width:100%"></textarea>;
        }
        qBox.appendChild(qDiv);
      });

      box.querySelector('#closeQuiz').addEventListener('click', ()=>overlay.remove());
      box.querySelector('#submitQuiz').addEventListener('click', async () => {
        let score = 0;
        const answers = {};
        const questions = quiz.quiz_questions || [];
        for (let i=0;i<questions.length;i++){
          const q = questions[i];
          if (q.question_type === 'short_answer') {
            const val = (qBox.querySelector([name="q${i}"]).value || '').trim();
            answers[q.id] = val;
          } else {
            const sel = qBox.querySelector([name="q${i}"]:checked);
            const val = sel ? sel.value : null;
            answers[q.id] = val;
            if (val !== null && String(val) === String(q.correct_answer)) score += (q.marks||1);
          }
        }
        const total_marks = quiz.total_marks || questions.reduce((s,q)=>s+(q.marks||1),0);
        const percentage = Math.round((score/total_marks)*10000)/100;
        const attempt = {
          quiz_id: quiz.id,
          student_id: window.authManager.currentUser.id,
          answers,
          score,
          total_marks,
          percentage,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          is_completed: true
        };
        const { data, error: subErr } = await window.db.submitQuizAttempt(attempt);
        if (subErr) { alert('Submit failed: ' + (subErr.message||JSON.stringify(subErr))); }
        else { alert(Submitted: ${score}/${total_marks} (${percentage}%)); overlay.remove(); }
      });

    } catch (e) {
      console.error(e); alert('Error starting quiz');
    }
  }
})();
</script>
