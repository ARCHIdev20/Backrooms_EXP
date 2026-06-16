import { Menu, Play, Layers, Paintbrush, TerminalSquare, Box } from 'lucide-react';
import { useStore } from './store';
import { clsx } from 'clsx';
import { MapEditor } from './components/MapEditor';
import { TextureEditor } from './components/TextureEditor';
import { ScriptEditor } from './components/ScriptEditor';
import { GameCanvas } from './components/GameCanvas';
import { ModelEditor } from './components/ModelEditor';

export default function App() {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);
  const setIsPlaying = useStore((state) => state.setIsPlaying);

  const activeFilter = useStore((state) => state.activeFilter);
  const setActiveFilter = useStore((state) => state.setActiveFilter);

  return (
    <div className="flex flex-col h-screen w-full bg-[#090A0C] text-slate-300 font-sans overflow-hidden select-none">
      {/* 
        The GameCanvas is conditionally rendered over everything to capture 
        pointerlock and full screen when playing
      */}
      <GameCanvas />

      {/* Header Navigation */}
      <header className="h-12 bg-[#14171D] border-b border-slate-800 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45 rounded-sm"></div>
            </div>
            <span className="font-bold tracking-tight text-white mb-0">CLOVER <span className="text-emerald-400">ENGINE</span></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera Filter Selector */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Lens:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="bg-[#090A0C] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="none">Clean / None</option>
              <option value="vhs">Found Footage (VHS)</option>
              <option value="night-vision">Night Vision</option>
            </select>
          </div>

          {/* Play Button */}
          <button
            onClick={() => {
              setIsPlaying(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-lg shadow-emerald-900/20 transition-all uppercase"
          >
            <Play fill="currentColor" size={14} />
            Play Game
          </button>
          
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 hidden sm:flex">
            <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Tools & Navigation */}
        <aside className="w-16 bg-[#14171D] border-r border-slate-800 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
          <NavButton 
            icon={<Layers size={22} />} 
            label="Map" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            colorClass="text-emerald-400"
          />
          <NavButton 
            icon={<Paintbrush size={22} />} 
            label="Texture" 
            active={activeTab === 'textures'} 
            onClick={() => setActiveTab('textures')} 
            colorClass="text-emerald-400"
          />
          <NavButton 
            icon={<TerminalSquare size={22} />} 
            label="Script" 
            active={activeTab === 'scripts'} 
            onClick={() => setActiveTab('scripts')} 
            colorClass="text-emerald-400"
          />
          <NavButton 
            icon={<Box size={22} />} 
            label="Models" 
            active={activeTab === 'models'} 
            onClick={() => setActiveTab('models')} 
            colorClass="text-emerald-400"
          />
        </aside>

        {/* Active Workspace */}
        <main className="flex-1 relative flex bg-black overflow-hidden">
           {activeTab === 'map' && <MapEditor />}
           {activeTab === 'textures' && <TextureEditor />}
           {activeTab === 'scripts' && <ScriptEditor />}
           {activeTab === 'models' && <ModelEditor />}
        </main>
      </div>
      
      {/* Footer Status Bar */}
      <footer className="h-6 bg-[#1A1D23] border-t border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ENGINE CONNECTED</span>
          <span>MAP: <span className="text-slate-300">Default Sandbox</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">STATUS: INITIALIZED</span>
        </div>
      </footer>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, colorClass }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative group p-2 rounded transition-all duration-200",
        active 
          ? `bg-[#090A0C] border border-slate-700 ${colorClass}` 
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-transparent"
      )}
      title={label}
    >
      {icon}
    </button>
  );
}
