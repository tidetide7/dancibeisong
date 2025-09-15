// 单词勇者 - 关卡配置
// 100个关卡的配置结构，每关分配30个单词ID

const LEVELS_CONFIG = [];

// 生成100个关卡配置
for (let levelNumber = 1; levelNumber <= 100; levelNumber++) {
    const level = {
        id: levelNumber,
        name: `第${levelNumber}关`,
        description: `挑战第${levelNumber}关的词汇`,
        isUnlocked: levelNumber === 1, // 只有第1关默认解锁
        isCompleted: false,
        difficulty: Math.ceil(levelNumber / 10), // 每10关增加一个难度级别
        wordIds: [],
        requirements: {
            questionsCount: 10,
            passingScore: 7, // 至少答对7题才能通关
            maxLives: 3
        },
        rewards: {
            exp: levelNumber * 10,
            unlockNext: levelNumber < 100
        }
    };

    // 为每关分配30个单词ID
    if (levelNumber <= 10) {
        // 前10关使用现有的300个单词，每关30个
        const startIndex = (levelNumber - 1) * 30;
        for (let i = 0; i < 30; i++) {
            level.wordIds.push(startIndex + i + 1);
        }
    } else {
        // 第11-100关：循环使用前300个单词，但会有重复
        // 这样可以让玩家复习之前学过的单词
        const baseWords = 300;
        const wordsPerLevel = 30;
        const startIndex = ((levelNumber - 1) * wordsPerLevel) % baseWords;

        for (let i = 0; i < wordsPerLevel; i++) {
            const wordId = (startIndex + i) % baseWords + 1;
            level.wordIds.push(wordId);
        }
    }

    LEVELS_CONFIG.push(level);
}

// 关卡管理API
const LevelsAPI = {
    // 获取所有关卡
    getAllLevels: function() {
        return LEVELS_CONFIG;
    },

    // 根据ID获取关卡
    getLevelById: function(levelId) {
        return LEVELS_CONFIG.find(level => level.id === levelId);
    },

    // 获取已解锁的关卡
    getUnlockedLevels: function() {
        return LEVELS_CONFIG.filter(level => level.isUnlocked);
    },

    // 获取已完成的关卡
    getCompletedLevels: function() {
        return LEVELS_CONFIG.filter(level => level.isCompleted);
    },

    // 解锁关卡
    unlockLevel: function(levelId) {
        const level = this.getLevelById(levelId);
        if (level) {
            level.isUnlocked = true;
            return true;
        }
        return false;
    },

    // 完成关卡
    completeLevel: function(levelId) {
        const level = this.getLevelById(levelId);
        if (level && level.isUnlocked) {
            level.isCompleted = true;

            // 解锁下一关
            if (level.rewards.unlockNext) {
                this.unlockLevel(levelId + 1);
            }

            return true;
        }
        return false;
    },

    // 重置关卡进度
    resetProgress: function() {
        LEVELS_CONFIG.forEach((level, index) => {
            level.isUnlocked = index === 0; // 只有第1关解锁
            level.isCompleted = false;
        });
    },

    // 获取关卡的词汇
    getLevelWords: function(levelId) {
        const level = this.getLevelById(levelId);
        if (!level) return [];

        return level.wordIds.map(wordId => VocabularyAPI.getWordById(wordId)).filter(Boolean);
    },

    // 获取关卡的随机题目
    generateLevelQuestions: function(levelId, questionCount = 10) {
        const levelWords = this.getLevelWords(levelId);
        if (levelWords.length === 0) return [];

        // 随机选择指定数量的单词
        const shuffled = [...levelWords].sort(() => 0.5 - Math.random());
        const selectedWords = shuffled.slice(0, questionCount);

        // 为每个单词生成题目，随机选择题型
        return selectedWords.map((word, index) => {
            // 50%概率是"看词选意"，50%概率是"听音选词"
            const isListeningQuestion = Math.random() < 0.5;

            if (isListeningQuestion) {
                // 听音选词：播放发音，选择正确的英文单词
                const wrongWords = VocabularyAPI.getRandomWords(3).filter(w => w.id !== word.id);
                const allOptions = [word.word, ...wrongWords.map(w => w.word)];
                const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'listening', // 题型标识
                    word: word.word,
                    pronunciation: word.pronunciation,
                    meaning: word.meaning,
                    correctAnswer: word.word,
                    options: shuffledOptions,
                    correctIndex: shuffledOptions.indexOf(word.word)
                };
            } else {
                // 看词选意：显示英文单词，选择正确的中文意思
                const wrongOptions = VocabularyAPI.getRandomWrongOptions(word, 3);
                const allOptions = [word.meaning, ...wrongOptions];
                const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'reading', // 题型标识
                    word: word.word,
                    pronunciation: word.pronunciation,
                    meaning: word.meaning,
                    correctAnswer: word.meaning,
                    options: shuffledOptions,
                    correctIndex: shuffledOptions.indexOf(word.meaning)
                };
            }
        });
    },

    // 获取进度统计
    getProgressStats: function() {
        const totalLevels = LEVELS_CONFIG.length;
        const unlockedCount = this.getUnlockedLevels().length;
        const completedCount = this.getCompletedLevels().length;

        return {
            total: totalLevels,
            unlocked: unlockedCount,
            completed: completedCount,
            progress: Math.round((completedCount / totalLevels) * 100)
        };
    }
};