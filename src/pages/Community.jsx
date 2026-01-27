import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Search, Sparkles, TrendingUp, Grid3X3, Users, Loader2, Clock, Eye, Plus, Palette, AlertCircle 
} from 'lucide-react';

export default function Community() {
  const [newestCards, setNewestCards] = useState([]);
  const [popularCards, setPopularCards] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // 1. Initialisatie
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // A. Haal de 3 NIEUWSTE kaarten op + Username
      const { data: newResult, error: newError } = await supabase
        .from('bingo_cards')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (newError) throw newError;
      if (newResult) setNewestCards(newResult);

      // B. Haal de POPULAIRSTE kaarten op + Username
      const { data: popResult, error: popError } = await supabase
        .from('bingo_cards')
        .select('*, profiles(username)')
        .order('play_count', { ascending: false }) 
        .limit(6);

      if (popError) throw popError;
      if (popResult) setPopularCards(popResult);

    } catch (err) {
      console.error("Fout bij laden data:", err);
      setError("Kon de kaarten niet laden. Controleer je internetverbinding.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Klik Handler
  const handleCardClick = async (cardId) => {
    try {
      await supabase.rpc('increment_play_count', { card_id: cardId });
    } catch (err) {
      console.error("Kon play count niet updaten", err);
    }
    navigate(`/play/${cardId}`);
  };

  // 3. Zoekfunctie
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('bingo_cards')
      .select('*, profiles(username)')
      .ilike('title', `%${term}%`)
      .order('play_count', { ascending: false }) 
      .limit(20);

    if (data) setSearchResults(data);
    setSearching(false);
  };

  // --- ANIMEER LIJST GENERATOR ---
  const marqueeList = popularCards.length > 0 
    ? (popularCards.length < 4 
        ? [...popularCards, ...popularCards, ...popularCards, ...popularCards, ...popularCards, ...popularCards] 
        : [...popularCards, ...popularCards, ...popularCards])
    : [];

  // --- COMPONENTEN ---

  const BingoCardItem = ({ card, type, className = "" }) => (
    <div 
      onClick={() => handleCardClick(card.id)}
      className={`group bg-white rounded-[2rem] border-2 border-transparent hover:border-orange-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col relative shrink-0 ${className}`}
    >
      {/* --- TOP RIGHT: KLIK TELLER & BADGES --- */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        
        {/* Play Count */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm group-hover:text-orange-500 transition-colors">
          <Eye size={12} /> {card.play_count || 0}
        </div>

        {/* Badges */}
        {type === 'new' && (
          <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
            <Clock size={10} /> Nieuw
          </div>
        )}
        {type === 'popular' && (
          <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
            <TrendingUp size={10} /> Hot
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col w-full">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-orange-50 w-10 h-10 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <Grid3X3 size={20} />
          </div>
        </div>

        <h3 className="text-lg font-black text-gray-900 uppercase italic mb-2 line-clamp-2 leading-none group-hover:text-orange-500 transition-colors">
          {card.title || "Naamloze Bingo"}
        </h3>
        
        <div className="mt-auto pt-2 flex items-center justify-between text-gray-400">
           <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 truncate max-w-[150px] text-gray-500">
             <Users size={12} /> {card.profiles?.username || 'Anoniem'}
           </span>
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
             {new Date(card.created_at).toLocaleDateString()}
           </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans selection:bg-orange-100 overflow-x-hidden">
      
      {/* CSS VOOR DE ANIMATIE */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: scroll 60s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* --- NIEUWE HEADER & ZOEKBALK --- */}
      <div className="pt-8 px-6 pb-6">
        <div className="max-w-6xl mx-auto bg-gray-900 rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden shadow-2xl text-center">
          
          {/* Achtergrond Decoratie (Oranje Glow) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

          {/* Content Wrapper */}
          <div className="relative z-10">
            
            {/* Kleine Badge */}
            <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 text-orange-400 px-4 py-1.5 rounded-full mb-6 animate-in fade-in slide-in-from-bottom-2">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Ontdek Pingo</span>
            </div>
            
            {/* Grote Titel */}
            <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase mb-8 tracking-tighter">
              Community <span className="text-orange-500">Hub</span>
            </h1>

            {/* Zoekbalk */}
            <div className="max-w-2xl mx-auto relative group">
              <div className="relative bg-white rounded-[2rem] p-2 flex items-center shadow-xl">
                <div className="pl-4 text-gray-300 group-focus-within:text-orange-500 transition-colors">
                  <Search size={24} />
                </div>
                <input 
                  type="text"
                  placeholder="Zoek een bingo (bijv. 'Kerst', 'Borrel')..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full h-12 px-4 bg-transparent font-bold text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
                />
                {searching && <Loader2 className="animate-spin text-orange-500 mr-4" />}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ERROR MELDING */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 mb-6">
          <div className="bg-red-50 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={24} />
            <span className="font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="w-full py-8 overflow-hidden">

        {/* GEVAL 1: ZOEKRESULTATEN */}
        {searchTerm.length >= 2 ? (
          <div className="max-w-6xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8 flex items-center gap-2">
              <Search className="text-orange-500" /> Resultaten voor "{searchTerm}"
            </h2>
            {searchResults.length === 0 && !searching ? (
              <div className="text-center py-10 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold uppercase text-sm">Geen kaarten gevonden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map(card => <BingoCardItem key={card.id} card={card} className="h-full" />)}
              </div>
            )}
          </div>
        ) : (
          /* GEVAL 2: STANDAARD WEERGAVE */
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4">
            
            {/* 1. MEEST GESPEELD */}
            <section className="w-full">
              <div className="max-w-6xl mx-auto px-6 mb-6">
                 <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">Meest Gespeeld</h2>
                 </div>
              </div>

              {loading ? (
                // SKELETON LOADER
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white h-48 rounded-[2rem] border-2 border-gray-100 animate-pulse"></div>
                  ))}
                </div>
              ) : popularCards.length === 0 ? (
                <div className="max-w-6xl mx-auto px-6 text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold uppercase text-sm">Nog geen publieke kaarten beschikbaar.</p>
                </div>
              ) : (
                <div className="relative w-full overflow-hidden py-4">
                  <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>
                  
                  <div className="animate-marquee gap-6 px-6">
                    {marqueeList.map((card, index) => (
                      <BingoCardItem 
                        key={`${card.id}-${index}`} 
                        card={card} 
                        type="popular" 
                        className="w-[300px] md:w-[350px] shrink-0" 
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 2. MAAK JE EIGEN KAART (BANNER) */}
            <section className="max-w-6xl mx-auto px-6">
              <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                {/* Achtergrond decoratie */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                
                <div className="relative z-10 max-w-lg">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-4 text-orange-400">
                    <Palette size={20} />
                    <span className="font-black uppercase tracking-widest text-xs">Jouw beurt</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase mb-4 leading-none">
                    Maak je eigen <span className="text-orange-500">Bingo Kaart</span>
                  </h2>
                  <p className="text-gray-400 font-bold text-sm uppercase leading-relaxed">
                    Heb je een geweldig idee? Ontwerp je eigen kaart in seconden en deel hem met de community!
                  </p>
                </div>

                <button 
                  onClick={() => navigate('/create')}
                  className="relative z-10 bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition shadow-lg hover:scale-105 active:scale-95 flex items-center gap-3 shrink-0"
                >
                  <Plus size={20} strokeWidth={3} />
                  Nu Maken
                </button>
              </div>
            </section>

            {/* 3. NET BINNEN (NIEUWSTE) */}
            {newestCards.length > 0 && (
              <section className="max-w-6xl mx-auto px-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Clock size={20} /></div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">Net Binnen</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {newestCards.map(card => <BingoCardItem key={card.id} card={card} type="new" className="h-full" />)}
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </div>
  );
}