
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calculator as CalcIcon, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Target, 
  UserPlus,
  Edit2,
  Minus,
  Share2,
  Check,
  X as CloseIcon
} from 'lucide-react';
import { Handedness, DriftDirection, Bowler, CalculationResult } from './types';

const NumericPad = ({ value, onChange, label, colorClass }: { value: number, onChange: (v: number) => void, label: string, colorClass: string }) => (
  <div className="bg-slate-800/80 p-2 md:p-3 rounded-xl border border-slate-700/50 flex-1 flex flex-col items-center shadow-sm">
    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center leading-tight">{label}</label>
    <div className="flex items-center justify-center gap-2 md:gap-4">
      <button 
        onClick={() => onChange(Math.max(1, value - 1))}
        className="p-1.5 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-200"
      >
        <Minus size={14} />
      </button>
      <div className={`text-xl md:text-3xl font-black ${colorClass} tabular-nums w-8 md:w-12 text-center`}>
        {value}
      </div>
      <button 
        onClick={() => onChange(Math.min(39, value + 1))}
        className="p-1.5 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-200"
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teams' | 'calculator'>('calculator');
  const [bowlers, setBowlers] = useState<Bowler[]>([]);
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');
  
  const [targetBoard, setTargetBoard] = useState<number>(20);
  const [breakpointBoard, setBreakpointBoard] = useState<number>(10);
  
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [editingBowlerId, setEditingBowlerId] = useState<string | null>(null);
  const [sharedBowlerData, setSharedBowlerData] = useState<Bowler | null>(null);

  const [bowlerForm, setBowlerForm] = useState<Partial<Bowler>>({
    name: '',
    handedness: Handedness.RIGHT,
    drift: 0,
    driftDirection: DriftDirection.NONE,
    layDownDistance: 6
  });

  const serializeBowler = (bowler: Bowler) => {
    const data = JSON.stringify(bowler);
    return btoa(encodeURIComponent(data));
  };

  const deserializeBowler = (hash: string): Bowler | null => {
    try {
      return JSON.parse(decodeURIComponent(atob(hash)));
    } catch (e) {
      console.error("Failed to parse shared bowler", e);
      return null;
    }
  };

  const handleShare = async (bowler: Bowler) => {
    const hash = serializeBowler(bowler);
    const url = `${window.location.origin}${window.location.pathname}?share=${hash}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `StrikePath: ${bowler.name}`,
          text: `Check out ${bowler.name}'s bowling profile and current alignment!`,
          url: url
        });
      } catch (e) {
        console.log("Sharing cancelled");
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard!");
    }
  };

  useEffect(() => {
    const savedBowlers = localStorage.getItem('strikePath_bowlers');
    let loadedBowlers: Bowler[] = [];
    if (savedBowlers) {
      loadedBowlers = JSON.parse(savedBowlers);
      setBowlers(loadedBowlers);
      const lastId = localStorage.getItem('strikePath_lastSelected');
      if (lastId && loadedBowlers.some((b: any) => b.id === lastId)) {
        setSelectedBowlerId(lastId);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const shareHash = params.get('share');
    if (shareHash) {
      const shared = deserializeBowler(shareHash);
      if (shared) {
        setSharedBowlerData(shared);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const confirmImport = () => {
    if (sharedBowlerData) {
      const newBowler = { ...sharedBowlerData, id: crypto.randomUUID() };
      setBowlers(prev => [...prev, newBowler]);
      setSelectedBowlerId(newBowler.id);
      setActiveTab('calculator');
      setSharedBowlerData(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('strikePath_bowlers', JSON.stringify(bowlers));
  }, [bowlers]);

  useEffect(() => {
    if (selectedBowlerId) {
      localStorage.setItem('strikePath_lastSelected', selectedBowlerId);
    }
  }, [selectedBowlerId]);

  useEffect(() => {
    const bowler = bowlers.find(b => b.id === selectedBowlerId);
    if (bowler) {
      setTargetBoard(bowler.lastTarget ?? 20);
      setBreakpointBoard(bowler.lastBreakpoint ?? 10);
    }
  }, [selectedBowlerId]);

  const handleTargetChange = (val: number) => {
    setTargetBoard(val);
    if (selectedBowlerId) {
      setBowlers(prev => prev.map(b => 
        b.id === selectedBowlerId ? { ...b, lastTarget: val } : b
      ));
    }
  };

  const handleBreakpointChange = (val: number) => {
    setBreakpointBoard(val);
    if (selectedBowlerId) {
      setBowlers(prev => prev.map(b => 
        b.id === selectedBowlerId ? { ...b, lastBreakpoint: val } : b
      ));
    }
  };

  const selectedBowler = useMemo(() => 
    bowlers.find(b => b.id === selectedBowlerId), 
  [bowlers, selectedBowlerId]);

  const calculation = useMemo((): CalculationResult | null => {
    if (!selectedBowler) return null;

    const x = targetBoard - breakpointBoard;
    const y = Math.ceil(x / 2);
    const ballLayDownBoard = y + targetBoard + 1;
    const slideFootBoard = ballLayDownBoard + selectedBowler.layDownDistance;
    
    let stanceFootBoard = slideFootBoard;

    if (selectedBowler.handedness === Handedness.RIGHT) {
      if (selectedBowler.driftDirection === DriftDirection.LEFT) {
        stanceFootBoard = slideFootBoard - selectedBowler.drift;
      } else if (selectedBowler.driftDirection === DriftDirection.RIGHT) {
        stanceFootBoard = slideFootBoard + selectedBowler.drift;
      }
    } else {
      if (selectedBowler.driftDirection === DriftDirection.RIGHT) {
        stanceFootBoard = slideFootBoard - selectedBowler.drift;
      } else if (selectedBowler.driftDirection === DriftDirection.LEFT) {
        stanceFootBoard = slideFootBoard + selectedBowler.drift;
      }
    }

    return { x, y, ballLayDownBoard, slideFootBoard, stanceFootBoard };
  }, [selectedBowler, targetBoard, breakpointBoard]);

  const handleOpenAdd = () => {
    setEditingBowlerId(null);
    setBowlerForm({
      name: '',
      handedness: Handedness.RIGHT,
      drift: 0,
      driftDirection: DriftDirection.NONE,
      layDownDistance: 6
    });
    setShowBowlerModal(true);
  };

  const handleOpenEdit = (bowler: Bowler) => {
    setEditingBowlerId(bowler.id);
    setBowlerForm(bowler);
    setShowBowlerModal(true);
  };

  const saveBowler = () => {
    if (!bowlerForm.name) return;
    if (editingBowlerId) {
      setBowlers(bowlers.map(b => b.id === editingBowlerId ? { ...bowlerForm, id: editingBowlerId } as Bowler : b));
    } else {
      const bowler: Bowler = { 
        ...bowlerForm as Bowler, 
        id: crypto.randomUUID(),
        lastTarget: 20,
        lastBreakpoint: 10
      };
      setBowlers([...bowlers, bowler]);
      if (!selectedBowlerId) setSelectedBowlerId(bowler.id);
    }
    setShowBowlerModal(false);
  };

  const deleteBowler = (id: string) => {
    setBowlers(bowlers.filter(b => b.id !== id));
    if (selectedBowlerId === id) setSelectedBowlerId('');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <nav className="order-last md:order-first w-full md:w-20 lg:w-64 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center py-2 md:py-8 px-4">
        <div className="hidden md:flex mb-12 items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/40">
            <Target className="text-white" size={24} />
          </div>
          <span className="hidden lg:block font-black text-xl tracking-tight">STRIKEPATH</span>
        </div>
        
        <div className="flex flex-row md:flex-col gap-4 w-full justify-around md:justify-start">
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-3 p-2.5 md:p-4 rounded-2xl transition-all ${activeTab === 'calculator' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <CalcIcon size={24} />
            <span className="hidden lg:block font-bold">Calculator</span>
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-3 p-2.5 md:p-4 rounded-2xl transition-all ${activeTab === 'teams' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Users size={24} />
            <span className="hidden lg:block font-bold">Rosters</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 bg-gradient-to-br from-slate-950 to-slate-900">
        {activeTab === 'calculator' ? (
          <div className="flex-1 flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto w-full overflow-hidden items-stretch py-2 md:py-4">
            {/* Input Header Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none mb-1">Lane Math</h1>
                  <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">Target Alignment Tool</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedBowlerId}
                    onChange={(e) => setSelectedBowlerId(e.target.value)}
                    className="bg-slate-800/80 text-xs md:text-sm font-bold border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-32 md:w-52 appearance-none cursor-pointer"
                  >
                    <option value="">-- Bowler --</option>
                    {bowlers.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button onClick={handleOpenAdd} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-lg shadow-blue-900/40"><UserPlus size={16} /></button>
                </div>
              </div>

              <div className="flex gap-3">
                <NumericPad label="Arrow Target" value={targetBoard} onChange={handleTargetChange} colorClass="text-blue-400" />
                <NumericPad label="Breakpoint" value={breakpointBoard} onChange={handleBreakpointChange} colorClass="text-emerald-400" />
              </div>
            </div>

            {/* Main Result Section */}
            {calculation ? (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-600 p-6 md:p-10 rounded-[2rem] shadow-2xl shadow-blue-900/30 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target size={120} />
                  </div>
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={() => handleShare(selectedBowler!)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all text-white shadow-xl"
                      title="Share Alignment"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                  <p className="text-[9px] md:text-xs text-blue-100 uppercase font-black tracking-[0.1em] text-center leading-tight mb-2 px-6">Non-Dominant Stance Foot Position</p>
                  <p className="text-7xl md:text-[9rem] font-black text-white leading-none tabular-nums drop-shadow-2xl">{calculation.stanceFootBoard}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/60 flex flex-col items-center justify-center">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-2">Slide Board</p>
                    <p className="text-3xl font-black text-slate-100 leading-none">{calculation.slideFootBoard}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/60 flex flex-col items-center justify-center">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-2">Ball Laydown</p>
                    <p className="text-3xl font-black text-slate-100 leading-none">{calculation.ballLayDownBoard}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800/50 p-8 my-4">
                <div className="text-center">
                  <CalcIcon className="mx-auto text-slate-700 mb-4" size={40} />
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Select a bowler to calculate stance</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
            <header className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none mb-1">Rosters</h1>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">Bowler Constants</p>
              </div>
              <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-black transition-all shadow-lg shadow-blue-900/40">
                <Plus size={18} /> Add Bowler
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-8 scrollbar-hide">
              {bowlers.map(bowler => (
                <div key={bowler.id} className="bg-slate-900/60 rounded-2xl border border-slate-800/60 p-4 flex items-center gap-4 hover:border-slate-700 transition-all">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center font-black text-lg md:text-xl text-blue-500 shrink-0">
                    {bowler.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm md:text-base truncate">{bowler.name}</h3>
                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest flex-wrap">
                      <span>{bowler.handedness}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span>Drift: {bowler.drift} {bowler.driftDirection}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span>Lay down: {bowler.layDownDistance}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleShare(bowler)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"><Share2 size={16} /></button>
                    <button onClick={() => handleOpenEdit(bowler)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => deleteBowler(bowler.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-all"><Trash2 size={16} /></button>
                    <button 
                      onClick={() => { setSelectedBowlerId(bowler.id); setActiveTab('calculator'); }}
                      className="ml-1 md:ml-2 p-2 bg-slate-800 hover:bg-blue-600 rounded-lg transition-all text-slate-400 hover:text-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {bowlers.length === 0 && (
                <div className="py-16 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800/50">
                  <Users className="mx-auto text-slate-800 mb-4" size={40} />
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Roster is empty</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Share Import Modal */}
      {sharedBowlerData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/30">
               <UserPlus size={32} />
             </div>
             <h2 className="text-xl font-black text-center mb-2">Import Profile?</h2>
             <p className="text-slate-400 text-xs text-center mb-8">
               Add <span className="text-white font-bold">{sharedBowlerData.name}</span> to your roster with their current alignment settings?
             </p>
             
             <div className="bg-slate-800/50 rounded-2xl p-4 mb-8 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Target</span>
                  <span className="text-blue-400">{sharedBowlerData.lastTarget || 20}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Breakpoint</span>
                  <span className="text-emerald-400">{sharedBowlerData.lastBreakpoint || 10}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Hand</span>
                  <span className="text-slate-300">{sharedBowlerData.handedness}</span>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmImport}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30"
                >
                  <Check size={16} /> Import Now
                </button>
                <button 
                  onClick={() => setSharedBowlerData(null)}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-black uppercase tracking-widest text-xs text-slate-400 flex items-center justify-center gap-2 transition-all"
                >
                  <CloseIcon size={16} /> Decline
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Bowler Editor Modal */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-xl font-black mb-6 tracking-tight">{editingBowlerId ? 'Edit Profile' : 'New Bowler'}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input 
                  type="text" placeholder="e.g. Chris Barnes" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  value={bowlerForm.name} onChange={e => setBowlerForm({...bowlerForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Handedness</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer"
                    value={bowlerForm.handedness} onChange={e => setBowlerForm({...bowlerForm, handedness: e.target.value as Handedness})}
                  >
                    <option value={Handedness.RIGHT}>Right-Handed</option>
                    <option value={Handedness.LEFT}>Left-Handed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Drift Direction</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer"
                    value={bowlerForm.driftDirection} onChange={e => setBowlerForm({...bowlerForm, driftDirection: e.target.value as DriftDirection})}
                  >
                    <option value={DriftDirection.NONE}>Stable</option>
                    <option value={DriftDirection.LEFT}>Left</option>
                    <option value={DriftDirection.RIGHT}>Right</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Drift Amount</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" value={bowlerForm.drift} onChange={e => setBowlerForm({...bowlerForm, drift: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black mb-1.5 block tracking-widest">Lay down distance</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" value={bowlerForm.layDownDistance} onChange={e => setBowlerForm({...bowlerForm, layDownDistance: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowBowlerModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-slate-700 rounded-xl hover:bg-slate-800 transition-all">Cancel</button>
                <button onClick={saveBowler} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-blue-600 rounded-xl shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
