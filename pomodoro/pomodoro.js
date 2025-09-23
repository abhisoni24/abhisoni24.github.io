class PomodoroTimer {
    constructor() {
        this.workTime = 25 * 60; // 25 minutes in seconds
        this.breakTime = 5 * 60; // 5 minutes in seconds
        this.longBreakTime = 15 * 60; // 15 minutes in seconds
        this.currentTime = this.workTime;
        this.isRunning = false;
        this.isWorkSession = true;
        this.sessionCount = 0;
        this.completedSessions = [];
        this.timer = null;
        
        this.initializeElements();
        this.loadFromStorage();
        this.bindEvents();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.timeDisplay = document.getElementById('timeDisplay');
        this.sessionType = document.getElementById('sessionType');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.workTimeInput = document.getElementById('workTime');
        this.breakTimeInput = document.getElementById('breakTime');
        this.longBreakTimeInput = document.getElementById('longBreakTime');
        this.sessionCountDisplay = document.getElementById('sessionCount');
        this.viewSummaryBtn = document.getElementById('viewSummaryBtn');
        this.summaryModal = document.getElementById('summaryModal');
        this.closeModal = document.getElementById('closeModal');
        this.summaryContent = document.getElementById('summaryContent');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.viewSummaryBtn.addEventListener('click', () => this.showSummary());
        this.closeModal.addEventListener('click', () => this.hideSummary());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        this.workTimeInput.addEventListener('change', () => this.updateSettings());
        this.breakTimeInput.addEventListener('change', () => this.updateSettings());
        this.longBreakTimeInput.addEventListener('change', () => this.updateSettings());
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.summaryModal) {
                this.hideSummary();
            }
        });
    }
    
    start() {
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.timer = setInterval(() => {
            this.currentTime--;
            this.updateDisplay();
            
            if (this.currentTime <= 0) {
                this.sessionComplete();
            }
        }, 1000);
    }
    
    pause() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.timer);
    }
    
    reset() {
        this.pause();
        this.currentTime = this.isWorkSession ? this.workTime : this.breakTime;
        this.updateDisplay();
    }
    
    sessionComplete() {
        this.pause();
        
        // Record completed session
        const session = {
            type: this.isWorkSession ? 'Work' : 'Break',
            duration: this.isWorkSession ? this.workTime : (this.sessionCount % 4 === 0 ? this.longBreakTime : this.breakTime),
            completedAt: new Date().toLocaleString(),
            timestamp: Date.now()
        };
        
        this.completedSessions.push(session);
        
        if (this.isWorkSession) {
            this.sessionCount++;
            this.sessionCountDisplay.textContent = this.sessionCount;
        }
        
        // Switch session type
        this.isWorkSession = !this.isWorkSession;
        
        // Determine next session duration
        if (this.isWorkSession) {
            this.currentTime = this.workTime;
        } else {
            // Long break every 4th work session
            this.currentTime = (this.sessionCount % 4 === 0) ? this.longBreakTime : this.breakTime;
        }
        
        this.updateDisplay();
        this.saveToStorage();
        
        // Show notification
        this.showNotification(`${session.type} session complete! Time for a ${this.isWorkSession ? 'work' : 'break'} session.`);
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.isWorkSession) {
            this.sessionType.textContent = 'Work Session';
        } else {
            const isLongBreak = this.sessionCount % 4 === 0 && this.sessionCount > 0;
            this.sessionType.textContent = isLongBreak ? 'Long Break' : 'Short Break';
        }
    }
    
    updateSettings() {
        if (!this.isRunning) {
            this.workTime = parseInt(this.workTimeInput.value) * 60;
            this.breakTime = parseInt(this.breakTimeInput.value) * 60;
            this.longBreakTime = parseInt(this.longBreakTimeInput.value) * 60;
            
            if (this.isWorkSession) {
                this.currentTime = this.workTime;
            } else {
                const isLongBreak = this.sessionCount % 4 === 0 && this.sessionCount > 0;
                this.currentTime = isLongBreak ? this.longBreakTime : this.breakTime;
            }
            
            this.updateDisplay();
            this.saveToStorage();
        }
    }
    
    showSummary() {
        if (this.completedSessions.length === 0) {
            this.summaryContent.innerHTML = '<p>No completed sessions yet. Start your first Pomodoro session!</p>';
        } else {
            let summaryHTML = `<div class="summary-stats">
                <h3>Today's Statistics</h3>
                <p><strong>Total Work Sessions:</strong> ${this.sessionCount}</p>
                <p><strong>Total Time Worked:</strong> ${Math.floor(this.sessionCount * this.workTime / 3600)} hours ${Math.floor((this.sessionCount * this.workTime % 3600) / 60)} minutes</p>
            </div><hr style="margin: 20px 0; border-color: #444;"><h3>Recent Sessions</h3>`;
            
            // Show last 10 sessions
            const recentSessions = this.completedSessions.slice(-10).reverse();
            recentSessions.forEach(session => {
                summaryHTML += `
                    <div class="session-item">
                        <h4>${session.type} Session</h4>
                        <p>Duration: ${Math.floor(session.duration / 60)} minutes</p>
                        <p>Completed: ${session.completedAt}</p>
                    </div>
                `;
            });
        }
        
        this.summaryContent.innerHTML = summaryHTML;
        this.summaryModal.style.display = 'block';
    }
    
    hideSummary() {
        this.summaryModal.style.display = 'none';
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all session history?')) {
            this.completedSessions = [];
            this.sessionCount = 0;
            this.sessionCountDisplay.textContent = '0';
            this.saveToStorage();
            this.hideSummary();
        }
    }
    
    showNotification(message) {
        // Simple alert for now - could be enhanced with custom notifications
        alert(message);
    }
    
    saveToStorage() {
        const data = {
            sessionCount: this.sessionCount,
            completedSessions: this.completedSessions,
            workTime: this.workTime,
            breakTime: this.breakTime,
            longBreakTime: this.longBreakTime
        };
        localStorage.setItem('pomodoroData', JSON.stringify(data));
    }
    
    loadFromStorage() {
        const data = localStorage.getItem('pomodoroData');
        if (data) {
            const parsed = JSON.parse(data);
            this.sessionCount = parsed.sessionCount || 0;
            this.completedSessions = parsed.completedSessions || [];
            this.workTime = parsed.workTime || (25 * 60);
            this.breakTime = parsed.breakTime || (5 * 60);
            this.longBreakTime = parsed.longBreakTime || (15 * 60);
            
            this.sessionCountDisplay.textContent = this.sessionCount;
            this.workTimeInput.value = this.workTime / 60;
            this.breakTimeInput.value = this.breakTime / 60;
            this.longBreakTimeInput.value = this.longBreakTime / 60;
            
            this.currentTime = this.workTime;
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});