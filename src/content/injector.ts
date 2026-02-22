export class DOMInjector {
  public static insertText(text: string): boolean {
    const activeElement = document.activeElement;
    
    if (!activeElement) return false;

    // Handle standard inputs/textareas
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const val = activeElement.value;
      activeElement.value = val.substring(0, start) + text + val.substring(end);
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // Handle contenteditable (common in LinkedIn, X, etc.)
    if (activeElement.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    return false;
  }

  public static findAndFocusInput(): boolean {
    // Strategy: Search for common selectors if nothing is active
    const selectors = [
      '[contenteditable="true"]',
      'textarea',
      'input[type="text"]',
      '.msg-form__contenteditable', // LinkedIn DM
      '.public-DraftEditor-content' // X / Twitter
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        el.focus();
        return true;
      }
    }
    return false;
  }
}
