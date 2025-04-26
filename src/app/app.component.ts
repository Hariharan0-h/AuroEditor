import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuroEditorComponent } from "./Component/auro-editor/auro-editor.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuroEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'editor';
}
