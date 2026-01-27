import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Globe, Lock, AlertCircle, ChevronLeft, X } from 'lucide-react';

export default function CreateBingo() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState(new Array(24).fill(''));
  const [isPublic, setIsPublic] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const itemsEndRef = useRef(null);
  const MAX_CHAR_LIMIT = 40;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAddItem = () => {
    setItems(prevItems => [...prevItems, '']);
    setErrorMessage('');
    setTimeout(() => {
      itemsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 24) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItemText = (index, val) => {
    const newItems = [...items];
    newItems[index] = val;
    setItems(newItems);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setErrorMessage('');

    const filteredItems = items.filter(item => item && item.trim() !== '');

    if (!title.trim()) {
      setErrorMessage('Geef je kaart eerst een leuke titel!');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (filteredItems.length < 24) {
      setErrorMessage(`⚠️ Je hebt momenteel ${filteredItems.length} gevulde items. Minimaal 24 woorden vereist.`);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error } = await supabase
        .from('bingo_cards')
        .insert([{
          user_id: user.id,
          title: title,
          items: filteredItems,
          is_public: isPublic
        }]);

      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage('Fout bij opslaan: ' + error.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-orange-500 font-bold transition-colors mb-8 group"
      >
        <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        Terug naar Dashboard
      </button>

      <div className="mb-10 text-center md:text-left">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight italic">Nieuwe <span className="text-orange-500">P</span>INGO</h1>
        <p className="text-gray-400 mt-2 font-bold text-lg">Ontwerp je eigen unieke bingo-ervaring</p>
      </div>

      {errorMessage && (
        <div className="mb-8 p-5 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-center gap-4 text-red-600 font-black animate-in slide-in-from-top-4 duration-300">
          <AlertCircle size={24} />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Settings Tab */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-100 border border-gray-50 space-y-8 sticky top-28">
            <div>
              <label className="block text-sm font-black mb-3 text-gray-400 uppercase tracking-widest ml-1">Titel</label>
              <input 
                type="text"
                maxLength={50}
                placeholder="Bijv. Familie Kerst Bingo"
                className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-3 text-gray-400 uppercase tracking-widest ml-1">Zichtbaarheid</label>
              <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                <button type="button" onClick={() => setIsPublic(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${!isPublic ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Lock size={18} /> Privé
                </button>
                <button type="button" onClick={() => setIsPublic(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${isPublic ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Globe size={18} /> Publiek
                </button>
              </div>
            </div>

            <button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 text-white py-5 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition shadow-2xl shadow-orange-100 active:scale-[0.98] disabled:opacity-50">
              <Save size={24} /> {loading ? 'Bezig...' : 'Kaart Creëren'}
            </button>
          </div>
        </div>

        {/* Word List Tab */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-100 border border-gray-50">
            <div className="flex justify-between items-center mb-6 px-2">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Bingo Woorden</h3>
                <p className="text-sm font-bold text-gray-400">Gebruik korte woorden voor het beste resultaat.</p>
              </div>
              <button type="button" onClick={handleAddItem} className="bg-orange-50 text-orange-600 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-orange-100 transition active:scale-95">
                <Plus size={20} /> Toevoegen
              </button>
            </div>

            <div className="p-2 bg-gray-50 rounded-[2.5rem] border border-gray-100">
              {/* De 2 kolommen zijn terug op MD schermen en groter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 p-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col gap-1 group animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex gap-2 items-center relative pr-1">
                      {/* Nummering - met flex-shrink-0 zodat hij nooit smaller wordt */}
                      <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-[10px] font-black text-gray-300 border border-gray-100 flex-shrink-0 z-10">
                        {index + 1}
                      </div>

                      {/* Invoerveld - met w-full zodat hij de rest van de ruimte pakt */}
                      <input 
                        maxLength={MAX_CHAR_LIMIT}
                        className="w-full p-4 bg-white border-2 border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all shadow-sm z-0"
                        value={item}
                        onChange={(e) => updateItemText(index, e.target.value)}
                        placeholder="Voor een naam in..."
                      />

                      {/* Verwijderknop - absolute positionering rechtsboven het inputveld om overlap te voorkomen */}
                      {items.length > 24 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)} 
                          className="absolute -right-1 -top-1 bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-100 rounded-full p-1.5 shadow-sm transition-all z-20 opacity-0 group-hover:opacity-100 md:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Karakter teller */}
                    <div className="flex justify-end pr-6">
                       <span className={`text-[9px] font-black ${item.length >= MAX_CHAR_LIMIT ? 'text-orange-500' : 'text-gray-300'}`}>
                         {item.length}/{MAX_CHAR_LIMIT}
                       </span>
                    </div>
                  </div>
                ))}
                <div ref={itemsEndRef} className="h-2 w-full col-span-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}