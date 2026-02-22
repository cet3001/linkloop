import { Region } from '../shared/types';
import { EXTENSION_CONSTANTS } from '../shared/constants';

export class RegionSelector {
  private isSelecting = false;
  private startX = 0;
  private startY = 0;
  private overlay: HTMLDivElement | null = null;
  private selectionBox: HTMLDivElement | null = null;
  private captureButton: HTMLButtonElement | null = null;
  private onCapture: ((region: Region) => void) | null = null;

  constructor() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public start(onCapture: (region: Region) => void): void {
    this.onCapture = onCapture;
    this.createOverlay();
    this.addEventListeners();
  }

  public stop(): void {
    this.removeEventListeners();
    this.removeOverlay();
    this.isSelecting = false;
    this.onCapture = null;
  }

  private createOverlay(): void {
    const container = document.createElement('div');
    container.id = 'linkloop-shadow-root';
    const shadow = container.attachShadow({ mode: 'open' });

    // Inject styles
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/styles.css');
    shadow.appendChild(styleLink);

    this.overlay = document.createElement('div');
    this.overlay.className = 'linkloop-overlay';

    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'linkloop-selection-box';
    this.selectionBox.style.display = 'none';

    this.captureButton = document.createElement('button');
    this.captureButton.className = 'linkloop-capture-btn';
    this.captureButton.textContent = 'Analyze Area';
    this.captureButton.style.display = 'none';

    this.captureButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.selectionBox && this.onCapture) {
        const rect = this.selectionBox.getBoundingClientRect();
        this.onCapture({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    });

    this.overlay.appendChild(this.selectionBox);
    this.overlay.appendChild(this.captureButton);
    shadow.appendChild(this.overlay);
    document.body.appendChild(container);
  }

  private removeOverlay(): void {
    const container = document.getElementById('linkloop-shadow-root');
    if (container) {
      container.remove();
      this.overlay = null;
      this.selectionBox = null;
      this.captureButton = null;
    }
  }

  private addEventListeners(): void {
    if (this.overlay) {
      this.overlay.addEventListener('mousedown', this.handleMouseDown);
      this.overlay.addEventListener('mousemove', this.handleMouseMove);
      this.overlay.addEventListener('mouseup', this.handleMouseUp);
    }
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private removeEventListeners(): void {
    if (this.overlay) {
      this.overlay.removeEventListener('mousedown', this.handleMouseDown);
      this.overlay.removeEventListener('mousemove', this.handleMouseMove);
      this.overlay.removeEventListener('mouseup', this.handleMouseUp);
    }
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isSelecting = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    
    if (this.selectionBox) {
      this.selectionBox.style.display = 'block';
      this.selectionBox.style.left = `${this.startX}px`;
      this.selectionBox.style.top = `${this.startY}px`;
      this.selectionBox.style.width = '0px';
      this.selectionBox.style.height = '0px';
    }
    
    if (this.captureButton) {
      this.captureButton.style.display = 'none';
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isSelecting || !this.selectionBox) return;

    const currentX = event.clientX;
    const currentY = event.clientY;

    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    const width = Math.abs(event.clientX - this.startX);
    const height = Math.abs(event.clientY - this.startY);

    if (width >= EXTENSION_CONSTANTS.MIN_SELECTION_SIZE && 
        height >= EXTENSION_CONSTANTS.MIN_SELECTION_SIZE) {
      if (this.captureButton && this.selectionBox) {
        const rect = this.selectionBox.getBoundingClientRect();
        this.captureButton.style.display = 'block';
        this.captureButton.style.left = `${rect.right - this.captureButton.offsetWidth}px`;
        this.captureButton.style.top = `${rect.bottom + 10}px`;
      }
    } else if (this.selectionBox) {
      this.selectionBox.style.display = 'none';
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.stop();
    }
  }
}
