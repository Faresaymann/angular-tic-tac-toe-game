import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Square } from '../square/square';

type Player = 'X' | 'O';
type Cell = Player | null;
type GameMode = 'single' | 'two';

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
export class Board implements OnInit, OnDestroy {
  squares: Cell[] = Array(9).fill(null);
  player: Player = 'X';
  winner: Player | null = null;
  draw = false;
  winningLine: number[] | null = null;

  celebrationActive = false;
  showPlayAgain = false;
  sparks: Spark[] = [];

  mode: GameMode = 'single';
  get isAIMode(): boolean {
    return this.mode === 'single';
  }

  subtitleText = 'Two players. One winner. Endless rematches.';
  aiThinking = false;

  private celebrationTimer?: ReturnType<typeof setTimeout>;
  private playAgainTimer?: ReturnType<typeof setTimeout>;
  private aiTimer?: ReturnType<typeof setTimeout>;

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

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private sounds: any = {};
  isMuted = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.sounds = {
        click: new Audio('assets/sounds/click.mp3'),
        win: new Audio('assets/sounds/win.mp3'),
        draw: new Audio('assets/sounds/draw.mp3')
      };

      this.sounds.click.volume = 0.5;
      this.sounds.win.volume = 1;
      this.sounds.draw.volume = 0.7;
    }

    this.updateCurrentPlayerText();
  }

  toggleSound(): void {
    this.isMuted = !this.isMuted;
  }

  private playSound(sound: 'click' | 'win' | 'draw'): void {
    if (this.isMuted) return;

    const audio = this.sounds[sound];
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  setMode(mode: GameMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.newGame();
  }



  makeMove(index: number): void {
    if (this.squares[index] || this.winner || this.draw) return;

    if (this.isAIMode && (this.player === 'O' || this.aiThinking)) return;

    this.squares[index] = this.player;
    this.playSound('click');

    const line = this.getWinningLine();
    if (line) {
      this.winner = this.player;
      this.winningLine = line;
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.startWinSequence();
      return;
    }

    if (this.squares.every(s => s !== null)) {
      this.draw = true;
      this.showPlayAgain = true;
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.playSound('draw');
      this.cdr.detectChanges();
      return;
    }

    this.player = this.player === 'X' ? 'O' : 'X';

    if (this.isAIMode && this.player === 'O') {
      this.aiThinking = true;
      this.updateCurrentPlayerText();
      this.cdr.detectChanges();

      if (this.aiTimer) clearTimeout(this.aiTimer);
      const delay = 1000 + Math.random() * 1000;
      this.aiTimer = setTimeout(() => this.aiMove(), delay);
      return;
    }

    this.aiThinking = false;
    this.updateCurrentPlayerText();
  }

  newGame(): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.playAgainTimer) clearTimeout(this.playAgainTimer);
    if (this.aiTimer) clearTimeout(this.aiTimer);

    this.squares = Array(9).fill(null);
    this.player = 'X';
    this.winner = null;
    this.draw = false;
    this.winningLine = null;
    this.celebrationActive = false;
    this.showPlayAgain = false;
    this.sparks = [];
    this.aiThinking = false;

    this.updateCurrentPlayerText();
    this.cdr.detectChanges();
  }

  private startWinSequence(): void {
    this.celebrationActive = true;
    this.showPlayAgain = false;
    this.createSparks();
    this.cdr.detectChanges();

    setTimeout(() => this.playSound('win'), 300);

    this.celebrationTimer = setTimeout(() => {
      this.celebrationActive = false;
      this.sparks = [];
      this.cdr.detectChanges();
    }, 1800);

    this.playAgainTimer = setTimeout(() => {
      this.showPlayAgain = true;
      this.cdr.detectChanges();
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

  private aiMove(): void {
    const emptyIndexes = this.squares
      .map((v, i) => (v === null ? i : null))
      .filter(v => v !== null) as number[];

    if (emptyIndexes.length === 0 || this.winner || this.draw || !this.isAIMode) {
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.cdr.detectChanges();
      return;
    }

    const winMove = this.findBestMove('O');
    if (winMove !== null) {
      this.playAIMove(winMove);
      return;
    }

    const blockMove = this.findBestMove('X');
    if (blockMove !== null) {
      this.playAIMove(blockMove);
      return;
    }

    const randomMove = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    this.playAIMove(randomMove);
  }

  private findBestMove(player: Player): number | null {
    for (let i = 0; i < this.squares.length; i++) {
      if (this.squares[i] !== null) continue;

      this.squares[i] = player;
      const win = this.getWinningLine();
      this.squares[i] = null;

      if (win) return i;
    }

    return null;
  }

  private playAIMove(index: number): void {
    if (this.squares[index] !== null || this.winner || this.draw) {
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.cdr.detectChanges();
      return;
    }

    this.squares[index] = 'O';
    this.playSound('click');

    const line = this.getWinningLine();
    if (line) {
      this.winner = 'O';
      this.winningLine = line;
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.startWinSequence();
      return;
    }

    if (this.squares.every(s => s !== null)) {
      this.draw = true;
      this.showPlayAgain = true;
      this.aiThinking = false;
      this.updateCurrentPlayerText();
      this.playSound('draw');
      this.cdr.detectChanges();
      return;
    }

    this.player = 'X';
    this.aiThinking = false;
    this.updateCurrentPlayerText();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.playAgainTimer) clearTimeout(this.playAgainTimer);
    if (this.aiTimer) clearTimeout(this.aiTimer);
  }


  currentPlayerText = 'Your turn';

updateCurrentPlayerText(): void {
  if (this.winner) {
    this.currentPlayerText = `Winner: ${this.winner}`;
    return;
  }

  if (this.draw) {
    this.currentPlayerText = 'Draw';
    return;
  }

  if (this.isAIMode && this.aiThinking) {
    this.currentPlayerText = 'AI is thinking... 🤖';
    return;
  }

  this.currentPlayerText = 'Your turn';
}
}