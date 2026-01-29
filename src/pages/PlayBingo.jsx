import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Sparkles, Trophy, Crown, 
  Grid3X3, Settings, QrCode, Copy, Check, Share2, AlertOctagon, X, User, Loader2, Ticket,
  Zap, Rocket, Flame, Star, Ghost, Gem, PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';

import HallHostView from '../components/game_modes/HallHostView';
import PlayerView from '../components/game_modes/PlayerView';

export default function PlayBingo() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();

  // --- FASE 1: WIE BEN IK? ---
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [myUserId, setMyUserId] = useState(null);
  const [myName, setMyName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // --- FASE 2: SPEL DATA ---
  const [session, setSession] = useState(null);
  const [card, setCard] = useState(null);
  const [grid, setGrid] = useState([]);
  const [marked, setMarked] = useState(new Array(25).fill(false));
  const [participants, setParticipants] = useState([]);
  
  // Game State
  const [currentDraw, setCurrentDraw] = useState(null);
  const [drawnItems, setDrawnItems] = useState([]);
  const [gameMode, setGameMode] = useState('rows');
  const [winPattern, setWinPattern] = useState('1line');
  const [bingoCount, setBingoCount] = useState(0);

  // Modals & UI
  const [winner, setWinner] = useState(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [verificationClaim, setVerificationClaim] = useState(null);
  const [isFalseBingo, setIsFalseBingo] = useState(false);
  const [isKickedLocal, setIsKickedLocal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Refs
  const myParticipantIdRef = useRef(null);
  const gridRef = useRef(grid);
  
  const isHost = session?.host_id === myUserId;

  useEffect(() => { gridRef.current = grid; }, [grid]);

  // ===========================================================================
  // 1. DE "DEURWACHTER"
  // ===========================================================================
  useEffect(() => {
    const checkAccess = async () => {
        setIsCheckingAuth(true);
        const { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id;

        if (user) {
            userId = user.id;
            const { data: p } = await supabase.from('profiles').select('username').eq('id', userId).single();
            setMyUserId(userId);
            setMyName(p?.username || 'Host');
            await loadGameData(sessionId, userId);
            setNeedsOnboarding(false);
            setIsCheckingAuth(false);
            return;
        }

        let guestId = localStorage.getItem('pingo_guest_id');
        if (!guestId || guestId.startsWith('guest-')) { 
            guestId = crypto.randomUUID();
            localStorage.setItem('pingo_guest_id', guestId);
        }
        userId = guestId;
        setMyUserId(userId);

        const storedName = localStorage.getItem('pingo_guest_name');
        if (storedName) setMyName(storedName);

        const { data: existingParticipant } = await supabase
            .from('session_participants')
            .select('id, user_name')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingParticipant) {
            myParticipantIdRef.current = existingParticipant.id;
            if(!storedName) setMyName(existingParticipant.user_name);
            await loadGameData(sessionId, userId);
            setNeedsOnboarding(false);
        } else {
            setNeedsOnboarding(true); 
        }
        
        setIsCheckingAuth(false);
    };
    checkAccess();
  }, [sessionId]);

  // ===========================================================================
  // 2. JOIN ACTIE
  // ===========================================================================
  const handleJoinGame = async () => {
      if (!myName.trim()) return alert("Vul een naam in!");
      
      setIsJoining(true);
      localStorage.setItem('pingo_guest_name', myName);

      const { data: sData, error: sError } = await supabase.from('bingo_sessions').select('*, bingo_cards(*)').eq('id', sessionId).single();
      
      if (sError || !sData) {
          alert("Fout bij laden sessie.");
          setIsJoining(false);
          return;
      }

      const cardItems = sData.bingo_cards.items;
      const g = generateGrid(cardItems, true, true);
      setGrid(g);
      saveGridLocally(sessionId, myUserId, g);

      try {
          const { data: newP, error } = await supabase.from('session_participants').insert({
              session_id: sessionId,
              user_id: myUserId, 
              user_name: myName,
              marked_indices: [12],
              grid_snapshot: g,
              has_bingo: false
          }).select().single();

          if (error) throw new Error(error.message);

          myParticipantIdRef.current = newP.id;
          await loadGameData(sessionId, myUserId); 
          setNeedsOnboarding(false); 

      } catch (err) {
          console.error("Join error:", err);
          alert("Foutmelding: " + err.message);
      } finally {
          setIsJoining(false);
      }
  };

  // ===========================================================================
  // 3. DATA & LOGICA
  // ===========================================================================
  const loadGameData = async (sId, uId) => {
      const { data } = await supabase.from('bingo_sessions').select('*, bingo_cards(*)').eq('id', sId).single();
      if (data) {
          setSession(data);
          setCard(data.bingo_cards);
          setGameMode(data.game_mode);
          setWinPattern(data.win_pattern || '1line');
          setCurrentDraw(data.current_draw);
          setDrawnItems(data.drawn_items || []);
          if(data.status === 'finished') { setWinner(data.winner_name); setShowWinnerPopup(true); }
          fetchParticipants(sId);
          
          const localGrid = getLocalGrid(sId, uId);
          if (localGrid) setGrid(localGrid);
          
          // FIX: HOST MOET OOK JOINEN IN SOLO/GROEP MODUS!
          // We checken: Is het Hall mode? EN ben ik Host? -> Dan NIET joinen. Anders WEL.
          const isHallHost = data.game_mode === 'hall' && data.host_id === uId;
          
          if (!isHallHost) {
             const { data: p } = await supabase.from('session_participants').select('*').eq('session_id', sId).eq('user_id', uId).maybeSingle();
             if (p) {
                 // Restore bestaande speler
                 myParticipantIdRef.current = p.id;
                 if (p.marked_indices) { 
                     const nm = new Array(25).fill(false); 
                     p.marked_indices.forEach(i => nm[i] = true); 
                     setMarked(nm); 
                     setBingoCount(checkBingoRows(nm)); 
                 }
                 if (!localGrid && p.grid_snapshot) { 
                     setGrid(p.grid_snapshot); 
                     saveGridLocally(sId, uId, p.grid_snapshot); 
                 }
             } else {
                 // Host bestaat nog niet in participants tabel? Voeg toe!
                 const hostName = myName || 'Host'; 
                 const g = localGrid || generateGrid(data.bingo_cards.items, true, true);
                 setGrid(g);
                 saveGridLocally(sId, uId, g);
                 
                 const { data: newP } = await supabase.from('session_participants').insert({
                    session_id: sId,
                    user_id: uId,
                    user_name: hostName,
                    marked_indices: [12],
                    grid_snapshot: g,
                    has_bingo: false
                 }).select().single();
                 
                 if(newP) myParticipantIdRef.current = newP.id;
                 fetchParticipants(sId);
             }
          }
      }
  };

  // Helpers
  const saveGridLocally = (sId, uId, newGrid) => { try { localStorage.setItem(`pingo_grid_${sId}_${uId}`, JSON.stringify(newGrid)); } catch (e) {} };
  const getLocalGrid = (sId, uId) => { try { const saved = localStorage.getItem(`pingo_grid_${sId}_${uId}`); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } };
  const generateGrid = (items, reset, ret) => { if(!items) return []; const s = [...items].sort(()=>0.5-Math.random()).slice(0,24); s.splice(12,0,"FREE SPACE"); if(!ret) setGrid(s); if(reset) { setMarked(Object.assign(new Array(25).fill(false), {12:true})); setBingoCount(0); } return s; };
  const checkBingoRows = (m) => [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]].filter(p=>p.every(i=>m[i])).length;
  const fetchParticipants = async (sId) => { const { data } = await supabase.from('session_participants').select('*').eq('session_id', sId); if(data) setParticipants(data); };
  
  // Actions
  const handleHostDraw = async () => { if (!card?.items || winner || isDrawing) return; setIsDrawing(true); const available = card.items.filter(item => !drawnItems.includes(item)); if (available.length === 0) { alert("Op!"); setIsDrawing(false); return; } const randomItem = available[Math.floor(Math.random() * available.length)]; const newDrawnList = [...drawnItems, randomItem]; setDrawnItems(newDrawnList); setCurrentDraw(randomItem); await supabase.from('bingo_sessions').update({ current_draw: randomItem, drawn_items: newDrawnList, updated_at: new Date().toISOString() }).eq('id', sessionId); setIsDrawing(false); };
  const resetDraws = async () => { if(confirm("Reset?")) { await supabase.from('bingo_sessions').update({ current_draw: null, drawn_items: [], status: 'active', winner_name: null }).eq('id', sessionId); setWinner(null); setShowWinnerPopup(false); setVerificationClaim(null); } };
  const toggleTile = async (index) => { if (index === 12 || isKickedLocal || winner) return; const nm = [...marked]; nm[index] = !nm[index]; setMarked(nm); const count = checkBingoRows(nm); setBingoCount(count); const isFull = nm.every(m => m); let hasBingo = false; if (winPattern === '1line' && count >= 1) hasBingo = true; else if (winPattern === '2lines' && count >= 2) hasBingo = true; else if (winPattern === 'full' && isFull) hasBingo = true; if (sessionId && myParticipantIdRef.current) { await supabase.from('session_participants').update({ marked_indices: nm.map((m, i) => m ? i : null).filter(n => n !== null), has_bingo: hasBingo, updated_at: new Date().toISOString() }).eq('id', myParticipantIdRef.current); } };
  const handleShuffle = async () => { const g = generateGrid(card?.items, true, true); setShowShuffleConfirm(false); setGrid(g); if (myParticipantIdRef.current) { saveGridLocally(sessionId, myUserId, g); await supabase.from('session_participants').update({ marked_indices: [12], has_bingo: false, grid_snapshot: g }).eq('id', myParticipantIdRef.current); } };

  // --- BRANDING (TITELS EN KLEUREN) ---
  const isFullCard = marked.every(m => m);
  
  const getBranding = (rowCount, isFull) => {
    // FIX: Volledige lijst voor Rijen Modus
    const titles = {
        0: { title: "PINGO", icon: <Sparkles size={24} /> },
        1: { title: "BINGO!", icon: <Trophy size={24} />, color: "bg-orange-500 text-white shadow-xl border-orange-600" },
        2: { title: "DUBBEL!", icon: <Zap size={24} />, color: "bg-orange-600 text-white shadow-xl border-orange-700" },
        3: { title: "TRIPPEL!", icon: <Rocket size={24} />, color: "bg-red-500 text-white shadow-xl border-red-600" },
        4: { title: "QUADRA!", icon: <Flame size={24} />, color: "bg-red-600 text-white shadow-xl border-red-700" },
        5: { title: "SUPER!", icon: <Star size={24} />, color: "bg-purple-500 text-white shadow-xl border-purple-600" },
        6: { title: "ULTRA!", icon: <Sparkles size={24} />, color: "bg-purple-600 text-white shadow-xl border-purple-700" },
        7: { title: "HYPER!", icon: <Zap size={24} />, color: "bg-indigo-500 text-white shadow-xl border-indigo-600" },
        8: { title: "INSANE!", icon: <Ghost size={24} />, color: "bg-indigo-600 text-white shadow-xl border-indigo-700" },
        9: { title: "GODLY!", icon: <Crown size={24} />, color: "bg-yellow-400 text-black shadow-xl border-yellow-500" },
        10: { title: "MYSTICAL!", icon: <Gem size={24} />, color: "bg-pink-500 text-white shadow-xl border-pink-600" },
        11: { title: "CELESTIAL!", icon: <PartyPopper size={24} />, color: "bg-pink-600 text-white shadow-xl border-pink-700" },
        12: { title: "FULL BINGO!", icon: <Crown size={24} className="text-orange-500" />, color: "bg-black border-2 border-orange-500 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-pulse scale-110" }
    };

    if (winPattern === 'full') {
        if (isFull) return titles[12];
        return { title: "SPELEND..", icon: <Grid3X3 size={16} className="opacity-50"/>, color: "hidden" };
    }
    
    // Voor 'rows' mode: pak gewoon het aantal rijen
    const level = Math.min(rowCount, 12);
    if (level === 0) return { ...titles[0], color: "hidden" }; 
    return { ...(titles[level] || titles[1]) };
  };
  
  const soloBranding = getBranding(bingoCount, isFullCard);
  
  // FIX: Vlag Logica voor Rijen Modus
  let showFlag = false;
  if (gameMode !== 'hall') {
      if (winPattern === 'full') {
          if (isFullCard) showFlag = true;
      } else {
          // In rows/1line mode: Laat vlag zien als er > 0 rijen zijn
          if (bingoCount >= 1) showFlag = true;
      }
  }

  const displayParticipants = useMemo(() => {
    let list = [...participants];
    if (gameMode === 'hall' && session?.host_id) { list = list.filter(p => p.user_id !== session.host_id); }
    return list.sort((a, b) => (b.marked_indices?.length || 0) - (a.marked_indices?.length || 0));
  }, [participants, gameMode, session]);

  useEffect(() => {
    if (!sessionId || needsOnboarding) return;
    const ch = supabase.channel(`room_${sessionId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bingo_sessions', filter: `id=eq.${sessionId}` }, (pl) => { 
        setSession(prev => ({...prev, ...pl.new})); 
        if(pl.new.game_mode) setGameMode(pl.new.game_mode); 
        if(pl.new.win_pattern) setWinPattern(pl.new.win_pattern); 
        if(pl.new.current_draw!==undefined) setCurrentDraw(pl.new.current_draw); 
        if(pl.new.drawn_items) setDrawnItems(pl.new.drawn_items); 
        if (pl.new.drawn_items && pl.new.drawn_items.length === 0 && pl.new.status === 'active') { setWinner(null); setShowWinnerPopup(false); handleShuffle(); }
        if (pl.new.status === 'finished' && pl.new.winner_name) { setWinner(pl.new.winner_name); setShowWinnerPopup(true); confetti({ particleCount: 100, spread: 70 }); }
        if(pl.new.banned_users?.includes(myUserId)) { setIsKickedLocal(true); setTimeout(() => window.location.href='/dashboard', 3000); } 
    }).on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, (pl) => { 
        if(pl.eventType !== 'DELETE') { fetchParticipants(sessionId); if(pl.new.has_bingo && isHost && !winner && gameMode === 'hall') setVerificationClaim(pl.new); if(pl.new.id === myParticipantIdRef.current && pl.new.marked_indices) { const nm=new Array(25).fill(false); pl.new.marked_indices.forEach(i=>nm[i]=true); setMarked(nm); setBingoCount(checkBingoRows(nm)); } 
        } else if(pl.old.id === myParticipantIdRef.current) { setIsKickedLocal(true); setTimeout(() => window.location.href='/dashboard', 3000); } else setParticipants(prev => prev.filter(p => p.id !== pl.old.id)); 
    }).on('broadcast', { event: 'false_bingo' }, () => { setIsFalseBingo(true); setTimeout(()=>setIsFalseBingo(false),3000); })
      .on('broadcast', { event: 'game_won' }, (pl) => { setWinner(pl.payload.winnerName); setShowWinnerPopup(true); confetti({ particleCount: 100, spread: 70 }); })
      .subscribe(); 
    return () => supabase.removeChannel(ch); 
  }, [sessionId, isHost, winner, gameMode, needsOnboarding]);

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center font-black text-orange-500 animate-pulse text-2xl uppercase">Verifiëren...</div>;

  if (needsOnboarding) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans fixed inset-0 z-[9999]">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border-4 border-orange-100 animate-in zoom-in duration-300">
                <div className="bg-orange-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 shadow-inner"><Ticket size={48} /></div>
                <h2 className="text-3xl font-black text-gray-900 italic uppercase mb-2">Entree Ticket</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">Vul je naam in om mee te spelen</p>
                <input type="text" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Jouw Naam" className="w-full p-5 bg-gray-50 rounded-2xl font-black text-lg text-center uppercase placeholder:text-gray-300 border-2 border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all mb-4" autoFocus />
                <button onClick={handleJoinGame} disabled={isJoining} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">{isJoining ? <><Loader2 className="animate-spin" /> Even geduld...</> : "MEEDOEN"}</button>
            </div>
        </div>
      );
  }

  // CRASH PREVENTIE
  if (!session) return <div className="min-h-screen flex items-center justify-center">Laden...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-center sm:text-left relative overflow-x-hidden">
        
        {/* MODALS */}
        {winner && showWinnerPopup && <div className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center text-white text-center animate-in zoom-in p-4"><div className="max-w-xl w-full relative">{!isHost && <button onClick={() => setShowWinnerPopup(false)} className="absolute top-0 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>}<Crown size={100} className="mx-auto mb-6 text-yellow-400 animate-bounce"/><h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600">WINNAAR!</h1><p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-6">Spel Afgelopen</p><div className="bg-white text-gray-900 rounded-[2rem] p-6 shadow-2xl transform rotate-2 mb-8"><div className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">De winnaar is</div><div className="text-3xl md:text-5xl font-black uppercase text-purple-600 break-words leading-tight">{winner}</div></div>{isHost ? <button onClick={resetDraws} className="bg-white/20 hover:bg-white text-white hover:text-black border-2 border-white px-8 py-4 rounded-xl font-black uppercase transition-all">Nieuw Spel Starten</button> : <button onClick={() => setShowWinnerPopup(false)} className="bg-white text-black px-8 py-4 rounded-xl font-black uppercase hover:scale-105 transition-transform shadow-lg">Sluiten & Bekijk Kaart</button>}</div></div>}
        {isFalseBingo && <div className="fixed inset-0 z-[99999] bg-red-600/95 flex items-center justify-center text-white text-center"><div><AlertOctagon size={100} className="mx-auto mb-4"/><h1 className="text-6xl font-black">VALSE BINGO!</h1></div></div>}
        {isKickedLocal && <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center text-white"><h2 className="text-3xl font-black">Je bent verwijderd.</h2></div>}
        {showQR && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={()=>setShowQR(false)}><div className="bg-white p-8 rounded-3xl text-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.href}`} className="w-64 h-64 mix-blend-multiply"/><p className="mt-4 font-black text-2xl text-gray-900">{session?.join_code}</p></div></div>}

        <div className="pt-8 px-6 pb-6 relative z-50">
            <div className="max-w-6xl mx-auto relative group">
                <div className="relative z-50 bg-gray-900 rounded-[2.5rem] px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-4 md:gap-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white"><ChevronLeft size={24} /></button>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">{card?.title}</h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                {gameMode === 'hall' && <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-[8px]">ZAAL MODUS</span>}
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 w-full md:w-auto justify-end">
                        {isMultiplayer && (
                            <>
                                <button onClick={()=>setShowQR(true)} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white"><QrCode size={20}/></button>
                                <button onClick={() => { navigator.clipboard.writeText(session?.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }} className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:border-orange-500 hover:text-white transition-all group">
                                    <span className="text-orange-500 opacity-70">CODE:</span>
                                    <span className="text-white text-sm tracking-wide">{session?.join_code || '...'}</span>
                                    {codeCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} className="group-hover:text-orange-500 transition-colors" />}
                                </button>
                            </>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-colors">{copied ? <Check size={20} className="text-green-500" /> : <Share2 size={20} />}</button>
                        {isHost && <button onClick={()=>navigate(`/setup/${card.id}/${sessionId}`)} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white"><Settings size={20}/></button>}
                    </div>
                </div>
                <div className={`absolute top-[85%] left-0 right-0 z-10 flex justify-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showFlag ? 'translate-y-0 opacity-100' : '-translate-y-[100%] opacity-0'}`}>
                    <div className={`px-12 pt-8 pb-4 rounded-b-3xl shadow-2xl border-2 border-t-0 flex items-center justify-center gap-4 ${soloBranding.color || 'bg-orange-500 text-white border-orange-600'}`}>
                        <div className="animate-bounce">{soloBranding.icon}</div>
                        <span className="text-2xl font-black italic uppercase tracking-widest drop-shadow-sm">{soloBranding.title}</span>
                        <div className="animate-bounce delay-75">{soloBranding.icon}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-32">
            {gameMode === 'hall' && isHost ? (
                <HallHostView 
                    currentDraw={currentDraw} drawnItems={drawnItems} participants={displayParticipants} verificationClaim={verificationClaim}
                    setVerificationClaim={setVerificationClaim} handleHostDraw={handleHostDraw} resetDraws={resetDraws} session={session} sessionId={sessionId} supabase={supabase}
                    winPattern={winPattern} 
                />
            ) : (
                <PlayerView 
                    grid={grid} marked={marked} toggleTile={toggleTile} handleShuffleClick={handleShuffle}
                    bingoCount={bingoCount} gameMode={gameMode} currentDraw={currentDraw} participants={displayParticipants} isHost={isHost} session={session} sessionId={sessionId} myUserId={myUserId} supabase={supabase} showShuffleConfirm={showShuffleConfirm} setShowShuffleConfirm={setShowShuffleConfirm} confirmShuffle={handleShuffle}
                />
            )}
        </div>
    </div>
  );
}