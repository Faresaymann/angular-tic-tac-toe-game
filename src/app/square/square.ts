import { Component, EventEmitter, Input, Output } from '@angular/core';

type Cell = 'X' | 'O' | null;

@Component({
  selector: 'app-square',
  standalone: true,
  templateUrl: './square.html',
  styleUrl: './square.scss'
})
export class Square {
  @Input() value: Cell = null;
  @Input() isWinning = false;
  @Output() clicked = new EventEmitter<void>();
}