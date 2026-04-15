import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Square } from '../square/square';

type Player = 'X' | 'O';
type Cell = Player | null;

interface Spark {
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, Square],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board implements OnDestroy {
  squares: Cell[] = Array(9).fill(null);
  player: Player = 'X';
  winner: Player | null = null;
  draw = false;
  winningLine: number[] | null = null;

  celebrationActive = false;
  showPlayAgain = false;
  sparks: Spark[] = [];

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
      this.startWinSequence();
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
    this.sparks = [];
  }

  // Inject ChangeDetectorRef to control when the UI updates (pop box for showing play again button)
  constructor(private cdr: ChangeDetectorRef) {}
  private startWinSequence(): void {
    this.celebrationActive = true;
    this.showPlayAgain = false;
    this.createSparks();

    this.cdr.detectChanges(); //  force UI update immediately

    this.celebrationTimer = setTimeout(() => {
      this.celebrationActive = false;
      this.sparks = [];
      this.cdr.detectChanges(); //  update after celebration ends
    }, 1800);

    this.playAgainTimer = setTimeout(() => {
      this.showPlayAgain = true;
      this.cdr.detectChanges(); //  THIS is the important one
    }, 5000);
  }

  private createSparks(): void {
    const colors = ['#60a5fa', '#f472b6', '#facc15', '#34d399', '#f97316', '#e879f9'];

    this.sparks = Array.from({ length: 18 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 160;

      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        delay: Math.random() * 0.2,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
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