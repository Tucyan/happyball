import * as THREE from 'three';
import { GameConfig, DEFAULT_CONFIG, SectorType, BallState } from './Types';
import { Tower } from './Tower';
import { Ball } from './Ball';
import { SplatterManager } from './SplatterManager';
import { ShatterManager } from './ShatterManager';
import { ScorePopup } from './ScorePopup';
import { InputController } from './InputController';
import { AudioManager } from './AudioManager';
import { HUD } from '../ui/HUD';
import { GameOverModal } from '../ui/GameOverModal';
import { SettingsModal } from '../ui/SettingsModal';
import { ShopModal } from '../ui/ShopModal';
import { ShopStorage } from './SkinData';

export class GameEngine {
  private config: GameConfig;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private tower: Tower;
  private ball: Ball;
  private splatter: SplatterManager;
  private shatter: ShatterManager;
  private popups: ScorePopup;
  private input: InputController;
  public audio: AudioManager;
  private hud: HUD;
  private gameOverModal: GameOverModal;
  private settingsModal: SettingsModal;
  private shopModal: ShopModal;

  private isRunning: boolean = false;
  private lastTime: number = 0;
  private score: number = 0;
  private sessionCoins: number = 0;
  private bestScore: number = 0;
  private lastPassedRingIndex: number = -1;

  // 摄像机与震屏参数（以小球为中心向上旋转俯视视角）
  private shakeIntensity: number = 0;
  private cameraTargetBallY: number = 0.22;
  private cameraDistance: number = 13.0;
  private cameraDistanceCurrent: number = 13.0;
  private cameraPitchAngle: number = 26; // 摄像机以小球为中心向上旋转的俯视仰角（度）
  private cameraPitchCurrent: number = 26;

  constructor(container: HTMLElement) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG };

    // 1. 读取历史最高分
    const savedBest = localStorage.getItem('happyball_best_score');
    if (savedBest) {
      this.bestScore = parseInt(savedBest, 10) || 0;
    }

    // 2. 初始化 Three.js 核心
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.container.appendChild(this.canvas);

    this.scene = new THREE.Scene();

    // 背景渐变质感（匹配参考视频摄影棚灰调渐变）
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#9da3ac');
    grad.addColorStop(0.5, '#787d85');
    grad.addColorStop(1, '#4e5259');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;

    // 渲染器开启抗锯齿与阴影，限制 DPR 为 1.75 优化移动端发热与流畅度
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. 摄像机
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 13);
    this.camera.lookAt(0, 0, this.config.ballTrackRadius);

    // 4. 灯光系统（质感柔和立体）
    this.setupLighting();

    // 5. 实例化游戏组件
    this.tower = new THREE.Group() as unknown as Tower; // placeholder
    this.tower = new Tower(this.config);
    this.scene.add(this.tower.rootGroup);

    this.ball = new Ball(this.config);
    this.scene.add(this.ball.group);
    this.scene.add(this.ball.trail.group);

    this.splatter = new SplatterManager();
    this.splatter.setSplatColor(ShopStorage.getCurrentSkin().splatColor);
    this.scene.add(this.splatter.rootGroup);

    this.shatter = new ShatterManager();
    this.scene.add(this.shatter.rootGroup);

    this.popups = new ScorePopup();
    this.scene.add(this.popups.rootGroup);

    this.audio = new AudioManager();
    this.input = new InputController(this.container);

    // 6. UI
    this.hud = new HUD(this.container);
    this.hud.setOnToggleSound(() => {
      const muted = this.audio.toggleMute();
      this.hud.updateSoundIcon(muted);
    });

    this.gameOverModal = new GameOverModal(this.container);
    this.gameOverModal.setOnRestart(() => {
      this.restartGame();
    });

    this.shopModal = new ShopModal(this.container);
    this.shopModal.setOnSkinEquipped((skin) => {
      this.ball.applySkin(skin);
      this.splatter.setSplatColor(skin.splatColor);
    });
    this.shopModal.setOnTrailEquipped((trail) => {
      this.ball.applyTrail(trail);
    });
    this.shopModal.setOnCoinsChanged((coins) => {
      this.hud.updateCoins(coins);
    });

    this.hud.setOnOpenShop(() => {
      this.shopModal.show();
    });

    this.settingsModal = new SettingsModal(this.container);
    const initialSettings = this.settingsModal.getSettings();
    this.input.setSensitivityMultiplier(initialSettings.sensitivity);
    this.input.setInvertSwipe(initialSettings.invertSwipe);
    this.cameraDistance = initialSettings.cameraDistance;
    this.cameraDistanceCurrent = initialSettings.cameraDistance;
    this.cameraPitchAngle = initialSettings.cameraPitch;
    this.cameraPitchCurrent = initialSettings.cameraPitch;
    this.config.ringSpacing = initialSettings.ringSpacing;

    this.settingsModal.setOnChange((s) => {
      this.input.setSensitivityMultiplier(s.sensitivity);
      this.input.setInvertSwipe(s.invertSwipe);
      this.cameraDistance = s.cameraDistance;
      this.cameraPitchAngle = s.cameraPitch;
      if (Math.abs(this.config.ringSpacing - s.ringSpacing) > 0.05) {
        this.config.ringSpacing = s.ringSpacing;
        this.startEndlessGame();
      }
    });

    this.hud.setOnOpenSettings(() => {
      this.settingsModal.show();
    });

    // 7. 窗口尺寸自适应
    window.addEventListener('resize', () => this.onResize());

    // 8. 启动无限模式
    this.startEndlessGame();
  }

  private setupLighting() {
    // 环境光柔和明亮
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambientLight);

    // 主方向光带柔和阴影，512x512 分辨率与紧凑视锥极大减轻移动端 GPU 负担
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    const d = 4.2;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // 背光轮廓补光
    const rimLight = new THREE.DirectionalLight(0x90b0ff, 0.45);
    rimLight.position.set(-6, -5, -6);
    this.scene.add(rimLight);
  }

  public startEndlessGame() {
    this.gameOverModal.hide();
    this.tower.initEndless();

    // 小球初始直接落在第 0 层表面 (y = ballRadius) 并立即弹起，彻底消除开局穿模
    this.ball.reset(this.config.ballRadius);
    this.ball.bounce();
    this.cameraTargetBallY = this.ball.group.position.y;
    this.lastPassedRingIndex = -1;
    this.shakeIntensity = 0;

    this.splatter.clear();
    this.shatter.clear();
    this.popups.clear();
    this.input.reset();

    this.hud.updateFloors(0);
    this.hud.updateScore(this.score);
    this.hud.updateCoins(ShopStorage.getCoins());

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  public restartGame() {
    this.score = 0;
    this.sessionCoins = 0;
    this.hud.updateScore(0);
    this.startEndlessGame();
  }

  private onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private loop(currentTime: number) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    // 1. 旋转立柱
    const deltaRot = this.input.consumeDeltaRotation(dt);
    if (deltaRot !== 0) {
      this.tower.rotateY(deltaRot);
    }

    // 2. 小球物理与移动
    const prevBallY = this.ball.group.position.y;
    this.ball.update(dt);
    const currBallY = this.ball.group.position.y;

    // 3. 无限模式动态向下生成与垃圾回收
    this.tower.updateEndless(currBallY);
    const floors = Math.max(0, Math.floor(-currBallY / this.config.ringSpacing));
    this.hud.updateFloors(floors);

    // 4. 碰撞与穿透检测（包括水平撞击橙红高墙与下落踩踏判定）
    if (this.ball.state !== BallState.DEAD) {
      this.checkCollisions(prevBallY, currBallY);
    }

    // 5. 特效粒子更新
    this.splatter.update(dt);
    this.shatter.update(dt);
    this.popups.update(dt);

    // 6. 摄像机跟随 (跟随小球下落，保持平滑)
    this.updateCamera(dt);
  }

  private checkCollisions(prevY: number, currY: number) {
    const ballRadius = this.config.ballRadius;
    const prevBottom = prevY - ballRadius;
    const currBottom = currY - ballRadius;
    const ballPos = this.ball.group.position;

    // 计算小球在塔局部坐标下的扇区角度
    const localPos = this.tower.rootGroup.worldToLocal(ballPos.clone());
    let angle = Math.atan2(-localPos.z, localPos.x);
    if (angle < 0) angle += Math.PI * 2;
    const ballAngularRadius = 0.12; // 约 7 度角，匹配小球在半径 1.75 处的体积

    // --- A. 橙红色垂直高墙碰撞检测（全向体积与水平旋转碰撞）---
    for (let i = 0; i < this.tower.rings.length; i++) {
      const ring = this.tower.rings[i];
      if (ring.isDestroyed || !ring.data.hasHighWall || !ring.data.highWallSector) continue;

      const ringTop = ring.data.y;
      const wallHeight = this.config.ringSpacing * 0.72;

      // 判断 Y 轴是否在垂直高墙的高度范围内 [ringTop, ringTop + wallHeight]
      if (ballPos.y + ballRadius > ringTop && ballPos.y - ballRadius < ringTop + wallHeight) {
        const hw = ring.data.highWallSector;
        const inAngle =
          angle >= hw.startAngle - ballAngularRadius &&
          angle <= hw.endAngle + ballAngularRadius;

        if (inAngle) {
          // 撞击到不可逾越的橙红色高墙
          if (this.ball.isSuperMode) {
            // 超载状态将高墙整层一同粉碎！
            this.tower.destroyRing(ring.data.index);
            this.shatter.shatterRing(ring, this.tower.getRotationY(), ShopStorage.getCurrentSkin().color);
            this.triggerScreenShake(0.4);
            this.audio.playSmash();

            const smashPoints = Math.min(this.ball.comboCount, 5) * 3;
            this.addScore(smashPoints);
            this.popups.spawn(ballPos, `WALL SMASH! +${smashPoints}`, '#ff532b');

            // 仅击碎一次：小球反冲弹起，消耗并重置超载
            this.ball.group.position.y = ringTop + ballRadius;
            this.ball.bounce();
            this.ball.setSuperMode(false);
            this.ball.comboCount = 0;
            this.lastPassedRingIndex = -1;
            return;
          } else {
            // 普通状态撞墙即死
            this.handleGameOver(ring, ballPos);
            return;
          }
        }
      }
    }

    // --- B. 楼层地面垂直穿透与着陆检测 ---
    // 只有小球向下运动时才检测着陆/穿层
    if (this.ball.velocityY > 0) return;

    for (let i = 0; i < this.tower.rings.length; i++) {
      const ring = this.tower.rings[i];
      if (ring.isDestroyed) continue;

      const ringTop = ring.data.y;

      // 如果当前环之前已经穿过了，直接跳过
      if (this.lastPassedRingIndex >= ring.data.index) continue;

      // 连续下落 CCD 判定
      if (currBottom <= ringTop && prevBottom >= ringTop - 0.6) {
        // 查找落在哪个扇区
        let hitSector = ring.data.sectors.find(
          (s) => angle >= s.startAngle && angle < s.endAngle
        );
        if (!hitSector) {
          hitSector = ring.data.sectors[ring.data.sectors.length - 1];
        }

        // 1. 穿过缺口 (GAP) -> 当前层崩开，碎块向外炸飞下坠 (1:1 还原参考视频)
        if (hitSector.type === SectorType.GAP) {
          this.lastPassedRingIndex = ring.data.index;
          this.ball.recordPassFloor();

          // 核心特性：通过的层会崩开
          this.tower.destroyRing(ring.data.index);
          this.shatter.shatterRing(ring, this.tower.getRotationY(), ShopStorage.getCurrentSkin().color);
          this.triggerScreenShake(0.06);

          // 连续穿层阶梯计分：第 1 层 +1，第 2 层 +2，第 3 层 +3，以此类推上限 +5
          const points = Math.min(this.ball.comboCount, 5);
          this.addScore(points);
          this.popups.spawn(ballPos, `+${points}`, '#ffe600');
          this.audio.playPassFloor(this.ball.comboCount);

          if (this.ball.comboCount === this.config.superComboThreshold) {
            this.audio.playSuperActivate();
          }
          // 不提前 return，允许高速同帧跨越时继续判定下一层
          continue;
        }

        // 2. 超载冲刺状态撞击地面 -> 强力粉碎整层 (仅击碎一次，反冲弹起重置超载)
        if (this.ball.isSuperMode) {
          this.tower.destroyRing(ring.data.index);
          this.shatter.shatterRing(ring, this.tower.getRotationY(), ShopStorage.getCurrentSkin().color);
          this.triggerScreenShake(0.35);
          this.audio.playSmash();

          const smashPoints = Math.min(this.ball.comboCount, 5) * 3;
          this.addScore(smashPoints);
          this.popups.spawn(ballPos, `SMASH! +${smashPoints}`, '#00f7ff');

          this.ball.group.position.y = ringTop + ballRadius;
          this.ball.bounce();
          this.ball.setSuperMode(false);
          this.ball.comboCount = 0;
          this.lastPassedRingIndex = -1;
          return;
        }

        // 3. 普通下落撞击橙红危险区 -> 失败 (DEAD)
        if (hitSector.type === SectorType.HAZARD) {
          this.handleGameOver(ring, ballPos);
          return;
        }

        // 4. 普通下落撞击深炭灰安全板块 -> 正常弹跳 (BOUNCE)
        this.ball.group.position.y = ringTop + ballRadius;
        this.ball.bounce();
        this.splatter.addSplat(ring.group, this.ball.group.position, false);
        this.audio.playBounce();
        this.lastPassedRingIndex = -1;
        return;
      }
    }
  }

  private addScore(pts: number) {
    this.score += pts;
    this.sessionCoins += pts;
    ShopStorage.addCoins(pts);
    this.hud.updateScore(this.score);
    this.hud.updateCoins(ShopStorage.getCoins());
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('happyball_best_score', this.bestScore.toString());
    }
  }

  private handleGameOver(ring: import('./Tower').RingMeshGroup, ballPos: THREE.Vector3) {
    this.ball.die();
    this.splatter.addSplat(ring.group, ballPos, true);
    this.audio.playGameOver();
    this.triggerScreenShake(0.5);

    setTimeout(() => {
      this.gameOverModal.show(this.score, this.bestScore, this.sessionCoins, ShopStorage.getCoins());
    }, 550);
  }

  private triggerScreenShake(intensity: number) {
    this.shakeIntensity = intensity;
  }

  private updateCamera(dt: number) {
    // 摄像机平滑跟随小球向下（小球向上弹跳时平缓跟进，防止频繁上下颠簸）
    const targetY = this.ball.group.position.y;
    if (targetY < this.cameraTargetBallY) {
      this.cameraTargetBallY = THREE.MathUtils.lerp(this.cameraTargetBallY, targetY, Math.min(1, dt * 10));
    } else {
      this.cameraTargetBallY = THREE.MathUtils.lerp(this.cameraTargetBallY, targetY, Math.min(1, dt * 2.5));
    }

    // 视野距离与仰俯角平滑过渡
    this.cameraDistanceCurrent = THREE.MathUtils.lerp(this.cameraDistanceCurrent, this.cameraDistance, Math.min(1, dt * 6));
    this.cameraPitchCurrent = THREE.MathUtils.lerp(this.cameraPitchCurrent, this.cameraPitchAngle, Math.min(1, dt * 8));

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    }

    // 核心重构：以小球为中心向上旋转调整角度，摄像机始终面向小球
    const ballCenterZ = this.config.ballTrackRadius;
    const rad = THREE.MathUtils.degToRad(this.cameraPitchCurrent);

    const deltaY = this.cameraDistanceCurrent * Math.sin(rad);
    const deltaZ = this.cameraDistanceCurrent * Math.cos(rad);

    this.camera.position.x = shakeX;
    this.camera.position.y = this.cameraTargetBallY + deltaY + shakeY;
    this.camera.position.z = ballCenterZ + deltaZ;

    // 摄像机面向小球
    this.camera.lookAt(shakeX, this.cameraTargetBallY + shakeY, ballCenterZ);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }
}
