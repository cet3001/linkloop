const saveBtn = document.getElementById('save');
const openaiInput = document.getElementById('openaiKey') as HTMLInputElement;
const anthropicInput = document.getElementById('anthropicKey') as HTMLInputElement;

// Load existing keys
chrome.storage.local.get(['openaiKey', 'anthropicKey'], (result) => {
  if (result.openaiKey) openaiInput.value = result.openaiKey;
  if (result.anthropicKey) anthropicInput.value = result.anthropicKey;
});

saveBtn?.addEventListener('click', () => {
  const openaiKey = openaiInput.value;
  const anthropicKey = anthropicInput.value;

  chrome.storage.local.set({ 
    openaiKey, 
    anthropicKey,
    selectedService: openaiKey ? 'openai' : 'anthropic' 
  }, () => {
    alert('Settings saved!');
  });
});
