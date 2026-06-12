import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-editor-footer',
  standalone: true,
  imports: [],
  templateUrl: './editor-footer.component.html',
  styleUrl: './editor-footer.component.scss'
})
export class EditorFooterComponent {
  charCount = input<number>(0);
  maxLength = input<number | undefined>(undefined);
  readOnly = input<boolean>(false);
  isLimitReached = input<boolean>(false);
  remainingChars = input<number | null>(null);

  resizeEditorStarted = output<MouseEvent>();

  startResize(event: MouseEvent): void {
    this.resizeEditorStarted.emit(event);
  }
}
