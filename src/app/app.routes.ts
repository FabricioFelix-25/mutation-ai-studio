import { Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page/dashboard-page.component';
import { ProjectHubPageComponent } from './features/project-hub/pages/project-hub-page/project-hub-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ProjectHubPageComponent,
  },
  {
    path: 'workspace/:projectId',
    component: DashboardPageComponent,
  },
  {
    path: 'workspace',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
