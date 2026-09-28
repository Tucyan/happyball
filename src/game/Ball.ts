import * as THREE from 'three';
import { BallState, GameConfig } from './Types';
import { TrailEffect } from './TrailEffect';
import { BallSkin, BallTrail, ShopStorage } from './SkinData';

export class Ball {
  public group: THREE.Group;
  public sphereMesh: THREE.Mesh;
  public trail: TrailEffect;
  public state: BallState = BallState.BOUNCING;
  public velocityY: number = 0;
  public comboCount: number = 0;
  public isSuperMode: boolean = false;

  private config: GameConfig;
  private ballMaterial: THREE.MeshStandardMaterial;
  private superMaterial: THREE.MeshStandardMaterial;
  private targetScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private currentScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private trailTimer: number = 0;

  constructor(config: GameConfig) {
    this.config = config;
    this.group = new THREE.Group();

    const currentSkin = ShopStorage.getCurrentSkin();
    const currentTrail = ShopStorage.getCurrentTrail();

    // 基础材质（根据当前装备皮肤动态初始化）
    this.ballMaterial = new THREE.MeshStandardMaterial({
      color: currentSkin.color,
      roughness: currentSkin.roughness,
      metalness: currentSkin.metalness,
      emissive: currentSkin.emissive,
      emissiveIntensity: currentSkin.emissiveIntensity,
    });

    // 超载狂暴态高亮材质（发光青蓝）
    this.superMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f7ff,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x00c8ff,
      emissiveIntensity: 0.8,
    });

    // 小球几何体
    const ballGeo = new THREE.SphereGeometry(config.ballRadius, 32, 32);
    this.sphereMesh = new THREE.Mesh(ballGeo, this.ballMaterial);
    this.sphereMesh.castShadow = true;

    // 小球眼睛/标志性细节（朝向摄像机）
    const eyeGeo = new THREE.CircleGeometry(config.ballRadius * 0.26, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.CircleGeometry(config.ballRadius * 0.13, 16);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, 0.04, config.ballRadius * 0.95);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.01);
    leftEye.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, 0.04, config.ballRadius * 0.95);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.01);
    rightEye.add(rightPupil);

    this.sphereMesh.add(leftEye);
    this.sphereMesh.add(rightEye);
    this.group.add(this.sphereMesh);

    // 拖尾组件
    this.trail = new TrailEffect();
    this.trail.applyConfig(currentTrail);

    // 初始位置设定在第 0 层表面 (y = ballRadius)
    this.reset(this.config.ballRadius);
  }

  public applySkin(skin: BallSkin) {
    this.ballMaterial.color.setHex(skin.color);
    this.ballMaterial.roughness = skin.roughness;
    this.ballMaterial.metalness = skin.metalness;
    this.ballMaterial.emissive.setHex(skin.emissive);
    this.ballMaterial.emissiveIntensity = skin.emissiveIntensity;
    this.ballMaterial.needsUpdate = true;
    if (!this.isSuperMode) {
      this.sphereMesh.material = this.ballMaterial;
    }
  }

  public applyTrail(trail: BallTrail) {
    this.trail.applyConfig(trail);
  }

  public reset(startY: number = this.config.ballRadius) {
    this.group.position.set(0, startY, this.config.ballTrackRadius);
    this.sphereMesh.visible = true;
    this.state = BallState.BOUNCING;
    this.velocityY = 0;
    this.comboCount = 0;
    this.isSuperMode = false;
    this.sphereMesh.material = this.ballMaterial;
    this.currentScale.set(1, 1, 1);
    this.targetScale.set(1, 1, 1);
    this.sphereMesh.scale.copy(this.currentScale);
    this.trail.clear();
  }

  // 触地压缩（Squash）
  public triggerSquash() {
    this.currentScale.set(1.35, 0.65, 1.35);
    this.targetScale.set(1, 1, 1);
  }

  // 起跳拉伸（Stretch）
  public triggerStretch() {
    this.currentScale.set(0.85, 1.25, 0.85);
    this.targetScale.set(1, 1, 1);
  }

  // 触碰安全扇区弹跳
  public bounce() {
    this.velocityY = this.config.bounceVelocity;
    this.state = BallState.BOUNCING;
    this.triggerSquash();
    setTimeout(() => {
      if (this.state !== BallState.DEAD) {
        this.triggerStretch();
      }
    }, 70);

    // 弹跳重置连击与超载
    this.comboCount = 0;
    this.setSuperMode(false);
  }

  // 穿过层级进入自由下落
  public recordPassFloor() {
    this.comboCount++;
    if (this.comboCount >= this.config.superComboThreshold) {
      this.setSuperMode(true);
    }
  }

  public setSuperMode(enabled: boolean) {
    if (this.isSuperMode === enabled) return;
    this.isSuperMode = enabled;
    this.sphereMesh.material = enabled ? this.superMaterial : this.ballMaterial;
    this.state = enabled ? BallState.SUPER_SMASH : BallState.FREE_FALL;
  }

  // 死亡
  public die() {
    this.state = BallState.DEAD;
    this.sphereMesh.visible = false;
    this.trail.clear();
  }

  public update(dt: number) {
    // 死亡时不更新移动
    if (this.state === BallState.DEAD || this.state === BallState.VICTORY) {
      this.trail.update(dt);
      return;
    }

    // 重力下落与速度上限
    const effectiveGravity = this.isSuperMode
      ? this.config.gravity * this.config.superSpeedMultiplier
      : this.config.gravity;

    this.velocityY -= effectiveGravity * dt;

    // 终极下落限速防穿模
    const maxFallSpeed = this.isSuperMode ? -26 : -20;
    if (this.velocityY < maxFallSpeed) {
      this.velocityY = maxFallSpeed;
    }

    // 更新 Y 坐标
    this.group.position.y += this.velocityY * dt;

    // 形变平滑复原
    this.currentScale.lerp(this.targetScale, Math.min(1, dt * 18));
    this.sphereMesh.scale.copy(this.currentScale);

    // 下落时的拖尾喷射
    this.trailTimer += dt;
    const emitInterval = this.isSuperMode ? 0.015 : 0.035;
    if (this.velocityY < -2 && this.trailTimer >= emitInterval) {
      this.trailTimer = 0;
      this.trail.emit(this.group.position, this.isSuperMode, this.isSuperMode ? 2 : 1);
    }
    this.trail.update(dt);
  }
}
