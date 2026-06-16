import { useState, ReactNode } from 'react';
import { useStore } from '../store';
import { CellType } from '../types';
import { Hexagon, User, Bot, Square } from 'lucide-react';
import { clsx } from 'clsx';

export function MapEditor() {
  const map = useStore((state) => state.map);
  const setMapCell = useStore((state) => state.setMapCell);
  const textures = useStore((state) => state.textures);
  const scripts = useStore((state) => state.scripts);
  
  const [activeBrush, setActiveBrush] = useState<CellType>('wall');
  const [activeHeight, setActiveHeight] = useState<number>(2);
  const [activeTexture, setActiveTexture] = useState<string>('default-wall');
  const [activeScript, setActiveScript] = useState<string>('basic-enemy');
  const [isDrawing, setIsDrawing] = useState(false);

  const handleCellInteraction = (x: number, y: number) => {
    setMapCell(x, y, {
      type: activeBrush,
      height: activeBrush === 'wall' ? activeHeight : 0,
      textureId: activeBrush === 'wall' ? activeTexture : undefined,
      scriptId: activeBrush === 'enemy' ? activeScript : undefined,
    });
  };

  const getCellClassName = (type: CellType) => {
    switch (type) {
      case 'wall': return 'bg-slate-700 border-slate-600 hover:bg-slate-600';
      case 'player': return 'bg-emerald-500 border-emerald-400 hover:bg-emerald-400';
      case 'enemy': return 'bg-red-500 border-red-400 hover:bg-red-400';
      default: return 'bg-[#14171D] border-slate-800 hover:bg-slate-800';
    }
  };

  return (
    <div className="flex h-full w-full gap-0 text-slate-300">
      {/* Tool panel */}
      <aside className="w-64 flex flex-col bg-[#14171D] border-r border-slate-800">
        <div className="p-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">Brush Type</div>
          <div className="flex flex-col gap-1.5">
            <BrushButton active={activeBrush === 'empty'} onClick={() => setActiveBrush('empty')} icon={<Square size={14}/>} label="Floor (Eraser)" />
            <BrushButton active={activeBrush === 'wall'} onClick={() => setActiveBrush('wall')} icon={<Hexagon size={14}/>} label="Wall Block" />
            <BrushButton active={activeBrush === 'player'} onClick={() => setActiveBrush('player')} icon={<User size={14}/>} label="Player Spawn" />
            <BrushButton active={activeBrush === 'enemy'} onClick={() => setActiveBrush('enemy')} icon={<Bot size={14}/>} label="Enemy NPC" />
          </div>
        </div>

        {activeBrush === 'wall' && (
          <div className="p-4 animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">Wall Properties</div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Height Level</span>
                  <span className="text-emerald-400 font-mono">{activeHeight}</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="range" min="1" max="10" step="1" 
                    value={activeHeight} 
                    onChange={(e) => setActiveHeight(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400">Texture</label>
                <select 
                  value={activeTexture}
                  onChange={(e) => setActiveTexture(e.target.value)}
                  className="w-full bg-[#090A0C] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {textures.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeBrush === 'enemy' && (
          <div className="p-4 animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">AI Script</div>
            <select 
              value={activeScript}
              onChange={(e) => setActiveScript(e.target.value)}
              className="w-full bg-[#090A0C] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            >
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </aside>

      {/* Grid Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-[#090A0C]">
        <div className="absolute top-4 left-4 text-[10px] text-slate-500 font-mono">
          [ EDITOR MODE: MAP ]
        </div>
        
        <div 
          className="grid gap-0 border-2 border-slate-800 shadow-2xl bg-black"
          style={{ gridTemplateColumns: `repeat(${map[0].length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setIsDrawing(false)}
          onMouseUp={() => setIsDrawing(false)}
        >
          {map.map((row, y) => 
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                onMouseDown={() => {
                  setIsDrawing(true);
                  handleCellInteraction(x, y);
                }}
                onMouseEnter={() => {
                  if (isDrawing) handleCellInteraction(x, y);
                }}
                className={clsx(
                  "w-6 h-6 border-[0.5px] cursor-crosshair transition-colors duration-75",
                  getCellClassName(cell.type)
                )}
                title={`${x},${y} | ${cell.type}${cell.type === 'wall' ? ` (H:${cell.height})` : ''}`}
              >
                {/* Visual indicator for height */}
                {cell.type === 'wall' && (
                   <div className="w-full h-full flex items-center justify-center text-[8px] font-bold opacity-30 select-none">
                     {cell.height}
                   </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Sidebar: Inspector */}
      <aside className="w-64 bg-[#14171D] border-l border-slate-800">
        <div className="p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-bold">Properties Inspector</div>
          
          <div className="mb-6 space-y-4">

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400">Floor Texture</label>
              <select 
                value={useStore(state => state.globalFloorTexture) || ''}
                onChange={(e) => useStore.getState().setGlobalFloorTexture(e.target.value)}
                className="w-full bg-[#090A0C] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none">
                <option value="">None / Color</option>
                {useStore(state => state.textures).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400">Ceiling Texture</label>
              <select 
                value={useStore(state => state.globalCeilTexture) || ''}
                onChange={(e) => useStore.getState().setGlobalCeilTexture(e.target.value)}
                className="w-full bg-[#090A0C] border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none">
                <option value="">None / Color</option>
                {useStore(state => state.textures).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function BrushButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 w-full p-2 rounded text-xs transition-colors text-left font-medium",
        active 
          ? "bg-slate-800/50 text-emerald-300" 
          : "hover:bg-slate-800 text-slate-400"
      )}
    >
      <div className={clsx(active ? "text-emerald-300" : "text-slate-500")}>
        {icon}
      </div>
      {label}
    </button>
  );
}
