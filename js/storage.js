// 单词勇者 - 本地存储管理模块
// 负责保存/读取进度、关卡解锁状态、游戏设置

const STORAGE_KEYS = {
    GAME_PROGRESS: 'wordHero_gameProgress',
    GAME_SETTINGS: 'wordHero_gameSettings',
    STATISTICS: 'wordHero_statistics'
};

// 本地存储管理API
const StorageAPI = {
    // 保存游戏进度
    saveGameProgress: function(progress) {
        try {
            const progressData = {
                currentLevel: progress.currentLevel || 1,
                unlockedLevels: progress.unlockedLevels || [1],
                completedLevels: progress.completedLevels || [],
                totalScore: progress.totalScore || 0,
                lastPlayedDate: new Date().toISOString(),
                ...progress
            };

            localStorage.setItem(STORAGE_KEYS.GAME_PROGRESS, JSON.stringify(progressData));
            console.log('游戏进度已保存:', progressData);
            return true;
        } catch (error) {
            console.error('保存游戏进度失败:', error);
            return false;
        }
    },

    // 读取游戏进度
    loadGameProgress: function() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.GAME_PROGRESS);
            if (!stored) {
                // 返回默认进度
                return {
                    currentLevel: 1,
                    unlockedLevels: [1],
                    completedLevels: [],
                    totalScore: 0,
                    lastPlayedDate: new Date().toISOString()
                };
            }

            const progress = JSON.parse(stored);
            console.log('游戏进度已加载:', progress);
            return progress;
        } catch (error) {
            console.error('加载游戏进度失败:', error);
            // 返回默认进度
            return {
                currentLevel: 1,
                unlockedLevels: [1],
                completedLevels: [],
                totalScore: 0,
                lastPlayedDate: new Date().toISOString()
            };
        }
    },

    // 保存游戏设置
    saveGameSettings: function(settings) {
        try {
            const settingsData = {
                soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true,
                effectsEnabled: settings.effectsEnabled !== undefined ? settings.effectsEnabled : true,
                difficulty: settings.difficulty || 'normal',
                theme: settings.theme || 'default',
                ...settings
            };

            localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settingsData));
            console.log('游戏设置已保存:', settingsData);
            return true;
        } catch (error) {
            console.error('保存游戏设置失败:', error);
            return false;
        }
    },

    // 读取游戏设置
    loadGameSettings: function() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
            if (!stored) {
                // 返回默认设置
                return {
                    soundEnabled: true,
                    effectsEnabled: true,
                    difficulty: 'normal',
                    theme: 'default'
                };
            }

            const settings = JSON.parse(stored);
            console.log('游戏设置已加载:', settings);
            return settings;
        } catch (error) {
            console.error('加载游戏设置失败:', error);
            // 返回默认设置
            return {
                soundEnabled: true,
                effectsEnabled: true,
                difficulty: 'normal',
                theme: 'default'
            };
        }
    },

    // 保存统计数据
    saveStatistics: function(stats) {
        try {
            const currentStats = this.loadStatistics();
            const updatedStats = {
                ...currentStats,
                ...stats,
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(updatedStats));
            console.log('统计数据已保存:', updatedStats);
            return true;
        } catch (error) {
            console.error('保存统计数据失败:', error);
            return false;
        }
    },

    // 读取统计数据
    loadStatistics: function() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.STATISTICS);
            if (!stored) {
                // 返回默认统计
                return {
                    totalQuestionsAnswered: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    totalPlayTime: 0,
                    gamesPlayed: 0,
                    averageAccuracy: 0,
                    bestCombo: 0,
                    wordsLearned: [],
                    dailyStreak: 0,
                    lastPlayDate: null,
                    achievements: []
                };
            }

            const stats = JSON.parse(stored);
            console.log('统计数据已加载:', stats);
            return stats;
        } catch (error) {
            console.error('加载统计数据失败:', error);
            // 返回默认统计
            return {
                totalQuestionsAnswered: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalPlayTime: 0,
                gamesPlayed: 0,
                averageAccuracy: 0,
                bestCombo: 0,
                wordsLearned: [],
                dailyStreak: 0,
                lastPlayDate: null,
                achievements: []
            };
        }
    },

    // 更新关卡进度
    updateLevelProgress: function(levelId, completed = false) {
        const progress = this.loadGameProgress();

        // 确保关卡已解锁
        if (!progress.unlockedLevels.includes(levelId)) {
            progress.unlockedLevels.push(levelId);
        }

        // 如果完成关卡
        if (completed && !progress.completedLevels.includes(levelId)) {
            progress.completedLevels.push(levelId);

            // 解锁下一关
            const nextLevel = levelId + 1;
            if (nextLevel <= 100 && !progress.unlockedLevels.includes(nextLevel)) {
                progress.unlockedLevels.push(nextLevel);
            }

            // 更新当前关卡
            progress.currentLevel = Math.max(progress.currentLevel, nextLevel);
        }

        return this.saveGameProgress(progress);
    },

    // 记录答题结果
    recordAnswer: function(isCorrect, word) {
        const stats = this.loadStatistics();

        stats.totalQuestionsAnswered++;
        if (isCorrect) {
            stats.correctAnswers++;

            // 记录学习的单词
            if (word && !stats.wordsLearned.includes(word.id)) {
                stats.wordsLearned.push(word.id);
            }
        } else {
            stats.wrongAnswers++;
        }

        // 更新准确率
        stats.averageAccuracy = Math.round((stats.correctAnswers / stats.totalQuestionsAnswered) * 100);

        return this.saveStatistics(stats);
    },

    // 记录游戏会话
    recordGameSession: function(sessionData) {
        const stats = this.loadStatistics();

        stats.gamesPlayed++;
        stats.totalPlayTime += sessionData.playTime || 0;

        if (sessionData.combo > stats.bestCombo) {
            stats.bestCombo = sessionData.combo;
        }

        // 更新连续游戏天数
        const today = new Date().toDateString();
        const lastPlayDate = stats.lastPlayDate ? new Date(stats.lastPlayDate).toDateString() : null;

        if (lastPlayDate !== today) {
            if (lastPlayDate === new Date(Date.now() - 86400000).toDateString()) {
                // 连续天数+1
                stats.dailyStreak++;
            } else {
                // 重置连续天数
                stats.dailyStreak = 1;
            }
            stats.lastPlayDate = new Date().toISOString();
        }

        return this.saveStatistics(stats);
    },

    // 清除所有数据
    clearAllData: function() {
        try {
            localStorage.removeItem(STORAGE_KEYS.GAME_PROGRESS);
            localStorage.removeItem(STORAGE_KEYS.GAME_SETTINGS);
            localStorage.removeItem(STORAGE_KEYS.STATISTICS);
            console.log('所有游戏数据已清除');
            return true;
        } catch (error) {
            console.error('清除数据失败:', error);
            return false;
        }
    },

    // 导出数据
    exportData: function() {
        try {
            const data = {
                progress: this.loadGameProgress(),
                settings: this.loadGameSettings(),
                statistics: this.loadStatistics(),
                exportDate: new Date().toISOString()
            };

            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('导出数据失败:', error);
            return null;
        }
    },

    // 导入数据
    importData: function(dataString) {
        try {
            const data = JSON.parse(dataString);

            if (data.progress) {
                this.saveGameProgress(data.progress);
            }

            if (data.settings) {
                this.saveGameSettings(data.settings);
            }

            if (data.statistics) {
                this.saveStatistics(data.statistics);
            }

            console.log('数据导入成功');
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    },

    // 获取学习统计数据
    getLearningStats: function() {
        const stats = this.loadStatistics();
        const progress = this.loadGameProgress();

        // 计算总学习时间（分钟）
        const totalPlayTimeMinutes = Math.round(stats.totalPlayTime / 60000);

        // 计算答题准确率
        const accuracy = stats.totalQuestionsAnswered > 0 ?
            Math.round((stats.correctAnswers / stats.totalQuestionsAnswered) * 100) : 0;

        // 计算学习天数
        const studyDays = stats.dailyStreak;

        // 计算掌握的单词数
        const wordsLearned = stats.wordsLearned.length;

        // 计算完成的关卡数
        const completedLevels = progress.completedLevels.length;

        return {
            totalPlayTimeMinutes,
            accuracy,
            studyDays,
            wordsLearned,
            completedLevels,
            totalQuestionsAnswered: stats.totalQuestionsAnswered,
            correctAnswers: stats.correctAnswers,
            wrongAnswers: stats.wrongAnswers,
            bestCombo: stats.bestCombo,
            gamesPlayed: stats.gamesPlayed,
            lastPlayDate: stats.lastPlayDate
        };
    },

    // 获取成就数据
    getAchievements: function() {
        const stats = this.loadStatistics();
        const learningStats = this.getLearningStats();
        const achievements = [];

        // 连续学习成就
        if (learningStats.studyDays >= 1) {
            achievements.push({
                id: 'daily_1',
                name: '初学者',
                description: '连续学习1天',
                icon: '🌟',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        if (learningStats.studyDays >= 3) {
            achievements.push({
                id: 'daily_3',
                name: '坚持者',
                description: '连续学习3天',
                icon: '🔥',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        if (learningStats.studyDays >= 7) {
            achievements.push({
                id: 'daily_7',
                name: '勇者',
                description: '连续学习7天',
                icon: '⚔️',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        // 高分成就
        if (learningStats.accuracy >= 80 && learningStats.totalQuestionsAnswered >= 50) {
            achievements.push({
                id: 'accuracy_80',
                name: '神准射手',
                description: '答题准确率达到80%',
                icon: '🎯',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        if (learningStats.accuracy >= 95 && learningStats.totalQuestionsAnswered >= 100) {
            achievements.push({
                id: 'accuracy_95',
                name: '完美主义者',
                description: '答题准确率达到95%',
                icon: '💎',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        // 完美通关成就
        if (learningStats.bestCombo >= 10) {
            achievements.push({
                id: 'combo_10',
                name: '连击达人',
                description: '获得10连击',
                icon: '⚡',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        // 关卡完成成就
        if (learningStats.completedLevels >= 10) {
            achievements.push({
                id: 'levels_10',
                name: '探索者',
                description: '完成10个关卡',
                icon: '🗺️',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        if (learningStats.completedLevels >= 50) {
            achievements.push({
                id: 'levels_50',
                name: '征服者',
                description: '完成50个关卡',
                icon: '👑',
                earned: true,
                earnedDate: stats.lastPlayDate
            });
        }

        return achievements;
    },

    // 记录成就获得
    recordAchievement: function(achievementId) {
        const stats = this.loadStatistics();

        if (!stats.achievements.includes(achievementId)) {
            stats.achievements.push(achievementId);
            return this.saveStatistics(stats);
        }

        return true;
    },

    // 获取学习曲线数据
    getLearningCurveData() {
        const stats = this.loadStatistics();
        const today = new Date().toDateString();

        // 获取或初始化每日学习数据
        if (!stats.dailyData) {
            stats.dailyData = {};
        }

        // 更新今日数据
        if (!stats.dailyData[today]) {
            stats.dailyData[today] = {
                date: today,
                questionsAnswered: 0,
                correctAnswers: 0,
                gamesPlayed: 0,
                timeSpent: 0
            };
        }

        // 获取最近7天的数据
        const last7Days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            const dayData = stats.dailyData[dateStr] || {
                date: dateStr,
                questionsAnswered: 0,
                correctAnswers: 0,
                gamesPlayed: 0,
                timeSpent: 0
            };

            last7Days.push({
                ...dayData,
                shortDate: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
                accuracy: dayData.questionsAnswered > 0 ? Math.round((dayData.correctAnswers / dayData.questionsAnswered) * 100) : 0
            });
        }

        return last7Days;
    },

    // 记录今日学习数据
    recordDailyActivity(questionsAnswered, correctAnswers, timeSpent = 0) {
        const stats = this.loadStatistics();
        const today = new Date().toDateString();

        if (!stats.dailyData) {
            stats.dailyData = {};
        }

        if (!stats.dailyData[today]) {
            stats.dailyData[today] = {
                date: today,
                questionsAnswered: 0,
                correctAnswers: 0,
                gamesPlayed: 0,
                timeSpent: 0
            };
        }

        // 累加今日数据
        stats.dailyData[today].questionsAnswered += questionsAnswered;
        stats.dailyData[today].correctAnswers += correctAnswers;
        stats.dailyData[today].gamesPlayed += 1;
        stats.dailyData[today].timeSpent += timeSpent;

        this.saveStatistics(stats);
    }
};