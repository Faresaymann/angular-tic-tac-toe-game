import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Square } from '../square/square';
import { Cell, Player, RoomData, RoomStatus, OnlineGameService } from '../services/online-game.service';

type GameMode = 'single' | 'two' | 'online';

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
  imports: [CommonModule, FormsModule, Square],
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

  subtitleText = 'Two players. One winner. Endless rematches.';
  currentPlayerText = 'Your turn';
  winnerText = '';
  drawText = 'It is a draw. Nobody wins this round.';
  statusState: 'human' | 'thinking' | 'waiting' = 'human';

  aiThinking = false;

  roomInput = '';
  roomCode = '';
  roomLink = '';
  mySymbol: Player | null = null;
  onlineError = '';
  onlineWinCelebrated = false;
  roomStatus: RoomStatus | 'idle' = 'idle';

  private celebrationTimer?: ReturnType<typeof setTimeout>;
  private playAgainTimer?: ReturnType<typeof setTimeout>;
  private aiTimer?: ReturnType<typeof setTimeout>;
  private roomUnsub?: () => void;

  private sounds: any = {};
  isMuted = false;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private router: Router,
    private onlineGame: OnlineGameService
  ) {}

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

    this.updateTexts();

    const room = this.route.snapshot.queryParamMap.get('room');
    if (room) {
      this.mode = 'online';
      this.roomInput = room.toUpperCase();
      void this.joinOnlineRoom(room.toUpperCase(), true);
    }
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

    if (this.mode === 'online' && mode !== 'online') {
      this.stopRoomListener();
      this.clearOnlineSession();
    }

    this.mode = mode;
    this.resetLocalBoard();
    this.updateTexts();
    this.cdr.detectChanges();
  }

  async createOnlineRoom(): Promise<void> {
    this.mode = 'online';
    this.onlineError = '';
    this.stopRoomListener();
    this.resetLocalBoard();

    try {
      const roomId = await this.onlineGame.createRoom();
      this.roomCode = roomId;
      this.roomInput = roomId;
      this.mySymbol = 'X';
      this.roomStatus = 'waiting';
      this.roomLink = this.makeRoomLink(roomId);
      this.onlineWinCelebrated = false;

      await this.router.navigate([], {
        queryParams: { room: roomId },
        queryParamsHandling: 'merge'
      });

      this.startRoomListener(roomId);
      this.updateTexts();
      this.cdr.detectChanges();
    } catch (error) {
      this.onlineError = error instanceof Error ? error.message : 'Could not create room.';
    }
  }

  async joinOnlineRoom(roomId: string = this.roomInput, autoJoin = false): Promise<void> {
    const code = roomId.trim().toUpperCase();
    if (!code) return;

    this.mode = 'online';
    this.onlineError = '';
    this.stopRoomListener();
    this.resetLocalBoard();

    try {
      const result = await this.onlineGame.joinRoom(code);

      this.roomCode = code;
      this.roomInput = code;
      this.mySymbol = result.symbol;
      this.roomStatus = result.room.status;
      this.roomLink = this.makeRoomLink(code);
      this.onlineWinCelebrated = false;

      await this.router.navigate([], {
        queryParams: { room: code },
        queryParamsHandling: 'merge'
      });

      this.applyRoomState(result.room);
      this.startRoomListener(code);
      this.updateTexts();
      this.cdr.detectChanges();
    } catch (error) {
      this.onlineError = error instanceof Error ? error.message : 'Could not join room.';
      if (!autoJoin) {
        this.cdr.detectChanges();
      }
    }
  }

  copyRoomLink(): void {
    if (!this.roomLink || !isPlatformBrowser(this.platformId)) return;

    navigator.clipboard?.writeText(this.roomLink).catch(() => {});
  }

  private makeRoomLink(roomId: string): string {
    if (!isPlatformBrowser(this.platformId)) return '';

    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { room: roomId }
    });

    return `${window.location.origin}${this.router.serializeUrl(tree)}`;
  }

  makeMove(index: number): void {
    if (this.mode === 'online') {
      if (!this.roomCode || !this.mySymbol || this.draw || this.winner || this.roomStatus === 'waiting') return;
      if (this.player !== this.mySymbol) return;

      void this.onlineGame
        .makeMove(this.roomCode, index, this.mySymbol)
        .then(() => this.playSound('click'))
        .catch(error => {
          this.onlineError = error instanceof Error ? error.message : 'Move failed.';
          this.cdr.detectChanges();
        });

      return;
    }

    if (this.squares[index] || this.winner || this.draw) return;

    if (this.mode === 'single' && (this.player === 'O' || this.aiThinking)) return;

    this.squares[index] = this.player;
    this.playSound('click');

    const line = this.getWinningLine(this.squares);
    if (line) {
      this.winner = this.player;
      this.winningLine = line;
      this.aiThinking = false;
      this.updateTexts();
      this.startWinSequence();
      return;
    }

    if (this.squares.every(s => s !== null)) {
      this.draw = true;
      this.showPlayAgain = true;
      this.aiThinking = false;
      this.updateTexts();
      this.playSound('draw');
      this.cdr.detectChanges();
      return;
    }

    this.player = this.player === 'X' ? 'O' : 'X';

    if (this.mode === 'single' && this.player === 'O') {
      this.aiThinking = true;
      this.updateTexts();
      this.cdr.detectChanges();

      if (this.aiTimer) clearTimeout(this.aiTimer);
      const delay = 1000 + Math.random() * 1000;

      this.aiTimer = setTimeout(() => this.aiMove(), delay);
      return;
    }

    this.aiThinking = false;
    this.updateTexts();
  }

  newGame(): void {
    if (this.mode === 'online' && this.roomCode) {
      void this.onlineGame.resetRoom(this.roomCode).catch(error => {
        this.onlineError = error instanceof Error ? error.message : 'Could not reset room.';
        this.cdr.detectChanges();
      });
      this.onlineWinCelebrated = false;
      return;
    }

    this.resetLocalBoard();
    this.updateTexts();
    this.cdr.detectChanges();
  }

  private resetLocalBoard(): void {
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
    this.onlineWinCelebrated = false;
    this.roomStatus = 'idle';
    this.currentPlayerText = 'Your turn';
    this.winnerText = '';
    this.statusState = 'human';
  }

  private clearOnlineSession(): void {
    this.roomCode = '';
    this.roomInput = '';
    this.roomLink = '';
    this.roomStatus = 'idle';
    this.mySymbol = null;
    this.onlineError = '';
    this.onlineWinCelebrated = false;
  }

  private stopRoomListener(): void {
    if (this.roomUnsub) {
      this.roomUnsub();
      this.roomUnsub = undefined;
    }
  }

  private startRoomListener(roomId: string): void {
    this.stopRoomListener();

    this.roomUnsub = this.onlineGame.listenRoom(roomId, room => {
      if (!room) {
        this.onlineError = 'Room not found.';
        this.updateTexts();
        this.cdr.detectChanges();
        return;
      }

      this.applyRoomState(room);

      if (room.winner && !this.onlineWinCelebrated) {
        this.onlineWinCelebrated = true;
        this.updateTexts();
        this.startWinSequence();
      } else {
        this.updateTexts();
      }

      this.cdr.detectChanges();
    });
  }

  private applyRoomState(room: RoomData): void {
    this.squares = [...room.squares];
    this.player = room.turn;
    this.winner = room.winner;
    this.draw = room.draw;
    this.winningLine = room.winningLine ?? (room.winner ? this.getWinningLine(room.squares) : null);
    this.roomStatus = room.status;
    this.showPlayAgain = room.status === 'finished';
    this.aiThinking = false;
  }

  private updateTexts(): void {
    if (this.mode === 'online') {
      if (!this.roomCode) {
        this.currentPlayerText = 'Create or join a room';
        this.winnerText = '';
        this.statusState = 'waiting';
        return;
      }

      if (this.winner) {
        this.winnerText =
          this.mySymbol && this.winner === this.mySymbol
            ? 'You won the game! 🎉'
            : 'Opponent won the game! 🎉';

        this.currentPlayerText = this.winnerText;
        this.statusState = 'waiting';
        return;
      }

      if (this.draw) {
        this.currentPlayerText = 'It is a draw 🤝';
        this.winnerText = '';
        this.statusState = 'waiting';
        return;
      }

      if (this.roomStatus === 'waiting') {
        this.currentPlayerText = 'Waiting for friend...';
        this.winnerText = '';
        this.statusState = 'waiting';
        return;
      }

      if (!this.mySymbol) {
        this.currentPlayerText = 'Joining room...';
        this.winnerText = '';
        this.statusState = 'waiting';
        return;
      }

      this.currentPlayerText = this.player === this.mySymbol ? 'Your turn' : "Opponent's turn";
      this.winnerText = '';
      this.statusState = this.player === this.mySymbol ? 'human' : 'waiting';
      return;
    }

    if (this.winner) {
      if (this.mode === 'single' && this.winner === 'O') {
        this.winnerText = 'AI won the game! 🤖🎉';
      } else if (this.mode === 'single' && this.winner === 'X') {
        this.winnerText = 'You won the game! 🎉';
      } else {
        this.winnerText = `Player ${this.winner} won the game! 🎉`;
      }

      this.currentPlayerText = this.winnerText;
      this.statusState = 'waiting';
      return;
    }

    if (this.draw) {
      this.currentPlayerText = 'It is a draw 🤝';
      this.winnerText = '';
      this.statusState = 'waiting';
      return;
    }

    if (this.mode === 'single' && this.aiThinking) {
      this.currentPlayerText = 'AI is thinking... 🤖';
      this.winnerText = '';
      this.statusState = 'thinking';
      return;
    }

    this.currentPlayerText = 'Your turn';
    this.winnerText = '';
    this.statusState = 'human';
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

  private getWinningLine(board: Cell[]): number[] | null {
    const combos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    for (const combo of combos) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combo;
      }
    }

    return null;
  }

  private aiMove(): void {
    const emptyIndexes = this.squares
      .map((v, i) => (v === null ? i : null))
      .filter(v => v !== null) as number[];

    if (emptyIndexes.length === 0 || this.winner || this.draw || this.mode !== 'single') {
      this.aiThinking = false;
      this.updateTexts();
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
      const win = this.getWinningLine(this.squares);
      this.squares[i] = null;

      if (win) return i;
    }

    return null;
  }

  private playAIMove(index: number): void {
    if (this.squares[index] !== null || this.winner || this.draw) {
      this.aiThinking = false;
      this.updateTexts();
      this.cdr.detectChanges();
      return;
    }

    this.squares[index] = 'O';
    this.playSound('click');

    const line = this.getWinningLine(this.squares);
    if (line) {
      this.winner = 'O';
      this.winningLine = line;
      this.aiThinking = false;
      this.updateTexts();
      this.startWinSequence();
      return;
    }

    if (this.squares.every(s => s !== null)) {
      this.draw = true;
      this.showPlayAgain = true;
      this.aiThinking = false;
      this.updateTexts();
      this.playSound('draw');
      this.cdr.detectChanges();
      return;
    }

    this.player = 'X';
    this.aiThinking = false;
    this.updateTexts();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
    if (this.playAgainTimer) clearTimeout(this.playAgainTimer);
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.stopRoomListener();
  }
}