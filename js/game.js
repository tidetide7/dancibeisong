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

// 提示功能状态
let hintState = {
    isVisible: false,
    currentWord: null,
    currentExamples: []
};

// 初始化游戏
async function initGame() {
    console.log('初始化单词勇者游戏...');

    // 显示初始加载指示器
    if (window.loadingIndicator) {
        window.loadingIndicator.show();
    }

    try {
        // 预加载关键资源
        if (window.lazyLoader) {
            await window.lazyLoader.preloadCriticalResources();
        }

        // 加载设置和进度
        gameState.settings = StorageAPI.loadGameSettings();
        const progress = StorageAPI.loadGameProgress();

        // 应用音频设置
        if (window.audioManager && gameState.settings) {
            audioManager.applySettings(gameState.settings);
        }

        // 更新关卡数据
        updateLevelsFromProgress(progress);

        // 渲染主菜单
        renderMainMenu();

        console.log('游戏初始化完成');

    } catch (error) {
        console.error('游戏初始化失败:', error);
        alert('游戏初始化失败，请刷新页面重试！');
    } finally {
        // 隐藏加载指示器
        if (window.loadingIndicator) {
            setTimeout(() => {
                window.loadingIndicator.hide();
            }, 300);
        }
    }
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

    // 更新复习模式按钮
    updateReviewModeButton();
}

// 开始关卡
async function startLevel(levelId) {
    console.log(`开始关卡 ${levelId}`);

    // 显示加载指示器
    if (window.loadingIndicator) {
        window.loadingIndicator.show();
    }

    try {
        // 预加载关卡资源
        if (window.lazyLoader) {
            await window.lazyLoader.loadLevelResources(levelId);
        }

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

        // 预加载这些单词的语音
        const words = gameState.questions.map(q => q.word);
        if (window.audioManager && audioManager.loadVoicesLazily) {
            await audioManager.loadVoicesLazily(words);
        }

        // 切换到游戏界面
        showScreen('screen-gameplay');
        renderGameplay();

    } catch (error) {
        console.error('关卡加载失败:', error);
        alert('关卡加载失败，请重试！');
    } finally {
        // 隐藏加载指示器
        if (window.loadingIndicator) {
            window.loadingIndicator.hide();
        }
    }
}

// 渲染游戏界面
function renderGameplay() {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

    // 更新进度
    const progressText = gameState.isReviewMode
        ? `📚 复习模式 第 ${gameState.currentQuestionIndex + 1} / ${gameState.questions.length} 题`
        : `第 ${gameState.currentQuestionIndex + 1} / ${gameState.questions.length} 题`;
    document.getElementById('question-progress').textContent = progressText;

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

        // 隐藏提示按钮（听音选词不需要提示）
        initHintForQuestion(null);

        // 隐藏难度指示器（听音选词不显示难度）
        hideDifficultyIndicator();

        // 自动播放一次
        setTimeout(() => playQuestionAudio(), 500);
    } else {
        // 看词选意题型
        typeIndicator.textContent = '看词选意';
        questionWord.textContent = currentQuestion.word;
        questionWord.className = 'text-5xl font-bold text-slate-800 question-enter';
        questionWord.onclick = null;
        playAudioBtn.classList.add('hidden');

        // 初始化提示功能
        initHintForQuestion(currentQuestion.word);

        // 显示单词难度指示器
        showDifficultyIndicator(currentQuestion);
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

    // 记录今日学习数据
    const questionsAnswered = gameState.questions.length;
    const correctAnswers = questionsAnswered - gameState.wrongAnswers.length;
    const timeSpentMinutes = Math.round(playTime / 1000 / 60);

    StorageAPI.recordDailyActivity(questionsAnswered, correctAnswers, timeSpentMinutes);

    if (success) {
        if (!gameState.isReviewMode) {
            // 普通关卡模式：更新进度
            StorageAPI.updateLevelProgress(gameState.currentLevel, true);

            // 更新关卡状态
            LevelsAPI.completeLevel(gameState.currentLevel);
        } else {
            // 复习模式：清除已掌握的单词
            const masteredWords = gameState.questions
                .filter(q => !gameState.wrongAnswers.find(wrong => wrong.word === q.word))
                .map(q => {
                    const wordData = VOCABULARY.find(v => v.word === q.word);
                    return wordData ? wordData.id : null;
                })
                .filter(Boolean);

            if (masteredWords.length > 0) {
                StorageAPI.clearMasteredWords(masteredWords);
            }
        }

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

        if (gameState.isReviewMode) {
            resultTitle.textContent = '复习完成！';
            resultMessage.textContent = '太棒了，又掌握了更多单词！';
        } else {
            resultTitle.textContent = '闯关成功！';
            resultMessage.textContent = '太棒了，新的一关已经解锁！';
        }

        nextLevelBtn.style.display = (!gameState.isReviewMode && gameState.currentLevel < 100) ? 'block' : 'none';
    } else {
        resultIcon.className = 'mx-auto bg-red-100 rounded-full h-20 w-20 flex items-center justify-center mb-4';
        resultIcon.innerHTML = '<svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';

        if (gameState.isReviewMode) {
            resultTitle.textContent = '复习未完成';
            resultMessage.textContent = '继续努力，复习这些单词吧！';
        } else {
            resultTitle.textContent = '挑战失败';
            resultMessage.textContent = '别灰心，再试一次吧！';
        }

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
        // 更改按钮点击事件
        confirmBtn.onclick = () => {
            confirmAllReviewed();
            if (gameState.isReviewMode) {
                backToMainMenu();
            } else {
                goToNextLevel();
            }
        };
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
    // 重置复习模式状态
    gameState.isReviewMode = false;

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

// 渲染统计页面
function renderStatistics() {
    const stats = StorageAPI.getLearningStats();

    document.getElementById('total-play-time').textContent = stats.totalPlayTimeMinutes;
    document.getElementById('study-days').textContent = stats.studyDays;
    document.getElementById('accuracy-rate').textContent = `${stats.accuracy}%`;
    document.getElementById('total-questions').textContent = stats.totalQuestionsAnswered;
    document.getElementById('correct-answers').textContent = stats.correctAnswers;
    document.getElementById('best-combo').textContent = stats.bestCombo;
    document.getElementById('words-learned').textContent = stats.wordsLearned;
    document.getElementById('completed-levels').textContent = stats.completedLevels;
    document.getElementById('games-played').textContent = stats.gamesPlayed;

    // 渲染学习曲线图表
    renderLearningCurve();
}

// 渲染学习曲线图表
function renderLearningCurve() {
    const curveData = StorageAPI.getLearningCurveData();
    const container = document.getElementById('learning-curve-chart');

    if (!container) return;

    // 找到最大值用于缩放
    const maxQuestions = Math.max(...curveData.map(d => d.questionsAnswered), 1);

    container.innerHTML = `
        <div class="flex items-end justify-between h-full">
            ${curveData.map(day => {
                const height = maxQuestions > 0 ? (day.questionsAnswered / maxQuestions) * 80 : 0;
                const color = day.questionsAnswered > 0 ? 'bg-blue-500' : 'bg-gray-200';

                return `
                    <div class="flex flex-col items-center flex-1 mx-1">
                        <div class="mb-2">
                            <div class="${color} rounded-t transition-all duration-300 hover:bg-blue-600"
                                 style="height: ${height}px; width: 12px;"
                                 title="${day.shortDate}: ${day.questionsAnswered}题, 准确率${day.accuracy}%">
                            </div>
                        </div>
                        <span class="text-xs text-slate-500 text-center">${day.shortDate}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="mt-3 text-xs text-slate-500 text-center">
            📊 最近7天答题数量 (悬停查看详情)
        </div>
    `;
}

// 渲染成就页面
function renderAchievements() {
    const achievements = StorageAPI.getAchievements();
    const container = document.getElementById('achievements-list');

    container.innerHTML = '';

    if (achievements.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-500">
                <p class="text-4xl mb-4">🏆</p>
                <p>还没有获得成就</p>
                <p class="text-sm">继续学习来解锁你的第一个成就吧！</p>
            </div>
        `;
        return;
    }

    achievements.forEach(achievement => {
        const achievementCard = document.createElement('div');
        achievementCard.className = 'bg-white rounded-lg p-4 border flex items-center space-x-4';

        achievementCard.innerHTML = `
            <div class="text-3xl">${achievement.icon}</div>
            <div class="flex-1">
                <h4 class="font-bold text-slate-800">${achievement.name}</h4>
                <p class="text-slate-600 text-sm">${achievement.description}</p>
                <p class="text-xs text-slate-400 mt-1">
                    获得时间: ${new Date(achievement.earnedDate).toLocaleDateString()}
                </p>
            </div>
            <div class="text-green-500">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
            </div>
        `;

        container.appendChild(achievementCard);
    });
}

// 初始化设置页面
function initializeSettings() {
    const settings = StorageAPI.loadGameSettings();

    // 设置开关状态
    document.getElementById('sound-toggle').checked = settings.soundEnabled;
    document.getElementById('effects-toggle').checked = settings.effectsEnabled;

    // 添加事件监听器
    document.getElementById('sound-toggle').addEventListener('change', function(e) {
        const newSettings = StorageAPI.loadGameSettings();
        newSettings.soundEnabled = e.target.checked;
        StorageAPI.saveGameSettings(newSettings);

        // 更新音频管理器设置
        if (window.audioManager) {
            audioManager.setEnabled(e.target.checked);
        }
    });

    document.getElementById('effects-toggle').addEventListener('change', function(e) {
        const newSettings = StorageAPI.loadGameSettings();
        newSettings.effectsEnabled = e.target.checked;
        StorageAPI.saveGameSettings(newSettings);

        // 更新视觉特效设置
        document.body.classList.toggle('effects-disabled', !e.target.checked);
    });
}

// 导出游戏数据
function exportGameData() {
    const data = StorageAPI.exportData();
    if (!data) {
        alert('导出数据失败！');
        return;
    }

    // 创建下载链接
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const filename = `wordHero_backup_${now.getFullYear()}_${(now.getMonth()+1).toString().padStart(2,'0')}_${now.getDate().toString().padStart(2,'0')}.json`;

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`数据导出成功！文件已保存为：${filename}`);
}

// 导入游戏数据
function importGameData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const success = StorageAPI.importData(e.target.result);
                if (success) {
                    alert('数据导入成功！页面将刷新以应用新数据。');
                    location.reload();
                } else {
                    alert('数据导入失败！请检查文件格式。');
                }
            } catch (error) {
                alert('数据导入失败！文件格式错误。');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

// 清除游戏数据
function clearGameData() {
    const confirmed = confirm('确定要清除所有游戏数据吗？\n这包括：\n- 游戏进度\n- 学习统计\n- 设置信息\n\n此操作不可撤销！');

    if (confirmed) {
        const doubleConfirm = confirm('真的要删除所有数据吗？这将无法恢复！');
        if (doubleConfirm) {
            const success = StorageAPI.clearAllData();
            if (success) {
                alert('所有数据已清除！页面将刷新。');
                location.reload();
            } else {
                alert('清除数据失败！');
            }
        }
    }
}

// 重写showScreen函数以支持新页面
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

    // 根据页面类型渲染内容
    switch(screenId) {
        case 'screen-statistics':
            renderStatistics();
            break;
        case 'screen-achievements':
            renderAchievements();
            break;
        case 'screen-settings':
            initializeSettings();
            break;
        case 'screen-main-menu':
            renderMainMenu();
            break;
    }

    gameState.currentScreen = screenId.replace('screen-', '');
}

// ================================
// 提示功能相关函数
// ================================

// 切换提示显示状态
function toggleHint() {
    const btn = document.getElementById('hint-btn');
    const area = document.getElementById('hint-area');

    if (hintState.isVisible) {
        // 隐藏提示
        area.classList.add('hidden');
        area.classList.remove('show');
        btn.innerHTML = '💡 提示';
        btn.classList.remove('active');
        hintState.isVisible = false;
    } else {
        // 显示提示
        showHintExample();
        area.classList.remove('hidden');
        area.classList.add('show');
        btn.innerHTML = '🔍 隐藏提示';
        btn.classList.add('active');
        hintState.isVisible = true;
    }
}

// 显示例句
function showHintExample() {
    const area = document.getElementById('hint-area');
    const examples = hintState.currentExamples;

    if (examples && examples.length > 0) {
        // 随机选择一个例句
        const randomExample = examples[Math.floor(Math.random() * examples.length)];

        area.innerHTML = `
            <div class="example-sentence">
                ${randomExample}
            </div>
        `;
    } else {
        // 没有例句时显示默认提示
        area.innerHTML = `
            <div class="example-sentence">
                Sorry, no example available for this word.
            </div>
        `;
    }
}

// 初始化提示数据
function initHintForQuestion(word) {
    const hintBtn = document.getElementById('hint-btn');

    if (!word) {
        // 听音选词题型，隐藏提示按钮
        hintBtn.classList.add('hidden');
        resetHintState();
        return;
    }

    // 看词选意题型，显示提示按钮
    hintBtn.classList.remove('hidden');

    // 查找单词数据
    const wordData = VOCABULARY.find(v => v.word === word);
    hintState.currentWord = word;
    hintState.currentExamples = wordData && wordData.examples ? wordData.examples : [];

    // 重置提示状态
    resetHintState();
}

// 重置提示状态
function resetHintState() {
    const btn = document.getElementById('hint-btn');
    const area = document.getElementById('hint-area');

    area.classList.add('hidden');
    area.classList.remove('show');
    btn.innerHTML = '💡 提示';
    btn.classList.remove('active');
    hintState.isVisible = false;
}

// ================================
// 复习模式相关函数
// ================================

// 更新复习模式按钮
function updateReviewModeButton() {
    const reviewBtn = document.getElementById('review-mode-btn');
    const reviewCount = document.getElementById('review-count');

    if (!reviewBtn || !reviewCount) return;

    const wordsNeedReview = StorageAPI.getWordsNeedReview();
    const count = wordsNeedReview.length;

    reviewCount.textContent = count;

    if (count === 0) {
        reviewBtn.disabled = true;
        reviewBtn.textContent = '📚 复习模式 (没有需要复习的单词)';
        reviewBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        reviewBtn.disabled = false;
        reviewBtn.innerHTML = `📚 复习模式 (需要复习的单词: <span id="review-count">${count}</span>个)`;
        reviewBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// 开始复习模式
async function startReviewMode() {
    console.log('开始复习模式');

    const wordsNeedReview = StorageAPI.getWordsNeedReview();

    if (wordsNeedReview.length === 0) {
        alert('恭喜！目前没有需要复习的单词。');
        return;
    }

    // 显示加载指示器
    if (window.loadingIndicator) {
        window.loadingIndicator.show();
    }

    try {
        // 初始化复习模式游戏状态
        gameState.currentLevel = 'review';
        gameState.currentQuestionIndex = 0;
        gameState.lives = 3;
        gameState.combo = 0;
        gameState.score = 0;
        gameState.wrongAnswers = [];
        gameState.startTime = Date.now();
        gameState.isReviewMode = true;

        // 生成复习题目
        gameState.questions = generateReviewQuestions(wordsNeedReview, Math.min(10, wordsNeedReview.length));

        if (gameState.questions.length === 0) {
            alert('复习数据加载失败！');
            return;
        }

        // 预加载这些单词的语音
        const words = gameState.questions.map(q => q.word);
        if (window.audioManager && audioManager.loadVoicesLazily) {
            await audioManager.loadVoicesLazily(words);
        }

        // 切换到游戏界面
        showScreen('screen-gameplay');
        renderGameplay();

    } catch (error) {
        console.error('复习模式加载失败:', error);
        alert('复习模式加载失败，请重试！');
    } finally {
        // 隐藏加载指示器
        if (window.loadingIndicator) {
            window.loadingIndicator.hide();
        }
    }
}

// 生成复习题目
function generateReviewQuestions(wordIds, count) {
    const questions = [];
    const selectedWordIds = wordIds.slice(0, count);

    selectedWordIds.forEach(wordId => {
        const wordData = VocabularyAPI.getWordById(wordId);
        if (!wordData) return;

        // 随机选择题型（看词选意或听音选词）
        const isListeningQuestion = Math.random() < 0.5;

        let question;
        if (isListeningQuestion) {
            // 听音选词：播放发音，选择正确的英文单词
            const wrongWords = VocabularyAPI.getRandomWords(3).filter(w => w.id !== wordData.id);
            const allOptions = [wordData.word, ...wrongWords.map(w => w.word)];
            const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());

            question = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'listening',
                word: wordData.word,
                pronunciation: wordData.pronunciation,
                meaning: wordData.meaning,
                correctAnswer: wordData.word,
                options: shuffledOptions,
                correctIndex: shuffledOptions.indexOf(wordData.word)
            };
        } else {
            // 看词选意：显示英文单词，选择正确的中文意思
            const wrongOptions = VocabularyAPI.getRandomWrongOptions(wordData, 3);
            const allOptions = [wordData.meaning, ...wrongOptions];
            const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());

            question = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'reading',
                word: wordData.word,
                pronunciation: wordData.pronunciation,
                meaning: wordData.meaning,
                correctAnswer: wordData.meaning,
                options: shuffledOptions,
                correctIndex: shuffledOptions.indexOf(wordData.meaning)
            };
        }

        if (question) {
            questions.push(question);
        }
    });

    // 打乱题目顺序
    return questions.sort(() => Math.random() - 0.5);
}

// ================================
// 单词难度指示器相关函数
// ================================

// 显示单词难度指示器
function showDifficultyIndicator(question) {
    const indicator = document.getElementById('difficulty-indicator');
    const badge = document.getElementById('difficulty-badge');

    if (!question || !question.word) {
        hideDifficultyIndicator();
        return;
    }

    // 查找单词数据获取ID
    const wordData = VOCABULARY.find(v => v.word === question.word);
    if (!wordData) {
        hideDifficultyIndicator();
        return;
    }

    // 获取单词难度信息
    const difficultyInfo = StorageAPI.getWordDifficulty(wordData.id);

    // 设置难度标签
    let difficultyText = '';
    let difficultyClass = 'difficulty-unknown';

    switch (difficultyInfo.difficulty) {
        case 'easy':
            difficultyText = '简单';
            difficultyClass = 'difficulty-easy';
            break;
        case 'medium':
            difficultyText = '中等';
            difficultyClass = 'difficulty-medium';
            break;
        case 'hard':
            difficultyText = '困难';
            difficultyClass = 'difficulty-hard';
            break;
        default:
            // 如果没有足够的数据，不显示指示器
            if (difficultyInfo.totalAttempts === 0) {
                hideDifficultyIndicator();
                return;
            }
            difficultyText = '？';
            difficultyClass = 'difficulty-unknown';
    }

    // 更新显示
    badge.textContent = difficultyText;
    badge.className = `px-2 py-1 text-xs font-bold rounded-full ${difficultyClass}`;
    indicator.classList.remove('hidden');

    // 添加工具提示信息
    const attempts = difficultyInfo.totalAttempts;
    const correct = difficultyInfo.correctAttempts;
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

    badge.title = `历史正确率: ${accuracy}% (${correct}/${attempts})`;
}

// 隐藏单词难度指示器
function hideDifficultyIndicator() {
    const indicator = document.getElementById('difficulty-indicator');
    indicator.classList.add('hidden');
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化游戏...');
    initGame();
});