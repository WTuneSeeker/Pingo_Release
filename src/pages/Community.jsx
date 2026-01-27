import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Globe, Play, Search, Sparkles, User, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Community() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicCards();
  }, []);

  const fetchPublicCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Fout bij ophalen community kaarten:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter de kaarten op basis van de zoekterm
  const filteredCards = cards.filter(card => 
    card.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="p-20 text-center font-black text-orange-500 animate-pulse text-2xl tracking-tighter italic uppercase">
      De PINGO community wordt geladen...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Sectie */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 text-center md:text-left">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-50 text-orange-600 font-black text-xs uppercase tracking-widest mb-3">
            <Globe size={14} />
            <span>Openbare Bibliotheek</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight italic">Community</h1>
          <p className="text-gray-400 mt-2 font-bold text-lg">Ontdek en speel bingo's van andere PINGO-gebruikers</p>
        </div>

        {/* Zoekbalk */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Zoek een bingo..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 transition-all font-bold text-gray-800 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid van kaarten */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCards.map((card) => (
            <div 
              key={card.id} 
              className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-100 border border-gray-50 flex flex-col group transition-all hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden"
            >
              {/* Decoratief element op de achtergrond */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="flex justify-between items-start mb-6 relative">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-500 shadow-sm shadow-orange-100">
                  <Sparkles size={24} />
                </div>
                <div className="flex items-center gap-1.5 text-gray-300 font-black text-[10px] uppercase tracking-tighter bg-gray-50 px-3 py-1 rounded-full">
                  <List size={12} />
                  {card.items?.length || 0} items
                </div>
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight tracking-tight relative">
                {card.title}
              </h3>
              
              <div className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-8 relative">
                <User size={14} className="text-orange-300" />
                <span>Gedeeld door een Pingo-fan</span>
              </div>

              <div className="mt-auto relative">
                <button 
                  onClick={() => navigate(`/play/${card.id}`)} 
                  className="w-full bg-orange-500 text-white py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-100 active:scale-95"
                >
                  <Play size={20} fill="currentColor" />
                  Nu Spelen
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Search size={32} className="text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 italic">Geen bingo's gevonden</h3>
          <p className="text-gray-400 font-bold mt-2">Probeer een andere zoekterm of maak er zelf een!</p>
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-20 p-12 bg-orange-500 rounded-[3.5rem] text-center text-white shadow-2xl shadow-orange-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black italic mb-4">Zelf een bingo delen?</h2>
          <p className="text-orange-100 font-bold text-lg mb-8 max-w-xl mx-auto text-balance">
            Maak je eigen kaart en zet hem op 'Publiek' om hem hier aan de community te laten zien!
          </p>
          <button 
            onClick={() => navigate('/create')}
            className="bg-white text-orange-500 px-10 py-4 rounded-2xl font-black text-lg hover:bg-orange-50 transition shadow-xl active:scale-95"
          >
            Start met Maken
          </button>
        </div>
        {/* Decoratieve vormen */}
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-400 rounded-full opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600 rounded-full opacity-30"></div>
      </div>
    </div>
  );
}