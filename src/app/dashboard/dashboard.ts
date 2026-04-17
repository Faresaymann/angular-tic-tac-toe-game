import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'firebase/auth';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';

import { environment } from '../../environments/environment';
import { AppAuthService } from '../services/app-auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  user: User | null = null;
  loading = true;

  stats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0
  };

  private app = getApps().length ? getApp() : initializeApp(environment.firebase);
  private db = getFirestore(this.app);

  private userSub?: Subscription;
  private statsUnsub?: () => void;

  constructor(
    public auth: AppAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.auth.user$.subscribe(user => {
      this.user = user;

      if (this.statsUnsub) {
        this.statsUnsub();
        this.statsUnsub = undefined;
      }

      if (!user) {
        this.loading = false;
        this.stats = {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        };
        return;
      }

      this.loading = true;

      const userRef = doc(this.db, 'users', user.uid);

      this.statsUnsub = onSnapshot(
        userRef,
        snap => {
          const data = snap.data() as any;

          this.stats = {
            gamesPlayed: data?.gamesPlayed ?? 0,
            wins: data?.wins ?? 0,
            losses: data?.losses ?? 0,
            draws: data?.draws ?? 0
          };

          this.loading = false;
        },
        () => {
          this.stats = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0
          };
          this.loading = false;
        }
      );
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.statsUnsub?.();
  }

  async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  backToGame(): void {
    void this.router.navigateByUrl('/');
  }

  get winRate(): string {
    const total = this.stats.gamesPlayed || 0;
    return total ? Math.round((this.stats.wins / total) * 100) + '%' : '0%';
  }
}