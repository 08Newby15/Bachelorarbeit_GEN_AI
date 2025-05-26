import { Component, inject, ChangeDetectorRef } from '@angular/core'; 
import { ImageUploadComponent } from './image-upload/image-upload.component';
import { OllamaService } from './services/ollama.service';
import { FluxService } from './services/flux.service';
import { FileGenerationService } from './services/file-generation.service';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, tap, finalize, catchError } from 'rxjs/operators';
import { ProcessingDisplayComponent } from './processing-display/processing-display.component';
import { CommonModule } from '@angular/common';
import { DownloadComponent } from './download/download.component';


export interface OriginalProcessedData {
  inputImages: File[];
  gemmaSummaries: { file: File; summary: string; analysisTime?: number }[];
  gemmaTotalAnalysisTime?: number; 
  llama31GeneratedText: string;
  llama31GeneratedTextTime?: number; 
  llama31Essence: string;
  llama31EssenceTime?: number; 
  fluxPromptKeywords?: string; 
  fluxCommunityImage: string;
  fluxCommunityImageTime?: number; 
}

export interface ComparisonProcessedData {
  inputImages: File[];
  llamaVisionSummaries: {
    file: File;
    summary: string;
    analysisTime?: number;
  }[]; 
  llamaVisionTotalAnalysisTime?: number; 
  deepseekGeneratedText: string;
  deepseekGeneratedTextTime?: number; 
  deepseekEssence: string;
  deepseekEssenceTime?: number;
  fluxPromptKeywords?: string; 
  fluxImageComparison: string;
  fluxImageComparisonTime?: number; 
}

interface StepStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ImageUploadComponent, ProcessingDisplayComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'ba-llm-vergleich';

  private ollamaService = inject(OllamaService);
  private fluxService = inject(FluxService);
  private fileGenerationService = inject(FileGenerationService);
  private cdr = inject(ChangeDetectorRef); 

  isLoading = false;
  error: string | null = null;
  inputFiles: File[] = [];

  originalPipelineData: OriginalProcessedData | null = null;
  comparisonPipelineData: ComparisonProcessedData | null = null;

  initialSteps: StepStatus[] = [
    { name: '1. Gemma & Llama-3.2 Vision Bildanalyse', status: 'pending' }, 
    { name: '2. Llama 3.1 Text', status: 'pending' }, 
    { name: '3. Llama 3.1 Essenz', status: 'pending' }, 
    { name: '4. Llama 3.1 Keywords für Flux', status: 'pending' }, 
    { name: '5. Flux (Original)', status: 'pending' }, 
    { name: '6. Deepseek Text', status: 'pending' }, 
    { name: '7. Deepseek Essenz', status: 'pending' }, 
    { name: '8. Deepseek Keywords für Flux', status: 'pending' }, 
    { name: '9. Flux (Vergleich)', status: 'pending' }, 
  ];
  steps$ = new BehaviorSubject<StepStatus[]>([...this.initialSteps]);

  get shouldShowProgressSteps$(): Observable<boolean> {
    // Gibt nur 'true' zurück, wenn isLoading true ist
    return of(this.isLoading);
  }

  private updateStepStatus(
    index: number,
    status: StepStatus['status'],
    progress?: number
  ) {
    const currentSteps = [...this.steps$.value];
    const stepToUpdate = currentSteps[index];

    if (
      stepToUpdate &&
      (stepToUpdate.status !== status || stepToUpdate.progress !== progress)
    ) {
      currentSteps[index] = {
        ...stepToUpdate,
        status: status,
        progress: progress !== undefined ? progress : stepToUpdate.progress,
      };
      this.steps$.next(currentSteps);
    }
  }

  public onFilesReceived(files: File[]) {
    console.log('Dateien empfangen:', files);
    this.inputFiles = [...files]; 
    this.originalPipelineData = null;
    this.comparisonPipelineData = null;
    this.error = null;
    this.isLoading = true;
    this.steps$.next([...this.initialSteps]); 

    const totalImages = files.length;
    let completedGemmaImages = 0;
    let completedLlamaVisionImages = 0;

    const now = () => Date.now(); 

    this.updateStepStatus(0, 'running', 0); 

    // Gemma Analysen mit Zeitmessung pro Bild
    const gemmaAnalysisObservables = this.inputFiles.map((file) => {
      let startTime = 0;
      return of(null).pipe(
        tap(() => (startTime = now())),
        switchMap(() => this.ollamaService.analyzeImageWithGemma(file)),
        map((summary) => ({
          file,
          summary: summary || `Keine Gemma-Beschreibung für ${file.name}`,
          analysisTime: now() - startTime,
        })),
        tap(() => {
          completedGemmaImages++;
          this.updateStepStatus(
            0,
            'running',
            Math.round((completedGemmaImages / totalImages) * 100)
          );
        }),
        catchError((errString) => {
          completedGemmaImages++;
          this.updateStepStatus(
            0,
            'running',
            Math.round((completedGemmaImages / totalImages) * 100)
          );
          const duration = now() - startTime;
          return of({ file, summary: errString, analysisTime: duration }); // Gibt Fehlerstring und Dauer zurück
        })
      );
    });

    // Llama Vision Analysen mit Zeitmessung pro Bild
    const llamaVisionAnalysisObservables = this.inputFiles.map((file) => {
      let startTime = 0;
      return of(null).pipe(
        tap(() => (startTime = now())),
        switchMap(() => this.ollamaService.analyzeImageWithLlamaVision(file)),
        map((summary) => ({
          file,
          summary:
            summary || `Keine Llama Vision-Beschreibung für ${file.name}`,
          analysisTime: now() - startTime,
        })),
        tap((data) => {

          completedLlamaVisionImages++;
          console.log(
            `Vergleichs-Pipeline: Llama Vision Analyse ${completedLlamaVisionImages}/${totalImages} (${data.analysisTime}ms)`
          );
        }),
        catchError((errString) => {
          completedLlamaVisionImages++;
          const duration = now() - startTime;
          console.error(
            `Vergleichs-Pipeline: Fehler bei Llama Vision Analyse von ${file.name} (${duration}ms)`
          );
          return of({ file, summary: errString, analysisTime: duration }); 
        })
      );
    });

    // Parallele Ausführung der initialen Bildanalysen
    forkJoin({
      gemmaResults: forkJoin(gemmaAnalysisObservables),
      llamaVisionResults: forkJoin(llamaVisionAnalysisObservables),
    })
      .pipe(
        tap((analysisResults) => {
          console.log('Beide Bildanalysen abgeschlossen.');
          const gemmaTotalTime = analysisResults.gemmaResults.reduce(
            (acc, curr) => acc + (curr.analysisTime || 0),
            0
          );
          const llamaVisionTotalTime =
            analysisResults.llamaVisionResults.reduce(
              (acc, curr) => acc + (curr.analysisTime || 0),
              0
            );

          // Initialisiere die Datenobjekte für beide Pipelines
          this.originalPipelineData = {
            inputImages: [...this.inputFiles],
            gemmaSummaries: analysisResults.gemmaResults, 
            gemmaTotalAnalysisTime: gemmaTotalTime,
            llama31GeneratedText: '',
            llama31Essence: '',
            fluxPromptKeywords: '',
            fluxCommunityImage: '',
          };
          this.comparisonPipelineData = {
            inputImages: [...this.inputFiles],
            llamaVisionSummaries: analysisResults.llamaVisionResults, 
            llamaVisionTotalAnalysisTime: llamaVisionTotalTime,
            deepseekGeneratedText: '',
            deepseekEssence: '',
            fluxPromptKeywords: '',
            fluxImageComparison: '',
          };

          // Setzt finalen Status für Gemma-Analyse (UI-Schritt 0)
          const hasGemmaErrors = analysisResults.gemmaResults.some((s) =>
            s.summary.startsWith('Fehler bei')
          );
          this.updateStepStatus(0, hasGemmaErrors ? 'error' : 'completed', 100);
          console.log(
            `Original-Pipeline: Gemma Analysen abgeschlossen. Gesamtzeit: ${gemmaTotalTime}ms. Fehler: ${hasGemmaErrors}`
          );

          const hasLlamaErrors = analysisResults.llamaVisionResults.some((s) =>
            s.summary.startsWith('Fehler bei')
          );
          if (hasLlamaErrors)
            console.warn(
              `Vergleichs-Pipeline: Fehler bei Llama Vision Analyse. Gesamtzeit: ${llamaVisionTotalTime}ms.`
            );
          else
            console.log(
              `Vergleichs-Pipeline: Llama Vision Analysen abgeschlossen. Gesamtzeit: ${llamaVisionTotalTime}ms.`
            );

          // Überprüfung auf vollständigen Analysefehler
          if (
            this.originalPipelineData.gemmaSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0 &&
            this.comparisonPipelineData.llamaVisionSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0
          ) {
            throw new Error(
              'Alle Bildanalysen sind fehlgeschlagen. Abbruch der weiteren Verarbeitung.'
            );
          }
        }),

        // --- Original-Pipeline Weiterverarbeitung ---
        tap(() => this.updateStepStatus(1, 'running')), // UI-Schritt 1: Llama 3.1 Text
        switchMap(() => {
          console.log('Original-Pipeline: Starte Llama 3.1 Textgenerierung...');
          if (
            !this.originalPipelineData ||
            this.originalPipelineData.gemmaSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0
          ) {
            return of({
              result:
                '(Original-Pipeline: Keine verwertbaren Gemma-Daten für Llama 3.1)',
              duration: 0,
            });
          }
          const successfulSummaries = this.originalPipelineData.gemmaSummaries
            .filter((s) => !s.summary.startsWith('Fehler bei'))
            .map((s) => s.summary);
          const startTime = now();
          return this.ollamaService
            .generateTextWithLlama(successfulSummaries)
            .pipe(
              map((text) => ({ result: text, duration: now() - startTime })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.originalPipelineData) {
            this.originalPipelineData.llama31GeneratedText = data.result;
            this.originalPipelineData.llama31GeneratedTextTime = data.duration;
          }
          this.updateStepStatus(
            1,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Original-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Original-Pipeline: Llama 3.1 Text fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(2, 'running')), // UI-Schritt 2: Llama 3.1 Essenz
        switchMap(() => {
          if (
            !this.originalPipelineData?.llama31GeneratedText ||
            this.originalPipelineData.llama31GeneratedText.startsWith(
              '(Original-Pipeline: Keine'
            ) ||
            this.originalPipelineData.llama31GeneratedText.startsWith(
              'Fehler bei'
            )
          ) {
            return of({
              result: '(Original-Pipeline: Keine Daten für Llama 3.1 Essenz)',
              duration: 0,
            });
          }
          console.log(
            'Original-Pipeline: Starte Llama 3.1 Essenzextraktion...'
          );
          const startTime = now();
          return this.ollamaService
            .extractEssenceWithLlama(
              this.originalPipelineData.llama31GeneratedText
            )
            .pipe(
              map((essence) => ({
                result: essence,
                duration: now() - startTime,
              })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.originalPipelineData) {
            this.originalPipelineData.llama31Essence = data.result;
            this.originalPipelineData.llama31EssenceTime = data.duration;
          }
          this.updateStepStatus(
            2,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Original-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Original-Pipeline: Llama 3.1 Essenz fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(3, 'running')), // UI-Schritt 3: Keywords Original
        switchMap(() => {
          console.log(
            'Original-Pipeline: Starte Keyword-Generierung (Llama 3.1)...'
          );
          if (
            !this.originalPipelineData?.gemmaSummaries ||
            this.originalPipelineData.gemmaSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0
          ) {
            return of({
              result: '(Original-Pipeline: Keine Gemma-Daten für Keywords)',
              duration: 0,
            });
          }
          const inputText = this.originalPipelineData.gemmaSummaries
            .filter((s) => !s.summary.startsWith('Fehler bei'))
            .map((s) => `Bild ${s.file.name}:\n${s.summary}`)
            .join('\n\n---\n\n');
          const startTime = now();
          return this.ollamaService
            .generateFluxKeywords(inputText, this.ollamaService['modelLama31'])
            .pipe(
              map((keywords) => ({
                result: keywords,
                duration: now() - startTime,
              })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.originalPipelineData)
            this.originalPipelineData.fluxPromptKeywords = data.result;
          this.updateStepStatus(
            3,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Original-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Original-Pipeline: Keywords für Flux fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(4, 'running')), // UI-Schritt 4: Flux Original
        switchMap(() => {
          if (
            !this.originalPipelineData?.fluxPromptKeywords ||
            this.originalPipelineData.fluxPromptKeywords.startsWith(
              '(Original-Pipeline: Keine'
            ) ||
            this.originalPipelineData.fluxPromptKeywords.startsWith(
              'Fehler bei'
            )
          ) {
            return of({
              result: '(Original-Pipeline: Keine Keywords für Flux)',
              duration: 0,
            });
          }
          console.log(
            'Original-Pipeline: Starte Flux Bildgenerierung mit Keywords...'
          );
          const startTime = now();
          return this.fluxService
            .generateImageWithFlux(this.originalPipelineData.fluxPromptKeywords)
            .pipe(
              map((image) => ({ result: image, duration: now() - startTime })),
              catchError((err) => {
                console.error('FluxService Fehler (Original Pipeline):', err);
                return of({
                  result: `Fehler bei Flux (Original): ${
                    err.message || 'Unbekannt'
                  }`,
                  duration: now() - startTime,
                });
              })
            );
        }),
        tap((data) => {
          if (this.originalPipelineData) {
            this.originalPipelineData.fluxCommunityImage = data.result;
            this.originalPipelineData.fluxCommunityImageTime = data.duration;
          }
          this.updateStepStatus(
            4,
            data.result.startsWith('Fehler bei') || data.result === ''
              ? 'error'
              : 'completed'
          );
          console.log(
            `Original-Pipeline: Flux Bild fertig (${data.duration}ms).`
          );
        }),
        catchError((err) => {
          console.error(
            'Schwerwiegender Fehler in Original-Pipeline Verarbeitung (nach Analyse):',
            err.message
          );
          const runningStepIndex = this.steps$.value.findIndex(
            (s) =>
              s.status === 'running' &&
              [1, 2, 3, 4].includes(this.steps$.value.indexOf(s))
          );
          if (runningStepIndex !== -1)
            this.updateStepStatus(runningStepIndex, 'error');
          this.error =
            (this.error ? this.error + '\n' : '') +
            `Original-Pipeline: ${err.message}`;
          return of(null); // Wichtig, um Kette nicht abbrechen zu lassen (Gibt sonst wieder nur Fehler...)
        }),

        // --- Vergleichs-Pipeline Weiterverarbeitung ---
        tap(() => this.updateStepStatus(5, 'running')), // UI-Schritt 5: Deepseek Text
        switchMap(() => {
          console.log(
            'Vergleichs-Pipeline: Starte Deepseek Textgenerierung...'
          );
          if (
            !this.comparisonPipelineData ||
            this.comparisonPipelineData.llamaVisionSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0
          ) {
            return of({
              result:
                '(Vergleichs-Pipeline: Keine verwertbaren Llama Vision Daten für Deepseek)',
              duration: 0,
            });
          }
          const successfulSummaries =
            this.comparisonPipelineData.llamaVisionSummaries
              .filter((s) => !s.summary.startsWith('Fehler bei'))
              .map((s) => s.summary);
          const startTime = now();
          return this.ollamaService
            .generateTextWithDeepseek(successfulSummaries)
            .pipe(
              map((text) => ({ result: text, duration: now() - startTime })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.comparisonPipelineData) {
            this.comparisonPipelineData.deepseekGeneratedText = data.result;
            this.comparisonPipelineData.deepseekGeneratedTextTime =
              data.duration;
          }
          this.updateStepStatus(
            5,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Vergleichs-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Vergleichs-Pipeline: Deepseek Text fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(6, 'running')), // UI-Schritt 6: Deepseek Essenz
        switchMap(() => {
          if (
            !this.comparisonPipelineData?.deepseekGeneratedText ||
            this.comparisonPipelineData.deepseekGeneratedText.startsWith(
              '(Vergleichs-Pipeline: Keine'
            ) ||
            this.comparisonPipelineData.deepseekGeneratedText.startsWith(
              'Fehler bei'
            )
          ) {
            return of({
              result: '(Vergleichs-Pipeline: Keine Daten für Deepseek Essenz)',
              duration: 0,
            });
          }
          console.log(
            'Vergleichs-Pipeline: Starte Deepseek Essenzextraktion...'
          );
          const startTime = now();
          return this.ollamaService
            .extractEssenceWithDeepseek(
              this.comparisonPipelineData.deepseekGeneratedText
            )
            .pipe(
              map((essence) => ({
                result: essence,
                duration: now() - startTime,
              })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.comparisonPipelineData) {
            this.comparisonPipelineData.deepseekEssence = data.result;
            this.comparisonPipelineData.deepseekEssenceTime = data.duration;
          }
          this.updateStepStatus(
            6,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Vergleichs-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Vergleichs-Pipeline: Deepseek Essenz fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(7, 'running')), // UI-Schritt 7: Keywords Vergleich
        switchMap(() => {
          console.log(
            'Vergleichs-Pipeline: Starte Keyword-Generierung (Deepseek)...'
          );
          if (
            !this.comparisonPipelineData?.llamaVisionSummaries ||
            this.comparisonPipelineData.llamaVisionSummaries.filter(
              (s) => !s.summary.startsWith('Fehler bei')
            ).length === 0
          ) {
            return of({
              result:
                '(Vergleichs-Pipeline: Keine LlamaVision-Daten für Keywords)',
              duration: 0,
            });
          }
          const inputText = this.comparisonPipelineData.llamaVisionSummaries
            .filter((s) => !s.summary.startsWith('Fehler bei'))
            .map((s) => `Bild ${s.file.name}:\n${s.summary}`)
            .join('\n\n---\n\n');
          const startTime = now();
          return this.ollamaService
            .generateFluxKeywords(
              inputText,
              this.ollamaService['modelDeepseek']
            )
            .pipe(
              map((keywords) => ({
                result: keywords,
                duration: now() - startTime,
              })),
              catchError((errStr) =>
                of({ result: errStr, duration: now() - startTime })
              )
            );
        }),
        tap((data) => {
          if (this.comparisonPipelineData)
            this.comparisonPipelineData.fluxPromptKeywords = data.result;
          this.updateStepStatus(
            7,
            data.result.startsWith('Fehler bei') ||
              data.result.startsWith('(Vergleichs-Pipeline: Keine')
              ? 'error'
              : 'completed'
          );
          console.log(
            `Vergleichs-Pipeline: Keywords für Flux fertig (${data.duration}ms).`
          );
        }),

        tap(() => this.updateStepStatus(8, 'running')), // UI-Schritt 8: Flux Vergleich
        switchMap(() => {
          if (
            !this.comparisonPipelineData?.fluxPromptKeywords ||
            this.comparisonPipelineData.fluxPromptKeywords.startsWith(
              '(Vergleichs-Pipeline: Keine'
            ) ||
            this.comparisonPipelineData.fluxPromptKeywords.startsWith(
              'Fehler bei'
            )
          ) {
            return of({
              result: '(Vergleichs-Pipeline: Keine Keywords für Flux)',
              duration: 0,
            });
          }
          console.log(
            'Vergleichs-Pipeline: Starte Flux Bildgenerierung mit Keywords...'
          );
          const startTime = now();
          return this.fluxService
            .generateImageWithFlux(
              this.comparisonPipelineData.fluxPromptKeywords
            )
            .pipe(
              map((image) => ({ result: image, duration: now() - startTime })),
              catchError((err) => {
                console.error('FluxService Fehler (Vergleichs-Pipeline):', err);
                return of({
                  result: `Fehler bei Flux (Vergleich): ${
                    err.message || 'Unbekannt'
                  }`,
                  duration: now() - startTime,
                });
              })
            );
        }),
        tap((data) => {
          if (this.comparisonPipelineData) {
            this.comparisonPipelineData.fluxImageComparison = data.result;
            this.comparisonPipelineData.fluxImageComparisonTime = data.duration;
          }
          this.updateStepStatus(
            8,
            data.result.startsWith('Fehler bei') || data.result === ''
              ? 'error'
              : 'completed'
          );
          console.log(
            `Vergleichs-Pipeline: Flux Bild fertig (${data.duration}ms).`
          );
        }),
        catchError((err) => {
          console.error(
            'Schwerwiegender Fehler in Vergleichs-Pipeline Verarbeitung (nach Analyse):',
            err.message
          );
          const comparisonStepIndices = [5, 6, 7, 8];
          for (const index of comparisonStepIndices) {
            if (this.steps$.value[index]?.status === 'running') {
              this.updateStepStatus(index, 'error');
              break;
            }
          }
          if (this.comparisonPipelineData) {
            if (
              !this.comparisonPipelineData.deepseekGeneratedText ||
              this.comparisonPipelineData.deepseekGeneratedText.startsWith(
                'Fehler bei'
              )
            )
              this.comparisonPipelineData.deepseekGeneratedText = `Fehler: ${err.message}`;
            if (
              !this.comparisonPipelineData.deepseekEssence ||
              this.comparisonPipelineData.deepseekEssence.startsWith(
                'Fehler bei'
              )
            )
              this.comparisonPipelineData.deepseekEssence = `Fehler: ${err.message}`;
            if (!this.comparisonPipelineData.fluxPromptKeywords)
              this.comparisonPipelineData.fluxPromptKeywords = `Fehler: ${err.message}`;
            if (!this.comparisonPipelineData.fluxImageComparison)
              this.comparisonPipelineData.fluxImageComparison = '';
          }
          this.error =
            (this.error ? this.error + '\n' : '') +
            `Vergleichs-Pipeline: ${err.message}`;
          return of(null);
        }),

        finalize(() => {
          this.isLoading = false;
          console.log(
            'Gesamte Verarbeitung (sequenziell nach Analysen) abgeschlossen.'
          );
          if (
            !this.originalPipelineData &&
            !this.comparisonPipelineData &&
            !this.error
          ) {
            this.error =
              'Keine Daten konnten von den Pipelines verarbeitet werden.';
          }
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () =>
          console.log(
            'Haupt-Stream der Verarbeitungskette erfolgreich durchlaufen.'
          ),
        error: (err) => {
          console.error('Globaler unerwarteter Fehler:', err);
          this.isLoading = false;
          this.error =
            (this.error ? this.error + '\n' : '') +
            `Globaler Verarbeitungsfehler: ${err.message || 'Unbekannt'}`;
          this.cdr.detectChanges(); // Auch im Fehlerfall Change Detection triggern
        },
      });
  }

  public triggerDownload(
    format:
      | 'pdf'
      | 'markdown'
      | 'comparison-pdf'
      | 'comparison-markdown'
      | 'full-report-txt'
  ) {

    if (format === 'markdown') {
      if (!this.originalPipelineData) {
        alert('Keine Daten für Markdown vorhanden (Original).');
        return;
      }
      this.fileGenerationService.generateMarkdown(this.originalPipelineData);
    } else if (format === 'pdf') {
      if (!this.originalPipelineData) {
        alert('Keine Daten für PDF vorhanden (Original).');
        return;
      }
      this.fileGenerationService
        .generatePdf(this.originalPipelineData)
        .catch((err) =>
          console.error('Fehler beim Erstellen des Original-PDFs:', err)
        );
    } else if (format === 'comparison-pdf') {
      if (!this.comparisonPipelineData) {
        alert('Keine Daten für PDF vorhanden (Vergleich).');
        return;
      }
      this.fileGenerationService
        .generateComparisonPdf(this.comparisonPipelineData)
        .catch((err) =>
          console.error('Fehler beim Erstellen des Vergleichs-PDFs:', err)
        );
    } else if (format === 'comparison-markdown') {
      // NEU
      if (!this.comparisonPipelineData) {
        alert('Keine Daten für Markdown vorhanden (Vergleich).');
        return;
      }
      this.fileGenerationService.generateComparisonMarkdown(
        this.comparisonPipelineData
      );
    } else if (format === 'full-report-txt') {
      if (!this.originalPipelineData && !this.comparisonPipelineData) {
        alert('Keine Daten für den Gesamt-Report vorhanden.');
        return;
      }
      this.fileGenerationService.generateFullReportTxt(
        this.originalPipelineData,
        this.comparisonPipelineData
      );
    }
  }
}
