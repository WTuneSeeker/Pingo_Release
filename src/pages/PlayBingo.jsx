import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Sparkles, Trophy, Share2, 
  Zap, Rocket, Crown, Flame, Star, Ghost, Gem, PartyPopper, 
  Users, UserMinus, Copy, Check, Info, Grid3X3, Hash
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
  
  const [isKickedLocal, setIsKickedLocal] = useState(false);
  const [copied, setCopied] = useState(false); // Voor de share knop
  const [codeCopied, setCodeCopied] = useState(false); // Specifiek voor de navbar code

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

  // 2. REALTIME LISTENER
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

  const kickParticipant = async (pId, userId) => {
    setParticipants(prev => prev.filter(p => p.id !== pId)); // Optimistic UI
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
      1: { title: "BINGO!", icon: <Trophy size={24} />, color: "bg-orange-500 text-white shadow-xl scale-105 border-orange-400" },
      2: { title: "DUBBEL!", icon: <Zap size={24} />, color: "bg-orange-600 text-white shadow-xl scale-105 border-orange-500" },
      3: { title: "TRIPPEL!", icon: <Rocket size={24} />, color: "bg-red-500 text-white shadow-xl scale-105 border-red-400" },
      4: { title: "QUADRA!", icon: <Flame size={24} />, color: "bg-red-600 text-white shadow-xl scale-105 border-red-500" },
      5: { title: "SUPER!", icon: <Star size={24} />, color: "bg-purple-500 text-white shadow-xl scale-105 border-purple-400" },
      6: { title: "ULTRA!", icon: <Sparkles size={24} />, color: "bg-purple-600 text-white shadow-xl scale-105 border-purple-500" },
      7: { title: "HYPER!", icon: <Zap size={24} />, color: "bg-indigo-500 text-white shadow-xl scale-105 border-indigo-400" },
      8: { title: "INSANE!", icon: <Ghost size={24} />, color: "bg-indigo-600 text-white shadow-xl scale-105 border-indigo-500" },
      9: { title: "GODLY!", icon: <Crown size={24} />, color: "bg-yellow-400 text-black shadow-xl scale-105 border-yellow-300" },
      10: { title: "MYSTICAL!", icon: <Gem size={24} />, color: "bg-pink-500 text-white shadow-xl scale-105 border-pink-400" },
      11: { title: "CELESTIAL!", icon: <PartyPopper size={24} />, color: "bg-pink-600 text-white shadow-xl scale-105 border-pink-500" },
      12: { title: "FULL BINGO!", icon: <Crown size={24} className="text-orange-500" />, color: "bg-black border-2 border-orange-500 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-pulse scale-110" }
    };

    if (currentMode === 'full') {
        if (isFull) return titles[12];
        return { title: "SPELEND..", icon: <Grid3X3 size={16} className="opacity-50"/>, color: "bg-gray-50 border-gray-100" };
    }

    if (isFull) return titles[12];
    return titles[Math.min(rowCount, 11)] || titles[0];
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

      {/* NAVBAR */}
      <div className="bg-white border-b py-4 mb-8 sticky top-0 z-50 shadow-sm px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate(-1)}><ChevronLeft size={28} /></button>
          <h2 className="text-xl font-black italic uppercase"><span className="text-orange-500">P</span>ingo Play</h2>
          
          <div className="flex gap-3 items-center">
            
            {/* LOBBY CODE (ALLEEN IN SESSIE) */}
            {sessionId && (
              <button 
                onClick={() => { navigator.clipboard.writeText(session?.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                className="bg-gray-100 border-2 border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 transition-all active:scale-95"
              >
                <span className="text-[10px] opacity-50 uppercase tracking-wider hidden sm:inline">Code:</span>
                <span className="text-sm font-black">{session?.join_code}</span>
                {codeCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
              </button>
            )}

            {/* GROEP BUTTON (ALLEEN IN SOLO) */}
            {!sessionId && (
              <button onClick={startGroupSession} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-100 transition shadow-sm border border-orange-100">
                <Users size={18} /> Groep
              </button>
            )}
            
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="text-green-500" /> : <Share2 className="text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12">
        <div className="flex-1 w-full max-w-[600px] flex flex-col items-center">
          <div className="text-center mb-8 w-full">
            <h1 className="text-4xl font-black text-gray-900 italic uppercase mb-4 tracking-tighter leading-none">{card?.title}</h1>
            
            {/* --- SOLO BINGO POPUP BALK --- */}
            {!sessionId && bingoCount > 0 && (
              <div className="w-full mb-6 animate-in zoom-in slide-in-from-top-4 duration-500">
                <div className={`p-5 rounded-3xl flex items-center justify-center gap-4 shadow-2xl transition-all duration-300 border-2 ${soloBranding.color || 'bg-orange-500 text-white border-orange-400'}`}>
                   <div className="animate-bounce">{soloBranding.icon}</div>
                   <span className="text-3xl font-black tracking-widest uppercase italic leading-none">{soloBranding.title}</span>
                   <div className="animate-bounce delay-75">{soloBranding.icon}</div>
                </div>
              </div>
            )}

            {/* MULTIPLAYER CONTROLS */}
            {sessionId && (
              <div className="flex flex-col items-center gap-6">
                
                {/* GAME MODE SWITCHER */}
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

          <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full">
            {grid.map((text, index) => (
              <button key={index} onClick={() => toggleTile(index)} className={`relative aspect-square flex items-center justify-center p-2 text-center rounded-2xl transition-all border-2 font-black uppercase ${index === 12 || marked[index] ? 'bg-orange-500 text-white border-orange-400 scale-95 shadow-inner' : 'bg-white text-gray-800 border-gray-100 hover:border-orange-200'}`}>
                <span className={`leading-tight tracking-tighter line-clamp-3 ${index === 12 ? 'text-[8px] sm:text-[10px]' : 'text-[9px] sm:text-[13px]'}`}>{index === 12 ? "PINGO FREE" : text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LOBBY */}
        {sessionId && (
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-orange-50 sticky top-28 overflow-visible">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 italic uppercase mb-6"><Users className="text-orange-500" /> Lobby ({participants.length})</h3>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto overflow-x-visible no-scrollbar pt-6 px-1" style={{ scrollbarWidth: 'none' }}>
                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                {participants.map((p, i) => {
                  const pMarkedCount = p.marked_indices?.length || 0;
                  const pIsFull = pMarkedCount === 25;
                  
                  const tempGrid = new Array(25).fill(false);
                  p.marked_indices?.forEach(idx => tempGrid[idx] = true);
                  const pRowCount = checkBingoRows(tempGrid);
                  
                  const pBranding = getBranding(pRowCount, pIsFull, gameMode);
                  const shouldPing = (gameMode === 'rows' && pRowCount > 0) || pIsFull;

                  return (
                    <div key={i} className={`relative flex flex-col p-4 rounded-3xl border-2 transition-all duration-500 ${shouldPing ? 'ring-2 ring-orange-200 shadow-lg scale-[1.02]' : ''} ${pBranding.color || (shouldPing ? 'bg-orange-500 border-orange-400 text-white' : 'bg-gray-50 border-transparent shadow-sm')}`}>
                      
                      <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full font-black text-[10px] border shadow-md z-[60] ${pIsFull ? 'bg-orange-600 text-white border-orange-400' : 'bg-white text-orange-500 border-orange-100'}`}>
                        {(pMarkedCount > 0 ? pMarkedCount - 1 : 0)}/24
                      </div>
                      
                      <div className="flex items-center gap-3 overflow-visible text-left">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-sm ${pIsFull ? 'bg-orange-500 text-black' : 'bg-white text-orange-500 border border-orange-50'}`}>{p.user_name?.charAt(0).toUpperCase()}</div>
                          {p.user_id === session?.host_id && <div className="absolute -top-1 -right-1 bg-yellow-400 text-white p-1 rounded-full border-2 border-white shadow-md z-40"><Crown size={12} fill="currentColor" /></div>}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className={`font-black text-xs uppercase truncate flex items-center gap-1.5 ${shouldPing ? 'text-white' : 'text-gray-700'}`}>{p.user_name}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1 ${shouldPing ? 'text-orange-100' : 'text-orange-500'}`}>
                             {pBranding.icon} {pBranding.title}
                          </span>
                        </div>
                        {isHost && p.user_id !== currentUserIdState && (
                          <button onClick={() => kickParticipant(p.id, p.user_id)} className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg text-gray-300 transition-all flex-shrink-0"><UserMinus size={16} /></button>
                        )}
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