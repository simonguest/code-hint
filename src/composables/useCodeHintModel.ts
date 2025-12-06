import { ref } from 'vue';
import { Wllama, type WllamaChatMessage } from '@wllama/wllama';

export interface ModelStatus {
  loading: boolean;
  ready: boolean;
  progress: number;
  error: string | null;
}

export function useCodeHintModel() {
  const status = ref<ModelStatus>({
    loading: false,
    ready: false,
    progress: 0,
    error: null,
  });

  let wllama: Wllama | null = null;

  const loadModel = async () => {
    if (wllama || status.value.loading) {
      return;
    }

    status.value.loading = true;
    status.value.error = null;
    status.value.progress = 0;

    try {
      console.log('Starting Wllama model load from simonguest/code-hint...');

      const CONFIG_PATHS = {
        'single-thread/wllama.wasm': '/esm/single-thread/wllama.wasm',
        'multi-thread/wllama.wasm': '/esm/multi-thread/wllama.wasm',
      };

      wllama = new Wllama(CONFIG_PATHS);

      const progressCallback = ({ loaded, total }: { loaded: number; total: number }) => {
        const progressPercentage = Math.round((loaded / total) * 100);
        status.value.progress = progressPercentage;
        console.log(`Downloading model... ${progressPercentage}%`);
      };

      await wllama.loadModelFromHF(
        'simonguest/gemma-3-270m-it-code-hint',
        'gemma-3-270m-it-code-hint-Q4_K_M.gguf',
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

  const generateHint = async (code: string): Promise<string> => {
    if (!wllama || !status.value.ready) {
      throw new Error('Model not ready');
    }

    try {
      const messages: WllamaChatMessage[] = [
        {
          role: 'user',
          content: `\`\`\`python\n${code}\n\`\`\``
        },
      ];

      console.log('Model request messages:', messages);

      const stream = await wllama.createChatCompletion(messages, {
        nPredict: 100,
        sampling: {
          temp: 0.7,
          top_k: 40,
          top_p: 0.9,
        },
        useCache: true,
      });

      let fullResponse = '';
      let tokenCount = 0;
      console.log('=== Streaming tokens ===');
      for await (const chunk of stream) {
        tokenCount++;
        // console.log(`Token ${tokenCount}:`, chunk);
        fullResponse += chunk;
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

  return {
    status,
    loadModel,
    generateHint,
  };
}
