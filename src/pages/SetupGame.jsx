import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Settings, Users, ChevronLeft, Play, 
  User, CheckCircle2, Save, Tv, 
  Minus, Plus, AlignJustify, Grid, LayoutGrid, Loader2, List, Type // 'Type' icoon toegevoegd
} from 'lucide-react';

export default function SetupGame() {
  const { cardId, sessionId } = useParams();
  const navigate = useNavigate();
  
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [sessionName, setSessionName] = useState(''); // NIEUW: Sessie naam
  const [gameMode, setGameMode] = useState('rows'); 
  const [sessionType, setSessionType] = useState('solo'); 
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [winPattern, setWinPattern] = useState('1line'); 
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: cardData } = await supabase.from('bingo_cards').select('*').eq('id', cardId).single();
      if (cardData) {
        setCard(cardData);
        // Standaard naam instellen als het een nieuwe sessie is
        if (!sessionId) setSessionName(`${cardData.title} Sessie`);
      }

      if (sessionId) {
        const { data: sessionData } = await supabase.from('bingo_sessions').select('*').eq('id', sessionId).single();
        if (sessionData) {
          setSessionName(sessionData.name || ''); // NIEUW: Naam inladen
          setGameMode(sessionData.game_mode || 'rows');
          setMaxPlayers(sessionData.max_players || 10);
          setWinPattern(sessionData.win_pattern || '1line');
          
          if (sessionData.game_mode === 'hall') {
             setSessionType('group'); 
             setGameMode('hall');
          } else if (sessionData.max_players === 1) {
            setSessionType('solo');
          } else {
            setSessionType('group');
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [cardId, sessionId]);

  const handleSave = async () => {
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const finalMaxPlayers = sessionType === 'solo' ? 1 : maxPlayers;

    // NIEUW: Fallback naam als input leeg is
    const finalName = sessionName.trim() === '' ? `${card?.title || 'Bingo'} Sessie` : sessionName;

    const payload = {
        name: finalName, // NIEUW: Naam opslaan
        game_mode: gameMode,
        max_players: finalMaxPlayers,
        win_pattern: winPattern, 
        updated_at: new Date().toISOString()
    };

    if (sessionId) {
      await supabase.from('bingo_sessions').update(payload).eq('id', sessionId);
      navigate(`/play-session/${sessionId}`); 
    } else {
      const prefix = 'P-'; 
      const joinCode = `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const { data } = await supabase.from('bingo_sessions').insert([{
          host_id: user.id, card_id: cardId, join_code: joinCode, status: 'active', ...payload
        }]).select().single();
      navigate(`/play-session/${data.id}`);
    }
    setIsProcessing(false);
  };

  const selectType = (type, mode = 'rows') => {
      setSessionType(type);
      setGameMode(mode);
      if (type === 'group' && maxPlayers < 2) setMaxPlayers(10);
      
      if (mode === 'hall') setWinPattern('1line'); 
      else setWinPattern('1line'); 
  };

  const bgClass = gameMode === 'hall' ? 'bg-purple-500' : 'bg-orange-500';
  const textClass = gameMode === 'hall' ? 'text-purple-500' : 'text-orange-500';
  
  if (loading) return <div className={`min-h-screen flex items-center justify-center font-black ${textClass} animate-pulse`}>LADEN...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 relative overflow-hidden border border-white">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
            <button onClick={() => navigate(sessionId ? `/play-session/${sessionId}` : '/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold uppercase text-xs transition-colors"><ChevronLeft size={18} /> Terug</button>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${gameMode === 'hall' ? 'bg-purple-100 text-purple-500' : 'bg-orange-100 text-orange-500'}`}><Settings size={28} /></div>
        </div>

        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase mb-2">{card?.title}</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Instellingen</p>
        </div>

        <div className="space-y-8">

            {/* NIEUW: 0. SESSIE NAAM */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Naam van de sessie</label>
              <div className="flex items-center bg-gray-50 rounded-3xl border border-gray-100 p-2 focus-within:border-gray-300 focus-within:ring-4 focus-within:ring-gray-100 transition-all">
                <div className={`p-3 rounded-2xl mr-3 transition-colors ${gameMode === 'hall' ? 'bg-purple-100 text-purple-500' : 'bg-orange-100 text-orange-500'}`}>
                    <Type size={20} />
                </div>
                <input 
                    type="text" 
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Bijv. Vrijmibo Bingo..."
                    className="bg-transparent w-full font-bold text-gray-900 outline-none placeholder:text-gray-300 h-full py-2"
                />
              </div>
            </div>
            
            {/* 1. SPELTYPE */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Kies Speltype</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => selectType('solo', 'rows')} className={`p-5 rounded-3xl border-2 text-left transition-all relative group ${sessionType === 'solo' ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'border-gray-100 hover:border-orange-200'}`}>
                  <User size={28} className={`mb-3 ${sessionType === 'solo' ? 'text-orange-500' : 'text-gray-300'}`} />
                  <h3 className="font-black text-sm uppercase text-gray-900">Solo</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Alleen spelen.</p>
                  {sessionType === 'solo' && <div className="absolute top-4 right-4 text-orange-500"><CheckCircle2 size={20} fill="currentColor" className="text-white"/></div>}
                </button>

                <button onClick={() => selectType('group', 'rows')} className={`p-5 rounded-3xl border-2 text-left transition-all relative group ${sessionType === 'group' && gameMode !== 'hall' ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'border-gray-100 hover:border-orange-200'}`}>
                  <Users size={28} className={`mb-3 ${sessionType === 'group' && gameMode !== 'hall' ? 'text-orange-500' : 'text-gray-300'}`} />
                  <h3 className="font-black text-sm uppercase text-gray-900">Groep</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Met vrienden.</p>
                  {sessionType === 'group' && gameMode !== 'hall' && <div className="absolute top-4 right-4 text-orange-500"><CheckCircle2 size={20} fill="currentColor" className="text-white"/></div>}
                </button>

                <button onClick={() => selectType('group', 'hall')} className={`p-5 rounded-3xl border-2 text-left transition-all relative group ${gameMode === 'hall' ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-100' : 'border-gray-100 hover:border-purple-200'}`}>
                  <Tv size={28} className={`mb-3 ${gameMode === 'hall' ? 'text-purple-500' : 'text-gray-300'}`} />
                  <h3 className="font-black text-sm uppercase text-gray-900">Zaal</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Groot scherm.</p>
                  {gameMode === 'hall' && <div className="absolute top-4 right-4 text-purple-500"><CheckCircle2 size={20} fill="currentColor" className="text-white"/></div>}
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-gray-100"></div>

            {/* 2. WIN PATROON SELECTIE */}
            <div className="animate-in fade-in slide-in-from-top-4">
                <label className={`block text-xs font-black uppercase tracking-widest mb-4 ml-2 ${textClass}`}>
                    {gameMode === 'hall' ? 'Wanneer is het Bingo?' : 'Spelmodus'}
                </label>
                
                {gameMode === 'hall' ? (
                    /* ZAAL MODUS: 3 OPTIES */
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setWinPattern('1line')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === '1line' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}>
                            <AlignJustify size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">1 Lijn</span>
                        </button>
                        <button onClick={() => setWinPattern('2lines')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === '2lines' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}>
                            <Grid size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">2 Lijnen</span>
                        </button>
                        <button onClick={() => setWinPattern('full')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === 'full' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}>
                            <LayoutGrid size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">Volle Kaart</span>
                        </button>
                    </div>
                ) : (
                    /* SOLO/GROEP: 2 OPTIES */
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setWinPattern('1line')} className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${winPattern === '1line' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-400'}`}>
                            <List size={20}/> 
                            <div className="text-left">
                                <span className="block text-xs font-black uppercase">Rijen Mode</span>
                                <span className="block text-[9px] font-bold opacity-60">Bingo, Dubbel, etc.</span>
                            </div>
                        </button>
                        <button onClick={() => setWinPattern('full')} className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${winPattern === 'full' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-400'}`}>
                            <LayoutGrid size={20}/> 
                            <div className="text-left">
                                <span className="block text-xs font-black uppercase">Volle Kaart</span>
                                <span className="block text-[9px] font-bold opacity-60">Alleen eindsprint</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* 3. AANTAL SPELERS (TELLER) */}
            {(sessionType === 'group' || gameMode === 'hall') && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${gameMode === 'hall' ? 'bg-purple-100 text-purple-500' : 'bg-orange-100 text-orange-500'}`}><Users size={20} /></div>
                            <div><p className="text-[10px] font-black text-gray-900 uppercase">Aantal Spelers</p><p className="text-[8px] font-bold text-gray-400">Max aantal deelnemers</p></div>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                            <button onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold active:scale-90 transition-all"><Minus size={14} /></button>
                            <div className="w-12 text-center font-black text-lg text-gray-900 tabular-nums">{maxPlayers}</div>
                            <button onClick={() => setMaxPlayers(Math.min(200, maxPlayers + 1))} className={`w-8 h-8 flex items-center justify-center rounded-lg text-white font-bold active:scale-90 transition-all ${bgClass} shadow-md`}><Plus size={14} /></button>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={handleSave} disabled={isProcessing} className={`w-full text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 ${bgClass} shadow-lg shadow-gray-200`}>
              {isProcessing ? <><Loader2 className="animate-spin" /> Verwerken...</> : sessionId ? <><Save fill="currentColor" size={20} /> Opslaan</> : <><Play fill="currentColor" size={20} /> Start Spel</>}
            </button>

        </div>
      </div>
    </div>
  );
}