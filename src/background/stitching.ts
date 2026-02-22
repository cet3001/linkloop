import { CaptureData } from '../shared/types';

export class ImageOptimizer {
  private static readonly MAX_WIDTH = 1024;
  private static readonly QUALITY = 0.7;

  public static async optimize(canvas: OffscreenCanvas): Promise<Blob> {
    let targetCanvas = canvas;
    
    if (canvas.width > this.MAX_WIDTH) {
      const scale = this.MAX_WIDTH / canvas.width;
      const newWidth = this.MAX_WIDTH;
      const newHeight = Math.floor(canvas.height * scale);
      
      const resizedCanvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = resizedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        targetCanvas = resizedCanvas;
      }
    }

    return await targetCanvas.convertToBlob({ 
      type: 'image/jpeg', // JPEG is more efficient for quality-based compression
      quality: this.QUALITY 
    });
  }
}

export class ImageStitcher {
  private canvases: Map<number, OffscreenCanvas> = new Map();
  private contexts: Map<number, OffscreenCanvasRenderingContext2D> = new Map();

  constructor() {}

  public async stitch(data: CaptureData, dataUrl: string): Promise<void> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    let canvas = this.canvases.get(0);
    let ctx = this.contexts.get(0);

    if (!canvas) {
      canvas = new OffscreenCanvas(data.totalWidth, data.totalHeight);
      ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      this.canvases.set(0, canvas);
      this.contexts.set(0, ctx);
    }

    if (ctx) {
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
    const canvas = this.canvases.get(0);
    if (!canvas) return '';

    // Privacy Hardening: drawing to OffscreenCanvas and converting to Blob
    // automatically strips all original EXIF/Metadata from the source segments.
    const optimizedBlob = await ImageOptimizer.optimize(canvas);
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(optimizedBlob);
    });
  }

  public clear(): void {
    this.canvases.clear();
    this.contexts.clear();
  }
}
