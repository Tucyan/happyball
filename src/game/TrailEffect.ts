import * as THREE from 'three';
import { BallTrail } from './SkinData';

interface TrailParticle {
  mesh: THREE.Mesh;
  opacity: number;
  scale: number;
  life: number;
  maxLife: number;
}

export class TrailEffect {
  public group: THREE.Group;
  private particles: TrailParticle[] = [];
  private pool: THREE.Mesh[] = [];
  private normalMaterial: THREE.MeshBasicMaterial;
  private superMaterial: THREE.MeshBasicMaterial;

  private currentGeo: THREE.BufferGeometry;
  private circleGeo: THREE.CircleGeometry;
  private diamondGeo: THREE.BufferGeometry;
  private starGeo: THREE.BufferGeometry;

  constructor() {
    this.group = new THREE.Group();

    // 1. 水滴圆形
    this.circleGeo = new THREE.CircleGeometry(0.16, 16);

    // 2. 菱形 (4边形)
    const diamondShape = new THREE.Shape();
    diamondShape.moveTo(0, 0.2);
    diamondShape.lineTo(0.15, 0);
    diamondShape.lineTo(0, -0.2);
    diamondShape.lineTo(-0.15, 0);
    diamondShape.closePath();
    this.diamondGeo = new THREE.ShapeGeometry(diamondShape);

    // 3. 五角星
    const starShape = new THREE.Shape();
    const points = 5;
    const rOuter = 0.2;
    const rInner = 0.085;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    this.starGeo = new THREE.ShapeGeometry(starShape);

    this.currentGeo = this.circleGeo;

    this.normalMaterial = new THREE.MeshBasicMaterial({
      color: 0x2e66ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.superMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
  }

  public applyConfig(trail: BallTrail) {
    this.normalMaterial.color.setHex(trail.color);
    this.superMaterial.color.setHex(trail.superColor);

    if (trail.shape === 'diamond') {
      this.currentGeo = this.diamondGeo;
    } else if (trail.shape === 'star') {
      this.currentGeo = this.starGeo;
    } else {
      this.currentGeo = this.circleGeo;
    }

    // 清空对象池以更新几何体
    for (const m of this.pool) {
      if (m.parent) m.parent.remove(m);
    }
    this.pool = [];
  }

  private getMesh(isSuper: boolean): THREE.Mesh {
    let mesh: THREE.Mesh;
    if (this.pool.length > 0) {
      mesh = this.pool.pop()!;
      mesh.geometry = this.currentGeo;
    } else {
      mesh = new THREE.Mesh(this.currentGeo, isSuper ? this.superMaterial : this.normalMaterial);
    }
    mesh.material = isSuper ? this.superMaterial : this.normalMaterial;
    mesh.visible = true;
    this.group.add(mesh);
    return mesh;
  }

  public emit(pos: THREE.Vector3, isSuper: boolean, count: number = 1) {
    for (let i = 0; i < count; i++) {
      const mesh = this.getMesh(isSuper);
      const spread = isSuper ? 0.08 : 0.03;
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * spread,
        pos.y + (Math.random() - 0.5) * spread,
        pos.z + (Math.random() - 0.5) * spread
      );

      // 朝向摄像机
      mesh.rotation.x = -Math.PI / 10;
      const initialScale = isSuper ? 1.4 : 1.0;
      mesh.scale.set(initialScale, initialScale, initialScale);

      this.particles.push({
        mesh,
        opacity: isSuper ? 1.0 : 0.75,
        scale: initialScale,
        life: 0,
        maxLife: isSuper ? 0.45 : 0.3,
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      const progress = p.life / p.maxLife;

      if (progress >= 1) {
        p.mesh.visible = false;
        this.group.remove(p.mesh);
        this.pool.push(p.mesh);
        this.particles.splice(i, 1);
      } else {
        const factor = 1 - progress;
        p.mesh.scale.set(p.scale * factor, p.scale * factor, p.scale * factor);
      }
    }
  }

  public clear() {
    for (const p of this.particles) {
      p.mesh.visible = false;
      this.group.remove(p.mesh);
      this.pool.push(p.mesh);
    }
    this.particles = [];
  }
}
