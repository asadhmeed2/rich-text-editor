export interface EditorInputConfig {
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
}

export interface EditorState {
  htmlContent: string;
  textContent: string;
  charCount: number;
  isFocused: boolean;
}
