import * as THREE from 'three';

interface SplatParticle {
  mesh: THREE.Mesh;
  vx: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class SplatterManager {
  public rootGroup: THREE.Group;
  private splatTexture: THREE.CanvasTexture;
  private deathSplatTexture: THREE.CanvasTexture;
  private splatMaterial: THREE.MeshBasicMaterial;
  private deathSplatMaterial: THREE.MeshBasicMaterial;
  private splatGeometry: THREE.PlaneGeometry;
  private deathGeometry: THREE.PlaneGeometry;

  // 溅射动态小水珠
  private splashParticles: SplatParticle[] = [];
  private beadGeometry: THREE.SphereGeometry;
  private beadMaterial: THREE.MeshBasicMaterial;
  private beadPool: THREE.Mesh[] = [];

  private currentSplatColor: string = '#185aff';

  constructor() {
    this.rootGroup = new THREE.Group();

    // 生成程序化墨迹贴图
    this.splatTexture = this.generateSplatCanvas(false, this.currentSplatColor);
    this.deathSplatTexture = this.generateSplatCanvas(true, this.currentSplatColor);

    this.splatMaterial = new THREE.MeshBasicMaterial({
      map: this.splatTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.deathSplatMaterial = new THREE.MeshBasicMaterial({
      map: this.deathSplatTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.splatGeometry = new THREE.PlaneGeometry(0.7, 0.7);
    this.splatGeometry.rotateX(-Math.PI / 2); // 贴在水平面上

    this.deathGeometry = new THREE.PlaneGeometry(1.6, 1.6);
    this.deathGeometry.rotateX(-Math.PI / 2);

    this.beadGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    this.beadMaterial = new THREE.MeshBasicMaterial({ color: 0x1d5eff });
  }

  // 动态切换墨迹颜色（与小球皮肤联动）
  public setSplatColor(colorHex: string) {
    this.currentSplatColor = colorHex;
    this.beadMaterial.color.set(colorHex);

    // 重绘普通贴图
    const normalCanvas = this.drawCanvas(false, colorHex);
    this.splatTexture.image = normalCanvas;
    this.splatTexture.needsUpdate = true;

    // 重绘死亡印记贴图
    const deathCanvas = this.drawCanvas(true, colorHex);
    this.deathSplatTexture.image = deathCanvas;
    this.deathSplatTexture.needsUpdate = true;
  }

  private drawCanvas(isDeath: boolean, fillHex: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = isDeath ? 512 : 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const baseR = isDeath ? size * 0.28 : size * 0.25;

    ctx.fillStyle = fillHex;

    // 核心不规则多边形墨迹
    ctx.beginPath();
    const points = isDeath ? 24 : 16;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const dist = baseR * (0.75 + Math.random() * 0.5);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 周围溅射散落小点
    const dropletCount = isDeath ? 36 : 16;
    for (let i = 0; i < dropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = baseR * (1.1 + Math.random() * 0.85);
      const dotR = (isDeath ? 4 : 2) + Math.random() * (isDeath ? 8 : 4);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  private generateSplatCanvas(isDeath: boolean, colorHex: string): THREE.CanvasTexture {
    const canvas = this.drawCanvas(isDeath, colorHex);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // 在指定的环和世界坐标处盖下墨印（跟随环旋转）
  public addSplat(ringGroup: THREE.Group, worldPos: THREE.Vector3, isDeath: boolean = false) {
    const splatMesh = new THREE.Mesh(
      isDeath ? this.deathGeometry : this.splatGeometry,
      isDeath ? this.deathSplatMaterial : this.splatMaterial
    );

    // 将世界坐标转为环的本地坐标
    const localPos = ringGroup.worldToLocal(worldPos.clone());
    // 稍微浮在板块表面上方，避免 Z-fighting
    splatMesh.position.set(localPos.x, 0.015, localPos.z);
    splatMesh.rotation.y = Math.random() * Math.PI * 2;

    const scale = isDeath ? 1.0 : 0.8 + Math.random() * 0.4;
    splatMesh.scale.set(scale, scale, scale);

    ringGroup.add(splatMesh);

    // 限制单环上最多保留 5 个印记以保证移动端性能
    let splatCount = 0;
    for (let i = ringGroup.children.length - 1; i >= 0; i--) {
      const child = ringGroup.children[i];
      if (child instanceof THREE.Mesh && (child.geometry === this.splatGeometry || child.geometry === this.deathGeometry)) {
        splatCount++;
        if (splatCount > 5) {
          ringGroup.remove(child);
        }
      }
    }

    // 溅射小水珠动画 (控制粒子数量，避免高发热)
    this.spawnSplashDroplets(worldPos, isDeath ? 16 : 8);
  }

  private spawnSplashDroplets(pos: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      let mesh: THREE.Mesh;
      if (this.beadPool.length > 0) {
        mesh = this.beadPool.pop()!;
      } else {
        mesh = new THREE.Mesh(this.beadGeometry, this.beadMaterial);
      }

      mesh.position.copy(pos);
      mesh.position.y += 0.05;
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;
      this.rootGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.0;
      this.splashParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.12,
      });
    }
  }

  public update(dt: number) {
    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const p = this.splashParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.rootGroup.remove(p.mesh);
        // 对象池回收，严禁 dispose 共享的 beadGeometry！
        this.beadPool.push(p.mesh);
        this.splashParticles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        const progress = p.life / p.maxLife;
        const scale = 1 - progress;
        p.mesh.scale.set(scale, scale, scale);
      }
    }
  }

  public clear() {
    for (const p of this.splashParticles) {
      p.mesh.visible = false;
      this.rootGroup.remove(p.mesh);
      this.beadPool.push(p.mesh);
    }
    this.splashParticles = [];
  }
}
