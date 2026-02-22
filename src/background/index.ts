import { CaptureCoordinator } from './capture';
import { Message } from '../shared/types';

const coordinator = new CaptureCoordinator();

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'STITCH_IMAGE':
      if (tabId) {
        coordinator.handleStitch(message.data, tabId).then(success => {
          sendResponse({ success });
        });
        return true; // Async
      }
      break;

    case 'CAPTURE_REGION':
      if (tabId) {
        coordinator.handleRegionCapture(message.data.region, tabId).catch(console.error);
        sendResponse({ success: true });
      }
      break;

    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;
  }
});

console.log('LinkLoop Service Worker active');
