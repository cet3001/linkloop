export class DOMInjector {
  public static async insertText(text: string): Promise<boolean> {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return false;

    // Simulate Human Typing
    await this.simulateTyping(activeElement, text);
    return true;
  }

  private static async simulateTyping(element: HTMLElement, text: string): Promise<void> {
    const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
    
    for (const char of text) {
      const delay = Math.floor(Math.random() * (70 - 20 + 1) + 20);
      
      // Keystroke simulation events
      const events = ['keydown', 'keypress', 'keyup'];
      for (const eventType of events) {
        const event = new KeyboardEvent(eventType, {
          key: char,
          keyCode: char.charCodeAt(0),
          bubbles: true,
          cancelable: true
        });
        element.dispatchEvent(event);
      }

      if (isInput) {
        const input = element as HTMLInputElement | HTMLTextAreaElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        input.value = input.value.substring(0, start) + char + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + 1;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.getAttribute('contenteditable') === 'true') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(char);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          element.dispatchEvent(new Event('input', { bubbles: true })); // Dispatch input event for contenteditable
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  public static findAndFocusInput(): boolean {
    const selectors = [
      '.msg-form__contenteditable', // LinkedIn DM
      '.public-Draft-editor-content', // X / Twitter
      '[contenteditable="true"]',
      'textarea',
      'input[type="text"]'
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
