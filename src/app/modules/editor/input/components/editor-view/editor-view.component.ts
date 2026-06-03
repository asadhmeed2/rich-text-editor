import { Component, input, computed, inject } from '@angular/core';
import { EditorObjectOutput } from '../editor-input/types/editor-input.types';
import { EditorViewService } from './services/editor-view.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-editor-view',
  standalone: true,
  templateUrl: './editor-view.component.html',
  styleUrl: './editor-view.component.scss',
  providers: [EditorViewService]
})
export class EditorViewComponent {
  private readonly viewService = inject(EditorViewService);
  private readonly sanitizer = inject(DomSanitizer);

  // Input of the editor's object output
  editorData = input<EditorObjectOutput | null | undefined>(null);

  // Reconstructed HTML signal
  reconstructedHtml = computed<SafeHtml>(() => {
    const rawHtml = this.viewService.reconstructHtml(this.editorData());
    return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
  });
}
