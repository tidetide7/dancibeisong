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
            levelButton.className += ' level-completed text-white';
            levelButton.innerHTML = '✓';
        } else if (level.isUnlocked) {
            // 可玩关卡
            levelButton.className += ' level-available text-white';
            levelButton.textContent = level.id;
            levelButton.onclick = () => {
                if (window.audioManager) audioManager.play('click');
                startLevel(level.id);
            };
        } else {
            // 锁定关卡
            levelButton.className += ' level-locked text-slate-500 cursor-not-allowed';
            levelButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clip-rule="evenodd" /></svg>';
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

    // 根据题型更新界面
    const typeIndicator = document.getElementById('question-type-indicator');
    const questionWord = document.getElementById('question-word');
    const playAudioBtn = document.getElementById('play-audio-btn');

    if (currentQuestion.type === 'listening') {
        // 听音选词题型
        typeIndicator.textContent = '听音选词';
        questionWord.textContent = '🔊 点击播放发音';
        questionWord.className = 'text-3xl font-bold text-blue-600 question-enter cursor-pointer';
        questionWord.onclick = playQuestionAudio;
        playAudioBtn.classList.remove('hidden');

        // 自动播放一次
        setTimeout(() => playQuestionAudio(), 500);
    } else {
        // 看词选意题型
        typeIndicator.textContent = '看词选意';
        questionWord.textContent = currentQuestion.word;
        questionWord.className = 'text-5xl font-bold text-slate-800 question-enter';
        questionWord.onclick = null;
        playAudioBtn.classList.add('hidden');
    }

    // 渲染选项
    renderOptions(currentQuestion);
}

// 播放题目音频
function playQuestionAudio() {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    if (currentQuestion && window.audioManager) {
        audioManager.playWordPronunciation(currentQuestion.word);
    }
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

        // 播放正确答案音效
        if (window.audioManager) {
            audioManager.play('correct');
            // 连击音效
            if (gameState.combo > 1) {
                setTimeout(() => audioManager.play('combo', gameState.combo), 200);
            }
        }

        // 增强的Combo特效
        if (gameState.combo > 1) {
            showComboEffect(gameState.combo);
        }
    } else {
        gameState.lives--;
        gameState.combo = 0;

        // 播放错误答案音效
        if (window.audioManager) {
            audioManager.play('wrong');
        }

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

// 显示增强的Combo特效
function showComboEffect(comboCount) {
    const comboElement = document.getElementById('combo-count');
    const comboDisplay = document.getElementById('combo-display');

    // 移除之前的特效类
    comboElement.classList.remove('combo-effect', 'combo-effect-2', 'combo-effect-3', 'combo-effect-high');

    // 根据连击数选择不同的特效
    let effectClass;
    let comboText = '';

    if (comboCount >= 10) {
        effectClass = 'combo-effect-high';
        comboText = '🔥 神级连击！';
    } else if (comboCount >= 6) {
        effectClass = 'combo-effect-3';
        comboText = '⚡ 超级连击！';
    } else if (comboCount >= 4) {
        effectClass = 'combo-effect-2';
        comboText = '✨ 连击！';
    } else {
        effectClass = 'combo-effect';
        comboText = '👍 不错！';
    }

    // 应用特效
    comboElement.classList.add(effectClass);

    // 显示连击提示文字
    if (comboCount >= 3) {
        const textElement = document.createElement('div');
        textElement.className = 'combo-text';
        textElement.textContent = comboText;
        comboDisplay.style.position = 'relative';
        comboDisplay.appendChild(textElement);

        // 1秒后移除文字
        setTimeout(() => {
            if (textElement.parentNode) {
                textElement.parentNode.removeChild(textElement);
            }
        }, 1000);
    }

    // 移除特效类
    const duration = comboCount >= 10 ? 1500 : comboCount >= 6 ? 1200 : comboCount >= 4 ? 1000 : 800;
    setTimeout(() => {
        comboElement.classList.remove(effectClass);
    }, duration);
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

    // 播放结束音效
    if (window.audioManager) {
        if (success) {
            audioManager.play('complete');
        } else {
            audioManager.play('wrong');
        }
    }

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
        updateResultButtons(true); // 没有错题，直接可以继续
        return;
    }

    // 为每个错题创建卡片
    gameState.wrongAnswers.forEach((wrong, index) => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 rounded-lg mb-3 wrong-answer-card';
        div.setAttribute('data-index', index);

        div.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <p class="font-bold text-slate-800 text-lg">${wrong.word}</p>
                <button class="play-pronunciation-btn text-blue-500 hover:text-blue-700" onclick="playWrongAnswerPronunciation('${wrong.word}')">
                    🔊
                </button>
            </div>
            <p class="text-green-600 font-semibold mb-1">正确答案：${wrong.correctAnswer}</p>
            <p class="text-red-500 text-sm mb-3">你的答案：${wrong.userAnswer}</p>
            <div class="flex space-x-2">
                <button
                    class="remember-btn flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-all"
                    onclick="markAsRemembered(${index})"
                >
                    ✓ 我记住了
                </button>
                <button
                    class="need-review-btn bg-orange-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-orange-600 transition-all"
                    onclick="markForReview(${index})"
                >
                    📚 需要复习
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    // 添加整体确认按钮
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'mt-4 p-4 bg-blue-50 rounded-lg';
    confirmDiv.innerHTML = `
        <p class="text-blue-700 font-semibold mb-2">📝 错题回顾进度</p>
        <div id="review-progress" class="text-sm text-blue-600 mb-3">
            还有 ${gameState.wrongAnswers.length} 个错题需要确认
        </div>
        <button
            id="confirm-all-btn"
            class="w-full bg-green-500 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            onclick="confirmAllReviewed()"
            disabled
        >
            继续下一关
        </button>
    `;
    container.appendChild(confirmDiv);

    // 初始化回顾状态
    gameState.reviewStatus = gameState.wrongAnswers.map(() => 'pending');
    updateResultButtons(false); // 有错题，需要先确认
}

// 播放错题发音
function playWrongAnswerPronunciation(word) {
    if (window.audioManager) {
        audioManager.playWordPronunciation(word);
    }
}

// 标记为已记住
function markAsRemembered(index) {
    gameState.reviewStatus[index] = 'remembered';
    updateWrongAnswerCard(index, 'remembered');
    updateReviewProgress();
}

// 标记需要复习
function markForReview(index) {
    gameState.reviewStatus[index] = 'review';
    updateWrongAnswerCard(index, 'review');
    updateReviewProgress();
}

// 更新错题卡片状态
function updateWrongAnswerCard(index, status) {
    const card = document.querySelector(`[data-index="${index}"]`);
    if (!card) return;

    // 移除之前的状态类
    card.classList.remove('card-remembered', 'card-review');

    if (status === 'remembered') {
        card.classList.add('card-remembered');
        card.style.backgroundColor = '#dcfce7'; // 绿色背景
        card.style.borderLeft = '4px solid #22c55e';
    } else if (status === 'review') {
        card.classList.add('card-review');
        card.style.backgroundColor = '#fed7aa'; // 橙色背景
        card.style.borderLeft = '4px solid #f97316';
    }

    // 禁用按钮
    const buttons = card.querySelectorAll('.remember-btn, .need-review-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

// 更新回顾进度
function updateReviewProgress() {
    const pending = gameState.reviewStatus.filter(status => status === 'pending').length;
    const remembered = gameState.reviewStatus.filter(status => status === 'remembered').length;
    const needReview = gameState.reviewStatus.filter(status => status === 'review').length;

    const progressElement = document.getElementById('review-progress');
    const confirmBtn = document.getElementById('confirm-all-btn');

    if (pending === 0) {
        progressElement.innerHTML = `
            ✅ 错题回顾完成！<br>
            <span class="text-green-600">已掌握: ${remembered}个</span> |
            <span class="text-orange-600">需复习: ${needReview}个</span>
        `;
        confirmBtn.disabled = false;
        confirmBtn.textContent = '继续下一关';
        updateResultButtons(true);
    } else {
        progressElement.textContent = `还有 ${pending} 个错题需要确认`;
    }
}

// 确认所有错题已回顾
function confirmAllReviewed() {
    // 保存需要复习的单词到本地存储
    const wordsNeedReview = gameState.wrongAnswers
        .filter((_, index) => gameState.reviewStatus[index] === 'review')
        .map(wrong => wrong.word);

    if (wordsNeedReview.length > 0) {
        const stats = StorageAPI.loadStatistics();
        stats.wordsNeedReview = (stats.wordsNeedReview || []).concat(wordsNeedReview);
        StorageAPI.saveStatistics(stats);
    }

    // 播放确认音效
    if (window.audioManager) {
        audioManager.play('complete');
    }

    // 显示成功提示
    const progressElement = document.getElementById('review-progress');
    progressElement.innerHTML = '🎉 错题回顾完成，可以继续下一关了！';
}

// 更新结果界面按钮
function updateResultButtons(canProceed) {
    const nextLevelBtn = document.getElementById('next-level-btn');
    if (nextLevelBtn) {
        nextLevelBtn.disabled = !canProceed;
        nextLevelBtn.style.opacity = canProceed ? '1' : '0.5';
    }
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