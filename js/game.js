// 单词勇者 - 主游戏逻辑
// 负责游戏状态管理、界面切换、答题逻辑等核心功能

// 游戏状态
let gameState = {
    currentScreen: 'main-menu',
    currentLevel: 1,
    currentQuestionIndex: 0,
    questions: [],
    lives: 3,
    combo: 0,
    score: 0,
    wrongAnswers: [],
    startTime: null,
    settings: null
};

// 初始化游戏
function initGame() {
    console.log('初始化单词勇者游戏...');

    // 加载设置和进度
    gameState.settings = StorageAPI.loadGameSettings();
    const progress = StorageAPI.loadGameProgress();

    // 更新关卡数据
    updateLevelsFromProgress(progress);

    // 渲染主菜单
    renderMainMenu();

    console.log('游戏初始化完成');
}

// 根据进度更新关卡状态
function updateLevelsFromProgress(progress) {
    const allLevels = LevelsAPI.getAllLevels();

    allLevels.forEach(level => {
        level.isUnlocked = progress.unlockedLevels.includes(level.id);
        level.isCompleted = progress.completedLevels.includes(level.id);
    });
}

// 渲染主菜单关卡网格
function renderMainMenu() {
    const levelGrid = document.getElementById('level-grid');
    const allLevels = LevelsAPI.getAllLevels();

    levelGrid.innerHTML = '';

    allLevels.forEach(level => {
        const levelButton = document.createElement('button');
        levelButton.className = 'level-button flex items-center justify-center w-10 h-10 rounded-lg font-bold focus:outline-none transition-all';

        if (level.isCompleted) {
            // 已完成关卡
            levelButton.className += ' bg-green-500 text-white';
            levelButton.innerHTML = '✓';
        } else if (level.isUnlocked) {
            // 可玩关卡
            levelButton.className += ' bg-blue-500 text-white hover:bg-blue-600 shadow-lg';
            levelButton.textContent = level.id;
            levelButton.onclick = () => startLevel(level.id);
        } else {
            // 锁定关卡
            levelButton.className += ' bg-slate-200 text-slate-400 cursor-not-allowed';
            levelButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clip-rule="evenodd" /></svg>';
        }

        levelGrid.appendChild(levelButton);
    });
}

// 开始关卡
function startLevel(levelId) {
    console.log(`开始关卡 ${levelId}`);

    gameState.currentLevel = levelId;
    gameState.currentQuestionIndex = 0;
    gameState.lives = 3;
    gameState.combo = 0;
    gameState.score = 0;
    gameState.wrongAnswers = [];
    gameState.startTime = Date.now();

    // 生成题目
    gameState.questions = LevelsAPI.generateLevelQuestions(levelId, 10);

    if (gameState.questions.length === 0) {
        alert('关卡数据加载失败！');
        return;
    }

    // 切换到游戏界面
    showScreen('screen-gameplay');
    renderGameplay();
}

// 渲染游戏界面
function renderGameplay() {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

    // 更新进度
    document.getElementById('question-progress').textContent =
        `第 ${gameState.currentQuestionIndex + 1} / ${gameState.questions.length} 题`;

    // 更新Combo
    document.getElementById('combo-count').textContent = `x${gameState.combo}`;

    // 更新生命值
    renderHealthDisplay();

    // 更新题目
    document.getElementById('question-word').textContent = currentQuestion.word;
    document.getElementById('question-word').className = 'text-5xl font-bold text-slate-800 question-enter';

    // 渲染选项
    renderOptions(currentQuestion);
}

// 渲染生命值
function renderHealthDisplay() {
    const healthDisplay = document.getElementById('health-display');
    healthDisplay.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>';

        if (i < gameState.lives) {
            heart.className = 'text-red-500';
        } else {
            heart.className = 'text-slate-300 health-lost';
        }

        healthDisplay.appendChild(heart);
    }
}

// 渲染选项
function renderOptions(question) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'text-left p-4 rounded-lg bg-slate-100 hover:bg-blue-100 transition-all focus:outline-none';
        button.innerHTML = `<span class="font-bold text-slate-700">${String.fromCharCode(65 + index)}.</span> ${option}`;
        button.onclick = () => selectAnswer(index, option);
        container.appendChild(button);
    });
}

// 选择答案
function selectAnswer(selectedIndex, selectedOption) {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    // 记录答案
    StorageAPI.recordAnswer(isCorrect, VocabularyAPI.getWordById(gameState.currentLevel * 30 - 30 + gameState.currentQuestionIndex + 1));

    // 显示反馈
    showAnswerFeedback(selectedIndex, currentQuestion.correctIndex, isCorrect);

    // 更新游戏状态
    if (isCorrect) {
        gameState.combo++;
        gameState.score += 10 * gameState.combo;

        // Combo特效
        if (gameState.combo > 1) {
            document.getElementById('combo-count').classList.add('combo-effect');
            setTimeout(() => {
                document.getElementById('combo-count').classList.remove('combo-effect');
            }, 800);
        }
    } else {
        gameState.lives--;
        gameState.combo = 0;

        // 记录错题
        gameState.wrongAnswers.push({
            word: currentQuestion.word,
            correctAnswer: currentQuestion.correctAnswer,
            userAnswer: selectedOption
        });

        // 更新生命值显示
        renderHealthDisplay();
    }

    // 检查游戏结束条件
    setTimeout(() => {
        if (gameState.lives <= 0) {
            endLevel(false);
        } else if (gameState.currentQuestionIndex >= gameState.questions.length - 1) {
            endLevel(true);
        } else {
            nextQuestion();
        }
    }, 1500);
}

// 显示答案反馈
function showAnswerFeedback(selectedIndex, correctIndex, isCorrect) {
    const options = document.getElementById('options-container').children;

    // 禁用所有选项
    Array.from(options).forEach(option => {
        option.disabled = true;
        option.style.pointerEvents = 'none';
    });

    // 正确答案显示绿色
    options[correctIndex].classList.add('option-correct');

    // 如果选错了，错误答案显示红色
    if (!isCorrect) {
        options[selectedIndex].classList.add('option-wrong');
    }
}

// 下一题
function nextQuestion() {
    gameState.currentQuestionIndex++;
    renderGameplay();
}

// 结束关卡
function endLevel(success) {
    const playTime = Date.now() - gameState.startTime;

    // 记录游戏会话
    StorageAPI.recordGameSession({
        playTime: playTime,
        combo: gameState.combo,
        level: gameState.currentLevel,
        success: success
    });

    if (success) {
        // 更新进度
        StorageAPI.updateLevelProgress(gameState.currentLevel, true);

        // 更新关卡状态
        LevelsAPI.completeLevel(gameState.currentLevel);

        showResultsScreen(true);
    } else {
        showResultsScreen(false);
    }
}

// 显示结果界面
function showResultsScreen(success) {
    showScreen('screen-results');

    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const nextLevelBtn = document.getElementById('next-level-btn');

    if (success) {
        resultIcon.className = 'mx-auto bg-green-100 rounded-full h-20 w-20 flex items-center justify-center mb-4';
        resultIcon.innerHTML = '<svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        resultTitle.textContent = '闯关成功！';
        resultMessage.textContent = '太棒了，新的一关已经解锁！';
        nextLevelBtn.style.display = gameState.currentLevel < 100 ? 'block' : 'none';
    } else {
        resultIcon.className = 'mx-auto bg-red-100 rounded-full h-20 w-20 flex items-center justify-center mb-4';
        resultIcon.innerHTML = '<svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        resultTitle.textContent = '挑战失败';
        resultMessage.textContent = '别灰心，再试一次吧！';
        nextLevelBtn.style.display = 'none';
    }

    // 显示错题回顾
    renderWrongAnswers();
}

// 渲染错题回顾
function renderWrongAnswers() {
    const container = document.getElementById('wrong-answers');
    container.innerHTML = '';

    if (gameState.wrongAnswers.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center">太棒了！没有答错任何题目。</p>';
        return;
    }

    gameState.wrongAnswers.forEach(wrong => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-slate-50 rounded-lg';
        div.innerHTML = `
            <p class="font-bold text-slate-800">${wrong.word}</p>
            <p class="text-green-600 font-semibold">正确答案：${wrong.correctAnswer}</p>
            <p class="text-red-500 text-sm">你的答案：${wrong.userAnswer}</p>
        `;
        container.appendChild(div);
    });
}

// 界面切换函数
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.classList.add('flex');
    }

    gameState.currentScreen = screenId.replace('screen-', '');
}

// 返回主菜单
function backToMainMenu() {
    showScreen('screen-main-menu');
    renderMainMenu();
}

// 前往下一关
function goToNextLevel() {
    if (gameState.currentLevel < 100) {
        startLevel(gameState.currentLevel + 1);
    } else {
        backToMainMenu();
    }
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化游戏...');
    initGame();
});