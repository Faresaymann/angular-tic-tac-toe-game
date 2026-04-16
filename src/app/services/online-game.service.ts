import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

export type Player = 'X' | 'O';
export type Cell = Player | null;
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomData {
  roomId: string;
  squares: Cell[];
  turn: Player;
  winner: Player | null;
  draw: boolean;
  status: RoomStatus;
  xClientId: string | null;
  oClientId: string | null;
  winningLine: number[] | null;
}

export interface JoinResult {
  symbol: Player;
  room: RoomData;
}

@Injectable({
  providedIn: 'root'
})
export class OnlineGameService {
  private app: FirebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
  private db: Firestore = getFirestore(this.app);
  private clientId = this.getClientId();

  private roomsCol = collection(this.db, 'rooms');

  private roomRef(roomId: string) {
    return doc(this.roomsCol, roomId);
  }

  private getClientId(): string {
    const key = 'ttt-client-id';

    if (typeof localStorage === 'undefined') {
      return this.fallbackId();
    }

    let id = localStorage.getItem(key);
    if (!id) {
      id = this.fallbackId();
      localStorage.setItem(key, id);
    }
    return id;
  }

  private fallbackId(): string {
    return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  }

  private generateRoomId(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private normalizeRoom(roomId: string, data: any): RoomData {
    const squares: Cell[] = Array.isArray(data?.squares)
      ? data.squares.slice(0, 9).map((cell: any) => (cell === 'X' || cell === 'O' ? cell : null))
      : Array(9).fill(null);

    return {
      roomId,
      squares,
      turn: data?.turn === 'O' ? 'O' : 'X',
      winner: data?.winner === 'X' || data?.winner === 'O' ? data.winner : null,
      draw: !!data?.draw,
      status: data?.status === 'playing' || data?.status === 'finished' ? data.status : 'waiting',
      xClientId: typeof data?.xClientId === 'string' ? data.xClientId : null,
      oClientId: typeof data?.oClientId === 'string' ? data.oClientId : null,
      winningLine: Array.isArray(data?.winningLine) ? data.winningLine : null
    };
  }

  private getWinningLine(squares: Cell[]): number[] | null {
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
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return combo;
      }
    }

    return null;
  }

  async createRoom(): Promise<string> {
    let roomId = this.generateRoomId();

    while (await getDoc(this.roomRef(roomId)).then(snap => snap.exists())) {
      roomId = this.generateRoomId();
    }

    await setDoc(this.roomRef(roomId), {
      squares: Array(9).fill(null),
      turn: 'X',
      winner: null,
      draw: false,
      status: 'waiting',
      xClientId: this.clientId,
      oClientId: null,
      winningLine: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return roomId;
  }

  async joinRoom(roomId: string): Promise<JoinResult> {
    roomId = roomId.trim().toUpperCase();

    const ref = this.roomRef(roomId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error('Room not found.');
    }

    const data = snap.data() as Partial<RoomData>;

    let symbol: Player | null = null;

    if (data.xClientId === this.clientId) {
      symbol = 'X';
    } else if (data.oClientId === this.clientId) {
      symbol = 'O';
    } else if (!data.xClientId) {
      await setDoc(ref, { xClientId: this.clientId, status: 'waiting', updatedAt: serverTimestamp() }, { merge: true });
      symbol = 'X';
    } else if (!data.oClientId) {
      await setDoc(ref, { oClientId: this.clientId, status: 'playing', updatedAt: serverTimestamp() }, { merge: true });
      symbol = 'O';
    } else {
      throw new Error('Room is full.');
    }

    const updatedSnap = await getDoc(ref);

    return {
      symbol,
      room: this.normalizeRoom(roomId, updatedSnap.data())
    };
  }

  listenRoom(roomId: string, callback: (room: RoomData | null) => void): Unsubscribe {
    return onSnapshot(this.roomRef(roomId), snap => {
      if (!snap.exists()) {
        callback(null);
        return;
      }

      callback(this.normalizeRoom(roomId, snap.data()));
    });
  }

  async makeMove(roomId: string, index: number, symbol: Player): Promise<void> {
    const ref = this.roomRef(roomId);

    await runTransaction(this.db, async tx => {
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        throw new Error('Room not found.');
      }

      const room = this.normalizeRoom(roomId, snap.data());

      if (room.status === 'finished' || room.winner || room.draw) {
        return;
      }

      if (room.turn !== symbol) {
        throw new Error('Not your turn.');
      }

      if (room.squares[index] !== null) {
        throw new Error('Square already taken.');
      }

      const squares = [...room.squares];
      squares[index] = symbol;

      const winningLine = this.getWinningLine(squares);
      const winner = winningLine ? symbol : null;
      const draw = !winner && squares.every(cell => cell !== null);
      const nextTurn: Player = symbol === 'X' ? 'O' : 'X';

      tx.update(ref, {
        squares,
        turn: winner || draw ? symbol : nextTurn,
        winner,
        draw,
        status: winner || draw ? 'finished' : 'playing',
        winningLine,
        updatedAt: serverTimestamp()
      });
    });
  }

  async resetRoom(roomId: string): Promise<void> {
    const ref = this.roomRef(roomId);

    await runTransaction(this.db, async tx => {
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        throw new Error('Room not found.');
      }

      const room = this.normalizeRoom(roomId, snap.data());

      tx.update(ref, {
        squares: Array(9).fill(null),
        turn: 'X',
        winner: null,
        draw: false,
        status: room.oClientId ? 'playing' : 'waiting',
        winningLine: null,
        updatedAt: serverTimestamp()
      });
    });
  }
}