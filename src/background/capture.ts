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
    // In a real implementation, we would crop the image here using OffscreenCanvas
    // For now, let's assume we send the full screenshot or a cropped version
    await this.processAI(dataUrl, region, tabId);
  }

  private async processAI(imageData: string, region?: Region, tabId?: number): Promise<void> {
    const result = await this.aiService.analyzeVision(imageData, region);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW_RESULTS', data: result });
    }
  }
}
