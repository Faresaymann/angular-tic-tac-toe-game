import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  private app: FirebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
  private auth: Auth = getAuth(this.app);
  private db: Firestore = getFirestore(this.app);
  private provider = new GoogleAuthProvider();

  private userSubject = new BehaviorSubject<User | null>(null);
  private readySubject = new BehaviorSubject<boolean>(false);

  user$ = this.userSubject.asObservable();
  ready$ = this.readySubject.asObservable();

  constructor() {
    void setPersistence(this.auth, browserLocalPersistence).then(() => {
      onAuthStateChanged(this.auth, async user => {
        this.userSubject.next(user);
        this.readySubject.next(true);

        if (user) {
          await this.ensureProfile(user);
        }
      });
    });
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get uid(): string | null {
    return this.userSubject.value?.uid ?? null;
  }

  get displayName(): string {
    return this.userSubject.value?.displayName?.trim() || 'Player';
  }

  get photoURL(): string {
    return this.userSubject.value?.photoURL?.trim() || '';
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, this.provider);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  private async ensureProfile(user: User): Promise<void> {
    const ref = doc(this.db, 'users', user.uid);
    const snap = await getDoc(ref);

    const base = {
      uid: user.uid,
      displayName: user.displayName?.trim() || 'Player',
      photoURL: user.photoURL?.trim() || '',
      updatedAt: serverTimestamp()
    };

    if (!snap.exists()) {
      await setDoc(ref, {
        ...base,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: serverTimestamp()
      });
      return;
    }

    await setDoc(ref, base, { merge: true });
  }
}