import { ImageStitcher, ImageOptimizer } from './stitching';
import { AIService } from './ai';
import { CaptureData, Region } from '../shared/types';

import { UsageTracker } from './usage';

export class CaptureCoordinator {
  private stitcher = new ImageStitcher();
  private aiService = new AIService();

  constructor() {}

  public async handleStitch(data: CaptureData, tabId: number): Promise<boolean> {
    try {
      // Check usage on first segment
      if (data.x === 0 && data.y === 0) {
        const { allowed } = await UsageTracker.canScan();
        if (!allowed) {
          chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: { status: 'LimitReached' } });
          return false;
        }
      }

      const dataUrl = await chrome.tabs.captureVisibleTab();
      await this.stitcher.stitch(data, dataUrl);
      
      if (data.complete === 1) {
        const finalImage = await this.stitcher.getFinalImage();
        this.stitcher.clear();
        await UsageTracker.recordScan();
        await this.processAI(finalImage, undefined, tabId);
      }
      return true;
    } catch (e) {
      console.error('Stitch error', e);
      return false;
    }
  }

  public async handleRegionCapture(region: Region, tabId: number): Promise<void> {
    const { allowed } = await UsageTracker.canScan();
    if (!allowed) {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: { status: 'LimitReached' } });
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab();
    // ... cropping logic remains same ...
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const scale = imageBitmap.width / (await this.getTabWidth(tabId));
    
    const cropX = Math.round(region.x * scale);
    const cropY = Math.round(region.y * scale);
    const cropW = Math.round(region.width * scale);
    const cropH = Math.round(region.height * scale);

    const canvas = new OffscreenCanvas(cropW, cropH);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imageBitmap, 
        cropX, cropY, cropW, cropH, 
        0, 0, cropW, cropH
      );
      
      const optimizedBlob = await ImageOptimizer.optimize(canvas);
      const reader = new FileReader();
      const croppedDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(optimizedBlob);
      });
      
      await UsageTracker.recordScan();
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
