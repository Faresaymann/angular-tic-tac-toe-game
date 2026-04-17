import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { AppAuthService } from '../services/app-auth.service';
import { Player, RoomData } from '../services/online-game.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerStatsService {
  private app: FirebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
  private db: Firestore = getFirestore(this.app);

  constructor(private auth: AppAuthService) {}

  async recordFinalResult(roomId: string, mySymbol: Player): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const roomRef = doc(this.db, 'rooms', roomId);
    const userRef = doc(this.db, 'users', user.uid);
    const flagField = mySymbol === 'X' ? 'xStatsRecorded' : 'oStatsRecorded';

    await runTransaction(this.db, async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;

      const room = snap.data() as any;
      if (room[flagField]) return;
      if (room.status !== 'finished') return;

      const isDraw = !!room.draw;
      const didWin = room.winner === mySymbol;
      const didLose = !!room.winner && room.winner !== mySymbol;

      tx.update(roomRef, {
        [flagField]: true,
        updatedAt: serverTimestamp()
      });

      tx.set(
        userRef,
        {
          gamesPlayed: increment(1),
          wins: increment(didWin ? 1 : 0),
          losses: increment(didLose ? 1 : 0),
          draws: increment(isDraw ? 1 : 0),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  }

  async getStats(uid: string): Promise<any> {
    const userRef = doc(this.db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
    }

    return snap.data();
  }
}