import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trash2, Play, Plus, Edit, LayoutGrid, LogOut 
} from 'lucide-react';

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  // 1. Initialisatie
  useEffect(() => {
    const init = async () => {
      await getProfile();
      await fetchCards();
    };
    init();
  }, []);

  // 2. Profiel ophalen
  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    setUsername(data?.username || user.email.split('@')[0]);
  };

  // 3. Kaarten ophalen
  const fetchCards = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setCards(data);
      if (error) console.error("Error fetching cards:", error);
    }
    setLoading(false);
  };

  // 4. Verwijder functie
  const deleteCard = async (cardId) => {
    if (!confirm("Weet je zeker dat je deze kaart wilt verwijderen?")) return;

    // Optimistic update (haal weg uit beeld)
    setCards(current => current.filter(c => c.id !== cardId));

    // Database actie
    const { error } = await supabase
      .from('bingo_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      alert("Fout bij verwijderen. Controleer je database policies.");
      console.error(error);
      fetchCards(); // Zet terug als het mislukt
    }
  };

  // 5. Uitloggen
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-orange-500 font-black text-2xl animate-pulse uppercase italic">Laden...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 selection:bg-orange-100">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black italic uppercase cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-orange-500">P</span>ingo
        </h1>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingelogd als</span>
            <span className="text-sm font-black text-gray-900 leading-none">{username}</span>
          </div>
          <div className="h-8 w-px bg-gray-100 hidden sm:block"></div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-xl" title="Uitloggen">
            <LogOut size={20}/>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto p-6 pt-10">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase italic leading-none mb-2 tracking-tighter">Jouw Kaarten</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Beheer je collectie ({cards.length})</p>
          </div>
          <Link to="/create" className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 group">
            <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Nieuwe Maken
          </Link>
        </div>

        {/* GRID */}
        {cards.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center">
            <div className="bg-orange-50 p-6 rounded-full mb-6">
               <LayoutGrid className="text-orange-200" size={48} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2">Nog geen kaarten</h3>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-8">Maak je eerste bingo kaart om te beginnen</p>
            <Link to="/create" className="text-orange-500 font-black uppercase text-xs border-b-2 border-orange-200 hover:border-orange-500 transition-all pb-1">
              Nu aanmaken
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.id} className="group relative bg-white rounded-[2rem] border-2 border-transparent hover:border-orange-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                
                <div className="p-8 flex-1 flex flex-col">
                  {/* Card Title */}
                  <div className="flex-1 mb-6">
                    <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2 break-words line-clamp-2 leading-none tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                       Aangemaakt: {new Date(card.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Action Buttons Row */}
                  <div className="flex gap-2 mt-auto">
                    {/* PLAY */}
                    <button 
                      onClick={() => navigate(`/play/${card.id}`)}
                      className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md active:scale-95"
                    >
                      <Play size={14} fill="currentColor" /> Speel
                    </button>

                    {/* EDIT */}
                    <button 
                      onClick={() => navigate(`/edit/${card.id}`)}
                      className="flex-1 bg-gray-50 text-gray-600 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-gray-200 transition-all border border-gray-100"
                      title="Bewerk kaart"
                    >
                      <Edit size={16} />
                    </button>

                    {/* DELETE */}
                    <button 
                      onClick={() => deleteCard(card.id)}
                      className="flex-none px-4 bg-red-50 text-red-500 py-3 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-50"
                      title="Verwijder kaart"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Decoratieve rand onderaan */}
                <div className="h-2 w-full bg-gradient-to-r from-orange-400 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}