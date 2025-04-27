import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Type definitions for editor objects
export interface EditorObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
}

export interface TextObject extends EditorObject {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  textAlign: string;
  listType?: 'ordered' | 'unordered' | null;
}

export interface ShapeObject extends EditorObject {
  shapeType: 'rectangle' | 'circle' | 'vline' | 'hline';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ImageObject extends EditorObject {
  src: string;
}

export interface TableObject extends EditorObject {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  customCells: {
    row: number;
    col: number;
    width: number;
    height: number;
  }[];
  headerHeight?: number;
  columnWidths?: number[];
  rowHeights?: number[];
  cellData?: string[][];
}

export interface GroupObject extends EditorObject {
  objects: EditorObject[];
}

@Component({
  selector: 'app-auro-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auro-editor.component.html',
  styleUrls: ['./auro-editor.component.css']
})
export class AuroEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  // Canvas state
  objects: EditorObject[] = [];
  selectedObject: EditorObject | null = null;
  zoom = 100;
  
  // Dragging state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  dragStartObjX = 0;
  dragStartObjY = 0;
  
  // Resizing state
  isResizing = false;
  resizeHandle = '';
  resizeStartX = 0;
  resizeStartY = 0;
  resizeStartWidth = 0;
  resizeStartHeight = 0;
  
  // Rotation state
  isRotating = false;
  rotateStartX = 0;
  rotateStartY = 0;
  rotateStartAngle = 0;
  
  // Multi-select state
  selectedObjects: EditorObject[] = [];
  isMultiSelect = false;

  // Undo/Redo history
  private undoStack: EditorObject[][] = [];
  private redoStack: EditorObject[][] = [];
  
  // Counter for generating IDs
  nextId = 1;
  
  // UI state
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  showTextControls = false;
  
  // Modal states
  showImageModal = false;
  showExportModal = false;
  showFieldModal = false;
  showTableGrid = false;
  
  // Table cell resize modal
  showTableCellModal = false;
  currentTableCell = { 
    tableId: '', 
    row: 0, 
    col: 0, 
    width: 80, 
    height: 30 
  };
  
  // Table resize states
  isResizingColumn = false;
  isResizingRow = false;
  isResizingCell = false;
  currentResizeIndex = -1;
  resizeStartSize = 0;
  
  // Current position
  cursorPosition = { x: 0, y: 0 };
  
  // Table grid state
  tableRows = 0;
  tableCols = 0;
  
  // Pages
  pages: EditorObject[][] = [[]];
  currentPage = 0;
  
  // Export options
  exportFormat = 'svg';
  exportDetails = '';
  
  // Notification
  notification = '';
  notificationType: 'success' | 'warning' | 'error' = 'success';
  showNotification = false;
  
  // Available field types
  fieldTypes = [
    { type: 'name', icon: 'fas fa-user', label: 'Name' },
    { type: 'age', icon: 'fas fa-birthday-cake', label: 'Age' },
    { type: 'eye', icon: 'fas fa-eye', label: 'Eye' },
    { type: 'gender', icon: 'fas fa-venus-mars', label: 'Gender' },
    { type: 'uin', icon: 'fas fa-id-card', label: 'UIN' },
    { type: 'diagnosis', icon: 'fas fa-stethoscope', label: 'Diagnosis' },
    { type: 'procedure', icon: 'fas fa-procedures', label: 'Procedure' },
    { type: 'implant', icon: 'fas fa-cog', label: 'Implant' },
    { type: 'doctor_name', icon: 'fas fa-user-md', label: 'Doctor Name' },
    { type: 'mcir_no', icon: 'fas fa-hashtag', label: 'MCIR No' },
    { type: 'date', icon: 'fas fa-calendar-alt', label: 'Date' },
  ];
  
  // Alignment options
  alignment = {
    left: 10,
    center: 397,
    right: 784,
    top: 10,
    middle: 561.5,
    bottom: 1113
  };

  private lastCursorRange: Range | null = null;
  
  constructor() { }

  ngOnInit(): void {
    // Initialize with an empty page
    this.pages = [[]];
  }

  ngAfterViewInit(): void {
    this.setupEditorEvents();
    setTimeout(() => this.addTextbox(), 100);
  }

  // ====== IMPROVED TEXT HANDLING SECTION ======
  
  private saveTextCursorPosition(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.lastCursorRange = selection.getRangeAt(0).cloneRange();
    }
  }
  
  private restoreTextCursorPosition(): void {
    if (this.lastCursorRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(this.lastCursorRange);
      }
    }
  }

  focusTextForEditing(textObj: TextObject): void {
    setTimeout(() => {
      // Find the text element
      const selector = `[id="${textObj.id}"] .text-object`;
      const textElement = document.querySelector(selector) as HTMLElement;
      
      if (textElement) {
        // Set the content directly before focusing to avoid issues
        textElement.innerHTML = textObj.text || '';
        
        // Set focus
        textElement.focus();
        
        // Place cursor at the end of text
        const range = document.createRange();
        const selection = window.getSelection();
        
        // If text is empty, just focus on the element
        if (textElement.childNodes.length === 0) {
          textElement.focus();
          return;
        }
        
        // Otherwise, set cursor at the end
        const lastChild = textElement.lastChild as Node;
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, lastChild.textContent?.length || 0);
        } else {
          range.selectNodeContents(lastChild);
          range.collapse(false); // collapse to end
        }
        
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 50);
  }

  updateTextDirectly(obj: TextObject): void {
    if (!obj) return;
    
    const textElement = document.querySelector(`[id="${obj.id}"] .text-object`) as HTMLElement;
    if (!textElement) return;
    
    // Save state for undo before changing text
    this.saveToHistory();
    
    // Update the text property with the current HTML content
    obj.text = textElement.innerHTML;
  }
  
  updateTextContent(e: Event, obj: EditorObject): void {
    if (obj.type !== 'text') return;
    
    // Save state for undo before changing text
    this.saveToHistory();
    
    // Save current cursor position
    this.saveTextCursorPosition();
    
    const target = e.target as HTMLElement;
    
    // Update the text property
    (obj as TextObject).text = target.innerHTML;
    
    // Restore cursor position after a short delay to allow for rendering
    setTimeout(() => this.restoreTextCursorPosition(), 0);
  }

  // ====== IMPROVED EVENT HANDLING SECTION ======

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // Don't handle keyboard shortcuts if actively editing text
    if (this.selectedObject?.type === 'text' && 
        document.activeElement?.getAttribute('contenteditable') === 'true') {
      // Only handle Escape to exit text editing mode
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
        e.preventDefault();
      }
      return;
    }
    
    if (e.key === 'Delete' && this.selectedObject) {
      this.deleteObject();
    }
    
    // Ctrl+C for copy
    if (e.ctrlKey && e.key === 'c' && this.selectedObject) {
      this.copyToClipboard();
    }
    
    // Ctrl+V for paste
    if (e.ctrlKey && e.key === 'v') {
      this.pasteFromClipboard();
    }
    
    // Ctrl+D for duplicate
    if (e.ctrlKey && e.key === 'd' && this.selectedObject) {
      e.preventDefault();
      this.duplicateObject();
    }
    
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      this.undo();
    }
    
    // Ctrl+Y for redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
    
    // Shift for multi-select mode
    this.isMultiSelect = e.shiftKey;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    // Turn off multi-select mode when shift key is released
    if (e.key === 'Shift') {
      this.isMultiSelect = false;
    }
  }

  @HostListener('input', ['$event'])
  onTextInput(e: Event): void {
    if (!e.target || !(e.target as HTMLElement).classList.contains('text-object')) {
      return;
    }
    
    // Save cursor position
    this.saveTextCursorPosition();
    
    const textElement = e.target as HTMLElement;
    const objId = textElement.closest('.editor-object')?.id;
    
    if (!objId) return;
    
    // Find the corresponding object
    const obj = this.objects.find(o => o.id === objId);
    if (!obj || obj.type !== 'text') return;
    
    // Update the text property
    (obj as TextObject).text = textElement.innerHTML;
    
    // Restore cursor position on next tick
    setTimeout(() => this.restoreTextCursorPosition(), 0);
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    // Only handle paste events for text objects
    if (this.selectedObject?.type === 'text' && 
        document.activeElement?.getAttribute('contenteditable') === 'true') {
      e.preventDefault();
      
      // Get text content from clipboard
      const text = e.clipboardData?.getData('text/plain');
      
      // Insert text at cursor position
      if (text) {
        document.execCommand('insertText', false, text);
        
        // Update the text object after paste
        const textElement = document.activeElement as HTMLElement;
        if (textElement) {
          (this.selectedObject as TextObject).text = textElement.innerHTML;
        }
      }
    }
  }
  
  // Add this new handler for the browser's context menu
  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: MouseEvent): void {
    // Check if the click was inside the editor
    if (this.editorContainer && this.editorContainer.nativeElement.contains(e.target)) {
      // Prevent default browser context menu
      e.preventDefault();
      
      // Find the closest editor object
      const target = e.target as HTMLElement;
      const editorObjectElement = target.closest('.editor-object');
      
      if (editorObjectElement) {
        // Get the object by ID
        const objectId = editorObjectElement.id;
        const obj = this.objects.find(o => o.id === objectId);
        
        if (obj) {
          // Select the object
          this.selectedObject = obj;
          this.selectedObjects = [obj];
          
          // Show context menu at click position
          this.showContextMenu = true;
          this.contextMenuX = e.clientX;
          this.contextMenuY = e.clientY;
          
          // Update text controls if needed
          this.updateTextControls();
        }
      } else {
        // Clicked on the editor but not on any object
        this.selectedObject = null;
        this.selectedObjects = [];
        this.showContextMenu = false;
      }
    }
  }

  // ====== SELECTION AND DRAG HANDLING ======
  
  selectAndStartDrag(e: MouseEvent, obj: EditorObject): void {
    // Prevent event from bubbling
    e.stopPropagation();
    
    // Don't handle if target is a handle or editable content
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || 
        target.classList.contains('rotate-handle') ||
        target.closest('.rotate-handle')) {
      return;
    }
    
    // Special handling for text objects
    if (obj.type === 'text') {
      // If clicking directly on a text element that's already selected
      if (target.classList.contains('text-object') && 
          obj === this.selectedObject &&
          target.getAttribute('contenteditable') === 'true') {
        // Allow normal text selection within the editable area
        return;
      }
      
      // Make text editable when selecting a text object
      if (obj !== this.selectedObject) {
        this.selectedObject = obj;
        this.selectedObjects = [obj];
        this.updateTextControls();
        
        // Focus the text element after a short delay to allow Angular to update
        this.focusTextForEditing(obj as TextObject);
        return;
      }
    }
    
    // Left click - Selection logic
    if (e.button === 0) {
      if (this.isMultiSelect) {
        const index = this.selectedObjects.findIndex(o => o.id === obj.id);
        if (index === -1) {
          // Add to selection
          this.selectedObjects.push(obj);
          if (!this.selectedObject) {
            this.selectedObject = obj;
          }
        } else {
          // Remove from selection
          this.selectedObjects.splice(index, 1);
          if (this.selectedObject && this.selectedObject.id === obj.id) {
            this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[0] : null;
          }
        }
      } else {
        this.selectedObject = obj;
        this.selectedObjects = [obj];
      }
      
      // Start dragging
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartObjX = obj.x;
      this.dragStartObjY = obj.y;
      
      // Store original positions for all selected objects
      this.selectedObjects.forEach(selectedObj => {
        (selectedObj as any).originalX = selectedObj.x;
        (selectedObj as any).originalY = selectedObj.y;
      });
      
      // Bring to front
      this.bringToFront(obj);
      
      // Update text controls if needed
      this.updateTextControls();
    }
  }

  startResize(e: MouseEvent, handle: string): void {
    if (!this.selectedObject) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    this.isResizing = true;
    this.resizeHandle = handle;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    this.resizeStartWidth = this.selectedObject.width;
    this.resizeStartHeight = this.selectedObject.height;
    this.dragStartObjX = this.selectedObject.x;
    this.dragStartObjY = this.selectedObject.y;
    
    // Save state for undo
    this.saveToHistory();
  }
  
  startRotate(e: MouseEvent): void {
    if (!this.selectedObject) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    this.isRotating = true;
    
    // Calculate center of object
    const centerX = this.selectedObject.x + this.selectedObject.width / 2;
    const centerY = this.selectedObject.y + this.selectedObject.height / 2;
    
    // Get cursor position relative to the editor with zoom adjustment
    const rect = this.editorContainer.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (this.zoom / 100);
    const y = (e.clientY - rect.top) / (this.zoom / 100);
    
    // Calculate initial angle
    const angleRadians = Math.atan2(y - centerY, x - centerX);
    this.rotateStartAngle = (angleRadians * 180 / Math.PI) + 90; // Start angle
    
    // Store current rotation
    this.rotateStartX = this.selectedObject.rotation || 0;
    
    // Save state for undo
    this.saveToHistory();
  }

  handleCanvasClick(e: MouseEvent): void {
    // Clear selection unless shift key is pressed for multi-select
    if (!this.isMultiSelect) {
      this.selectedObject = null;
      this.selectedObjects = [];
      this.showTextControls = false;
    }
    
    this.hideContextMenu();
  }

  handleSelectFocus(e: Event): void {
    // Prevent the click from propagating to parent elements
    e.stopPropagation();
    e.preventDefault();
    
    // Get the select element
    const select = e.target as HTMLSelectElement;
    
    // Stop immediate blur by setting a timeout to create a small delay
    setTimeout(() => {
      // Force focus back to the select element
      select.focus();
      
      // Add a one-time click handler to the document that will only
      // close the dropdown when clicking outside both the select and its options
      const clickOutsideHandler = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // Check if click is outside the select element and its dropdown
        if (!select.contains(target) && !target.closest('option')) {
          select.blur();
          document.removeEventListener('click', clickOutsideHandler, true);
        }
      };
      
      // Add listener with capture phase to catch events before they bubble
      document.addEventListener('click', clickOutsideHandler, true);
    }, 50);
  }

  handleSelectOptionClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    // Prevent this click from closing the dropdown immediately
    const target = e.target as HTMLOptionElement;
    const select = target.closest('select');
    
    // Schedule this to happen after the option selection is processed
    setTimeout(() => {
      if (select) {
        // Keep focus on select after option selection
        select.focus();
      }
    }, 0);
  }

  keepDropdownOpen(select: HTMLSelectElement): void {
    // Force the dropdown to stay open
    const event = new MouseEvent('mousedown', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    select.dispatchEvent(event);
  }

  // ====== HELPER METHODS ======
  
  getObjectProperty(obj: EditorObject, property: string): any {
    if (!obj) return null;
    
    // Regular property access
    return (obj as any)[property];
  }

  createArrayForTable(obj: EditorObject, property: string): any[] {
    if (!obj || obj.type !== 'table') return [];
    const count = (obj as any)[property] || 0;
    return this.createArray(count);
  }
  
  getTextColor(): string {
    if (this.selectedObject?.type === 'text') {
      return (this.selectedObject as TextObject).color || '#000000';
    }
    return '#000000';
  }
  
  getTextFontSize(): number {
    if (this.selectedObject?.type === 'text') {
      return (this.selectedObject as TextObject).fontSize;
    }
    return 18;
  }
  
  getTextFontFamily(): string {
    if (this.selectedObject?.type === 'text') {
      return (this.selectedObject as TextObject).fontFamily;
    }
    return 'Inter';
  }
  
  isTextWithFontWeight(weight: string): boolean {
    return this.selectedObject?.type === 'text' && 
           (this.selectedObject as TextObject).fontWeight === weight;
  }
  
  isTextWithFontStyle(style: string): boolean {
    return this.selectedObject?.type === 'text' && 
           (this.selectedObject as TextObject).fontStyle === style;
  }
  
  isTextWithTextDecoration(decoration: string): boolean {
    return this.selectedObject?.type === 'text' && 
           (this.selectedObject as TextObject).textDecoration === decoration;
  }
  
  isTextWithTextAlign(align: string): boolean {
    return this.selectedObject?.type === 'text' && 
           (this.selectedObject as TextObject).textAlign === align;
  }
  
  isTextWithListType(type: 'ordered' | 'unordered' | null): boolean {
    return this.selectedObject?.type === 'text' && 
           (this.selectedObject as TextObject).listType === type;
  }
  
  // Helper for zoom controls
  adjustZoom(amount: number): void {
    this.zoom = Math.max(10, Math.min(200, this.zoom + amount));
  }

  selectObject(e: MouseEvent, obj: EditorObject): void {
    // Prevent event from bubbling
    e.stopPropagation();
    
    // Special handling for text objects
    const target = e.target as HTMLElement;
    if (obj.type === 'text') {
      // If clicking directly on a text element that's already selected and editable
      if (target.classList.contains('text-object') && 
          obj === this.selectedObject &&
          target.getAttribute('contenteditable') === 'true') {
        // Allow normal text editing
        return;
      }
    }
    
    // Left click - Selection logic
    if (e.button === 0) {
      if (this.isMultiSelect) {
        const index = this.selectedObjects.findIndex(o => o.id === obj.id);
        if (index === -1) {
          // Add to selection
          this.selectedObjects.push(obj);
          if (!this.selectedObject) {
            this.selectedObject = obj;
          }
        } else {
          // Remove from selection
          this.selectedObjects.splice(index, 1);
          if (this.selectedObject && this.selectedObject.id === obj.id) {
            this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[0] : null;
          }
        }
      } else {
        this.selectedObject = obj;
        this.selectedObjects = [obj];
      }
      
      // Special handling for text objects
      if (obj.type === 'text' && obj === this.selectedObject) {
        // Focus the text element after a short delay to allow Angular to update
        setTimeout(() => {
          if (obj === this.selectedObject) {
            this.focusTextForEditing(obj as TextObject);
          }
        }, 50);
      }
      
      // Bring to front
      this.bringToFront(obj);
      
      // Update text controls if needed
      this.updateTextControls();
    }
  }
  
  startDrag(e: MouseEvent, obj: EditorObject): void {
    // Don't handle if target is a handle or editable content
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || 
        target.classList.contains('rotate-handle') ||
        target.closest('.rotate-handle')) {
      return;
    }
    
    // Don't start drag when clicking on an editable text box
    if (target.getAttribute('contenteditable') === 'true') {
      return;
    }
    
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Check if object is already selected, if not, select it first
    const isSelected = this.selectedObjects.some(o => o.id === obj.id);
    if (!isSelected) {
      this.selectObject(e, obj);
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    // Start dragging
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartObjX = obj.x;
    this.dragStartObjY = obj.y;
    
    // Store original positions for all selected objects
    this.selectedObjects.forEach(selectedObj => {
      (selectedObj as any).originalX = selectedObj.x;
      (selectedObj as any).originalY = selectedObj.y;
    });
    
    // Add dragging class
    const element = document.getElementById(obj.id);
    if (element) {
      element.classList.add('dragging');
    }
  }

  stopPropagation(e: Event): void {
    debugger;
    e.stopPropagation();
  }

  // Helper methods
  generateId(): string {
    return `obj-${this.nextId++}`;
  }
  
  createArray(length: number): any[] {
    return Array(length).fill(0).map((_, i) => i);
  }
  
  getRowFromIndex(index: number): number {
    return Math.floor(index / 10) + 1;
  }
  
  getColFromIndex(index: number): number {
    return (index % 10) + 1;
  }

  // ====== MOUSE EVENTS HANDLING ======
  
  setupEditorEvents(): void {
    if (this.editorContainer) {
      // Add event listeners to document for tracking mouse movements
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
      
      // We don't need this anymore since we have the @HostListener('contextmenu')
      // Prevent context menu using the decorator instead
    }
  }
  
  handleMouseMove = (e: MouseEvent): void => {
    if (!this.editorContainer?.nativeElement) return;
    
    const rect = this.editorContainer.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (this.zoom / 100);
    const y = (e.clientY - rect.top) / (this.zoom / 100);
    
    // Update cursor position display
    this.cursorPosition = { x: Math.round(x), y: Math.round(y) };
    
    // Handle dragging - with zoom factor adjustment
    if (this.isDragging && this.selectedObject) {
      e.preventDefault(); // Prevent text selection while dragging
      
      const dx = (e.clientX - this.dragStartX) / (this.zoom / 100);
      const dy = (e.clientY - this.dragStartY) / (this.zoom / 100);
      
      // Update positions of all selected objects
      this.selectedObjects.forEach(obj => {
        const originalX = (obj as any).originalX;
        const originalY = (obj as any).originalY;
        
        if (originalX !== undefined && originalY !== undefined) {
          obj.x = originalX + dx;
          obj.y = originalY + dy;
        }
      });
    }
    
    // Handle resizing with proper calculations
    if (this.isResizing && this.selectedObject) {
      e.preventDefault(); // Prevent text selection while resizing
      
      const dx = (e.clientX - this.resizeStartX) / (this.zoom / 100);
      const dy = (e.clientY - this.resizeStartY) / (this.zoom / 100);
      
      let newWidth = this.resizeStartWidth;
      let newHeight = this.resizeStartHeight;
      let newX = this.selectedObject.x;
      let newY = this.selectedObject.y;
      
      // Process resize based on handle
      switch(this.resizeHandle) {
        case 'n':
          newHeight = this.resizeStartHeight - dy;
          newY = this.dragStartObjY + dy;
          break;
        case 'ne':
          newWidth = this.resizeStartWidth + dx;
          newHeight = this.resizeStartHeight - dy;
          newY = this.dragStartObjY + dy;
          break;
        case 'e':
          newWidth = this.resizeStartWidth + dx;
          break;
        case 'se':
          newWidth = this.resizeStartWidth + dx;
          newHeight = this.resizeStartHeight + dy;
          break;
        case 's':
          newHeight = this.resizeStartHeight + dy;
          break;
        case 'sw':
          newWidth = this.resizeStartWidth - dx;
          newHeight = this.resizeStartHeight + dy;
          newX = this.dragStartObjX + dx;
          break;
        case 'w':
          newWidth = this.resizeStartWidth - dx;
          newX = this.dragStartObjX + dx;
          break;
        case 'nw':
          newWidth = this.resizeStartWidth - dx;
          newHeight = this.resizeStartHeight - dy;
          newX = this.dragStartObjX + dx;
          newY = this.dragStartObjY + dy;
          break;
      }
      
      // Ensure minimum size (prevent negative or too small objects)
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
      
      // Update the object
      this.selectedObject.width = newWidth;
      this.selectedObject.height = newHeight;
      this.selectedObject.x = newX;
      this.selectedObject.y = newY;
    }
    
    // Handle rotation with improved angle calculation
    if (this.isRotating && this.selectedObject) {
      e.preventDefault(); // Prevent text selection while rotating
      
      // Calculate object center in screen coordinates
      const centerX = this.selectedObject.x + this.selectedObject.width / 2;
      const centerY = this.selectedObject.y + this.selectedObject.height / 2;
      
      // Calculate angle between center and current mouse position
      const angleRadians = Math.atan2(y - centerY, x - centerX);
      let angleDegrees = (angleRadians * 180 / Math.PI) + 90; // Adjust to make 0 degrees point up
      
      // Normalize to 0-360 range
      angleDegrees = (angleDegrees + 360) % 360;
      
      // Snap to 15-degree increments if Shift is held
      if (e.shiftKey) {
        angleDegrees = Math.round(angleDegrees / 15) * 15;
      }
      
      // Update rotation
      this.selectedObject.rotation = angleDegrees;
    }
  }

  handleMouseUp = (e: MouseEvent): void => {
    // Check if we were dragging, resizing or rotating
    const wasChanging = this.isDragging || this.isResizing || this.isRotating;
    
    // Remove dragging class from all objects
    if (this.isDragging) {
      this.selectedObjects.forEach(obj => {
        const element = document.getElementById(obj.id);
        if (element) {
          element.classList.remove('dragging');
        }
      });
    }
    
    // End all active operations
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    
    // If we made changes, save to history
    if (wasChanging) {
      this.saveToHistory();
    }
    
    // Clear stored original positions
    if (this.selectedObjects.length > 0) {
      this.selectedObjects.forEach(obj => {
        delete (obj as any).originalX;
        delete (obj as any).originalY;
      });
    }
  }

  // ====== HISTORY MANAGEMENT ======
  
  saveToHistory(): void {
    // Create a deep copy of the current state
    const stateCopy = JSON.parse(JSON.stringify(this.objects));
    this.undoStack.push(stateCopy);
    
    // Clear redo stack when a new action is performed
    this.redoStack = [];
    
    // Limit history size
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }
  
  undo(): void {
    if (this.undoStack.length === 0) {
      this.notify('Nothing to undo', 'warning');
      return;
    }
    
    // Save current state to redo stack
    const currentState = JSON.parse(JSON.stringify(this.objects));
    this.redoStack.push(currentState);
    
    // Restore previous state
    const previousState = this.undoStack.pop();
    if (previousState) {
      this.objects = previousState;
      this.selectedObject = null;
      this.selectedObjects = [];
      this.updateTextControls();
      this.notify('Undo successful', 'success');
    }
  }
  
  redo(): void {
    if (this.redoStack.length === 0) {
      this.notify('Nothing to redo', 'warning');
      return;
    }
    
    // Save current state to undo stack
    const currentState = JSON.parse(JSON.stringify(this.objects));
    this.undoStack.push(currentState);
    
    // Restore next state
    const nextState = this.redoStack.pop();
    if (nextState) {
      this.objects = nextState;
      this.selectedObject = null;
      this.selectedObjects = [];
      this.updateTextControls();
      this.notify('Redo successful', 'success');
    }
  }

  // ====== CLIPBOARD OPERATIONS ======
  
  private clipboardObject: EditorObject | null = null;
  
  copyToClipboard(): void {
    if (!this.selectedObject) return;
    
    // Deep clone the object to avoid reference issues
    this.clipboardObject = JSON.parse(JSON.stringify(this.selectedObject));
    this.notify('Object copied to clipboard', 'success');
  }
  
  pasteFromClipboard(): void {
    if (!this.clipboardObject) {
      this.notify('Nothing to paste', 'warning');
      return;
    }
    
    // Save state for undo
    this.saveToHistory();
    
    // Create a deep clone and assign a new ID
    const clone = JSON.parse(JSON.stringify(this.clipboardObject));
    clone.id = this.generateId();
    
    // Offset the position slightly to make it visible
    clone.x += 20;
    clone.y += 20;
    
    // Ensure it's on top
    clone.zIndex = Math.max(...this.objects.map(o => o.zIndex), 0) + 1;
    
    // Add to objects array
    this.objects.push(clone);
    
    // Select the new object
    this.selectedObject = clone;
    this.selectedObjects = [clone];
    
    this.notify('Object pasted', 'success');
  }

  // ====== Z-INDEX MANAGEMENT ======
  
  bringToFront(obj: EditorObject): void {
    if (!obj) return;
    
    // Find highest z-index
    const maxZ = Math.max(...this.objects.map(o => o.zIndex), 0);
    obj.zIndex = maxZ + 1;
  }
  
  sendToBack(obj: EditorObject): void {
    if (!obj) return;
    
    // Find lowest z-index
    const minZ = Math.min(...this.objects.map(o => o.zIndex), 0);
    obj.zIndex = minZ - 1;
  }
  
  // ====== UI STATE MANAGEMENT ======
  
  updateTextControls(): void {
    if (!this.selectedObject) {
      this.showTextControls = false;
      return;
    }
    
    this.showTextControls = this.selectedObject.type === 'text';
  }
  
  // This function is called to check if an object is currently selected
  isObjectSelected(obj: EditorObject): boolean {
    return this.selectedObject === obj || this.selectedObjects.some(selected => selected.id === obj.id);
  }
  
  hideContextMenu(): void {
    this.showContextMenu = false;
  }

  // ====== OBJECT CREATION METHODS ======
  
  addTextbox(): void {
    // Save state for undo
    this.saveToHistory();
    
    const textObj: TextObject = {
      id: this.generateId(),
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      zIndex: this.objects.length + 1,
      rotation: 0,
      text: 'Edit this text',
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      textAlign: 'left',
      listType: null
    };
    
    this.objects.push(textObj);
    this.selectedObject = textObj;
    this.selectedObjects = [textObj];
    this.updateTextControls();
    this.notify('Text added', 'success');
  }
  
  addShape(shapeType: 'rectangle' | 'circle' | 'vline' | 'hline'): void {
    // Save state for undo
    this.saveToHistory();
    
    const shapeObj: ShapeObject = {
      id: this.generateId(),
      type: 'shape',
      x: 100,
      y: 100,
      width: shapeType === 'vline' ? 4 : 200,
      height: shapeType === 'hline' ? 4 : 150,
      zIndex: this.objects.length + 1,
      rotation: 0,
      shapeType: shapeType,
      fillColor: shapeType === 'vline' || shapeType === 'hline' ? 'transparent' : '#4361ee',
      strokeColor: '#3f37c9',
      strokeWidth: shapeType === 'vline' || shapeType === 'hline' ? 2 : 1
    };
    
    this.objects.push(shapeObj);
    this.selectedObject = shapeObj;
    this.selectedObjects = [shapeObj];
    this.updateTextControls();
    this.notify(`${shapeType} added`, 'success');
  }
  
  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      this.notify('No file selected', 'warning');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Save state for undo
      this.saveToHistory();
      
      const imgObj: ImageObject = {
        id: this.generateId(),
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        zIndex: this.objects.length + 1,
        rotation: 0,
        src: e.target?.result as string
      };
      
      this.objects.push(imgObj);
      this.selectedObject = imgObj;
      this.selectedObjects = [imgObj];
      this.showImageModal = false;
      this.updateTextControls();
      this.notify('Image added', 'success');
    };
    reader.readAsDataURL(file);
  }
  
  highlightGrid(row: number, col: number): void {
    this.tableRows = row;
    this.tableCols = col;
  }
  
  getGridCellClass(index: number): string {
    const row = this.getRowFromIndex(index);
    const col = this.getColFromIndex(index);
    return row <= this.tableRows && col <= this.tableCols ? 'selected' : '';
  }
  
  insertTable(rows: number, cols: number): void {
    if (rows === 0 || cols === 0) {
      this.notify('Please select table dimensions', 'warning');
      return;
    }
    
    // Save state for undo
    this.saveToHistory();
    
    const tableObj: TableObject = {
      id: this.generateId(),
      type: 'table',
      x: 100,
      y: 100,
      width: Math.min(400, cols * 80), // Cap width to 400px or cols*80
      height: Math.min(300, (rows + 1) * 30), // +1 for header
      zIndex: this.objects.length + 1,
      rotation: 0,
      rows: rows,
      cols: cols,
      cellWidth: Math.min(400, cols * 80) / cols,
      cellHeight: 30,
      customCells: [],
      columnWidths: Array(cols).fill(Math.min(400, cols * 80) / cols),
      rowHeights: Array(rows + 1).fill(30)
    };
    
    this.objects.push(tableObj);
    this.selectedObject = tableObj;
    this.selectedObjects = [tableObj];
    this.showTableGrid = false;
    this.updateTextControls();
    this.notify(`${rows}x${cols} table added`, 'success');
  }
  
  insertField(fieldType: string): void {
    // Save state for undo
    this.saveToHistory();
    
    const textObj: TextObject = {
      id: this.generateId(),
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      zIndex: this.objects.length + 1,
      rotation: 0,
      text: `{{${fieldType}}}`,
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#1976d2',
      textAlign: 'left',
      listType: null
    };
    
    this.objects.push(textObj);
    this.selectedObject = textObj;
    this.selectedObjects = [textObj];
    this.showFieldModal = false;
    this.updateTextControls();
    this.notify(`Field {{${fieldType}}} inserted`, 'success');
  }
  
  // ====== OBJECT MANIPULATION ======
  
  duplicateObject(): void {
    if (!this.selectedObject && this.selectedObjects.length === 0) return;
    
    // Save state for undo
    this.saveToHistory();
    
    // Handle multiple selected objects
    if (this.selectedObjects.length > 1) {
      const newObjects: EditorObject[] = [];
      
      this.selectedObjects.forEach(obj => {
        const clone = JSON.parse(JSON.stringify(obj));
        clone.id = this.generateId();
        clone.x += 20;
        clone.y += 20;
        clone.zIndex = Math.max(...this.objects.map(o => o.zIndex), 0) + 1;
        
        newObjects.push(clone);
        this.objects.push(clone);
      });
      
      this.selectedObjects = newObjects;
      this.selectedObject = newObjects[0];
      this.notify('Objects duplicated', 'success');
      return;
    }
    
    // Single object duplication
    const clone = JSON.parse(JSON.stringify(this.selectedObject));
    clone.id = this.generateId();
    clone.x += 20;
    clone.y += 20;
    clone.zIndex = Math.max(...this.objects.map(o => o.zIndex), 0) + 1;
    
    this.objects.push(clone);
    this.selectedObject = clone;
    this.selectedObjects = [clone];
    this.notify('Object duplicated', 'success');
  }
  
  deleteObject(): void {
    if (!this.selectedObject && this.selectedObjects.length === 0) return;
    
    // Save state for undo
    this.saveToHistory();
    
    // Delete multiple objects
    if (this.selectedObjects.length > 0) {
      const ids = this.selectedObjects.map(obj => obj.id);
      this.objects = this.objects.filter(obj => !ids.includes(obj.id));
      this.selectedObject = null;
      this.selectedObjects = [];
      this.showTextControls = false;
      this.notify('Objects deleted', 'success');
      return;
    }
  }
  
  // ====== TEXT FORMATTING METHODS ======
  
  applyTextFormatting(command: string, value: string = ''): void {
    if (this.selectedObject?.type !== 'text') return;
    
    // Save current state for undo
    this.saveToHistory();
    
    // Save cursor position before applying formatting
    this.saveTextCursorPosition();
    
    // Execute the formatting command
    document.execCommand(command, false, value);
    
    // Update text content after formatting is applied
    const textElement = document.querySelector('.text-object[contenteditable="true"]');
    if (textElement) {
      const textObj = this.selectedObject as TextObject;
      textObj.text = textElement.innerHTML;
    }
    
    // Restore cursor position
    this.restoreTextCursorPosition();
    
    this.notify(`${command} formatting applied`, 'success');
  }
  
  toggleBold(): void {
    if (this.selectedObject?.type !== 'text') return;

    this.saveToHistory();
    this.applyTextFormatting('bold');
    
    const textObj = this.selectedObject as TextObject;
    textObj.fontWeight = textObj.fontWeight === 'bold' ? 'normal' : 'bold';
    this.notify('Bold toggled', 'success');
  }
  
  toggleItalic(): void {
    if (this.selectedObject?.type !== 'text') return;

    this.saveToHistory();
    this.applyTextFormatting('italic');
    
    const textObj = this.selectedObject as TextObject;
    textObj.fontStyle = textObj.fontStyle === 'italic' ? 'normal' : 'italic';
    this.notify('Italic toggled', 'success');
  }
  
  toggleUnderline(): void {
    if (this.selectedObject?.type !== 'text') return;

    this.saveToHistory();
    this.applyTextFormatting('underline');
    
    const textObj = this.selectedObject as TextObject;
    textObj.textDecoration = textObj.textDecoration === 'underline' ? 'none' : 'underline';
    this.notify('Underline toggled', 'success');
  }
  
  toggleOrderedList(): void {
    if (this.selectedObject?.type !== 'text') return;

    this.saveToHistory();
    this.applyTextFormatting('insertOrderedList');
    
    const textObj = this.selectedObject as TextObject;
    textObj.listType = textObj.listType === 'ordered' ? null : 'ordered';
    this.notify('Ordered list toggled', 'success');
  }
  
  toggleUnorderedList(): void {
    if (this.selectedObject?.type !== 'text') return;

    this.saveToHistory();
    this.applyTextFormatting('insertUnorderedList');
    
    const textObj = this.selectedObject as TextObject;
    textObj.listType = textObj.listType === 'unordered' ? null : 'unordered';
    this.notify('Unordered list toggled', 'success');
  }
  
  setColor(event: Event): void {
    if (this.selectedObject?.type !== 'text') return;
  
    this.saveToHistory();
    
    const input = event.target as HTMLInputElement;
    if (!input?.value) return;

    this.applyTextFormatting('foreColor', input.value);
    
    const textObj = this.selectedObject as TextObject;
    textObj.color = input.value;
    this.notify('Color changed', 'success');
  }
  
  setFontSize(event: Event): void {
    debugger;
    if (this.selectedObject?.type !== 'text') return;
  
    // Stop propagation to prevent editor deselection
    event.stopPropagation();
    
    this.saveToHistory();
    
    const select = event.target as HTMLSelectElement;
    if (!select?.value) return;
  
    const fontSize = select.value + 'px';
    this.applyTextFormatting('fontSize', fontSize);
    
    const textObj = this.selectedObject as TextObject;
    textObj.fontSize = parseInt(select.value, 10);
    this.notify(`Font size set to ${select.value}px`, 'success');
  }
  
  setFontFamily(event: Event): void {
    if (this.selectedObject?.type !== 'text') return;
  
    // Stop propagation to prevent editor deselection
    event.stopPropagation();
    
    this.saveToHistory();
    
    const select = event.target as HTMLSelectElement;
    if (!select?.value) return;
  
    this.applyTextFormatting('fontName', select.value);
    
    const textObj = this.selectedObject as TextObject;
    textObj.fontFamily = select.value;
    this.notify(`Font changed to ${select.value}`, 'success');
  }
  
  setAlignment(alignment: 'left' | 'center' | 'right'): void {
    let command = 'justifyLeft';
    
    switch(alignment) {
      case 'center':
        command = 'justifyCenter';
        break;
      case 'right':
        command = 'justifyRight';
        break;
      case 'left':
      default:
        command = 'justifyLeft';
        break;
    }
    
    this.applyTextFormatting(command);
    
    // Update the text align property for consistency
    if (this.selectedObject?.type === 'text') {
      (this.selectedObject as TextObject).textAlign = alignment;
    }
  }
  
  // ====== GROUP/UNGROUP FUNCTIONALITY ======
  
  groupObjects(): void {
    if (this.selectedObjects.length <= 1) {
      this.notify('Select multiple objects to group', 'warning');
      return;
    }

    this.saveToHistory();
    
    // Find bounding box for all selected objects
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = 0;
    let maxY = 0;
    
    this.selectedObjects.forEach(obj => {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    });
    
    // Create group object with nested objects
    const groupObj: GroupObject = {
      id: this.generateId(),
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      zIndex: Math.max(...this.selectedObjects.map(o => o.zIndex), 0) + 1,
      rotation: 0,
      objects: JSON.parse(JSON.stringify(this.selectedObjects)) // Deep clone objects
    };
    
    // Adjust positions relative to group
    groupObj.objects.forEach(obj => {
      obj.x = obj.x - groupObj.x;
      obj.y = obj.y - groupObj.y;
    });
    
    // Remove selected objects and add group
    const selectedIds = this.selectedObjects.map(obj => obj.id);
    this.objects = this.objects.filter(obj => !selectedIds.includes(obj.id));
    this.objects.push(groupObj);
    
    this.selectedObject = groupObj;
    this.selectedObjects = [groupObj];
    this.updateTextControls();
    this.notify('Objects grouped', 'success');
  }
  
  ungroupObjects(): void {
    if (!this.selectedObject || this.selectedObject.type !== 'group') {
      this.notify('Select a group to ungroup', 'warning');
      return;
    }

    this.saveToHistory();
    
    const groupObj = this.selectedObject as GroupObject;
    const groupIndex = this.objects.findIndex(obj => obj.id === groupObj.id);
    
    if (groupIndex === -1) return;
    
    // Add all objects from the group with adjusted positions
    const newObjects: EditorObject[] = [];
    
    groupObj.objects.forEach(childObj => {
      const newObj = JSON.parse(JSON.stringify(childObj));
      newObj.id = this.generateId(); // Assign new IDs
      
      // Adjust positions relative to page
      newObj.x = groupObj.x + childObj.x;
      newObj.y = groupObj.y + childObj.y;
      
      // Apply group rotation if any
      if (groupObj.rotation && groupObj.rotation !== 0) {
        // If the group is rotated, apply the rotation to each child object
        newObj.rotation = (newObj.rotation || 0) + groupObj.rotation;
      }
      
      // Add to objects array and track new objects
      this.objects.push(newObj);
      newObjects.push(newObj);
    });
    
    // Remove the group
    this.objects.splice(groupIndex, 1);
    
    // Select the ungrouped objects
    this.selectedObjects = newObjects;
    this.selectedObject = newObjects[0];
    this.updateTextControls();
    this.notify('Group ungrouped', 'success');
  }
  
  // ====== ALIGNMENT METHODS ======
  
  alignObjects(position: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    if (this.selectedObjects.length === 0) return;

    this.saveToHistory();
    
    if (this.selectedObjects.length > 1) {
      // For multiple objects, align relative to each other
      switch(position) {
        case 'left': {
          const leftMost = Math.min(...this.selectedObjects.map(obj => obj.x));
          this.selectedObjects.forEach(obj => obj.x = leftMost);
          break;
        }
        case 'center': {
          const avgCenter = this.selectedObjects.reduce((sum, obj) => sum + obj.x + obj.width/2, 0) / this.selectedObjects.length;
          this.selectedObjects.forEach(obj => obj.x = avgCenter - obj.width/2);
          break;
        }
        case 'right': {
          const rightMost = Math.max(...this.selectedObjects.map(obj => obj.x + obj.width));
          this.selectedObjects.forEach(obj => obj.x = rightMost - obj.width);
          break;
        }
        case 'top': {
          const topMost = Math.min(...this.selectedObjects.map(obj => obj.y));
          this.selectedObjects.forEach(obj => obj.y = topMost);
          break;
        }
        case 'middle': {
          const avgMiddle = this.selectedObjects.reduce((sum, obj) => sum + obj.y + obj.height/2, 0) / this.selectedObjects.length;
          this.selectedObjects.forEach(obj => obj.y = avgMiddle - obj.height/2);
          break;
        }
        case 'bottom': {
          const bottomMost = Math.max(...this.selectedObjects.map(obj => obj.y + obj.height));
          this.selectedObjects.forEach(obj => obj.y = bottomMost - obj.height);
          break;
        }
      }
    } else if (this.selectedObject) {
      // For a single object, align to page
      switch(position) {
        case 'left':
          this.selectedObject.x = this.alignment.left;
          break;
        case 'center':
          this.selectedObject.x = this.alignment.center - (this.selectedObject.width / 2);
          break;
        case 'right':
          this.selectedObject.x = this.alignment.right - this.selectedObject.width;
          break;
        case 'top':
          this.selectedObject.y = this.alignment.top;
          break;
        case 'middle':
          this.selectedObject.y = this.alignment.middle - (this.selectedObject.height / 2);
          break;
        case 'bottom':
          this.selectedObject.y = this.alignment.bottom - this.selectedObject.height;
          break;
      }
    }
    
    this.notify(`Objects aligned to ${position}`, 'success');
  }
  
  // ====== DISTRIBUTION METHODS ======
  
  distributeObjects(direction: 'horizontal' | 'vertical'): void {
    if (this.selectedObjects.length < 3) {
      this.notify('Select at least 3 objects to distribute', 'warning');
      return;
    }

    this.saveToHistory();
    
    if (direction === 'horizontal') {
      // Sort by x position
      const sorted = [...this.selectedObjects].sort((a, b) => a.x - b.x);
      
      // Get left-most and right-most objects
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      
      // Calculate total available space between first and last objects
      const totalSpace = (last.x + last.width) - first.x;
      
      // Calculate sum of all object widths
      const totalWidth = sorted.reduce((sum, obj) => sum + obj.width, 0);
      
      // Calculate spacing (total space minus all widths, divided by gaps)
      const spacing = (totalSpace - totalWidth) / (sorted.length - 1);
      
      if (spacing < 0) {
        this.notify('Not enough space to distribute objects', 'warning');
        return;
      }
      
      // Position objects with equal spacing
      let currentX = first.x;
      sorted.forEach((obj, index) => {
        if (index === 0) {
          // First object stays in place
          currentX += obj.width;
        } else if (index === sorted.length - 1) {
          // Last object stays in place
        } else {
          // Middle objects get positioned with precise calculation
          obj.x = currentX + spacing;
          currentX = obj.x + obj.width;
        }
      });
    } else { // vertical distribution
      // Sort by y position
      const sorted = [...this.selectedObjects].sort((a, b) => a.y - b.y);
      
      // Get top-most and bottom-most objects
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      
      // Calculate total available space
      const totalSpace = (last.y + last.height) - first.y;
      
      // Calculate sum of all object heights
      const totalHeight = sorted.reduce((sum, obj) => sum + obj.height, 0);
      
      // Calculate spacing 
      const spacing = (totalSpace - totalHeight) / (sorted.length - 1);
      
      if (spacing < 0) {
        this.notify('Not enough space to distribute objects', 'warning');
        return;
      }
      
      // Position objects with equal spacing
      let currentY = first.y;
      sorted.forEach((obj, index) => {
        if (index === 0) {
          // First object stays in place
          currentY += obj.height;
        } else if (index === sorted.length - 1) {
          // Last object stays in place
        } else {
          // Middle objects get positioned with precise calculation
          obj.y = currentY + spacing;
          currentY = obj.y + obj.height;
        }
      });
    }
    
    this.notify(`Objects distributed ${direction}ly`, 'success');
  }
  
  // ====== PAGE MANAGEMENT ======
  
  savePage(): void {
    if (this.currentPage < this.pages.length) {
      // Update existing page
      this.pages[this.currentPage] = JSON.parse(JSON.stringify(this.objects));
    } else {
      // Add new page
      this.pages.push(JSON.parse(JSON.stringify(this.objects)));
    }
  }
  
  addPage(): void {
    // Save current page
    this.savePage();
    
    // Add new empty page
    this.pages.push([]);
    this.currentPage = this.pages.length - 1;
    
    // Clear objects
    this.objects = [];
    this.selectedObject = null;
    this.selectedObjects = [];
    
    this.notify('New page added', 'success');
  }
  
  navigatePage(direction: number): void {
    const newPage = this.currentPage + direction;
    if (newPage < 0 || newPage >= this.pages.length) return;
    
    // Save current page
    this.savePage();
    
    // Load the new page
    this.currentPage = newPage;
    this.objects = JSON.parse(JSON.stringify(this.pages[this.currentPage]));
    
    // Reset selection
    this.selectedObject = null;
    this.selectedObjects = [];
    this.showTextControls = false;
    
    this.notify(`Navigated to page ${this.currentPage + 1}`, 'success');
  }
  
  // Table data management
  updateTableCellContent(e: Event, obj: EditorObject, rowIndex: number, colIndex: number): void {
    if (!this.isTableObject(obj)) return;
    
    const tableObj = obj as TableObject;
    
    // Save state for undo
    this.saveToHistory();
    
    const target = e.target as HTMLElement;
    
    // Initialize the cell data array if it doesn't exist
    if (!tableObj.cellData) {
      tableObj.cellData = [];
      for (let r = 0; r < tableObj.rows + 1; r++) {
        let rowData = [];
        for (let c = 0; c < tableObj.cols; c++) {
          rowData.push(''); // Empty cells by default
        }
        tableObj.cellData.push(rowData);
      }
    }
    
    // Update the cell content
    tableObj.cellData[rowIndex][colIndex] = target.innerText;
    
    this.notify('Cell updated', 'success');
  }
  
  getCellContent(obj: EditorObject, rowIndex: number, colIndex: number): string {
    if (!this.isTableObject(obj)) return '';
    
    const tableObj = obj as TableObject;
    
    if (tableObj.cellData && tableObj.cellData[rowIndex] && tableObj.cellData[rowIndex][colIndex] !== undefined) {
      return tableObj.cellData[rowIndex][colIndex];
    }
    
    // Return empty content if no data is available
    return '';
  }
  
  editTableCell(e: MouseEvent, obj: EditorObject, rowIndex: number, colIndex: number): void {
    if (!this.isTableObject(obj)) return;
    
    const tableObj = obj as TableObject;
    
    if (tableObj !== this.selectedObject) return;
    
    // If it's a double-click, make the cell editable
    if (e.detail === 2) {
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      target.setAttribute('contenteditable', 'true');
      target.focus();
      
      // Select all text in the cell
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
  
  // ====== SHAPE STYLING METHODS ======
  
  getShapeFillColor(): string {
    if (this.selectedObject?.type === 'shape') {
      return (this.selectedObject as ShapeObject).fillColor || 'transparent';
    }
    return '#4361ee';
  }
  
  getShapeStrokeColor(): string {
    if (this.selectedObject?.type === 'shape') {
      return (this.selectedObject as ShapeObject).strokeColor || '#3f37c9';
    }
    return '#3f37c9';
  }
  
  getShapeStrokeWidth(): number {
    if (this.selectedObject?.type === 'shape') {
      return (this.selectedObject as ShapeObject).strokeWidth || 1;
    }
    return 1;
  }
  
  setShapeFillColor(event: Event): void {
    if (this.selectedObject?.type !== 'shape') return;
  
    this.saveToHistory();
    
    const input = event.target as HTMLInputElement;
    if (!input?.value) return;
    
    (this.selectedObject as ShapeObject).fillColor = input.value;
    this.notify('Shape fill color changed', 'success');
  }
  
  setShapeStrokeColor(event: Event): void {
    if (this.selectedObject?.type !== 'shape') return;
  
    this.saveToHistory();
    
    const input = event.target as HTMLInputElement;
    if (!input?.value) return;
    
    (this.selectedObject as ShapeObject).strokeColor = input.value;
    this.notify('Shape stroke color changed', 'success');
  }
  
  setShapeStrokeWidth(event: Event): void {
    if (this.selectedObject?.type !== 'shape') return;
  
    this.saveToHistory();
    
    const select = event.target as HTMLSelectElement;
    if (!select?.value) return;
    
    (this.selectedObject as ShapeObject).strokeWidth = parseInt(select.value, 10);
    this.notify(`Stroke width set to ${select.value}px`, 'success');
  }
  
  // ====== TABLE RESIZE METHODS ======
  
  startColumnResize(e: MouseEvent, obj: EditorObject, colIndex: number): void {
    if (!this.isTableObject(obj)) return;
    
    const tableObj = obj as TableObject;
    
    e.stopPropagation();
    e.preventDefault();
    
    this.isResizingColumn = true;
    this.currentResizeIndex = colIndex;
    this.resizeStartX = e.clientX;
    this.resizeStartSize = tableObj.columnWidths ? tableObj.columnWidths[colIndex] : tableObj.cellWidth;
    
    // Save state for undo
    this.saveToHistory();
    
    // Add mouse move and mouse up listeners
    document.addEventListener('mousemove', this.handleTableResize);
    document.addEventListener('mouseup', this.endTableResize);
  }
  
  startRowResize(e: MouseEvent, obj: EditorObject, rowIndex: number): void {
    if (!this.isTableObject(obj)) return;
    
    const tableObj = obj as TableObject;
    
    e.stopPropagation();
    e.preventDefault();
    
    this.isResizingRow = true;
    this.currentResizeIndex = rowIndex;
    this.resizeStartY = e.clientY;
    this.resizeStartSize = tableObj.rowHeights ? tableObj.rowHeights[rowIndex] : tableObj.cellHeight;
    
    // Save state for undo
    this.saveToHistory();
    
    // Add mouse move and mouse up listeners
    document.addEventListener('mousemove', this.handleTableResize);
    document.addEventListener('mouseup', this.endTableResize);
  }
  
  handleTableResize = (e: MouseEvent): void => {
    if (!this.selectedObject || this.selectedObject.type !== 'table') return;
    
    const tableObj = this.selectedObject as TableObject;
    const zoomFactor = this.zoom / 100;
    
    if (this.isResizingColumn) {
      // Calculate the new width based on mouse movement
      const dx = (e.clientX - this.resizeStartX) / zoomFactor;
      let newWidth = Math.max(20, this.resizeStartSize + dx); // Min width of 20px
      
      // Ensure we have column widths array
      if (!tableObj.columnWidths) {
        tableObj.columnWidths = Array(tableObj.cols).fill(tableObj.cellWidth);
      }
      
      // Update the width of the column
      tableObj.columnWidths[this.currentResizeIndex] = newWidth;
      
      // Update overall table width
      tableObj.width = tableObj.columnWidths.reduce((sum, width) => sum + width, 0);
    }
    
    if (this.isResizingRow) {
      // Calculate the new height based on mouse movement
      const dy = (e.clientY - this.resizeStartY) / zoomFactor;
      let newHeight = Math.max(20, this.resizeStartSize + dy); // Min height of 20px
      
      // Ensure we have row heights array
      if (!tableObj.rowHeights) {
        tableObj.rowHeights = Array(tableObj.rows + 1).fill(tableObj.cellHeight);
      }
      
      // Update the height of the row
      tableObj.rowHeights[this.currentResizeIndex] = newHeight;
      
      // Update overall table height
      tableObj.height = tableObj.rowHeights.reduce((sum, height) => sum + height, 0);
    }
  }
  
  endTableResize = (e: MouseEvent): void => {
    this.isResizingColumn = false;
    this.isResizingRow = false;
    this.currentResizeIndex = -1;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleTableResize);
    document.removeEventListener('mouseup', this.endTableResize);
    
    // Save state for undo
    this.saveToHistory();
  }
  
  getCellWidth(tableObj: TableObject, colIndex: number): number {
    if (tableObj.columnWidths && tableObj.columnWidths[colIndex] !== undefined) {
      return tableObj.columnWidths[colIndex];
    }
    return tableObj.cellWidth;
  }
  
  getCellHeight(tableObj: TableObject, rowIndex: number): number {
    if (tableObj.rowHeights && tableObj.rowHeights[rowIndex] !== undefined) {
      return tableObj.rowHeights[rowIndex];
    }
    return tableObj.cellHeight;
  }
  
  // Helper to check if an object is a TableObject
  isTableObject(obj: EditorObject): boolean {
    return obj.type === 'table';
  }

  // Helper to safely cast to TableObject with type checking
  asTableObject(obj: EditorObject): TableObject | null {
    return this.isTableObject(obj) ? obj as TableObject : null;
  }

  getCustomCellStyle(obj: EditorObject, rowIndex: number, colIndex: number): any {
    if (!this.isTableObject(obj)) return {};
    
    const tableObj = obj as TableObject;
    
    // First check if this cell has custom dimensions
    const customCell = tableObj.customCells.find(cell => 
      cell.row === rowIndex && cell.col === colIndex
    );
    
    if (customCell) {
      return {
        width: `${customCell.width}px`,
        height: `${customCell.height}px`
      };
    }
    
    // Otherwise use the column/row dimensions
    return {
      width: `${this.getCellWidth(tableObj, colIndex)}px`,
      height: `${this.getCellHeight(tableObj, rowIndex)}px`
    };
  }
  
  // ====== PROJECT MANAGEMENT ======
  
  saveProject(): void {
    // Save current page
    this.savePage();
    
    // Create project data
    const projectData = {
      pages: this.pages,
      currentPage: this.currentPage,
      nextId: this.nextId
    };
    
    try {
      localStorage.setItem('auroEditorProject', JSON.stringify(projectData));
      this.notify('Project saved successfully', 'success');
    } catch (error) {
      this.notify('Failed to save project: ' + (error as Error).message, 'error');
    }
  }
  
  loadProject(): void {
    try {
      const data = localStorage.getItem('auroEditorProject');
      if (!data) {
        this.notify('No saved project found', 'warning');
        return;
      }
      
      const projectData = JSON.parse(data);
      
      // Validate data
      if (!Array.isArray(projectData.pages)) {
        throw new Error('Invalid project format');
      }
      
      // Load project data
      this.pages = projectData.pages;
      this.currentPage = Math.min(projectData.currentPage || 0, this.pages.length - 1);
      this.nextId = projectData.nextId || this.nextId;
      
      // Load current page
      this.objects = JSON.parse(JSON.stringify(this.pages[this.currentPage]));
      
      // Reset selection
      this.selectedObject = null;
      this.selectedObjects = [];
      this.showTextControls = false;
      
      this.notify('Project loaded successfully', 'success');
    } catch (error) {
      this.notify('Failed to load project: ' + (error as Error).message, 'error');
    }
  }
  
  // ====== EXPORT FUNCTIONALITY ======
  
  updateExportDetails(): void {
    switch(this.exportFormat) {
      case 'svg':
        this.exportDetails = "SVG format is ideal for vector graphics that can be resized without losing quality.";
        break;
      case 'png':
        this.exportDetails = "PNG format is a raster image format with lossless compression.";
        break;
      case 'json':
        this.exportDetails = "JSON format contains all project data that can be reopened in this editor.";
        break;
      case 'html':
        this.exportDetails = "HTML format exports as a web page viewable in any browser.";
        break;
    }
  }
  
  downloadExport(): void {
    // Save current page before export
    this.savePage();
    
    let data = '';
    let filename = '';
    let mime = '';
    
    try {
      switch(this.exportFormat) {
        case 'svg':
          data = this.generateSVG();
          filename = `auro-export-page${this.currentPage + 1}.svg`;
          mime = 'image/svg+xml';
          break;
        case 'png':
          this.notify('PNG export not implemented in this version', 'warning');
          return;
        case 'json':
          data = JSON.stringify({
            pages: this.pages,
            currentPage: this.currentPage,
            nextId: this.nextId
          }, null, 2);
          filename = 'auro-project.json';
          mime = 'application/json';
          break;
        case 'html':
          data = this.generateHTML();
          filename = 'auro-export.html';
          mime = 'text/html';
          break;
        default:
          this.notify('Invalid export format', 'error');
          return;
      }
      
      // Create download
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showExportModal = false;
      this.notify('Export successful', 'success');
    } catch (error) {
      this.notify('Export failed: ' + (error as Error).message, 'error');
    }
  }
  
  generateSVG(): string {
    // Basic SVG generation 
    const width = 794; // A4 width in pixels
    const height = 1123; // A4 height in pixels
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="white"/>
`;
    
    // Sort objects by z-index and render each one
    const sortedObjects = [...this.objects].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const obj of sortedObjects) {
      svg += this.objectToSVG(obj);
    }
    
    svg += '</svg>';
    return svg;
  }
  
  objectToSVG(obj: EditorObject): string {
    // Create a group element with rotation if needed
    const rotateAttr = obj.rotation ? 
      `rotate(${obj.rotation} ${obj.x + obj.width/2} ${obj.y + obj.height/2})` : '';
      
    let svgContent = '';
    
    switch (obj.type) {
      case 'text': {
        const textObj = obj as TextObject;
        
        // Text alignment anchor conversion
        let textAnchor = 'start';
        let textX = obj.x;
        
        if (textObj.textAlign === 'center') {
          textAnchor = 'middle';
          textX = obj.x + obj.width/2;
        } else if (textObj.textAlign === 'right') {
          textAnchor = 'end';
          textX = obj.x + obj.width;
        }
        
        // Use foreignObject for better text rendering with proper wrapping
        svgContent = `<foreignObject x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            font-family: ${textObj.fontFamily};
            font-size: ${textObj.fontSize}px;
            font-weight: ${textObj.fontWeight};
            font-style: ${textObj.fontStyle};
            text-decoration: ${textObj.textDecoration};
            color: ${textObj.color};
            text-align: ${textObj.textAlign};
            width: 100%;
            height: 100%;
            overflow: hidden;
          ">${textObj.text}</div>
        </foreignObject>`;
        break;
      }
      
      case 'shape': {
        const shapeObj = obj as ShapeObject;
        
        if (shapeObj.shapeType === 'rectangle') {
          svgContent = `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" 
            fill="${shapeObj.fillColor}" 
            stroke="${shapeObj.strokeColor}" 
            stroke-width="${shapeObj.strokeWidth}" />`;
        } 
        else if (shapeObj.shapeType === 'circle') {
          // Circles use center coordinates and radius
          const cx = obj.x + obj.width/2;
          const cy = obj.y + obj.height/2;
          const r = Math.min(obj.width, obj.height)/2;
          
          svgContent = `<circle cx="${cx}" cy="${cy}" r="${r}" 
            fill="${shapeObj.fillColor}" 
            stroke="${shapeObj.strokeColor}" 
            stroke-width="${shapeObj.strokeWidth}" />`;
        } 
        else if (shapeObj.shapeType === 'vline') {
          // Vertical line
          const x = obj.x + obj.width/2;
          svgContent = `<line x1="${x}" y1="${obj.y}" x2="${x}" y2="${obj.y + obj.height}" 
            stroke="${shapeObj.strokeColor}" 
            stroke-width="${shapeObj.strokeWidth}" />`;
        } 
        else if (shapeObj.shapeType === 'hline') {
          // Horizontal line
          const y = obj.y + obj.height/2;
          svgContent = `<line x1="${obj.x}" y1="${y}" x2="${obj.x + obj.width}" y2="${y}" 
            stroke="${shapeObj.strokeColor}" 
            stroke-width="${shapeObj.strokeWidth}" />`;
        }
        break;
      }
      
      case 'image': {
        const imgObj = obj as ImageObject;
        // Base64 images work in SVG
        svgContent = `<image x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" 
          href="${imgObj.src}" preserveAspectRatio="xMidYMid meet" />`;
        break;
      }
      
      case 'table': {
        const tableObj = obj as TableObject;
        
        // Create a group for the table
        svgContent = `<g>
          <!-- Table background -->
          <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" 
            fill="#f8f9fa" stroke="#333" stroke-width="1" />
            
          <!-- Header background -->
          <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${tableObj.cellHeight}" 
            fill="#e9ecef" stroke="#333" stroke-width="1" />`;
            
        // Vertical grid lines
        for (let c = 1; c < tableObj.cols; c++) {
          const x = obj.x + c * tableObj.cellWidth;
          svgContent += `
          <line x1="${x}" y1="${obj.y}" x2="${x}" y2="${obj.y + obj.height}" 
            stroke="#333" stroke-width="1" />`;
        }
        
        // Horizontal grid lines
        for (let r = 1; r <= tableObj.rows; r++) {
          const y = obj.y + r * tableObj.cellHeight;
          svgContent += `
          <line x1="${obj.x}" y1="${y}" x2="${obj.x + obj.width}" y2="${y}" 
            stroke="#333" stroke-width="1" />`;
        }
        
        // Add header text
        for (let c = 0; c < tableObj.cols; c++) {
          const x = obj.x + c * tableObj.cellWidth + 5;
          const y = obj.y + tableObj.cellHeight/2 + 5;
          svgContent += `
          <text x="${x}" y="${y}" font-family="Inter" font-size="14px" font-weight="bold">
            Header ${c+1}
          </text>`;
        }
        
        // Add cell text
        for (let r = 0; r < tableObj.rows; r++) {
          for (let c = 0; c < tableObj.cols; c++) {
            const x = obj.x + c * tableObj.cellWidth + 5;
            const y = obj.y + (r+1) * tableObj.cellHeight + tableObj.cellHeight/2 + 5;
            svgContent += `
          <text x="${x}" y="${y}" font-family="Inter" font-size="14px">
            Cell data
          </text>`;
          }
        }
        
        svgContent += `
        </g>`;
        break;
      }
      
      case 'group': {
        const groupObj = obj as GroupObject;
        
        // Start group element
        svgContent = `<g transform="translate(${obj.x}, ${obj.y})">`;
        
        // Sort group objects by z-index
        const sortedGroupObjects = [...groupObj.objects].sort((a, b) => a.zIndex - b.zIndex);
        
        // Convert each object in the group to SVG
        for (const childObj of sortedGroupObjects) {
          // We need to create a temporary object with absolute coordinates
          const tempObj = JSON.parse(JSON.stringify(childObj));
          tempObj.x = 0; // Already translated by group transform
          tempObj.y = 0; // Already translated by group transform
          
          svgContent += this.objectToSVG(tempObj);
        }
        
        // Close group element
        svgContent += `</g>`;
        break;
      }
    }
    
    // Wrap in group with rotation if needed
    if (rotateAttr) {
      return `<g transform="${rotateAttr}">${svgContent}</g>`;
    }
    
    return svgContent;
  }
  
  generateHTML(): string {
    // Create basic HTML document
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Auro Editor Export</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Montserrat:wght@400;500;700&display=swap');
    
    @media print {
      @page { size: A4; margin: 0; }
      .page-break { page-break-after: always; }
    }
    
    body { 
      margin: 0; 
      padding: 20px; 
      background: #f0f0f0; 
      font-family: 'Inter', sans-serif;
    }
    
    .page { 
      width: 794px; 
      height: 1123px; 
      margin: 0 auto 20px; 
      background: white; 
      position: relative;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .page-number { 
      text-align: center; 
      margin-bottom: 5px; 
      color: #777; 
      font-size: 14px;
    }
    
    svg {
      display: block;
    }
  </style>
</head>
<body>`;

    // Save current state
    this.savePage();
    
    // Add all pages
    for (let i = 0; i < this.pages.length; i++) {
      if (i > 0) html += `<div class="page-break"></div>`;
      
      html += `
<div class="page-number">Page ${i+1} of ${this.pages.length}</div>
<div class="page">
  ${this.generatePageSVG(i)}
</div>`;
    }
    
    html += `</body></html>`;
    return html;
  }
  
  generatePageSVG(pageIndex: number): string {
    // Generate SVG for a specific page
    const pageObjects = this.pages[pageIndex];
    if (!pageObjects || pageObjects.length === 0) {
      // Return empty SVG for blank page
      return `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
        <rect width="794" height="1123" fill="white"/>
      </svg>`;
    }
    
    const width = 794;
    const height = 1123;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="white"/>
`;
    
    // Sort objects by z-index and render each one
    const sortedObjects = [...pageObjects].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const obj of sortedObjects) {
      svg += this.objectToSVG(obj);
    }
    
    svg += '</svg>';
    return svg;
  }
  
  // ====== NOTIFICATION SYSTEM ======
  
  notify(message: string, type: 'success' | 'warning' | 'error'): void {
    this.notification = message;
    this.notificationType = type;
    this.showNotification = true;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }
}