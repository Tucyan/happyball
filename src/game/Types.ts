export enum SectorType {
  GAP = 0,
  NORMAL = 1,
  HAZARD = 2,
  FINISH = 3,
}

export interface SectorData {
  startAngle: number;
  endAngle: number;
  type: SectorType;
  hasHighWall?: boolean;
}

export interface RingData {
  index: number;
  y: number;
  sectors: SectorData[];
  isDestroyed?: boolean;
  hasHighWall?: boolean;
  highWallSector?: SectorData;
}

export enum BallState {
  BOUNCING = 'BOUNCING',
  FREE_FALL = 'FREE_FALL',
  SUPER_SMASH = 'SUPER_SMASH',
  DEAD = 'DEAD',
  VICTORY = 'VICTORY',
}

export interface GameConfig {
  cylinderRadius: number;
  ringInnerRadius: number;
  ringOuterRadius: number;
  ringThickness: number;
  ringSpacing: number;
  ballRadius: number;
  ballTrackRadius: number;
  sectorsPerRing: number;
  gravity: number;
  bounceVelocity: number;
  superSpeedMultiplier: number;
  superComboThreshold: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  cylinderRadius: 0.8,
  ringInnerRadius: 0.81,
  ringOuterRadius: 2.7,
  ringThickness: 0.32,
  ringSpacing: 3.3,
  ballRadius: 0.22,
  ballTrackRadius: 1.75,
  sectorsPerRing: 12,
  gravity: 34,
  bounceVelocity: 8.8,
  superSpeedMultiplier: 1.35,
  superComboThreshold: 3,
};
