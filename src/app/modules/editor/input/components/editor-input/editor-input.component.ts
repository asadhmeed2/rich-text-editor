import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  effect,
  inject,
  OnInit,
  viewChild,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EditorInputService } from './services/editor-input.service';

@Component({
  selector: 'app-editor-input',
  standalone: true,
  templateUrl: './editor-input.component.html',
  styleUrl: './editor-input.component.scss',
  providers: [
    EditorInputService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorInputComponent),
      multi: true
    }
  ]
})
export class EditorInputComponent implements OnInit, ControlValueAccessor {
  protected readonly editorService = inject(EditorInputService);

  // Signal-based inputs
  placeholder = input<string>('Type your content here...');
  maxLength = input<number>(1000);
  readOnly = input<boolean>(false);

  // Signal-based outputs
  contentChange = output<string>();
  focusChange = output<boolean>();

  editableArea = viewChild<HTMLDivElement>('editableArea');

  // Form Control Value Accessor callbacks
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

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

    // Reactive effect to synchronize the DOM with changes from outside (e.g. writeValue)
    effect(() => {
      const state = this.editorService.state();
      const element = this.editableArea();
      if (element) {
        const nativeEl = element as any;
        const domEl = nativeEl.nativeElement || nativeEl;
        if (domEl.innerHTML !== state.htmlContent) {
          domEl.innerHTML = state.htmlContent;
        }
      }
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
      this.onChange(target.innerHTML);
      return;
    }

    this.editorService.updateContent(html, text);
    this.onChange(html);
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
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    const htmlValue = value || '';
    this.editorService.updateContent(htmlValue, this.stripHtml(htmlValue));
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.editorService.updateConfig({ readOnly: isDisabled });
  }

  // Helper method to set content programmatically
  setContent(html: string): void {
    const element = this.editableArea();
    if (element) {
      const nativeEl = element as any;
      const domEl = nativeEl.nativeElement || nativeEl;
      domEl.innerHTML = html;
      const text = domEl.innerText || '';
      this.editorService.updateContent(html, text);
      this.onChange(html);
    }
  }

  // Helper method to clear the editor
  clearEditor(): void {
    const element = this.editableArea();
    if (element) {
      const nativeEl = element as any;
      const domEl = nativeEl.nativeElement || nativeEl;
      domEl.innerHTML = '';
      this.onChange('');
    }
    this.editorService.clear();
  }

  private stripHtml(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.innerText || tempDiv.textContent || '';
  }
}
