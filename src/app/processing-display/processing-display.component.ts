import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OriginalProcessedData,
  ComparisonProcessedData,
} from '../app.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-processing-display',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
  ],
  templateUrl: './processing-display.component.html',
  styleUrls: ['./processing-display.component.css'],
})
export class ProcessingDisplayComponent implements OnChanges, OnDestroy {
  @Input() originalData: OriginalProcessedData | null = null;
  @Input() comparisonData: ComparisonProcessedData | null = null;

  originalImageUrls: SafeUrl[] = [];
  private originalObjectUrlStrings: string[] = [];

  private sanitizer = inject(DomSanitizer);

  ngOnChanges(changes: SimpleChanges): void {
    const currentData = this.originalData || this.comparisonData;

    const previousDataOriginal = changes['originalData']
      ?.previousValue as OriginalProcessedData | null;
    const previousDataComparison = changes['comparisonData']
      ?.previousValue as ComparisonProcessedData | null;
    const currentInputImages = currentData?.inputImages;
    const previousInputImages =
      previousDataOriginal?.inputImages || previousDataComparison?.inputImages;

    if (currentInputImages && currentInputImages !== previousInputImages) {
      this.cleanupUrls();
      currentInputImages.forEach((file) => {
        const objectUrl = URL.createObjectURL(file);
        this.originalObjectUrlStrings.push(objectUrl);
        this.originalImageUrls.push(
          this.sanitizer.bypassSecurityTrustUrl(objectUrl)
        );
      });
    } else if (!currentInputImages && this.originalImageUrls.length > 0) {
      this.cleanupUrls();
      this.originalImageUrls = [];
    }
  }

  ngOnDestroy(): void {
    this.cleanupUrls();
  }
  private cleanupUrls(): void {
    this.originalObjectUrlStrings.forEach((url) => URL.revokeObjectURL(url));
    this.originalObjectUrlStrings = [];
  }
}
