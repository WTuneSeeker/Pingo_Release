import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Plus, Edit3, Trash2, Globe, Lock, X, Save, ChevronDown, 
  AlertCircle, AlertTriangle, Sparkles, UserMinus, Layout 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({ title: '', is_public: false, items: [] });
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, card: null });
  
  // Kick melding state
  const [showKickModal, setShowKickModal] = useState(false);
  
  const listRef = useRef(null);
  const MAX_CHAR_LIMIT = 40;

  useEffect(() => {
    // 1. Check direct of de gebruiker gekickt is uit een lobby
    const kickedStatus = localStorage.getItem('pingo_kicked');
    if (kickedStatus === 'true') {
      setShowKickModal(true);
      localStorage.removeItem('pingo_kicked'); // Direct opruimen voor volgende keer
    }
    fetchMyCards();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [editData.items.length]);

  const fetchMyCards = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setCards(data || []);
    }
    setLoading(false);
  };

  const closeKickMessage = () => setShowKickModal(false);

  const startEditing = (card) => {
    setSelectedCard(card);
    setEditData({
      title: card.title,
      is_public: card.is_public || false,
      items: card.items || []
    });
    setIsSelectOpen(false);
    setErrorMessage('');
  };

  const handleUpdateCard = async () => {
    const filteredItems = editData.items.filter(item => item.trim() !== '');
    if (filteredItems.length < 24) {
      setErrorMessage(`⚠️ Je hebt momenteel ${filteredItems.length} items. Minimaal 24 woorden vereist.`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .update({ 
          title: editData.title, 
          is_public: editData.is_public, 
          items: filteredItems 
        })
        .eq('id', selectedCard.id)
        .select();

      if (error) throw error;
      if (data) {
        setSelectedCard(null); 
        await fetchMyCards(); 
      }
    } catch (error) {
      setErrorMessage("Fout bij opslaan: " + error.message);
    }
  };

  const addItem = () => {
    setEditData({ ...editData, items: [...editData.items, ''] });
    setErrorMessage('');
  };

  const removeItem = (index) => {
    const newItems = editData.items.filter((_, i) => i !== index);
    setEditData({ ...editData, items: newItems });
  };

  const updateItemText = (index, val) => {
    const newItems = [...editData.items];
    newItems[index] = val;
    setEditData({ ...editData, items: newItems });
  };

  const confirmDelete = async () => {
    const card = deleteConfirmation.card;
    if (!card) return;
    try {
      const { error } = await supabase.from('bingo_cards').delete().eq('id', card.id);
      if (error) throw error;
      setDeleteConfirmation({ isOpen: false, card: null });
      fetchMyCards();
    } catch (error) {
      setErrorMessage("Fout bij verwijderen: " + error.message);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-orange-500 animate-pulse text-2xl tracking-tighter italic uppercase">Dashboard laden...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      
      {/* --- KICKED MELDING OVERLAY --- */}
      {showKickModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={closeKickMessage}></div>
          <div className="relative bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-4 border-orange-500 animate-in zoom-in duration-300">
            <div className="mx-auto w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <UserMinus size={40} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 italic uppercase tracking-tighter leading-none">Toegang geweigerd!</h2>
            <p className="text-gray-500 font-bold mb-8 uppercase text-xs tracking-widest italic leading-tight">
              Je bent uit de lobby verwijderd en hebt een timeout gekregen voor deze sessie.
            </p>
            <button 
              onClick={closeKickMessage}
              className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-orange-600 transition shadow-lg active:scale-95"
            >
              Begrepen
            </button>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Mijn <span className="text-orange-500">P</span>INGO'S</h1>
          <p className="text-gray-400 mt-1 font-bold text-lg">Beheer je eigen collectie</p>
        </div>
        <button onClick={() => navigate('/create')} className="bg-orange-500 text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-3 hover:bg-orange-600 transition shadow-xl shadow-orange-100 active:scale-95">
          <Plus size={24} /> Nieuwe Bingo
        </button>
      </div>

      {/* --- CARDS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card) => (
          <div key={card.id} className="bg-white p-7 rounded-[3rem] shadow-xl shadow-gray-100 border border-gray-50 flex flex-col group transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl ${card.is_public ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-400'}`}>
                {card.is_public ? <Globe size={22} /> : <Lock size={22} />}
              </div>
              <button onClick={() => setDeleteConfirmation({ isOpen: true, card })} className="text-gray-200 hover:text-red-500 transition-colors p-2"><Trash2 size={22} /></button>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight tracking-tight italic uppercase">{card.title}</h3>
            <p className="text-gray-400 mb-8 font-bold uppercase text-xs tracking-widest italic">{card.items?.length || 0} woorden</p>
            <div className="flex gap-3 mt-auto">
              <button onClick={() => startEditing(card)} className="flex-1 bg-gray-50 text-gray-700 py-4 rounded-2xl font-black hover:bg-orange-50 hover:text-orange-600 transition flex items-center justify-center gap-2"><Edit3 size={20} /> Edit</button>
              <button onClick={() => navigate(`/play/${card.id}`)} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black hover:bg-orange-600 transition shadow-md shadow-orange-100 uppercase italic">Speel</button>
            </div>
          </div>
        ))}
      </div>

      {/* --- DELETE MODAL --- */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmation({ isOpen: false, card: null })}></div>
          <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-200">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 mb-2 italic uppercase">Weet je het zeker?</h3>
            <p className="text-gray-500 font-medium mb-8">Verwijder <span className="text-gray-900 font-black italic uppercase">"{deleteConfirmation.card?.title}"</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmation({ isOpen: false, card: null })} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition">Annuleer</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition">Verwijder</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {selectedCard && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedCard(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl p-8 sm:p-10 flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10 flex-shrink-0">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Instellingen</h2>
              <div className="flex items-center gap-3">
                <button onClick={handleUpdateCard} className="p-3.5 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-100 hover:bg-orange-600 hover:scale-110 transition-all active:scale-95 group"><Save size={22} className="group-hover:animate-pulse" /></button>
                <button onClick={() => setSelectedCard(null)} className="p-3.5 bg-gray-50 text-gray-400 hover:bg-gray-100 rounded-full transition-all active:scale-90"><X size={22} /></button>
              </div>
            </div>

            <div className="space-y-6 flex-shrink-0 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black mb-2 text-gray-400 uppercase tracking-widest ml-1 italic">Titel</label>
                  <input className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white transition-all font-bold text-gray-800" value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} />
                </div>
                <div className="relative">
                  <label className="block text-sm font-black mb-2 text-gray-400 uppercase tracking-widest ml-1 italic">Zichtbaarheid</label>
                  <button onClick={() => setIsSelectOpen(!isSelectOpen)} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-[1.5rem] font-bold text-gray-800 hover:bg-gray-100 transition-all">
                    <span className="flex items-center gap-2">{editData.is_public ? <Globe size={18} className="text-green-500" /> : <Lock size={18} className="text-orange-400" />}{editData.is_public ? 'Publiek' : 'Privé'}</span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isSelectOpen && (
                    <div className="absolute z-[170] mt-2 w-full bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
                      <div onClick={() => { setEditData({...editData, is_public: false}); setIsSelectOpen(false); }} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 font-bold border-b border-gray-50 ${!editData.is_public ? 'text-orange-600 bg-orange-50/30' : 'text-gray-800'}`}><Lock size={18} /> Privé</div>
                      <div onClick={() => { setEditData({...editData, is_public: true}); setIsSelectOpen(false); }} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 font-bold ${editData.is_public ? 'text-green-600 bg-green-50/30' : 'text-gray-800'}`}><Globe size={18} /> Publiek</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-center mb-4 flex-shrink-0 px-1">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Bingo Woorden ({editData.items.length})</label>
                <button onClick={addItem} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-orange-100 transition shadow-sm"><Plus size={16} /> Toevoegen</button>
              </div>
              
              <div ref={listRef} className="overflow-y-auto p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar scroll-smooth">
                {editData.items.map((item, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                      <input 
                        maxLength={MAX_CHAR_LIMIT} 
                        className="flex-1 p-3.5 bg-white border-2 border-transparent rounded-xl text-sm font-bold focus:ring-4 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        value={item} 
                        onChange={(e) => updateItemText(index, e.target.value)} 
                        placeholder="Woord..." 
                      />
                      <button onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 transition-colors p-2 flex-shrink-0"><Trash2 size={18} /></button>
                    </div>
                    <div className="flex justify-end pr-8">
                      <span className={`text-[9px] font-black ${item.length >= MAX_CHAR_LIMIT ? 'text-orange-500' : 'text-gray-300'}`}>
                        {item.length}/{MAX_CHAR_LIMIT}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-xs flex-shrink-0">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}