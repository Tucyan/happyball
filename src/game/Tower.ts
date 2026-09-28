import * as THREE from 'three';
import { SectorType, SectorData, RingData, GameConfig } from './Types';

export interface SectorMeshGroup {
  sectorData: SectorData;
  mesh: THREE.Mesh;
}

export interface RingMeshGroup {
  data: RingData;
  group: THREE.Group;
  sectorGroups: SectorMeshGroup[];
  highWallMesh?: THREE.Mesh;
  isDestroyed: boolean;
}

export class Tower {
  public rootGroup: THREE.Group;
  public cylinderMesh: THREE.Mesh;
  public rings: RingMeshGroup[] = [];
  private config: GameConfig;

  // 材质复用优化
  private normalMaterial: THREE.MeshStandardMaterial;
  private hazardMaterial: THREE.MeshStandardMaterial;
  private cylinderMaterial: THREE.MeshStandardMaterial;

  // 无限模式生成状态
  private nextRingIndex: number = 0;
  private previousGaps: Set<number> = new Set<number>([3]);

  constructor(config: GameConfig) {
    this.config = config;
    this.rootGroup = new THREE.Group();

    // 材质定义（匹配视频视觉）
    this.cylinderMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f6f8,
      roughness: 0.45,
      metalness: 0.05,
    });

    this.normalMaterial = new THREE.MeshStandardMaterial({
      color: 0x272a2e, // 深炭灰
      roughness: 0.6,
      metalness: 0.1,
    });

    this.hazardMaterial = new THREE.MeshStandardMaterial({
      color: 0xff532b, // 亮橙红危险色
      roughness: 0.4,
      metalness: 0.1,
    });

    // 1. 创建中心立柱（高度 160，跟随视角移动实现真正的无限立柱）
    const cylinderHeight = 160;
    const cylinderGeo = new THREE.CylinderGeometry(
      config.cylinderRadius,
      config.cylinderRadius,
      cylinderHeight,
      48
    );
    this.cylinderMesh = new THREE.Mesh(cylinderGeo, this.cylinderMaterial);
    this.cylinderMesh.receiveShadow = true;
    this.rootGroup.add(this.cylinderMesh);
  }

  // 生成扇形网格（带有精致倒角）
  public createSectorGeometry(startAngle: number, endAngle: number): THREE.BufferGeometry {
    const { ringInnerRadius, ringOuterRadius, ringThickness } = this.config;
    const shape = new THREE.Shape();

    const segments = Math.max(6, Math.floor(((endAngle - startAngle) / (Math.PI * 2)) * 36));

    // 外弧
    for (let i = 0; i <= segments; i++) {
      const theta = startAngle + (i / segments) * (endAngle - startAngle);
      const x = ringOuterRadius * Math.cos(theta);
      const y = ringOuterRadius * Math.sin(theta);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    // 内弧（逆序连回）
    for (let i = segments; i >= 0; i--) {
      const theta = startAngle + (i / segments) * (endAngle - startAngle);
      const x = ringInnerRadius * Math.cos(theta);
      const y = ringInnerRadius * Math.sin(theta);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: ringThickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // 旋转到 X-Z 水平平面，使上表面精确对齐 y=0
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -ringThickness, 0);
    geometry.computeVertexNormals();

    return geometry;
  }

  // 生成垂直立体的橙红色高墙网格（矗立在扇区之上）
  public createHighWallGeometry(startAngle: number, endAngle: number, height: number = 1.85): THREE.BufferGeometry {
    const { ringInnerRadius, ringOuterRadius } = this.config;
    const shape = new THREE.Shape();
    const segments = Math.max(6, Math.floor(((endAngle - startAngle) / (Math.PI * 2)) * 36));

    for (let i = 0; i <= segments; i++) {
      const theta = startAngle + (i / segments) * (endAngle - startAngle);
      const x = ringOuterRadius * Math.cos(theta);
      const y = ringOuterRadius * Math.sin(theta);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = segments; i >= 0; i--) {
      const theta = startAngle + (i / segments) * (endAngle - startAngle);
      const x = ringInnerRadius * Math.cos(theta);
      const y = ringInnerRadius * Math.sin(theta);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    return geometry;
  }

  // 重置并初始化无限关卡
  public initEndless() {
    for (const r of this.rings) {
      this.rootGroup.remove(r.group);
      r.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    }
    this.rings = [];
    this.rootGroup.rotation.y = 0;
    this.nextRingIndex = 0;
    this.previousGaps = new Set<number>([3]);

    // 初始先预生成 25 层
    for (let i = 0; i < 25; i++) {
      this.generateNextRing();
    }
  }

  // 单层生成逻辑（确保绝对可通，高分层增加不可逾越的橙红色高墙）
  private generateNextRing() {
    const i = this.nextRingIndex++;
    const ringY = -i * this.config.ringSpacing;
    const ringGroup = new THREE.Group();
    ringGroup.position.set(0, ringY, 0);

    const sectorsCount = this.config.sectorsPerRing;
    const angleStep = (Math.PI * 2) / sectorsCount;

    const sectorDataList: SectorData[] = [];
    const sectorGroups: SectorMeshGroup[] = [];

    let highWallSectorIdx: number | null = null;

    // 第一层安全引导（没有危险区，缺口在对面 3 号）
    if (i === 0) {
      const gapIndex = 3;
      for (let s = 0; s < sectorsCount; s++) {
        const startAngle = s * angleStep;
        const endAngle = (s + 1) * angleStep;
        if (s === gapIndex) {
          sectorDataList.push({ startAngle, endAngle, type: SectorType.GAP });
        } else {
          sectorDataList.push({ startAngle, endAngle, type: SectorType.NORMAL });
        }
      }
      this.previousGaps = new Set([gapIndex]);
    } else {
      // 1. 确定本层缺口位置与宽度（1 ~ 2 格），避免与上一层完全重叠
      const gapSize = Math.floor(Math.random() * 2) + 1;
      let gapStart = Math.floor(Math.random() * sectorsCount);
      if (this.previousGaps.has(gapStart)) {
        gapStart = (gapStart + Math.floor(sectorsCount / 3) + Math.floor(Math.random() * 3)) % sectorsCount;
      }
      const currentGaps = new Set<number>();
      for (let g = 0; g < gapSize; g++) {
        currentGaps.add((gapStart + g) % sectorsCount);
      }

      // 2. 保证可通性算法：计算上一层落点与本层缺口之间的主通行走廊
      // 找出落脚点（上一层缺口正下方）
      const landingSector = Array.from(this.previousGaps)[0] ?? 0;
      
      // 检查顺时针与逆时针距离，选出较短路径作为必定安全的通道
      const cwDist = (gapStart - landingSector + sectorsCount) % sectorsCount;
      const ccwDist = (landingSector - gapStart + sectorsCount) % sectorsCount;
      
      const safePathIndices = new Set<number>();
      // 将落点和缺口以及两者之间的连通路段标记为绝对安全区
      if (cwDist <= ccwDist) {
        for (let step = 0; step <= cwDist; step++) {
          safePathIndices.add((landingSector + step) % sectorsCount);
        }
      } else {
        for (let step = 0; step <= ccwDist; step++) {
          safePathIndices.add((landingSector - step + sectorsCount) % sectorsCount);
        }
      }
      // 额外将落脚点两旁的缓冲扇区也列入安全保护
      safePathIndices.add((landingSector + 1) % sectorsCount);
      safePathIndices.add((landingSector - 1 + sectorsCount) % sectorsCount);
      for (const g of currentGaps) {
        safePathIndices.add(g);
      }

      // 3. 在非安全走廊的扇区中合理布置危险区（橙红地面）
      const availableForHazards: number[] = [];
      for (let s = 0; s < sectorsCount; s++) {
        if (!safePathIndices.has(s) && !currentGaps.has(s)) {
          availableForHazards.push(s);
        }
      }

      const hazardCount = Math.min(availableForHazards.length, Math.min(4, Math.floor(i / 6) + 1));
      const hazardIndices = new Set<number>();
      // 随机抽取
      const shuffled = [...availableForHazards].sort(() => Math.random() - 0.5);
      for (let h = 0; h < hazardCount; h++) {
        hazardIndices.add(shuffled[h]);
      }

      // 4. 高分层生成“不可逾越的橙红色高墙”
      // 当层数 >= 8 或得分较高时，35% 概率在危险区中立起垂直高墙
      if (i >= 8 && hazardIndices.size > 0 && Math.random() < 0.4) {
        // 选择一个与缺口最远的危险扇区放置高墙
        let maxDist = -1;
        let chosenIdx = Array.from(hazardIndices)[0];
        for (const hIdx of hazardIndices) {
          const d = Math.min(
            (hIdx - gapStart + sectorsCount) % sectorsCount,
            (gapStart - hIdx + sectorsCount) % sectorsCount
          );
          if (d > maxDist) {
            maxDist = d;
            chosenIdx = hIdx;
          }
        }
        highWallSectorIdx = chosenIdx;
      }

      // 构建扇区数据列表
      for (let s = 0; s < sectorsCount; s++) {
        const startAngle = s * angleStep;
        const endAngle = (s + 1) * angleStep;
        const isHighWall = s === highWallSectorIdx;
        if (currentGaps.has(s)) {
          sectorDataList.push({ startAngle, endAngle, type: SectorType.GAP });
        } else if (hazardIndices.has(s)) {
          sectorDataList.push({ startAngle, endAngle, type: SectorType.HAZARD, hasHighWall: isHighWall });
        } else {
          sectorDataList.push({ startAngle, endAngle, type: SectorType.NORMAL });
        }
      }
      this.previousGaps = currentGaps;
    }

    let highWallMesh: THREE.Mesh | undefined;

    // 根据数据生成网格
    for (let s = 0; s < sectorDataList.length; s++) {
      const sData = sectorDataList[s];
      if (sData.type === SectorType.GAP) continue;

      const mat = sData.type === SectorType.HAZARD ? this.hazardMaterial : this.normalMaterial;
      const geo = this.createSectorGeometry(sData.startAngle, sData.endAngle);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      ringGroup.add(mesh);
      sectorGroups.push({ sectorData: sData, mesh });

      // 如果此扇区带有垂直高墙，生成矗立的 3D 橙红色高墙
      if (sData.hasHighWall) {
        const wallHeight = this.config.ringSpacing * 0.72;
        const wallGeo = this.createHighWallGeometry(sData.startAngle, sData.endAngle, wallHeight);
        highWallMesh = new THREE.Mesh(wallGeo, this.hazardMaterial);
        highWallMesh.castShadow = true;
        highWallMesh.receiveShadow = true;
        ringGroup.add(highWallMesh);
      }
    }

    this.rootGroup.add(ringGroup);
    const ringData: RingData = {
      index: i,
      y: ringY,
      sectors: sectorDataList,
      isDestroyed: false,
      hasHighWall: highWallSectorIdx !== null,
      highWallSector: highWallSectorIdx !== null ? sectorDataList[highWallSectorIdx] : undefined,
    };

    this.rings.push({
      data: ringData,
      group: ringGroup,
      sectorGroups,
      highWallMesh,
      isDestroyed: false,
    });
  }

  // 无限模式动态拓展与顶部回收
  public updateEndless(ballY: number) {
    // 1. 中心立柱跟随小球移动，营造真正的无限高度效果
    this.cylinderMesh.position.y = ballY;

    // 2. 向下补齐环：确保小球下方至少有 25 层的环已生成
    const lowestRing = this.rings[this.rings.length - 1];
    if (lowestRing && lowestRing.data.y > ballY - 45) {
      this.generateNextRing();
    }

    // 3. 向上回收远处的环（释放 GPU 几何体，保持 60fps 恒定内存）
    while (this.rings.length > 35 && this.rings[0].data.y > ballY + 22) {
      const topRing = this.rings.shift();
      if (topRing) {
        this.rootGroup.remove(topRing.group);
        topRing.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
          }
        });
      }
    }
  }

  // 销毁整层（超载粉碎）
  public destroyRing(ringIndex: number): RingMeshGroup | null {
    // 在当前活跃数组中查找
    const ring = this.rings.find((r) => r.data.index === ringIndex);
    if (!ring || ring.isDestroyed) return null;

    ring.isDestroyed = true;
    ring.data.isDestroyed = true;
    ring.group.visible = false;
    return ring;
  }

  // 获取塔当前旋转角
  public getRotationY(): number {
    return this.rootGroup.rotation.y;
  }

  public setRotationY(angle: number) {
    this.rootGroup.rotation.y = angle;
  }

  public rotateY(delta: number) {
    this.rootGroup.rotation.y += delta;
  }
}
