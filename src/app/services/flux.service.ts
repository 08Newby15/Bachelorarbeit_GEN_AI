import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root',
})
export class FluxService {
  private fluxUrl = 'http://localhost:8123/generate'; 

  constructor(private http: HttpClient) {}

  // Erhält die Beschreibungen der Bilder und generiert ein Bild
  public generateImageWithFlux(descriptions: string): Observable<string> {
    const prompt = `Erstelle ein realistisches Bild aus: ${descriptions}`;
    const payload = {
      prompt: prompt,
    }

return this.http.post(this.fluxUrl, payload, {
  headers: new HttpHeaders({"content-type": "application/json"}),
  responseType: 'blob'
}).pipe(
  switchMap((blob: Blob) => {
    return new Observable((observer: Observer<string>) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result enthält die Base64-Daten-URL (z.B. "data:image/png;base64,...")
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = (error) => {
        console.error('Error reading blob:', error);
        observer.error(error);
      };
      reader.readAsDataURL(blob);
    });
  })
);
  }
}
