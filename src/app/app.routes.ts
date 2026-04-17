import { Routes } from '@angular/router';
import { Board } from './board/board';
import { Account } from './account/account';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Board },
  { path: 'account', component: Account },
  { path: 'dashboard', component: Dashboard },
  { path: '**', redirectTo: '' }
];