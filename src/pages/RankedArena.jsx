import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trophy, User, Swords, Activity, Crown, Ghost, 
  Bomb, Star, Timer, ShieldAlert, Loader2, ChevronLeft,
  MessageSquare, BarChart3, Zap, Crosshair, Target, 
  ZapOff, ShieldCheck, TrendingUp, Info, AlertTriangle,
  RefreshCw, MousePointer2, Shield, Flame, Terminal
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * BINGO CONQUEST: SUPREME EDITION
 * Een 10x10 competitieve arena waar AI en speler vechten om territorium.
 * Geoptimaliseerd voor Full Screen [cite: 2026-01-26].
 */

const GRID_SIZE = 100; 
const BASE_POINTS = 10;
const CLUSTER_BONUS = 20;
const FORT_BONUS = 100;
const JACKPOT_MULTIPLIER = 5;

export default function RankedArena() {
  const navigate = useNavigate();

  // --- SYSTEM STATES ---
  const [view, setView] = useState('loading'); 
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // --- GAMEPLAY STATES ---
  const [grid, setGrid] = useState([]);
  const [claims, setClaims] = useState(new Array(GRID_SIZE).fill(null));
  const [forts, setForts] = useState([]); 
  const [shields, setShields] = useState(new Array(GRID_SIZE).fill(false));
  
  const [currentEvent, setCurrentEvent] = useState({ type: 'idle', value: null, id: 0 });
  const [scores, setScores] = useState({ player: 0, ai_blue: 0, ai_yellow: 0, ai_green: 0 });
  const [timeLeft, setTimeLeft] = useState(180);
  const [jackpotIdx, setJackpotIdx] = useState(null);
  
  const [isFrozen, setIsFrozen] = useState(false);
  const [logs, setLogs] = useState([]);

  // --- ENGINE REFS (VOOR AI PRECISIE) ---
  const gameActiveRef = useRef(false);
  const claimsRef = useRef(new Array(GRID_SIZE).fill(null));
  const gridRef = useRef([]);
  const scoresRef = useRef({ player: 0, ai_blue: 0, ai_yellow: 0, ai_green: 0 });

  // ===========================================================================
  // 1. INITIALISATIE
  // ===========================================================================
  useEffect(() => {
    const initArena = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return navigate('/login');
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        setUser({ ...authUser, ...profile });
        setView('lobby');
      } catch (err) {
        setError("Systeem kon niet laden.");
      }
    };
    initArena();
  }, [navigate]);

  // ===========================================================================
  // 2. AI LOGICA: DE REACTIE-ENGINE
  // ===========================================================================
  
  // Deze effect luistert naar elk nieuw getal en triggert de AI
  useEffect(() => {
    if (!gameActiveRef.current || currentEvent.type === 'idle') return;

    const rivals = [
      { id: 'ai_blue', name: 'Rival Cobalt', speed: 550 },  // EXTREEM SNEL
      { id: 'ai_yellow', name: 'Rival Midas', speed: 900 }, // GEMIDDELD
      { id: 'ai_green', name: 'Rival Jade', speed: 1300 }   // SLOW
    ];

    rivals.forEach(rival => {
      const reactionTime = rival.speed + Math.random() * 800;
      
      setTimeout(() => {
        if (!gameActiveRef.current) return;

        if (currentEvent.type === 'number') {
          // AI zoekt alle instanties van het nummer op het 10x10 bord [cite: 2026-01-29]
          const targets = gridRef.current.map((n, i) => n === currentEvent.value && !claimsRef.current[i] ? i : null).filter(n => n !== null);
          
          if (targets.length > 0) {
            // Tactische AI: prioriteit aan vakjes die grenzen aan eigen kleur [cite: 2026-01-29]
            const tacticalTarget = targets.find(t => checkAdjacency(t, rival.id)) ?? targets[0];
            processClaim(tacticalTarget, rival.id, rival.name);
          }
        } else if (currentEvent.type === 'bomb') {
          // AI pakt de bom om JOUW gebied te slopen [cite: 2026-01-29]
          const playerTiles = claimsRef.current.map((p, i) => p === 'player' ? i : null).filter(n => n !== null);
          if (playerTiles.length > 0) {
            const victim = playerTiles[Math.floor(Math.random() * playerTiles.length)];
            processBomb(rival.id, rival.name, victim);
          }
        }
      }, reactionTime);
    });
  }, [currentEvent]);

  // ===========================================================================
  // 3. CORE GAME FUNCTIONS
  // ===========================================================================

  const startGame = () => {
    const newGrid = Array.from({ length: GRID_SIZE }, () => Math.floor(Math.random() * 90) + 1);
    setGrid(newGrid);
    gridRef.current = newGrid;
    
    const initialClaims = new Array(GRID_SIZE).fill(null);
    setClaims(initialClaims);
    claimsRef.current = initialClaims;
    
    setForts([]);
    setShields(new Array(GRID_SIZE).fill(false));
    setScores({ player: 0, ai_blue: 0, ai_yellow: 0, ai_green: 0 });
    scoresRef.current = { player: 0, ai_blue: 0, ai_yellow: 0, ai_green: 0 };
    
    setJackpotIdx(Math.floor(Math.random() * GRID_SIZE));
    setLogs([{ msg: "ARENA INITIALISATIE VOLTOOID. VECHT!", type: 'sys' }]);
    
    setView('playing');
    gameActiveRef.current = true;
    
    // Start Caller & Timer
    initGameIntervals();
  };

  const initGameIntervals = () => {
    // Caller: Nieuw event elke 4 seconden
    const caller = setInterval(() => {
      if (!gameActiveRef.current) return clearInterval(caller);
      
      const rand = Math.random();
      if (rand > 0.92) {
        setCurrentEvent({ type: 'bomb', value: 'BOM!', id: Date.now() });
        addLog("BOM BALL! SLOOP EEN VAKJE!", "sys");
      } else if (rand > 0.87) {
        setCurrentEvent({ type: 'shield', value: '🛡️', id: Date.now() });
        addLog("SHIELD BALL! BESCHERM EEN VAKJE!", "sys");
      } else {
        const num = Math.floor(Math.random() * 90) + 1;
        setCurrentEvent({ type: 'number', value: num, id: Date.now() });
      }
    }, 4000);

    const timer = setInterval(() => {
      if (!gameActiveRef.current) return clearInterval(timer);
      setTimeLeft(prev => {
        if (prev <= 1) { finishMatch(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const processClaim = (idx, pid, pName) => {
    // Extra veiligheid: check of vakje nog vrij is en of nummer klopt
    if (claimsRef.current[idx] || (currentEvent.type === 'number' && gridRef.current[idx] !== currentEvent.value)) return;

    const isJackpot = idx === jackpotIdx;
    let pts = isJackpot ? (BASE_POINTS * JACKPOT_MULTIPLIER) : BASE_POINTS;

    // Cluster Bonus (+20) [cite: 2026-01-29]
    if (checkAdjacency(idx, pid)) pts += CLUSTER_BONUS;

    const nc = [...claimsRef.current];
    nc[idx] = pid;
    claimsRef.current = nc;
    setClaims(nc);

    // Fort Bonus (+100 voor 2x2) [cite: 2026-01-29]
    if (detectForts(idx, pid, nc)) pts += FORT_BONUS;

    const newScores = { ...scoresRef.current, [pid]: scoresRef.current[pid] + pts };
    scoresRef.current = newScores;
    setScores(newScores);

    if (pid === 'player') {
      addLog(`Vakje ${gridRef.current[idx]} veroverd! (+${pts})`, 'success');
      if (isJackpot) setJackpotIdx(Math.floor(Math.random() * GRID_SIZE));
    } else {
      addLog(`${pName} claimt ${gridRef.current[idx]}`, 'ai');
    }
  };

  const processBomb = (pid, pName, targetIdx) => {
    if (!claimsRef.current[targetIdx]) return;
    
    const nc = [...claimsRef.current];
    nc[targetIdx] = null; // Vakje weer neutraal [cite: 2026-01-29]
    claimsRef.current = nc;
    setClaims(nc);
    
    setCurrentEvent({ type: 'idle', value: null, id: Date.now() });
    addLog(`${pName} heeft een vakje opgeblazen!`, 'sys');
  };

  const processShield = (pid, pName) => {
    const myTiles = claimsRef.current.map((p, i) => p === pid && !shields[i] ? i : null).filter(n => n !== null);
    if (myTiles.length === 0) return;

    const target = myTiles[myTiles.length - 1];
    setShields(prev => {
      const ns = [...prev];
      ns[target] = true;
      return ns;
    });
    setCurrentEvent({ type: 'idle', value: null, id: Date.now() });
    addLog(`${pName} heeft een schild geactiveerd!`, 'sys');
  };

  // ===========================================================================
  // 4. HELPERS & UI ACTIONS
  // ===========================================================================

  const checkAdjacency = (idx, pid) => {
    const row = Math.floor(idx / 10);
    const neighbors = [idx-1, idx+1, idx-10, idx+10];
    return neighbors.some(n => {
      if (n < 0 || n >= GRID_SIZE) return false;
      if (Math.abs(idx - n) === 1 && Math.floor(n / 10) !== row) return false;
      return claimsRef.current[n] === pid;
    });
  };

  const detectForts = (idx, pid, currentClaims) => {
    const quadrants = [
      [idx, idx+1, idx+10, idx+11], [idx-1, idx, idx+9, idx+10],
      [idx-10, idx-9, idx, idx+1], [idx-11, idx-10, idx-1, idx]
    ];
    let found = false;
    for (const q of quadrants) {
      if (q.every(i => i >= 0 && i < GRID_SIZE)) {
        const rows = q.map(i => Math.floor(i / 10));
        const cols = q.map(i => i % 10);
        if (Math.max(...rows) - Math.min(...rows) === 1 && Math.max(...cols) - Math.min(...cols) === 1) {
          if (q.every(i => currentClaims[i] === pid)) {
            const id = q.sort((a,b) => a-b).join('-');
            if (!forts.includes(id)) {
              setForts(prev => [...prev, id]);
              found = true;
            }
          }
        }
      }
    }
    return found;
  };

  const handlePlayerClick = (idx) => {
    if (isFrozen || !gameActiveRef.current) return;

    if (currentEvent.type === 'number') {
      if (grid[idx] === currentEvent.value && !claims[idx]) {
        processClaim(idx, 'player', user?.username);
      } else {
        setIsFrozen(true);
        addLog("MISKLIK! Cooldown geactiveerd.", "err");
        setTimeout(() => setIsFrozen(false), 2000);
      }
    } else if (currentEvent.type === 'bomb') {
      const aiTiles = claimsRef.current.map((p, i) => p && p !== 'player' ? i : null).filter(n => n !== null);
      if (aiTiles.length > 0) processBomb('player', user?.username, aiTiles[Math.floor(Math.random() * aiTiles.length)]);
    } else if (currentEvent.type === 'shield') {
      processShield('player', user?.username);
    }
  };

  const addLog = (msg, type) => {
    setLogs(prev => [{ msg, type, id: Math.random() }, ...prev].slice(0, 12));
  };

  const finishMatch = () => {
    gameActiveRef.current = false;
    setView('results');
    if (scores.player > scores.ai_blue) confetti();
  };

  // ===========================================================================
  // 5. RENDERERS
  // ===========================================================================

  if (view === 'loading') return <div className="h-screen bg-black flex items-center justify-center text-red-500 font-black animate-pulse">SYSTEM_BOOT...</div>;

  if (view === 'lobby') {
    return (
      <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full text-center space-y-12">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-20"></div>
                <Swords size={120} className="text-red-600 relative z-10 mx-auto animate-bounce" />
            </div>
            <div className="space-y-4">
                <h1 className="text-8xl font-black italic uppercase tracking-tighter">BINGO <span className="text-red-600 text-stroke">CONQUEST</span></h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-xs">Tactical 10x10 Area Domination</p>
            </div>
            <div className="grid gap-4 px-16">
                <button onClick={startGame} className="bg-red-600 hover:bg-red-500 py-8 rounded-[3rem] font-black text-3xl uppercase shadow-2xl transition-all hover:scale-105 active:scale-95">BETREED ARENA</button>
                <button onClick={() => navigate('/dashboard')} className="text-gray-600 font-black uppercase text-xs hover:text-white">Terug naar Dashboard</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020202] text-white flex flex-col lg:flex-row overflow-hidden font-sans relative select-none">
        
        {/* LINKS: HUD COMMAND */}
        <div className="w-full lg:w-96 bg-[#080808] border-r border-white/5 p-10 flex flex-col gap-10 z-30 shadow-2xl">
            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2.5rem] border border-white/10">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg"><User size={28} /></div>
                <div><p className="text-[10px] font-black text-red-500 uppercase mb-1">Commander</p><p className="font-black uppercase italic text-2xl truncate">{user?.username}</p></div>
            </div>

            <div className="space-y-6 flex-1">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3"><BarChart3 size={18}/> Rankings</p>
                <div className="space-y-6">
                    {[
                        { id: 'player', name: 'JIJ (RED)', score: scores.player, color: 'bg-red-600' },
                        { id: 'ai_blue', name: 'COBALT', score: scores.ai_blue, color: 'bg-blue-600' },
                        { id: 'ai_yellow', name: 'MIDAS', score: scores.ai_yellow, color: 'bg-yellow-500' },
                        { id: 'ai_green', name: 'JADE', score: scores.ai_green, color: 'bg-green-600' }
                    ].sort((a,b) => b.score - a.score).map((p, i) => (
                        <div key={p.id} className="space-y-2 group">
                            <div className="flex justify-between items-end text-[11px] font-black uppercase transition-all">
                                <span className={p.id === 'player' ? 'text-white' : 'text-gray-600'}>{i+1}. {p.name}</span>
                                <span className={p.id === 'player' ? 'text-red-500 text-sm' : 'text-gray-400'}>{p.score}</span>
                            </div>
                            <div className="h-2 bg-gray-900 rounded-full overflow-hidden p-[1px]">
                                <div className={`h-full ${p.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min((p.score / 1500) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-red-600/5 p-8 rounded-[3.5rem] border border-red-600/10 text-center relative overflow-hidden">
                <Timer size={32} className="mx-auto text-red-600 mb-2" />
                <p className="text-6xl font-black italic tracking-tighter">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</p>
            </div>
        </div>

        {/* MIDDEN: THE GRID */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col items-center justify-between relative z-20">
            <div className="w-full max-w-xl text-center space-y-4 pt-4">
                <div className="flex items-center justify-center gap-3">
                    <Activity size={18} className="text-red-600 animate-pulse" />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.8em]">Broadcasting Frequency</span>
                </div>
                <div className={`bg-white text-[#050505] py-8 rounded-[4rem] font-black text-7xl lg:text-9xl uppercase italic shadow-[0_0_100px_rgba(255,255,255,0.15)] border-[12px] border-white/10 transition-all duration-500 ${currentEvent.type === 'bomb' ? 'bg-red-600 text-white' : currentEvent.type === 'shield' ? 'bg-blue-600 text-white' : ''}`}>
                    {currentEvent.type === 'bomb' ? <Bomb size={96} /> : currentEvent.type === 'shield' ? <Shield size={96} /> : currentEvent.value || '--'}
                </div>
            </div>

            <div className={`grid grid-cols-10 gap-1.5 w-full max-w-[700px] aspect-square my-8 transition-all duration-500 ${isFrozen ? 'blur-2xl scale-90 opacity-40' : ''}`}>
                {grid.map((num, i) => {
                    const owner = claims[i];
                    const isTarget = currentEvent.type === 'number' && num === currentEvent.value && !owner;
                    const isPartOfFort = forts.some(f => f.split('-').includes(String(i)));
                    const isJackpot = i === jackpotIdx;
                    const hasShield = shields[i];

                    return (
                        <div key={i} onClick={() => handlePlayerClick(i)} className={`aspect-square rounded-lg border-2 flex items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${owner === 'player' ? 'bg-red-600 border-red-400 shadow-[inset_0_0_20px_rgba(255,255,255,0.3)] z-10' : owner ? `bg-${owner.split('_')[1]}-600 border-transparent opacity-90` : isTarget ? 'bg-white/20 border-white animate-pulse scale-105 z-20' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                            {hasShield && <div className="absolute inset-0 bg-blue-400/20 border-2 border-blue-400/60 rounded-lg z-20 pointer-events-none"></div>}
                            <span className={`font-black italic transition-all ${owner ? 'text-white text-sm' : 'text-gray-700 text-xs'}`}>{num}</span>
                            {isJackpot && !owner && <Star size={10} className="absolute top-0.5 right-0.5 text-yellow-400 animate-pulse" />}
                            {isPartOfFort && <ShieldAlert size={14} className="absolute inset-0 m-auto text-white/10" />}
                        </div>
                    );
                })}
            </div>
            
            {isFrozen && (
                <div className="absolute inset-0 bg-red-950/40 backdrop-blur-3xl z-[100] flex items-center justify-center animate-in fade-in">
                    <div className="bg-red-600 text-white px-16 py-8 rounded-[4rem] font-black uppercase italic animate-bounce shadow-2xl flex flex-col items-center gap-4">
                        <ZapOff size={64}/> <p className="text-4xl">SYSTEM LOCKOUT</p>
                    </div>
                </div>
            )}
        </div>

        {/* RECHTS: COMBAT LOG */}
        <div className="w-full lg:w-96 bg-[#080808] border-l border-white/5 p-10 flex flex-col gap-10 z-30 shadow-2xl">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3"><Terminal size={18}/> Battle Log</p>
            <div className="flex-1 bg-black/80 rounded-[3.5rem] border border-white/5 p-8 overflow-hidden flex flex-col-reverse gap-4">
                {logs.map(log => (
                    <div key={log.id} className={`text-xs font-bold uppercase italic leading-tight animate-in slide-in-from-right-4 ${log.type === 'success' ? 'text-red-400' : log.type === 'ai' ? 'text-blue-500' : 'text-gray-600'}`}>
                        {log.type === 'sys' ? <Zap size={10} className="inline mr-2 text-red-500"/> : ''}{log.msg}
                    </div>
                ))}
            </div>
            <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 space-y-6">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-4">Conquest Intel</p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center"><p className="text-4xl font-black text-red-600 italic leading-none">{forts.length}</p><p className="text-[9px] text-gray-500 uppercase mt-2">Forts</p></div>
                    <div className="text-center"><p className="text-4xl font-black text-amber-500 italic leading-none">{claims.filter(x=>x==='player').length}</p><p className="text-[9px] text-gray-500 uppercase mt-2">Tiles</p></div>
                </div>
            </div>
        </div>

        {/* RESULTS */}
        {view === 'results' && (
            <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white/5 p-20 rounded-[5rem] border-2 border-white/10 max-w-xl w-full text-center shadow-2xl relative overflow-hidden">
                    <Trophy size={150} className="text-yellow-400 mx-auto mb-10 animate-bounce" />
                    <h2 className="text-8xl font-black uppercase italic mb-10 tracking-tighter leading-none">CONQUEST OVER</h2>
                    <div className="bg-white/5 p-8 rounded-[3rem] mb-12">
                        <p className="text-gray-500 font-black uppercase text-xs mb-2 tracking-widest">Final Conquest Points</p>
                        <p className="text-7xl font-black text-red-600 italic">{scores.player}</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="w-full py-10 bg-white text-black rounded-[3rem] font-black text-3xl uppercase hover:bg-red-600 hover:text-white transition-all shadow-xl">RETURN TO BASE</button>
                </div>
            </div>
        )}
    </div>
  );
}