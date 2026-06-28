import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { StudioDataService } from './core/services/studio-data.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [StudioDataService],
      useFactory: (dataService: StudioDataService) => () => dataService.bootstrap(),
    },
  ],
};
