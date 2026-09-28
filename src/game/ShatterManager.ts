import * as THREE from 'three';
import { RingMeshGroup } from './Tower';
import { SectorType } from './Types';

interface Shard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  life: number;
  maxLife: number;
  initialScale: number;
}

export class ShatterManager {
  public rootGroup: THREE.Group;
  private shards: Shard[] = [];

  private normalMaterial: THREE.MeshStandardMaterial;
  private hazardMaterial: THREE.MeshStandardMaterial;
  private skinShardMaterial: THREE.MeshStandardMaterial;

  // 预分配静态几何体，彻底消除爆裂时的 GC 卡顿与 GPU 显存重分配
  private staticShardGeo: THREE.BoxGeometry;
  private staticWallShardGeo: THREE.BoxGeometry;
  private shardPool: THREE.Mesh[] = [];

  constructor() {
    this.rootGroup = new THREE.Group();

    this.normalMaterial = new THREE.MeshStandardMaterial({
      color: 0x32363b,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.hazardMaterial = new THREE.MeshStandardMaterial({
      color: 0xff532b,
      roughness: 0.4,
      metalness: 0.1,
    });

    // 匹配参考视频：崩开的普通扇区呈现小球皮肤亮蓝色碎片
    this.skinShardMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a73e8,
      roughness: 0.35,
      metalness: 0.15,
    });

    this.staticShardGeo = new THREE.BoxGeometry(0.55, 0.28, 0.45);
    this.staticWallShardGeo = new THREE.BoxGeometry(0.5, 0.5, 0.4);
  }

  private getMesh(isWall: boolean, mat: THREE.Material): THREE.Mesh {
    const geo = isWall ? this.staticWallShardGeo : this.staticShardGeo;
    let mesh: THREE.Mesh;
    if (this.shardPool.length > 0) {
      mesh = this.shardPool.pop()!;
      mesh.geometry = geo;
      mesh.material = mat;
    } else {
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.visible = true;
    mesh.scale.set(1, 1, 1);
    this.rootGroup.add(mesh);
    return mesh;
  }

  // 触发整层爆裂（支持传入小球皮肤颜色赋予碎片，1:1 还原参考视频中崩开的亮蓝碎块）
  public shatterRing(ring: RingMeshGroup, towerRotationY: number, customNormalColor?: number) {
    const ringY = ring.data.y;

    if (customNormalColor !== undefined) {
      this.skinShardMaterial.color.setHex(customNormalColor);
    }

    for (const sg of ring.sectorGroups) {
      const sData = sg.sectorData;
      if (sData.type === SectorType.GAP) continue;

      const mat = sData.type === SectorType.HAZARD
        ? this.hazardMaterial
        : (customNormalColor !== undefined ? this.skinShardMaterial : this.normalMaterial);

      // 为每个扇区分裂出 2 个碎片（优化移动端粒子总数与流畅度）
      const subSlices = 2;
      const angleSlice = (sData.endAngle - sData.startAngle) / subSlices;

      for (let s = 0; s < subSlices; s++) {
        const subStart = sData.startAngle + s * angleSlice;
        const subEnd = subStart + angleSlice;

        const mesh = this.getMesh(false, mat);

        // 计算碎块在世界的初始位置 (世界坐标中 Z 轴对应 -R * sin(subMid))
        const subMid = (subStart + subEnd) / 2 + towerRotationY;
        const radius = 1.75 + (Math.random() - 0.5) * 0.4;
        const x = radius * Math.cos(subMid);
        const z = -radius * Math.sin(subMid);

        mesh.position.set(x, ringY + 0.1, z);
        mesh.rotation.y = -subMid;

        // 爆炸物理参数（向外喷射 + 略微向上跳跃，然后重力下坠）
        const outSpeed = 4.0 + Math.random() * 3.5;
        const vx = Math.cos(subMid) * outSpeed + (Math.random() - 0.5) * 1.5;
        const vz = -Math.sin(subMid) * outSpeed + (Math.random() - 0.5) * 1.5;
        const vy = 2.0 + Math.random() * 2.5;

        this.shards.push({
          mesh,
          vx,
          vy,
          vz,
          rotX: (Math.random() - 0.5) * 12,
          rotY: (Math.random() - 0.5) * 12,
          rotZ: (Math.random() - 0.5) * 12,
          life: 0,
          maxLife: 0.7 + Math.random() * 0.3,
          initialScale: 1.0,
        });
      }
    }

    // 若本层带有橙红色垂直高墙，生成高耸碎块向外炸裂
    if (ring.highWallMesh && ring.data.highWallSector) {
      const hw = ring.data.highWallSector;
      const hwMid = (hw.startAngle + hw.endAngle) / 2 + towerRotationY;
      for (let w = 0; w < 4; w++) {
        const mesh = this.getMesh(true, this.hazardMaterial);
        const radius = 1.75 + (Math.random() - 0.5) * 0.4;
        const x = radius * Math.cos(hwMid) + (Math.random() - 0.5) * 0.3;
        const z = -radius * Math.sin(hwMid) + (Math.random() - 0.5) * 0.3;
        const y = ringY + 0.3 + (w / 4) * 1.2;

        mesh.position.set(x, y, z);

        const outSpeed = 5.0 + Math.random() * 4.0;
        const vx = Math.cos(hwMid) * outSpeed + (Math.random() - 0.5) * 2;
        const vz = -Math.sin(hwMid) * outSpeed + (Math.random() - 0.5) * 2;
        const vy = 3.0 + Math.random() * 3.5;

        this.shards.push({
          mesh,
          vx,
          vy,
          vz,
          rotX: (Math.random() - 0.5) * 16,
          rotY: (Math.random() - 0.5) * 16,
          rotZ: (Math.random() - 0.5) * 16,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.3,
          initialScale: 1.0,
        });
      }
    }
  }

  public update(dt: number) {
    const gravity = 28;

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life += dt;

      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
        this.rootGroup.remove(s.mesh);
        // 回收至池中，严禁释放共享几何体！
        this.shardPool.push(s.mesh);
        this.shards.splice(i, 1);
      } else {
        // 速度积分
        s.vy -= gravity * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;

        // 旋转
        s.mesh.rotation.x += s.rotX * dt;
        s.mesh.rotation.y += s.rotY * dt;
        s.mesh.rotation.z += s.rotZ * dt;

        // 逐渐缩小消失
        const progress = s.life / s.maxLife;
        if (progress > 0.6) {
          const scale = 1 - (progress - 0.6) / 0.4;
          s.mesh.scale.set(scale, scale, scale);
        }
      }
    }
  }

  public clear() {
    for (const s of this.shards) {
      s.mesh.visible = false;
      this.rootGroup.remove(s.mesh);
      this.shardPool.push(s.mesh);
    }
    this.shards = [];
  }
}
