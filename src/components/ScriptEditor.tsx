import { useState } from 'react';
import { useStore } from '../store';
import { Terminal, Plus, Save } from 'lucide-react';
import { ScriptData } from '../types';

export function ScriptEditor() {
  const scripts = useStore((state) => state.scripts);
  const addScript = useStore((state) => state.addScript);
  const updateScript = useStore((state) => state.updateScript);
  
  const [activeScriptId, setActiveScriptId] = useState<string>(scripts[0]?.id);
  
  const activeScript = scripts.find(s => s.id === activeScriptId);

  const [localCode, setLocalCode] = useState(activeScript?.code || '');
  const [localName, setLocalName] = useState(activeScript?.name || '');

  // Synchronize local states when switching files
  const handleSwitchFile = (id: string) => {
    const s = scripts.find(s => s.id === id);
    if (s) {
      setActiveScriptId(id);
      setLocalCode(s.code);
      setLocalName(s.name);
    }
  };

  const saveScript = () => {
    updateScript(activeScriptId, { name: localName, code: localCode });
  };

  const createNewScript = () => {
    const id = `script-${Date.now()}`;
    const newScript: ScriptData = {
      id,
      name: `New Script ${scripts.length + 1}`,
      code: `// CloverScript
// Accessible scope: entity, player, engine, deltaTime

`
    };
    addScript(newScript);
    handleSwitchFile(id);
  };

  return (
    <div className="flex h-full w-full text-slate-300">
      {/* File Explorer */}
      <aside className="w-60 flex flex-col bg-[#14171D] border-r border-slate-800">
        <div className="p-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold flex items-center justify-between">
            <span>CloverScripts</span>
            <button 
              onClick={createNewScript}
              className="p-1 hover:bg-slate-800 rounded text-emerald-400 transition-colors"
              title="New Script"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-1 overflow-y-auto">
            {scripts.map(script => (
              <button
                key={script.id}
                onClick={() => handleSwitchFile(script.id)}
                className={`flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                  activeScriptId === script.id 
                    ? 'bg-slate-800/50 text-emerald-300' 
                    : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <Terminal size={12} className={activeScriptId === script.id ? 'text-emerald-400' : 'text-slate-500'} />
                <span className="truncate">{script.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col bg-[#0E1116] border-t border-slate-800">
        {/* Editor Header */}
        <div className="h-8 bg-[#14171D] border-b border-slate-800 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <input 
               value={localName}
               onChange={(e) => setLocalName(e.target.value)}
               className="bg-transparent text-[11px] font-mono font-bold text-slate-200 focus:outline-none w-64 px-1 rounded hover:bg-white/5"
            />
          </div>
          <button 
            onClick={saveScript}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded transition-all uppercase border border-slate-700"
          >
            <Save size={12} />
            Compile
          </button>
        </div>

        {/* Code Area */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Line numbers fake */}
          <div className="w-10 bg-[#0E1116] border-r border-slate-800 flex flex-col items-end py-4 pr-3 text-slate-600 font-mono text-xs select-none">
            {localCode.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          
          <textarea
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent text-slate-300 font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed"
            style={{ 
              tabSize: 2 
            }}
          />
        </div>
      </div>
    </div>
  );
}
