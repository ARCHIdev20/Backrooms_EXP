import { useEffect, useRef } from 'react';
import { CloverEngine } from '../engine/CloverEngine';
import { useStore } from '../store';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const isPlaying = useStore((state) => state.isPlaying);
  const map = useStore((state) => state.map);
  const textures = useStore((state) => state.textures);
  const models = useStore((state) => state.models);
  const scripts = useStore((state) => state.scripts);
  const activeFilter = useStore((state) => state.activeFilter);

  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    // Initialize Engine
    const engine = new CloverEngine({
      canvas: canvasRef.current,
      map,
      textures,
      models,
      scripts,
      globalFloorTexture: useStore.getState().globalFloorTexture,
      globalCeilTexture: useStore.getState().globalCeilTexture,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setIsPlaying(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      engine.cleanup();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, map, textures, models, scripts, setIsPlaying]);

  if (!isPlaying) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-4 left-4 z-10 text-white select-none pointer-events-none drop-shadow-md">
        <h2 className="text-xl font-bold font-mono">CLOVER ENGINE - PLAY MODE</h2>
        <p className="text-sm opacity-80">🖱️ Click to lock mouse | ⌨️ WASD to Move | ⇧ Shift to Sprint | ␣ Space to Jump | ⎋ ESC to Return</p>
      </div>
      
      {/* Target Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
      </div>

      {/* Post-Processing Overlays via CSS */}
      {activeFilter !== 'none' && (
        <div className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay opacity-40" 
             style={{
               backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)',
               backgroundSize: '100% 4px'
             }} 
        />
      )}
      
      {activeFilter === 'vhs' && (
        <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]">
           <div className="absolute top-8 left-8 text-2xl font-mono text-white tracking-widest drop-shadow-md">
             PLAY 
             <span className="ml-4 text-white text-3xl leading-none align-middle animate-pulse">►</span>
           </div>
           <div className="absolute bottom-8 left-8 text-xl font-mono text-white tracking-widest drop-shadow-md">
             SP 0:02:14
           </div>
           <div className="absolute bottom-8 right-8 text-xl font-mono text-white tracking-widest drop-shadow-md">
             12:00 AM
           </div>
           {/* Color noise simulation */}
           <div className="absolute inset-0 opacity-10 mix-blend-color-burn" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'
           }} />
        </div>
      )}

      {activeFilter === 'night-vision' && (
        <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_150px_rgba(0,20,0,0.9)]">
           <div className="absolute top-8 right-8 text-xl font-mono text-emerald-400 font-bold tracking-widest flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" /> REC
           </div>
           <div className="absolute inset-0 opacity-15 mix-blend-screen" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'
           }} />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-full block cursor-crosshair transition-all duration-700 ${
          activeFilter === 'vhs' ? 'contrast-125 saturate-50 sepia-[.40] hue-rotate-[-10deg] brightness-90' : 
          activeFilter === 'night-vision' ? 'sepia hue-rotate-[75deg] saturate-[3.5] contrast-150 brightness-[1.15]' : ''
        }`}
      />
    </div>
  );
}
