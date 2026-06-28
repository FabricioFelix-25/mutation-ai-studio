import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { StudioDataService } from './studio-data.service';

function setNavigatorPlatform(platform: string): void {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  });
}

describe('StudioDataService', () => {
  let service: StudioDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StudioDataService,
        {
          provide: HttpClient,
          useValue: {
            get: () => {
              throw new Error('Unexpected HttpClient.get call in this test.');
            },
            post: () => {
              throw new Error('Unexpected HttpClient.post call in this test.');
            },
            delete: () => {
              throw new Error('Unexpected HttpClient.delete call in this test.');
            },
          },
        },
      ],
    });

    service = TestBed.inject(StudioDataService);
  });

  it('should use a Linux-friendly Maven path when the platform is not Windows', async () => {
    setNavigatorPlatform('Linux x86_64');

    expect(service.getProjectSetupData().mavenPath).toBe('/usr/bin/mvn');

    const result = await firstValueFrom(service.detectMaven());

    expect(result.found).toBe(true);
    expect(result.path).toBe('/usr/bin/mvn');
    expect(result.message).toContain('Linux/Unix');
  });

  it('should keep the Windows Maven path on Windows', () => {
    setNavigatorPlatform('Win32');

    expect(service.getProjectSetupData().mavenPath).toBe(
      'C:\\tools\\apache-maven-3.9.9\\bin\\mvn.cmd',
    );
  });
});
