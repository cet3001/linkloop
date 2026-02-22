import { ImageStitcher } from './stitching';
import { AIService } from './ai';
import { CaptureData, Region } from '../shared/types';

export class CaptureCoordinator {
  private stitcher = new ImageStitcher();
  private aiService = new AIService();

  constructor() {}

  public async handleStitch(data: CaptureData): Promise<boolean> {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab();
      await this.stitcher.stitch(data, dataUrl);
      
      if (data.complete === 1) {
        const finalImage = await this.stitcher.getFinalImage();
        this.stitcher.clear();
        await this.processAI(finalImage);
      }
      return true;
    } catch (e) {
      console.error('Stitch error', e);
      return false;
    }
  }

  public async handleRegionCapture(region: Region, tabId: number): Promise<void> {
    const dataUrl = await chrome.tabs.captureVisibleTab();
    
    // Create an image bitmap to get dimensions and for drawing
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    // Calculate scaling if devicePixelRatio is involved
    // chrome.tabs.captureVisibleTab usually returns images at Device Pixel Ratio
    const scale = imageBitmap.width / (await this.getTabWidth(tabId));
    
    const cropX = Math.round(region.x * scale);
    const cropY = Math.round(region.y * scale);
    const cropW = Math.round(region.width * scale);
    const cropH = Math.round(region.height * scale);

    const canvas = new OffscreenCanvas(cropW, cropH);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imageBitmap, 
        cropX, cropY, cropW, cropH, // Source
        0, 0, cropW, cropH        // Destination
      );
      
      const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
      const reader = new FileReader();
      const croppedDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(croppedBlob);
      });
      
      await this.processAI(croppedDataUrl, region, tabId);
    }
  }

  private async getTabWidth(tabId: number): Promise<number> {
    const tab = await chrome.tabs.get(tabId);
    return tab.width || 1280; // Fallback
  }

  private async processAI(imageData: string, region?: Region, tabId?: number): Promise<void> {
    const result = await this.aiService.analyzeVision(imageData, region);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: result });
    }
  }
}
