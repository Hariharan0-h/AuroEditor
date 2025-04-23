import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-text-editor',
  templateUrl: './text-editor.component.html',
  styleUrls: ['./text-editor.component.css']
})
export class TextEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorContent') editorContent!: ElementRef;
  @Input() initialContent: string = '';
  @Output() contentChange = new EventEmitter<string>();
  
  content: string = '';
  statusText: string = 'Ready';
  wordCount: number = 0;
  textDirection: string = 'ltr'; // Default left-to-right
  private lastSavedContent: string = '';
  private saveInterval: any;
  private saveTimeout: any;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  
  constructor() { }

  ngOnInit(): void {
    // Retrieve previously saved content if available
    const savedContent = localStorage.getItem('editor-content');
    if (savedContent && !this.initialContent) {
      this.content = savedContent;
    } else {
      this.content = this.initialContent;
    }
    
    // Set default text direction to LTR
    this.textDirection = 'ltr';
    
    // Auto-save every 30 seconds
    this.saveInterval = setInterval(() => {
      this.saveContent(true);
    }, 30000);

    // Initialize undo stack with initial content
    this.undoStack.push(this.content);
  }

  ngOnDestroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveContent();
  }

  ngAfterViewInit(): void {
    // Set focus to the editor when component initializes
    if (this.editorContent && this.editorContent.nativeElement) {
      setTimeout(() => {
        this.editorContent.nativeElement.focus();
        
        // Set initial content if available
        if (this.content) {
          this.editorContent.nativeElement.innerHTML = this.content;
          this.updateWordCount();
        }
        
        // Ensure the initial direction is properly set
        this.applyTextDirection();
      }, 0);
    }
  }

  /**
   * Executes a document command for formatting
   */
  formatText(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
    this.editorContent.nativeElement.focus();
    this.updateStatusInfo();
    this.addToUndoStack();
  }

  /**
   * Formats text as a heading
   */
  formatHeading(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (value) {
      // Clear any existing heading format first
      document.execCommand('formatBlock', false, 'div');
      // Apply new heading
      document.execCommand('formatBlock', false, value);
    } else {
      // Reset to normal text
      document.execCommand('formatBlock', false, 'div');
    }
    
    this.editorContent.nativeElement.focus();
    this.addToUndoStack();
  }

  /**
   * Changes the font
   */
  formatFontName(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (value) {
      document.execCommand('fontName', false, value);
    }
    
    this.editorContent.nativeElement.focus();
    this.addToUndoStack();
  }

  /**
   * Changes font size
   */
  formatFontSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (value) {
      document.execCommand('fontSize', false, value);
    }
    
    this.editorContent.nativeElement.focus();
    this.addToUndoStack();
  }

  /**
   * Changes text color
   */
  formatColor(event: Event): void {
    const target = event.target as HTMLInputElement;
    const color = target.value;
    
    document.execCommand('foreColor', false, color);
    this.editorContent.nativeElement.focus();
    this.addToUndoStack();
  }

  /**
   * Inserts a link
   */
  insertLink(): void {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    const defaultUrl = selectedText.startsWith('http') ? selectedText : 'http://';
    
    const url = prompt('Enter URL:', defaultUrl);
    
    if (url) {
      // If no text is selected, insert the URL as the link text
      if (!selectedText) {
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${url}</a>`);
      } else {
        document.execCommand('createLink', false, url);
        
        // Make links open in new tab
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // Check if commonAncestorContainer is an Element or Document before calling querySelectorAll
          let container = range.commonAncestorContainer;
          
          // If it's a text node, get its parent element
          if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
            container = container.parentElement;
          }
          
          // Now we can safely check if it's an element
          if (container.nodeType === Node.ELEMENT_NODE) {
            const linkNodes = (container as Element).querySelectorAll('a');
            linkNodes.forEach(link => {
              if (!link.getAttribute('target')) {
                link.setAttribute('target', '_blank');
              }
            });
          }
        }
      }
    }
    
    this.editorContent.nativeElement.focus();
    this.updateStatusInfo();
    this.addToUndoStack();
  }

  /**
   * Inserts an image
   */
  insertImage(): void {
    const url = prompt('Enter image URL:');
    
    if (url) {
      document.execCommand('insertImage', false, url);
      
      // Set default width if it's an image
      if (this.editorContent && this.editorContent.nativeElement) {
        setTimeout(() => {
          const images = this.editorContent.nativeElement.querySelectorAll('img[src="' + url + '"]:not([width])');
          images.forEach((img: HTMLImageElement) => {
            img.style.maxWidth = '100%';
            img.addEventListener('error', () => {
              img.alt = 'Image failed to load';
              img.style.border = '1px dashed red';
              img.style.padding = '10px';
            });
          });
        }, 10);
      }
    }
    
    this.editorContent.nativeElement.focus();
    this.updateStatusInfo();
    this.addToUndoStack();
  }
  
  /**
   * Applies current text direction to the editor
   */
  applyTextDirection(): void {
    if (this.editorContent && this.editorContent.nativeElement) {
      this.editorContent.nativeElement.setAttribute('dir', this.textDirection);
      
      // Adjust text alignment based on direction
      if (this.textDirection === 'rtl') {
        document.execCommand('justifyRight', false, '');
      } else {
        document.execCommand('justifyLeft', false, '');
      }
    }
  }
  
  /**
   * Toggles text direction between LTR and RTL
   */
  toggleDirection(): void {
    // Toggle the direction state
    this.textDirection = this.textDirection === 'ltr' ? 'rtl' : 'ltr';
    
    // Apply the new direction to the editor
    this.applyTextDirection();
    
    // Save direction preference
    localStorage.setItem('editor-direction', this.textDirection);
    
    this.editorContent.nativeElement.focus();
    this.addToUndoStack();
  }
  
  /**
   * Checks if a formatting option is currently active
   */
  isActive(command: string): boolean {
    return document.queryCommandState(command);
  }

  /**
   * Handles content changes
   */
  onContentChange(event: Event): void {
    this.content = (event.target as HTMLElement).innerHTML;
    this.updateWordCount();
    this.updateStatusInfo();
    this.contentChange.emit(this.content);
    this.scheduleSave();
    
    // Do not add to undo stack on every change to avoid excessive entries
    // Instead, we'll add to undo stack on specific formatting actions
  }

  /**
   * Schedule an auto-save after brief inactivity
   */
  scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveContent(true);
      this.addToUndoStack(); // Add to undo stack after a period of inactivity
    }, 2000);
  }

  /**
   * Add current state to undo stack
   */
  addToUndoStack(): void {
    // Prevent duplicate consecutive states
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== this.content) {
      // Limit stack size to prevent memory issues
      if (this.undoStack.length >= 50) {
        this.undoStack.shift();
      }
      this.undoStack.push(this.content);
      // Clear redo stack on new action
      this.redoStack = [];
    }
  }

  /**
   * Undo the last action
   */
  undo(): void {
    if (this.undoStack.length > 1) {
      const currentContent = this.undoStack.pop();
      if (currentContent) {
        this.redoStack.push(currentContent);
      }
      
      const previousContent = this.undoStack[this.undoStack.length - 1];
      this.setContent(previousContent);
      this.updateStatusInfo();
    }
  }

  /**
   * Redo the last undone action
   */
  redo(): void {
    if (this.redoStack.length > 0) {
      const nextContent = this.redoStack.pop();
      if (nextContent) {
        this.undoStack.push(nextContent);
        this.setContent(nextContent);
        this.updateStatusInfo();
      }
    }
  }

  /**
   * Keyboard shortcuts handler
   */
  onKeyDown(event: KeyboardEvent): void {
    // Save on Ctrl+S
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveContent();
    }
    
    // Bold: Ctrl+B
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.formatText('bold');
    }
    
    // Italic: Ctrl+I
    if (event.ctrlKey && event.key === 'i') {
      event.preventDefault();
      this.formatText('italic');
    }
    
    // Underline: Ctrl+U
    if (event.ctrlKey && event.key === 'u') {
      event.preventDefault();
      this.formatText('underline');
    }
    
    // Undo: Ctrl+Z
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      this.undo();
    }
    
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((event.ctrlKey && event.key === 'y') || 
        (event.ctrlKey && event.shiftKey && event.key === 'z')) {
      event.preventDefault();
      this.redo();
    }
  }

  /**
   * Focus event handler
   */
  onEditorFocus(): void {
    this.statusText = 'Editing...';
  }

  /**
   * Blur event handler
   */
  onEditorBlur(): void {
    this.statusText = 'Ready';
    this.saveContent();
  }

  /**
   * Updates the word count
   */
  updateWordCount(): void {
    const text = this.editorContent.nativeElement.innerText.trim();
    
    if (text) {
      this.wordCount = text.split(/\s+/).filter((word: string) => word !== '').length;
    } else {
      this.wordCount = 0;
    }
  }

  /**
   * Updates the status bar info
   */
  updateStatusInfo(): void {
    // You can add more info here like cursor position, selection info, etc.
    if (this.lastSavedContent !== this.content) {
      this.statusText = 'Edited';
    } else {
      this.statusText = 'Saved';
    }
  }

  /**
   * Shows temporary save status
   */
  showSaveStatus(message: string, duration: number = 2000): void {
    const originalStatus = this.statusText;
    this.statusText = message;
    
    setTimeout(() => {
      this.statusText = originalStatus;
    }, duration);
  }

  /**
   * Saves the content
   */
  saveContent(silent: boolean = false): void {
    if (this.lastSavedContent !== this.content) {
      this.lastSavedContent = this.content;
      
      if (!silent) {
        this.showSaveStatus('Saving...');
      }
      
      // Save to localStorage
      localStorage.setItem('editor-content', this.content);
      
      // Notify parent component
      this.contentChange.emit(this.content);
      
      if (!silent) {
        setTimeout(() => {
          this.showSaveStatus('Saved!');
        }, 500);
      } else {
        this.statusText = 'Saved';
      }
    }
  }

  /**
   * Public method to get editor content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Public method to set editor content
   */
  setContent(content: string): void {
    this.content = content;
    if (this.editorContent && this.editorContent.nativeElement) {
      this.editorContent.nativeElement.innerHTML = content;
    }
    this.updateWordCount();
    this.contentChange.emit(this.content);
  }

  /**
   * Public method to clear editor content
   */
  clearContent(): void {
    if (confirm('Are you sure you want to clear all content?')) {
      this.setContent('');
      this.addToUndoStack();
    }
  }
  
  /**
   * Export content as HTML
   */
  exportAsHtml(): string {
    return this.content;
  }
  
  /**
   * Export content as plain text
   */
  exportAsText(): string {
    if (this.editorContent && this.editorContent.nativeElement) {
      return this.editorContent.nativeElement.innerText;
    }
    return '';
  }
}