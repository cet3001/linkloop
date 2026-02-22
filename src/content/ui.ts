import { DOMInjector } from './injector';
import { AIResult } from '../shared/types';

export class ResultRenderer {
  private container: HTMLDivElement | null = null;

  constructor() {}

  public render(result: AIResult): void {
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

    // Handle Limit Reached
    if (result.status === 'LimitReached') {
      this.renderPaywall(root);
    } else {
      this.renderResults(root, result);
    }

    shadow.appendChild(root);
    document.body.appendChild(this.container);
  }

  private renderPaywall(root: HTMLElement): void {
    root.innerHTML = `
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>Daily Limit Reached</h3>
          <span class="linkloop-badge linkloop-badge-ghost">Free Tier</span>
        </div>
        <button class="linkloop-close-results">&times;</button>
      </div>
      <div class="linkloop-results-body linkloop-paywall">
        <div class="linkloop-paywall-icon">🚀</div>
        <h2>Unlock Unlimited Strategic Audits</h2>
        <p>You've reached your limit of 3 scans per 24 hours. Upgrade to LinkLoop Pro for unlimited vision-first outreach.</p>
        <button class="linkloop-upgrade-btn">Upgrade to Pro</button>
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
    const badgeClass = isGhost ? 'linkloop-badge-ghost' : 'linkloop-badge-active';
    const badgeText = isGhost ? 'Ghost Profile' : 'Active Profile';

    let html = `
      <div class="linkloop-results-header">
        <div class="linkloop-header-main">
          <h3>Strategic Vision Audit</h3>
          <span class="linkloop-badge ${badgeClass}">${badgeText}</span>
        </div>
        <button class="linkloop-close-results">&times;</button>
      </div>
      <div class="linkloop-results-body">
    `;

    if (sections['PROFILE INVENTORY']) {
      html += `
        <div class="linkloop-inventory-card">
          <div class="linkloop-result-label">Hidden Gem Identified</div>
          <div class="linkloop-inventory-content">${sections['PROFILE INVENTORY']}</div>
        </div>
      `;
    }

    const hooks = [
      { id: 'HOOK 1 (NETWORK)', label: 'Network Hook' },
      { id: 'HOOK 2 (ACTIVITY / OPTIMIZATION)', label: isGhost ? 'Authority Post Hook' : 'Activity Hook' },
      { id: 'HOOK 3 (MILESTONE)', label: 'Milestone Hook' }
    ];

    hooks.forEach(hook => {
      if (sections[hook.id]) {
        html += `
          <div class="linkloop-hook-card">
            <div class="linkloop-card-header">
              <span class="linkloop-result-label">${hook.label}</span>
              <div class="linkloop-card-actions">
                <button class="linkloop-copy-btn" data-hook="${encodeURIComponent(sections[hook.id])}">Copy</button>
                <button class="linkloop-insert-btn" data-hook="${encodeURIComponent(sections[hook.id])}">Insert</button>
              </div>
            </div>
            <div class="linkloop-result-content">${sections[hook.id]}</div>
          </div>
        `;
      }
    });

    html += `</div>`;
    root.innerHTML = html;

    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());
    
    // Copy Handlers
    root.querySelectorAll('.linkloop-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        navigator.clipboard.writeText(text).then(() => {
          const originalText = target.textContent;
          target.textContent = 'Copied!';
          setTimeout(() => target.textContent = originalText, 2000);
        });
      });
    });

    // Insert Handlers
    root.querySelectorAll('.linkloop-insert-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        
        if (!DOMInjector.insertText(text)) {
          // If no input focus, try to find one
          DOMInjector.findAndFocusInput();
          // Try again after small delay
          setTimeout(() => {
            if (DOMInjector.insertText(text)) {
              this.showFeedback(target, 'Inserted!');
            } else {
              this.showFeedback(target, 'Click Input First', true);
            }
          }, 100);
        } else {
          this.showFeedback(target, 'Inserted!');
        }
      });
    });
  }

  private showFeedback(btn: HTMLButtonElement, text: string, isError = false): void {
    const originalText = btn.textContent;
    btn.textContent = text;
    if (isError) btn.style.color = '#ef4444';
    setTimeout(() => {
      btn.textContent = originalText;
      if (isError) btn.style.color = '';
    }, 2000);
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

  public remove(): void {
    const existing = document.getElementById('linkloop-results-shadow');
    if (existing) {
      existing.remove();
      this.container = null;
    }
  }
}
