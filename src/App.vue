<template>
  <div class="app">
    <header class="header">
      <h1>Code Hint - Python Learning Tool</h1>
      <div class="model-status">
        <div v-if="modelStatus.loading" class="status-loading">
          <span class="spinner"></span>
          <span>Loading model... {{ modelStatus.progress }}%</span>
        </div>
        <div v-else-if="modelStatus.ready" class="status-ready">
          <span class="status-dot ready"></span>
          <span>Model Ready</span>
        </div>
        <div v-else-if="modelStatus.error" class="status-error">
          <span class="status-dot error"></span>
          <span>Error: {{ modelStatus.error }}</span>
        </div>
      </div>
    </header>

    <div class="controls">
      <label for="model-select">Model:</label>
      <select
        id="model-select"
        v-model="selectedModel"
        @change="handleModelChange"
        :disabled="modelStatus.loading"
      >
        <option
          v-for="(model, index) in AVAILABLE_MODELS"
          :key="index"
          :value="index"
        >
          {{ model.repo }}
        </option>
      </select>

      <label for="example-select">Code Examples:</label>
      <select
        id="example-select"
        v-model="selectedExample"
        @change="loadExample"
      >
        <option :value="null">-- Select an example --</option>
        <option
          v-for="(example, index) in examples"
          :key="index"
          :value="index"
        >
          {{ example.title }}
        </option>
      </select>
    </div>

    <div class="content">
      <div class="editor-section">
        <h2>Python Code Editor</h2>
        <div class="editor-wrapper">
          <CodeEditor
            v-model="code"
            @selection-change="handleSelectionChange"
          />
        </div>
      </div>

      <div class="explanation-section">
        <h2>Code Explanation</h2>
        <div class="explanation-wrapper">
          <div v-if="generating" class="generating">
            <span class="spinner-small"></span>
            <span>Generating explanation...</span>
          </div>
          <div v-else-if="explanation" class="explanation-text">
            {{ explanation }}
          </div>
          <div v-else class="explanation-placeholder">
            Select some code to see an explanation
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import { useCodeHintModel, AVAILABLE_MODELS } from './composables/useCodeHintModel';
import { examples } from './examples';

const { status: modelStatus, loadModel, generateHint } = useCodeHintModel();

const code = ref('# Type or select Python code here...\n');
const selectedExample = ref<number | null>(null);
const selectedModel = ref<number>(0); // Default to first model
const explanation = ref('');
const generating = ref(false);

let debounceTimer: number | null = null;

const loadExample = () => {
  if (selectedExample.value !== null) {
    code.value = examples[selectedExample.value].code;
  }
};

const handleModelChange = () => {
  const model = AVAILABLE_MODELS[selectedModel.value];
  explanation.value = '';
  loadModel(model);
};

const handleSelectionChange = async (selectedText: string) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!selectedText.trim()) {
    explanation.value = '';
    return;
  }

  if (!modelStatus.value.ready) {
    return;
  }

  debounceTimer = window.setTimeout(async () => {
    generating.value = true;
    try {
      console.log('=== Code Hint Request ===');
      console.log('Selected code:', selectedText);

      const hint = await generateHint(selectedText);

      console.log('=== Code Hint Response ===');
      console.log('Generated hint:', hint);

      explanation.value = hint;
    } catch (error) {
      console.error('Failed to generate hint:', error);
      explanation.value = 'Failed to generate explanation. Please try again.';
    } finally {
      generating.value = false;
    }
  }, 500);
};

onMounted(() => {
  loadModel(AVAILABLE_MODELS[selectedModel.value]);
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

#app {
  height: 100vh;
  width: 100vw;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.header {
  background-color: #252526;
  padding: 1rem 2rem;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.status-loading,
.status-ready,
.status-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.ready {
  background-color: #4ec9b0;
}

.status-dot.error {
  background-color: #f48771;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #3e3e42;
  border-top-color: #007acc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 12px;
  height: 12px;
  border: 2px solid #3e3e42;
  border-top-color: #007acc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.controls {
  background-color: #2d2d30;
  padding: 1rem 2rem;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.controls label {
  font-weight: 500;
}

.controls select {
  padding: 0.5rem;
  background-color: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 200px;
}

.controls select:focus {
  outline: 1px solid #007acc;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-section,
.explanation-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-section {
  border-right: 1px solid #3e3e42;
}

.editor-section h2,
.explanation-section h2 {
  background-color: #2d2d30;
  padding: 0.75rem 2rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #cccccc;
  border-bottom: 1px solid #3e3e42;
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
}

.explanation-wrapper {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.generating {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #9cdcfe;
  font-style: italic;
}

.explanation-text {
  line-height: 1.6;
  color: #d4d4d4;
  font-size: 1rem;
}

.explanation-placeholder {
  color: #6a737d;
  font-style: italic;
  font-size: 0.95rem;
}
</style>
