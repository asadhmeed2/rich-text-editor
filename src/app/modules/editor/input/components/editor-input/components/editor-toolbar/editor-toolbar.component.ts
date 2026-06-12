import {
  Component,
  input,
  output,
  ElementRef,
  inject,
  computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipComponent } from '../../../tooltip';
import { EditorToolbarButton } from '../../types/editor-input.types';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [FormsModule, TooltipComponent],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class EditorToolbarComponent {
  private readonly elementRef = inject(ElementRef);

  readOnly = input<boolean>(false);
  selectionText = input<string>('');
  existingLinkUrl = input<string>('');
  buttons = input<EditorToolbarButton[]>([]);

  // Outputs
  format = output<{ command: string; value?: string }>();
  linkInsert = output<{ url: string; text: string }>();
  linkRemove = output();
  imageInsertUrl = output<string>();
  imageSelectDisk = output();
  linkMenuOpened = output();

  isColorPickerOpen = false;
  isLinkMenuOpen = false;
  isImageMenuOpen = false;
  isImageUrlOnlyOpen = false;
  
  linkUrlInput = '';
  linkTextInput = '';
  imageUrlInput = '';
  imageUrlOnlyInput = '';
  imageMenuMode: 'select' | 'url' = 'select';

  highlightColors = [
    { name: 'Yellow', value: '#fff3cd' },
    { name: 'Green', value: '#d1e7dd' },
    { name: 'Blue', value: '#cff4fc' },
    { name: 'Red', value: '#f8d7da' },
    { name: 'Orange', value: '#ffe5d9' },
    { name: 'Purple', value: '#f3e5f5' }
  ];

  activeButtons = computed(() => new Set(this.buttons()));

  hasButton(name: EditorToolbarButton): boolean {
    return this.activeButtons().has(name);
  }

  // Computed properties for separator logic
  hasInlineGroup = computed(() => {
    const active = this.activeButtons();
    return active.has('bold') || active.has('italic') || active.has('underline') || active.has('strikeThrough') || active.has('highlight');
  });

  hasListGroup = computed(() => {
    const active = this.activeButtons();
    return active.has('bulletList') || active.has('orderedList');
  });

  hasInsertGroup = computed(() => {
    const active = this.activeButtons();
    return active.has('link') || active.has('image') || active.has('imageDisk') || active.has('imageUrl');
  });

  hasClearGroup = computed(() => {
    const active = this.activeButtons();
    return active.has('clear');
  });

  showSeparator1 = computed(() => this.hasInlineGroup() && (this.hasListGroup() || this.hasInsertGroup() || this.hasClearGroup()));
  showSeparator2 = computed(() => (this.hasInlineGroup() || this.hasListGroup()) && (this.hasInsertGroup() || this.hasClearGroup()));
  showSeparator3 = computed(() => (this.hasInlineGroup() || this.hasListGroup() || this.hasInsertGroup()) && this.hasClearGroup());

  formatDoc(command: string): void {
    if (this.readOnly()) return;
    this.format.emit({ command });
  }

  toggleColorPicker(): void {
    if (this.readOnly()) return;
    this.isColorPickerOpen = !this.isColorPickerOpen;
  }

  selectHighlightColor(color: string | false): void {
    if (this.readOnly()) return;
    this.format.emit({ command: 'background', value: color ? color : '' });
    this.isColorPickerOpen = false;
  }

  toggleLinkMenu(): void {
    if (this.readOnly()) return;
    this.isLinkMenuOpen = !this.isLinkMenuOpen;
    if (this.isLinkMenuOpen) {
      this.linkMenuOpened.emit();
      // Wait a tick for inputs to be updated from parent, then bind local values
      setTimeout(() => {
        this.linkUrlInput = this.existingLinkUrl();
        this.linkTextInput = this.selectionText();
        // Focus the link URL input
        const inputEl = this.elementRef.nativeElement.querySelector('.link-url-input');
        if (inputEl) {
          inputEl.focus();
        }
      });
    }
  }

  insertLink(): void {
    if (!this.linkUrlInput || !this.linkUrlInput.trim()) return;
    this.linkInsert.emit({
      url: this.linkUrlInput.trim(),
      text: this.linkTextInput.trim()
    });
    this.isLinkMenuOpen = false;
    this.linkUrlInput = '';
    this.linkTextInput = '';
  }

  removeLink(): void {
    this.linkRemove.emit();
    this.isLinkMenuOpen = false;
    this.linkUrlInput = '';
    this.linkTextInput = '';
  }

  toggleImageMenu(): void {
    if (this.readOnly()) return;
    this.isImageMenuOpen = !this.isImageMenuOpen;
    if (this.isImageMenuOpen) {
      this.imageMenuMode = 'select';
      this.imageUrlInput = '';
    }
  }

  toggleImageUrlOnly(): void {
    if (this.readOnly()) return;
    this.isImageUrlOnlyOpen = !this.isImageUrlOnlyOpen;
    if (this.isImageUrlOnlyOpen) {
      this.imageUrlOnlyInput = '';
      setTimeout(() => {
        const inputEl = this.elementRef.nativeElement.querySelector('.image-url-only-input');
        if (inputEl) {
          inputEl.focus();
        }
      });
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
    this.imageSelectDisk.emit();
  }

  insertImageFromUrl(): void {
    if (!this.imageUrlInput || !this.imageUrlInput.trim()) return;
    this.imageInsertUrl.emit(this.imageUrlInput.trim());
    this.isImageMenuOpen = false;
    this.imageUrlInput = '';
  }

  insertImageFromUrlOnly(): void {
    if (!this.imageUrlOnlyInput || !this.imageUrlOnlyInput.trim()) return;
    this.imageInsertUrl.emit(this.imageUrlOnlyInput.trim());
    this.isImageUrlOnlyOpen = false;
    this.imageUrlOnlyInput = '';
  }

  onDropdownMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
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
      this.isImageUrlOnlyOpen = false;
      this.imageUrlOnlyInput = '';
    }
    if (!target.closest('.link-menu-container')) {
      this.isLinkMenuOpen = false;
      this.linkUrlInput = '';
      this.linkTextInput = '';
    }
  }
}
