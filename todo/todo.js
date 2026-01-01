// To-Do App with localStorage
class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.editingTaskId = null;
        
        this.initializeElements();
        this.loadTasks();
        this.bindEvents();
        this.render();
    }

    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.activeTasksList = document.getElementById('activeTasksList');
        this.completedTasksList = document.getElementById('completedTasksList');
        this.totalCountEl = document.getElementById('totalCount');
        this.completedCountEl = document.getElementById('completedCount');
        this.activeCountEl = document.getElementById('activeCount');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
    }

    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTask();
            }
        });
        
        // Auto-expand input field
        this.taskInput.addEventListener('input', () => {
            this.autoExpandTextarea(this.taskInput);
        });
        
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    }

    // Load tasks from localStorage
    loadTasks() {
        const saved = localStorage.getItem('todoTasks');
        if (saved) {
            this.tasks = JSON.parse(saved);
        } else {
            this.tasks = [];
        }
    }

    // Auto-expand textarea to fit content
    autoExpandTextarea(textarea) {
        // Reset height to 0 to measure the true scrollHeight
        textarea.style.height = '0px';
        // Get the actual content height
        const scrollHeight = textarea.scrollHeight;
        // Set height to content height, capped at 300px
        textarea.style.height = Math.min(scrollHeight, 300) + 'px';
    }

    // Save tasks to localStorage
    saveTasks() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }

    // Add a new task
    addTask() {
        const text = this.taskInput.value.trim();
        
        if (!text) {
            alert('Please enter a task!');
            return;
        }

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toLocaleString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.taskInput.value = '';
        this.autoExpandTextarea(this.taskInput);
        this.taskInput.focus();
        this.render();
    }

    // Toggle task completion
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
        }
    }

    // Delete a task
    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.render();
        }
    }

    // Start editing a task
    startEditTask(id) {
        this.editingTaskId = id;
        this.render();
        
        // Scroll the task into view after rendering
        setTimeout(() => {
            const editItem = this.tasksList.querySelector(`[data-edit-id="${id}"]`);
            if (editItem) {
                editItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 0);
    }

    // Save edited task
    saveEditTask(id, newText) {
        const text = newText.trim();
        
        if (!text) {
            alert('Task cannot be empty!');
            return;
        }

        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.text = text;
            this.saveTasks();
            this.editingTaskId = null;
            this.render();
        }
    }

    // Cancel editing
    cancelEdit() {
        this.editingTaskId = null;
        this.render();
    }

    // Clear completed tasks
    clearCompleted() {
        if (this.tasks.some(t => t.completed)) {
            if (confirm('Are you sure you want to clear all completed tasks?')) {
                this.tasks = this.tasks.filter(t => !t.completed);
                this.saveTasks();
                this.render();
            }
        } else {
            alert('No completed tasks to clear!');
        }
    }

    // Clear all tasks
    clearAll() {
        if (this.tasks.length > 0) {
            if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone!')) {
                this.tasks = [];
                this.saveTasks();
                this.editingTaskId = null;
                this.render();
            }
        } else {
            alert('No tasks to clear!');
        }
    }

    // Get filtered tasks
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    // Update statistics
    updateStats() {
        const completed = this.tasks.filter(t => t.completed).length;
        const active = this.tasks.filter(t => !t.completed).length;
        
        this.totalCountEl.textContent = this.tasks.length;
        this.completedCountEl.textContent = completed;
        this.activeCountEl.textContent = active;
    }

    // Render the task list
    render() {
        const activeTasks = this.tasks.filter(t => !t.completed);
        const completedTasks = this.tasks.filter(t => t.completed);
        
        // Render active tasks
        if (activeTasks.length === 0) {
            this.activeTasksList.innerHTML = '<p class="empty-message">No active tasks! <i class="fa-solid fa-check-circle"></i></p>';
        } else {
            this.activeTasksList.innerHTML = activeTasks.map(task => {
                if (this.editingTaskId === task.id) {
                    return this.renderEditForm(task);
                }
                return this.renderTaskItem(task);
            }).join('');
            this.bindTaskEvents(this.activeTasksList);
        }
        
        // Render completed tasks
        if (completedTasks.length === 0) {
            this.completedTasksList.innerHTML = '<p class="empty-message">No completed tasks yet! <i class="fa-solid fa-hourglass-end"></i></p>';
        } else {
            this.completedTasksList.innerHTML = completedTasks.map(task => {
                if (this.editingTaskId === task.id) {
                    return this.renderEditForm(task);
                }
                return this.renderTaskItem(task);
            }).join('');
            this.bindTaskEvents(this.completedTasksList);
        }

        this.updateStats();
    }

    // Bind events to task elements
    bindTaskEvents(container) {
        // Bind checkbox events
        container.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleTask(parseInt(e.target.dataset.id));
            });
        });

        // Bind edit button events
        container.querySelectorAll('.task-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = parseInt(e.currentTarget.dataset.id);
                this.startEditTask(id);
            });
        });

        // Bind delete button events
        container.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = parseInt(e.currentTarget.dataset.id);
                this.deleteTask(id);
            });
        });

        // Bind edit form events
        container.querySelectorAll('.edit-form').forEach(form => {
            const saveBtn = form.querySelector('.edit-save-btn');
            const cancelBtn = form.querySelector('.edit-cancel-btn');
            const input = form.querySelector('.edit-input');
            const taskId = parseInt(saveBtn.dataset.id);

            saveBtn.addEventListener('click', () => {
                this.saveEditTask(taskId, input.value);
            });

            cancelBtn.addEventListener('click', () => {
                this.cancelEdit();
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.saveEditTask(taskId, input.value);
                }
            });
            
            // Auto-expand edit input
            input.addEventListener('input', () => {
                this.autoExpandTextarea(input);
            });

            // Focus the input for better UX
            input.focus();
            input.select();
            
            // Auto-expand on load
            this.autoExpandTextarea(input);
        });
    }

    // Render individual task item
    renderTaskItem(task) {
        const completedClass = task.completed ? 'completed' : '';
        return `
            <div class="task-item ${completedClass}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    data-id="${task.id}"
                    ${task.completed ? 'checked' : ''}
                >
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="task-edit-btn" data-id="${task.id}" title="Edit task">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="task-delete-btn" data-id="${task.id}" title="Delete task">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Render edit form
    renderEditForm(task) {
        return `
            <div class="task-item" data-edit-id="${task.id}">
                <form class="edit-form" onsubmit="return false;">
                    <textarea 
                        class="edit-input" 
                        placeholder="Edit task..."
                        rows="1"
                    >${this.escapeHtml(task.text)}</textarea>
                    <button type="button" class="edit-save-btn" data-id="${task.id}">
                        <i class="fa-solid fa-check"></i> Save
                    </button>
                    <button type="button" class="edit-cancel-btn">
                        <i class="fa-solid fa-xmark"></i> Cancel
                    </button>
                </form>
            </div>
        `;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
