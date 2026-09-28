import * as THREE from 'three';

interface MilestoneData {
  floorIndex: number;
  name: string;
  avatarSeed: number;
  passed: boolean;
  sprite: THREE.Sprite;
}

export class MilestoneMarker {
  public rootGroup: THREE.Group;
  private milestones: MilestoneData[] = [];
  private nextMilestoneFloor: number = 5;
  private friendNames = ['小明', '阿强', '琪琪', '超哥', '安安', '老王', '乐乐', '大白', '欢欢'];

  constructor() {
    this.rootGroup = new THREE.Group();
  }

  // 生成超越好友卡片纹理
  private createMilestoneTexture(name: string, seed: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // 半透明胶囊/卡片背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 108, 20);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    // 头像背景圆
    const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
    ctx.fillStyle = colors[seed % colors.length];
    ctx.beginPath();
    ctx.arc(180, 64, 40, 0, Math.PI * 2);
    ctx.fill();

    // 可爱头像脸
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(170, 58, 5, 0, Math.PI * 2);
    ctx.arc(190, 58, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(180, 72, 12, 0, Math.PI);
    ctx.stroke();

    // "超越" 文字
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('超越', 24, 52);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(name, 24, 88);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public initEndless() {
    this.clear();
    this.nextMilestoneFloor = 5;
  }

  // 动态向下生成里程碑与回收旧里程碑
  public updateEndless(ballY: number, ringSpacing: number, cylinderRadius: number) {
    const targetY = -this.nextMilestoneFloor * ringSpacing;
    if (ballY - 30 < targetY) {
      const friendIdx = (this.nextMilestoneFloor / 5) % this.friendNames.length;
      const name = this.friendNames[Math.floor(friendIdx)];
      const y = targetY + 0.8;

      const texture = this.createMilestoneTexture(name, this.nextMilestoneFloor);
      const mat = new THREE.SpriteMaterial({ map: texture, depthTest: true });
      const sprite = new THREE.Sprite(mat);

      sprite.position.set(cylinderRadius + 0.65, y, 0.4);
      sprite.scale.set(1.3, 0.65, 1);

      this.rootGroup.add(sprite);
      this.milestones.push({
        floorIndex: this.nextMilestoneFloor,
        name,
        avatarSeed: this.nextMilestoneFloor,
        passed: false,
        sprite,
      });

      this.nextMilestoneFloor += Math.floor(Math.random() * 3) + 5; // 每 5-7 层一个好友
    }

    // 回收顶部过远的好友卡片
    while (this.milestones.length > 10 && this.milestones[0].sprite.position.y > ballY + 25) {
      const old = this.milestones.shift();
      if (old) {
        this.rootGroup.remove(old.sprite);
        old.sprite.material.map?.dispose();
        old.sprite.material.dispose();
      }
    }
  }

  // 检查小球下落是否超越某好友
  public checkSurpass(ballY: number, onSurpass: (name: string, pos: THREE.Vector3) => void) {
    for (const m of this.milestones) {
      if (!m.passed && ballY < m.sprite.position.y) {
        m.passed = true;
        onSurpass(m.name, m.sprite.position);
      }
    }
  }

  public clear() {
    for (const m of this.milestones) {
      this.rootGroup.remove(m.sprite);
      m.sprite.material.map?.dispose();
      m.sprite.material.dispose();
    }
    this.milestones = [];
  }
}
