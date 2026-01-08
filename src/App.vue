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
      <div class="control-group">
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
      </div>

      <button
        class="clear-cache-btn"
        @click="handleClearCache"
        :disabled="clearing || modelStatus.loading"
      >
        {{ clearing ? "Clearing..." : "Clear Cache" }}
      </button>
    </div>

    <div class="content">
      <div class="explanation-section">
        <h2>What does this code do?</h2>
        <div class="explanation-wrapper">
          <div v-if="explanation" class="explanation-text">
            {{ explanation
            }}<span v-if="generating" class="typing-cursor">▊</span>
          </div>
          <div v-else-if="generating" class="generating">
            <span class="spinner-small"></span>
            <span>Thinking...</span>
          </div>
          <div v-else class="explanation-placeholder">
            Select some code to see an explanation
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="editor-header">
          <h2>Python Code Editor</h2>
          <div class="example-selector">
            <label for="example-select">Examples:</label>
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
        </div>
        <div class="editor-wrapper">
          <CodeEditor
            v-model="code"
            @selection-change="handleSelectionChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import CodeEditor from "./components/CodeEditor.vue";
import {
  useCodeHintModel,
  AVAILABLE_MODELS,
} from "./composables/useCodeHintModel";
import { examples } from "./examples";

const {
  status: modelStatus,
  loadModel,
  generateHint,
  clearCache,
} = useCodeHintModel();

const code = ref("# Type or select Python code here...\n");
const selectedExample = ref<number | null>(null);
const selectedModel = ref<number>(0); // Default to first model
const explanation = ref("");
const generating = ref(false);
const clearing = ref(false);

let debounceTimer: number | null = null;

const loadExample = () => {
  if (selectedExample.value !== null) {
    code.value = examples[selectedExample.value].code;
  }
};

const handleModelChange = () => {
  const model = AVAILABLE_MODELS[selectedModel.value];
  explanation.value = "";
  loadModel(model);
};

const handleClearCache = async () => {
  if (
    !confirm("This will clear all cached models and reload the page. Continue?")
  ) {
    return;
  }

  clearing.value = true;
  try {
    await clearCache();
    // Reload the page to reset the state
    window.location.reload();
  } catch (error) {
    console.error("Failed to clear cache:", error);
    alert("Failed to clear cache. Please try again.");
    clearing.value = false;
  }
};

const handleSelectionChange = async (selectedCode: string) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!selectedCode.trim()) {
    explanation.value = "";
    return;
  }

  if (!modelStatus.value.ready) {
    return;
  }

  debounceTimer = window.setTimeout(async () => {
    generating.value = true;
    explanation.value = ""; // Clear previous explanation
    try {
      console.log("=== Code Hint Request ===");
      console.log("Selected code:", selectedCode);

      await generateHint(code.value, selectedCode, (token: string) => {
        // Stream each token to the UI as it arrives
        explanation.value += token;
      });

      console.log("=== Code Hint Response ===");
      console.log("Generated hint:", explanation.value);
    } catch (error) {
      console.error("Failed to generate hint:", error);
      explanation.value = "Failed to generate explanation. Please try again.";
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
  touch-action: pan-x pan-y;
}

#app {
  height: 100vh;
  width: 100vw;
  touch-action: pan-x pan-y;
}

/* Allow text selection in code editor and explanation */
.code-editor,
.explanation-text {
  -webkit-user-select: text;
  user-select: text;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 250px;
}

.controls label {
  font-weight: 500;
  white-space: nowrap;
}

.controls select {
  padding: 0.5rem;
  background-color: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  flex: 1;
}

.controls select:focus {
  outline: 1px solid #007acc;
}

.clear-cache-btn {
  padding: 0.5rem 1rem;
  background-color: #c5534a;
  color: #ffffff;
  border: 1px solid #a03d36;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-left: auto;
}

.clear-cache-btn:hover:not(:disabled) {
  background-color: #d66761;
}

.clear-cache-btn:disabled {
  background-color: #6a6a6a;
  border-color: #555555;
  cursor: not-allowed;
  opacity: 0.6;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.editor-section,
.explanation-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explanation-section {
  flex: 0 0 auto;
  max-height: 30vh;
  min-height: 150px;
  border-bottom: 1px solid #3e3e42;
}

.editor-section {
  flex: 1;
}

.editor-header {
  background-color: #2d2d30;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.editor-header h2 {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #cccccc;
  margin: 0;
}

.example-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.example-selector label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #cccccc;
  white-space: nowrap;
}

.example-selector select {
  padding: 0.4rem 0.5rem;
  background-color: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  min-width: 180px;
}

.example-selector select:focus {
  outline: 1px solid #007acc;
}

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

.typing-cursor {
  color: #007acc;
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .header {
    padding: 0.75rem 1rem;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .header h1 {
    font-size: 1.2rem;
  }

  .model-status {
    font-size: 0.8rem;
    align-self: flex-start;
  }

  .controls {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .control-group {
    width: 100%;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .controls label {
    font-size: 0.85rem;
  }

  .controls select {
    font-size: 0.85rem;
  }

  .clear-cache-btn {
    width: 100%;
    margin-left: 0;
    font-size: 0.85rem;
  }

  .editor-header {
    padding: 0.5rem 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .editor-header h2 {
    font-size: 0.85rem;
  }

  .example-selector {
    width: 100%;
    justify-content: space-between;
  }

  .example-selector label {
    font-size: 0.8rem;
  }

  .example-selector select {
    flex: 1;
    min-width: 0;
    font-size: 0.8rem;
    padding: 0.35rem 0.4rem;
  }

  .explanation-section h2 {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .explanation-section {
    min-height: 120px;
    max-height: 35vh;
  }

  .explanation-wrapper {
    padding: 1rem;
  }

  .explanation-text {
    font-size: 0.9rem;
  }

  .explanation-placeholder {
    font-size: 0.85rem;
  }

  .generating {
    font-size: 0.9rem;
  }
}

/* Extra small devices (portrait phones) */
@media (max-width: 480px) {
  .header h1 {
    font-size: 1rem;
  }

  .model-status {
    font-size: 0.75rem;
  }

  .controls {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .controls label {
    font-size: 0.8rem;
  }

  .controls select {
    padding: 0.4rem;
    font-size: 0.8rem;
  }

  .clear-cache-btn {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }

  .editor-header {
    padding: 0.4rem 0.5rem;
  }

  .editor-header h2 {
    font-size: 0.8rem;
  }

  .example-selector label {
    font-size: 0.75rem;
  }

  .example-selector select {
    font-size: 0.75rem;
    padding: 0.3rem 0.35rem;
  }

  .explanation-section h2 {
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
  }

  .explanation-wrapper {
    padding: 0.75rem;
  }

  .explanation-text,
  .explanation-placeholder,
  .generating {
    font-size: 0.85rem;
  }
}
</style>
