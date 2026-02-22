import { DOMInjector } from './injector';
import { AIResult, Region } from '../shared/types';

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
    const strength = sections['SIGNAL_STRENGTH'] || 'UNKNOWN';
    const badgeText = `[SIGNAL: ${strength}]`;
    const badgeClass = strength.includes('HIGH') ? 'linkloop-badge-active' : 'linkloop-badge-ghost';

    let html = `
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>[TARGET_DOSSIER: FORENSIC_REPORT]</h3>
          <span class="linkloop-badge ${badgeClass}">${badgeText}</span>
        </div>
        <button class="linkloop-close-results">&times;</button>
      </div>
    `;

    if (sections['FRICTION_POINT']) {
      html += `
        <div class="linkloop-inventory-card">
          <div class="linkloop-result-label">[AUDIT_VECTOR: FRICTION_POINT]</div>
          <div class="linkloop-inventory-content">${sections['FRICTION_POINT']}</div>
        </div>
      `;
    }

    if (sections['FORENSIC_HOOKS']) {
      const hooksText = sections['FORENSIC_HOOKS'];
      const hookMatches = hooksText.match(/^\d+\.\s+\*\*.*?\*\*:\s+.*$/gm);
      
      if (hookMatches) {
        hookMatches.forEach((hookText, index) => {
          const cleanText = hookText.replace(/^\d+\.\s+\*\*.*?\*\*:\s+/, '').trim();
          const label = hookText.match(/\*\*(.*?)\*\*/)?.[1] || `HOOK ${index + 1}`;
          
          html += `
            <div class="linkloop-hook-card">
              <div class="linkloop-card-header">
                <span class="linkloop-result-label">[FORENSIC_HOOK: ${label}]</span>
                <div class="linkloop-card-actions">
                  <button class="linkloop-copy-btn" data-hook="${encodeURIComponent(cleanText)}">COPY</button>
                  <button class="linkloop-insert-btn" data-hook="${encodeURIComponent(cleanText)}">INSERT</button>
                </div>
              </div>
              <div class="linkloop-result-content">${cleanText}</div>
            </div>
          `;
        });
      } else {
        html += `
          <div class="linkloop-hook-card">
            <div class="linkloop-result-content">${hooksText}</div>
          </div>
        `;
      }
    }

    root.innerHTML = html;
    this.attachHandlers(root);
  }

  private attachHandlers(root: HTMLElement): void {
    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());
    
    root.querySelectorAll('.linkloop-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        navigator.clipboard.writeText(text).then(() => {
          this.showFeedback(target, 'COPIED');
        });
      });
    });

    root.querySelectorAll('.linkloop-insert-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        
        const success = await DOMInjector.insertText(text);
        if (!success) {
          DOMInjector.findAndFocusInput();
          setTimeout(async () => {
            if (await DOMInjector.insertText(text)) {
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
    if (isError) btn.style.color = '#FF3B30';
    setTimeout(() => {
      btn.textContent = originalText;
      if (isError) btn.style.color = '';
    }, 1500);
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
          <h3>SYSTEM_AUDIT_STABILIZATION...</h3>
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
