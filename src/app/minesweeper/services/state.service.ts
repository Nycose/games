import { Injectable } from '@angular/core';

export interface Difficulty {
  name: string;
  width: number;
  height: number;
  bombs: number;
}

@Injectable({ providedIn: 'root' })
export class MinecreeperStateService {
  difficultyOptions: Difficulty[] = [
    { name: 'Beginner', width: 9, height: 9, bombs: 10 },
    { name: 'Intermediate', width: 16, height: 16, bombs: 40 },
    { name: 'Expert', width: 30, height: 16, bombs: 99 },
  ];
  difficulty: Difficulty = this.difficultyOptions[1];
}
