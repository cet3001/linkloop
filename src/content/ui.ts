import { AIResult } from '../shared/types';

export class ResultRenderer {
  private container: HTMLDivElement | null = null;

  constructor() {}

  public render(result: AIResult): void {
    this.remove();

    this.container = document.createElement('div');
    this.container.id = 'linkloop-results-shadow';
    const shadow = this.container.attachShadow({ mode: 'open' });

    // Inject styles
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/styles.css');
    shadow.appendChild(styleLink);

    const root = document.createElement('div');
    root.className = 'linkloop-results-container';

    // Parse status for badge
    const isGhost = result.summary?.toLowerCase().includes('ghost') ?? false;
    const badgeClass = isGhost ? 'linkloop-badge-ghost' : 'linkloop-badge-active';
    const badgeText = isGhost ? 'Ghost Profile' : 'Active Profile';

    root.innerHTML = `
      <div class="linkloop-results-header">
        <h3>LinkLoop Vision Audit <span class="linkloop-badge ${badgeClass}">${badgeText}</span></h3>
        <button class="linkloop-close-results">&times;</button>
      </div>
      <div class="linkloop-results-body">
        <div class="linkloop-result-section">
          <div class="linkloop-result-label">Strategic Analysis</div>
          <div class="linkloop-result-content">${result.summary || 'No analysis available.'}</div>
        </div>
      </div>
    `;

    root.querySelector('.linkloop-close-results')?.addEventListener('click', () => this.remove());

    shadow.appendChild(root);
    document.body.appendChild(this.container);
  }

  public remove(): void {
    const existing = document.getElementById('linkloop-results-shadow');
    if (existing) {
      existing.remove();
      this.container = null;
    }
  }
}
