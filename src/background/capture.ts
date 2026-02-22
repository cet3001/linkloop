import { ImageStitcher, ImageOptimizer } from './stitching';
import { AIService } from './ai';
import { CaptureData, Region } from '../shared/types';
import { UsageTracker } from './usage';

export class CaptureCoordinator {
  private stitcher = new ImageStitcher();
  private aiService = new AIService();

  constructor() {}

  public async handleStitch(data: CaptureData & { platform?: string }, tabId: number): Promise<boolean> {
    try {
      // Check usage on first segment
      if (data.x === 0 && data.y === 0) {
        const { allowed } = await UsageTracker.canScan();
        if (!allowed) {
          chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: { status: 'LimitReached' } });
          return false;
        }
      }

      const screenshot = await chrome.tabs.captureVisibleTab();
      await this.stitcher.stitch(data, screenshot);
      
      // If it's the last segment
      if (data.x + data.width >= data.totalWidth && data.y + data.height >= data.totalHeight) {
        const finalImage = await this.stitcher.getFinalImage();
        this.stitcher.clear();
        await UsageTracker.recordScan();
        await this.processAI(finalImage, undefined, tabId, data.platform);
      }
      return true;
    } catch (e) {
      console.error('Stitch error', e);
      return false;
    }
  }

  public async handleRegionCapture(data: { region: Region, platform?: string }, tabId: number): Promise<void> {
    const { allowed } = await UsageTracker.canScan();
    if (!allowed) {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: { status: 'LimitReached' } });
      return;
    }

    const screenshot = await chrome.tabs.captureVisibleTab();
    const croppedDataUrl = await this.cropImage(screenshot, data.region, tabId);
    
    await UsageTracker.recordScan();
    await this.processAI(croppedDataUrl, data.region, tabId, data.platform);
  }

  private async cropImage(screenshot: string, region: Region, tabId: number): Promise<string> {
    const response = await fetch(screenshot);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const tabWidth = await this.getTabWidth(tabId);
    const scale = imageBitmap.width / tabWidth;
    
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
    }
    
    const optimizedBlob = await ImageOptimizer.optimize(canvas);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(optimizedBlob);
    });
  }

  private async getTabWidth(tabId: number): Promise<number> {
    const tab = await chrome.tabs.get(tabId);
    return tab.width || 1280;
  }

  private async processAI(imageData: string, region: Region | undefined, tabId: number, platform: string = 'GENERIC'): Promise<void> {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'AI_PROCESS' });
    }
    
    try {
      const result = await this.aiService.analyzeVision(imageData, platform, region);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: result });
      }
    } catch (error) {
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: { success: false, error: (error as Error).message, status: 'Error' } });
      }
    }
  }
}
