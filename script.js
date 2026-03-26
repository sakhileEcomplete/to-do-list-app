 let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    let filter = 'all';

    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const footer = document.getElementById('footer');
    const countLabel = document.getElementById('count-label');
    const clearBtn = document.getElementById('clear-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');

    function save() {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function render() {
      const filtered = tasks.filter(t => {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      });

      taskList.innerHTML = '';

      if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-state';
        empty.textContent = filter === 'done'
          ? 'No completed tasks yet.'
          : filter === 'active'
          ? 'No active tasks — great job!'
          : 'No tasks yet. Add one above!';
        taskList.appendChild(empty);
      } else {
        filtered.forEach(task => {
          const li = document.createElement('li');
          li.className = 'task-item' + (task.done ? ' done' : '');

          const check = document.createElement('div');
          check.className = 'task-check' + (task.done ? ' checked' : '');
          check.addEventListener('click', () => toggle(task.id));

          const text = document.createElement('span');
          text.className = 'task-text';
          text.textContent = task.text;

          const del = document.createElement('button');
          del.className = 'delete-btn';
          del.textContent = '✕';
          del.title = 'Delete task';
          del.addEventListener('click', () => remove(task.id));

          li.appendChild(check);
          li.appendChild(text);
          li.appendChild(del);
          taskList.appendChild(li);
        });
      }

      const activeCount = tasks.filter(t => !t.done).length;
      const doneCount = tasks.filter(t => t.done).length;

      if (tasks.length > 0) {
        footer.style.display = 'flex';
        countLabel.textContent = activeCount === 1 ? '1 task left' : `${activeCount} tasks left`;
        clearBtn.style.visibility = doneCount > 0 ? 'visible' : 'hidden';
      } else {
        footer.style.display = 'none';
      }
    }

    function addTask() {
      const text = taskInput.value.trim();
      if (!text) return;
      tasks.unshift({ id: Date.now(), text, done: false });
      taskInput.value = '';
      save();
      render();
    }

    function toggle(id) {
      tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
      save();
      render();
    }

    function remove(id) {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }

    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });

    clearBtn.addEventListener('click', () => {
      tasks = tasks.filter(t => !t.done);
      save();
      render();
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });

    render();