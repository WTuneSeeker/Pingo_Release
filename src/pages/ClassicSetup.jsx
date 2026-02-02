import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Play, Save, Clock, Type, Dices, 
  AlignJustify, Grid, LayoutGrid, Loader2
} from 'lucide-react';

export default function ClassicSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);

  // --- SETTINGS ---
  const [sessionName, setSessionName] = useState('Classic Bingo Sessie');
  const [drawSpeed, setDrawSpeed] = useState(7); // Standaard 7 seconden
  const [winPattern, setWinPattern] = useState('1line');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setUser(user);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleStartClassic = async () => {
    setIsProcessing(true);
    
    const prefix = 'C-'; // C voor Classic
    const joinCode = `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // We maken een sessie zonder card_id (want het is standaard 1-75)
    // Zorg dat je database 'card_id' als nullable accepteert, of pas dit aan.
    const payload = {
        name: sessionName,
        host_id: user.id,
        game_mode: 'classic', // Belangrijk voor de logica
        draw_speed: drawSpeed,
        win_pattern: winPattern,
        join_code: joinCode,
        status: 'active',
        max_players: 200, // Classic kan met velen
        card_id: null // Geen specifieke kaart nodig
    };

    const { data, error } = await supabase
        .from('bingo_sessions')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("Error creating classic session:", error);
        alert("Kon sessie niet starten. Check of je database 'card_id' leeg (null) toestaat.");
        setIsProcessing(false);
    } else {
        navigate(`/play-session/${data.id}`);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-blue-500 font-black animate-pulse">LADEN...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white relative overflow-hidden">
        
        {/* ACHTERGROND DECORATIE */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        {/* HEADER */}
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
                <button onClick={() => navigate('/community')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold uppercase text-xs transition-colors"><ChevronLeft size={18} /> Terug</button>
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Dices size={28} /></div>
            </div>

            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase mb-2">Classic Bingo</h1>
                <p className="text-blue-500 font-bold uppercase tracking-widest text-xs">Ballen 1 t/m 75</p>
            </div>

            <div className="space-y-6">

                {/* 1. SESSIE NAAM */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Sessie Naam</label>
                    <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 p-2 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <div className="p-3 bg-blue-100 text-blue-500 rounded-xl mr-3"><Type size={20} /></div>
                        <input 
                            type="text" 
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            className="bg-transparent w-full font-bold text-gray-900 outline-none placeholder:text-gray-300 h-full"
                        />
                    </div>
                </div>

                {/* 2. TIMER SNELHEID (SLIDER) */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Trek Snelheid (Auto-Caller)</label>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Clock size={20}/>
                                <span className="font-bold text-sm">Timer</span>
                            </div>
                            <span className="text-3xl font-black text-blue-600 tabular-nums">{drawSpeed}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="3" 
                            max="20" 
                            step="1"
                            value={drawSpeed}
                            onChange={(e) => setDrawSpeed(parseInt(e.target.value))}
                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-blue-300 mt-2 uppercase tracking-widest">
                            <span>Turbo (3s)</span>
                            <span>Relaxed (20s)</span>
                        </div>
                    </div>
                </div>

                {/* 3. WIN PATROON */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Win Patroon</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setWinPattern('1line')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === '1line' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-blue-100'}`}>
                            <AlignJustify size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">1 Lijn</span>
                        </button>
                        <button onClick={() => setWinPattern('2lines')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === '2lines' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-blue-100'}`}>
                            <Grid size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">2 Lijnen</span>
                        </button>
                        <button onClick={() => setWinPattern('full')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${winPattern === 'full' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-blue-100'}`}>
                            <LayoutGrid size={24} className="mb-2"/> <span className="text-[10px] font-black uppercase">Volle Kaart</span>
                        </button>
                    </div>
                </div>

                <button onClick={handleStartClassic} disabled={isProcessing} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4">
                    {isProcessing ? <><Loader2 className="animate-spin" /> Starten...</> : <><Play fill="currentColor" size={20} /> Start Classic</>}
                </button>

            </div>
        </div>
      </div>
    </div>
  );
}