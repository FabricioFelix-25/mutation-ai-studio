import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { LucideAngularModule, Moon, Sun, Folder, FileCode } from 'lucide-angular';
import { NewWorkspaceProjectInput, WorkspaceProject } from '../../../../core/models/studio.models';
import { StudioDataService } from '../../../../core/services/studio-data.service';
import { ThemeService } from '../../../../core/services/theme.service';

type FeedbackTone = 'neutral' | 'success' | 'error';

@Component({
  selector: 'app-project-hub-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    LucideAngularModule,
  ],
  templateUrl: './project-hub-page.component.html',
  styleUrl: './project-hub-page.component.scss',
})
export class ProjectHubPageComponent implements OnInit {
  protected readonly projectNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected readonly repositoryPathControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected readonly mavenPathControl = new FormControl('', {
    nonNullable: true,
  });

  protected readonly aiModelControl = new FormControl('', { nonNullable: true });

  protected readonly moonIcon = Moon;
  protected readonly sunIcon = Sun;
  protected readonly folderIcon = Folder;
  protected readonly fileIcon = FileCode;

  protected feedbackMessage = '';
  protected feedbackTone: FeedbackTone = 'neutral';

  protected openRepoFolderBrowser(): void {
    if (!this.isApiConnected) {
      this.feedbackTone = 'error';
      this.feedbackMessage = 'Backend offline. Inicie o backend com "npm run start:backend" para abrir o explorador de arquivos real.';
      return;
    }

    this.dataService.browseFolder().subscribe({
      next: (res) => {
        if (res && res.path) {
          this.repositoryPathControl.setValue(res.path);
          this.feedbackTone = 'success';
          this.feedbackMessage = `Pasta selecionada: ${res.path}`;
        }
      },
      error: () => {
        this.feedbackTone = 'error';
        this.feedbackMessage = 'Erro ao abrir o explorador de arquivos no backend.';
      }
    });
  }

  protected openMavenFileBrowser(): void {
    if (!this.isApiConnected) {
      this.feedbackTone = 'error';
      this.feedbackMessage = 'Backend offline. Inicie o backend com "npm run start:backend" para abrir o explorador de arquivos real.';
      return;
    }

    this.dataService.browseFile().subscribe({
      next: (res) => {
        if (res && res.path) {
          this.mavenPathControl.setValue(res.path);
          this.feedbackTone = 'success';
          this.feedbackMessage = `Arquivo selecionado: ${res.path}`;
        }
      },
      error: () => {
        this.feedbackTone = 'error';
        this.feedbackMessage = 'Erro ao abrir o explorador de arquivos no backend.';
      }
    });
  }

  private isWindows(): boolean {
    if (typeof navigator === 'undefined') return false;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
    return /win/i.test(platform);
  }

  constructor(
    private readonly dataService: StudioDataService,
    private readonly router: Router,
    protected readonly themeService: ThemeService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.dataService.refreshProjectsFromApi();
    this.dataService.getAiModel().subscribe({
      next: (res) => this.aiModelControl.setValue(res.model),
      error: () => { /* backend offline — deixa vazio */ },
    });
  }

  protected saveAiModel(): void {
    const model = this.aiModelControl.value.trim();
    if (!model) return;
    this.dataService.setAiModel(model).subscribe({
      error: () => {
        this.feedbackTone = 'error';
        this.feedbackMessage = 'Erro ao salvar o modelo. Verifique o backend.';
      },
    });
  }

  protected get isApiConnected(): boolean {
    return this.dataService.apiConnected;
  }

  protected get projects(): WorkspaceProject[] {
    return this.dataService.listProjects();
  }

  protected async openProject(projectId: string): Promise<void> {
    await this.dataService.selectProject(projectId);
    await this.router.navigate(['/workspace', projectId]);
  }

  protected async addProject(): Promise<void> {
    if (this.projectNameControl.invalid || this.repositoryPathControl.invalid) {
      this.feedbackTone = 'error';
      this.feedbackMessage = 'Preencha nome e repositorio.';
      return;
    }

    const payload: NewWorkspaceProjectInput = {
      name: this.projectNameControl.value,
      repositoryPath: this.repositoryPathControl.value,
      mavenPath: this.mavenPathControl.value,
    };

    try {
      const createdProject = await this.dataService.addProject(payload);

      this.projectNameControl.reset('');
      this.repositoryPathControl.reset('');
      this.mavenPathControl.reset('');

      this.feedbackTone = 'success';
      this.feedbackMessage = `Projeto ${createdProject.name} adicionado.`;
    } catch (error) {
      this.feedbackTone = 'error';
      this.feedbackMessage = error instanceof Error
        ? error.message
        : 'Nao foi possivel adicionar o projeto. Verifique o caminho informado.';
    }
  }

  protected async deleteProject(projectId: string): Promise<void> {
    if (this.projects.length <= 1) {
      this.feedbackTone = 'error';
      this.feedbackMessage = 'Mantenha ao menos um projeto cadastrado.';
      return;
    }

    await this.dataService.deleteProject(projectId);
    this.feedbackTone = 'neutral';
    this.feedbackMessage = 'Projeto removido da lista.';
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
