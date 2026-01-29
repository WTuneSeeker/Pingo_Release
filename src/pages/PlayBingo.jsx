import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Sparkles, Trophy, Crown, 
  Grid3X3, Settings, QrCode, Copy, Check, Share2, AlertOctagon, X, User, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Views
import HallHostView from '../components/game_modes/HallHostView';
import PlayerView from '../components/game_modes/PlayerView';

export default function PlayBingo() {
  const { sessionId } = useParams(); // We gebruiken sessionId voor alles
  const navigate = useNavigate();

  // --- GLOBAL STATE ---
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('initializing'); // 'initializing', 'input_name', 'playing'
  
  // --- USER DATA ---
  const [myId, setMyId] = useState(null); // Dit is óf Auth ID óf Guest ID
  const [myName, setMyName] = useState(''); // De naam die we tonen/invullen
  
  // --- GAME DATA ---
  const [session, setSession] = useState(null);
  const [card, setCard] = useState(null);
  const [grid, setGrid] = useState([]);
  const [marked, setMarked] = useState(new Array(25).fill(false));
  const [participants, setParticipants] = useState([]);
  const [drawnItems, setDrawnItems] = useState([]);
  const [currentDraw, setCurrentDraw] = useState(null);
  
  // --- SETTINGS ---
  const [gameMode, setGameMode] = useState('rows');
  const [winPattern, setWinPattern] = useState('1line');
  
  // --- UI FLAGS ---
  const [winner, setWinner] = useState(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [isFalseBingo, setIsFalseBingo] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [verificationClaim, setVerificationClaim] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Refs voor state in event listeners
  const myParticipantIdRef = useRef(null);
  const myIdRef = useRef(null);

  // ---------------------------------------------------------
  // 1. INITIALISATIE (Wie ben ik?)
  // ---------------------------------------------------------
  useEffect(() => {
    const identifyUser = async () => {
        // A. Ben ik ingelogd (Host/User)?
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            setMyId(user.id);
            myIdRef.current = user.id;
            // Haal naam op uit profiel
            const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
            setMyName(profile?.username || 'Host');
            // Ga direct door naar laden
            loadGameData(sessionId, user.id);
            return;
        }

        // B. Ben ik een bestaande gast?
        const storedGuestId = localStorage.getItem('pingo_guest_id');
        const storedGuestName = localStorage.getItem('pingo_guest_name');

        if (storedGuestId && storedGuestName) {
            setMyId(storedGuestId);
            myIdRef.current = storedGuestId;
            setMyName(storedGuestName);
            // Ga direct door naar laden
            loadGameData(sessionId, storedGuestId);
        } else {
            // C. Ik ben nieuw -> Toon input scherm
            setLoading(false);
            setViewState('input_name');
        }
    };
    identifyUser();
  }, [sessionId]);

  // ---------------------------------------------------------
  // 2. SPEL DATA LADEN & JOINEN
  // ---------------------------------------------------------
  const loadGameData = async (sId, userId) => {
      setLoading(true);
      try {
          // Haal sessie op
          const { data: sData, error } = await supabase.from('bingo_sessions').select('*, bingo_cards(*)').eq('id', sId).single();
          if (error || !sData) throw new Error("Sessie niet gevonden");

          setSession(sData);
          setCard(sData.bingo_cards);
          setGameMode(sData.game_mode);
          setWinPattern(sData.win_pattern || '1line');
          setCurrentDraw(sData.current_draw);
          setDrawnItems(sData.drawn_items || []);
          if(sData.status === 'finished') {
              setWinner(sData.winner_name);
              setShowWinnerPopup(true);
          }

          // Join de lobby (als speler)
          const isHost = sData.host_id === userId;
          if (!(sData.game_mode === 'hall' && isHost)) {
              await ensureParticipantInDb(sId, userId, sData.bingo_cards.items);
          }

          // Start Realtime
          fetchParticipants(sId);
          setViewState('playing');
      } catch (err) {
          console.error(err);
          setErrorMsg("Kon spel niet laden.");
      } finally {
          setLoading(false);
      }
  };

  // Deze functie zorgt dat je ECHT in de DB staat
  const ensureParticipantInDb = async (sId, uId, items) => {
      // 1. Check of we er al zijn
      const { data: existing } = await supabase.from('session_participants').select('*').eq('session_id', sId).eq('user_id', uId).maybeSingle();

      const localGrid = JSON.parse(localStorage.getItem(`grid_${sId}_${uId}`) || 'null');
      
      if (existing) {
          // Restore
          myParticipantIdRef.current = existing.id;
          if(existing.grid_snapshot) {
              setGrid(existing.grid_snapshot);
              localStorage.setItem(`grid_${sId}_${uId}`, JSON.stringify(existing.grid_snapshot));
          } else {
              // Genereer alsnog als het mist
              const g = generateGrid(items);
              setGrid(g);
              await supabase.from('session_participants').update({ grid_snapshot: g }).eq('id', existing.id);
          }
          
          if(existing.marked_indices) {
              const nm = new Array(25).fill(false);
              existing.marked_indices.forEach(i => nm[i] = true);
              setMarked(nm);
              setBingoCount(calculateBingo(nm));
          }
      } else {
          // Insert Nieuw
          const g = generateGrid(items);
          setGrid(g);
          localStorage.setItem(`grid_${sId}_${uId}`, JSON.stringify(g));
          
          // Haal naam op uit state (of localStorage voor zekerheid)
          const nameToUse = myName || localStorage.getItem('pingo_guest_name') || 'Speler';

          const { data: newP, error } = await supabase.from('session_participants').insert({
              session_id: sId,
              user_id: uId,
              user_name: nameToUse,
              grid_snapshot: g,
              marked_indices: [12], // Free space
              has_bingo: false
          }).select().single();

          if(newP) myParticipantIdRef.current = newP.id;
      }
  };

  // ---------------------------------------------------------
  // 3. UI HANDLERS (JOIN KNOP)
  // ---------------------------------------------------------
  const handleJoinSubmit = async () => {
      if(!myName.trim()) return alert("Vul een naam in!");
      
      setIsJoining(true);
      
      // Maak ID en sla op
      const newGuestId = crypto.randomUUID();
      localStorage.setItem('pingo_guest_id', newGuestId);
      localStorage.setItem('pingo_guest_name', myName);
      
      setMyId(newGuestId);
      myIdRef.current = newGuestId;

      // Start het laadproces
      await loadGameData(sessionId, newGuestId);
      setIsJoining(false);
  };

  // ---------------------------------------------------------
  // 4. GAME LOGICA
  // ---------------------------------------------------------
  const generateGrid = (items) => {
      const s = [...items].sort(()=>0.5-Math.random()).slice(0,24); 
      s.splice(12,0,"FREE SPACE"); 
      return s;
  };

  const calculateBingo = (m) => {
      const rows = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];
      return rows.filter(r => r.every(i => m[i])).length;
  };

  const toggleTile = async (index) => {
      if(index === 12 || winner || session?.host_id === myId) return; // Host klikt niet
      
      const nm = [...marked]; nm[index] = !nm[index];
      setMarked(nm);
      
      const count = calculateBingo(nm);
      setBingoCount(count);
      const isFull = nm.every(m => m);

      // Win conditie check
      let hasBingo = false;
      if (winPattern === '1line' && count >= 1) hasBingo = true;
      else if (winPattern === '2lines' && count >= 2) hasBingo = true;
      else if (winPattern === 'full' && isFull) hasBingo = true;

      // Update DB
      if (myParticipantIdRef.current) {
          await supabase.from('session_participants').update({
              marked_indices: nm.map((m,i)=>m?i:null).filter(x=>x!==null),
              has_bingo: hasBingo,
              updated_at: new Date().toISOString()
          }).eq('id', myParticipantIdRef.current);
      }
  };

  // ---------------------------------------------------------
  // 5. REALTIME & SUBSCRIPTIONS
  // ---------------------------------------------------------
  const fetchParticipants = async (sId) => {
      const { data } = await supabase.from('session_participants').select('*').eq('session_id', sId);
      if(data) setParticipants(data);
  };

  useEffect(() => {
      if(!sessionId || viewState !== 'playing') return;

      const ch = supabase.channel(`room_${sessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bingo_sessions', filter: `id=eq.${sessionId}` }, (pl) => {
            const s = pl.new;
            setSession(s);
            if(s.current_draw) setCurrentDraw(s.current_draw);
            if(s.drawn_items) setDrawnItems(s.drawn_items);
            
            // RESET
            if(s.drawn_items?.length === 0 && s.status === 'active') {
                setWinner(null); setShowWinnerPopup(false); 
                // Reset lokaal bord
                const g = generateGrid(card.items);
                setGrid(g);
                setMarked(Object.assign(new Array(25).fill(false), {12:true}));
                // Update DB
                if(myParticipantIdRef.current) {
                    supabase.from('session_participants').update({ grid_snapshot: g, marked_indices: [12], has_bingo: false }).eq('id', myParticipantIdRef.current).then();
                }
            }

            // WINNER
            if(s.status === 'finished' && s.winner_name) {
                setWinner(s.winner_name);
                setShowWinnerPopup(true);
                confetti();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionId}` }, () => {
            fetchParticipants(sessionId);
        })
        .subscribe();

      return () => supabase.removeChannel(ch);
  }, [sessionId, viewState, card]);

  // ---------------------------------------------------------
  // RENDER: LOADING
  // ---------------------------------------------------------
  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-500 font-black animate-pulse">LADEN...</div>;
  if (errorMsg) return <div className="min-h-screen flex items-center justify-center">{errorMsg}</div>;

  // ---------------------------------------------------------
  // RENDER: INPUT SCREEN (ALLEEN VOOR NIEUWE GASTEN)
  // ---------------------------------------------------------
  if (viewState === 'input_name') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center border-4 border-orange-100 animate-in zoom-in">
                <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 shadow-inner">
                    <User size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 italic uppercase mb-2">Welkom!</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">Kies een naam om mee te spelen</p>
                
                <input 
                    type="text" 
                    value={myName} 
                    onChange={(e) => setMyName(e.target.value)} 
                    placeholder="Jouw Naam" 
                    className="w-full p-4 bg-gray-100 rounded-xl font-bold mb-4 focus:ring-4 focus:ring-orange-200 outline-none border-2 border-gray-100 text-center uppercase placeholder:text-gray-300 shadow-inner"
                />
                <button 
                    onClick={handleJoinSubmit} 
                    disabled={isJoining}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-black uppercase hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-200 active:scale-95 transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isJoining ? <Loader2 className="animate-spin"/> : "Meedoen"}
                </button>
            </div>
        </div>
      );
  }

  // ---------------------------------------------------------
  // RENDER: GAME BOARD (ALS JE BENT GEJOINED)
  // ---------------------------------------------------------
  const isHostUser = session?.host_id === myId;
  const showFlag = gameMode !== 'hall' && (
      (winPattern === '1line' && bingoCount >= 1) || 
      (winPattern === '2lines' && bingoCount >= 2) || 
      (winPattern === 'full' && marked.every(m => m))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-center sm:text-left relative overflow-x-hidden">
        
        {/* MODALS */}
        {winner && showWinnerPopup && (
            <div className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center text-white text-center animate-in zoom-in p-4">
                <div className="max-w-xl w-full relative">
                    {!isHostUser && <button onClick={() => setShowWinnerPopup(false)} className="absolute top-0 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full"><X size={24} /></button>}
                    <Crown size={100} className="mx-auto mb-6 text-yellow-400 animate-bounce"/>
                    <h1 className="text-5xl font-black uppercase mb-2 text-yellow-400">WINNAAR!</h1>
                    <div className="bg-white text-gray-900 rounded-[2rem] p-6 shadow-2xl transform rotate-2 mb-8">
                        <div className="text-3xl font-black uppercase text-purple-600">{winner}</div>
                    </div>
                    {isHostUser && <button onClick={async () => {
                        await supabase.from('bingo_sessions').update({ current_draw: null, drawn_items: [], status: 'active', winner_name: null }).eq('id', sessionId);
                        setWinner(null); setShowWinnerPopup(false);
                    }} className="bg-white/20 border-2 border-white text-white px-8 py-4 rounded-xl font-black uppercase">Nieuw Spel</button>}
                </div>
            </div>
        )}

        {/* HEADER */}
        <div className="pt-8 px-6 pb-6 relative z-50">
            <div className="max-w-6xl mx-auto relative">
                <div className="relative z-50 bg-gray-900 rounded-[2.5rem] px-6 py-4 flex justify-between items-center shadow-2xl">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white"><ChevronLeft size={24} /></button>
                        <div>
                            <h2 className="text-xl font-black italic uppercase text-white">{card?.title}</h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{gameMode === 'hall' ? 'ZAAL MODUS' : 'SOLO'}</p>
                        </div>
                    </div>
                    {isMultiplayer && (
                        <div className="flex gap-2">
                            <button onClick={()=>setShowQR(true)} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white"><QrCode size={20}/></button>
                            <div className="bg-gray-800 px-4 py-2.5 rounded-xl font-black text-xs text-white border border-gray-700">CODE: {session?.join_code}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-7xl mx-auto px-4 mt-8">
            {gameMode === 'hall' && isHostUser ? (
                <HallHostView 
                    currentDraw={currentDraw} drawnItems={drawnItems} participants={displayParticipants} verificationClaim={verificationClaim}
                    setVerificationClaim={setVerificationClaim} handleHostDraw={async () => {
                        if(isDrawing || winner) return; setIsDrawing(true);
                        const avail = card.items.filter(i => !drawnItems.includes(i));
                        if(avail.length){
                            const item = avail[Math.floor(Math.random()*avail.length)];
                            await supabase.from('bingo_sessions').update({ current_draw: item, drawn_items: [...drawnItems, item], updated_at: new Date().toISOString() }).eq('id', sessionId);
                        }
                        setIsDrawing(false);
                    }} 
                    resetDraws={()=>{}} 
                    session={session} sessionId={sessionId} supabase={supabase} winPattern={winPattern} 
                />
            ) : (
                <PlayerView 
                    grid={grid} marked={marked} toggleTile={toggleTile} handleShuffleClick={() => {
                        const g = generateGrid(card.items); setGrid(g);
                        if(myParticipantIdRef.current) supabase.from('session_participants').update({ grid_snapshot: g, marked_indices: [12] }).eq('id', myParticipantIdRef.current).then();
                    }}
                    bingoCount={bingoCount} gameMode={gameMode} currentDraw={currentDraw} participants={displayParticipants} isHost={isHostUser} session={session} sessionId={sessionId} myUserId={myId} supabase={supabase} showShuffleConfirm={false} setShowShuffleConfirm={()=>{}} confirmShuffle={()=>{}}
                />
            )}
        </div>
    </div>
  );
}