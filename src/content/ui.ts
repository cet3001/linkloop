import { DOMInjector } from './injector';
import { AIResult } from '../shared/types';

export class ResultRenderer {
  private container: HTMLDivElement | null = null;

  constructor() {}

  public render(result: AIResult, statusLine: string = '[SYSTEM: READY]'): void {
    this.remove();

    this.container = document.createElement('div');
    this.container.id = 'linkloop-results-shadow';
    const shadow = this.container.attachShadow({ mode: 'open' });

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/styles.css');
    shadow.appendChild(styleLink);

    const root = document.createElement('div');
    root.className = 'linkloop-results-container';

    // Status Line
    const statusLineEl = document.createElement('div');
    statusLineEl.className = 'linkloop-status-line';
    statusLineEl.innerHTML = `<span>STATE:</span> <span class="linkloop-status-active">${statusLine}</span>`;
    root.appendChild(statusLineEl);

    const body = document.createElement('div');
    body.className = 'linkloop-results-body';

    if (result.status === 'LimitReached') {
      this.renderPaywall(body);
    } else {
      this.renderResults(body, result);
    }

    root.appendChild(body);
    shadow.appendChild(root);
    document.body.appendChild(this.container);
  }

  private renderPaywall(root: HTMLElement): void {
    root.innerHTML = `
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>[AUTH_FAILURE: LIMIT_REACHED]</h3>
        </div>
        <button class="linkloop-close-results">&times;</button>
      </div>
      <div class="linkloop-results-body linkloop-paywall">
        <h2>REMAINING_SCANS: 0</h2>
        <p>DAILY_LIMIT_EXCEEDED. AUTHENTICATE PRO_ACCOUNT TO BYPASS RESTRICTIONS.</p>
        <button class="linkloop-upgrade-btn">ESTABLISH_PRO_LINK</button>
      </div>
    `;

    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());
    root.querySelector('.linkloop-upgrade-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      this.remove();
    });
  }

  private renderResults(root: HTMLElement, result: AIResult): void {
    const sections = this.parseMarkdown(result.summary || '');
    const isGhost = result.status === 'Ghost' || (result.summary?.includes('Ghost Profile') ?? false);
    const badgeText = isGhost ? '[STATUS: LOW_SIGNAL]' : '[STATUS: HIGH_SIGNAL]';
    const badgeClass = isGhost ? 'linkloop-badge-ghost' : 'linkloop-badge-active';

    let html = `
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>FORENSIC_OUTREACH_REPORT</h3>
          <span class="linkloop-badge ${badgeClass}">${badgeText}</span>
        </div>
        <button class="linkloop-close-results">&times;</button>
      </div>
    `;

    if (sections['PROFILE INVENTORY']) {
      html += `
        <div class="linkloop-inventory-card">
          <div class="linkloop-result-label">[DATA_POINT: HIDDEN_GEM]</div>
          <div class="linkloop-inventory-content">${sections['PROFILE INVENTORY']}</div>
        </div>
      `;
    }

    const hooks = [
      { id: 'HOOK 1 (NETWORK)', label: '[HOOK: NETWORK]' },
      { id: 'HOOK 2 (ACTIVITY / OPTIMIZATION)', label: isGhost ? '[LOW_SIGNAL_DETECTION: OPTIMIZATION_STRATEGY]' : '[HOOK: ACTIVITY]' },
      { id: 'HOOK 3 (MILESTONE)', label: '[HOOK: MILESTONE]' }
    ];

    hooks.forEach(hook => {
      if (sections[hook.id]) {
        html += `
          <div class="linkloop-hook-card">
            <div class="linkloop-card-header">
              <span class="linkloop-result-label">${hook.label}</span>
              <div class="linkloop-card-actions">
                <button class="linkloop-copy-btn" data-hook="${encodeURIComponent(sections[hook.id])}">COPY</button>
                <button class="linkloop-insert-btn" data-hook="${encodeURIComponent(sections[hook.id])}">INSERT</button>
              </div>
            </div>
            <div class="linkloop-result-content">${sections[hook.id]}</div>
          </div>
        `;
      }
    });

    root.innerHTML = html;

    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());
    
    // Copy Handlers
    root.querySelectorAll('.linkloop-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        navigator.clipboard.writeText(text).then(() => {
          const originalText = target.textContent;
          target.textContent = 'COPIED';
          setTimeout(() => target.textContent = originalText, 1000);
        });
      });
    });

    // Insert Handlers
    root.querySelectorAll('.linkloop-insert-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        
        if (!DOMInjector.insertText(text)) {
          DOMInjector.findAndFocusInput();
          setTimeout(() => {
            if (DOMInjector.insertText(text)) {
              this.showFeedback(target, 'INSERTED');
            } else {
              this.showFeedback(target, 'ERR: NO_FOCUS', true);
            }
          }, 50);
        } else {
          this.showFeedback(target, 'INSERTED');
        }
      });
    });
  }

  private showFeedback(btn: HTMLButtonElement, text: string, isError = false): void {
    const originalText = btn.textContent;
    btn.textContent = text;
    if (isError) btn.style.color = '#FF0000';
    setTimeout(() => {
      btn.textContent = originalText;
      if (isError) btn.style.color = '';
    }, 1000);
  }

  private parseMarkdown(md: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const parts = md.split(/^###\s+/m);
    
    parts.forEach(part => {
      const lines = part.trim().split('\n');
      if (lines.length > 0) {
        const title = lines[0].trim().toUpperCase();
        const content = lines.slice(1).join('\n').trim();
        if (title && content) {
          sections[title] = content;
        }
      }
    });
    
    return sections;
  }

  public renderStatus(statusLine: string): void {
    const existing = document.getElementById('linkloop-results-shadow');
    let shadow: ShadowRoot;
    
    if (!existing) {
      this.container = document.createElement('div');
      this.container.id = 'linkloop-results-shadow';
      shadow = this.container.attachShadow({ mode: 'open' });
      
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = chrome.runtime.getURL('content/styles.css');
      shadow.appendChild(styleLink);
      
      document.body.appendChild(this.container);
    } else {
      shadow = existing.shadowRoot!;
    }

    // Update or Create Root
    let root = shadow.querySelector('.linkloop-results-container') as HTMLElement;
    if (!root) {
      root = document.createElement('div');
      root.className = 'linkloop-results-container';
      shadow.appendChild(root);
    }

    root.innerHTML = `
      <div class="linkloop-status-line">
        <span>STATE:</span> <span class="linkloop-status-active">${statusLine}</span>
      </div>
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>SYSTEM_INITIALIZING...</h3>
        </div>
      </div>
    `;
  }

  public remove(): void {
    const existing = document.getElementById('linkloop-results-shadow');
    if (existing) {
      existing.remove();
      this.container = null;
    }
  }
}
