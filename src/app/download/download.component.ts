import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-download',
  imports: [],
  templateUrl: './download.component.html',
  styleUrl: './download.component.css'
})
export class DownloadComponent {

  @Output() downloadRequest = new EventEmitter<"pdf" | "markdown">();

  requestDownload(format: "pdf" | "markdown") {
    this.downloadRequest.emit(format);}

}
