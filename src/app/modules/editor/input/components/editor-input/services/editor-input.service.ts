import { Injectable, signal, computed } from '@angular/core';
import { EditorInputConfig, EditorState } from '../types/editor-input.types';

@Injectable()
export class EditorInputService {
  // Config signal
  readonly config = signal<EditorInputConfig>({
    placeholder: 'Type your content here...',
    maxLength: 1000,
    readOnly: false
  });

  // State signal
  readonly state = signal<EditorState>({
    htmlContent: '',
    textContent: '',
    charCount: 0,
    isFocused: false
  });

  // Computed signal for character count
  readonly charCount = computed(() => this.state().charCount);

  // Computed signal for character limit reaching status
  readonly isLimitReached = computed(() => {
    const max = this.config().maxLength;
    if (max === undefined) return false;
    return this.state().charCount >= max;
  });

  // Computed signal for remaining characters count
  readonly remainingChars = computed(() => {
    const max = this.config().maxLength;
    if (max === undefined) return null;
    return Math.max(0, max - this.state().charCount);
  });

  // Update configuration
  updateConfig(newConfig: Partial<EditorInputConfig>): void {
    this.config.update(current => ({ ...current, ...newConfig }));
  }

  // Update content state
  updateContent(html: string, text: string): void {
    this.state.update(current => ({
      ...current,
      htmlContent: html,
      textContent: text,
      charCount: text.length
    }));
  }

  // Set focus state
  setFocus(focused: boolean): void {
    this.state.update(current => ({
      ...current,
      isFocused: focused
    }));
  }

  // Clear editor content
  clear(): void {
    this.state.update(current => ({
      ...current,
      htmlContent: '',
      textContent: '',
      charCount: 0
    }));
  }
}
