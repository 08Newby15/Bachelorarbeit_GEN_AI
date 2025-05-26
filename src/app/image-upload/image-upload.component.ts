import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-upload',
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.css',
})
export class ImageUploadComponent {
  @Output() filesDropped = new EventEmitter<File[]>();
  protected imageFiles: File[] = [];
  protected isDraggingOver: boolean = false;
  maxFiles: number = 5;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent){
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
      
      if(imageFiles.length > this.maxFiles) {
        alert(`Bitte maximal ${this.maxFiles} Bilder im Ordner.`);
        return;
      }

      if (imageFiles.length > 0) {
        this.imageFiles = imageFiles;
        this.filesDropped.emit(this.imageFiles);
      }
    }
  }
}
