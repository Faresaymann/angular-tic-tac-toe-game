import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppAuthService } from '../services/app-auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account.html',
  styleUrl: './account.scss'
})
export class Account {
  constructor(
    public auth: AppAuthService,
    private router: Router
  ) {}

  async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
    backToGame(): void {
    void this.router.navigateByUrl('/');
  }

}