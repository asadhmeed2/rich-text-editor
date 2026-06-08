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

import { TooltipComponent } from '../tooltip';

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
      if (value.placeholderId) node.setAttribute('data-placeholder-id', value.placeholderId);
    } else {
      node.setAttribute('src', value);
    }
    return node;
  }

  static value(node: HTMLElement) {
    return {
      src: node.getAttribute('src'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      placeholderId: node.getAttribute('data-placeholder-id')
    };
  }
}
Quill.register(CustomImageBlot, true);

@Component({
  selector: 'app-editor-input',
  standalone: true,
  imports: [FormsModule, TooltipComponent],
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
    '(document:click)': 'onDocumentClick($event)',
    '(window:resize)': 'onWindowResize()'
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
  isLinkMenuOpen = false;
  linkUrlInput = '';
  linkTextInput = '';
  hasSelectionForLink = false;
  hasExistingLink = false;
  private savedSelectionRange: { index: number; length: number } | null = null;
  imageMenuMode: 'select' | 'url' = 'select';
  imageUrlInput = '';
  selectedImageEl: HTMLImageElement | null = null;
  bubbleTop = 0;
  bubbleLeft = 0;
  wrapperTop = 0;
  wrapperLeft = 0;
  wrapperWidth = 0;
  wrapperHeight = 0;
  isResizing = false;
  private resizeStartMouseX = 0;
  private resizeStartMouseY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;
  private resizeRatio = 1;
  private resizeMaxWidth = 400;

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

      // Listen to click events on images in the editor root
      this.quill.root.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target && target.tagName === 'IMG') {
          if (target.getAttribute('data-placeholder-id')) {
            this.clearImageSelection();
            return;
          }
          this.selectImageForResizing(target as HTMLImageElement);
        } else {
          this.clearImageSelection();
        }
      });

      // Listen to scroll events in the editor root to update bubble position
      this.quill.root.addEventListener('scroll', () => {
        if (this.selectedImageEl) {
          this.repositionBubble();
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
    if (!target.closest('.link-menu-container')) {
      this.isLinkMenuOpen = false;
      this.linkUrlInput = '';
      this.linkTextInput = '';
    }
    if (!target.closest('.image-resize-bubble') && target.tagName !== 'IMG') {
      this.clearImageSelection();
    }
  }

  onDropdownMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  }

  onWindowResize(): void {
    if (this.selectedImageEl) {
      this.repositionBubble();
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

  toggleLinkMenu(): void {
    if (this.readOnly()) return;
    this.isLinkMenuOpen = !this.isLinkMenuOpen;
    if (this.isLinkMenuOpen) {
      const range = this.quill?.getSelection();
      this.savedSelectionRange = range || null;

      let existingUrl = '';
      if (range) {
        const formats: any = this.quill!.getFormat(range);
        existingUrl = formats['link'] || '';
      } else if (this.quill) {
        const formats: any = this.quill.getFormat();
        existingUrl = formats['link'] || '';
      }
      this.hasExistingLink = !!existingUrl;

      if (range && range.length > 0) {
        this.hasSelectionForLink = true;
        this.linkTextInput = this.quill!.getText(range.index, range.length);
      } else {
        this.hasSelectionForLink = false;
        this.linkTextInput = '';
      }
      this.linkUrlInput = existingUrl;
      // Focus the link URL input
      setTimeout(() => {
        const inputEl = this.elementRef.nativeElement.querySelector('.link-url-input');
        if (inputEl) {
          inputEl.focus();
        }
      });
    }
  }

  insertLink(): void {
    if (!this.quill || !this.linkUrlInput || !this.linkUrlInput.trim()) return;
    const url = this.linkUrlInput.trim();
    const text = this.linkTextInput.trim();

    this.quill.focus();

    if (this.hasSelectionForLink && this.savedSelectionRange) {
      const originalText = this.quill.getText(this.savedSelectionRange.index, this.savedSelectionRange.length);
      const newText = text || url;
      if (newText !== originalText) {
        this.quill.deleteText(this.savedSelectionRange.index, this.savedSelectionRange.length);
        this.quill.insertText(this.savedSelectionRange.index, newText, 'link', url);
        this.quill.setSelection(this.savedSelectionRange.index + newText.length);
      } else {
        this.quill.setSelection(this.savedSelectionRange.index, this.savedSelectionRange.length);
        this.quill.format('link', url);
      }
    } else {
      const index = this.savedSelectionRange ? this.savedSelectionRange.index : this.quill.getLength();
      const linkText = text || url;
      this.quill.insertText(index, linkText, 'link', url);
      this.quill.setSelection(index + linkText.length);
    }

    this.isLinkMenuOpen = false;
    this.linkUrlInput = '';
    this.linkTextInput = '';
    this.hasExistingLink = false;
  }

  removeLink(): void {
    if (!this.quill) return;

    this.quill.focus();

    if (this.savedSelectionRange) {
      this.quill.setSelection(this.savedSelectionRange.index, this.savedSelectionRange.length);
      this.quill.format('link', false);
    } else {
      this.quill.format('link', false);
    }

    this.isLinkMenuOpen = false;
    this.linkUrlInput = '';
    this.linkTextInput = '';
    this.hasExistingLink = false;
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

    const placeholderId = 'placeholder-' + Math.random().toString(36).substring(2, 9);
    const index = this.getInsertionIndex();
    this.insertPlaceholder(index, placeholderId);
    this.replacePlaceholderWithImage(placeholderId, url);
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

    const placeholderId = 'placeholder-' + Math.random().toString(36).substring(2, 9);
    const index = this.getInsertionIndex();
    this.insertPlaceholder(index, placeholderId);

    try {
      const imageSrc = await this.editorService.uploadImage(file);

      if (imageSrc) {
        this.replacePlaceholderWithImage(placeholderId, imageSrc);
      } else {
        this.removePlaceholder(placeholderId);
      }
    } catch (error) {
      console.error('Failed to process image:', error);
      this.removePlaceholder(placeholderId);
    }
  }

  private getInsertionIndex(): number {
    if (!this.quill) return 0;
    this.quill.focus();
    const range = this.quill.getSelection(true);
    return range ? range.index : this.quill.getLength();
  }

  private insertPlaceholder(index: number, placeholderId: string): void {
    if (!this.quill) return;
    const loadingSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8f9fa" rx="12"/><circle cx="200" cy="150" r="24" fill="none" stroke="%233674e6" stroke-width="4" stroke-dasharray="100 50"><animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="1s" repeatCount="indefinite"/></circle><text x="200" y="210" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="14" fill="%236c757d" text-anchor="middle" font-weight="500">Loading image...</text></svg>`;
    
    this.quill.insertEmbed(index, 'image', {
      src: loadingSvg,
      width: '400',
      height: '300',
      placeholderId
    });
    this.quill.setSelection(index + 1);
  }

  private replacePlaceholderWithImage(placeholderId: string, src: string): void {
    if (!this.quill) return;

    const imgNode = this.quill.root.querySelector(`img[data-placeholder-id="${placeholderId}"]`) as HTMLImageElement;
    if (!imgNode) return;

    const editorEl = this.editableArea()?.nativeElement;
    if (!editorEl) return;

    const editorWidth = editorEl.clientWidth || 400;
    const editorHeight = editorEl.clientHeight || 300;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const originalWidth = img.naturalWidth || 200;
      const originalHeight = img.naturalHeight || 150;

      const { width: finalWidth, height: finalHeight } = this.editorService.calculateFitDimensions(
        originalWidth,
        originalHeight,
        editorWidth,
        editorHeight
      );

      imgNode.setAttribute('src', src);
      imgNode.setAttribute('width', finalWidth.toString());
      imgNode.setAttribute('height', finalHeight.toString());
      imgNode.removeAttribute('data-placeholder-id');

      this.quill!.update();
    };

    img.onerror = () => {
      console.error('Failed to load image source:', src);
      this.removePlaceholder(placeholderId);
    };
  }

  selectImageForResizing(imgEl: HTMLImageElement): void {
    this.selectedImageEl = imgEl;
    if (this.quill) {
      this.quill.root.querySelectorAll('img').forEach(img => img.classList.remove('selected-img-resize'));
    }
    imgEl.classList.add('selected-img-resize');
    setTimeout(() => {
      this.repositionBubble();
    });
  }

  clearImageSelection(): void {
    if (this.quill) {
      this.quill.root.querySelectorAll('img').forEach(img => img.classList.remove('selected-img-resize'));
    }
    this.selectedImageEl = null;
  }

  repositionBubble(): void {
    if (!this.selectedImageEl) return;
    
    const imgRect = this.selectedImageEl.getBoundingClientRect();
    const editorEl = this.elementRef.nativeElement.querySelector('.editor-container');
    if (!editorEl) return;
    const editorRect = editorEl.getBoundingClientRect();
    
    this.bubbleTop = imgRect.top - editorRect.top - 84; 
    this.bubbleLeft = imgRect.left - editorRect.left + (imgRect.width / 2) - 125;
    
    const toolbarEl = editorEl.querySelector('.editor-toolbar');
    const toolbarHeight = toolbarEl ? toolbarEl.clientHeight : 48;
    
    if (this.bubbleTop < toolbarHeight + 4) {
      this.bubbleTop = imgRect.top - editorRect.top + 8;
    }
    
    const maxLeft = editorRect.width - 258;
    if (this.bubbleLeft < 8) this.bubbleLeft = 8;
    if (this.bubbleLeft > maxLeft) this.bubbleLeft = maxLeft;

    this.wrapperTop = imgRect.top - editorRect.top;
    this.wrapperLeft = imgRect.left - editorRect.left;
    this.wrapperWidth = imgRect.width;
    this.wrapperHeight = imgRect.height;
  }

  startResize(event: MouseEvent, direction: string): void {
    if (this.readOnly() || !this.selectedImageEl) return;
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeStartMouseX = event.clientX;
    this.resizeStartMouseY = event.clientY;
    this.resizeStartWidth = this.selectedImageWidth;
    this.resizeStartHeight = this.selectedImageHeight;
    this.resizeRatio = (this.selectedImageEl.naturalWidth || 200) / (this.selectedImageEl.naturalHeight || 150);
    
    const editorEl = this.editableArea()?.nativeElement;
    this.resizeMaxWidth = editorEl ? editorEl.clientWidth : 400;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.selectedImageEl) return;
      const deltaX = moveEvent.clientX - this.resizeStartMouseX;
      const deltaY = moveEvent.clientY - this.resizeStartMouseY;
      
      let newWidth = this.resizeStartWidth;
      let newHeight = this.resizeStartHeight;
      
      switch (direction) {
        case 'middle-left':
          newWidth = this.resizeStartWidth - deltaX;
          break;
        case 'middle-right':
          newWidth = this.resizeStartWidth + deltaX;
          break;
        case 'top-center':
          newHeight = this.resizeStartHeight - deltaY;
          break;
        case 'bottom-center':
          newHeight = this.resizeStartHeight + deltaY;
          break;
        case 'top-left':
          newWidth = this.resizeStartWidth - deltaX;
          newHeight = this.resizeStartHeight - deltaY;
          break;
        case 'top-right':
          newWidth = this.resizeStartWidth + deltaX;
          newHeight = this.resizeStartHeight - deltaY;
          break;
        case 'bottom-left':
          newWidth = this.resizeStartWidth - deltaX;
          newHeight = this.resizeStartHeight + deltaY;
          break;
        case 'bottom-right':
          newWidth = this.resizeStartWidth + deltaX;
          newHeight = this.resizeStartHeight + deltaY;
          break;
      }
      
      // Enforce limits
      if (newWidth < 30) newWidth = 30;
      if (newWidth > this.resizeMaxWidth) newWidth = this.resizeMaxWidth;
      
      if (newHeight < 30) newHeight = 30;
      
      this.selectedImageEl.setAttribute('width', Math.round(newWidth).toString());
      this.selectedImageEl.setAttribute('height', Math.round(newHeight).toString());
      
      this.repositionBubble();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.isResizing = false;
      if (this.quill) {
        this.quill.update();
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  get selectedImageWidth(): number {
    if (!this.selectedImageEl) return 0;
    return parseInt(this.selectedImageEl.getAttribute('width') || '0', 10);
  }

  get selectedImageHeight(): number {
    if (!this.selectedImageEl) return 0;
    return parseInt(this.selectedImageEl.getAttribute('height') || '0', 10);
  }

  onWidthInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const width = parseInt(input.value, 10);
    if (this.selectedImageEl && width > 0) {
      const height = this.editorService.calculateHeightFromWidth(
        width,
        this.selectedImageEl.naturalWidth || 200,
        this.selectedImageEl.naturalHeight || 150
      );
      this.selectedImageEl.setAttribute('width', width.toString());
      this.selectedImageEl.setAttribute('height', height.toString());
      this.quill!.update();
      this.repositionBubble();
    }
  }

  onHeightInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const height = parseInt(input.value, 10);
    if (this.selectedImageEl && height > 0) {
      const width = this.editorService.calculateWidthFromHeight(
        height,
        this.selectedImageEl.naturalWidth || 200,
        this.selectedImageEl.naturalHeight || 150
      );
      this.selectedImageEl.setAttribute('width', width.toString());
      this.selectedImageEl.setAttribute('height', height.toString());
      this.quill!.update();
      this.repositionBubble();
    }
  }

  resizeSelectedImage(scale: number): void {
    if (!this.selectedImageEl) return;
    
    const editorEl = this.editableArea()?.nativeElement;
    if (!editorEl) return;
    
    const editorWidth = editorEl.clientWidth || 400;
    
    const { width: targetWidth, height: targetHeight } = this.editorService.calculateScaledDimensions(
      scale,
      this.selectedImageEl.naturalWidth || 200,
      this.selectedImageEl.naturalHeight || 150,
      editorWidth
    );
    
    this.selectedImageEl.setAttribute('width', targetWidth.toString());
    this.selectedImageEl.setAttribute('height', targetHeight.toString());
    this.quill!.update();
    this.repositionBubble();
  }

  startEditorResize(event: MouseEvent): void {
    if (this.readOnly()) return;
    event.preventDefault();
    event.stopPropagation();

    const qlEditor = this.elementRef.nativeElement.querySelector('.ql-editor') as HTMLElement;
    if (!qlEditor) return;

    const startMouseY = event.clientY;
    const startHeight = qlEditor.clientHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startMouseY;
      let newHeight = startHeight + deltaY;

      if (newHeight < 150) newHeight = 150;

      qlEditor.style.height = `${newHeight}px`;
      qlEditor.style.maxHeight = 'none';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  deleteSelectedImage(): void {
    if (!this.selectedImageEl) return;
    const blot = Quill.find(this.selectedImageEl) as any;
    if (blot) {
      blot.remove();
      this.quill!.update();
    }
    this.clearImageSelection();
  }

  private removePlaceholder(placeholderId: string): void {
    if (!this.quill) return;
    const imgNode = this.quill.root.querySelector(`img[data-placeholder-id="${placeholderId}"]`);
    if (imgNode) {
      const blot = Quill.find(imgNode) as any;
      if (blot) {
        blot.remove();
        this.quill.update();
      }
    }
  }
}
