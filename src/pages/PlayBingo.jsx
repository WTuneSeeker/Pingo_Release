import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Sparkles, Trophy, Share2, 
  Zap, Rocket, Crown, Flame, Star, Ghost, Gem, PartyPopper, 
  Users, UserMinus, Copy, Check, Info, Grid3X3, Shuffle, X, Loader2, Save, AlertTriangle, Settings, Tv, QrCode, Play, Smartphone
} from 'lucide-react';

export default function PlayBingo() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [card, setCard] = useState(null);
  const [grid, setGrid] = useState([]);
  const [marked, setMarked] = useState(new Array(25).fill(false));
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [bingoCount, setBingoCount] = useState(0); 
  const [gameMode, setGameMode] = useState('rows'); 
  const [currentDraw, setCurrentDraw] = useState(null);
  
  // Save State
  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [isRestoring, setIsRestoring] = useState(false);

  // Modals & Overlays
  const [isKickedLocal, setIsKickedLocal] = useState(false);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  
  // REFS
  const myParticipantIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const [currentUserIdState, setCurrentUserIdState] = useState(null);

  const isHost = session?.host_id === currentUserIdState;

  // --- SLIMME CHECK: IS DIT EEN GROEPSSPEL? ---
  const isMultiplayer = session && (session.max_players > 1 || session.game_mode === 'hall');

  // --- LIJST FILTEREN (Host telt niet mee in Hall Mode) ---
  const displayParticipants = useMemo(() => {
    let list = [...participants];
    
    // Als we in Zaal Modus zitten, filteren we de host eruit
    if (gameMode === 'hall' && session?.host_id) {
        list = list.filter(p => p.user_id !== session.host_id);
    }

    // Sorteren op score
    return list.sort((a, b) => {
      const countA = a.marked_indices?.length || 0;
      const countB = b.marked_indices?.length || 0;
      return countB - countA;
    });
  }, [participants, gameMode, session]);

  // 1. AUTH & INIT
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        
        currentUserIdRef.current = user.id;
        setCurrentUserIdState(user.id);

        if (sessionId) await loadSessionData(sessionId);
        else if (id) await handleSoloStart(id, user.id);
      } catch (err) {
        console.error("Init Error:", err);
        setErrorMsg("Er ging iets mis bij het opstarten.");
        setLoading(false);
      }
    };
    init();
  }, [id, sessionId, navigate]);

  // --- HOST DRAW LOGIC (ZAAL MODUS) ---
  const handleHostDraw = async () => {
    if (!card?.items) return;
    const randomItem = card.items[Math.floor(Math.random() * card.items.length)];
    
    await supabase.from('bingo_sessions').update({ 
      current_draw: randomItem,
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);
  };

  // --- SOLO START LOGICA ---
  const handleSoloStart = async (cardId, userId) => {
    try {
      setLoading(true);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: existingSession, error: searchError } = await supabase
        .from('bingo_sessions')
        .select('id')
        .eq('host_id', userId)
        .eq('card_id', cardId)
        .neq('status', 'finished')
        .gt('updated_at', oneWeekAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingSession) {
        navigate(`/play-session/${existingSession.id}`, { replace: true });
      } else {
        const joinCode = `SOLO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const { data: newSession, error: insertError } = await supabase
          .from('bingo_sessions')
          .insert([{ 
            host_id: userId, 
            card_id: cardId, 
            join_code: joinCode, 
            status: 'active', 
            max_players: 1, 
            updated_at: new Date().toISOString() 
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        navigate(`/play-session/${newSession.id}`, { replace: true });
      }
    } catch (err) {
      console.error("Solo start error:", err);
      setErrorMsg("Kon sessie niet starten.");
      setLoading(false);
    }
  };

  // 2. HEARTBEAT & REALTIME
  useEffect(() => {
    if (!sessionId) return;
    const hb = setInterval(async () => {
      if (myParticipantIdRef.current) {
        await supabase.from('session_participants').update({ updated_at: new Date() }).eq('id', myParticipantIdRef.current);
      }
    }, 60000); 

    const channel = supabase.channel(`room_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bingo_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        if (payload.new) {
           setSession(prev => ({...prev, ...payload.new}));
           if (payload.new.game_mode) setGameMode(payload.new.game_mode);
           if (payload.new.current_draw) setCurrentDraw(payload.new.current_draw);
           
           if (payload.new.banned_users?.includes(currentUserIdRef.current)) {
              triggerKickSequence();
           }
           if (payload.new.status === 'finished') {
              alert("De host heeft het spel beëindigd.");
              navigate('/dashboard');
           }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.eventType !== 'DELETE') fetchParticipants(sessionId);
        else if (payload.old.id === myParticipantIdRef.current) triggerKickSequence();
        else setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => { clearInterval(hb); supabase.removeChannel(channel); };
  }, [sessionId]);

  // --- DATA FETCHING ---
  const loadSessionData = async (sId) => {
    setLoading(true);
    try {
        let { data: sessionData, error } = await supabase
          .from('bingo_sessions').select('*, bingo_cards(*)').eq('id', sId).single();
        
        if (error || !sessionData) {
             const { data: rawSession } = await supabase.from('bingo_sessions').select('*').eq('id', sId).single();
             if(!rawSession) throw new Error("Sessie niet gevonden");
             const { data: rawCard } = await supabase.from('bingo_cards').select('*').eq('id', rawSession.card_id).single();
             sessionData = { ...rawSession, bingo_cards: rawCard };
        }

        setSession(sessionData);
        setGameMode(sessionData.game_mode || 'rows');
        setCurrentDraw(sessionData.current_draw);
        setCard(sessionData.bingo_cards);
        
        if (currentUserIdRef.current && sessionData.banned_users?.includes(currentUserIdRef.current)) {
          triggerKickSequence();
          return;
        }

        const isHostUser = sessionData.host_id === currentUserIdRef.current;
        // Host joint NIET als participant als het HALL mode is
        if (!(sessionData.game_mode === 'hall' && isHostUser)) {
            await joinOrRestoreParticipant(sId, sessionData.bingo_cards.items);
        }

        fetchParticipants(sId);
        await supabase.from('bingo_sessions').update({ updated_at: new Date() }).eq('id', sId);

    } catch (e) { 
      setErrorMsg("Laden mislukt."); 
    } finally { 
      setLoading(false); 
    }
  };

  const joinOrRestoreParticipant = async (sId, cardItems) => {
    if (!currentUserIdRef.current) return;

    const { data: existing } = await supabase.from('session_participants').select('*').eq('session_id', sId).eq('user_id', currentUserIdRef.current).maybeSingle();

    if (existing) {
        myParticipantIdRef.current = existing.id;
        setIsRestoring(true);
        generateGrid(cardItems, false);
        if (existing.marked_indices) {
            const savedMarks = new Array(25).fill(false);
            existing.marked_indices.forEach(idx => { if (idx >= 0 && idx < 25) savedMarks[idx] = true; });
            setMarked(savedMarks);
            setBingoCount(checkBingoRows(savedMarks));
        }
    } else {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUserIdRef.current).single();
        generateGrid(cardItems, true); 
        const { data: newP } = await supabase.from('session_participants').insert({
            session_id: sId, user_id: currentUserIdRef.current, user_name: profile?.username || 'Speler', marked_indices: [12], updated_at: new Date().toISOString()
        }).select().single();
        if (newP) myParticipantIdRef.current = newP.id;
    }
  };

  const fetchParticipants = async (sId) => {
    const { data } = await supabase.from('session_participants').select('*').eq('session_id', sId);
    if (data) setParticipants(data);
  };

  // --- ACTIONS ---
  const upgradeToGroupSession = () => {
    navigate(`/setup/${card.id}/${sessionId}`);
  };

  const startGroupSession = async () => {
    const joinCode = `P-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    if (!currentUserIdRef.current) return;
    const { data } = await supabase.from('bingo_sessions')
      .insert([{ host_id: currentUserIdRef.current, card_id: card.id, join_code: joinCode, status: 'active', updated_at: new Date().toISOString() }])
      .select().single();
    if (data) navigate(`/play-session/${data.id}`);
  };

  const handleShuffleClick = () => {
    if (marked.filter(Boolean).length > 1) setShowShuffleConfirm(true);
    else executeShuffle();
  };

  const executeShuffle = () => {
    if (card && card.items) {
      generateGrid(card.items, true); 
      setShowShuffleConfirm(false); 
      if (myParticipantIdRef.current) saveProgressToDb([12], 0, false);
    }
  };

  const kickParticipant = async (pId, userId) => {
    setParticipants(prev => prev.filter(p => p.id !== pId));
    const updatedBanned = [...(session.banned_users || []), userId];
    await supabase.from('bingo_sessions').update({ banned_users: updatedBanned }).eq('id', sessionId);
    await supabase.from('session_participants').delete().eq('id', pId);
    supabase.channel(`room_live_${sessionId}`).send({ type: 'broadcast', event: 'kick_user', payload: { userId: userId } });
  };

  const triggerKickSequence = () => {
    setIsKickedLocal(true);
    localStorage.setItem('pingo_kicked', 'true');
    setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
  };

  // --- GAME LOGIC ---
  const generateGrid = (items, reset) => {
    if (!items) return;
    const shuffled = [...items].sort(() => 0.5 - Math.random()).slice(0, 24);
    shuffled.splice(12, 0, "FREE SPACE");
    setGrid(shuffled);
    if (reset) {
        setMarked(Object.assign(new Array(25).fill(false), {12: true}));
        setBingoCount(0);
    }
  };

  const checkBingoRows = (currentMarked) => {
    const wins = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];
    return wins.filter(p => p.every(idx => currentMarked[idx])).length;
  };

  const toggleTile = async (index) => {
    if (index === 12 || isKickedLocal) return; 
    const newMarked = [...marked];
    newMarked[index] = !newMarked[index];
    setMarked(newMarked);
    const rowCount = checkBingoRows(newMarked);
    setBingoCount(rowCount); 
    
    if (sessionId && myParticipantIdRef.current) {
      const activeIndices = newMarked.map((m, i) => m ? i : null).filter(n => n !== null);
      saveProgressToDb(activeIndices, rowCount, newMarked.every(m=>m));
    }
  };

  const saveProgressToDb = async (indices, rows, full) => {
      setSaveStatus('saving');
      try {
          await supabase.from('session_participants').update({ 
            marked_indices: indices, 
            has_bingo: (gameMode === 'rows' ? rows >= 1 : full),
            updated_at: new Date().toISOString()
          }).eq('id', myParticipantIdRef.current);
          
          if(sessionId) await supabase.from('bingo_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
          setSaveStatus('saved');
      } catch { setSaveStatus('error'); }
  };

  // --- BRANDING ---
  const getBranding = (rowCount, isFull, currentMode) => {
    const titles = {
      0: { title: "PINGO", icon: <Sparkles size={24} /> },
      1: { title: "BINGO!", icon: <Trophy size={24} />, color: "bg-orange-500 text-white shadow-xl border-orange-400" },
      2: { title: "DUBBEL!", icon: <Zap size={24} />, color: "bg-orange-600 text-white shadow-xl border-orange-500" },
      3: { title: "TRIPPEL!", icon: <Rocket size={24} />, color: "bg-red-500 text-white shadow-xl border-red-400" },
      4: { title: "QUADRA!", icon: <Flame size={24} />, color: "bg-red-600 text-white shadow-xl border-red-500" },
      5: { title: "SUPER!", icon: <Star size={24} />, color: "bg-purple-500 text-white shadow-xl border-purple-400" },
      6: { title: "ULTRA!", icon: <Sparkles size={24} />, color: "bg-purple-600 text-white shadow-xl border-purple-500" },
      7: { title: "HYPER!", icon: <Zap size={24} />, color: "bg-indigo-500 text-white shadow-xl border-indigo-400" },
      8: { title: "INSANE!", icon: <Ghost size={24} />, color: "bg-indigo-600 text-white shadow-xl border-indigo-500" },
      9: { title: "GODLY!", icon: <Crown size={24} />, color: "bg-yellow-400 text-black shadow-xl border-yellow-300" },
      10: { title: "MYSTICAL!", icon: <Gem size={24} />, color: "bg-pink-500 text-white shadow-xl border-pink-400" },
      11: { title: "CELESTIAL!", icon: <PartyPopper size={24} />, color: "bg-pink-600 text-white shadow-xl border-pink-500" },
      12: { title: "FULL BINGO!", icon: <Crown size={24} className="text-orange-500" />, color: "bg-black border-2 border-orange-500 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-pulse scale-110" }
    };

    const lobbyColors = {
      1: "bg-orange-500 border-orange-400", 2: "bg-orange-600 border-orange-500", 3: "bg-red-500 border-red-400", 4: "bg-red-600 border-red-500",
      5: "bg-purple-500 border-purple-400", 6: "bg-purple-600 border-purple-500", 7: "bg-indigo-500 border-indigo-400", 8: "bg-indigo-600 border-indigo-500",
      9: "bg-yellow-400 border-yellow-300 text-black", 10: "bg-pink-500 border-pink-400", 11: "bg-pink-600 border-pink-500",
      12: "bg-gray-900 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
    };

    if (currentMode === 'full') {
        if (isFull) return { ...titles[12], lobbyColor: lobbyColors[12] };
        return { title: "SPELEND..", icon: <Grid3X3 size={16} className="opacity-50"/>, color: "bg-gray-50 border-gray-100", lobbyColor: "bg-white border-gray-50" };
    }

    const level = Math.min(rowCount, 12);
    return { ...(titles[level] || titles[0]), lobbyColor: lobbyColors[level] || "bg-white border-gray-50" };
  };

  const soloBranding = getBranding(bingoCount, marked.every(m => m), gameMode);

  if (loading) return <div className="p-20 text-center font-black text-orange-500 animate-pulse text-2xl uppercase italic">Laden...</div>;
  if (errorMsg) return <div className="h-screen flex items-center justify-center flex-col gap-4"><AlertTriangle size={48} className="text-red-500"/><p>{errorMsg}</p><button onClick={()=>navigate('/dashboard')} className="bg-black text-white px-4 py-2 rounded">Terug</button></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-center sm:text-left relative overflow-x-hidden">
      
      {/* SHUFFLE MODAL */}
      {showShuffleConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center border-4 border-orange-500 shadow-2xl animate-in zoom-in-95 duration-200">
            <Shuffle size={48} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase italic mb-2 text-gray-900">Kaart Husselen?</h2>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-8 leading-relaxed">
              Let op: Als je nu husselt, verlies je je aangekruiste vakjes en begin je opnieuw!
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowShuffleConfirm(false)} className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Annuleren</button>
              <button onClick={executeShuffle} className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">Ja, Husselen</button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQR && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowQR(false)}>
           <div className="bg-white p-8 rounded-[3rem] text-center shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
              <h2 className="text-3xl font-black text-gray-900 mb-6 uppercase italic">Scan om mee te doen!</h2>
              <div className="bg-white p-4 rounded-xl border-4 border-orange-500 inline-block mb-6">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.href}`} alt="QR Code" className="w-64 h-64 mix-blend-multiply" />
              </div>
              <p className="text-xl font-black text-gray-900">Code: <span className="text-orange-500 bg-orange-100 px-3 py-1 rounded-lg">{session?.join_code}</span></p>
           </div>
        </div>
      )}

      {/* KICK OVERLAY */}
      {isKickedLocal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center border-4 border-orange-500 shadow-2xl animate-in zoom-in">
            <UserMinus size={60} className="text-orange-600 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-black uppercase italic mb-2">Verbannen!</h2>
            <p className="text-gray-500 font-bold mb-8 uppercase text-xs italic">De host heeft je uit de lobby gezet.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="pt-8 px-6 pb-6 relative z-50">
        <div className="max-w-6xl mx-auto relative group">
          <div className="relative z-20 bg-gray-900 rounded-[2.5rem] px-6 py-6 md:px-10 md:py-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
               <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors">
                 <ChevronLeft size={24} />
               </button>
               <div className="text-left">
                 <h2 className="text-xl md:text-3xl font-black italic uppercase text-white">{card?.title || <span className="animate-pulse">Laden...</span>}</h2>
                 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                   {isMultiplayer ? `Code: ${session?.join_code}` : 'Solo Sessie'}
                   
                   {gameMode === 'hall' && <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-[8px]">ZAAL MODUS</span>}
                   {gameMode === 'rows' && sessionId && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] animate-in fade-in">RIJEN</span>}
                   {gameMode === 'full' && sessionId && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] animate-in fade-in">FULL CARD</span>}
                 </p>
               </div>
            </div>
            
            <div className="relative z-10 flex items-center gap-3 w-full md:w-auto justify-end">
              {isMultiplayer && (
                <>
                  <button onClick={() => setShowQR(true)} className="bg-gray-800 border border-gray-700 text-gray-300 p-2.5 rounded-xl hover:border-orange-500 hover:text-white transition-all"><QrCode size={20}/></button>
                  <button onClick={() => { navigator.clipboard.writeText(session?.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }} className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:border-orange-500 hover:text-white group">
                    <span className="text-[10px] opacity-50 uppercase tracking-wider hidden sm:inline group-hover:text-orange-500 transition-colors">Code:</span>
                    <span className="text-sm font-black text-white">{session?.join_code}</span>
                    {codeCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} className="group-hover:text-orange-500 transition-colors" />}
                  </button>
                </>
              )}
              
              {!isMultiplayer && isHost && (
                <button onClick={upgradeToGroupSession} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-900/20 active:scale-95"><Users size={18} /> <span className="hidden sm:inline">Start Groep</span></button>
              )}
              
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors">{copied ? <Check size={20} className="text-green-500" /> : <Share2 size={20} />}</button>

              {isHost && (
                <button onClick={() => navigate(`/setup/${card.id}/${sessionId}`)} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors" title="Instellingen aanpassen"><Settings size={20} /></button>
              )}
            </div>
          </div>
          
          <div className={`absolute left-0 right-0 z-10 w-full flex justify-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${bingoCount > 0 ? 'top-full -translate-y-4 opacity-100' : 'top-full -translate-y-[150%] opacity-0'}`}>
             <div className={`w-[90%] md:w-auto min-w-[300px] px-8 pt-6 pb-4 rounded-b-3xl rounded-t-lg shadow-2xl border-2 border-t-0 flex items-center justify-center gap-4 pointer-events-auto ${soloBranding.color || 'bg-orange-500 text-white border-orange-600'}`}>
                <div className="animate-bounce">{soloBranding.icon}</div>
                <span className="text-2xl font-black italic uppercase tracking-widest drop-shadow-sm">{soloBranding.title}</span>
                <div className="animate-bounce delay-75">{soloBranding.icon}</div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 mt-24">
        
        {/* === HOST HALL VIEW (HET NIEUWE TICKET DESIGN) === */}
        {gameMode === 'hall' && isHost ? (
           <div className="w-full max-w-6xl mx-auto -mt-24 relative z-20 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6">
                  
                  {/* LEFT COLUMN: ACTION AREA */}
                  <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border-4 border-purple-500 overflow-hidden relative min-h-[400px] flex flex-col">
                      <div className="bg-purple-500 p-3 text-center border-b border-purple-400">
                          <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-base">
                              {currentDraw ? "ON AIR" : "LOBBY FASE"}
                          </h2>
                      </div>
                      
                      <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center text-center">
                          {!currentDraw ? (
                              // LOBBY STATE
                              <div className="animate-in zoom-in">
                                  <Users className="text-purple-200 w-24 h-24 mx-auto mb-4" />
                                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase italic mb-2">Wachten op spelers...</h2>
                                  <p className="text-gray-400 font-bold uppercase tracking-widest mb-8">Deel de QR Code rechts</p>
                                  <button onClick={handleHostDraw} className="bg-purple-600 text-white px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-purple-500 hover:scale-105 transition-all shadow-xl shadow-purple-200">
                                      <Play fill="currentColor" className="inline-block mr-2 mb-1" size={20}/> Start Spel
                                  </button>
                              </div>
                          ) : (
                              // GAME STATE
                              <div className="w-full h-full flex flex-col justify-center animate-in zoom-in">
                                  <span className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Huidig Getrokken Item</span>
                                  <div className="text-5xl md:text-7xl font-black text-gray-900 uppercase italic leading-tight py-4 break-words">
                                      {currentDraw}
                                  </div>
                                  <div className="mt-8">
                                      <button onClick={handleHostDraw} className="bg-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg active:scale-95">
                                          Trek Volgende
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* RIGHT COLUMN: CONNECTION INFO (ALWAYS VISIBLE) */}
                  <div className="w-full lg:w-96 bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 text-white flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                      
                      <h3 className="text-xl font-black italic uppercase mb-6 relative z-10">Scan & Join</h3>
                      <div className="bg-white p-4 rounded-2xl mb-6 relative z-10">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.href}`} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                      </div>
                      
                      <div className="w-full bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Code</p>
                          <p className="text-3xl font-black text-white tracking-widest">{session?.join_code}</p>
                      </div>

                      <div className="w-full flex items-center justify-between px-4">
                          <div className="flex items-center gap-2">
                              <Smartphone size={16} className="text-purple-400"/>
                              <span className="text-sm font-bold">Spelers:</span>
                          </div>
                          <span className="text-2xl font-black text-purple-400">{displayParticipants.length}</span>
                      </div>
                  </div>

              </div>
           </div>
        ) : (
          /* === NORMALE SPELER VIEW === */
          <div className="flex-1 w-full max-w-[600px] flex flex-col items-center">
            
            {/* SPELER MELDING IN HALL MODUS */}
            {gameMode === 'hall' && (
               <div className="w-full bg-purple-600 text-white p-6 rounded-3xl mb-8 shadow-xl text-center border-4 border-purple-400 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400 rounded-full blur-[50px] opacity-50"></div>
                  <p className="font-black text-xs uppercase tracking-widest mb-2 opacity-80 relative z-10">Kijk naar het grote scherm!</p>
                  <p className="text-3xl font-black italic uppercase relative z-10">{currentDraw || "Wachten..."}</p>
               </div>
            )}

            <div className="w-full flex justify-between items-end mb-3 px-2">
              <div className="flex items-center gap-2 text-gray-400">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                   {Math.max(0, marked.filter(Boolean).length - 1)}/24
                 </span>
              </div>
              <button onClick={handleShuffleClick} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-colors">
                <Shuffle size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                Kaart Husselen
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full">
              {grid.map((text, index) => {
                const isLong = text && text.length > 25;
                const isVeryLong = text && text.length > 40;
                return (
                  <button key={index} onClick={() => toggleTile(index)} className={`relative aspect-square flex items-center justify-center p-1 sm:p-2 text-center rounded-2xl transition-all border-2 font-black uppercase overflow-hidden ${index === 12 || marked[index] ? 'bg-orange-500 text-white border-orange-400 scale-95 shadow-inner' : 'bg-white text-gray-800 border-gray-100 hover:border-orange-200'}`}>
                    <span className={`leading-[1.1] tracking-tight break-words hyphens-auto w-full select-none ${index === 12 ? 'text-[8px] sm:text-[10px]' : isVeryLong ? 'text-[7px] sm:text-[9px]' : isLong ? 'text-[8px] sm:text-[10px]' : 'text-[9px] sm:text-xs'}`}>
                      {index === 12 ? "PINGO FREE" : text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LOBBY (NIET ZICHTBAAR VOOR HOST IN HALL MODUS) */}
        {sessionId && session?.join_code && !session.join_code.startsWith('SOLO') && !(isHost && gameMode === 'hall') && (
          <div className="w-full lg:w-96 shrink-0 animate-in slide-in-from-right duration-700">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl border border-white/50 sticky top-32">
              <div className="flex items-center justify-between mb-6 pl-2">
                 <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 italic uppercase">
                   <Users className="text-orange-500" size={24} /> 
                   Lobby <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-sm not-italic ml-1">{displayParticipants.length} / {session.max_players || 50}</span>
                 </h3>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto p-4 -mx-4 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }`}</style>
                {displayParticipants.map((p, i) => { 
                  const pMarkedCount = p.marked_indices?.length || 0;
                  const pIsFull = pMarkedCount === 25;
                  const tempGrid = new Array(25).fill(false);
                  if (p.marked_indices) p.marked_indices.forEach(idx => { if (idx < 25) tempGrid[idx] = true; });
                  const pRowCount = checkBingoRows(tempGrid);
                  const pBranding = getBranding(pRowCount, pIsFull, gameMode);
                  const hasSomeBingo = (gameMode === 'rows' && pRowCount > 0) || pIsFull;

                  return (
                    <div key={p.id} className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden 
                        ${pIsFull 
                            ? `${pBranding.lobbyColor} scale-[1.03] z-10` 
                            : hasSomeBingo
                                ? `${pBranding.lobbyColor} text-white shadow-md scale-[1.02]`
                                : 'bg-white border-gray-50 hover:border-orange-100 hover:shadow-md'
                        }
                    `}>
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm 
                            ${pIsFull 
                                ? 'bg-orange-500 text-white' 
                                : hasSomeBingo 
                                    ? 'bg-white/20 text-white backdrop-blur-sm' 
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors'
                            }
                        `}>
                          {p.user_name?.charAt(0).toUpperCase()}
                        </div>
                        {p.user_id === session?.host_id && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 p-0.5 rounded-full border-2 border-white shadow-sm z-10">
                            <Crown size={10} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-12 relative">
                        <div className="flex justify-between items-center mb-0.5">
                           <span className={`font-black text-xs uppercase truncate ${pIsFull ? 'text-orange-500' : (hasSomeBingo ? 'text-white' : 'text-gray-700')}`}>
                               {p.user_name}
                           </span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest truncate flex items-center gap-1 ${pIsFull ? 'text-orange-400 animate-pulse' : (hasSomeBingo ? 'text-white/90' : 'text-gray-300 group-hover:text-orange-400 transition-colors')}`}>{hasSomeBingo ? (<>{pBranding.icon} {pBranding.title}</>) : 'Spelend...'}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end w-16 h-full">
                           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all duration-300 transform group-hover:-translate-x-8 ${pIsFull ? 'bg-orange-500 text-white' : (hasSomeBingo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400')}`}>{(pMarkedCount > 0 ? pMarkedCount - 1 : 0)}/24</span>
                           {isHost && p.user_id !== currentUserIdState && (
                             <button onClick={() => kickParticipant(p.id, p.user_id)} className={`absolute right-0 p-1.5 rounded-lg transition-all duration-300 transform translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 ${hasSomeBingo ? 'text-white/70 hover:bg-white/20 hover:text-white' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'} `} title="Verwijder speler"><UserMinus size={14} /></button>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}