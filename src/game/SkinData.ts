export interface BallSkin {
  id: string;
  name: string;
  price: number;
  previewColor: string;
  color: number;
  roughness: number;
  metalness: number;
  emissive: number;
  emissiveIntensity: number;
  splatColor: string;
}

export interface BallTrail {
  id: string;
  name: string;
  price: number;
  previewColor: string;
  color: number;
  superColor: number;
  shape: 'circle' | 'diamond' | 'star';
}

export const SKINS_DATA: BallSkin[] = [
  {
    id: 'classic_blue',
    name: '经典宝蓝',
    price: 0,
    previewColor: '#1d5eff',
    color: 0x1d5eff,
    roughness: 0.25,
    metalness: 0.15,
    emissive: 0x051d5c,
    emissiveIntensity: 0.3,
    splatColor: '#185aff',
  },
  {
    id: 'flame_orange',
    name: '炽热熔岩',
    price: 100,
    previewColor: '#ff4500',
    color: 0xff3b00,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0x661100,
    emissiveIntensity: 0.5,
    splatColor: '#ff4500',
  },
  {
    id: 'cyber_neon',
    name: '赛博霓虹',
    price: 250,
    previewColor: '#00f0ff',
    color: 0x00f0ff,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x0088aa,
    emissiveIntensity: 0.6,
    splatColor: '#00d4ff',
  },
  {
    id: 'emerald_green',
    name: '翡翠晶绿',
    price: 400,
    previewColor: '#2ecc71',
    color: 0x2ecc71,
    roughness: 0.18,
    metalness: 0.25,
    emissive: 0x0a4d25,
    emissiveIntensity: 0.45,
    splatColor: '#27ae60',
  },
  {
    id: 'royal_gold',
    name: '耀眼鎏金',
    price: 650,
    previewColor: '#ffd700',
    color: 0xffd700,
    roughness: 0.12,
    metalness: 0.85,
    emissive: 0x554400,
    emissiveIntensity: 0.4,
    splatColor: '#f39c12',
  },
  {
    id: 'shadow_obsidian',
    name: '暗夜幽影',
    price: 900,
    previewColor: '#8b5cf6',
    color: 0x221f38,
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.55,
    splatColor: '#6d28d9',
  },
];

export const TRAILS_DATA: BallTrail[] = [
  {
    id: 'trail_blue',
    name: '凝润水滴',
    price: 0,
    previewColor: '#2e66ff',
    color: 0x2e66ff,
    superColor: 0x00f0ff,
    shape: 'circle',
  },
  {
    id: 'trail_fire',
    name: '烈焰尾迹',
    price: 150,
    previewColor: '#ff5500',
    color: 0xff5500,
    superColor: 0xffd700,
    shape: 'circle',
  },
  {
    id: 'trail_aurora',
    name: '极光幻彩',
    price: 300,
    previewColor: '#a855f7',
    color: 0x9333ea,
    superColor: 0x06b6d4,
    shape: 'diamond',
  },
  {
    id: 'trail_starlight',
    name: '璀璨星芒',
    price: 600,
    previewColor: '#fbbf24',
    color: 0xf59e0b,
    superColor: 0xffffff,
    shape: 'star',
  },
];

const COINS_KEY = 'happyball_coins';
const UNLOCKED_SKINS_KEY = 'happyball_unlocked_skins';
const UNLOCKED_TRAILS_KEY = 'happyball_unlocked_trails';
const CURRENT_SKIN_KEY = 'happyball_current_skin';
const CURRENT_TRAIL_KEY = 'happyball_current_trail';

export class ShopStorage {
  public static getCoins(): number {
    try {
      const val = localStorage.getItem(COINS_KEY);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public static addCoins(amount: number): number {
    const current = this.getCoins();
    const updated = Math.max(0, current + amount);
    try {
      localStorage.setItem(COINS_KEY, updated.toString());
    } catch {
      // ignore
    }
    return updated;
  }

  public static spendCoins(amount: number): boolean {
    const current = this.getCoins();
    if (current < amount) return false;
    try {
      localStorage.setItem(COINS_KEY, (current - amount).toString());
    } catch {
      // ignore
    }
    return true;
  }

  public static getUnlockedSkins(): string[] {
    try {
      const val = localStorage.getItem(UNLOCKED_SKINS_KEY);
      if (val) {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) return arr;
      }
    } catch {
      // ignore
    }
    return ['classic_blue'];
  }

  public static unlockSkin(id: string) {
    const list = this.getUnlockedSkins();
    if (!list.includes(id)) {
      list.push(id);
      try {
        localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
  }

  public static getCurrentSkin(): BallSkin {
    try {
      const id = localStorage.getItem(CURRENT_SKIN_KEY) || 'classic_blue';
      const skin = SKINS_DATA.find((s) => s.id === id);
      if (skin) return skin;
    } catch {
      // ignore
    }
    return SKINS_DATA[0];
  }

  public static setCurrentSkin(id: string) {
    try {
      localStorage.setItem(CURRENT_SKIN_KEY, id);
    } catch {
      // ignore
    }
  }

  public static getUnlockedTrails(): string[] {
    try {
      const val = localStorage.getItem(UNLOCKED_TRAILS_KEY);
      if (val) {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) return arr;
      }
    } catch {
      // ignore
    }
    return ['trail_blue'];
  }

  public static unlockTrail(id: string) {
    const list = this.getUnlockedTrails();
    if (!list.includes(id)) {
      list.push(id);
      try {
        localStorage.setItem(UNLOCKED_TRAILS_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
  }

  public static getCurrentTrail(): BallTrail {
    try {
      const id = localStorage.getItem(CURRENT_TRAIL_KEY) || 'trail_blue';
      const trail = TRAILS_DATA.find((t) => t.id === id);
      if (trail) return trail;
    } catch {
      // ignore
    }
    return TRAILS_DATA[0];
  }

  public static setCurrentTrail(id: string) {
    try {
      localStorage.setItem(CURRENT_TRAIL_KEY, id);
    } catch {
      // ignore
    }
  }
}
