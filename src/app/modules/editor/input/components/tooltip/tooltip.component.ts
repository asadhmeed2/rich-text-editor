import { Component, input } from '@angular/core';
import { TooltipService } from './services/tooltip.service';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss',
  providers: [TooltipService]
})
export class TooltipComponent {
  title = input.required<string>();
  desc = input<string | undefined>(undefined);
}
