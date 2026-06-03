import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EditorInputComponent } from './modules/editor/input/components/editor-input/editor-input.component';
import { EditorViewComponent } from './modules/editor/input/components/editor-view/editor-view.component';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditorObjectOutput } from './modules/editor/input/components/editor-input';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EditorInputComponent, EditorViewComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'rich-text-editor';
  editorValue: string | EditorObjectOutput = '';


  formBuilder = inject(FormBuilder);

  form = signal<FormGroup>(this.formBuilder.group({}))


  ngOnInit(): void {
    this.form.set(this.formBuilder.group({
      content: [{}]
    }))
  }
}
