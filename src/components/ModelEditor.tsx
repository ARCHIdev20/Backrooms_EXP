import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { Box, Plus, Trash2, Eraser, Layers } from 'lucide-react';
import { ModelData, Voxel } from '../types';

const PALETTE = [
  // Neutrals
  '#ffffff', '#cccccc', '#888888', '#444444', '#111111',
  // Wood tones
  '#8b5a2b', '#5c4033', '#3b2208', '#d4a96a', '#f5deb3',
  // Metals
  '#a8a9ad', '#4a4a4a', '#b87333', '#ffd700',
  // Fabric / Soft
  '#8b0000', '#d2691e', '#6b8e23', '#4682b4', '#9932cc',
  // Environment
  '#228b22', '#87ceeb', '#f4a460', '#696969', '#2f4f4f',
];

const GRID_SIZE = 8;

// ── Lightweight isometric preview ────────────────────────────────────────────

function useIsoPreview(voxels: Voxel[], canvasRef: RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0d1117, 1);

    const scene = new THREE.Scene();

    // Isometric-ish camera
    const cam = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.01, 200);
    cam.position.set(3, 5, 6);
    cam.lookAt(0.5, 0.5, 0.5);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffeedd, 1.2);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    // Build voxel meshes
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const group = new THREE.Group();

    for (const v of voxels) {
      const mat = new THREE.MeshStandardMaterial({ color: v.color, roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      // Center around 0,0 using GRID_SIZE=8, offset from center (3.5)
      mesh.position.set(v.x - (GRID_SIZE / 2 - 0.5), v.y, v.z - (GRID_SIZE / 2 - 0.5));
      group.add(mesh);
    }
    scene.add(group);

    // Slow auto-rotate
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      group.rotation.y += 0.008;
      renderer.render(scene, cam);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geo.dispose();
    };
  }, [voxels, canvasRef]);
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ModelEditor() {
  const models = useStore((s) => s.models);
  const addModel = useStore((s) => s.addModel);
  const updateModel = useStore((s) => s.updateModel);

  const [activeModelId, setActiveModelId] = useState<string>(models[0]?.id ?? '');
  const [selectedColor, setSelectedColor] = useState(PALETTE[6]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [isErasing, setIsErasing] = useState(false);

  const previewRef = useRef<HTMLCanvasElement>(null);

  const activeModel = models.find((m) => m.id === activeModelId) ?? null;
  const voxels: Voxel[] = activeModel?.voxels ?? [];

  // Live 3D preview
  useIsoPreview(voxels, previewRef as RefObject<HTMLCanvasElement>);

  // Build the 2D slice for the current layer
  const gridCells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
    const x = i % GRID_SIZE;
    const z = Math.floor(i / GRID_SIZE);
    const voxel = voxels.find((v) => v.x === x && v.y === activeLayer && v.z === z);
    return { x, z, color: voxel?.color ?? null };
  });

  const paintCell = useCallback(
    (x: number, z: number) => {
      if (!activeModelId) return;
      const existing = voxels.findIndex((v) => v.x === x && v.y === activeLayer && v.z === z);
      let next = [...voxels];
      if (isErasing) {
        if (existing >= 0) next.splice(existing, 1);
      } else {
        if (existing >= 0) {
          next[existing] = { ...next[existing], color: selectedColor };
        } else {
          next.push({ x, y: activeLayer, z, color: selectedColor });
        }
      }
      updateModel(activeModelId, { voxels: next });
    },
    [activeModelId, activeLayer, isErasing, selectedColor, voxels, updateModel]
  );

  const createNewModel = () => {
    const id = `model-${Date.now()}`;
    const m: ModelData = { id, name: `Model ${models.length + 1}`, voxels: [] };
    addModel(m);
    setActiveModelId(id);
    setActiveLayer(0);
  };

  const clearLayer = () => {
    if (!activeModelId) return;
    updateModel(activeModelId, { voxels: voxels.filter((v) => v.y !== activeLayer) });
  };

  const voxelCount = voxels.length;

  return (
    <div className="flex h-full w-full text-slate-300 overflow-hidden">
      {/* ── Left sidebar: model list ────────────────────────────────── */}
      <aside className="w-52 bg-[#14171D] border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={createNewModel}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded transition-colors"
          >
            <Plus size={13} /> NEW MODEL
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActiveModelId(m.id); setActiveLayer(0); }}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                activeModelId === m.id
                  ? 'bg-slate-800 text-emerald-400 font-medium border border-slate-700'
                  : 'hover:bg-slate-800 text-slate-400 border border-transparent'
              }`}
            >
              <Box size={13} />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
          {models.length === 0 && (
            <p className="text-slate-600 text-[10px] p-2">No models yet. Create one!</p>
          )}
        </div>
      </aside>

      {/* ── Center: paint canvas ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col bg-[#090A0C] min-w-0">
        {/* Topbar */}
        <div className="h-10 border-b border-slate-800 flex items-center px-4 gap-4 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Voxel Model Editor
          </span>
          {activeModel && (
            <>
              <span className="text-[10px] text-slate-600">|</span>
              <input
                type="text"
                value={activeModel.name}
                onChange={(e) => updateModel(activeModelId, { name: e.target.value })}
                className="bg-transparent border-b border-slate-700 text-xs text-white outline-none focus:border-emerald-500 w-36 py-0.5"
              />
              <span className="ml-auto text-[10px] text-slate-600">{voxelCount} voxels</span>
            </>
          )}
        </div>

        {activeModel ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-4">
            {/* Layer controls */}
            <div className="flex items-center gap-5 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-slate-400">
                <Layers size={14} />
                <span>Layer</span>
                <input
                  type="range"
                  min="0" max="7"
                  value={activeLayer}
                  onChange={(e) => setActiveLayer(parseInt(e.target.value))}
                  className="w-24 accent-emerald-500"
                />
                <span className="w-4 text-emerald-400 font-bold">{activeLayer}</span>
              </div>
              <button
                onClick={clearLayer}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-red-400 border border-red-900/50 hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={12} /> CLEAR LAYER
              </button>
            </div>

            {/* 8×8 paint grid */}
            <div
              className="grid border border-slate-700 select-none"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                width: 352,
                height: 352,
              }}
            >
              {gridCells.map((cell) => (
                <div
                  key={`${cell.x}-${cell.z}`}
                  className="border border-slate-800/60 cursor-pointer transition-all hover:opacity-80"
                  style={{
                    backgroundColor: cell.color ?? 'transparent',
                    outline: cell.color ? 'none' : '1px solid #1e293b',
                  }}
                  onMouseDown={() => paintCell(cell.x, cell.z)}
                  onMouseEnter={(e) => { if (e.buttons === 1) paintCell(cell.x, cell.z); }}
                />
              ))}
            </div>

            <p className="text-[10px] text-slate-600">
              {isErasing ? '🧹 Erase mode — click to remove voxel' : '🖊 Paint mode — click/drag to place voxel'} · Layer Y={activeLayer}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-600 text-sm">Select or create a model to start editing</p>
          </div>
        )}
      </main>

      {/* ── Right sidebar: palette + 3D preview ─────────────────────── */}
      <aside className="w-64 bg-[#14171D] border-l border-slate-800 flex flex-col shrink-0">
        {/* Palette */}
        <div className="p-4 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">Colour Palette</div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {PALETTE.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => { setSelectedColor(c); setIsErasing(false); }}
                className="w-8 h-8 rounded transition-all"
                style={{
                  backgroundColor: c,
                  outline: selectedColor === c && !isErasing ? '2px solid #34d399' : '2px solid transparent',
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>

          {/* Erase toggle */}
          <button
            onClick={() => setIsErasing((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 py-1.5 rounded text-[11px] font-semibold transition-colors border ${
              isErasing
                ? 'bg-red-900/30 border-red-700 text-red-400'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eraser size={13} />
            {isErasing ? 'ERASER ACTIVE' : 'ERASER'}
          </button>
        </div>

        {/* 3D live preview */}
        <div className="flex-1 flex flex-col p-3 gap-2 min-h-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">3D Preview</div>
          <div className="flex-1 rounded border border-slate-800 overflow-hidden min-h-0">
            <canvas
              ref={previewRef}
              className="w-full h-full"
              style={{ display: 'block' }}
            />
          </div>
          <p className="text-[9px] text-slate-700 text-center">Updates live as you paint</p>
        </div>
      </aside>
    </div>
  );
}
