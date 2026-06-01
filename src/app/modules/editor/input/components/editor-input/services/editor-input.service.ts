import { Injectable, signal, computed } from '@angular/core';
import {
  EditorInputConfig,
  EditorState,
  HtmlTagInfo,
  EditorObjectOutput
} from '../types/editor-input.types';

@Injectable()
export class EditorInputService {
  // Config signal
  readonly config = signal<EditorInputConfig>({
    placeholder: 'Type your content here...',
    maxLength: 1000,
    readOnly: false,
    outputFormat: 'html'
  });

  // State signal
  readonly state = signal<EditorState>({
    htmlContent: '',
    textContent: '',
    charCount: 0,
    isFocused: false
  });

  // Computed signal for the formatted output value
  readonly outputValue = computed<string | EditorObjectOutput>(() => {
    const format = this.config().outputFormat || 'html';
    if (format === 'object') {
      return this.parseHtml(this.state().htmlContent);
    }
    return format === 'html' ? this.state().htmlContent : this.state().textContent;
  });

  // Helper to parse HTML, extract tags and positions, and produce plain text
  parseHtml(html: string): EditorObjectOutput {
    let plainText = "";
    const tags: HtmlTagInfo[] = [];
    let i = 0;

    const entityMap: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };

    while (i < html.length) {
      if (html[i] === '<') {
        const closeIdx = html.indexOf('>', i);
        const isTag = closeIdx !== -1 &&
          !html.substring(i + 1, closeIdx).includes('<') &&
          /^(?:[a-zA-Z!]|\/[a-zA-Z])/.test(html.substring(i + 1, closeIdx + 1));

        if (isTag) {
          const startHtmlPos = i;
          const tagContent = html.substring(i + 1, closeIdx);
          tags.push({
            tag: tagContent,
            htmlPosition: startHtmlPos,
            textPosition: plainText.length
          });

          // Treat <br> tags as a space in plain text
          const lowercaseTag = tagContent.trim().toLowerCase();
          const isDiv = lowercaseTag === 'div' || lowercaseTag.startsWith('div');

          if (isDiv) {
            plainText += ' ';
          }

          i = closeIdx + 1; // Advance past '>'
        } else {
          plainText += '<';
          i++;
        }
      } else if (html[i] === '&') {
        let entity = "&";
        let j = i + 1;
        while (j < html.length && html[j] !== ';' && j - i < 10) {
          entity += html[j];
          j++;
        }
        if (j < html.length && html[j] === ';') {
          entity += ';';
          const decoded = entityMap[entity] || ' ';
          plainText += decoded;
          i = j + 1;
        } else {
          plainText += '&';
          i++;
        }
      } else {
        plainText += html[i];
        i++;
      }
    }

    return {
      plainText,
      html: {
        content: html,
        tags
      }
    };
  }

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
