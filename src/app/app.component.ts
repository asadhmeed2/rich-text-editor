import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EditorInputComponent } from './modules/editor/input/components/editor-input/editor-input.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EditorInputComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'rich-text-editor';
}
