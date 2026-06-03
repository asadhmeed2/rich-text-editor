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
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { EditorInputService } from './services/editor-input.service';
import { EditorOutputFormat, EditorObjectOutput } from './types/editor-input.types';
import Quill from 'quill';

// Override default block format to 'div' instead of 'p' to align perfectly with service expectations and tests
const Block = Quill.import('blots/block') as any;
class DivBlock extends Block {
  static tagName = 'div';
}
Quill.register(DivBlock, true);

// Customize standard image format to support width and height attributes natively in the DOM
const ImageBlot = Quill.import('formats/image') as any;
class CustomImageBlot extends ImageBlot {
  static create(value: any) {
    const node = super.create(value);
    if (typeof value === 'object' && value.src) {
      node.setAttribute('src', value.src);
      if (value.width) node.setAttribute('width', value.width.toString());
      if (value.height) node.setAttribute('height', value.height.toString());
    } else {
      node.setAttribute('src', value);
    }
    return node;
  }

  static value(node: HTMLElement) {
    return {
      src: node.getAttribute('src'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height')
    };
  }
}
Quill.register(CustomImageBlot, true);

@Component({
  selector: 'app-editor-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor-input.component.html',
  styleUrl: './editor-input.component.scss',
  providers: [
    EditorInputService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorInputComponent),
      multi: true
    }
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class EditorInputComponent implements OnInit, AfterViewInit, ControlValueAccessor {
  protected readonly editorService = inject(EditorInputService);
  private readonly elementRef = inject(ElementRef);

  // Signal-based inputs
  placeholder = input<string>('Type your content here...');
  maxLength = input<number>(1000);
  readOnly = input<boolean>(false);
  outputFormat = input<EditorOutputFormat>('html');
  imageUploadHandler = input<((file: File) => Promise<string> | string) | undefined>(undefined);

  // Signal-based outputs
  contentChange = output<string | EditorObjectOutput>();
  focusChange = output<boolean>();

  editableArea = viewChild<ElementRef<HTMLDivElement>>('editableArea');
  imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  private quill?: Quill;
  private pendingValue: any = null;

  isColorPickerOpen = false;
  isImageMenuOpen = false;
  imageMenuMode: 'select' | 'url' = 'select';
  imageUrlInput = '';

  highlightColors = [
    { name: 'Yellow', value: '#fff3cd' },
    { name: 'Green', value: '#d1e7dd' },
    { name: 'Blue', value: '#cff4fc' },
    { name: 'Red', value: '#f8d7da' },
    { name: 'Orange', value: '#ffe5d9' },
    { name: 'Purple', value: '#f3e5f5' }
  ];

  // Form Control Value Accessor callbacks
  private onChange: (value: string | EditorObjectOutput) => void = () => { };
  private onTouched: () => void = () => { };

  constructor() {
    // Effect to sync signal inputs to the service's configuration
    effect(() => {
      const isReadOnly = this.readOnly();
      const ph = this.placeholder();

      this.editorService.updateConfig({
        placeholder: ph,
        maxLength: this.maxLength(),
        readOnly: isReadOnly,
        outputFormat: this.outputFormat(),
        imageUploadHandler: this.imageUploadHandler()
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
      outputFormat: this.outputFormat(),
      imageUploadHandler: this.imageUploadHandler()
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

  toggleColorPicker(): void {
    if (this.readOnly()) return;
    this.isColorPickerOpen = !this.isColorPickerOpen;
  }

  selectHighlightColor(color: string | false): void {
    if (this.readOnly() || !this.quill) return;
    this.quill.focus();
    this.quill.format('background', color);
    this.isColorPickerOpen = false;
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.color-picker-container')) {
      this.isColorPickerOpen = false;
    }
    if (!target.closest('.image-menu-container')) {
      this.isImageMenuOpen = false;
      this.imageMenuMode = 'select';
      this.imageUrlInput = '';
    }
  }

  toggleImageMenu(): void {
    if (this.readOnly()) return;
    this.isImageMenuOpen = !this.isImageMenuOpen;
    if (this.isImageMenuOpen) {
      this.imageMenuMode = 'select';
      this.imageUrlInput = '';
    }
  }

  setImageMenuMode(mode: 'select' | 'url'): void {
    this.imageMenuMode = mode;
    if (mode === 'url') {
      setTimeout(() => {
        const inputEl = this.elementRef.nativeElement.querySelector('.image-url-input');
        if (inputEl) {
          inputEl.focus();
        }
      });
    }
  }

  selectImageFromDisk(): void {
    this.isImageMenuOpen = false;
    this.triggerImageInput();
  }

  insertImageFromUrl(): void {
    if (!this.imageUrlInput || !this.imageUrlInput.trim()) return;
    const url = this.imageUrlInput.trim();
    this.isImageMenuOpen = false;
    this.imageUrlInput = '';
    this.insertImageIntoEditor(url);
  }

  triggerImageInput(): void {
    if (this.readOnly()) return;
    const fileInput = this.imageInput();
    if (fileInput) {
      fileInput.nativeElement.click();
    }
  }

  async onImageSelected(event: Event): Promise<void> {
    if (this.readOnly() || !this.quill) return;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = '';

    try {
      let imageSrc = '';
      const handler = this.imageUploadHandler() || this.editorService.config().imageUploadHandler;

      if (handler) {
        imageSrc = await handler(file);
      } else {
        imageSrc = await this.readFileAsDataURL(file);
      }

      if (imageSrc) {
        this.insertImageIntoEditor(imageSrc);
      }
    } catch (error) {
      console.error('Failed to process image:', error);
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private insertImageIntoEditor(src: string): void {
    if (!this.quill) return;

    const editorEl = this.editableArea()?.nativeElement;
    if (!editorEl) return;

    const editorWidth = editorEl.clientWidth || 400;
    const editorHeight = editorEl.clientHeight || 300;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const originalWidth = img.naturalWidth || 200;
      const originalHeight = img.naturalHeight || 150;

      const ratio = originalWidth / originalHeight;
      const maxWidth = editorWidth;
      const maxHeight = editorHeight;

      let newWidth = maxWidth;
      let newHeight = maxWidth / ratio;

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = maxHeight * ratio;
      }

      const finalWidth = Math.round(newWidth);
      const finalHeight = Math.round(newHeight);

      this.quill!.focus();
      const range = this.quill!.getSelection(true);
      const index = range ? range.index : this.quill!.getLength();

      this.quill!.insertEmbed(index, 'image', {
        src,
        width: finalWidth.toString(),
        height: finalHeight.toString()
      });
      this.quill!.setSelection(index + 1);
    };
  }
}
