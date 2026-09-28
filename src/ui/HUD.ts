export class HUD {
  private container: HTMLElement;
  private scoreEl: HTMLElement;
  private floorsEl: HTMLElement;
  private coinsEl: HTMLElement;
  private soundBtn: HTMLElement;
  private shopBtn: HTMLElement;
  private settingsBtn: HTMLElement;

  private onToggleSound?: () => void;
  private onOpenSettings?: () => void;
  private onOpenShop?: () => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'hud-container';

    this.container.innerHTML = `
      <div class="hud-top">
        <div class="hud-score-coin-group">
          <div class="score-display" id="hud-score">0</div>
          <div class="hud-coin-badge" id="hud-coins-badge" title="金币">
            <span class="coin-icon">🪙</span>
            <span id="hud-coins">0</span>
          </div>
        </div>

        <div class="level-progress-wrapper">
          <div class="level-badge" id="hud-floors">下落 0 层</div>
        </div>

        <div class="hud-actions">
          <button class="icon-btn" id="btn-shop" title="装扮商城">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8s1.5.67 1.5 1.5S7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </button>
          <button class="icon-btn" id="btn-settings" title="设置">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button class="icon-btn" id="btn-sound" title="静音切换">
            <svg id="svg-sound" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    parent.appendChild(this.container);

    this.scoreEl = this.container.querySelector('#hud-score')!;
    this.coinsEl = this.container.querySelector('#hud-coins')!;
    this.floorsEl = this.container.querySelector('#hud-floors')!;
    this.soundBtn = this.container.querySelector('#btn-sound')!;
    this.shopBtn = this.container.querySelector('#btn-shop')!;
    this.settingsBtn = this.container.querySelector('#btn-settings')!;

    const bindBtn = (btn: HTMLElement, cb: () => void) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cb();
      });
    };

    bindBtn(this.soundBtn, () => {
      if (this.onToggleSound) this.onToggleSound();
    });

    bindBtn(this.shopBtn, () => {
      if (this.onOpenShop) this.onOpenShop();
    });

    bindBtn(this.settingsBtn, () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });
  }

  public setOnOpenShop(cb: () => void) {
    this.onOpenShop = cb;
  }

  public setOnOpenSettings(cb: () => void) {
    this.onOpenSettings = cb;
  }

  public setOnToggleSound(cb: () => void) {
    this.onToggleSound = cb;
  }

  public updateScore(score: number) {
    this.scoreEl.innerText = score.toString();
    this.scoreEl.classList.remove('score-bump');
    void this.scoreEl.offsetWidth; // 触发 reflow 重新播放动画
    this.scoreEl.classList.add('score-bump');
  }

  public updateCoins(coins: number) {
    this.coinsEl.innerText = coins.toString();
  }

  public updateFloors(floors: number) {
    this.floorsEl.innerText = `下落 ${floors} 层`;
  }

  public updateSoundIcon(isMuted: boolean) {
    const svg = this.container.querySelector('#svg-sound')!;
    if (isMuted) {
      svg.innerHTML = `
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      `;
    } else {
      svg.innerHTML = `
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      `;
    }
  }

  public reset() {
    this.scoreEl.innerText = '0';
    this.floorsEl.innerText = '下落 0 层';
  }
}
