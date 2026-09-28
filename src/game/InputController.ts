export class InputController {
  private domElement: HTMLElement;
  private isPointerDown: boolean = false;
  private lastX: number = 0;
  private deltaRotation: number = 0;
  private rotationalVelocity: number = 0;

  private baseSensitivity: number = 0.0075;
  private sensitivityMultiplier: number = 1.0;
  private invertSwipe: boolean = false;
  private friction: number = 0.90;

  // 键盘辅助
  private keyLeft: boolean = false;
  private keyRight: boolean = false;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.initEvents();
  }

  public setSensitivityMultiplier(val: number) {
    this.sensitivityMultiplier = Math.max(0.2, Math.min(8.0, val));
  }

  public getSensitivityMultiplier(): number {
    return this.sensitivityMultiplier;
  }

  public setInvertSwipe(invert: boolean) {
    this.invertSwipe = invert;
  }

  public getInvertSwipe(): boolean {
    return this.invertSwipe;
  }

  private initEvents() {
    this.domElement.style.touchAction = 'none';

    // 指针事件（兼容触摸与鼠标）
    this.domElement.addEventListener('pointerdown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.modal-card') || target.closest('.hud-actions')) {
        return;
      }
      this.isPointerDown = true;
      this.lastX = e.clientX;
      this.rotationalVelocity = 0;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      const direction = this.invertSwipe ? -1 : 1;
      const rot = dx * this.baseSensitivity * this.sensitivityMultiplier * direction;
      this.deltaRotation += rot;
      this.rotationalVelocity = rot * 35; // 记录松手瞬间的惯性速度
    });

    const onPointerUp = () => {
      this.isPointerDown = false;
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // 键盘支持（方便电脑快捷调试）
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keyLeft = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keyRight = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keyLeft = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keyRight = false;
      }
    });
  }

  // 每帧调用获取旋转增量
  public consumeDeltaRotation(dt: number): number {
    let result = this.deltaRotation;
    this.deltaRotation = 0;

    // 键盘驱动
    if (this.keyLeft) {
      result += 4.5 * dt;
    }
    if (this.keyRight) {
      result -= 4.5 * dt;
    }

    // 松手后的惯性滑行
    if (!this.isPointerDown) {
      result += this.rotationalVelocity * dt;
      this.rotationalVelocity *= this.friction;
      if (Math.abs(this.rotationalVelocity) < 0.001) {
        this.rotationalVelocity = 0;
      }
    }

    return result;
  }

  public reset() {
    this.isPointerDown = false;
    this.deltaRotation = 0;
    this.rotationalVelocity = 0;
    this.keyLeft = false;
    this.keyRight = false;
  }
}
