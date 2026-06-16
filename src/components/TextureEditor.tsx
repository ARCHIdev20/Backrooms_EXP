import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Paintbrush, Plus, Save } from 'lucide-react';
import { TextureData } from '../types';

const COLORS = [
  '#000000', '#ffffff', '#888888', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#00ffff', '#ff00ff', '#8b4513', '#d2691e', '#228b22',
  '#dc143c', '#4682b4', '#4b0082', '#00000000' // transparent
];

const RESOLUTION = 16; // 16x16 pixel art

export function TextureEditor() {
  const textures = useStore((state) => state.textures);
  const addTexture = useStore((state) => state.addTexture);
  const updateTexture = useStore((state) => state.updateTexture);
  
  const [activeTextureId, setActiveTextureId] = useState<string>(textures[0]?.id);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Create a 2D array for the grid state
  const [grid, setGrid] = useState<string[][]>(
    Array(RESOLUTION).fill(Array(RESOLUTION).fill('#00000000'))
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load selected texture into grid
  useEffect(() => {
    const activeData = textures.find(t => t.id === activeTextureId);
    if (!activeData || !canvasRef.current) return;

    const img = new Image();
    img.src = activeData.dataUrl;
    img.onload = () => {
      const cvs = canvasRef.current!;
      const ctx = cvs.getContext('2d')!;
      ctx.clearRect(0, 0, RESOLUTION, RESOLUTION);
      ctx.drawImage(img, 0, 0, RESOLUTION, RESOLUTION);
      
      const imgData = ctx.getImageData(0, 0, RESOLUTION, RESOLUTION).data;
      const newGrid = Array(RESOLUTION).fill(null).map(() => Array(RESOLUTION).fill(''));
      
      for(let y=0; y<RESOLUTION; y++) {
        for(let x=0; x<RESOLUTION; x++) {
          const idx = (y * RESOLUTION + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx+1];
          const b = imgData[idx+2];
          const a = imgData[idx+3];
          if (a === 0) {
            newGrid[y][x] = '#00000000';
          } else {
            // Convert to hex
            newGrid[y][x] = `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
          }
        }
      }
      setGrid(newGrid);
    };
  }, [activeTextureId, textures]);

  const saveTexture = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0,0,RESOLUTION,RESOLUTION);
    
    // Draw cells to offscreen canvas
    for(let y=0; y<RESOLUTION; y++) {
      for(let x=0; x<RESOLUTION; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    updateTexture(activeTextureId, { dataUrl });
  };

  const createNewTexture = () => {
    const id = `tex-${Date.now()}`;
    const newTex: TextureData = {
      id,
      name: `Texture ${textures.length + 1}`,
      // Create empty 16x16
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABxJREFUOE9j/P///38GIwDjqIEjgHjoQGkHAAEAAGXmD4FjA81eAAAAAElFTkSuQmCC',
    };
    addTexture(newTex);
    setActiveTextureId(id);
  };

  const handlePaint = (x: number, y: number) => {
    const newGrid = [...grid];
    newGrid[y] = [...newGrid[y]];
    newGrid[y][x] = color;
    setGrid(newGrid);
  };

  return (
    <div className="flex h-full w-full text-slate-300">
      {/* Offscreen canvas to bake images */}
      <canvas ref={canvasRef} width={RESOLUTION} height={RESOLUTION} className="hidden" />

      {/* Asset Explorer side */}
      <aside className="w-64 flex flex-col bg-[#14171D] border-r border-slate-800">
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Texture Browser</div>
            <button 
              onClick={createNewTexture}
              className="p-1 hover:bg-slate-800 rounded text-emerald-400 transition-colors"
              title="New Texture"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[80vh] pr-1">
            {textures.map(tex => (
              <button
                key={tex.id}
                onClick={() => setActiveTextureId(tex.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded border aspect-square ${
                  activeTextureId === tex.id 
                    ? 'border-emerald-500/50 bg-slate-800 text-emerald-300' 
                    : 'border-slate-700 bg-[#090A0C] hover:border-slate-500 text-slate-400'
                }`}
              >
                <div className="w-full h-full flex items-center justify-center">
                   <img src={tex.dataUrl} alt={tex.name} className="w-full h-full object-contain rendering-pixelated" />
                </div>
                <span className="text-[9px] truncate w-full text-center mt-auto">{tex.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Painter */}
      <div className="flex-1 flex flex-col items-center bg-[#090A0C] p-8">
        
        <div className="flex items-center justify-between w-full max-w-lg mb-8 bg-[#14171D] border border-slate-800 p-4 rounded text-sm">
          <h2 className="font-bold text-slate-200 flex items-center gap-2">
            <Paintbrush size={16} className="text-emerald-400" /> 
            Pixel Painter <span className="text-slate-500 font-normal">({RESOLUTION}x{RESOLUTION})</span>
          </h2>
          <button 
            onClick={saveTexture}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-lg shadow-emerald-900/20 transition-all uppercase"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>

        <div className="flex gap-12 items-start justify-center">
          {/* Palette */}
          <div className="grid grid-cols-2 gap-1.5 p-3 bg-[#14171D] rounded border border-slate-800 shadow-xl">
            <div className="col-span-2 flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Color Palette</span>
              <input 
                type="color" 
                value={color === '#00000000' ? '#ffffff' : color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-4 h-4 cursor-pointer p-0 border-0 bg-transparent rounded"
                title="Custom Color"
              />
            </div>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded border ${color === c ? 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] z-10' : 'border-slate-700 hover:border-slate-500'}`}
                style={{ backgroundColor: c === '#00000000' ? '#14171D' : c, backgroundImage: c === '#00000000' ? 'repeating-conic-gradient(#1e293b 0% 25%, transparent 0% 50%) 50% / 8px 8px' : 'none' }}
                title={c}
              />
            ))}
          </div>

          {/* Grid Canvas */}
          <div 
            className="grid shadow-2xl border border-slate-800 bg-[#14171D] cursor-crosshair touch-none"
            style={{ 
              gridTemplateColumns: `repeat(${RESOLUTION}, 24px)`,
              backgroundImage: 'repeating-conic-gradient(#0f172a 0% 25%, #1e293b 0% 50%)',
              backgroundSize: '48px 48px'
            }}
            onMouseLeave={() => setIsDrawing(false)}
            onMouseUp={() => setIsDrawing(false)}
          >
            {grid.map((row, y) => 
               row.map((cellCol, x) => (
                  <div
                    key={`${x}-${y}`}
                    onMouseDown={() => {
                      setIsDrawing(true);
                      handlePaint(x, y);
                    }}
                    onMouseEnter={() => {
                      if (isDrawing) handlePaint(x, y);
                    }}
                    className="w-6 h-6 border-[0.5px] border-black/30"
                    style={{ backgroundColor: cellCol }}
                  />
               ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
