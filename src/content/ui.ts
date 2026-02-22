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
              <button class="linkloop-copy-btn" data-hook="${encodeURIComponent(sections[hook.id])}">Copy Hook</button>
            </div>
            <div class="linkloop-result-content">${sections[hook.id]}</div>
          </div>
        `;
      }
    });

    html += `</div>`;
    root.innerHTML = html;

    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());
    
    root.querySelectorAll('.linkloop-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const text = decodeURIComponent(target.dataset.hook || '');
        navigator.clipboard.writeText(text).then(() => {
          const originalText = target.textContent;
          target.textContent = 'Copied!';
          target.classList.add('copied');
          setTimeout(() => {
            target.textContent = originalText;
            target.classList.remove('copied');
          }, 2000);
        });
      });
    });

    shadow.appendChild(root);
    document.body.appendChild(this.container);
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
