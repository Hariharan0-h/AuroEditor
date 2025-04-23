import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TextEditorService {
  private storageKey = 'editor-content';
  private backupInterval = 60000; // 1 minute
  private maxBackups = 5;

  // Observable for broadcasting changes between multiple editor instances
  private contentChangeSubject = new Subject<string>();
  public contentChange$ = this.contentChangeSubject.asObservable();

  constructor() {
    // Initialize backup system
    this.setupBackupSystem();
  }

  /**
   * Save content to localStorage
   */
  saveContent(content: string): void {
    localStorage.setItem(this.storageKey, content);
    this.contentChangeSubject.next(content);
  }

  /**
   * Get content from localStorage
   */
  getContent(): string {
    return localStorage.getItem(this.storageKey) || '';
  }

  /**
   * Create a backup of the current content
   */
  private createBackup(): void {
    const currentContent = this.getContent();
    if (!currentContent) return;

    // Get existing backups
    const backups = this.getBackups();
    
    // Add new backup with timestamp
    const now = new Date();
    const newBackup = {
      timestamp: now.getTime(),
      content: currentContent,
      label: now.toLocaleString()
    };
    
    // Add to beginning of array
    backups.unshift(newBackup);
    
    // Limit number of backups
    if (backups.length > this.maxBackups) {
      backups.pop();
    }
    
    // Save backups
    localStorage.setItem('editor-backups', JSON.stringify(backups));
  }

  /**
   * Setup automatic backup system
   */
  private setupBackupSystem(): void {
    // Create backup on interval
    setInterval(() => {
      this.createBackup();
    }, this.backupInterval);
  }

  /**
   * Get all available backups
   */
  getBackups(): Array<{timestamp: number, content: string, label: string}> {
    const backupsJson = localStorage.getItem('editor-backups');
    if (backupsJson) {
      return JSON.parse(backupsJson);
    }
    return [];
  }

  /**
   * Restore a backup
   */
  restoreBackup(timestamp: number): string {
    const backups = this.getBackups();
    const backup = backups.find(b => b.timestamp === timestamp);
    
    if (backup) {
      return backup.content;
    }
    
    return '';
  }

  /**
   * Clear all backups
   */
  clearBackups(): void {
    localStorage.removeItem('editor-backups');
  }

  /**
   * Export content as HTML file
   */
  exportAsHtmlFile(content: string, filename: string = 'document.html'): void {
    // Create simple HTML document
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
    `;
    
    this.downloadFile(htmlContent, filename, 'text/html');
  }

  /**
   * Export content as text file
   */
  exportAsTextFile(content: string, filename: string = 'document.txt'): void {
    // Create temporary DOM element to extract plain text
    const tempElement = document.createElement('div');
    tempElement.innerHTML = content;
    const plainText = tempElement.textContent || tempElement.innerText || '';
    
    this.downloadFile(plainText, filename, 'text/plain');
  }

  /**
   * Create and download a file
   */
  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}