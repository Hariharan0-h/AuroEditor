import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-new.component.html',
  styleUrl: './editor-new.component.css'
})
export class EditorNewComponent implements AfterViewInit {
  @ViewChild('documentContent') documentContent!: ElementRef;
  
  lastSaved: Date = new Date();
  currentFont: string = 'Calibri';
  currentFontSize: string = '11';
  currentTextColor: string = '#000000';
  currentHighlightColor: string = '#FFFF00';
  documentTitle: string = 'Untitled Document';
  wordCount: number = 0;
  showFileDropdown: boolean = false;
  
  ngAfterViewInit(): void {
    // Set up editor functionality after view is initialized
    this.setupEditorEventListeners();
    this.focusEditor();
  }
  
  focusEditor(): void {
    // Focus the editor when component loads
    setTimeout(() => {
      this.documentContent.nativeElement.focus();
    }, 0);
  }
  
  setupEditorEventListeners(): void {
    // Set up event listeners for document content changes
    this.documentContent.nativeElement.addEventListener('input', () => {
      this.updateWordCount();
    });
    
    // Add auto-save timer (every 30 seconds)
    setInterval(() => {
      this.saveDocument(true);
    }, 30000);
  }
  
  updateWordCount(): void {
    const text = this.documentContent.nativeElement.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    this.wordCount = words.length;
  }
  
  formatText(command: string, value?: string): void {
    document.execCommand(command, false, value || '');
    this.documentContent.nativeElement.focus();
  }
  
  saveDocument(isAutoSave: boolean = false): void {
    this.lastSaved = new Date();
    console.log(`Document ${isAutoSave ? 'auto-saved' : 'saved'} at:`, this.lastSaved);
    // In a real implementation, this would save to a backend service
    
    if (!isAutoSave) {
      this.showNotification('Document saved!');
    }
  }
  
  showNotification(message: string): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000);
  }
  
  exportDocument(): void {
    console.log('Exporting document...');
    const content = this.documentContent.nativeElement.innerHTML;
    
    // Create a download link for the document
    const blob = new Blob([`<!DOCTYPE html><html><head><title>${this.documentTitle}</title></head><body>${content}</body></html>`], 
                          { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.documentTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Document exported successfully!');
  }
  
  applyFontFamily(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentFont = select.value;
    this.formatText('fontName', this.currentFont);
  }
  
  applyFontSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentFontSize = select.value;
    this.formatText('fontSize', this.currentFontSize);
  }
  
  applyTextColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentTextColor = input.value;
    this.formatText('foreColor', this.currentTextColor);
  }
  
  applyHighlightColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentHighlightColor = input.value;
    this.formatText('hiliteColor', this.currentHighlightColor);
  }
  
  toggleTextAlign(alignment: string): void {
    this.formatText(`justify${alignment}`);
  }
  
  insertList(listType: string): void {
    this.formatText(listType === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList');
  }
  
  modifyDocumentTitle(newTitle: string): void {
    this.documentTitle = newTitle || 'Untitled Document';
  }
  
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveDocument();
    }
    
    // Ctrl+B to bold
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.formatText('bold');
    }
    
    // Ctrl+I to italic
    if (event.ctrlKey && event.key === 'i') {
      event.preventDefault();
      this.formatText('italic');
    }
    
    // Ctrl+U to underline
    if (event.ctrlKey && event.key === 'u') {
      event.preventDefault();
      this.formatText('underline');
    }
  }
  
  showHelp(): void {
    const helpContent = `
      <h2>Keyboard Shortcuts</h2>
      <ul>
        <li><strong>Ctrl+S</strong>: Save document</li>
        <li><strong>Ctrl+B</strong>: Bold text</li>
        <li><strong>Ctrl+I</strong>: Italic text</li>
        <li><strong>Ctrl+U</strong>: Underline text</li>
      </ul>
    `;
    
    // In a real app, this would display in a modal
    alert('Help\n\nKeyboard Shortcuts:\nCtrl+S: Save document\nCtrl+B: Bold text\nCtrl+I: Italic Text\nCtrl+U: Underline text');
  }
  
  toggleFileDropdown(): void {
    this.showFileDropdown = !this.showFileDropdown;
  }
  
  printDocument(): void {
    window.print();
    this.showNotification('Document sent to printer!');
  }
  
  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event): void {
    // Close dropdown if clicking outside
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest('.dropdown')) {
      this.showFileDropdown = false;
    }
  }
}