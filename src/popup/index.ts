document.getElementById('captureRegion')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SELECTION' });
      window.close();
    }
  });
});

document.getElementById('captureFullPage')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SCROLL_PAGE' });
      window.close();
    }
  });
});
