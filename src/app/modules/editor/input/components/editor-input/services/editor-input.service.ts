import { Injectable, signal, computed } from '@angular/core';

import { v4 as uuid } from 'uuid';

import {
  EditorInputConfig,
  EditorState,
  HtmlTagInfo,
  EditorObjectOutput,
  EditorImageInfo
} from '../types/editor-input.types';

@Injectable()
export class EditorInputService {
  // Config signal
  readonly config = signal<EditorInputConfig>({
    placeholder: 'Type your content here...',
    maxLength: 1000,
    readOnly: false,
    outputFormat: 'html',
    toolbarButtons: ['bold', 'italic', 'underline', 'strikeThrough', 'highlight', 'bulletList', 'orderedList', 'link', 'image', 'codeBlock', 'clear']
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
    // Sanitize the HTML by removing structural newlines between block-level tags.
    // This prevents structural/formatting newlines inside elements like <pre> from being parsed as text content.
    const blockTags = 'p|div|h[1-6]|pre|blockquote|ol|ul|li|table|tr|td|th|thead|tbody|tfoot';
    const regex = new RegExp(`(<(?:${blockTags})\\b[^>]*>|<\\/(?:${blockTags})>)\\s*\\r?\\n\\s*(<(?:${blockTags})\\b[^>]*>|<\\/(?:${blockTags})>)`, 'gi');
    let sanitizedHtml = html;
    while (regex.test(sanitizedHtml)) {
      sanitizedHtml = sanitizedHtml.replace(regex, '$1$2');
    }

    let plainText = "";
    const tags: HtmlTagInfo[] = [];
    const images: Record<string, EditorImageInfo> = {};
    let i = 0;

    const entityMap: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };

    while (i < sanitizedHtml.length) {
      if (sanitizedHtml[i] === '<') {
        const closeIdx = sanitizedHtml.indexOf('>', i);
        const isTag = closeIdx !== -1 &&
          !sanitizedHtml.substring(i + 1, closeIdx).includes('<') &&
          /^(?:[a-zA-Z!]|\/[a-zA-Z])/.test(sanitizedHtml.substring(i + 1, closeIdx + 1));

        if (isTag) {
          let tagContent = sanitizedHtml.substring(i + 1, closeIdx);

          // Check if it's an <img> tag
          const lowercaseTag = tagContent.trim().toLowerCase();
          const isImg = lowercaseTag.startsWith('img');

          if (isImg) {
            const id = uuid();
            const srcMatch = /src=["']([^"']*)["']/i.exec(tagContent);
            const src = srcMatch ? srcMatch[1] : '';

            // Replace the original src content with the UUID inside the tag
            tagContent = tagContent.replace(/(src=["'])([^"']*)(["'])/i, `$1${id}$3`);

            images[id] = {
              src,
              textPosition: plainText.length
            };
          }

          tags.push({
            tag: tagContent,
            textPosition: plainText.length
          });

          // Treat <br> tags as a space in plain text
          const isDiv = lowercaseTag.startsWith('/div');

          if (isDiv) {
            plainText += ' ';
          }

          i = closeIdx + 1; // Advance past '>'
        } else {
          plainText += '<';
          i++;
        }
      } else if (sanitizedHtml[i] === '&') {
        let entity = "&";
        let j = i + 1;
        while (j < sanitizedHtml.length && sanitizedHtml[j] !== ';' && j - i < 10) {
          entity += sanitizedHtml[j];
          j++;
        }
        if (j < sanitizedHtml.length && sanitizedHtml[j] === ';') {
          entity += ';';
          const decoded = entityMap[entity] || ' ';
          plainText += decoded;
          i = j + 1;
        } else {
          plainText += '&';
          i++;
        }
      } else {
        plainText += sanitizedHtml[i];
        i++;
      }
    }

    return {
      plainText,
      html: {
        content: sanitizedHtml,
        tags
      },
      images
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

  // Upload an image using configured handler or FileReader fallback
  uploadImage(file: File): Promise<string> {
    const handler = this.config().imageUploadHandler;
    if (handler) {
      const result = handler(file);
      return Promise.resolve(result);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Calculate scaled dimensions fitting within maxWidth and maxHeight
  calculateFitDimensions(
    naturalWidth: number,
    naturalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const ratio = (naturalWidth || 200) / (naturalHeight || 150);
    let newWidth = maxWidth;
    let newHeight = maxWidth / ratio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * ratio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  // Calculate proportional height given target width
  calculateHeightFromWidth(width: number, naturalWidth: number, naturalHeight: number): number {
    const ratio = (naturalWidth || 200) / (naturalHeight || 150);
    return Math.round(width / ratio);
  }

  // Calculate proportional width given target height
  calculateWidthFromHeight(height: number, naturalWidth: number, naturalHeight: number): number {
    const ratio = (naturalWidth || 200) / (naturalHeight || 150);
    return Math.round(height * ratio);
  }

  // Calculate scaled dimensions based on a percentage scale of editor width
  calculateScaledDimensions(
    scale: number,
    naturalWidth: number,
    naturalHeight: number,
    editorWidth: number
  ): { width: number; height: number } {
    const ratio = (naturalWidth || 200) / (naturalHeight || 150);
    const targetWidth = editorWidth * scale;
    const targetHeight = targetWidth / ratio;
    return {
      width: Math.round(targetWidth),
      height: Math.round(targetHeight)
    };
  }
}
