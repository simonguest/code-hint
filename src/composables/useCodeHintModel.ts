import { ref } from 'vue';
import * as webllm from '@mlc-ai/web-llm';

export interface ModelStatus {
  loading: boolean;
  ready: boolean;
  progress: number;
  error: string | null;
}

export interface ModelConfig {
  repo: string;
  modelId: string;
  modelLib: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
    repo: 'simonguest/Qwen3-0.6B-code-hint-3-MLC',
    modelId: 'Qwen3-0.6B-it-code-hint-3',
    modelLib: './Qwen3-0.6B-code-hint-3-webgpu.wasm',
  },
  {
    repo: 'simonguest/Qwen3-1.7B-code-hint-3-MLC',
    modelId: 'Qwen3-1.7B-it-code-hint-3',
    modelLib: './Qwen3-1.7B-code-hint-3-webgpu.wasm',
  },
];

export function useCodeHintModel() {
  const status = ref<ModelStatus>({
    loading: false,
    ready: false,
    progress: 0,
    error: null,
  });

  let engine: webllm.MLCEngineInterface | null = null;

  const loadModel = async (modelConfig: ModelConfig) => {
    // If already loading, don't start another load
    if (status.value.loading) {
      return;
    }

    // If a model is already loaded, unload it first
    if (engine) {
      console.log('Unloading previous model...');
      await engine.unload();
      engine = null;
      status.value.ready = false;
    }

    status.value.loading = true;
    status.value.error = null;
    status.value.progress = 0;

    try {
      console.log(`Starting WebLLM model load from ${modelConfig.repo}...`);

      const appConfig: webllm.AppConfig = {
        model_list: [
          {
            model: `https://huggingface.co/${modelConfig.repo}`,
            model_id: modelConfig.modelId,
            model_lib: modelConfig.modelLib,
            overrides: {
              //sliding_window_size: -1, // Disable sliding window
              //context_window_size: -1, // Full context window
              temperature: 0.5,
              //attention_sink_size: 0
            },
          },
        ],
      };

      const initProgressCallback = (report: webllm.InitProgressReport) => {
        const progressPercentage = Math.round(report.progress * 100);
        status.value.progress = progressPercentage;
        console.log(`${report.text} - ${progressPercentage}%`);
      };

      engine = await webllm.CreateMLCEngine(modelConfig.modelId, {
        appConfig,
        initProgressCallback,
      });

      console.log('Model loaded successfully');
      status.value.ready = true;
      status.value.loading = false;
      status.value.progress = 100;
    } catch (error) {
      console.error('Detailed error loading model:', error);

      let errorMessage = 'Failed to load model';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = `Unknown error: ${String(error)}`;
      }

      status.value.error = errorMessage;
      status.value.loading = false;
      status.value.ready = false;
    }
  };

  const generateHint = async (
    code: string,
    highlightedCode: string,
    onToken?: (token: string) => void
  ): Promise<string> => {
    if (!engine || !status.value.ready) {
      throw new Error('Model not ready');
    }

    try {
      //const prompt = `<code>\n${code}\n</code>\n<highlight>\n${highlightedCode}\n</highlight>`;

      console.log('Model request prompt:', prompt);

      const chunks = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: `<code>\n${code}\n</code>\n`},
          { role: 'user', content: `<highlight>\n${highlightedCode}\n</highlight>` }],
        temperature: 0.7,
        max_tokens: 256,
        stream: true,
      });

      let fullResponse = '';
      let tokenCount = 0;
      let isInThinkingBlock = false;
      let hasStartedResponse = false; // Track if we've output any non-whitespace content
      console.log('=== Streaming tokens ===');

      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          tokenCount++;

          // Track if we're inside a thinking block
          let processedDelta = '';
          for (let i = 0; i < delta.length; i++) {
            const char = delta[i];

            // Check if we're entering a thinking block
            if (!isInThinkingBlock && delta.substring(i).startsWith('<think>')) {
              isInThinkingBlock = true;
              i += 6; // Skip past '<think>'
              continue;
            }

            // Check if we're exiting a thinking block
            if (isInThinkingBlock && delta.substring(i).startsWith('</think>')) {
              isInThinkingBlock = false;
              i += 7; // Skip past '</think>'
              continue;
            }

            // Only add characters if we're not in a thinking block
            if (!isInThinkingBlock) {
              processedDelta += char;
            }
          }

          if (processedDelta) {
            // Skip leading newlines until we have actual content
            if (!hasStartedResponse) {
              const trimmed = processedDelta.replace(/^\n+/, '');
              if (trimmed.length > 0) {
                hasStartedResponse = true;
                processedDelta = trimmed;
              } else {
                processedDelta = '';
              }
            }

            if (processedDelta) {
              fullResponse += processedDelta;

              // Call the onToken callback if provided
              if (onToken) {
                onToken(processedDelta);
                // Allow the browser to paint by yielding to the event loop
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          }
        }
      }

      console.log('=== End of stream ===');
      console.log(`Total tokens: ${tokenCount}`);
      console.log('Full response:', fullResponse);

      return fullResponse.trim();
    } catch (error) {
      console.error('Error generating hint:', error);
      throw error;
    }
  };

  const clearCache = async () => {
    try {
      console.log('Clearing WebLLM cache...');

      // Unload current model if loaded
      if (engine) {
        console.log('Unloading current model...');
        await engine.unload();
        engine = null;
        status.value.ready = false;
      }

      // Clear the cache using the serviceWorker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // WebLLM uses Cache Storage API, clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Cache Storage cleared');
      }

      // Also clear IndexedDB used by WebLLM
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log(`Deleted IndexedDB: ${db.name}`);
        }
      }

      console.log('WebLLM cache cleared successfully');

      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  };

  return {
    status,
    loadModel,
    generateHint,
    clearCache,
  };
}
