import { CaptureData } from '../shared/types';

export class ImageStitcher {
  private canvases: Map<number, OffscreenCanvas> = new Map();
  private contexts: Map<number, OffscreenCanvasRenderingContext2D> = new Map();

  constructor() {}

  public async stitch(data: CaptureData, dataUrl: string): Promise<void> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Filter logic similar to reference but simplified for V3
    // For now, let's assume a single large canvas if possible, 
    // or handle splitting if we hit browser limits.
    
    let canvas = this.canvases.get(0);
    let ctx = this.contexts.get(0);

    if (!canvas) {
      canvas = new OffscreenCanvas(data.totalWidth, data.totalHeight);
      ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      this.canvases.set(0, canvas);
      this.contexts.set(0, ctx);
    }

    if (ctx) {
      // Scale if zoomed
      let { x, y } = data;
      if (data.windowWidth !== imageBitmap.width) {
        const scale = imageBitmap.width / data.windowWidth;
        x *= scale;
        y *= scale;
      }
      ctx.drawImage(imageBitmap, x, y);
    }
  }

  public async getFinalImage(): Promise<string> {
    let canvas = this.canvases.get(0);
    if (!canvas) return '';

    // Optimization: Resize if exceeding limits
    const MAX_WIDTH = 1200;
    const MAX_HEIGHT = 4000;
    
    if (canvas.width > MAX_WIDTH || canvas.height > MAX_HEIGHT) {
      const scale = Math.min(MAX_WIDTH / canvas.width, MAX_HEIGHT / canvas.height);
      const newWidth = Math.floor(canvas.width * scale);
      const newHeight = Math.floor(canvas.height * scale);
      
      const resizedCanvas = new OffscreenCanvas(newWidth, newHeight);
      const resizedCtx = resizedCanvas.getContext('2d');
      if (resizedCtx) {
        resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        canvas = resizedCanvas;
      }
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  public clear(): void {
    this.canvases.clear();
    this.contexts.clear();
  }
}
