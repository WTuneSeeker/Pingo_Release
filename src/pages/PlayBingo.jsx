import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Sparkles, Trophy, Share2, 
  Zap, Rocket, Crown, Flame, Star, Ghost, Gem, PartyPopper, 
  Users, UserMinus, Copy, Check, Info, Grid3X3, Shuffle, X
} from 'lucide-react';

export default function PlayBingo() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [card, setCard] = useState(null);
  const [grid, setGrid] = useState([]);
  const [marked, setMarked] = useState(new Array(25).fill(false));
  const [loading, setLoading] = useState(true);
  const [bingoCount, setBingoCount] = useState(0); 
  const [gameMode, setGameMode] = useState('rows'); 
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modals & Overlays
  const [isKickedLocal, setIsKickedLocal] = useState(false);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  
  // REFS
  const myParticipantIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const previousModeRef = useRef('rows');
  const [currentUserIdState, setCurrentUserIdState] = useState(null);

  const isHost = session?.host_id === currentUserIdState;

  // 1. AUTH & INIT
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserIdRef.current = user.id;
        setCurrentUserIdState(user.id);
      }
      await fetchData();
    };
    init();
  }, [id, sessionId]);

  // 2. HEARTBEAT ❤️ (NIEUW: Houdt je status 'Online')
  useEffect(() => {
    if (!sessionId) return;

    // Elke 60 seconden sturen we een signaal naar de DB dat we nog actief zijn
    const heartbeatInterval = setInterval(async () => {
      if (myParticipantIdRef.current) {
        await supabase
          .from('session_participants')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', myParticipantIdRef.current);
      }
    }, 60000); // 1 minuut

    return () => clearInterval(heartbeatInterval);
  }, [sessionId]);

  // 3. REALTIME LISTENER
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`room_live_${sessionId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'bingo_sessions', 
        filter: `id=eq.${sessionId}` 
      }, (payload) => {
        if (payload.new && payload.new.game_mode) {
          const newMode = payload.new.game_mode;
          if (previousModeRef.current !== newMode) {
             setGameMode(newMode);
             previousModeRef.current = newMode;
             resetLocalBoard(); 
          }
        }
        if (payload.new?.banned_users && currentUserIdRef.current) {
          if (payload.new.banned_users.includes(currentUserIdRef.current)) {
            triggerKickSequence();
          }
        }
      })
      .on('postgres_changes', { 
        event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` 
      }, (payload) => {
        if (payload.eventType === 'DELETE' && payload.old.id === myParticipantIdRef.current) {
          triggerKickSequence();
        } else {
          if (payload.eventType !== 'DELETE') fetchParticipants(sessionId);
          else setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('broadcast', { event: 'kick_user' }, (payload) => {
        if (payload.payload.userId === currentUserIdRef.current) {
          triggerKickSequence();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      if (sessionId) {
        const { data: sessionData, error } = await supabase
          .from('bingo_sessions').select('*, bingo_cards(*)').eq('id', sessionId).single();
        
        if (error || !sessionData) throw new Error("Geen sessie");

        setSession(sessionData);
        setGameMode(sessionData.game_mode || 'rows');
        previousModeRef.current = sessionData.game_mode || 'rows';
        
        setCard(sessionData.bingo_cards);
        generateGrid(sessionData.bingo_cards.items);
        
        if (currentUserIdRef.current && sessionData.banned_users?.includes(currentUserIdRef.current)) {
          triggerKickSequence();
          return;
        }

        await joinSession(sessionData.id);
      } else {
        const { data: cardData } = await supabase.from('bingo_cards').select('*').eq('id', id).single();
        setCard(cardData);
        generateGrid(cardData.items);
      }
    } catch (e) { 
      setErrorMessage("Laden mislukt."); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchParticipants = async (sId) => {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sId)
      .order('updated_at', { ascending: false });
    
    if (data) setParticipants(data);
  };

  const joinSession = async (sId) => {
    if (!currentUserIdRef.current) return;
    
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUserIdRef.current).single();
    const { data: { user } } = await supabase.auth.getUser();
    const displayName = profile?.username || user?.email?.split('@')[0] || 'Speler';
    
    const { data } = await supabase.from('session_participants').upsert({
      session_id: sId, 
      user_id: currentUserIdRef.current, 
      user_name: displayName, 
      marked_indices: [12], 
      updated_at: new Date().toISOString()
    }, { onConflict: 'session_id, user_id' }).select().single();
    
    if (data) { 
      myParticipantIdRef.current = data.id;
      fetchParticipants(sId);
    }
  };

  // --- ACTIONS ---
  const startGroupSession = async () => {
    const joinCode = `P-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    if (!currentUserIdRef.current) return;
    
    const { data } = await supabase.from('bingo_sessions')
      .insert([{ host_id: currentUserIdRef.current, card_id: id, join_code: joinCode }])
      .select().single();
      
    if (data) navigate(`/play-session/${data.id}`);
  };

  const updateGameMode = async (mode) => {
    if (!isHost) return;
    await supabase.from('bingo_sessions').update({ game_mode: mode }).eq('id', sessionId);
  };

  const resetLocalBoard = async () => {
    const initial = new Array(25).fill(false);
    initial[12] = true;
    setMarked(initial);
    setBingoCount(0);

    if (sessionId && myParticipantIdRef.current) {
      await supabase.from('session_participants').update({ 
        marked_indices: [12], 
        has_bingo: false,
        updated_at: new Date().toISOString()
      }).eq('id', myParticipantIdRef.current);
    }
  };

  // --- SHUFFLE LOGICA ---
  const handleShuffleClick = () => {
    const markedCount = marked.filter(Boolean).length;
    const realMarks = marked[12] ? markedCount - 1 : markedCount;

    if (realMarks > 0) {
      setShowShuffleConfirm(true);
    } else {
      executeShuffle();
    }
  };

  const executeShuffle = () => {
    if (card && card.items) {
      generateGrid(card.items);
      setShowShuffleConfirm(false); 
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
  const generateGrid = (items) => {
    const shuffled = [...items].sort(() => 0.5 - Math.random()).slice(0, 24);
    shuffled.splice(12, 0, "FREE SPACE");
    setGrid(shuffled);
    
    const initial = new Array(25).fill(false);
    initial[12] = true;
    setMarked(initial);
    setBingoCount(0);
  };

  const checkBingoRows = (currentMarked) => {
    const wins = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
      [0,6,12,18,24],[4,8,12,16,20]
    ];
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
      
      await supabase.from('session_participants').update({ 
        marked_indices: activeIndices, 
        has_bingo: (gameMode === 'rows' ? rowCount >= 1 : newMarked.every(m => m)),
        updated_at: new Date().toISOString()
      }).eq('id', myParticipantIdRef.current);
    }
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
      1: "bg-orange-500 border-orange-400",
      2: "bg-orange-600 border-orange-500",
      3: "bg-red-500 border-red-400",
      4: "bg-red-600 border-red-500",
      5: "bg-purple-500 border-purple-400",
      6: "bg-purple-600 border-purple-500",
      7: "bg-indigo-500 border-indigo-400",
      8: "bg-indigo-600 border-indigo-500",
      9: "bg-yellow-400 border-yellow-300 text-black",
      10: "bg-pink-500 border-pink-400",
      11: "bg-pink-600 border-pink-500",
      12: "bg-gray-900 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
    };

    if (currentMode === 'full') {
        if (isFull) return { ...titles[12], lobbyColor: lobbyColors[12] };
        return { title: "SPELEND..", icon: <Grid3X3 size={16} className="opacity-50"/>, color: "bg-gray-50 border-gray-100", lobbyColor: "bg-white border-gray-50" };
    }

    const level = Math.min(rowCount, 12);
    if (isFull) return { ...titles[12], lobbyColor: lobbyColors[12] };
    
    return { 
      ...titles[level] || titles[0], 
      lobbyColor: lobbyColors[level] || "bg-white border-gray-50"
    };
  };

  const soloBranding = getBranding(bingoCount, marked.every(m => m), 'rows');

  if (loading) return <div className="p-20 text-center font-black text-orange-500 animate-pulse text-2xl uppercase italic">Laden...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-center sm:text-left relative overflow-x-hidden">
      
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

      {/* SHUFFLE POPUP */}
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

      {/* --- HEADER WRAPPER --- */}
      <div className="pt-8 px-6 pb-6 relative z-50">
        <div className="max-w-6xl mx-auto relative group">
          
          {/* 1. DE HEADER BALK */}
          <div className="relative z-20 bg-gray-900 rounded-[2.5rem] px-6 py-6 md:px-10 md:py-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden">
            
            {/* Achtergrond Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

            {/* Links */}
            <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
               <button onClick={() => navigate(-1)} className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors">
                 <ChevronLeft size={24} />
               </button>
               <div className="text-left">
                 <h2 className="text-xl md:text-3xl font-black italic uppercase text-white tracking-tight leading-none">
                   {card?.title || <span className="animate-pulse">Laden...</span>}
                 </h2>
                 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                   <span className="text-orange-500">P</span>ingo Play Room
                 </p>
               </div>
            </div>

            {/* Rechts */}
            <div className="relative z-10 flex items-center gap-3 w-full md:w-auto justify-end">
              {sessionId && (
                <button 
                  onClick={() => { navigator.clipboard.writeText(session?.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                  className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:border-orange-500 hover:text-white transition-all active:scale-95 group"
                >
                  <span className="text-[10px] opacity-50 uppercase tracking-wider hidden sm:inline group-hover:text-orange-500 transition-colors">Code:</span>
                  <span className="text-sm font-black text-white">{session?.join_code}</span>
                  {codeCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} className="group-hover:text-orange-500 transition-colors" />}
                </button>
              )}
              {!sessionId && (
                <button onClick={startGroupSession} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-900/20 active:scale-95">
                  <Users size={18} /> <span className="hidden sm:inline">Start Groep</span>
                </button>
              )}
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors">
                {copied ? <Check size={20} className="text-green-500" /> : <Share2 size={20} />}
              </button>
            </div>
          </div>

          {/* 2. DE SLIDING NOTIFICATIE */}
          <div className={`
              absolute left-0 right-0 z-10 w-full flex justify-center pointer-events-none
              transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
              ${!sessionId && bingoCount > 0 
                  ? 'top-full -translate-y-5 opacity-100' 
                  : 'top-full -translate-y-[150%] opacity-0' 
               }
          `}>
             <div className={`
                w-[90%] md:w-auto min-w-[300px] px-8 pt-10 pb-3 rounded-b-3xl rounded-t-lg shadow-2xl border-2 border-t-0
                flex items-center justify-center gap-4 pointer-events-auto
                ${soloBranding.color || 'bg-orange-500 text-white border-orange-600'}
             `}>
                <div className="animate-bounce">{soloBranding.icon}</div>
                <span className="text-2xl font-black italic uppercase tracking-widest drop-shadow-sm">{soloBranding.title}</span>
                <div className="animate-bounce delay-75">{soloBranding.icon}</div>
             </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 mt-4">
        <div className="flex-1 w-full max-w-[600px] flex flex-col items-center">
          
          <div className="text-center mb-6 w-full">
            {/* MULTIPLAYER CONTROLS */}
            {sessionId && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full">
                  {isHost ? (
                    <div className="flex justify-center gap-3">
                      <button onClick={() => updateGameMode('rows')} className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${gameMode === 'rows' ? 'bg-orange-500 text-white shadow-lg scale-105 ring-4 ring-orange-200' : 'bg-white text-gray-400 border border-gray-100'}`}>Rijen Mode</button>
                      <button onClick={() => updateGameMode('full')} className={`px-6 py-3 rounded-2xl font-black text-xs transition-all ${gameMode === 'full' ? 'bg-orange-500 text-white shadow-lg scale-105 ring-4 ring-orange-200' : 'bg-white text-gray-400 border border-gray-100'}`}>Volle Kaart</button>
                    </div>
                  ) : (
                    <div className="bg-orange-50 text-orange-700 px-6 py-2 rounded-full inline-flex items-center gap-2 border border-orange-200 shadow-sm animate-in fade-in">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase italic tracking-widest">Live Mode: {gameMode === 'rows' ? 'Rijen' : 'Volle Kaart'}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                  <Info size={14}/>
                   {gameMode === 'rows' ? 'Win met horizontale/verticale rijen!' : 'Alleen VOLLE KAART telt!'}
                </div>
              </div>
            )}
          </div>

          {/* --- SHUFFLE BAR --- */}
          <div className="w-full flex justify-between items-end mb-3 px-2">
            <div className="flex items-center gap-2 text-gray-400">
               <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                 {marked.filter(Boolean).length - 1}/24
               </span>
            </div>
            
            <button 
              onClick={handleShuffleClick} 
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-colors"
            >
              <Shuffle size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              Kaart Husselen
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full">
            {grid.map((text, index) => {
              const isLong = text && text.length > 25;
              const isVeryLong = text && text.length > 40;

              return (
                <button 
                  key={index} 
                  onClick={() => toggleTile(index)} 
                  className={`relative aspect-square flex items-center justify-center p-1 sm:p-2 text-center rounded-2xl transition-all border-2 font-black uppercase overflow-hidden ${index === 12 || marked[index] ? 'bg-orange-500 text-white border-orange-400 scale-95 shadow-inner' : 'bg-white text-gray-800 border-gray-100 hover:border-orange-200'}`}
                >
                  <span className={`leading-[1.1] tracking-tight break-words hyphens-auto w-full select-none 
                    ${index === 12 
                      ? 'text-[8px] sm:text-[10px]' 
                      : isVeryLong 
                        ? 'text-[7px] sm:text-[9px]' 
                        : isLong 
                          ? 'text-[8px] sm:text-[10px]' 
                          : 'text-[9px] sm:text-xs'
                    }`}
                  >
                    {index === 12 ? "PINGO FREE" : text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LOBBY */}
        {sessionId && (
          <div className="w-full lg:w-96 shrink-0 animate-in slide-in-from-right duration-700">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl border border-white/50 sticky top-32">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pl-2">
                 <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 italic uppercase">
                   <Users className="text-orange-500" size={24} /> 
                   Lobby <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-sm not-italic ml-1">{participants.length}</span>
                 </h3>
              </div>
              
              {/* Scroll Container */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto p-4 -mx-4 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }`}</style>
                {participants.map((p, i) => {
                  const pMarkedCount = p.marked_indices?.length || 0;
                  const pIsFull = pMarkedCount === 25;
                  
                  const tempGrid = new Array(25).fill(false);
                  p.marked_indices?.forEach(idx => tempGrid[idx] = true);
                  const pRowCount = checkBingoRows(tempGrid);
                  
                  const pBranding = getBranding(pRowCount, pIsFull, gameMode);
                  const hasSomeBingo = (gameMode === 'rows' && pRowCount > 0) || pIsFull;

                  return (
                    <div key={i} className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all duration-300 
                        ${pIsFull 
                            ? `${pBranding.lobbyColor} scale-[1.03] z-10` // FULL BINGO (Dark Mode Style)
                            : hasSomeBingo
                                ? `${pBranding.lobbyColor} text-white shadow-md scale-[1.02]` // GEWONE BINGO (Kleur van de rank)
                                : 'bg-white border-gray-50 hover:border-orange-100 hover:shadow-md' // GEEN BINGO (Wit)
                        }
                    `}>
                      
                      {/* Avatar */}
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                           <span className={`font-black text-xs uppercase truncate ${pIsFull ? 'text-orange-500' : (hasSomeBingo ? 'text-white' : 'text-gray-700')}`}>
                               {p.user_name}
                           </span>
                           {/* Score Badge */}
                           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${pIsFull ? 'bg-orange-500 text-white' : (hasSomeBingo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400')}`}>
                             {(pMarkedCount > 0 ? pMarkedCount - 1 : 0)}/24
                           </span>
                        </div>
                        
                        {/* Status Text */}
                        <span className={`text-[9px] font-black uppercase tracking-widest truncate flex items-center gap-1 ${pIsFull ? 'text-orange-400 animate-pulse' : (hasSomeBingo ? 'text-white/90' : 'text-gray-300 group-hover:text-orange-400 transition-colors')}`}>
                           {hasSomeBingo ? (
                               <>{pBranding.icon} {pBranding.title}</>
                           ) : 'Spelend...'}
                        </span>
                      </div>

                      {/* Kick Button */}
                      {isHost && p.user_id !== currentUserIdState && (
                        <button 
                          onClick={() => kickParticipant(p.id, p.user_id)} 
                          className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${hasSomeBingo ? 'text-white/70 hover:bg-white/20 hover:text-white' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'}`}
                          title="Verwijder speler"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
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