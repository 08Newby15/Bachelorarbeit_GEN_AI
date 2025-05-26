import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, switchMap, catchError, of } from 'rxjs';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string; 
  done: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OllamaService {
  private ollamaUrl = 'http://localhost:11434/api/generate'; // URL des Ollama-Servers
  private modelGemma = 'gemma3:12b'; // Name des Modells, das verwendet werden soll
  private modelLama31 = 'llama3.1:8b'; // Name des Modells, das verwendet werden soll

  private modelLamaVision = 'llama3.2-vision:11b';
  private modelDeepseek = 'deepseek-r1:14b';

  combinedSummaries: String = '';
  analyzedText: String = '';

  imagePrompt = `Prompt: Du bist ein präziser Beobachter und Experte für Bildanalyse. 
    Deine Aufgabe ist es, das angefügte Bild sorgfältig zu analysieren und die relevanten Informationen klar und 
    strukturiert in Form von Bullet Points zu extrahieren. Denke sorgfältig darüber nach was du siehst bevor du eine Antwort gibst.
    Richte dich nach den folgenden Kriterien:
    * Das Bild zeigt ein Tier oder eine Pflanze.
    * Name: Gib den spezifischen Namen des Tieres oder der Pflanze an, wenn möglich.
    * Farbe: Beschreibe die vorherrschenden Farben des Tieres oder der Pflanze.
    * Verhalten: Beschreibe, was das Tier gerade tut oder den Zustand der Pflanze.
    * Umgebung: Beschreibe die unmittelbare Umgebung, in der sich das Tier oder die Pflanze befindet.
    * Anzahl: Gib die Anzahl der sichtbaren Exemplare des genannten Tieres oder der Pflanze an.
    * Hintergrund: Beschreibe den allgemeinen Hintergrund des Bildes, der nicht zur unmittelbaren Umgebung des Hauptmotivs zählt.
    * Stelle sicher, dass jeder Bullet Point eine präzise und relevante Information zum Bild liefert.
    * Die Ausgabe soll in maximal 35 Tokens erfolgen und bei jedem Punkt maximal 3 Wörter verwendet werden.
    * Gehe an die Sache heran, als ob deine Karriere davon abhängt.
`;

  constructor(private http: HttpClient) {}

  // Konvertieren eines File-Objekts in einen Base64-String
  private convertFileToBase64(file: File): Observable<string> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
    });
  }

  analyzeImageWithGemma(file: File): Observable<string> {
    return this.analyzeImage(this.modelGemma, file);
  }

  public generateTextWithLlama(summaries: string[]): Observable<string> {
    console.log('suammries llama:', summaries);
    return this.generateText(summaries, this.modelLama31);
  }

  public extractEssenceWithLlama(text: string) {
    return this.extractEssence(text, this.modelLama31);
  }

  analyzeImageWithLlamaVision(file: File): Observable<string> {
    return this.analyzeImage(this.modelLamaVision, file);
  }

  public generateTextWithDeepseek(summaries: string[]): Observable<string> {
    console.log('suammries modelDeepseek:', summaries);

    return this.generateText(summaries, this.modelDeepseek);
  }

  public extractEssenceWithDeepseek(text: string) {
    return this.extractEssence(text, this.modelDeepseek);
  }

  // -------------------Hilfsmethoden-------------------
  private analyzeImage(model: string, file: File) {
    return this.convertFileToBase64(file).pipe(
      switchMap((base64Image: string) => {
        // Extrahierung des Base64-Teil (ohne "data:image/...;base64,")
        const base64Data = base64Image.split(',')[1];
        const payload = {
          model: model,
          prompt: this.imagePrompt,
          images: [base64Data],
          stream: false, 
        };
        console.log('Sende Payload an', model, payload);

        return this.http.post<OllamaResponse>(this.ollamaUrl, payload);
      }),
      map((response: OllamaResponse) => response.response), // Extrahiert die Antwort des Modells
      catchError((err) => {
        console.error(`Fehler beim API Aufruf für Modell ${model}:`, err);
        return of(
          `Fehler bei der API-Anfrage für ${model}: ${
            err.message || err.statusText || 'Unbekannter Fehler'
          }`
        );
      })
    );
  }

  private generateText(summaries: string[], model: string): Observable<string> {
    console.log('Summaries: ', summaries);
    const combinedSummaries = summaries.join('\n - ');

    const payload = {
      model: model,
      prompt: `Du bist ein talentierter Autor, der darauf spezialisiert ist, faszinierende und lehrreiche Inhalte für Kinder auf Deutsch zu verfassen. 
      Deine Aufgabe ist es, aus den unten folgenden Bildbeschreibungen einen zusammenhängenden, interessanten und gut lesbaren Text speziell für Kinder im Alter 
      von 8 bis 10 Jahren zu erstellen. Denke sorgfältig darüber nach bevor du eine Antwort gibst. Richte dich nach den folgenden Kriterien:
      * Der Text soll zwischen 80 und 100 Wörtern lang sein.
      * Verwende eine klare, lebendige und ansprechende Sprache, die für Kinder leicht verständlich ist.
      * Vermeide komplizierte Fachbegriffe oder erkläre sie sehr einfach.
      * Integriere die Kerninformationen aus allen bereitgestellten Bildbeschreibungen.
      * Erkläre, was auf den Bildern zu sehen ist, was daran besonders oder wissenswert ist und stelle Zusammenhänge her, falls möglich.
      * Gestalte den Text ansprechend und begeisternd. Du kannst die Kinder direkt ansprechen.
      * Vollständigkeit, faktische Korrektheit und keine Halluzinationen oder falsche Informationen.
       
      Hier der Text: ${combinedSummaries}.`,
      stream: false, // Erzeugt die gesamte Antwort auf einmal
    };
    console.log('Prompt generate Text: ', combinedSummaries);
    return this.http.post<OllamaResponse>(this.ollamaUrl, payload).pipe(
      map((response: OllamaResponse) => {
        let resultText = response.response;
        console.log('Antwort des Modells:', resultText);

        // Entfernt alle <think>...</think> Blöcke aus der Antwort des Modells.
        if (resultText) {
          resultText = resultText.replace(/<think>.*?<\/think>/gs, '');
          // Das Regex entfernt Zeilen, die nur aus Whitespace bestehen oder komplett leer sind.
          resultText = resultText.replace(/^\s*[\r\n]/gm, '').trim();
        } else {
          resultText = ''; // Fallback, falls response.response null/undefined ist
        }
        return resultText;
      }),
      catchError((err) => {
        console.error(`Fehler bei generateText für Modell ${model}:`, err);
        return of(
          `Fehler bei der Textgenerierung für ${model}: ${
            err.message || err.statusText || 'Unbekannter Fehler'
          }`
        );
      })
    );
  }

  private extractEssence(text: string, model: string): Observable<string> {
    const payload = {
      model: model,
      //prompt: `Extrahiere die absolute Kernaussage oder Essenz (maximal 3 Sätze) aus folgendem Text:"${text}". Beachte dabei, dass du den Text hier ansprechend und gut lesbar gestaltest. Zielgruppe Kinder 8-10 Jahre.`,
      prompt: `Du bist ein Meister darin, auch knifflige Texte für Kinder ganz einfach und spannend in deutscher Sprache auf den Punkt zu bringen! 
      Stell dir vor, du erklärst einem neugierigen Kind (8-10 Jahre alt), was das Allerwichtigste in einem Text ist. Lies den folgenden Text sorgfältig durch. 
      Finde die absolute Kernaussage oder die Essenz des Textes also das, was man unbedingt wissen muss. 
       Denke sorgfältig darüber nach bevor du eine Antwort gibst. Richte dich nach den folgenden Kriterien:
      * maximal 3 kurze Sätze
      * einfache, klare und ansprechende Sprache
      * gut lesbar und neugierig machend
      * faktische Korrektheit
      * keine Halluzinationen oder falsche Informationen
      * Vollständigkeit
    
    Hier ist der Text, aus dem du die Kernaussage für Kinder extrahieren sollst: ${text}`,
      stream: false,
    };
    console.log('Prompt extractEssence: ', text);
    return this.http.post<OllamaResponse>(this.ollamaUrl, payload).pipe(
      map((response: OllamaResponse) => {
        let resultText = response.response;
        if (resultText) {
          resultText = resultText.replace(/<think>.*?<\/think>/gs, ''); // Auch hier wird bereinigt
          resultText = resultText.replace(/^\s*[\r\n]/gm, '').trim();
        } else {
          resultText = '';
        }
        return resultText;
      }),
      catchError((err) => {
        console.error(`Fehler bei extractEssence für Modell ${model}:`, err);
        return of(
          `Fehler bei der Essenzextraktion für ${model}: ${
            err.message || err.statusText || 'Unbekannter Fehler'
          }`
        );
      })
    );
  }

  // Methode zur Generierung der Stichpunktliste für Flux (ANGEPASST)
  generateFluxKeywords(
    analysisText: string,
    model: string
  ): Observable<string> {
    if (
      !analysisText ||
      analysisText.trim() === '' ||
      analysisText.startsWith('Fehler bei')
    ) {
      return of(
        `(Keyword-Generierung für ${model}: Keine validen Eingabedaten)`
      );
    }

    // Der Prompt, der explizit die Überschrift "Zusammenfassung" anfordert
    const prompt = `Analysiere den folgenden Text umfassend, unter Berücksichtigung aller Details wie Tier, Pflanze
       Farbe, Anzahl, Verhalten, Umgebung und Hintergrund.
      Erstelle daraus eine finale Stichpunktliste, in der jeder identifizierte Aspekt dieser Analyse auf maximal 3 Wörter gekürzt ist. 
      Text: """${analysisText}""" Gib mir nur die Stichpunktliste unter der Überschrift "Zusammenfassung:
      " zurück. Verzichte auf jegliche Erklärungen oder Denkprozesse davor oder danach.
       Denke sorgfältig darüber nach bevor du eine Antwort gibst. Gehe an die Sache heran, als ob deine Karriere davon abhängt.`;

    const payload = {
      model: model,
      prompt: prompt,
      stream: false,
    };
    console.log(`Sende Payload zu ${model} für generateFluxKeywords:`, payload);

    return this.http.post<OllamaResponse>(this.ollamaUrl, payload).pipe(
      map((response: OllamaResponse) => {
        let resultText = response.response || '';

        // 1. Entfernt <think>...</think> Blöcke (Sicherheitsmaßnahme)
        resultText = resultText.replace(/<think>.*?<\/think>/gs, '');

        // 2. Extrahiert Text nach "Zusammenfassung:" (Groß/Kleinschreibung ignorieren, nachfolgende Leerzeichen/Umbrüche erlauben)
        const match = resultText.match(/Zusammenfassung:?\s*\n?([\s\S]*)/i); // Suche nach "Zusammenfassung:", optional Doppelpunkt, Whitespace/Newline, dann wird alles berücksichtigt.

        if (match && match[1]) {
          resultText = match[1].trim();
        } else {
          console.warn(
            `Konnte die Überschrift "Zusammenfassung:" im Output von ${model} für Keywords nicht finden. Verwende den gesamten bereinigten Text.`
          );
          resultText = resultText.replace(/^\s*[\r\n]/gm, '').trim(); // Bereinige trotzdem Whitespace
        }

        return resultText; // Gib die (hoffentlich) reine Stichpunktliste zurück
      }),
      catchError((err) => {
        console.error(
          `Fehler bei generateFluxKeywords für Modell ${model}:`,
          err
        );
        return of(
          `Fehler bei der Keyword-Generierung für ${model}: ${
            err.message || err.statusText || 'Unbekannter Fehler'
          }`
        );
      })
    );
  }
}
