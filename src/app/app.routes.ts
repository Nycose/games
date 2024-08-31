import { Routes } from '@angular/router';
import { MinecreeperMenuComponent } from './minesweeper/components/menu/menu.component';
import { MinecreeperGridComponent } from './minesweeper/components/grid/grid.component';

export const routes: Routes = [
  {
    path: 'games',
    children: [
      {
        path: 'minecreeper',
        children: [
          {
            path: 'menu',
            component: MinecreeperMenuComponent,
          },
          {
            path: 'play',
            component: MinecreeperGridComponent,
          },
        ],
      },
    ],
  },
];
