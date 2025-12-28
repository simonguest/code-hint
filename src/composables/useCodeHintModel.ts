import { ref } from 'vue';
import { Wllama, type WllamaChatMessage, ModelManager } from '@wllama/wllama';

export interface ModelStatus {
  loading: boolean;
  ready: boolean;
  progress: number;
  error: string | null;
}

export interface ModelConfig {
  repo: string;
  file: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    repo: 'simonguest/gemma-3-1b-it-code-hint-3',
    file: 'gemma-3-1b-it-code-hint-3-Q4_K_M.gguf',
  },
];

export function useCodeHintModel() {
  const status = ref<ModelStatus>({
    loading: false,
    ready: false,
    progress: 0,
    error: null,
  });

  let wllama: Wllama | null = null;

  const loadModel = async (modelConfig: ModelConfig) => {
    // If already loading, don't start another load
    if (status.value.loading) {
      return;
    }

    // If a model is already loaded, unload it first
    if (wllama) {
      console.log('Unloading previous model...');
      await wllama.exit();
      wllama = null;
      status.value.ready = false;
    }

    status.value.loading = true;
    status.value.error = null;
    status.value.progress = 0;

    try {
      console.log(`Starting Wllama model load from ${modelConfig.repo}...`);

      const CONFIG_PATHS = {
        'single-thread/wllama.wasm': new URL(/* vite-ignore */ '/esm/single-thread/wllama.wasm', import.meta.url).toString(),
        'multi-thread/wllama.wasm': new URL(/* vite-ignore */ '/esm/multi-thread/wllama.wasm', import.meta.url).toString(),
      };

      wllama = new Wllama(CONFIG_PATHS);

      const progressCallback = ({ loaded, total }: { loaded: number; total: number }) => {
        const progressPercentage = Math.round((loaded / total) * 100);
        status.value.progress = progressPercentage;
        console.log(`Downloading model... ${progressPercentage}%`);
      };

      await wllama.loadModelFromHF(
        modelConfig.repo,
        modelConfig.file,
        {
          progressCallback,
        }
      );

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
    if (!wllama || !status.value.ready) {
      throw new Error('Model not ready');
    }

    try {
      const messages: WllamaChatMessage[] = [
        {
          role: 'user',
          content: `<code>\n${code}\n</code><highlight>\n${highlightedCode}\n</highlight>`
        },
      ];

      console.log('Model request messages:', messages);

      const stream = await wllama.createChatCompletion(messages, {
        nPredict: 256,
        sampling: {
          temp: 0.7,
          top_k: 40,
          top_p: 0.9,
        },
        useCache: false,
      });

      let fullResponse = '';
      let tokenCount = 0;
      console.log('=== Streaming tokens ===');
      for await (const chunk of stream) {
        tokenCount++;
        fullResponse += chunk;

        // Call the onToken callback if provided
        if (onToken) {
          onToken(chunk);
          // Allow the browser to paint by yielding to the event loop
          await new Promise(resolve => setTimeout(resolve, 0));
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
      console.log('Clearing model cache using Wllama ModelManager...');

      // Unload current model if loaded
      if (wllama) {
        console.log('Unloading current model...');
        await wllama.exit();
        wllama = null;
        status.value.ready = false;
      }

      // Use Wllama's built-in ModelManager.clear() method
      // This clears all cached models from IndexedDB
      const modelManager = new ModelManager();
      await modelManager.clear();
      console.log('Wllama cache cleared successfully');

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
