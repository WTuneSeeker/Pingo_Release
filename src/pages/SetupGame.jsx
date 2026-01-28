import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Settings, Users, ChevronLeft, Play, 
  User, CheckCircle2, Save, Tv, QrCode
} from 'lucide-react';

export default function SetupGame() {
  const { cardId, sessionId } = useParams(); // sessionId is optioneel (alleen bij edit)
  const navigate = useNavigate();
  
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [gameMode, setGameMode] = useState('rows'); 
  const [sessionType, setSessionType] = useState('solo');
  const [maxPlayers, setMaxPlayers] = useState(10); // Default startwaarde
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. Haal kaart info
      const { data: cardData } = await supabase.from('bingo_cards').select('*').eq('id', cardId).single();
      if (cardData) setCard(cardData);

      // 2. Als we een sessionId hebben (Edit Mode), haal de huidige settings op
      if (sessionId) {
        const { data: sessionData } = await supabase
          .from('bingo_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionData) {
          setGameMode(sessionData.game_mode || 'rows');
          
          // Detecteer sessie type
          if (sessionData.game_mode === 'hall') {
             setSessionType('group'); 
             setGameMode('hall');
          } else if (sessionData.max_players === 1) {
            setSessionType('solo');
          } else {
            setSessionType('group');
          }
          
          // Als we editen, neem de opgeslagen waarde over, anders default 10
          setMaxPlayers(sessionData.max_players || 10);
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

    if (sessionId) {
      // --- UPDATE BESTAANDE SESSIE ---
      const { error } = await supabase
        .from('bingo_sessions')
        .update({
          game_mode: gameMode,
          max_players: finalMaxPlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) alert("Update mislukt: " + error.message);
      else navigate(`/play-session/${sessionId}`); 

    } else {
      // --- MAAK NIEUWE SESSIE ---
      const prefix = sessionType === 'solo' ? 'SOLO-' : 'P-';
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const joinCode = `${prefix}${randomCode}`;

      const { data, error } = await supabase
        .from('bingo_sessions')
        .insert([{
          host_id: user.id,
          card_id: cardId,
          join_code: joinCode,
          status: 'active',
          game_mode: gameMode,
          max_players: finalMaxPlayers,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) alert("Starten mislukt: " + error.message);
      else navigate(`/play-session/${data.id}`);
    }
    setIsProcessing(false);
  };

  // Helper om modus te switchen en state consistent te houden
  const selectType = (type, mode = 'rows') => {
      setSessionType(type);
      setGameMode(mode);
      
      // HIER IS DE AANPASSING:
      // Als er naar een groepstype gewisseld wordt, zet maxPlayers automatisch op 10
      if (type === 'group') {
        setMaxPlayers(10);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-orange-500 animate-pulse">LADEN...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold uppercase text-xs mb-8 transition-colors">
          <ChevronLeft size={16} /> {sessionId ? 'Terug naar Spel' : 'Terug naar Dashboard'}
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border-2 border-orange-100">
          
          <div className="text-center mb-10">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
              <Settings size={40} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase mb-2">{card?.title}</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
              {sessionId ? 'Pas instellingen aan' : 'Configureer je spel'}
            </p>
          </div>

          <div className="space-y-8">
            
            {/* 1. TYPE SESSIE */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Kies je Speltype</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* SOLO */}
                <button 
                  onClick={() => selectType('solo', 'rows')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${sessionType === 'solo' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-orange-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <User size={24} className={sessionType === 'solo' ? 'text-orange-500' : 'text-gray-300'} />
                    {sessionType === 'solo' && <CheckCircle2 size={18} className="text-orange-500" />}
                  </div>
                  <h3 className={`font-black text-sm uppercase ${sessionType === 'solo' ? 'text-gray-900' : 'text-gray-500'}`}>Solo</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Speel alleen.</p>
                </button>

                {/* GROEP (Normaal) */}
                <button 
                  onClick={() => selectType('group', 'rows')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${sessionType === 'group' && gameMode !== 'hall' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-orange-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Users size={24} className={sessionType === 'group' && gameMode !== 'hall' ? 'text-orange-500' : 'text-gray-300'} />
                    {sessionType === 'group' && gameMode !== 'hall' && <CheckCircle2 size={18} className="text-orange-500" />}
                  </div>
                  <h3 className={`font-black text-sm uppercase ${sessionType === 'group' && gameMode !== 'hall' ? 'text-gray-900' : 'text-gray-500'}`}>Groep</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Met vrienden.</p>
                </button>

                {/* ZAAL MODUS */}
                <button 
                  onClick={() => selectType('group', 'hall')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${gameMode === 'hall' ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-purple-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Tv size={24} className={gameMode === 'hall' ? 'text-purple-500' : 'text-gray-300'} />
                    {gameMode === 'hall' && <CheckCircle2 size={18} className="text-purple-500" />}
                  </div>
                  <h3 className={`font-black text-sm uppercase ${gameMode === 'hall' ? 'text-gray-900' : 'text-gray-500'}`}>Zaal Modus</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Host scherm + QR.</p>
                </button>

              </div>
            </div>

            <div className="w-full h-px bg-gray-100"></div>

            {/* 2. GAME MODE (ALLEEN ZICHTBAAR ALS NIET IN ZAAL MODUS) */}
            {gameMode !== 'hall' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Winstconditie</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setGameMode('rows')}
                      className={`flex-1 py-4 rounded-xl font-black text-xs uppercase border-2 transition-all ${gameMode === 'rows' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      Rijen Mode
                    </button>
                    <button 
                      onClick={() => setGameMode('full')}
                      className={`flex-1 py-4 rounded-xl font-black text-xs uppercase border-2 transition-all ${gameMode === 'full' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      Volle Kaart
                    </button>
                  </div>
                </div>
            )}

            {/* 3. MAX PLAYERS (Alleen bij groep of zaal) */}
            {(sessionType === 'group' || gameMode === 'hall') && (
              <div className="animate-in slide-in-from-top-2 fade-in">
                <div className="flex justify-between items-center mb-4 ml-2">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Max Spelers</label>
                   <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-xs font-black">{maxPlayers}</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="100" 
                  value={maxPlayers} 
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            )}

            {/* ACTION BUTTON */}
            <button 
              onClick={handleSave}
              disabled={isProcessing}
              className={`w-full text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 ${gameMode === 'hall' ? 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-200' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-200'}`}
            >
              {isProcessing ? (
                <span className="animate-pulse">Verwerken...</span>
              ) : (
                sessionId ? <><Save fill="currentColor" size={20} /> Wijzigingen Opslaan</> : <><Play fill="currentColor" size={20} /> Start Spel</>
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}