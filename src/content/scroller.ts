import { CaptureData } from '../shared/types';
import { EXTENSION_CONSTANTS } from '../shared/constants';

export class PageScroller {
  private originalOverflowStyle: string = '';
  private originalBodyOverflowYStyle: string = '';
  private originalX: number = 0;
  private originalY: number = 0;

  constructor() {}

  public async scrollAndCapture(callback: (data: CaptureData) => Promise<boolean>): Promise<void> {
    const body = document.body;
    this.originalX = window.scrollX;
    this.originalY = window.scrollY;
    this.originalOverflowStyle = document.documentElement.style.overflow;
    this.originalBodyOverflowYStyle = body ? body.style.overflowY : '';

    if (body) {
      body.style.overflowY = 'visible';
    }

    const fullWidth = Math.max(
      document.documentElement.clientWidth,
      body ? body.scrollWidth : 0,
      document.documentElement.scrollWidth,
      body ? body.offsetWidth : 0,
      document.documentElement.offsetWidth
    );

    const fullHeight = Math.max(
      document.documentElement.clientHeight,
      body ? body.scrollHeight : 0,
      document.documentElement.scrollHeight,
      body ? body.offsetHeight : 0,
      document.documentElement.offsetHeight
    );

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const arrangements: [number, number][] = [];
    const scrollPad = 150; // Shorter pad for better overlap
    const yDelta = windowHeight - scrollPad;
    const xDelta = windowWidth;

    // We specifically want Header + Activity. 
    // Usually these are within the first 3000-5000 pixels.
    // Let's limit the 'Deep Audit' to a reasonable depth to ensure vision model performance.
    const maxDepth = Math.min(fullHeight, 5000); 

    let yPos = 0;
    while (yPos < maxDepth) {
      arrangements.push([0, yPos]);
      yPos += yDelta;
      if (yPos + windowHeight > fullHeight) {
        arrangements.push([0, fullHeight - windowHeight]);
        break;
      }
    }

    document.documentElement.style.overflow = 'hidden';

    const numArrangements = arrangements.length;

    for (let i = 0; i < numArrangements; i++) {
      const [x, y] = arrangements[i];
      window.scrollTo(x, y);

      // Wait for things to settle (sticky headers, animations)
      await new Promise(resolve => setTimeout(resolve, EXTENSION_CONSTANTS.CAPTURE_DELAY));

      const data: CaptureData = {
        msg: 'capture',
        x: window.scrollX,
        y: window.scrollY,
        complete: (i + 1) / numArrangements,
        windowWidth: windowWidth,
        totalWidth: fullWidth,
        totalHeight: fullHeight,
        devicePixelRatio: window.devicePixelRatio
      };

      const success = await callback(data);
      if (!success) break;
    }

    this.cleanUp();
  }

  private cleanUp(): void {
    document.documentElement.style.overflow = this.originalOverflowStyle;
    const body = document.body;
    if (body) {
      body.style.overflowY = this.originalBodyOverflowYStyle;
    }
    window.scrollTo(this.originalX, this.originalY);
  }
}
