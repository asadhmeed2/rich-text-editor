import { 
  Component, 
  ElementRef, 
  ViewChild, 
  input, 
  output, 
  effect, 
  inject, 
  OnInit 
} from '@angular/core';
import { EditorInputService } from './services/editor-input.service';

@Component({
  selector: 'app-editor-input',
  standalone: true,
  templateUrl: './editor-input.component.html',
  styleUrl: './editor-input.component.scss',
  providers: [EditorInputService]
})
export class EditorInputComponent implements OnInit {
  protected readonly editorService = inject(EditorInputService);

  // Signal-based inputs
  placeholder = input<string>('Type your content here...');
  maxLength = input<number>(1000);
  readOnly = input<boolean>(false);

  // Signal-based outputs
  contentChange = output<string>();
  focusChange = output<boolean>();

  @ViewChild('editableArea', { static: true }) 
  editableArea!: ElementRef<HTMLDivElement>;

  constructor() {
    // Effect to sync signal inputs to the service's configuration
    effect(() => {
      this.editorService.updateConfig({
        placeholder: this.placeholder(),
        maxLength: this.maxLength(),
        readOnly: this.readOnly()
      });
    });

    // Effect to emit contentChange when service state updates
    effect(() => {
      const state = this.editorService.state();
      this.contentChange.emit(state.htmlContent);
    });
  }

  ngOnInit(): void {
    this.editorService.updateConfig({
      placeholder: this.placeholder(),
      maxLength: this.maxLength(),
      readOnly: this.readOnly()
    });
  }

  // Handle input events in contenteditable
  onInput(event: Event): void {
    if (this.readOnly()) return;

    const target = event.target as HTMLDivElement;
    const html = target.innerHTML;
    const text = target.innerText || target.textContent || '';

    // Enforce max length restriction
    const max = this.maxLength();
    if (max !== undefined && text.length > max) {
      const truncated = text.substring(0, max);
      target.innerText = truncated;
      this.editorService.updateContent(target.innerHTML, truncated);
      return;
    }

    this.editorService.updateContent(html, text);
  }

  // Handle focus
  onFocus(): void {
    this.editorService.setFocus(true);
    this.focusChange.emit(true);
  }

  // Handle blur
  onBlur(): void {
    this.editorService.setFocus(false);
    this.focusChange.emit(false);
  }

  // Helper method to set content programmatically
  setContent(html: string): void {
    if (this.editableArea) {
      this.editableArea.nativeElement.innerHTML = html;
      const text = this.editableArea.nativeElement.innerText || '';
      this.editorService.updateContent(html, text);
    }
  }

  // Helper method to clear the editor
  clearEditor(): void {
    if (this.editableArea) {
      this.editableArea.nativeElement.innerHTML = '';
    }
    this.editorService.clear();
  }
}
