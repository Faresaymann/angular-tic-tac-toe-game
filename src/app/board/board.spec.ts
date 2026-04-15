import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Square } from '../square/square';

type Player = 'X' | 'O';
type Cell = Player | null;

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, Square],
  templateUrl: './board.html',
  styleUrl: './board.css'
})
export class Board implements OnDestroy {
  squares: Cell[] = Array(9).fill(null);
  player: Player = 'X';
  winner: Player | null = null;
  draw = false;
  winningLine: number[] | null = null;

  celebrationActive = false;
  showPlayAgain = false;

  private celebrationTimer?: ReturnType<typeof setTimeout>;
  private playAgainTimer?: ReturnType<typeof setTimeout>;

  private winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  makeMove(index: number): void {
    if (this.squares[index] || this.winner || this.draw) return;

    this.squares[index] = this.player;

    const line = this.getWinningLine();
    if (line) {
      this.winner = this.player;
      this.winningLine = line;
      this.startCelebration();
      return;
    }

    if (this.squares.every(square => square !== null)) {
      this.draw = true;
      this.showPlayAgain = true;
      return;
    }

    this.player = this.player === 'X' ? 'O' : 'X';
  }

  newGame(): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.playAgainTimer) clearTimeout(this.playAgainTimer);

    this.squares = Array(9).fill(null);
    this.player = 'X';
    this.winner = null;
    this.draw = false;
    this.winningLine = null;
    this.celebrationActive = false;
    this.showPlayAgain = false;
  }

  private startCelebration(): void {
    this.celebrationActive = true;
    this.showPlayAgain = false;

    this.celebrationTimer = setTimeout(() => {
      this.celebrationActive = false;
    }, 2500);

    this.playAgainTimer = setTimeout(() => {
      this.showPlayAgain = true;
    }, 2600);
  }

  private getWinningLine(): number[] | null {
    for (const combo of this.winningCombinations) {
      const [a, b, c] = combo;
      if (
        this.squares[a] &&
        this.squares[a] === this.squares[b] &&
        this.squares[a] === this.squares[c]
      ) {
        return combo;
      }
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.playAgainTimer) clearTimeout(this.playAgainTimer);
  }
}