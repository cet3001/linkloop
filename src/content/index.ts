import { RegionSelector } from './overlay';
import { PageScroller } from './scroller';
import { ResultRenderer } from './ui';
import { Message } from '../shared/types';

const selector = new RegionSelector();
const scroller = new PageScroller();
const renderer = new ResultRenderer();

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_SELECTION':
      selector.start((region) => {
        selector.stop();
        chrome.runtime.sendMessage({ type: 'CAPTURE_REGION', data: { region } });
      });
      break;

    case 'SCROLL_PAGE':
      scroller.scrollAndCapture(async (data) => {
        try {
          const response = await chrome.runtime.sendMessage({ 
            type: 'STITCH_IMAGE', 
            data 
          });
          return response?.success;
        } catch (e) {
          console.error('Capture failed', e);
          return false;
        }
      });
      break;

    case 'SHOW_RESULTS':
      renderer.render(message.data);
      break;
  }
  return true;
});
