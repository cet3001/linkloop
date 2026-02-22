import { SYSTEM_PROMPTS } from './prompts';
import { AIResult, Region } from '../shared/types';
import { API_ENDPOINTS } from '../shared/constants';

export class AIService {
  constructor() {}

  public async analyzeVision(imageData: string, platform: string = 'GENERIC', region?: Region): Promise<AIResult> {
    const settings = await chrome.storage.local.get(['openaiKey', 'anthropicKey', 'selectedService']);
    const service = settings.selectedService || 'openai';
    const apiKey = service === 'openai' ? settings.openaiKey : settings.anthropicKey;

    if (!apiKey) {
      return { success: false, error: 'API Key not configured. Please check extension options.' };
    }

    try {
      if (service === 'openai') {
        return await this.callOpenAI(imageData, apiKey, platform, region);
      } else {
        return await this.callAnthropic(imageData, apiKey, region);
      }
    } catch (e) {
      console.error('AI Error', e);
      return { success: false, error: 'AI processing failed' };
    }
  }

  private async callOpenAI(imageData: string, apiKey: string, platform: string, region?: Region): Promise<AIResult> {
    const base64Image = imageData.split(',')[1];
    const systemPrompt = SYSTEM_PROMPTS.STRATEGIC_VISION.replace('{{PLATFORM}}', platform);

    const response = await fetch(API_ENDPOINTS.OPENAI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: region ? `Focus on this region: X:${region.x}, Y:${region.y}, W:${region.width}, H:${region.height}` : 'Analyze the whole page.' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content as string;
    
    // Hardening: Strip AI conversational filler
    // Remove everything before the first '###' or '[' if the AI starts with a greeting
    const firstMarkdownFlag = content.indexOf('###');
    if (firstMarkdownFlag > 0) {
      content = content.substring(firstMarkdownFlag);
    }

    // Secondary cleanup: strip common intro phrases if they still exist
    content = content.replace(/^(Here is|Sure|As a forensics|Based on|I've analyzed).*\n+/gi, '');

    return {
      success: true,
      summary: content.trim(),
      status: content.includes('HIGH_SIGNAL') ? 'Active' : (content.includes('LOW_SIGNAL') ? 'Ghost' : undefined)
    };
  }

  private async callAnthropic(imageData: string, apiKey: string, region?: Region): Promise<AIResult> {
    // Basic implementation for Anthropic (Claude 3.5 Sonnet)
    return { success: false, error: 'Anthropic vision integration pending enhancement' };
  }
}
