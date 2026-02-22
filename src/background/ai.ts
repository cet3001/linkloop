import { AIResult, Region } from '../shared/types';
import { API_ENDPOINTS } from '../shared/constants';

export class AIService {
  constructor() {}

  public async analyzeVision(imageData: string, region?: Region): Promise<AIResult> {
    const settings = await chrome.storage.local.get(['openaiKey', 'anthropicKey', 'selectedService']);
    const service = settings.selectedService || 'openai';
    const apiKey = service === 'openai' ? settings.openaiKey : settings.anthropicKey;

    if (!apiKey) {
      return { success: false, error: 'API Key not configured. Please check extension options.' };
    }

    try {
      if (service === 'openai') {
        return await this.callOpenAI(imageData, apiKey, region);
      } else {
        return await this.callAnthropic(imageData, apiKey, region);
      }
    } catch (e) {
      console.error('AI Error', e);
      return { success: false, error: 'AI processing failed' };
    }
  }

  private async callOpenAI(imageData: string, apiKey: string, region?: Region): Promise<AIResult> {
    const base64Image = imageData.split(',')[1];
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
            content: `You are the LinkLoop 'Strategic Vision Agent'. Your objective is to perform a platform-agnostic audit of a social media profile image and generate high-conversion outreach assets.

            FOLLOW THIS DECISION TREE STRICTLY:

            ### STEP 1: VISUAL INVENTORY (CAPTURE PHASE)
            - Analyze the Header (Banner, Bio, Name) and the Activity/Recent Posts section.
            - Identify one 'Hidden Gem': A specific word in the bio, an unusual hobby, or a specific company project mentioned in a banner.

            ### STEP 2: AUDIT PHASE
            - Count visible recent posts. 
            - THRESHOLD: 3+ recent posts (within last 30 days) = 'Active Profile'.
            - THRESHOLD: <3 recent posts or no activity = 'Ghost Profile'.

            ### STEP 3: BRANCHING LOGIC
            - IF 'Active Profile': Focus on the 'Recent Post' hook as the primary anchor.
            - IF 'Ghost Profile': Trigger 'GHOST PROTOCOL'. Generate a 'Value-Add' script offering to help the prospect fix their profile gaps (missing banner, weak bio, etc.).

            ### STEP 4: GENERATIVE OUTPUT (NO TEMPLATES)
            Generate three distinct hooks:
            1. **Mutual Connection/Network Hook**: Based on shared industry markers or common associations.
            2. **Recent Post/Recent Value Hook**: (Only if Active) A high-level curiosity hook referencing a specific detail from their post.
            3. **Company Milestone/Authority Hook**: Referencing a project or company achievement found in the visual data.

            CRITICAL RULES:
            - AVOID CLICHÉS: Never say "I'm a fan of your work" or "I noticed your profile."
            - SPECIFICITY: Every hook must anchor to a visual keyword found in the image.
            - GHOST MODE: If Ghost, replace 'Recent Post Hook' with 'Profile Optimization Strategy'.

            Output Format:
            - Profile Inventory: [Hidden Gem identified]
            - Audit Status: [Active/Ghost]
            - Hook 1 (Network): [Content]
            - Hook 2 (Activity/Optimization): [Content]
            - Hook 3 (Milestone): [Content]`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: region ? `Focus on this region: X:${region.x}, Y:${region.y}, W:${region.width}, H:${region.height}` : 'Analyze the whole page.' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    return {
      success: true,
      summary: data.choices[0].message.content
    };
  }

  private async callAnthropic(imageData: string, apiKey: string, region?: Region): Promise<AIResult> {
    // Basic implementation for Anthropic (Claude 3.5 Sonnet)
    return { success: false, error: 'Anthropic vision integration pending enhancement' };
  }
}
