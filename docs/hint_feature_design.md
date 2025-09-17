# 提示功能技术设计文档

## 功能概述

为"看词选意"题型添加智能提示功能，通过显示包含目标单词的英文例句来帮助用户理解单词含义和用法。

## 用户交互设计

### 界面布局
```
┌─────────────────────────────┐
│        看词选意              │
│                             │
│      **EXAMPLE**            │  ← 英文单词
│                             │
│      💡 提示                │  ← 新增提示按钮
│                             │
│  ┌─ 例句显示区域 ─────────┐  │  ← 点击后显示
│  │ This is an example of   │  │
│  │ how to use this word.   │  │
│  └─────────────────────────┘  │
│                             │
│   [A] 选项1  [B] 选项2      │
│   [C] 选项3  [D] 选项4      │
└─────────────────────────────┘
```

### 交互流程
1. **初始状态**: 提示按钮显示为"💡 提示"
2. **点击提示**: 按钮变为"🔍 隐藏提示"，下方显示例句
3. **再次点击**: 隐藏例句，按钮恢复初始状态
4. **答题后**: 自动隐藏例句，重置按钮状态

## 技术实现方案

### 1. 数据结构扩展

**vocabulary.js 单词数据结构更新**:
```javascript
{
    id: 1,
    word: "example",
    meaning: "例子，实例",
    level: 1,
    pronunciation: "audio/example.mp3",
    examples: [  // 新增例句字段
        "This is a good example of teamwork.",
        "For example, we could go to the park."
    ]
}
```

### 2. UI组件设计

**HTML结构**:
```html
<div class="question-area">
    <div class="question-type">看词选意</div>
    <h2 id="question-word" class="word-display">example</h2>

    <!-- 新增提示按钮 -->
    <button id="hint-btn" class="hint-button" onclick="toggleHint()">
        💡 提示
    </button>

    <!-- 新增例句显示区域 -->
    <div id="hint-area" class="hint-area hidden">
        <div class="example-sentence">
            <!-- 例句内容由JS动态填充 -->
        </div>
    </div>
</div>
```

**CSS样式**:
```css
.hint-button {
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    margin: 12px 0;
    transition: all 0.3s ease;
}

.hint-area {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    padding: 16px;
    margin: 12px 0;
    transition: all 0.4s ease;
}

.hint-area.hidden {
    display: none;
}

.example-sentence {
    font-style: italic;
    color: #475569;
    text-align: center;
    line-height: 1.6;
}
```

### 3. JavaScript逻辑

**核心函数实现**:
```javascript
// 全局状态
let hintState = {
    isVisible: false,
    currentWord: null,
    currentExamples: []
};

// 切换提示显示状态
function toggleHint() {
    const btn = document.getElementById('hint-btn');
    const area = document.getElementById('hint-area');

    if (hintState.isVisible) {
        // 隐藏提示
        area.classList.add('hidden');
        btn.innerHTML = '💡 提示';
        btn.classList.remove('active');
        hintState.isVisible = false;
    } else {
        // 显示提示
        showHintExample();
        area.classList.remove('hidden');
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
                "${randomExample}"
            </div>
        `;
    }
}

// 初始化提示数据
function initHintForQuestion(word) {
    const wordData = VocabularyAPI.getWordByText(word);
    hintState.currentWord = word;
    hintState.currentExamples = wordData ? wordData.examples : [];

    // 重置提示状态
    resetHintState();
}

// 重置提示状态
function resetHintState() {
    const btn = document.getElementById('hint-btn');
    const area = document.getElementById('hint-area');

    area.classList.add('hidden');
    btn.innerHTML = '💡 提示';
    btn.classList.remove('active');
    hintState.isVisible = false;
}
```

### 4. 游戏逻辑集成

**在 game.js 中的集成点**:

1. **题目生成时**: 调用 `initHintForQuestion(word)` 初始化提示数据
2. **切换题目时**: 调用 `resetHintState()` 重置提示状态
3. **答题完成后**: 自动隐藏提示区域

```javascript
// 在 displayQuestion 函数中添加
function displayQuestion() {
    // 现有逻辑...

    // 初始化提示功能（仅对"看词选意"题型）
    if (currentQuestion.type === 'word-to-meaning') {
        initHintForQuestion(currentQuestion.word);
        document.getElementById('hint-btn').style.display = 'block';
    } else {
        document.getElementById('hint-btn').style.display = 'none';
        resetHintState();
    }
}
```

## 数据准备计划

### 例句来源策略
1. **手工精选**: 为高频词汇编写简单易懂的例句
2. **模板生成**: 使用常见句型模板批量生成例句
3. **分批实现**: 优先为前50个单词添加例句，逐步扩展

### 例句质量标准
- **长度**: 10-15个单词，不超过20个单词
- **难度**: 使用简单词汇，避免生僻语法
- **实用性**: 贴近日常生活场景
- **多样性**: 每个单词2-3个不同场景的例句

## 性能考虑

1. **按需加载**: 例句数据随词汇数据一起加载，无需额外请求
2. **缓存策略**: 当前题目的例句数据缓存在内存中
3. **动画优化**: 使用CSS transition而非JavaScript动画

## 测试计划

### 功能测试
- [ ] 提示按钮点击切换正常
- [ ] 例句内容正确显示
- [ ] 题目切换时状态重置
- [ ] 听音选词题型不显示提示按钮

### 兼容性测试
- [ ] 移动端触摸交互
- [ ] 不同屏幕尺寸适配
- [ ] 各主流浏览器兼容

### 用户体验测试
- [ ] 提示按钮位置不干扰答题
- [ ] 例句内容有助于理解单词
- [ ] 动画效果流畅自然

## 后续扩展可能

1. **智能例句**: 根据用户答错情况调整例句难度
2. **多语言例句**: 提供中英对照例句
3. **语音朗读**: 为例句添加发音功能
4. **个性化提示**: 根据用户水平定制提示内容