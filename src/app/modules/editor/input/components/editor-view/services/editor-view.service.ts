import { Injectable } from '@angular/core';
import { EditorObjectOutput } from '../../editor-input/types/editor-input.types';

@Injectable()
export class EditorViewService {
  /**
   * Reconstructs the HTML content from the structured EditorObjectOutput
   */
  reconstructHtml(data: EditorObjectOutput | null | undefined): string {
    if (!data) {
      return '';
    }

    const { plainText, html, images } = data;
    if (!html || !html.tags) {
      return this.escapeHtml(plainText || '');
    }

    // Sort tags *solely* by textPosition (ascending).
    // Using a stable sort preserves the relative sequence of tags that have the same textPosition.
    const sortedTags = [...html.tags].sort((a, b) => a.textPosition - b.textPosition);

    let reconstructedHtml = "";
    let textIdx = 0;

    for (const t of sortedTags) {
      // Append and escape text segment before the tag
      const textSegment = plainText.substring(textIdx, t.textPosition);
      reconstructedHtml += this.escapeHtml(textSegment);
      textIdx = t.textPosition;

      // Process the tag string
      let tagStr = t.tag;
      
      // If it is an image tag, replace the UUID in src attribute with the actual image source
      const lowercaseTag = tagStr.trim().toLowerCase();
      if (lowercaseTag.startsWith('img')) {
        const srcMatch = /src=["']([^"']*)["']/i.exec(tagStr);
        if (srcMatch) {
          const uuid = srcMatch[1];
          if (images && images[uuid]) {
            tagStr = tagStr.replace(uuid, images[uuid].src);
          }
        }
      }

      reconstructedHtml += `<${tagStr}>`;
    }

    // Append and escape any remaining text segment
    reconstructedHtml += this.escapeHtml(plainText.substring(textIdx));

    return reconstructedHtml;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
