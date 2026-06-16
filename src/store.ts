import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EngineState, Cell, TextureData, ScriptData, ModelData, SpawnPoint, AppScreen } from './types';

// Initial Map config
const MAP_SIZE = 40;

const initialMap: Cell[][] = Array.from({ length: MAP_SIZE }, (_, y) =>
  Array.from({ length: MAP_SIZE }, (_, x) => {
    const isEdge = x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1;
    const isPlayer = x === 2 && y === 2;
    return {
      x,
      y,
      type: isEdge ? 'wall' : (isPlayer ? 'player' : 'empty'),
      height: isEdge ? 2 : 0,
      floorHeight: 0,
      ceilHeight: 3.5,
      textureId: 'backrooms-wall'
    };
  })
);

const createBackroomsTexture = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dbb351';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#bfa552';
  ctx.fillRect(0, 4, 16, 2);
  ctx.fillRect(0, 10, 16, 2);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#bfa552' : '#8c7835';
    ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
  }
  return canvas.toDataURL();
};

const createMonsterTexture = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const shade = Math.floor(Math.random() * 100);
      ctx.fillStyle = `rgb(${shade},0,${shade})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL();
};

const createCarpetTexture = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8a7f65';
  ctx.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#7a6f55' : '#9a8f75';
    ctx.fillRect(Math.floor(Math.random() * 32), Math.floor(Math.random() * 32), 1, 1);
  }
  return canvas.toDataURL();
};

const createCeilingTileTexture = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ddddca';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#bbaa99';
  ctx.fillRect(0, 0, 32, 2);
  ctx.fillRect(0, 0, 2, 32);
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = '#bbaa99';
    ctx.fillRect(Math.floor(Math.random() * 32), Math.floor(Math.random() * 32), 1, 1);
  }
  return canvas.toDataURL();
};

// We use lazy initialization via a helper so we only create canvas textures once
let _defaultTextures: TextureData[] | null = null;
function getDefaultTextures(): TextureData[] {
  if (!_defaultTextures) {
    _defaultTextures = [
      { id: 'backrooms-wall', name: 'Wallpaper', dataUrl: createBackroomsTexture() },
      { id: 'monster', name: 'Entity', dataUrl: createMonsterTexture() },
      { id: 'backrooms-carpet', name: 'Moist Carpet', dataUrl: createCarpetTexture() },
      { id: 'backrooms-ceiling', name: 'Acoustic Tile', dataUrl: createCeilingTileTexture() },
    ];
  }
  return _defaultTextures;
}

const defaultScript: ScriptData = {
  id: 'basic-enemy',
  name: 'Basic Enemy AI',
  code: `// CloverScript: Basic Enemy AI
// Variables available: entity, player, engine, deltaTime

const dx = player.position.x - entity.position.x;
const dz = player.position.z - entity.position.z;
const dist = Math.sqrt(dx * dx + dz * dz);

// Move towards player if within vision radius (10 units)
if (dist > 1.5 && dist < 10) {
  entity.position.x += (dx / dist) * 1.5 * deltaTime;
  entity.position.z += (dz / dist) * 1.5 * deltaTime;
}

// Simple floating animation
entity.position.y = 0.5 + Math.sin(engine.time * 2) * 0.2;
`,
};

const chairModel: ModelData = {
  id: 'chair',
  name: 'Wooden Chair',
  voxels: [
    // Legs
    { x: 2, y: 0, z: 2, color: '#5c4033' }, { x: 2, y: 1, z: 2, color: '#5c4033' }, { x: 2, y: 2, z: 2, color: '#5c4033' },
    { x: 5, y: 0, z: 2, color: '#5c4033' }, { x: 5, y: 1, z: 2, color: '#5c4033' }, { x: 5, y: 2, z: 2, color: '#5c4033' },
    { x: 2, y: 0, z: 5, color: '#5c4033' }, { x: 2, y: 1, z: 5, color: '#5c4033' }, { x: 2, y: 2, z: 5, color: '#5c4033' },
    { x: 5, y: 0, z: 5, color: '#5c4033' }, { x: 5, y: 1, z: 5, color: '#5c4033' }, { x: 5, y: 2, z: 5, color: '#5c4033' },
    // Seat
    { x: 2, y: 3, z: 2, color: '#8b5a2b' }, { x: 3, y: 3, z: 2, color: '#8b5a2b' }, { x: 4, y: 3, z: 2, color: '#8b5a2b' }, { x: 5, y: 3, z: 2, color: '#8b5a2b' },
    { x: 2, y: 3, z: 3, color: '#8b5a2b' }, { x: 3, y: 3, z: 3, color: '#8b5a2b' }, { x: 4, y: 3, z: 3, color: '#8b5a2b' }, { x: 5, y: 3, z: 3, color: '#8b5a2b' },
    { x: 2, y: 3, z: 4, color: '#8b5a2b' }, { x: 3, y: 3, z: 4, color: '#8b5a2b' }, { x: 4, y: 3, z: 4, color: '#8b5a2b' }, { x: 5, y: 3, z: 4, color: '#8b5a2b' },
    { x: 2, y: 3, z: 5, color: '#8b5a2b' }, { x: 3, y: 3, z: 5, color: '#8b5a2b' }, { x: 4, y: 3, z: 5, color: '#8b5a2b' }, { x: 5, y: 3, z: 5, color: '#8b5a2b' },
    // Backrest
    { x: 2, y: 4, z: 5, color: '#5c4033' }, { x: 5, y: 4, z: 5, color: '#5c4033' },
    { x: 2, y: 5, z: 5, color: '#5c4033' }, { x: 5, y: 5, z: 5, color: '#5c4033' },
    { x: 2, y: 6, z: 5, color: '#5c4033' }, { x: 3, y: 6, z: 5, color: '#5c4033' }, { x: 4, y: 6, z: 5, color: '#5c4033' }, { x: 5, y: 6, z: 5, color: '#5c4033' },
    { x: 2, y: 7, z: 5, color: '#5c4033' }, { x: 5, y: 7, z: 5, color: '#5c4033' },
  ]
};

export const useStore = create<EngineState>()(
  persist(
    (set) => ({
      screen: 'menu' as AppScreen,
      map: initialMap,
      globalFloorTexture: 'backrooms-carpet',
      globalCeilTexture: 'backrooms-ceiling',
      textures: getDefaultTextures(),
      models: [chairModel],
      scripts: [defaultScript],
      activeTab: 'textures',
      isPlaying: false,
      activeFilter: 'none',
      selectedColor: '#000000',
      spawnPoints: [],

      setScreen: (screen) => set({ screen }),

      setGlobalFloorTexture: (id) => set({ globalFloorTexture: id }),
      setGlobalCeilTexture: (id) => set({ globalCeilTexture: id }),

      setMapCell: (x, y, cellData) =>
        set((state) => {
          const newMap = [...state.map];
          newMap[y] = [...newMap[y]];
          if (cellData.type === 'player') {
            for (let r = 0; r < MAP_SIZE; r++) {
              for (let c = 0; c < MAP_SIZE; c++) {
                if (newMap[r][c].type === 'player') {
                  newMap[r][c] = { ...newMap[r][c], type: 'empty' };
                }
              }
            }
          }
          newMap[y][x] = { ...newMap[y][x], ...cellData };
          return { map: newMap };
        }),

      addTexture: (texture) =>
        set((state) => ({ textures: [...state.textures, texture] })),

      updateTexture: (id, textureData) =>
        set((state) => ({
          textures: state.textures.map((t) =>
            t.id === id ? { ...t, ...textureData } : t
          ),
        })),

      addModel: (model) =>
        set((state) => ({ models: [...state.models, model] })),

      updateModel: (id, modelData) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, ...modelData } : m
          ),
        })),

      addScript: (script) =>
        set((state) => ({ scripts: [...state.scripts, script] })),

      updateScript: (id, scriptData) =>
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, ...scriptData } : s
          ),
        })),

      addSpawnPoint: (sp) =>
        set((state) => ({ spawnPoints: [...state.spawnPoints, sp] })),

      removeSpawnPoint: (index) =>
        set((state) => ({
          spawnPoints: state.spawnPoints.filter((_, i) => i !== index),
        })),

      clearSpawnPoints: () => set({ spawnPoints: [] }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setSelectedColor: (color) => set({ selectedColor: color }),
    }),
    {
      name: 'clover-engine-state',
      storage: createJSONStorage(() => localStorage),
      // Only persist the user-created data, not transient UI state
      partialize: (state) => ({
        textures: state.textures,
        models: state.models,
        scripts: state.scripts,
        globalFloorTexture: state.globalFloorTexture,
        globalCeilTexture: state.globalCeilTexture,
        activeFilter: state.activeFilter,
        spawnPoints: state.spawnPoints,
      }),
    }
  )
);
