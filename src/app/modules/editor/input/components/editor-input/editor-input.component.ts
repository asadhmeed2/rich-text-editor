import {
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  effect,
  inject,
  OnInit,
  AfterViewInit,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EditorInputService } from './services/editor-input.service';
import { EditorOutputFormat, EditorObjectOutput } from './types/editor-input.types';
import Quill from 'quill';

// Override default block format to 'div' instead of 'p' to align perfectly with service expectations and tests
const Block = Quill.import('blots/block') as any;
class DivBlock extends Block {
  static tagName = 'div';
}
Quill.register(DivBlock, true);

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
export class EditorInputComponent implements OnInit, AfterViewInit, ControlValueAccessor {
  protected readonly editorService = inject(EditorInputService);

  // Signal-based inputs
  placeholder = input<string>('Type your content here...');
  maxLength = input<number>(1000);
  readOnly = input<boolean>(false);
  outputFormat = input<EditorOutputFormat>('html');

  // Signal-based outputs
  contentChange = output<string | EditorObjectOutput>();
  focusChange = output<boolean>();

  editableArea = viewChild<ElementRef<HTMLDivElement>>('editableArea');

  private quill?: Quill;
  private pendingValue: any = null;

  // Form Control Value Accessor callbacks
  private onChange: (value: string | EditorObjectOutput) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Effect to sync signal inputs to the service's configuration
    effect(() => {
      const isReadOnly = this.readOnly();
      const ph = this.placeholder();

      this.editorService.updateConfig({
        placeholder: ph,
        maxLength: this.maxLength(),
        readOnly: isReadOnly,
        outputFormat: this.outputFormat()
      });

      if (this.quill) {
        if (isReadOnly) {
          this.quill.disable();
        } else {
          this.quill.enable();
        }
        this.quill.root.dataset['placeholder'] = ph || '';
      }
    });

    // Effect to emit contentChange when service state updates
    effect(() => {
      const value = this.editorService.outputValue();
      this.contentChange.emit(value);
    });
  }

  ngOnInit(): void {
    this.editorService.updateConfig({
      placeholder: this.placeholder(),
      maxLength: this.maxLength(),
      readOnly: this.readOnly(),
      outputFormat: this.outputFormat()
    });
  }

  ngAfterViewInit(): void {
    const elementRef = this.editableArea();
    if (elementRef) {
      const domEl = elementRef.nativeElement || (elementRef as any);

      this.quill = new Quill(domEl, {
        modules: {
          toolbar: false // Disable Quill's built-in toolbar as we have a premium custom toolbar
        },
        placeholder: this.placeholder(),
        readOnly: this.readOnly()
      });

      // Handle text-change events
      this.quill.on('text-change', () => {
        const text = this.quill!.getText().replace(/\n$/, '');
        const html = this.quill!.root.innerHTML;

        // Enforce max length restriction
        const max = this.maxLength();
        if (max !== undefined && text.length > max) {
          this.quill!.deleteText(max, text.length - max);
          return;
        }

        this.editorService.updateContent(html, text);
        this.onChange(this.editorService.outputValue());
      });

      // Handle focus and blur via selection-change
      this.quill.on('selection-change', (range, oldRange) => {
        if (range === null) {
          this.onBlur();
        } else if (oldRange === null) {
          this.onFocus();
        }
      });

      // Apply any pending value set before Quill was initialized
      if (this.pendingValue !== null) {
        this.applyValue(this.pendingValue);
        this.pendingValue = null;
      }
    }
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
    if (!this.quill) {
      this.pendingValue = value;
      return;
    }

    this.applyValue(value);
  }

  private applyValue(value: any): void {
    if (!value) {
      this.quill!.setText('');
      this.editorService.updateContent('', '');
      return;
    }

    let htmlContent = '';
    if (typeof value === 'object' && value.html && typeof value.html.content === 'string') {
      htmlContent = value.html.content;
    } else if (typeof value === 'string') {
      htmlContent = value;
    }

    if (this.outputFormat() === 'text') {
      this.quill!.setText(htmlContent);
      this.editorService.updateContent(htmlContent, htmlContent);
    } else {
      this.quill!.root.innerHTML = htmlContent;
      const text = this.quill!.getText().replace(/\n$/, '');
      const normalizedHtml = this.quill!.root.innerHTML;
      this.editorService.updateContent(normalizedHtml, text);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.editorService.updateConfig({ readOnly: isDisabled });
    if (this.quill) {
      if (isDisabled) {
        this.quill.disable();
      } else {
        this.quill.enable();
      }
    }
  }

  // Execute standard formatting commands on document selection
  formatDoc(command: string, value: string = ''): void {
    if (this.readOnly() || !this.quill) return;

    // Focus editor first so the format applies to selection/caret
    this.quill.focus();

    const currentFormat = this.quill.getFormat();

    switch (command) {
      case 'bold':
        this.quill.format('bold', !currentFormat['bold']);
        break;
      case 'italic':
        this.quill.format('italic', !currentFormat['italic']);
        break;
      case 'underline':
        this.quill.format('underline', !currentFormat['underline']);
        break;
      case 'strikeThrough':
        this.quill.format('strike', !currentFormat['strike']);
        break;
      case 'insertUnorderedList':
        if (currentFormat['list'] === 'bullet') {
          this.quill.format('list', false);
        } else {
          this.quill.format('list', 'bullet');
        }
        break;
      case 'insertOrderedList':
        if (currentFormat['list'] === 'ordered') {
          this.quill.format('list', false);
        } else {
          this.quill.format('list', 'ordered');
        }
        break;
      case 'removeFormat':
        const range = this.quill.getSelection();
        if (range) {
          this.quill.removeFormat(range.index, range.length);
        }
        break;
      default:
        break;
    }
  }

  // Helper method to set content programmatically
  setContent(html: string): void {
    if (!this.quill) {
      this.pendingValue = html;
      return;
    }

    if (this.outputFormat() === 'text') {
      this.quill.setText(html);
      this.editorService.updateContent(html, html);
    } else {
      this.quill.root.innerHTML = html;
      const text = this.quill.getText().replace(/\n$/, '');
      const normalizedHtml = this.quill.root.innerHTML;
      this.editorService.updateContent(normalizedHtml, text);
    }
    this.onChange(this.editorService.outputValue());
  }

  // Helper method to clear the editor
  clearEditor(): void {
    if (this.quill) {
      this.quill.setText('');
    }
    this.editorService.clear();
    this.onChange(this.editorService.outputValue());
  }
}
