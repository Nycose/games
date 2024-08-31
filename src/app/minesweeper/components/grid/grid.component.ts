import { AsyncPipe, JsonPipe, NgIf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import {
  Subject,
  concatMap,
  filter,
  first,
  interval,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { MinecreeperStateService } from '../../services/state.service';
import { Router, RouterLink } from '@angular/router';
import { E } from '@angular/cdk/keycodes';
import { FormsModule } from '@angular/forms';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  over: boolean;
  alive: boolean;
}

class Cell {
  revealed: boolean;
  flagged: boolean;
  mine: boolean;
  empty: boolean;
  number: number | null;
  position: Position;
  background: string;

  constructor(position: Position, bombs: BombLocations) {
    this.position = { ...position };
    this.revealed = false;
    this.flagged = false;
    this.mine = bombs[position.y]?.[position.x] ?? false;
    this.empty = false;
    this.number = null;
    this.background = 'lightgray';
  }
}

interface BombLocations {
  [row: string]: {
    [cell: string]: true | undefined;
  };
}

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [AsyncPipe, NgIf, FormsModule],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.css',
})
export class MinecreeperGridComponent implements OnInit, AfterViewInit {
  private state = inject(MinecreeperStateService);
  private router = inject(Router);

  readonly difficulty = this.state.difficulty;
  readonly bombCount = this.state.difficulty.bombs;
  readonly gridWidth = this.state.difficulty.width;
  readonly gridHeight = this.state.difficulty.height;

  flagMode = false;

  gameState: GameState = {
    over: false,
    alive: true,
  };

  get bombsRemaining() {
    if (this.flagged > this.bombCount) return 0;
    return this.bombCount - this.flagged;
  }

  cells: Cell[][] = [];

  get gridStyles() {
    return `grid-template-columns: repeat(${this.gridWidth}, 60px); grid-template-rows: repeat(${this.gridHeight}, 60px);`;
  }

  @ViewChild('grid', { static: true }) grid!: ElementRef;

  @ViewChild('wrapper', { static: true }) wrapper!: ElementRef;

  renderer = inject(Renderer2);

  zoomGrid() {
    const gridWidth = this.grid.nativeElement.offsetWidth;
    const gridHeight = this.grid.nativeElement.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const widthScale = windowWidth / gridWidth;
    const heightScale = windowHeight / gridHeight;

    const scaleFactor = Math.min(widthScale, heightScale);

    this.renderer.setStyle(
      this.wrapper.nativeElement,
      'transform',
      scaleFactor < 0.9 ? `scale(${scaleFactor - 0.2})` : 'scale(1)'
    );
  }

  private gameStarted$ = new Subject<Position>();
  time$ = this.gameStarted$.pipe(
    filter((val) => !!val),
    first(),
    switchMap(() => timer(0, 1000)),
    filter((val) => !this.gameState.over && val < 1000),
    startWith(0)
  );

  cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.generateCells();
  }

  ngAfterViewInit(): void {
    this.zoomGrid();
  }

  resetGame() {
    this.gameState.alive = true;
    this.gameState.over = false;
    this.firstClickPosition = null;
    this.bombLocations = {};
    this.generateCells();
    this.time$ = this.gameStarted$.pipe(
      filter((val) => !!val),
      first(),
      switchMap(() => timer(0, 1000)),
      filter((val) => !this.gameState.over && val < 1000),
      startWith(0)
    );
    this.router.navigate(['/games', 'minecreeper', 'menu']);
  }

  private unrevealedCount = this.gridHeight * this.gridWidth;
  firstClickPosition: Position | null = null;
  revealCell({ x, y }: Position) {
    if (this.flagMode) {
      this.flagCell({ x, y });
      return;
    }

    this.checkWinCondition();

    if (this.cells[y][x].flagged) return;

    if (!this.firstClickPosition) {
      this.firstClickPosition = { x, y };
      this.createBombLocations();
      this.generateCells();
      this.assignNumbers();
      this.gameStarted$.next({ x, y });
    }

    if (!this.cells[y][x].revealed) {
      this.cells[y][x].revealed = true;
      this.unrevealedCount--;
    }

    this.checkWinCondition();

    if (this.cells[y][x].mine) {
      this.cells = this.cells.map((c) =>
        c.map((x) => ({ ...x, revealed: true, flagged: false }))
      );
      this.gameState.over = true;
      this.gameState.alive = false;
      return;
    }

    if (this.cells[y][x].number === 0 || this.cells[y][x].number === null) {
      this.revealSurroundingCells({ x, y });
    }
  }

  revealSurroundingCells({ x, y }: Position) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (
          y + i >= 0 &&
          y + i < this.gridHeight &&
          x + j >= 0 &&
          x + j < this.gridWidth &&
          !this.cells[y + i][j + x].revealed
        ) {
          this.revealCell({ x: j + x, y: i + y });
        }
      }
    }
  }

  private bombLocations: BombLocations = {};

  private getRandomCellPosition(limit: number) {
    return Math.ceil(Math.random() * limit) - 1;
  }

  private createBombLocations() {
    let assignedBombs = 0;
    while (assignedBombs < this.bombCount) {
      const row = this.getRandomCellPosition(this.gridHeight);
      const col = this.getRandomCellPosition(this.gridWidth);

      if (
        this.firstClickPosition &&
        col === this.firstClickPosition.x &&
        row === this.firstClickPosition.y
      )
        continue;

      let stop = false;

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (
            this.firstClickPosition &&
            this.firstClickPosition.y + i >= 0 &&
            this.firstClickPosition.y + i < this.gridHeight &&
            this.firstClickPosition.x + j >= 0 &&
            this.firstClickPosition.x + j < this.gridWidth &&
            row === this.firstClickPosition.y + i &&
            col === this.firstClickPosition.x + j
          ) {
            stop = true;
          }
        }
      }

      if (stop) continue;

      if (!this.bombLocations[row]) {
        this.bombLocations[row] = {};
      }

      if (!this.bombLocations[row]?.[col]) {
        this.bombLocations[row][col] = true;
        assignedBombs++;
      }
    }
  }

  generateCells() {
    this.cells = [];
    for (let row = 0; row < this.gridHeight; row++) {
      this.cells.push([]);
      for (let col = 0; col < this.gridWidth; col++) {
        const cell = new Cell({ x: col, y: row }, this.bombLocations);
        this.cells[row].push(cell);
      }
    }
  }

  private assignNumbers() {
    for (let row = 0; row < this.gridHeight; row++) {
      for (let col = 0; col < this.gridWidth; col++) {
        if (this.cells[row][col].mine === false) {
          const top = this.cells[row - 1]?.[col] ?? {};
          const topRight = this.cells[row - 1]?.[col + 1] ?? {};
          const right = this.cells[row]?.[col + 1] ?? {};
          const bottomRight = this.cells[row + 1]?.[col + 1] ?? {};
          const bottom = this.cells[row + 1]?.[col] ?? {};
          const bottomLeft = this.cells[row + 1]?.[col - 1] ?? {};
          const left = this.cells[row]?.[col - 1] ?? {};
          const topLeft = this.cells[row - 1]?.[col - 1] ?? {};
          let adjacentMines = 0;
          if (top.mine) adjacentMines++;
          if (topRight.mine) adjacentMines++;
          if (right.mine) adjacentMines++;
          if (bottomRight.mine) adjacentMines++;
          if (bottom.mine) adjacentMines++;
          if (bottomLeft.mine) adjacentMines++;
          if (left.mine) adjacentMines++;
          if (topLeft.mine) adjacentMines++;
          this.cells[row][col].number = adjacentMines;
        }
      }
    }
  }

  checkWinCondition() {
    if (
      this.unrevealedCount === this.bombCount &&
      this.flagged === this.bombCount
    ) {
      if (!this.gameState.over) {
        this.gameState.over = true;
        alert('you won');
      }
      return true;
    }
    return false;
  }

  flagged = 0;
  flagCell(pos: Position, e?: Event) {
    e?.preventDefault();

    if (this.gameState.over) return;

    if (this.cells[pos.y][pos.x].revealed) return;

    if (!this.firstClickPosition) {
      return;
    }

    this.cells[pos.y][pos.x].flagged ? this.flagged-- : this.flagged++;

    this.cells[pos.y][pos.x].flagged = !this.cells[pos.y][pos.x].flagged;

    this.checkWinCondition();
  }

  double(pos: Position) {
    const target = this.cells[pos.y][pos.x].number;
    let acc = 0;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (
          pos.y + i >= 0 &&
          pos.y + i < this.gridHeight &&
          pos.x + j >= 0 &&
          pos.x + j < this.gridWidth &&
          this.cells[pos.y][pos.x].number &&
          this.cells[pos.y + i][pos.x + j].flagged
        ) {
          acc++;
        }
      }
    }

    if (target === acc) {
      this.revealSurroundingCells(pos);
    }
  }
}
