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

// 创建全局音频管理器实例
window.audioManager = new AudioManager();