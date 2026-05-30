export type EditorOutputFormat = 'html' | 'text' | 'object';

export interface HtmlTagInfo {
  tag: string;
  htmlPosition: number;
  textPosition: number;
}

export interface EditorObjectOutput {
  plainText: string;
  html: {
    content: string;
    tags: HtmlTagInfo[];
  };
}

export interface EditorInputConfig {
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  outputFormat?: EditorOutputFormat;
}

export interface EditorState {
  htmlContent: string;
  textContent: string;
  charCount: number;
  isFocused: boolean;
}
