export class GameOverModal {
  private container: HTMLElement;
  private scoreEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private coinsEarnedEl: HTMLElement;
  private totalCoinsEl: HTMLElement;
  private restartBtn: HTMLElement;
  private onRestart?: () => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'modal-overlay hidden';

    this.container.innerHTML = `
      <div class="modal-card">
        <div class="modal-title">本次得分</div>
        <div class="modal-score" id="modal-final-score">0</div>
        
        <div class="modal-coins-group">
          <div class="coins-earned">获得金币：<span class="coin-highlight">+<span id="modal-coins-earned">0</span> 🪙</span></div>
          <div class="total-coins">总金币：<span id="modal-total-coins">0</span> 🪙</div>
        </div>

        <div class="modal-best">历史最高：<span id="modal-best-score">0</span></div>

        <button class="btn-primary" id="btn-restart">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          重新挑战
        </button>
      </div>
    `;

    parent.appendChild(this.container);

    this.scoreEl = this.container.querySelector('#modal-final-score')!;
    this.bestScoreEl = this.container.querySelector('#modal-best-score')!;
    this.coinsEarnedEl = this.container.querySelector('#modal-coins-earned')!;
    this.totalCoinsEl = this.container.querySelector('#modal-total-coins')!;
    this.restartBtn = this.container.querySelector('#btn-restart')!;

    const triggerRestart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
      if (this.onRestart) this.onRestart();
    };

    this.restartBtn.addEventListener('click', triggerRestart);
    this.restartBtn.addEventListener('pointerdown', triggerRestart);
  }

  public setOnRestart(cb: () => void) {
    this.onRestart = cb;
  }

  public show(score: number, bestScore: number, coinsEarned: number, totalCoins: number) {
    this.scoreEl.innerText = score.toString();
    this.bestScoreEl.innerText = bestScore.toString();
    this.coinsEarnedEl.innerText = coinsEarned.toString();
    this.totalCoinsEl.innerText = totalCoins.toString();
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.container.classList.add('hidden');
  }
}
