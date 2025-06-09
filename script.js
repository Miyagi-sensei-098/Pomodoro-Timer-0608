document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const timeDisplay = document.querySelector('.time-display');
    const modeDisplay = document.querySelector('.mode-display');
    const progressBar = document.querySelector('.progress-bar');
    const startStopBtn = document.getElementById('startStopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const workMinutesInput = document.getElementById('workMinutes');
    const workSecondsInput = document.getElementById('workSeconds');
    const breakMinutesInput = document.getElementById('breakMinutes');
    const breakSecondsInput = document.getElementById('breakSeconds');
    const container = document.querySelector('.container');
    const workModeBtn = document.getElementById('workModeBtn');
    const breakModeBtn = document.getElementById('breakModeBtn');
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    
    // タスク配列
    let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
    
    // タスクをローカルストレージに保存
    function saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }
    
    // タスクを追加
    function addTask(text) {
        if (text.trim() === '') return;
        
        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.unshift(task);
        saveTasks();
        renderTasks();
        taskInput.value = '';
    }
    
    // タスクの完了/未完了を切り替え
    function toggleTask(id) {
        tasks = tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        renderTasks();
    }
    
    // タスクを削除
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }
    
    // タスクをレンダリング
    function renderTasks() {
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'タスクがありません';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#757575';
            emptyMessage.style.padding = '20px';
            taskList.appendChild(emptyMessage);
            return;
        }
        
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const completeBtn = document.createElement('button');
            completeBtn.className = 'task-btn complete-btn';
            completeBtn.innerHTML = '✓';
            completeBtn.title = '完了';
            completeBtn.onclick = () => toggleTask(task.id);
            
            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = task.text;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'task-btn delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = '削除';
            deleteBtn.onclick = () => deleteTask(task.id);
            
            const taskActions = document.createElement('div');
            taskActions.className = 'task-actions';
            taskActions.appendChild(completeBtn);
            taskActions.appendChild(deleteBtn);
            
            li.appendChild(completeBtn);
            li.appendChild(taskText);
            li.appendChild(taskActions);
            
            taskList.appendChild(li);
        });
    }
    
    // 統計情報をリセット
    function resetStatistics() {
        if (confirm('統計情報をリセットしますか？この操作は元に戻せません。')) {
            // 統計変数をリセット
            cycleCount = 0;
            totalWorkSeconds = 0;
            totalBreakSeconds = 0;
            
            // ローカルストレージから削除
            localStorage.removeItem('pomodoroCycleCount');
            localStorage.removeItem('pomodoroTotalWorkSeconds');
            localStorage.removeItem('pomodoroTotalBreakSeconds');
            
            // 表示を更新
            updateStats();
        }
    }
    
    // イベントリスナー
    addTaskBtn.addEventListener('click', () => addTask(taskInput.value));
    document.getElementById('resetStatsBtn').addEventListener('click', resetStatistics);
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask(taskInput.value);
        }
    });
    
    // 初期表示
    renderTasks();
    
    // アラーム音をロード
    const alarmSound = new Audio('https://arspark.jp/material/wp-content/uploads/2023/05/arsnd_00165b_sanshin2.mp3');
    alarmSound.preload = 'auto';
    alarmSound.volume = 0.5; // ボリュームを50%に設定
    let isAlarmPlaying = false;
    
    // アラーム音を再生する関数
    function playAlarmSound() {
        if (isAlarmPlaying) {
            // 既に再生中の場合は停止してから再生し直す
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }
        
        isAlarmPlaying = true;
        
        // 再生を試みる
        const playPromise = alarmSound.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('アラーム音の再生に失敗しました:', error);
                isAlarmPlaying = false;
            });
        }
        
        // 再生終了を検知
        alarmSound.onended = () => {
            isAlarmPlaying = false;
        };
    }
    
    // アラーム音を停止する関数
    function stopAlarmSound() {
        if (isAlarmPlaying) {
            alarmSound.pause();
            alarmSound.currentTime = 0;
            isAlarmPlaying = false;
        }
    }
    
    // 通知音を再生
    function playNotificationSound() {
        try {
            // アラーム音を再生（フルで1回再生）
            playAlarmSound();
            
        } catch (e) {
            console.error('通知音の再生中にエラーが発生しました:', e);
        }
    }
    
    // 変数の初期化
    let workTime = (parseInt(workMinutesInput.value) * 60) + parseInt(workSecondsInput.value); // 作業時間（秒）
    let breakTime = (parseInt(breakMinutesInput.value) * 60) + parseInt(breakSecondsInput.value); // 休憩時間（秒）
    let timeLeft = workTime; // 残り時間（秒）
    let timerId = null;
    let isRunning = false;
    let isWorkMode = true; // true: 作業モード, false: 休憩モード
    let totalTime = workTime; // 現在のモードの合計時間
    let progressInterval;
    let startTime;
    let endTime;
    
    // 統計情報の変数
    let cycleCount = parseInt(localStorage.getItem('pomodoroCycleCount')) || 0;
    let totalWorkSeconds = parseInt(localStorage.getItem('pomodoroTotalWorkSeconds')) || 0;
    let totalBreakSeconds = parseInt(localStorage.getItem('pomodoroTotalBreakSeconds')) || 0;
    let lastUpdateTime = null;
    let isFirstTick = true;
    
    // 時間を「MM:SS」形式に変換
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    
    // 表示を更新
    function updateDisplay() {
        timeDisplay.textContent = formatTime(timeLeft);
        
        // プログレスバーの更新
        const progress = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${progress}%`;
        
        // モードに応じたスタイルの適用
        updateModeButtons();
    }
    
    // モードボタンの更新
    function updateModeButtons() {
        if (isWorkMode) {
            workModeBtn.classList.add('active');
            breakModeBtn.classList.remove('active');
            container.classList.remove('break-mode');
            container.classList.add('work-mode');
            modeDisplay.textContent = '作業モード';
        } else {
            workModeBtn.classList.remove('active');
            breakModeBtn.classList.add('active');
            container.classList.remove('work-mode');
            container.classList.add('break-mode');
            modeDisplay.textContent = '休憩モード';
        }
    }
    
    // モードを切り替え
    function switchMode(forceWorkMode = null) {
        if (forceWorkMode !== null) {
            isWorkMode = forceWorkMode;
        } else {
            isWorkMode = !isWorkMode;
        }
        
        // ボタンの状態を更新
        updateModeButtons();
        
        // 時間を更新
        totalTime = isWorkMode ? workTime : breakTime;
        timeLeft = totalTime;
        updateDisplay();
        
        // 通知音は再生しない
    }
    
    // タイマーを開始/停止
    function toggleTimer() {
        if (isRunning) {
            // 一時停止時の処理
            clearInterval(timerId);
            isRunning = false;
            startStopBtn.textContent = '開始';
            
            // 統計情報を保存
            saveStats();
        } else {
            // 開始時の処理
            isRunning = true;
            isFirstTick = true;
            lastUpdateTime = Date.now();
            startStopBtn.textContent = '一時停止';
            timerId = setInterval(updateTimer, 1000);
        }
    }
    
    // タイマーを更新する関数
    function updateTimer() {
        const now = Date.now();
        
        // 前回の更新からの経過時間を計算（初回は1秒とみなす）
        const elapsedSeconds = isFirstTick ? 1 : Math.floor((now - lastUpdateTime) / 1000);
        isFirstTick = false;
        lastUpdateTime = now;
        
        // 経過時間分を減算
        timeLeft = Math.max(0, timeLeft - elapsedSeconds);
        
        // 作業・休憩時間をカウント
        if (isWorkMode) {
            totalWorkSeconds += elapsedSeconds;
        } else {
            totalBreakSeconds += elapsedSeconds;
        }
        
        // 統計情報を更新
        updateStats();
        
        // 時間切れの処理
        if (timeLeft <= 0) {
            clearInterval(timerId);
            
            // モード切り替え時にセット数をカウント
            if (isWorkMode) {
                cycleCount++;
                localStorage.setItem('pomodoroCycleCount', cycleCount);
            }
            
            // モードを切り替え
            switchMode();
            
            // 自動的に次のカウントダウンを開始
            isRunning = true;
            isFirstTick = true;
            lastUpdateTime = Date.now();
            startStopBtn.textContent = '一時停止';
            timerId = setInterval(updateTimer, 1000);
            return;
        }
        
        updateDisplay();
    }
    
    // プログレスバーをアニメーションで更新
    function updateProgressBar() {
        if (!isRunning) return;
        
        const now = Date.now();
        const elapsed = now - startTime;
        const duration = (endTime - startTime) / 1000;
        const remaining = Math.ceil((endTime - now) / 1000);
        
        if (remaining <= 0) {
            timeLeft = 0;
            updateDisplay();
            return;
        }
        
        timeLeft = remaining;
        updateDisplay();
        
        progressInterval = requestAnimationFrame(updateProgressBar);
    }
    
    // 統計情報を更新して表示
    function updateStats() {
        // ローカルストレージに保存
        saveStats();
        
        // 表示を更新
        document.getElementById('cycleCount').textContent = cycleCount;
        document.getElementById('totalWorkTime').textContent = formatTimeHHMMSS(totalWorkSeconds);
        document.getElementById('totalBreakTime').textContent = formatTimeHHMMSS(totalBreakSeconds);
    }
    
    // 統計情報をローカルストレージに保存
    function saveStats() {
        localStorage.setItem('pomodoroCycleCount', cycleCount);
        localStorage.setItem('pomodoroTotalWorkSeconds', totalWorkSeconds);
        localStorage.setItem('pomodoroTotalBreakSeconds', totalBreakSeconds);
    }
    
    // 時間をHH:MM:SS形式にフォーマット
    function formatTimeHHMMSS(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }
    
    // タイマーをリセット
    function resetTimer() {
        clearInterval(timerId);
        isRunning = false;
        startStopBtn.textContent = '開始';
        isWorkMode = true;
        updateModeButtons();
        timeLeft = workTime;
        totalTime = workTime;
        updateDisplay();
    }
    
    // 分・秒の入力値が変更されたときの処理
    function updateTimeSettings() {
        const newWorkTime = (parseInt(workMinutesInput.value) * 60) + parseInt(workSecondsInput.value);
        const newBreakTime = (parseInt(breakMinutesInput.value) * 60) + parseInt(breakSecondsInput.value);
        
        // 入力値のバリデーション
        if (newWorkTime <= 0) {
            workMinutesInput.value = 0;
            workSecondsInput.value = 1;
            workTime = 1;
        } else {
            workTime = newWorkTime;
        }
        
        if (newBreakTime <= 0) {
            breakMinutesInput.value = 0;
            breakSecondsInput.value = 1;
            breakTime = 1;
        } else {
            breakTime = newBreakTime;
        }
        
        // 現在のモードに応じて時間を更新
        if (!isRunning) {
            if (isWorkMode) {
                timeLeft = workTime;
                totalTime = workTime;
            } else {
                timeLeft = breakTime;
                totalTime = breakTime;
            }
            updateDisplay();
        }
    }
    
    // モード切り替えボタンにイベントリスナーを追加
    workModeBtn.addEventListener('click', () => {
        if (!isWorkMode) {
            if (isRunning) {
                // タイマーが動いている場合は確認ダイアログを表示
                if (confirm('タイマーを停止して作業モードに切り替えますか？')) {
                    toggleTimer(); // タイマーを停止
                    switchMode(true);
                }
            } else {
                switchMode(true);
            }
        }
    });
    
    breakModeBtn.addEventListener('click', () => {
        if (isWorkMode) {
            if (isRunning) {
                // タイマーが動いている場合は確認ダイアログを表示
                if (confirm('タイマーを停止して休憩モードに切り替えますか？')) {
                    toggleTimer(); // タイマーを停止
                    switchMode(false);
                }
            } else {
                switchMode(false);
            }
        }
    });
    
    // イベントリスナーを設定
    workMinutesInput.addEventListener('change', updateTimeSettings);
    workSecondsInput.addEventListener('change', updateTimeSettings);
    breakMinutesInput.addEventListener('change', updateTimeSettings);
    breakSecondsInput.addEventListener('change', updateTimeSettings);
    
    // 秒の入力値を0-59の範囲に制限
    [workSecondsInput, breakSecondsInput].forEach(input => {
        input.addEventListener('change', function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 59) this.value = 59;
        });
    });
    
    // 分の入力値に制限を設定
    workMinutesInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 120) this.value = 120;
    });
    
    breakMinutesInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 30) this.value = 30;
    });
    
    // ボタンにイベントリスナーを追加
    startStopBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    // 初期表示を更新
    updateDisplay();
    updateStats();
});
