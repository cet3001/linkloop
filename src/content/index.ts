import { RegionSelector } from './overlay';
import { PageScroller } from './scroller';
import { ResultRenderer } from './ui';
import { Message } from '../shared/types';

const selector = new RegionSelector();
const scroller = new PageScroller();
const renderer = new ResultRenderer();

const getPlatform = () => {
  const url = window.location.href;
  if (url.includes('linkedin.com')) return 'LINKEDIN';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
  return 'GENERIC';
};

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  const platform = getPlatform();

  switch (message.type) {
    case 'START_SELECTION':
      selector.start((region) => {
        renderer.renderStatus('[ISOLATING_VISUAL_SIGNALS]');
        selector.stop();
        chrome.runtime.sendMessage({ 
          type: 'CAPTURE_REGION', 
          data: { region, platform } 
        });
      });
      break;

    case 'SCROLL_PAGE':
      renderer.renderStatus('[SCANNING_DOM]');
      scroller.scrollAndCapture(async (data) => {
        try {
          renderer.renderStatus('[ISOLATING_VISUAL_SIGNALS]');
          const response = await chrome.runtime.sendMessage({ 
            type: 'STITCH_IMAGE', 
            data: { ...data, platform } 
          });
          return !!response?.success;
        } catch (e) {
          console.error('Capture failed', e);
          return false;
        }
      });
      break;

    case 'AI_PROCESS':
      renderer.renderStatus('[RUNNING_FRICTION_ANALYSIS]');
      break;

    case 'SHOW_RESULTS':
      renderer.render(message.data, '[SYSTEM: READY]');
      break;
  }
  return true;
});
