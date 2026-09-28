import {
  SKINS_DATA,
  TRAILS_DATA,
  BallSkin,
  BallTrail,
  ShopStorage,
} from '../game/SkinData';

export class ShopModal {
  private container: HTMLElement;
  private currentTab: 'skin' | 'trail' = 'skin';
  private coinsValEl: HTMLElement;
  private itemsContainer: HTMLElement;
  private toastEl: HTMLElement;

  private onSkinEquipped?: (skin: BallSkin) => void;
  private onTrailEquipped?: (trail: BallTrail) => void;
  private onCoinsChanged?: (coins: number) => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'modal-overlay hidden';

    this.container.innerHTML = `
      <div class="modal-card shop-card">
        <div class="modal-header shop-header">
          <div class="shop-title-wrap">
            <span class="modal-title">装扮商城</span>
            <div class="shop-coin-badge">
              <span class="coin-icon">🪙</span>
              <span id="shop-coins-val">0</span>
            </div>
          </div>
          <button class="close-btn" id="btn-shop-close">×</button>
        </div>

        <div class="shop-tabs">
          <button class="shop-tab active" id="tab-skin">小球皮肤</button>
          <button class="shop-tab" id="tab-trail">流光拖尾</button>
        </div>

        <div class="shop-items-grid" id="shop-items-list"></div>

        <div class="shop-toast hidden" id="shop-toast"></div>
      </div>
    `;

    parent.appendChild(this.container);

    this.coinsValEl = this.container.querySelector('#shop-coins-val')!;
    this.itemsContainer = this.container.querySelector('#shop-items-list')!;
    this.toastEl = this.container.querySelector('#shop-toast')!;

    this.initEvents();
  }

  private initEvents() {
    const closeBtn = this.container.querySelector('#btn-shop-close')!;
    const tabSkin = this.container.querySelector('#tab-skin')!;
    const tabTrail = this.container.querySelector('#tab-trail')!;

    const closeHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    };

    closeBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('pointerdown', closeHandler);

    tabSkin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentTab === 'skin') return;
      this.currentTab = 'skin';
      tabSkin.classList.add('active');
      tabTrail.classList.remove('active');
      this.renderItems();
    });

    tabTrail.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentTab === 'trail') return;
      this.currentTab = 'trail';
      tabTrail.classList.add('active');
      tabSkin.classList.remove('active');
      this.renderItems();
    });
  }

  public setOnSkinEquipped(cb: (skin: BallSkin) => void) {
    this.onSkinEquipped = cb;
  }

  public setOnTrailEquipped(cb: (trail: BallTrail) => void) {
    this.onTrailEquipped = cb;
  }

  public setOnCoinsChanged(cb: (coins: number) => void) {
    this.onCoinsChanged = cb;
  }

  public show() {
    this.updateCoinsDisplay();
    this.renderItems();
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.container.classList.add('hidden');
  }

  public updateCoinsDisplay() {
    const coins = ShopStorage.getCoins();
    this.coinsValEl.textContent = coins.toString();
  }

  private showToast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 1500);
  }

  private renderItems() {
    this.itemsContainer.innerHTML = '';
    const currentCoins = ShopStorage.getCoins();

    if (this.currentTab === 'skin') {
      const unlockedSkins = ShopStorage.getUnlockedSkins();
      const currentSkin = ShopStorage.getCurrentSkin();

      SKINS_DATA.forEach((skin) => {
        const isEquipped = skin.id === currentSkin.id;
        const isUnlocked = unlockedSkins.includes(skin.id);

        const card = document.createElement('div');
        card.className = `shop-item-card ${isEquipped ? 'item-equipped' : ''}`;

        card.innerHTML = `
          <div class="skin-preview-wrap">
            <div class="skin-ball-preview" style="background: radial-gradient(circle at 35% 35%, #fff 2%, ${skin.previewColor} 60%, #000 100%);"></div>
          </div>
          <div class="shop-item-name">${skin.name}</div>
          <div class="shop-item-action">
            ${
              isEquipped
                ? `<span class="badge-equipped">已装备</span>`
                : isUnlocked
                ? `<button class="btn-action btn-equip" data-id="${skin.id}">使用</button>`
                : `<button class="btn-action btn-buy ${currentCoins < skin.price ? 'btn-disabled' : ''}" data-id="${skin.id}" data-price="${skin.price}">🪙 ${skin.price}</button>`
            }
          </div>
        `;

        const equipBtn = card.querySelector('.btn-equip');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ShopStorage.setCurrentSkin(skin.id);
            this.showToast(`已装备【${skin.name}】！`);
            this.renderItems();
            if (this.onSkinEquipped) this.onSkinEquipped(skin);
          });
        }

        const buyBtn = card.querySelector('.btn-buy');
        if (buyBtn) {
          buyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ShopStorage.spendCoins(skin.price)) {
              ShopStorage.unlockSkin(skin.id);
              ShopStorage.setCurrentSkin(skin.id);
              this.updateCoinsDisplay();
              this.showToast(`购买成功并装备【${skin.name}】！`);
              this.renderItems();
              if (this.onCoinsChanged) this.onCoinsChanged(ShopStorage.getCoins());
              if (this.onSkinEquipped) this.onSkinEquipped(skin);
            } else {
              this.showToast('金币不足，快去挑战关卡获取金币吧！');
            }
          });
        }

        this.itemsContainer.appendChild(card);
      });
    } else {
      const unlockedTrails = ShopStorage.getUnlockedTrails();
      const currentTrail = ShopStorage.getCurrentTrail();

      TRAILS_DATA.forEach((trail) => {
        const isEquipped = trail.id === currentTrail.id;
        const isUnlocked = unlockedTrails.includes(trail.id);

        const card = document.createElement('div');
        card.className = `shop-item-card ${isEquipped ? 'item-equipped' : ''}`;

        card.innerHTML = `
          <div class="skin-preview-wrap">
            <div class="trail-preview-dots">
              <span class="trail-dot" style="background-color: ${trail.previewColor};"></span>
              <span class="trail-dot small" style="background-color: ${trail.previewColor};"></span>
              <span class="trail-dot tiny" style="background-color: ${trail.previewColor};"></span>
            </div>
          </div>
          <div class="shop-item-name">${trail.name}</div>
          <div class="shop-item-action">
            ${
              isEquipped
                ? `<span class="badge-equipped">已装备</span>`
                : isUnlocked
                ? `<button class="btn-action btn-equip" data-id="${trail.id}">使用</button>`
                : `<button class="btn-action btn-buy ${currentCoins < trail.price ? 'btn-disabled' : ''}" data-id="${trail.id}" data-price="${trail.price}">🪙 ${trail.price}</button>`
            }
          </div>
        `;

        const equipBtn = card.querySelector('.btn-equip');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ShopStorage.setCurrentTrail(trail.id);
            this.showToast(`已装配【${trail.name}】拖尾！`);
            this.renderItems();
            if (this.onTrailEquipped) this.onTrailEquipped(trail);
          });
        }

        const buyBtn = card.querySelector('.btn-buy');
        if (buyBtn) {
          buyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ShopStorage.spendCoins(trail.price)) {
              ShopStorage.unlockTrail(trail.id);
              ShopStorage.setCurrentTrail(trail.id);
              this.updateCoinsDisplay();
              this.showToast(`购买成功并装配【${trail.name}】！`);
              this.renderItems();
              if (this.onCoinsChanged) this.onCoinsChanged(ShopStorage.getCoins());
              if (this.onTrailEquipped) this.onTrailEquipped(trail);
            } else {
              this.showToast('金币不足，快去挑战关卡获取金币吧！');
            }
          });
        }

        this.itemsContainer.appendChild(card);
      });
    }
  }
}
