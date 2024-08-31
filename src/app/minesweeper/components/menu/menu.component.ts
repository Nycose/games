import { Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MinecreeperStateService } from '../../services/state.service';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-minecreeper-menu',
templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
  standalone: true,
  imports: [
    NgFor,
    RouterLink,
    FormsModule,
    MatButtonToggleModule,
    MatButtonModule,
  ],
})
export class MinecreeperMenuComponent {
  state = inject(MinecreeperStateService);
}
