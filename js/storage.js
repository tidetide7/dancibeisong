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
    }
};