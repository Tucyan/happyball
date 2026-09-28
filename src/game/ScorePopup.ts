import * as THREE from 'three';

interface FloatingScore {
  sprite: THREE.Sprite;
  vy: number;
  life: number;
  maxLife: number;
}

export class ScorePopup {
  public rootGroup: THREE.Group;
  private popups: FloatingScore[] = [];

  constructor() {
    this.rootGroup = new THREE.Group();
  }

  // 生成飘字纹理
  private createTextTexture(text: string, color: string = '#ffe600'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.font = 'bold 72px "Arial Black", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 黑色描边
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, 128, 64);

    // 亮黄色/彩色主体
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // 抛出得分飘字
  public spawn(pos: THREE.Vector3, text: string, color: string = '#ffe600') {
    const texture = this.createTextTexture(text, color);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    // 随机微小水平偏移防重叠
    sprite.position.set(
      pos.x + (Math.random() - 0.5) * 0.4,
      pos.y + 0.2,
      pos.z + 0.3
    );
    sprite.scale.set(1.4, 0.7, 1);

    this.rootGroup.add(sprite);

    this.popups.push({
      sprite,
      vy: 2.2 + Math.random() * 0.8,
      life: 0,
      maxLife: 0.65,
    });
  }

  public update(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.rootGroup.remove(p.sprite);
        p.sprite.material.map?.dispose();
        p.sprite.material.dispose();
        this.popups.splice(i, 1);
      } else {
        p.sprite.position.y += p.vy * dt;
        p.vy *= 0.94; // 缓动阻尼
        const progress = p.life / p.maxLife;

        // 缩放弹动与淡出
        let scale = 1.0;
        if (progress < 0.25) {
          scale = 0.8 + (progress / 0.25) * 0.6; // 弹出放大
        } else {
          scale = 1.4 - ((progress - 0.25) / 0.75) * 0.4;
        }
        p.sprite.scale.set(1.4 * scale, 0.7 * scale, 1);

        if (progress > 0.6) {
          p.sprite.material.opacity = 1 - (progress - 0.6) / 0.4;
        }
      }
    }
  }

  public clear() {
    for (const p of this.popups) {
      this.rootGroup.remove(p.sprite);
      p.sprite.material.map?.dispose();
      p.sprite.material.dispose();
    }
    this.popups = [];
  }
}
