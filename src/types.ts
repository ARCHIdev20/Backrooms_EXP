export type CellType = 'empty' | 'wall' | 'player' | 'enemy' | 'stairs';

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  height: number;
  floorHeight?: number;
  ceilHeight?: number;
  textureId?: string;
  scriptId?: string;
  isLight?: boolean;
  isRealLight?: boolean;
  isThinWall?: boolean;
  wallDirection?: 'x' | 'z';
}

export interface TextureData {
  id: string;
  name: string;
  dataUrl: string; // base64 image data
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
  textureId?: string; // optional face texture
}

export interface ModelData {
  id: string;
  name: string;
  voxels: Voxel[];
  spriteTextureId?: string; // texture applied to the whole model as a billboard
}

export interface ScriptData {
  id: string;
  name: string;
  code: string;
}

export interface SpawnPoint {
  worldX: number;
  worldZ: number;
  modelId: string;
}

export type EditorTab = 'textures' | 'scripts' | 'models' | 'sprite';
export type CameraFilter = 'none' | 'vhs' | 'night-vision';
export type AppScreen = 'menu' | 'editor';

export interface EngineState {
  screen: AppScreen;
  map: Cell[][];
  textures: TextureData[];
  scripts: ScriptData[];
  activeTab: EditorTab;
  isPlaying: boolean;
  selectedColor: string;
  models: ModelData[];
  activeFilter: CameraFilter;
  spawnPoints: SpawnPoint[];
  
  globalFloorTexture?: string;
  globalCeilTexture?: string;
  
  setScreen: (screen: AppScreen) => void;
  setGlobalFloorTexture: (textureId?: string) => void;
  setGlobalCeilTexture: (textureId?: string) => void;
  
  setMapCell: (x: number, y: number, cellData: Partial<Cell>) => void;
  addTexture: (texture: TextureData) => void;
  updateTexture: (id: string, texture: Partial<TextureData>) => void;
  addScript: (script: ScriptData) => void;
  updateScript: (id: string, script: Partial<ScriptData>) => void;
  setActiveTab: (tab: EditorTab) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setActiveFilter: (filter: CameraFilter) => void;
  setSelectedColor: (color: string) => void;
  addModel: (model: ModelData) => void;
  updateModel: (id: string, model: Partial<ModelData>) => void;
  addSpawnPoint: (sp: SpawnPoint) => void;
  removeSpawnPoint: (index: number) => void;
  clearSpawnPoints: () => void;
}
