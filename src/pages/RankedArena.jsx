import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trophy, User, Swords, Activity, Crown, 
  Bomb, Star, Timer, ShieldAlert, Loader2, ChevronLeft,
  MessageSquare, BarChart3, Zap, Crosshair, Target, 
  ZapOff, ShieldCheck, TrendingUp, Info, AlertTriangle,
  RefreshCw, MousePointer2, Shield, Flame, Terminal, Users,
  Wifi, WifiOff, Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * BINGO CONQUEST: ONLINE MULTIPLAYER
 * Een 1v1 real-time arena. 
 * Maakt gebruik van Supabase Broadcast voor milliseconde-precisie.
 */

const GRID_SIZE = 100; 
const BASE_POINTS = 10;
const CLUSTER_BONUS = 20;
const FORT_BONUS = 100;
const JACKPOT_MULTIPLIER = 5;

export default function RankedArena() {
  const navigate = useNavigate();

  // --- AUTH & SYSTEEM ---
  const [view, setView] = useState('loading'); 
  const [user, setUser] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Verbinding maken...');

  // --- GAME STATE ---
  const [grid, setGrid] = useState([]);
  const [claims, setClaims] = useState(new Array(GRID_SIZE).fill(null));
  const [forts, setForts] = useState([]); 
  const [scores, setScores] = useState({ me: 0, rival: 0 });
  const [currentEvent, setCurrentEvent] = useState({ type: 'idle', value: null });
  const [timeLeft, setTimeLeft] = useState(180);
  const [isFrozen, setIsFrozen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [jackpotIdx, setJackpotIdx] = useState(null);

  // --- NETWERK REFS ---
  const channelRef = useRef(null);
  const gameActiveRef = useRef(false);
  const isHostRef = useRef(false); // De host genereert de getallen
  const claimsRef = useRef(new Array(GRID_SIZE).fill(null));
  const scoresRef = useRef({ me: 0, rival: 0 });

  // ===========================================================================
  // 1. INITIALISATIE & MATCHMAKING
  // ===========================================================================
  useEffect(() => {
    const init = async () => {
      const { data: { user: a } } = await supabase.auth.getUser();
      if (!a) return navigate('/login');
      const { data: p } = await supabase.from('profiles').select('*').eq('id', a.id).maybeSingle();
      setUser({ ...a, ...p });
      setView('lobby');
    };
    init();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      gameActiveRef.current = false;
    };
  }, [navigate]);

  const joinQueue = () => {
    setView('searching');
    setStatusMsg('Zoeken naar een tegenstander...');
    
    // We gebruiken een vaste room naam voor 'Ranked' of we kunnen een unieke ID maken.
    // Voor dit voorbeeld gebruiken we een algemene ranked room.
    const channel = supabase.channel('ranked_arena_global', {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const players = Object.keys(state);
        
        if (players.length >= 2) {
          const opponentId = players.find(id => id !== user.id);
          const opponentData = state[opponentId][0];
          setOpponent({ id: opponentId, ...opponentData });
          
          // Bepaal wie de host is (laagste UUID alfabetisch)
          isHostRef.current = user.id < opponentId;
          startMultiplayerMatch();
        }
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        if (!isHostRef.current) {
          setGrid(payload.grid);
          setJackpotIdx(payload.jackpotIdx);
          beginMatch();
        }
      })
      .on('broadcast', { event: 'new_event' }, ({ payload }) => {
        setCurrentEvent(payload);
      })
      .on('broadcast', { event: 'tile_claimed' }, ({ payload }) => {
        if (payload.playerId !== user.id) {
          syncRivalClaim(payload.idx, payload.points);
        }
      })
      .on('broadcast', { event: 'bomb_detonated' }, ({ payload }) => {
        if (payload.attackerId !== user.id) {
          syncBombHit(payload.targetIdx);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: user.username, rank: 'Bronze' });
        }
      });

    channelRef.current = channel;
  };

  // ===========================================================================
  // 2. SYNC ENGINE (BROADCASTING)
  // ===========================================================================
  
  const startMultiplayerMatch = () => {
    if (isHostRef.current) {
      const newGrid = Array.from({ length: GRID_SIZE }, () => Math.floor(Math.random() * 90) + 1);
      const randomJackpot = Math.floor(Math.random() * GRID_SIZE);
      
      setGrid(newGrid);
      setJackpotIdx(randomJackpot);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { grid: newGrid, jackpotIdx: randomJackpot }
      });
      
      beginMatch();
    }
  };

  const beginMatch = () => {
    setClaims(new Array(GRID_SIZE).fill(null));
    claimsRef.current = new Array(GRID_SIZE).fill(null);
    setScores({ me: 0, rival: 0 });
    scoresRef.current = { me: 0, rival: 0 };
    setLogs([{ msg: "VERBINDING GEBOUWD. VECHT VOOR TERRITORIUM!", type: 'sys' }]);
    setView('playing');
    gameActiveRef.current = true;

    if (isHostRef.current) {
      initHostEngines();
    }
  };

  const initHostEngines = () => {
    // De host stuurt de nummers naar beide spelers [cite: 2026-01-29]
    const caller = setInterval(() => {
      if (!gameActiveRef.current) return clearInterval(caller);
      
      const rand = Math.random();
      let event;
      if (rand > 0.92) event = { type: 'bomb', value: 'BOM!' };
      else event = { type: 'number', value: Math.floor(Math.random() * 90) + 1 };
      
      channelRef.current.send({ type: 'broadcast', event: 'new_event', payload: event });
      setCurrentEvent(event);
    }, 4200);

    const timer = setInterval(() => {
      if (!gameActiveRef.current) return clearInterval(timer);
      setTimeLeft(prev => {
        if (prev <= 1) { finishGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ===========================================================================
  // 3. GAMEPLAY LOGICA
  // ===========================================================================

  const handleTileClick = (idx) => {
    if (isFrozen || !gameActiveRef.current) return;

    if (currentEvent.type === 'number') {
      if (grid[idx] === currentEvent.value && !claims[idx]) {
        const points = calculatePoints(idx, user.id);
        
        // Broadcast claim [cite: 2026-01-29]
        channelRef.current.send({
          type: 'broadcast',
          event: 'tile_claimed',
          payload: { idx, playerId: user.id, points }
        });
        
        localClaim(idx, user.id, points);
      } else {
        triggerPenalty();
      }
    } else if (currentEvent.type === 'bomb') {
      // Bom actie: Sloop een vakje van de tegenstander [cite: 2026-01-29]
      const rivalTiles = claimsRef.current.map((p, i) => p && p !== user.id ? i : null).filter(n => n !== null);
      if (rivalTiles.length > 0) {
        const target = rivalTiles[Math.floor(Math.random() * rivalTiles.length)];
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'bomb_detonated',
          payload: { targetIdx: target, attackerId: user.id }
        });
        
        localBombDetonate(target, user.username);
      }
    }
  };

  const calculatePoints = (idx, pid) => {
    let pts = (idx === jackpotIdx) ? (BASE_POINTS * JACKPOT_MULTIPLIER) : BASE_POINTS;
    if (checkAdjacency(idx, pid)) pts += CLUSTER_BONUS;
    return pts;
  };

  const localClaim = (idx, pid, pts) => {
    const nc = [...claimsRef.current];
    nc[idx] = pid;
    claimsRef.current = nc;
    setClaims(nc);

    let finalPts = pts;
    if (detectForts(idx, pid, nc)) finalPts += FORT_BONUS;

    const newScores = { ...scoresRef.current, me: scoresRef.current.me + finalPts };
    scoresRef.current = newScores;
    setScores(newScores);
    
    addLog(`Vakje ${grid[idx]} veroverd! (+${finalPts})`, 'success');
    if (idx === jackpotIdx) setJackpotIdx(Math.floor(Math.random() * GRID_SIZE));
  };

  const syncRivalClaim = (idx, pts) => {
    const nc = [...claimsRef.current];
    nc[idx] = 'rival';
    claimsRef.current = nc;
    setClaims(nc);

    const newScores = { ...scoresRef.current, rival: scoresRef.current.rival + pts };
    scoresRef.current = newScores;
    setScores(newScores);
    addLog(`Tegenstander claimt ${grid[idx]}!`, 'err');
  };

  const localBombDetonate = (idx, attackerName) => {
    const nc = [...claimsRef.current];
    nc[idx] = null;
    claimsRef.current = nc;
    setClaims(nc);
    setCurrentEvent({ type: 'idle', value: null });
    addLog(`${attackerName} heeft een vakje opgeblazen!`, 'sys');
  };

  const syncBombHit = (idx) => {
    const nc = [...claimsRef.current];
    nc[idx] = null;
    claimsRef.current = nc;
    setClaims(nc);
    addLog("OEPSS! Je territorium is geraakt door een BOM!", 'err');
  };

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
              addLog("FORT VOLTOOID! +100", "success");
              found = true;
            }
          }
        }
      }
    }
    return found;
  };

  const triggerPenalty = () => {
    setIsFrozen(true);
    addLog("MISKLIK! Cooldown geactiveerd.", "err");
    setTimeout(() => setIsFrozen(false), 2000);
  };

  const addLog = (msg, type) => {
    setLogs(prev => [{ msg, type, id: Math.random() }, ...prev].slice(0, 15));
  };

  const finishGame = () => {
    gameActiveRef.current = false;
    setView('results');
    if (scoresRef.current.me > scoresRef.current.rival) confetti();
  };

  // ===========================================================================
  // 4. RENDERING
  // ===========================================================================

  if (view === 'loading') return <div className="h-screen bg-black flex items-center justify-center text-red-500 font-black animate-pulse">CONNECTING_TO_SERVERS...</div>;

  if (view === 'lobby' || view === 'searching') {
    return (
      <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-[180px] rounded-full"></div>
        
        <div className="text-center space-y-12 max-w-xl w-full z-10 animate-in fade-in duration-700">
            <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10 inline-block shadow-2xl relative">
                <Swords size={100} className="text-red-600" />
                <div className="absolute -top-4 -right-4 bg-red-600 text-[10px] font-black px-4 py-2 rounded-full shadow-xl">LIVE MULTIPLAYER</div>
            </div>
            
            <div className="space-y-4">
                <h1 className="text-8xl font-black italic uppercase tracking-tighter">CON<span className="text-red-600">QUEST</span></h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-xs">Battle Real Opponents in the 10x10 Arena</p>
            </div>

            {view === 'searching' ? (
                <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-xl space-y-6">
                    <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto" />
                    <div>
                        <p className="text-2xl font-black uppercase italic tracking-tight">{statusMsg}</p>
                        <div className="flex justify-center gap-2 mt-4">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-150"></div>
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-300"></div>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="text-gray-600 font-black uppercase text-[10px] tracking-widest border-b border-gray-800 pb-1">Annuleren</button>
                </div>
            ) : (
                <div className="flex flex-col gap-6 px-16">
                    <button onClick={joinQueue} className="bg-red-600 hover:bg-red-500 text-white py-8 rounded-[3rem] font-black text-3xl uppercase tracking-widest shadow-[0_25px_60px_rgba(220,38,38,0.3)] transition-all hover:scale-[1.03]">FIND MATCH</button>
                    <button onClick={() => navigate('/dashboard')} className="text-gray-600 font-black uppercase text-xs hover:text-white transition-colors">Terug</button>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020202] text-white flex flex-col lg:flex-row overflow-hidden font-sans relative select-none">
        
        {/* LINKS: MULTIPLAYER HUD */}
        <div className="w-full lg:w-[400px] bg-[#080808] border-r border-white/5 p-10 flex flex-col gap-10 z-30 shadow-2xl relative">
            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[3rem] border border-white/10">
                <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shadow-xl rotate-3"><User size={32} /></div>
                <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Local Pilot</p>
                    <p className="font-black uppercase italic text-2xl truncate">{user?.username}</p>
                </div>
            </div>

            <div className="space-y-8 flex-1">
                <div className="flex justify-between items-center px-2">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3"><Globe size={18}/> Duel Standings</p>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-[8px] font-black text-green-500 uppercase">Synced</span></div>
                </div>

                <div className="space-y-10">
                    {/* ME */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end"><span className="text-xs font-black uppercase text-white">JIJ (RED)</span><span className="text-red-500 font-black text-2xl">{scores.me}</span></div>
                        <div className="h-2.5 bg-gray-900 rounded-full overflow-hidden p-[1px]"><div className="h-full bg-red-600 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]" style={{ width: `${Math.min((scores.me / 1000) * 100, 100)}%` }}></div></div>
                    </div>
                    {/* RIVAL */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end"><span className="text-xs font-black uppercase text-gray-600">RIVAAL (BLUE)</span><span className="text-gray-400 font-black text-2xl">{scores.rival}</span></div>
                        <div className="h-2.5 bg-gray-900 rounded-full overflow-hidden p-[1px]"><div className="h-full bg-blue-600 rounded-full transition-all duration-700 opacity-60" style={{ width: `${Math.min((scores.rival / 1000) * 100, 100)}%` }}></div></div>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-white/5 rounded-[3.5rem] border border-white/10 text-center relative overflow-hidden">
                <Timer size={32} className="mx-auto text-red-600 mb-2" />
                <p className="text-6xl font-black italic tracking-tighter">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</p>
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Neural Link Expiration</p>
            </div>
        </div>

        {/* MIDDEN: BATTLE GRID */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col items-center justify-between relative z-20">
            <div className="w-full max-w-xl text-center space-y-4 pt-4">
                <div className="flex items-center justify-center gap-3">
                    <Activity size={18} className="text-red-600 animate-pulse" />
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.8em]">Broadcasting Frequency</span>
                </div>
                <div className={`
                    bg-white text-[#050505] py-10 rounded-[4rem] font-black text-7xl lg:text-9xl uppercase italic shadow-[0_0_120px_rgba(255,255,255,0.15)] border-[12px] border-white/5 transition-all duration-500
                    ${currentEvent.type === 'bomb' ? 'bg-red-600 text-white scale-110 rotate-1' : ''}
                `}>
                    {currentEvent.type === 'bomb' ? <Bomb size={120} className="mx-auto animate-bounce" /> : currentEvent.value || '--'}
                </div>
            </div>

            <div className={`grid grid-cols-10 gap-1.5 w-full max-w-[720px] aspect-square my-8 transition-all duration-700 relative ${isFrozen ? 'blur-2xl scale-95 opacity-50' : ''}`}>
                {grid.map((num, i) => {
                    const owner = claims[i];
                    const isTarget = currentEvent.type === 'number' && num === currentEvent.value && !owner;
                    const isPartOfFort = forts.some(f => f.split('-').includes(String(i)));
                    const isJackpot = i === jackpotIdx;

                    return (
                        <div key={i} onClick={() => handleTileClick(i)} className={`
                            aspect-square rounded-lg border-2 flex items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden
                            ${owner === user.id ? 'bg-red-600 border-red-400 shadow-[inset_0_0_25px_rgba(255,255,255,0.3)] z-10' : 
                              owner === 'rival' ? 'bg-blue-600 border-blue-400 opacity-90' : 
                              isTarget ? 'bg-white/20 border-white animate-pulse scale-105 z-20 shadow-2xl' : 
                              'bg-white/5 border-white/5 hover:border-white/20'}
                            ${isJackpot && !owner ? 'border-yellow-400 border-[3px] shadow-[0_0_20px_rgba(250,204,21,0.4)]' : ''}
                        `}>
                            <span className={`font-black italic transition-all ${owner ? 'text-white text-[10px] lg:text-sm scale-110' : 'text-gray-700 text-[9px] lg:text-xs'}`}>
                                {num}
                            </span>
                            {isJackpot && !owner && <Star size={10} className="absolute top-0.5 right-0.5 text-yellow-400 animate-pulse" />}
                            {isPartOfFort && <ShieldAlert size={14} className="absolute inset-0 m-auto text-white/20 animate-pulse" />}
                        </div>
                    );
                })}
            </div>

            {isFrozen && (
                <div className="absolute inset-0 bg-red-950/50 backdrop-blur-3xl z-[100] flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-red-600 text-white px-16 py-8 rounded-[4rem] font-black uppercase italic animate-bounce shadow-2xl border-8 border-red-400 flex flex-col items-center gap-6">
                        <ZapOff size={80} strokeWidth={3}/>
                        <div className="text-center">
                            <p className="text-5xl tracking-tighter">PENALTY LOCKOUT</p>
                            <p className="text-xs opacity-70 mt-2 uppercase tracking-[0.5em]">Cooldown: 2.0s</p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* RECHTS: MULTIPLAYER LOGS */}
        <div className="w-full lg:w-[450px] bg-[#080808] border-l border-white/5 p-10 flex flex-col gap-10 z-30 shadow-2xl relative">
            <div className="flex items-center justify-between text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2 px-2">
                <div className="flex items-center gap-3"><Terminal size={18}/> Neural Combat Feed</div>
                <div className="flex items-center gap-2 text-green-500"><Wifi size={12}/> LIVE</div>
            </div>

            <div className="flex-1 bg-black/60 rounded-[3.5rem] border border-white/5 p-8 overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none z-10 h-24 bottom-0"></div>
                <div className="flex flex-col-reverse gap-6 relative z-0 h-full overflow-hidden">
                    {logs.map(log => (
                        <div key={log.id} className={`text-xs font-bold uppercase italic leading-relaxed animate-in slide-in-from-right-10 duration-500 flex items-start gap-4 ${
                            log.type === 'success' ? 'text-red-400' : 
                            log.type === 'ai' ? 'text-blue-500' : 
                            log.type === 'err' ? 'text-amber-500' :
                            'text-gray-600'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                log.type === 'success' ? 'bg-red-500 shadow-[0_0_8px_rgba(220,38,38,1)]' : 
                                log.type === 'ai' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]' : 
                                'bg-gray-700'
                            }`}></div>
                            <span className="flex-1 tracking-tight">{log.msg}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 space-y-8 shadow-xl">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-4">Conquest Intel</p>
                <div className="flex items-center justify-center gap-12">
                   <div className="text-center"><p className="text-5xl font-black text-red-600 italic tracking-tighter">{forts.length}</p><p className="text-[9px] text-gray-500 uppercase mt-2 font-black">Forts Built</p></div>
                   <div className="w-[1px] h-12 bg-white/10"></div>
                   <div className="text-center"><p className="text-5xl font-black text-amber-500 italic tracking-tighter">{Math.round((claims.filter(x=>x===user.id).length / GRID_SIZE) * 100)}%</p><p className="text-[9px] text-gray-500 uppercase mt-2 font-black">Area Secure</p></div>
                </div>
            </div>
        </div>

        {/* RESULTS: MULTIPLAYER BREAKDOWN */}
        {view === 'results' && (
            <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-1000">
                <div className="bg-white/5 p-20 lg:p-24 rounded-[5rem] border-2 border-white/10 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-10 ${scores.me > scores.rival ? 'bg-red-600' : 'bg-gray-800'}`}></div>
                    
                    <Trophy size={160} className={`${scores.me > scores.rival ? 'text-yellow-400' : 'text-gray-700'} mx-auto mb-10 animate-bounce relative z-10`} />
                    
                    <h2 className="text-7xl lg:text-8xl font-black uppercase italic mb-10 tracking-tighter leading-none relative z-10">
                        {scores.me > scores.rival ? 'VICTORY' : 'DEFEAT'}
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-8 mb-16 relative z-10">
                        <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2">My Score</p>
                            <p className="text-7xl font-black text-red-600 italic leading-none">{scores.me}</p>
                        </div>
                        <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-2 text-left px-2">Reward Earned</p>
                            <div className="text-left space-y-1">
                                <p className="text-3xl font-black text-green-500 leading-none">+{scores.me > scores.rival ? '1250 XP' : '250 XP'}</p>
                                <p className="text-2xl font-black text-amber-500 leading-none">+{scores.me > scores.rival ? '45 RP' : '5 RP'}</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => navigate('/dashboard')} className="w-full py-10 bg-white text-[#050505] rounded-[3.5rem] font-black text-3xl uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl relative z-10 active:scale-95">RETURN TO HUB</button>
                </div>
            </div>
        )}
    </div>
  );
}