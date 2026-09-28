export interface UserSettings {
  sensitivity: number;
  invertSwipe: boolean;
  cameraDistance: number;
  cameraPitch: number; // 摄像机以小球为中心向上旋转的俯视仰角 (度)
  ringSpacing: number; // 调试专用
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sensitivity: 2.9,
  invertSwipe: false,
  cameraDistance: 13.0,
  cameraPitch: 26, // 默认 26° 仰角俯视对准小球，视觉高保真匹配参考视频
  ringSpacing: 3.3,
};

export class SettingsModal {
  private container: HTMLElement;
  private settings: UserSettings;
  private onChange?: (settings: UserSettings) => void;

  constructor(parent: HTMLElement) {
    // 载入本地缓存配置，默认参数严格对齐用户需求
    this.settings = { ...DEFAULT_USER_SETTINGS };
    try {
      const saved = localStorage.getItem('happyball_settings_v4');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } else {
        // 首次更新至 v4：直接使用最新默认参数
        localStorage.setItem('happyball_settings_v4', JSON.stringify(this.settings));
      }
    } catch {
      // 忽略解析错误
    }

    this.container = document.createElement('div');
    this.container.className = 'modal-overlay hidden';

    this.container.innerHTML = `
      <div class="modal-card settings-card">
        <div class="modal-header">
          <div class="modal-title">游戏设置</div>
          <button class="close-btn" id="btn-settings-close">×</button>
        </div>

        <div class="settings-list">
          <!-- 1. 旋转灵敏度 -->
          <div class="setting-item">
            <div class="setting-label-row">
              <span class="setting-name">旋转灵敏度</span>
              <span class="setting-val" id="val-sensitivity">${this.settings.sensitivity.toFixed(1)}x</span>
            </div>
            <input type="range" class="setting-slider" id="slider-sensitivity" min="0.3" max="5.0" step="0.1" value="${this.settings.sensitivity}" />
          </div>

          <!-- 2. 反向滑动 -->
          <div class="setting-item setting-row-between">
            <div class="setting-name-desc">
              <div class="setting-name">反向滑动</div>
              <div class="setting-desc">开启后滑动方向与柱体旋转相反</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-invert" ${this.settings.invertSwipe ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- 3. 视野距离（拉远视野） -->
          <div class="setting-item">
            <div class="setting-label-row">
              <span class="setting-name">视野距离（拉远视野）</span>
              <span class="setting-val" id="val-camera">${this.getCameraLabel(this.settings.cameraDistance)}</span>
            </div>
            <input type="range" class="setting-slider" id="slider-camera" min="5.0" max="18.0" step="0.5" value="${this.settings.cameraDistance}" />
          </div>

          <!-- 4. 摄像机视角（以小球为中心向上旋转） -->
          <div class="setting-item">
            <div class="setting-label-row">
              <span class="setting-name">摄像机视角</span>
              <span class="setting-val" id="val-pitch">${this.settings.cameraPitch}°</span>
            </div>
            <input type="range" class="setting-slider" id="slider-pitch" min="5" max="65" step="1" value="${this.settings.cameraPitch}" />
          </div>

          <!-- 5. [调试] 层间距 -->
          <div class="setting-item" style="border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 10px;">
            <div class="setting-label-row">
              <span class="setting-name" style="color: #fffa65;">[调试] 层间距</span>
              <span class="setting-val" id="val-spacing">${this.settings.ringSpacing.toFixed(1)}</span>
            </div>
            <input type="range" class="setting-slider" id="slider-spacing" min="1.5" max="5.0" step="0.1" value="${this.settings.ringSpacing}" />
          </div>
        </div>

        <button class="btn-primary btn-save" id="btn-settings-confirm">
          完成
        </button>
      </div>
    `;

    parent.appendChild(this.container);
    this.initEvents();
  }

  private getCameraLabel(dist: number): string {
    if (dist <= 6.5) return '标准近景';
    if (dist <= 8.5) return '适中视野';
    if (dist <= 11.0) return '宽广视野';
    if (dist <= 14.5) return '超远视野';
    return '极远视野';
  }

  private initEvents() {
    const closeBtn = this.container.querySelector('#btn-settings-close')!;
    const confirmBtn = this.container.querySelector('#btn-settings-confirm')!;
    const sliderSens = this.container.querySelector('#slider-sensitivity') as HTMLInputElement;
    const valSens = this.container.querySelector('#val-sensitivity')!;
    const toggleInvert = this.container.querySelector('#toggle-invert') as HTMLInputElement;
    const sliderCamera = this.container.querySelector('#slider-camera') as HTMLInputElement;
    const valCamera = this.container.querySelector('#val-camera')!;
    const sliderPitch = this.container.querySelector('#slider-pitch') as HTMLInputElement;
    const valPitch = this.container.querySelector('#val-pitch')!;
    const sliderSpacing = this.container.querySelector('#slider-spacing') as HTMLInputElement;
    const valSpacing = this.container.querySelector('#val-spacing')!;

    const closeHandler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      this.hide();
    };

    closeBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('pointerdown', closeHandler);
    confirmBtn.addEventListener('click', closeHandler);
    confirmBtn.addEventListener('pointerdown', closeHandler);

    // 灵敏度变更
    sliderSens.addEventListener('input', () => {
      const val = parseFloat(sliderSens.value);
      this.settings.sensitivity = val;
      valSens.textContent = `${val.toFixed(1)}x`;
      this.saveAndNotify();
    });

    // 反向滑动变更
    toggleInvert.addEventListener('change', () => {
      this.settings.invertSwipe = toggleInvert.checked;
      this.saveAndNotify();
    });

    // 视野距离变更
    sliderCamera.addEventListener('input', () => {
      const val = parseFloat(sliderCamera.value);
      this.settings.cameraDistance = val;
      valCamera.textContent = this.getCameraLabel(val);
      this.saveAndNotify();
    });

    // 摄像机仰俯视角变更（以小球为中心向上旋转）
    sliderPitch.addEventListener('input', () => {
      const val = parseInt(sliderPitch.value, 10);
      this.settings.cameraPitch = val;
      valPitch.textContent = `${val}°`;
      this.saveAndNotify();
    });

    // 调试层间距变更
    sliderSpacing.addEventListener('input', () => {
      const val = parseFloat(sliderSpacing.value);
      this.settings.ringSpacing = val;
      valSpacing.textContent = val.toFixed(1);
      this.saveAndNotify();
    });
  }

  private saveAndNotify() {
    try {
      localStorage.setItem('happyball_settings_v4', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    if (this.onChange) {
      this.onChange(this.settings);
    }
  }

  public setOnChange(cb: (settings: UserSettings) => void) {
    this.onChange = cb;
  }

  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  public show() {
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.container.classList.add('hidden');
  }
}
