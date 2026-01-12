<template>
  <div ref="editorContainer" class="code-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { EditorView, keymap, lineNumbers, showTooltip, tooltips } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap } from '@codemirror/commands';
import type { Tooltip } from '@codemirror/view';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'selectionChange': [selectedText: string];
  'requestHint': [];
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

// State effect to hide tooltip
const hideTooltipEffect = StateEffect.define<boolean>();

// Tooltip extension that shows hint button on selection
const hintTooltipExtension = () => {
  return StateField.define<readonly Tooltip[]>({
    create() {
      return [];
    },

    update(currentTooltips, tr) {
      // Check if we should force hide the tooltip
      for (const effect of tr.effects) {
        if (effect.is(hideTooltipEffect)) {
          return [];
        }
      }

      // Only update on selection changes
      if (!tr.selection) return currentTooltips;

      const selection = tr.state.selection.main;
      const hasSelection = selection.from !== selection.to;

      if (!hasSelection) {
        return [];
      }

      const selectedText = tr.state.sliceDoc(selection.from, selection.to);
      if (!selectedText.trim()) {
        return [];
      }

      return [
        {
          pos: selection.to,
          above: true,
          strictSide: true,
          arrow: true,
          create(view) {
            const dom = document.createElement('div');
            dom.className = 'cm-hint-tooltip';

            const button = document.createElement('button');
            button.textContent = '💡 Explain this code';
            button.className = 'cm-hint-button';
            button.addEventListener('mousedown', (e) => {
              // Prevent the button from taking focus and clearing selection
              e.preventDefault();
              e.stopPropagation();
            });
            button.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              emit('requestHint');

              // Hide the tooltip without clearing selection
              view.dispatch({
                effects: hideTooltipEffect.of(true)
              });
            });

            dom.appendChild(button);
            return { dom };
          },
        },
      ];
    },

    provide: (field) => showTooltip.computeN([field], (state) => state.field(field)),
  });
};

onMounted(() => {
  if (!editorContainer.value) return;

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      python(),
      oneDark,
      lineNumbers(),
      keymap.of(defaultKeymap),
      tooltips(),
      hintTooltipExtension(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString());
        }
        if (update.selectionSet) {
          const selection = update.state.selection.main;
          const selectedText = update.state.sliceDoc(selection.from, selection.to);
          emit('selectionChange', selectedText);
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'monospace',
        },
        '.cm-hint-tooltip': {
          backgroundColor: '#2d2d30',
          border: '1px solid #007acc',
          borderRadius: '4px',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        },
        '.cm-hint-button': {
          backgroundColor: '#007acc',
          color: '#ffffff',
          border: 'none',
          borderRadius: '3px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background-color 0.2s',
        },
        '.cm-hint-button:hover': {
          backgroundColor: '#005a9e',
        },
      }),
    ],
  });

  editorView = new EditorView({
    state: startState,
    parent: editorContainer.value,
  });
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && newValue !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue,
        },
      });
    }
  }
);
</script>

<style scoped>
.code-editor {
  height: 100%;
  width: 100%;
}
</style>
