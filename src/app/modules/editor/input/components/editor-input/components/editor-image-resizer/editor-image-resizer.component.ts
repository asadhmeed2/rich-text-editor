import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-editor-image-resizer',
  standalone: true,
  imports: [],
  templateUrl: './editor-image-resizer.component.html',
  styleUrl: './editor-image-resizer.component.scss'
})
export class EditorImageResizerComponent {
  selectedImageWidth = input<number>(0);
  selectedImageHeight = input<number>(0);
  bubbleTop = input<number>(0);
  bubbleLeft = input<number>(0);
  wrapperTop = input<number>(0);
  wrapperLeft = input<number>(0);
  wrapperWidth = input<number>(0);
  wrapperHeight = input<number>(0);
  readOnly = input<boolean>(false);

  presetSelected = output<number>();
  widthInput = output<number>();
  heightInput = output<number>();
  deleteSelected = output();
  resizeStarted = output<{ event: MouseEvent; direction: string }>();

  selectPreset(scale: number): void {
    this.presetSelected.emit(scale);
  }

  onWidthInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const width = parseInt(inputEl.value, 10);
    if (width > 0) {
      this.widthInput.emit(width);
    }
  }

  onHeightInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const height = parseInt(inputEl.value, 10);
    if (height > 0) {
      this.heightInput.emit(height);
    }
  }

  onDelete(): void {
    this.deleteSelected.emit();
  }

  startResize(event: MouseEvent, direction: string): void {
    this.resizeStarted.emit({ event, direction });
  }
}
