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
import { EditorOutputFormat, EditorObjectOutput } from './types/editor-input.types';

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
  outputFormat = input<EditorOutputFormat>('html');

  // Signal-based outputs
  contentChange = output<string | EditorObjectOutput>();
  focusChange = output<boolean>();

  editableArea = viewChild<HTMLDivElement>('editableArea');

  // Form Control Value Accessor callbacks
  private onChange: (value: string | EditorObjectOutput) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Effect to sync signal inputs to the service's configuration
    effect(() => {
      this.editorService.updateConfig({
        placeholder: this.placeholder(),
        maxLength: this.maxLength(),
        readOnly: this.readOnly(),
        outputFormat: this.outputFormat()
      });
    });

    // Effect to emit contentChange when service state updates
    effect(() => {
      const value = this.editorService.outputValue();
      this.contentChange.emit(value);
    });

    // Reactive effect to synchronize the DOM with changes from outside (e.g. writeValue)
    effect(() => {
      const state = this.editorService.state();
      const element = this.editableArea();
      if (element) {
        const nativeEl = element as any;
        const domEl = nativeEl.nativeElement || nativeEl;
        
        if (this.outputFormat() === 'text') {
          if (domEl.innerText !== state.textContent) {
            domEl.innerText = state.textContent;
          }
        } else {
          if (domEl.innerHTML !== state.htmlContent) {
            domEl.innerHTML = state.htmlContent;
          }
        }
      }
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

  // Handle input events in contenteditable
  onInput(event: Event): void {
    if (this.readOnly()) return;

    const target = event.target as HTMLDivElement;
    
    // Auto-wrap root-level inline elements inside a <div> when a new line block is created
    this.ensureFirstLineWrapped(target);

    const html = target.innerHTML;
    const text = target.innerText || target.textContent || '';

    // Enforce max length restriction
    const max = this.maxLength();
    if (max !== undefined && text.length > max) {
      const truncated = text.substring(0, max);
      target.innerText = truncated;
      this.editorService.updateContent(target.innerHTML, truncated);
      this.onChange(this.editorService.outputValue());
      return;
    }

    this.editorService.updateContent(html, text);
    this.onChange(this.editorService.outputValue());
  }

  private ensureFirstLineWrapped(target: HTMLDivElement): void {
    const childNodes = Array.from(target.childNodes);
    const firstBlockIdx = childNodes.findIndex(node => 
      node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'DIV'
    );

    // If there is a block-level DIV and we have root-level inline nodes preceding it
    if (firstBlockIdx > 0) {
      const inlineNodes = childNodes.slice(0, firstBlockIdx);

      // Check if there is actual content to wrap
      const hasContent = inlineNodes.some(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent && node.textContent.trim().length > 0;
        }
        return true; // elements like <b>, <i>, <span>, etc.
      });

      if (hasContent) {
        // Save user selection/caret position
        const selection = window.getSelection();
        let savedRange: Range | null = null;
        if (selection && selection.rangeCount > 0) {
          savedRange = selection.getRangeAt(0).cloneRange();
        }

        // Create the wrapping div
        const wrappingDiv = document.createElement('div');
        
        // Insert wrapping div before the first inline node
        target.insertBefore(wrappingDiv, inlineNodes[0]);

        // Append all preceding inline nodes to the wrapping div
        inlineNodes.forEach(node => {
          wrappingDiv.appendChild(node);
        });

        // Restore user selection/caret position to prevent jumping
        if (savedRange && selection) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }
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
    if (!value) {
      this.editorService.updateContent('', '');
      return;
    }

    if (typeof value === 'object' && value.html && typeof value.html.content === 'string') {
      const htmlContent = value.html.content;
      this.editorService.updateContent(htmlContent, this.stripHtml(htmlContent));
    } else if (typeof value === 'string') {
      if (this.outputFormat() === 'text') {
        this.editorService.updateContent(value, value);
      } else {
        this.editorService.updateContent(value, this.stripHtml(value));
      }
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
  }

  // Execute standard formatting commands on document selection
  formatDoc(command: string, value: string = ''): void {
    if (this.readOnly()) return;

    document.execCommand(command, false, value);

    // Keep state and listeners in sync
    const element = this.editableArea();
    if (element) {
      const nativeEl = element as any;
      const domEl = nativeEl.nativeElement || nativeEl;
      
      const html = domEl.innerHTML;
      const text = domEl.innerText || domEl.textContent || '';
      
      this.editorService.updateContent(html, text);
      this.onChange(this.editorService.outputValue());
    }
  }

  // Helper method to set content programmatically
  setContent(html: string): void {
    const element = this.editableArea();
    if (element) {
      const nativeEl = element as any;
      const domEl = nativeEl.nativeElement || nativeEl;
      if (this.outputFormat() === 'text') {
        domEl.innerText = html;
        this.editorService.updateContent(html, html);
      } else {
        domEl.innerHTML = html;
        const text = domEl.innerText || '';
        this.editorService.updateContent(html, text);
      }
      this.onChange(this.editorService.outputValue());
    }
  }

  // Helper method to clear the editor
  clearEditor(): void {
    const element = this.editableArea();
    if (element) {
      const nativeEl = element as any;
      const domEl = nativeEl.nativeElement || nativeEl;
      if (this.outputFormat() === 'text') {
        domEl.innerText = '';
      } else {
        domEl.innerHTML = '';
      }
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
