import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import {
  OriginalProcessedData,
  ComparisonProcessedData,
} from '../app.component';

@Injectable({
  providedIn: 'root',
})
export class FileGenerationService {
  private formatTime(milliseconds: number): string {
    if (milliseconds === undefined || milliseconds === null) return '';
    return milliseconds.toLocaleString('de-DE');
  }

  private formatTextForMarkdown(text: string | null | undefined): string {
    if (!text) {
      return '';
    }
    return text.replace(/\n/g, '  \n'); // Zwei reguläre Leerzeichen
  }

  generateMarkdown(data: OriginalProcessedData) {
    let markdown = `# Ergebnisse (Kombination 1: Gemma, Llama 3.1, Flux)\n\n`;

    markdown += `## 1. Bildanalysen (Gemma)\n`;
    if (data.gemmaSummaries && data.gemmaSummaries.length > 0) {
      data.gemmaSummaries.forEach((item) => {
        markdown += `**${item.file.name}:**\n`;
        if (
          item.summary.includes('\n') &&
          !item.summary.trim().startsWith('*') &&
          !item.summary.trim().startsWith('-') &&
          !item.summary.trim().startsWith('#')
        ) {
          const summaryLines = item.summary
            .split('\n')
            .map((line) => line.trim());
          summaryLines.forEach((line) => {
            if (line) {
              markdown += `* ${line}\n`;
            }
          });
        } else {
          markdown += `${this.formatTextForMarkdown(item.summary)}\n`;
        }
        if (item.analysisTime !== undefined) {
          markdown += `\n*Benötigte Zeit für ${
            item.file.name
          }: ${this.formatTime(item.analysisTime)} ms*\n`;
        }
        markdown += `\n`;
      });
      if (data.gemmaTotalAnalysisTime !== undefined) {
        markdown += `**Gesamte Analysezeit (Gemma): ${this.formatTime(
          data.gemmaTotalAnalysisTime
        )} ms**\n\n`;
      }
    } else {
      markdown += `(Keine Gemma-Analysen vorhanden)\n\n`;
    }

    markdown += `## 2. Generierter Text (Llama 3.1)\n`;
    markdown += `${
      this.formatTextForMarkdown(data.llama31GeneratedText) ||
      '(Kein Text generiert)'
    }\n`;
    if (data.llama31GeneratedTextTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.llama31GeneratedTextTime
      )} ms*\n`;
    }
    markdown += `\n`;

    markdown += `## 3. Essenz (Llama 3.1)\n`;
    markdown += `_${
      this.formatTextForMarkdown(data.llama31Essence) ||
      '(Keine Essenz extrahiert)'
    }_\n`;
    if (data.llama31EssenceTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.llama31EssenceTime
      )} ms*\n`;
    }
    markdown += `\n`;

    markdown += `## 4. Gemeinschaftsbild (Flux - Original)\n`;
    if (
      data.fluxCommunityImage &&
      !data.fluxCommunityImage.startsWith('Fehler bei')
    ) {
      markdown += `(Das generierte Bild ist im PDF enthalten oder in der Web-Ansicht sichtbar.)\n`;
    } else {
      markdown += `(${
        data.fluxCommunityImage || 'Kein Gemeinschaftsbild generiert'
      })\n`;
    }
    if (data.fluxCommunityImageTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.fluxCommunityImageTime
      )} ms*\n`;
    }
    markdown += `\n`;

    markdown += `## Originalbilder\n`;
    if (data.inputImages && data.inputImages.length > 0) {
      data.inputImages.forEach((file) => {
        markdown += `* ${file.name}\n`;
      });
    } else {
      markdown += `(Keine Originalbilder vorhanden)\n`;
    }
    markdown += `\n`;
    this.downloadFile(
      markdown,
      'analyse-ergebnisse-original.md',
      'text/markdown'
    );
  }

  generateComparisonMarkdown(data: ComparisonProcessedData) {
    let markdown = `# Ergebnisse (Kombination 2: Llama Vision, Deepseek, Flux)\n\n`;
    markdown += `## 1. Bildanalysen (Llama Vision)\n`;
    if (data.llamaVisionSummaries && data.llamaVisionSummaries.length > 0) {
      data.llamaVisionSummaries.forEach((item) => {
        markdown += `**${item.file.name}:**\n`;
        if (
          item.summary.includes('\n') &&
          !item.summary.trim().startsWith('*') &&
          !item.summary.trim().startsWith('-') &&
          !item.summary.trim().startsWith('#')
        ) {
          const summaryLines = item.summary
            .split('\n')
            .map((line) => line.trim());
          summaryLines.forEach((line) => {
            if (line) {
              markdown += `* ${line}\n`;
            }
          });
        } else {
          markdown += `${this.formatTextForMarkdown(item.summary)}\n`;
        }
        if (item.analysisTime !== undefined) {
          markdown += `\n*Benötigte Zeit für ${
            item.file.name
          }: ${this.formatTime(item.analysisTime)} ms*\n`;
        }
        markdown += `\n`;
      });
      if (data.llamaVisionTotalAnalysisTime !== undefined) {
        markdown += `**Gesamte Analysezeit (Llama Vision): ${this.formatTime(
          data.llamaVisionTotalAnalysisTime
        )} ms**\n\n`;
      }
    } else {
      markdown += `(Keine Llama Vision-Analysen vorhanden)\n\n`;
    }
    markdown += `## 2. Generierter Text (Deepseek)\n`;
    markdown += `${
      this.formatTextForMarkdown(data.deepseekGeneratedText) ||
      '(Kein Text generiert)'
    }\n`;
    if (data.deepseekGeneratedTextTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.deepseekGeneratedTextTime
      )} ms*\n`;
    }
    markdown += `\n`;
    markdown += `## 3. Essenz (Deepseek)\n`;
    markdown += `_${
      this.formatTextForMarkdown(data.deepseekEssence) ||
      '(Keine Essenz extrahiert)'
    }_\n`;
    if (data.deepseekEssenceTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.deepseekEssenceTime
      )} ms*\n`;
    }
    markdown += `\n`;
    markdown += `## 4. Gemeinschaftsbild (Flux - Vergleich)\n`;
    if (
      data.fluxImageComparison &&
      !data.fluxImageComparison.startsWith('Fehler bei')
    ) {
      markdown += `(Das generierte Bild ist im PDF enthalten oder in der Web-Ansicht sichtbar.)\n`;
    } else {
      markdown += `(${
        data.fluxImageComparison || 'Kein Gemeinschaftsbild generiert'
      })\n`;
    }
    if (data.fluxImageComparisonTime !== undefined) {
      markdown += `*Benötigte Zeit: ${this.formatTime(
        data.fluxImageComparisonTime
      )} ms*\n`;
    }
    markdown += `\n`;
    markdown += `## Originalbilder\n`;
    if (data.inputImages && data.inputImages.length > 0) {
      data.inputImages.forEach((file) => {
        markdown += `* ${file.name}\n`;
      });
    } else {
      markdown += `(Keine Originalbilder vorhanden)\n`;
    }
    markdown += `\n`;
    this.downloadFile(
      markdown,
      'analyse-ergebnisse-vergleich.md',
      'text/markdown'
    );
  }
  // --- Ende Markdown Methode ---

  private async readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  private addTextToPdf(
    doc: jsPDF,
    text: string | string[],
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontStyle?: string;
      isListItem?: boolean;
      isHeading?: boolean;
    } = {} // Erweiterte Optionen
  ): number {
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 20;

    const originalFontSize = doc.getFontSize();
    const originalFontStyle = doc.getFont().fontStyle;
    const originalFontName = doc.getFont().fontName;

    const currentFontSize = options.fontSize || originalFontSize;
    const currentFontStyle = options.fontStyle || originalFontStyle;

    doc.setFontSize(currentFontSize);
    doc.setFont(originalFontName, currentFontStyle); // Behält den aktuellen Font bei, ändert nur den Stil/Größe

    // Bricht den Text um
    const lines = Array.isArray(text)
      ? text
      : doc.splitTextToSize(text, doc.internal.pageSize.width - x - 15);

    // Präzisere Höhenkalkulation basierend auf jsPDF Interna (lineHeightFactor ist ~1.15)
    const lineHeight =
      (currentFontSize * (doc.getLineHeightFactor() || 1.15)) /
      doc.internal.scaleFactor;
    const textBlockHeight = lines.length * lineHeight;

    let newY = y;

    // Fügt etwas Platz vor einer Überschrift hinzu, wenn sie nicht am Seitenanfang steht
    if (options.isHeading && newY > 15 + lineHeight) {
      // Nicht direkt nach Seitenanfang
      newY += currentFontSize * 0.3; // Etwas Abstand vor der Überschrift
    }

    if (newY + textBlockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      newY = 15; 

      if (options.isHeading && newY > 15 + lineHeight) {
        newY += currentFontSize * 0.3;
      }
    }

    doc.text(lines, x, newY);

    doc.setFontSize(originalFontSize);
    doc.setFont(originalFontName, originalFontStyle);

    let paddingAfter = currentFontSize * 0.35; 
    if (options.isListItem) {
      paddingAfter = 2;
    } else if (options.isHeading) {
      paddingAfter = currentFontSize * 0.2; 
    }
    newY += textBlockHeight + paddingAfter;

    return newY;
  }

  // Eine Hilfsfunktion, um Bilder der PDF anzufügen.
  private async addImageToPdf(
    doc: jsPDF,
    imageData: string, 
    y: number,
    caption?: string // Dateiname für Originalbilder 
  ): Promise<number> {
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 20;
    let currentY = y;

    try {
      const imgProps = doc.getImageProperties(imageData);
      const isOriginalImage = !!caption;

      const maxWidth = isOriginalImage ? 140 : 120; 
      const maxHeight = isOriginalImage ? 140 : 120;
      let imgWidth = imgProps.width;
      let imgHeight = imgProps.height;

      // Skalierung
      if (imgWidth > maxWidth) {
        imgHeight = (imgHeight * maxWidth) / imgWidth;
        imgWidth = maxWidth;
      }
      if (imgHeight > maxHeight) {
        imgWidth = (imgWidth * maxHeight) / imgHeight;
        imgHeight = maxHeight;
      }

      // X-Position für zentrierte oder linksbündige Bilder
      const xPos = isOriginalImage
        ? 15
        : (doc.internal.pageSize.width - imgWidth) / 2; // Originalbilder links, generierte zentriert

      if (currentY + imgHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 15;
      }

      doc.addImage(
        imageData,
        imgProps.fileType,
        xPos,
        currentY,
        imgWidth,
        imgHeight
      );
      currentY += imgHeight + (isOriginalImage ? 2 : 6); 
      if (caption && isOriginalImage) {

        const originalFontSize = doc.getFontSize();
        const originalFontStyle = doc.getFont().fontStyle;
        doc.setFontSize(8);
        doc.setFont(doc.getFont().fontName, 'italic');

        const captionText = doc.splitTextToSize(caption, imgWidth); 
        if (
          currentY +
            (captionText.length * 8 * 1.15) / doc.internal.scaleFactor >
          pageHeight - bottomMargin
        ) {
          doc.addPage();
          currentY = 15;
        }
        doc.text(captionText, xPos, currentY);
        currentY +=
          (captionText.length * 8 * 1.15) / doc.internal.scaleFactor + 3;
        doc.setFontSize(originalFontSize);
        doc.setFont(doc.getFont().fontName, originalFontStyle);
      }
      currentY += 5; 
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      const errorMsg = caption
        ? `(Fehler beim Einbetten von ${caption})`
        : '(Fehler beim Einbetten des Bildes)';
      currentY = this.addTextToPdf(doc, errorMsg, 10, currentY, {
        fontSize: 10,
      });
    }
    return currentY;
  }

  async generatePdf(data: OriginalProcessedData): Promise<void> {
    const doc = new jsPDF();
    let yPos = 15;

    doc.setFontSize(18);
    yPos = this.addTextToPdf(
      doc,
      'Ergebnisse (Kombination 1: Gemma, Llama 3.1, Flux)',
      10,
      yPos,
      { isHeading: true }
    );

    
    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '1. Bildanalysen (Gemma)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    if (data.gemmaSummaries && data.gemmaSummaries.length > 0) {
      data.gemmaSummaries.forEach((item) => {

        yPos = this.addTextToPdf(
          doc,
          `- ${item.file.name}: ${item.summary}`,
          15,
          yPos,
          { fontSize: 10, isListItem: true }
        );
        if (item.analysisTime !== undefined) {
          yPos = this.addTextToPdf(
            doc,
            `  Benötigte Zeit: ${this.formatTime(item.analysisTime)} ms`,
            17,
            yPos,
            { fontSize: 8, fontStyle: 'italic', isListItem: true }
          );
        }
      });
      if (data.gemmaTotalAnalysisTime !== undefined) {
        yPos = this.addTextToPdf(
          doc,
          `Gesamte Analysezeit (Gemma): ${this.formatTime(
            data.gemmaTotalAnalysisTime
          )} ms`,
          15,
          yPos,
          { fontSize: 8, fontStyle: 'italic' }
        );
      }
    } else {
      yPos = this.addTextToPdf(
        doc,
        '(Keine Gemma-Analysen vorhanden)',
        15,
        yPos,
        { fontSize: 10 }
      );
    }
    yPos += 5;


    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '2. Generierter Text (Llama 3.1)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    yPos = this.addTextToPdf(
      doc,
      data.llama31GeneratedText || '(Kein Text generiert)',
      10,
      yPos,
      { fontSize: 10 }
    );
    if (data.llama31GeneratedTextTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.llama31GeneratedTextTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '3. Essenz (Llama 3.1)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    yPos = this.addTextToPdf(
      doc,
      data.llama31Essence || '(Keine Essenz extrahiert)',
      10,
      yPos,
      { fontSize: 10, fontStyle: 'italic' }
    );
    if (data.llama31EssenceTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.llama31EssenceTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(
      doc,
      '4. Gemeinschaftsbild (Flux - Original)',
      10,
      yPos,
      { fontSize: 14, isHeading: true }
    );
    doc.setFontSize(10);
    if (
      data.fluxCommunityImage &&
      !data.fluxCommunityImage.startsWith('Fehler bei')
    ) {
      yPos = await this.addImageToPdf(doc, data.fluxCommunityImage, yPos);
    } else {
      yPos = this.addTextToPdf(
        doc,
        data.fluxCommunityImage || '(Kein Gemeinschaftsbild generiert)',
        10,
        yPos,
        { fontSize: 10 }
      );
    }
    if (data.fluxCommunityImageTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.fluxCommunityImageTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, 'Originalbilder', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    if (data.inputImages && data.inputImages.length > 0) {
      try {
        const base64Images = await Promise.all(
          data.inputImages.map((file) => this.readFileAsBase64(file))
        );
        for (let i = 0; i < base64Images.length; i++) {

          yPos = await this.addImageToPdf(
            doc,
            base64Images[i],
            yPos,
            data.inputImages[i].name
          );
        }
      } catch (readError) {

      }
    }

    doc.save('analyse-ergebnisse-original.pdf');
  }

  async generateComparisonPdf(data: ComparisonProcessedData): Promise<void> {
    if (!data.llamaVisionSummaries || !data.deepseekGeneratedText) {
      return;
    }
    const doc = new jsPDF();
    let yPos = 15;

    doc.setFontSize(18);
    yPos = this.addTextToPdf(
      doc,
      'Ergebnisse (Kombination 2: Llama Vision, Deepseek, Flux)',
      10,
      yPos,
      { isHeading: true }
    );

    
    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '1. Bildanalysen (Llama Vision)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    if (data.llamaVisionSummaries && data.llamaVisionSummaries.length > 0) {
      for (const item of data.llamaVisionSummaries) {
        yPos = this.addTextToPdf(
          doc,
          `- ${item.file.name}: ${item.summary}`,
          15,
          yPos,
          { fontSize: 10, isListItem: true }
        );
        if (item.analysisTime !== undefined) {
          yPos = this.addTextToPdf(
            doc,
            `  Benötigte Zeit: ${this.formatTime(item.analysisTime)} ms`,
            17,
            yPos,
            { fontSize: 8, fontStyle: 'italic', isListItem: true }
          );
        }
      }
      if (data.llamaVisionTotalAnalysisTime !== undefined) {
        yPos = this.addTextToPdf(
          doc,
          `Gesamte Analysezeit (Llama Vision): ${this.formatTime(
            data.llamaVisionTotalAnalysisTime
          )} ms`,
          15,
          yPos,
          { fontSize: 8, fontStyle: 'italic' }
        );
      }
    } else {
      yPos = this.addTextToPdf(
        doc,
        '(Keine Llama Vision Analysen vorhanden)',
        15,
        yPos,
        { fontSize: 10 }
      );
    }
    yPos += 5;


    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '2. Generierter Text (Deepseek)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    yPos = this.addTextToPdf(
      doc,
      data.deepseekGeneratedText || '(Kein Text von Deepseek generiert)',
      10,
      yPos,
      { fontSize: 10 }
    );
    if (data.deepseekGeneratedTextTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.deepseekGeneratedTextTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, '3. Essenz (Deepseek)', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    yPos = this.addTextToPdf(
      doc,
      data.deepseekEssence || '(Keine Essenz von Deepseek extrahiert)',
      10,
      yPos,
      { fontSize: 10, fontStyle: 'italic' }
    );
    if (data.deepseekEssenceTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.deepseekEssenceTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(
      doc,
      '4. Gemeinschaftsbild (Flux - Vergleich)',
      10,
      yPos,
      { fontSize: 14, isHeading: true }
    );
    doc.setFontSize(10);
    if (
      data.fluxImageComparison &&
      !data.fluxImageComparison.startsWith('Fehler bei')
    ) {
      yPos = await this.addImageToPdf(doc, data.fluxImageComparison, yPos);
    } else {
      yPos = this.addTextToPdf(
        doc,
        data.fluxImageComparison || '(Kein Gemeinschaftsbild generiert)',
        10,
        yPos,
        { fontSize: 10 }
      );
    }
    if (data.fluxImageComparisonTime !== undefined) {
      yPos = this.addTextToPdf(
        doc,
        `Benötigte Zeit: ${this.formatTime(data.fluxImageComparisonTime)} ms`,
        10,
        yPos,
        { fontSize: 8, fontStyle: 'italic' }
      );
    }
    yPos += 5;

    doc.setFontSize(14);
    yPos = this.addTextToPdf(doc, 'Originalbilder', 10, yPos, {
      fontSize: 14,
      isHeading: true,
    });
    doc.setFontSize(10);
    if (data.inputImages && data.inputImages.length > 0) {
      try {
        const base64Images = await Promise.all(
          data.inputImages.map((file) => this.readFileAsBase64(file))
        );
        for (let i = 0; i < base64Images.length; i++) {

          yPos = await this.addImageToPdf(
            doc,
            base64Images[i],
            yPos,
            data.inputImages[i].name
          );
        }
      } catch (readError) {}
    }

    doc.save('analyse-ergebnisse-vergleich.pdf');
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  generateFullReportTxt(
    originalData: OriginalProcessedData | null,
    comparisonData: ComparisonProcessedData | null
  ) {
    let reportContent =
      'Gesamtauswertung der Bildanalyse und Textgenerierung\n';
    reportContent +=
      '========================================================\n\n';

    if (originalData) {
      reportContent += '--- Kombination 1 (Gemma, Llama 3.1, Flux) ---\n\n';

      reportContent += '1. Bildanalysen (Gemma):\n';
      if (
        originalData.gemmaSummaries &&
        originalData.gemmaSummaries.length > 0
      ) {
        originalData.gemmaSummaries.forEach((item) => {
          reportContent += `  Datei: ${item.file.name}\n`;
          reportContent += `  Analyse:\n${this.indentText(item.summary)}\n`;
          if (item.analysisTime !== undefined) {
            reportContent += `  Benötigte Zeit: ${this.formatTime(
              item.analysisTime
            )} ms\n`;
          }
          reportContent += '\n';
        });
        if (originalData.gemmaTotalAnalysisTime !== undefined) {
          reportContent += `  Gesamte Analysezeit (Gemma): ${this.formatTime(
            originalData.gemmaTotalAnalysisTime
          )} ms\n\n`;
        }
      } else {
        reportContent += '  (Keine Gemma-Analysen vorhanden)\n\n';
      }

      reportContent += '2. Generierter Text (Llama 3.1):\n';
      reportContent += `${
        this.indentText(originalData.llama31GeneratedText) ||
        '(Kein Text generiert)'
      }\n`;
      if (originalData.llama31GeneratedTextTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          originalData.llama31GeneratedTextTime
        )} ms\n`;
      }
      reportContent += '\n';

      reportContent += '3. Essenz (Llama 3.1):\n';
      reportContent += `${
        this.indentText(originalData.llama31Essence) ||
        '(Keine Essenz extrahiert)'
      }\n`;
      if (originalData.llama31EssenceTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          originalData.llama31EssenceTime
        )} ms\n`;
      }
      reportContent += '\n';

      reportContent +=
        '4. Verwendete Keywords für Flux (Original - Llama 3.1):\n';
      reportContent += `${
        this.indentText(originalData.fluxPromptKeywords) ||
        '(Keine Keywords generiert)'
      }\n\n`;

      reportContent += '5. Gemeinschaftsbild (Flux - Original):\n';
      if (
        originalData.fluxCommunityImage &&
        !originalData.fluxCommunityImage.startsWith('Fehler bei')
      ) {
        reportContent +=
          '  (Bild wurde generiert - siehe Web-Ansicht oder PDF)\n';
      } else {
        reportContent += `  (${
          originalData.fluxCommunityImage || 'Kein Gemeinschaftsbild generiert'
        })\n`;
      }
      if (originalData.fluxCommunityImageTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          originalData.fluxCommunityImageTime
        )} ms\n`;
      }
      reportContent += '\n';
    } else {
      reportContent += '--- Keine Daten für Kombination 1 vorhanden ---\n\n';
    }

    reportContent +=
      '\n--- Kombination 2 (Llama Vision, Deepseek, Flux) ---\n\n';

    if (comparisonData) {
      reportContent += 'A. Bildanalysen (Llama Vision):\n';
      if (
        comparisonData.llamaVisionSummaries &&
        comparisonData.llamaVisionSummaries.length > 0
      ) {
        comparisonData.llamaVisionSummaries.forEach((item) => {
          reportContent += `  Datei: ${item.file.name}\n`;
          reportContent += `  Analyse:\n${this.indentText(item.summary)}\n`;
          if (item.analysisTime !== undefined) {
            reportContent += `  Benötigte Zeit: ${this.formatTime(
              item.analysisTime
            )} ms\n`;
          }
          reportContent += '\n';
        });
        if (comparisonData.llamaVisionTotalAnalysisTime !== undefined) {
          reportContent += `  Gesamte Analysezeit (Llama Vision): ${this.formatTime(
            comparisonData.llamaVisionTotalAnalysisTime
          )} ms\n\n`;
        }
      } else {
        reportContent += '  (Keine Llama Vision-Analysen vorhanden)\n\n';
      }

      reportContent += 'B. Generierter Text (Deepseek):\n';
      reportContent += `${
        this.indentText(comparisonData.deepseekGeneratedText) ||
        '(Kein Text generiert)'
      }\n`;
      if (comparisonData.deepseekGeneratedTextTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          comparisonData.deepseekGeneratedTextTime
        )} ms\n`;
      }
      reportContent += '\n';

      reportContent += 'C. Essenz (Deepseek):\n';
      reportContent += `${
        this.indentText(comparisonData.deepseekEssence) ||
        '(Keine Essenz extrahiert)'
      }\n`;
      if (comparisonData.deepseekEssenceTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          comparisonData.deepseekEssenceTime
        )} ms\n`;
      }
      reportContent += '\n';

      reportContent +=
        'D. Verwendete Keywords für Flux (Vergleich - Deepseek):\n';
      reportContent += `${
        this.indentText(comparisonData.fluxPromptKeywords) ||
        '(Keine Keywords generiert)'
      }\n\n`;

      reportContent += 'E. Gemeinschaftsbild (Flux - Vergleich):\n';
      if (
        comparisonData.fluxImageComparison &&
        !comparisonData.fluxImageComparison.startsWith('Fehler bei')
      ) {
        reportContent +=
          '  (Bild wurde generiert - siehe Web-Ansicht oder PDF)\n';
      } else {
        reportContent += `  (${
          comparisonData.fluxImageComparison ||
          'Kein Gemeinschaftsbild generiert'
        })\n`;
      }
      if (comparisonData.fluxImageComparisonTime !== undefined) {
        reportContent += `   Benötigte Zeit: ${this.formatTime(
          comparisonData.fluxImageComparisonTime
        )} ms\n`;
      }
      reportContent += '\n';
    } else {
      reportContent += '--- Keine Daten für Kombination 2 vorhanden ---\n\n';
    }

    if (originalData || comparisonData) {
      const inputImagesToUse = originalData
        ? originalData.inputImages
        : comparisonData!.inputImages;
      reportContent += '--- Verwendete Originalbilder ---\n';
      if (inputImagesToUse && inputImagesToUse.length > 0) {
        inputImagesToUse.forEach((file) => {
          reportContent += `- ${file.name}\n`;
        });
      } else {
        reportContent += '(Keine Originalbilder Information vorhanden)\n';
      }
    }

    let imageNameSuffix = '';
    if (originalData && originalData.inputImages.length > 0) {
      imageNameSuffix = this.createImageNameSuffix(originalData.inputImages);
    } else if (comparisonData && comparisonData.inputImages.length > 0) {
      imageNameSuffix = this.createImageNameSuffix(comparisonData.inputImages);
    }

    this.downloadFile(
      reportContent,
      `Gesamtreport-Analyse${imageNameSuffix}.txt`,
      'text/plain'
    );
  }

  private indentText(
    text: string | null | undefined,
    indentation: string = '    '
  ): string {
    if (!text) return '';
    return text
      .split('\n')
      .map((line) => indentation + line)
      .join('\n');
  }

  // In FileGenerationService.ts
  private createImageNameSuffix(inputImages: File[] | undefined): string {
    if (inputImages && inputImages.length > 0) {
      const firstImageName = inputImages[0].name; // z.B. "img_3.jpeg"

      let baseName =
        firstImageName.substring(0, firstImageName.lastIndexOf('.')) ||
        firstImageName;

      // Ersetzt ungültige Zeichen durch _, entfernt doppelte _
      baseName = baseName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_');
      return `_${baseName}`; // Gibt z.B. "_img_3" zurück
    }
    return '';
  }
}
