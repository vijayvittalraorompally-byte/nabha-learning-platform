// Quiz handling functionality
class QuizHandler {
    constructor() {
        this.currentQuiz = null;
        this.startTime = null;
        this.answers = {};
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.setupQuizModal();
    }

    setupQuizModal() {
        // Create quiz modal if it doesn't exist
        if (!document.getElementById('quizModal')) {
            const modal = document.createElement('div');
            modal.id = 'quizModal';
            modal.className = 'modal quiz-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="quizHandler.closeQuiz()">&times;</span>
                    <div id="quizContainer">
                        <!-- Quiz content will be loaded here -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    async startQuiz(quizId) {
        try {
            // Load quiz details
            const { data: quiz, error: quizError } = await supabaseClient
                .from('quizzes')
                .select('*')
                .eq('id', quizId)
                .single();

            if (quizError) throw quizError;

            // Load quiz questions
            const { data: questions, error: questionsError } = await supabaseClient
                .from('quiz_questions')
                .select('*')
                .eq('quiz_id', quizId)
                .order('sequence_order');

            if (questionsError) throw questionsError;

            this.currentQuiz = { ...quiz, questions };
            this.startTime = new Date();
            this.timeRemaining = quiz.time_limit_minutes * 60;
            this.answers = {};

            this.renderQuiz();
            this.startTimer();

            // Show modal
            const modal = document.getElementById('quizModal');
            modal.style.display = 'block';

            // Log quiz start
            realTimeManager.logActivity('quiz_started', {
                quiz_id: quizId,
                quiz_title: quiz.title
            });

        } catch (error) {
            console.error('Failed to start quiz:', error);
            alert('Failed to load quiz. Please try again.');
        }
    }

    renderQuiz() {
        const container = document.getElementById('quizContainer');
        if (!container || !this.currentQuiz) return;

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
        `;
    }

    renderQuestions() {
        return this.currentQuiz.questions.map((question, index) => {
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
            `;
        }).join('');
    }

    renderAnswerOptions(question, questionIndex) {
        switch (question.question_type) {
            case 'multiple_choice':
                return this.renderMultipleChoice(question, questionIndex);
            case 'true_false':
                return this.renderTrueFalse(question, questionIndex);
            case 'short_answer':
                return this.renderShortAnswer(question, questionIndex);
            default:
                return '<p>Unknown question type</p>';
        }
    }

    renderMultipleChoice(question, questionIndex) {
        const options = question.options || {};
        return Object.keys(options).map(key => `
            <label class="option-label">
                <input type="radio" 
                       name="question_${questionIndex}" 
                       value="${key}"
                       onchange="quizHandler.saveAnswer(${questionIndex}, '${key}')">
                <span class="option-text">${options[key]}</span>
            </label>
        `).join('');
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
        `;
    }

    renderShortAnswer(question, questionIndex) {
        return `
            <textarea 
                name="question_${questionIndex}"
                placeholder="Enter your answer here..."
                onchange="quizHandler.saveAnswer(${questionIndex}, this.value)"
                rows="3"></textarea>
        `;
    }

    saveAnswer(questionIndex, answer) {
        this.answers[questionIndex] = answer;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            
            const timerElement = document.getElementById('timeRemaining');
            if (timerElement) {
                timerElement.textContent = this.formatTime(this.timeRemaining);
                
                // Change color when time is running out
                if (this.timeRemaining <= 300) { // 5 minutes
                    timerElement.style.color = 'red';
                } else if (this.timeRemaining <= 600) { // 10 minutes
                    timerElement.style.color = 'orange';
                }
            }

            // Auto-submit when time runs out
            if (this.timeRemaining <= 0) {
                this.submitQuiz(true);
            }
        }, 1000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async submitQuiz(autoSubmit = false) {
        try {
            if (!autoSubmit && !confirm('Are you sure you want to submit your quiz?')) {
                return;
            }

            const endTime = new Date();
            const timeTaken = Math.floor((endTime - this.startTime) / 1000);

            // Calculate score
            const score = this## ⚡ Step 6: Create js/dashboard.js

```javascript
// Dashboard functionality
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.currentSection = 'overview';
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            this.currentUser = user;
            await this.loadUserProfile();
            await this.setupEventListeners();
            await this.loadInitialData();
            
            // Hide loading screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            window.location.href = 'login.html';
        }
    }

    async loadUserProfile() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            
            this.userProfile = data;
            this.updateProfileDisplay();
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    updateProfileDisplay() {
        const userName = document.getElementById('userName');
        const userGrade = document.getElementById('userGrade');
        const userSchool = document.getElementById('userSchool');

        if (userName) {
            userName.textContent = this.userProfile.name || 'User';
        }
        
        if (userGrade && this.userProfile.grade_level) {
            userGrade.textContent = `Grade ${this.userProfile.grade_level}`;
        }
        
        if (userSchool && this.userProfile.school_name) {
            userSchool.textContent = this.userProfile.school_name;
        }
    }

    setupEventListeners() {
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });

        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(button, tabName);
            });
        });

        // Search functionality
        const courseSearch = document.getElementById('courseSearch');
        if (courseSearch) {
            courseSearch.addEventListener('input', (e) => {
                this.searchCourses(e.target.value);
            });
        }

        // Filters
        this.setupFilters();
    }

    setupFilters() {
        const videoFilter = document.getElementById('videoFilter');
        if (videoFilter) {
            videoFilter.addEventListener('change', (e) => {
                this.filterVideos(e.target.value);
            });
        }

        const quizFilter = document.getElementById('quizFilter');
        if (quizFilter) {
            quizFilter.addEventListener('change', (e) => {
                this.filterQuizzes(e.target.value);
            });
        }

        const gradeFilter = document.getElementById('gradeFilter');
        if (gradeFilter) {
            gradeFilter.addEventListener('change', (e) => {
                this.filterStudents();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterStudents();
            });
        }
    }

    switchSection(sectionName) {
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionName) {
                link.classList.add('active');
            }
        });

        // Update content sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionName) {
                section.classList.add('active');
            }
        });

        this.currentSection = sectionName;
        this.loadSectionData(sectionName);

        // Log activity
        realTimeManager.logActivity('section_viewed', { section: sectionName });
    }

    switchTab(button, tabName) {
        // Update tab buttons
        const tabButtons = button.parentNode.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update tab content
        const tabContents = document.querySelectorAll('.analytics-tab');
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName) {
                content.classList.add('active');
            }
        });

        this.loadTabData(tabName);
    }

    async loadInitialData() {
        if (this.userProfile.role === 'student') {
            await this.loadStudentData();
        } else {
            await this.loadTeacherData();
        }
    }

    async loadStudentData() {
        await Promise.all([
            this.loadCourses(),
            this.loadVideos(),
            this.loadQuizzes(),
            this.loadProgress(),
            this.loadNotifications()
        ]);
    }

    async loadTeacherData() {
        await Promise.all([
            this.loadTeacherStats(),
            this.loadStudents(),
            this.loadMyVideos(),
            this.loadMyQuizzes(),
            this.loadNotifications()
        ]);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'courses':
                await this.loadCourses();
                break;
            case 'videos':
                await this.loadVideos();
                break;
            case 'quizzes':
                await this.loadQuizzes();
                break;
            case 'progress':
                await this.loadProgress();
                break;
            case 'students':
                await this.loadStudents();
                break;
            case 'my-videos':
                await this.loadMyVideos();
                break;
            case 'my-quizzes':
                await this.loadMyQuizzes();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'overview':
                if (this.userProfile.role === 'teacher') {
                    await this.loadTeacherStats();
                }
                break;
        }
    }

    async loadCourses() {
        try {
            const { data: courses, error } = await supabaseClient
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Load progress for each course
            const { data: progress } = await supabaseClient
                .from('student_progress')
                .select('course_id, completion_percentage')
                .eq('student_id', this.currentUser.id);

            const progressMap = new Map();
            if (progress) {
                progress.forEach(p => {
                    progressMap.set(p.course_id, p.completion_percentage || 0);
                });
            }

            this.renderCourses(courses, progressMap);
            this.updateCourseStats(courses, progress);
        } catch (error) {
            console.error('Failed to load courses:', error);
        }
    }

    renderCourses(courses, progressMap) {
        const courseGrid = document.getElementById('courseGrid');
        if (!courseGrid) return;

        courseGrid.innerHTML = courses.map(course => `
            <div class="course-card" onclick="openCourse('${course.id}')">
                <div class="course-thumbnail">
                    📚
                </div>
                <div class="course-info">
                    <h3 class="course-title">${course.title}</h3>
                    <p class="course-description">${course.description || 'No description available'}</p>
                    <div class="course-meta">
                        <span class="course-grade">Grade ${course.grade_level}</span>
                        <span class="course-lessons">${course.lesson_count || 0} lessons</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressMap.get(course.id) || 0}%"></div>
                    </div>
                    <div class="progress-text">${progressMap.get(course.id) || 0}% Complete</div>
                </div>
            </div>
        `).join('');
    }

    updateCourseStats(courses, progress) {
        const totalCourses = document.getElementById('totalCourses');
        const completedCourses = document.getElementById('completedCourses');
        const inProgressCourses = document.getElementById('inProgressCourses');

        if (totalCourses) totalCourses.textContent = courses.length;
        
        if (progress) {
            const completed = progress.filter(p => p.completion_percentage >= 100).length;
            const inProgress = progress.filter(p => p.completion_percentage > 0 && p.completion_percentage < 100).length;
            
            if (completedCourses) completedCourses.textContent = completed;
            if (inProgressCourses) inProgressCourses.textContent = inProgress;
        }
    }

    async loadVideos() {
        try {
            const { data: videos, error } = await supabaseClient
                .from('videos')
                .select('*, courses(title)')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Load video views for student
            let videoViews = [];
            if (this.userProfile.role === 'student') {
                const { data: views } = await supabaseClient
                    .from('video_views')
                    .select('video_id, watch_duration_seconds, completed')
                    .eq('student_id', this.currentUser.id);
                videoViews = views || [];
            }

            this.renderVideos(videos, videoViews);
        } catch (error) {
            console.error('Failed to load videos:', error);
        }
    }

    renderVideos(videos, videoViews = []) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        const viewsMap = new Map();
        videoViews.forEach(view => {
            viewsMap.set(view.video_id, view);
        });

        videoGrid.innerHTML = videos.map(video => {
            const view = viewsMap.get(video.id);
            const isWatched = view && view.completed;
            const watchProgress = view ? Math.round((view.watch_duration_seconds / (video.duration_seconds || 1)) * 100) : 0;

            return `
                <div class="video-card" onclick="playVideo('${video.id}')">
                    <div class="video-thumbnail">
                        ${video.thumbnail_url ? 
                            `<img src="${video.thumbnail_url}" alt="${video.title}">` : 
                            '<div style="background: #667eea; display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 2rem;">🎥</div>'
                        }
                        <div class="play-button">▶</div>
                        ${video.duration_seconds ? `<div class="video-duration">${this.formatDuration(video.duration_seconds)}</div>` : ''}
                        ${isWatched ? '<div class="watched-indicator">✓</div>' : ''}
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-description">${video.description || 'No description'}</p>
                        <div class="video-meta">
                            <div class="video-views">
                                <span>👁</span>
                                <span>${video.view_count || 0} views</span>
                            </div>
                            <div class="video-course">${video.courses?.title || 'General'}</div>
                        </div>
                        ${view ? `
                            <div class="video-progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${watchProgress}%"></div>
                                </div>
                                <span>${watchProgress}% watched</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadQuizzes() {
        try {
            const { data: quizzes, error } = await supabaseClient
                .from('quizzes')
                .select('*, courses(title)')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Load quiz attempts for student
            let quizAttempts = [];
            if (this.userProfile.role === 'student') {
                const { data: attempts } = await supabaseClient
                    .from('quiz_attempts')
                    .select('quiz_id, score, total_marks, is_completed')
                    .eq('student_id', this.currentUser.id);
                quizAttempts = attempts || [];
            }

            this.renderQuizzes(quizzes, quizAttempts);
        } catch (error) {
            console.error('Failed to load quizzes:', error);
        }
    }

    renderQuizzes(quizzes, quizAttempts = []) {
        const quizGrid = document.getElementById('quizGrid');
        if (!quizGrid) return;

        const attemptsMap = new Map();
        quizAttempts.forEach(attempt => {
            attemptsMap.set(attempt.quiz_id, attempt);
        });

        quizGrid.innerHTML = quizzes.map(quiz => {
            const attempt = attemptsMap.get(quiz.id);
            const isCompleted = attempt && attempt.is_completed;
            const score = attempt ? `${attempt.score}/${attempt.total_marks}` : 'Not attempted';

            return `
                <div class="quiz-card" onclick="startQuiz('${quiz.id}')">
                    <div class="quiz-header">
                        <div class="quiz-icon">📝</div>
                        <div class="quiz-info">
                            <h3>${quiz.title}</h3>
                            <div class="quiz-meta">
                                <span>${quiz.courses?.title || 'General'}</span> • 
                                <span>${quiz.time_limit_minutes} min</span>
                            </div>
                        </div>
                    </div>
                    <p class="quiz-description">${quiz.description || 'No description available'}</p>
                    <div class="quiz-stats">
                        <div class="quiz-stat">
                            <span class="quiz-stat-value">${quiz.total_marks}</span>
                            <span class="quiz-stat-label">Total Marks</span>
                        </div>
                        <div class="quiz-stat">
                            <span class="quiz-stat-value">${score}</span>
                            <span class="quiz-stat-label">Your Score</span>
                        </div>
                        <div class="quiz-stat">
                            <span class="quiz-stat-value">${isCompleted ? 'Completed' : 'Pending'}</span>
                            <span class="quiz-stat-label">Status</span>
                        </div>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn ${isCompleted ? 'secondary' : 'primary'}" onclick="startQuiz('${quiz.id}')">
                            ${isCompleted ? 'Retake Quiz' : 'Start Quiz'}
                        </button>
                        ${isCompleted ? `
                            <button class="btn secondary" onclick="viewQuizResults('${quiz.id}')">
                                View Results
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadProgress() {
        try {
            // Load overall progress
            const { data: progress } = await supabaseClient
                .from('student_progress')
                .select('completion_percentage, time_spent')
                .eq('student_id', this.currentUser.id);

            if (progress && progress.length > 0) {
                const avgCompletion = Math.round(
                    progress.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / progress.length
                );
                
                const overallProgress = document.getElementById('overallProgress');
                const overallPercentage = document.getElementById('overallPercentage');
                
                if (overallProgress) overallProgress.style.width = `${avgCompletion}%`;
                if (overallPercentage) overallPercentage.textContent = `${avgCompletion}%`;
            }

            // Load recent activities
            await this.loadRecentActivities();
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    async loadRecentActivities() {
        try {
            const { data: activities } = await supabaseClient
                .from('activity_log')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('timestamp', { ascending: false })
                .limit(5);

            const recentActivities = document.getElementById('recentActivities');
            if (recentActivities && activities) {
                recentActivities.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon">${this.getActivityIcon(activity.activity_type)}</div>
                        <div class="activity-details">
                            <p>${this.getActivityDescription(activity)}</p>
                            <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Failed to load recent activities:', error);
        }
    }

    async loadTeacherStats() {
        try {
            // Load students count
            const { count: studentCount } = await supabaseClient
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');

            // Load videos count
            const { count: videoCount } = await supabaseClient
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', this.currentUser.id);

            // Load quizzes count
            const { count: quizCount } = await supabaseClient
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', this.currentUser.id);

            // Update stats display
            const totalStudents = document.getElementById('totalStudents');
            const totalVideos = document.getElementById('totalVideos');
            const totalQuizzes = document.getElementById('totalQuizzes');

            if (totalStudents) totalStudents.textContent = studentCount || 0;
            if (totalVideos) totalVideos.textContent = videoCount || 0;
            if (totalQuizzes) totalQuizzes.textContent = quizCount || 0;

            // Load recent teacher actions
            await this.loadRecentTeacherActions();
        } catch (error) {
            console.error('Failed to load teacher stats:', error);
        }
    }

    async loadStudents() {
        try {
            const { data: students, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('role', 'student')
                .order('last_active', { ascending: false });

            if (error) throw error;

            this.renderStudents(students);
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    }

    renderStudents(students) {
        const studentsGrid = document.getElementById('studentsGrid');
        if (!studentsGrid) return;

        studentsGrid.innerHTML = students.map(student => {
            const isOnline = student.is_online && this.isRecentlyActive(student.last_active);
            const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'S';

            return `
                <div class="student-card" onclick="viewStudentDetails('${student.id}')">
                    <div class="student-header">
                        <div class="student-avatar">${initials}</div>
                        <div class="student-info">
                            <h4>${student.name || 'Student'}</h4>
                            <p class="student-grade">Grade ${student.grade_level || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="student-status ${isOnline ? 'online' : 'offline'}">
                        <span class="status-dot"></span>
                        <span>${isOnline ? 'Online' : 'Offline'}</span>
                        <small>${this.formatTimeAgo(student.last_active)}</small>
                    </div>
                    <div class="student-progress">
                        <h5>Learning Progress</h5>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 65%"></div>
                        </div>
                        <div class="progress-stats">
                            <span>65% Complete</span>
                            <span>12 lessons</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utility functions
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    isRecentlyActive(timestamp) {
        const now = new Date();
        const lastActive = new Date(timestamp);
        const diffInMinutes = (now - lastActive) / (1000 * 60);
        return diffInMinutes < 5; // Consider active if last seen within 5 minutes
    }

    getActivityIcon(activityType) {
        const icons = {
            'section_viewed': '👀',
            'video_watched': '🎥',
            'quiz_completed': '📝',
            'course_started': '📚',
            'lesson_completed': '✅',
            'login': '🚪'
        };
        return icons[activityType] || '📋';
    }

    getActivityDescription(activity) {
        const descriptions = {
            'section_viewed': 'Viewed a section',
            'video_watched': 'Watched a video',
            'quiz_completed': 'Completed a quiz',
            'course_started': 'Started a new course',
            'lesson_completed': 'Completed a lesson',
            'login': 'Logged in'
        };
        return descriptions[activity.activity_type] || 'Activity recorded';
    }

    // Search and filter functions
    searchCourses(query) {
        const courseCards = document.querySelectorAll('.course-card');
        courseCards.forEach(card => {
            const title = card.querySelector('.course-title').textContent.toLowerCase();
            const description = card.querySelector('.course-description').textContent.toLowerCase();
            const shouldShow = title.includes(query.toLowerCase()) || description.includes(query.toLowerCase());
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }

    filterVideos(filterType) {
        // Implementation for video filtering
        console.log('Filtering videos by:', filterType);
    }

    filterQuizzes(filterType) {
        // Implementation for quiz filtering
        console.log('Filtering quizzes by:', filterType);
    }

    filterStudents() {
        // Implementation for student filtering
        console.log('Filtering students');
    }
}

// Global functions
window.openCourse = function(courseId) {
    realTimeManager.logActivity('course_opened', { course_id: courseId });
    // Navigate to course page
    window.location.href = `course.html?id=${courseId}`;
};# Enhanced Digital Learning Platform - Complete Implementation Guide

## 🔄 Updated Database Schema (Supabase)

First, update your Supabase database with these additional tables:

```sql
-- Enhanced Users table (add columns to existing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Videos table for teacher uploads
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_punjabi TEXT,
  description TEXT,
  description_punjabi TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  teacher_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  duration_seconds INTEGER,
  upload_date TIMESTAMP DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_punjabi TEXT,
  description TEXT,
  description_punjabi TEXT,
  teacher_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  time_limit_minutes INTEGER DEFAULT 30,
  total_marks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Quiz Questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_punjabi TEXT,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')) DEFAULT 'multiple_choice',
  options JSONB, -- For multiple choice options
  correct_answer TEXT NOT NULL,
  marks INTEGER DEFAULT 1,
  sequence_order INTEGER
);

-- Quiz Attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  quiz_id UUID REFERENCES quizzes(id),
  answers JSONB NOT NULL,
  score INTEGER DEFAULT 0,
  total_marks INTEGER,
  time_taken_seconds INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false
);

-- Video Views tracking
CREATE TABLE IF NOT EXISTS video_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  video_id UUID REFERENCES videos(id),
  watch_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_position_seconds INTEGER DEFAULT 0,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, video_id)
);

-- Real-time Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample quiz data
INSERT INTO quizzes (title, title_punjabi, description, teacher_id, course_id, time_limit_minutes, total_marks) VALUES
('Computer Basics Quiz', 'ਕੰਪਿਊਟਰ ਬੇਸਿਕ ਕੁਇਜ਼', 'Test your basic computer knowledge', 
 (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
 (SELECT id FROM courses LIMIT 1),
 15, 10);

-- Enable Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can manage their videos" ON videos
  FOR ALL USING (teacher_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Students can view approved videos" ON videos
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Teachers can manage their quizzes" ON quizzes
  FOR ALL USING (teacher_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Students can view active quizzes" ON quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Students own their quiz attempts" ON quiz_attempts
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Students own their video views" ON video_views
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Users own their activity" ON activity_log
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users see their notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
