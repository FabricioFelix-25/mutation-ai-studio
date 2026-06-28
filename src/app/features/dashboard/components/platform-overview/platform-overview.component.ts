import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, MonitorSmartphone, Server } from 'lucide-angular';

interface PlatformFlowStep {
  title: string;
  detail: string;
  endpoint: string;
}

@Component({
  selector: 'app-platform-overview',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './platform-overview.component.html',
  styleUrl: './platform-overview.component.scss',
})
export class PlatformOverviewComponent {
  protected readonly frontIcon = MonitorSmartphone;
  protected readonly apiIcon = Server;

  protected readonly steps: PlatformFlowStep[] = [
    {
      title: 'Configuracao',
      detail: 'Usuario informa Maven e classes alvo no frontend.',
      endpoint: 'POST /api/mutation-runs',
    },
    {
      title: 'Execucao',
      detail: 'API executa Maven/PIT e acompanha o processamento do run.',
      endpoint: 'GET /api/mutation-runs/{runId}/events',
    },
    {
      title: 'Resultados',
      detail: 'Frontend atualiza metricas, analise textual e diff para revisao.',
      endpoint: 'GET /api/mutation-runs/{runId}/metrics',
    },
  ];
}
