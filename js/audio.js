// 单词勇者 - 音频管理系统
// 负责游戏音效和语音播放

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.7;
        this.init();
    }

    // 初始化音频系统
    init() {
        try {
            // 创建音频上下文
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.createSounds();
            console.log('音频系统初始化成功');
        } catch (error) {
            console.warn('音频系统初始化失败:', error);
            this.enabled = false;
        }
    }

    // 创建音效
    createSounds() {
        // 创建基础音效
        this.sounds = {
            correct: this.createBeepSound(800, 0.2, 'sine'),
            wrong: this.createBeepSound(200, 0.3, 'square'),
            complete: this.createSuccessSound(),
            combo: this.createComboSound(),
            click: this.createBeepSound(600, 0.1, 'sine')
        };
    }

    // 创建简单的beep音效
    createBeepSound(frequency, duration, type = 'sine') {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    // 创建成功音效
    createSuccessSound() {
        return () => {
            if (!this.enabled || !this.audioContext) return;

            const frequencies = [523, 659, 784]; // C, E, G
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                }, index * 100);
            });
        };
    }

    // 创建连击音效
    createComboSound() {
        return (comboCount = 1) => {
            if (!this.enabled || !this.audioContext) return;

            const baseFreq = 400;
            const frequency = baseFreq + (comboCount * 50);
            const duration = Math.min(0.2 + (comboCount * 0.05), 0.5);

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.audioContext.currentTime + duration);
            oscillator.type = 'sine';

            const volume = Math.min(this.volume * (0.2 + comboCount * 0.05), this.volume * 0.5);
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    // 播放音效
    play(soundName, ...args) {
        if (!this.enabled) return;

        // 确保音频上下文已激活
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const sound = this.sounds[soundName];
        if (sound) {
            try {
                sound(...args);
            } catch (error) {
                console.warn(`播放音效 ${soundName} 失败:`, error);
            }
        }
    }

    // 播放单词发音
    async playWordPronunciation(word) {
        if (!this.enabled) return;

        try {
            // 使用Web Speech API进行语音合成
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                utterance.volume = this.volume;

                // 尝试使用英语语音
                const voices = speechSynthesis.getVoices();
                const englishVoice = voices.find(voice =>
                    voice.lang.startsWith('en') && voice.name.includes('US')
                ) || voices.find(voice => voice.lang.startsWith('en'));

                if (englishVoice) {
                    utterance.voice = englishVoice;
                }

                speechSynthesis.speak(utterance);

                return new Promise((resolve, reject) => {
                    utterance.onend = resolve;
                    utterance.onerror = reject;
                });
            }
        } catch (error) {
            console.warn('播放单词发音失败:', error);
        }
    }

    // 设置音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // 启用/禁用音效
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.audioContext) {
            this.audioContext.suspend();
        } else if (enabled && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 获取设置
    getSettings() {
        return {
            enabled: this.enabled,
            volume: this.volume
        };
    }

    // 应用设置
    applySettings(settings) {
        if (settings.enabled !== undefined) {
            this.setEnabled(settings.enabled);
        }
        if (settings.volume !== undefined) {
            this.setVolume(settings.volume);
        }
    }
}

// 懒加载管理器
class LazyLoader {
    constructor() {
        this.loadedResources = new Set();
        this.pendingLoads = new Map();
        this.observers = [];
    }

    // 注册进度观察者
    addProgressObserver(callback) {
        this.observers.push(callback);
    }

    // 通知进度变化
    notifyProgress(current, total, type) {
        this.observers.forEach(callback => {
            callback({ current, total, type });
        });
    }

    // 懒加载音频资源
    async loadAudioResource(resourceId, loadFunction) {
        if (this.loadedResources.has(resourceId)) {
            return true; // Already loaded
        }

        if (this.pendingLoads.has(resourceId)) {
            return this.pendingLoads.get(resourceId); // Already loading
        }

        const loadPromise = new Promise(async (resolve, reject) => {
            try {
                this.notifyProgress(0, 1, `Loading ${resourceId}...`);
                await loadFunction();
                this.loadedResources.add(resourceId);
                this.notifyProgress(1, 1, `Loaded ${resourceId}`);
                resolve(true);
            } catch (error) {
                console.warn(`Failed to load resource ${resourceId}:`, error);
                reject(error);
            }
        });

        this.pendingLoads.set(resourceId, loadPromise);
        return loadPromise;
    }

    // 预加载关键资源
    async preloadCriticalResources() {
        const criticalResources = [
            'game-sounds',
            'ui-interactions',
            'basic-voices'
        ];

        this.notifyProgress(0, criticalResources.length, 'Loading critical resources...');

        for (let i = 0; i < criticalResources.length; i++) {
            const resourceId = criticalResources[i];
            try {
                await this.loadAudioResource(resourceId, () => this.loadResourceByType(resourceId));
                this.notifyProgress(i + 1, criticalResources.length, `Loaded ${resourceId}`);
            } catch (error) {
                console.warn(`Failed to preload ${resourceId}:`, error);
            }
        }

        this.notifyProgress(criticalResources.length, criticalResources.length, 'Critical resources loaded');
    }

    // 根据类型加载资源
    async loadResourceByType(resourceType) {
        return new Promise((resolve) => {
            // Simulate loading time for different resource types
            const loadTimes = {
                'game-sounds': 300,
                'ui-interactions': 200,
                'basic-voices': 500
            };

            setTimeout(() => {
                resolve();
            }, loadTimes[resourceType] || 200);
        });
    }

    // 检查资源是否已加载
    isResourceLoaded(resourceId) {
        return this.loadedResources.has(resourceId);
    }

    // 批量加载关卡所需资源
    async loadLevelResources(levelId) {
        const resourceId = `level-${levelId}`;
        if (this.isResourceLoaded(resourceId)) return true;

        return this.loadAudioResource(resourceId, async () => {
            // 模拟加载关卡特定资源
            await new Promise(resolve => setTimeout(resolve, 150));
        });
    }
}

// 进度指示器管理
class LoadingIndicator {
    constructor() {
        this.isVisible = false;
        this.indicator = null;
        this.progressBar = null;
        this.statusText = null;
        this.createIndicator();
    }

    // 创建进度指示器
    createIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden';
        this.indicator.id = 'loading-indicator';

        this.indicator.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
                <div class="text-center">
                    <div class="text-2xl mb-4">🎮</div>
                    <h3 class="font-bold text-lg mb-2 text-slate-800">加载中...</h3>
                    <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-300" style="width: 0%" id="progress-bar"></div>
                    </div>
                    <p class="text-sm text-slate-600" id="status-text">准备加载资源</p>
                </div>
            </div>
        `;

        document.body.appendChild(this.indicator);
        this.progressBar = document.getElementById('progress-bar');
        this.statusText = document.getElementById('status-text');
    }

    // 显示进度指示器
    show() {
        if (this.indicator) {
            this.indicator.classList.remove('hidden');
            this.isVisible = true;
        }
    }

    // 隐藏进度指示器
    hide() {
        if (this.indicator) {
            this.indicator.classList.add('hidden');
            this.isVisible = false;
        }
    }

    // 更新进度
    updateProgress(current, total, status) {
        if (!this.isVisible) return;

        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }

        if (this.statusText && status) {
            this.statusText.textContent = status;
        }

        // 如果加载完成，延迟隐藏指示器
        if (current >= total && total > 0) {
            setTimeout(() => {
                this.hide();
            }, 500);
        }
    }
}

// 扩展AudioManager以支持懒加载
AudioManager.prototype.loadVoicesLazily = async function(words) {
    if (!words || words.length === 0) return;

    // 预加载前几个单词的语音
    const priorityWords = words.slice(0, 5);

    for (const word of priorityWords) {
        try {
            // 预缓存语音合成，确保首次播放更流畅
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.volume = 0; // 静音预加载
                speechSynthesis.speak(utterance);
                speechSynthesis.cancel(); // 立即取消，只为初始化
            }
        } catch (error) {
            console.warn(`Failed to preload voice for word: ${word}`, error);
        }
    }
};

// 创建全局实例
window.lazyLoader = new LazyLoader();
window.loadingIndicator = new LoadingIndicator();
window.audioManager = new AudioManager();

// 设置进度观察
window.lazyLoader.addProgressObserver(({ current, total, type }) => {
    window.loadingIndicator.updateProgress(current, total, type);
});