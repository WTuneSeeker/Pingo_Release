import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ChevronLeft, Plus, Save, Globe, Lock, Loader2, X, AlertCircle, Sparkles, Lightbulb 
} from 'lucide-react';

export default function Configurator() {
  const { id } = useParams(); // Haalt ID uit URL voor Edit mode
  const navigate = useNavigate();
  
  // State
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  // Start met 24 lege vakjes, maar dit kan groeien/krimpen
  const [items, setItems] = useState(Array(24).fill('')); 
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(!!id);
  const [errorMsg, setErrorMsg] = useState(''); 

  // 1. DATA OPHALEN (Alleen als we in Edit mode zijn)
  useEffect(() => {
    if (!id) return;

    const fetchCardData = async () => {
      try {
        const { data, error } = await supabase
          .from('bingo_cards')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setTitle(data.title);
          const loadedItems = data.items || [];
          
          // Zorg dat er visueel altijd minstens 24 vakjes zijn om mee te beginnen
          if (loadedItems.length < 24) {
             const filler = Array(24 - loadedItems.length).fill('');
             setItems([...loadedItems, ...filler]);
          } else {
             setItems(loadedItems);
          }
          setIsPublic(data.is_public);
        }
      } catch (error) {
        console.error("Fout:", error);
        setErrorMsg("Kon kaart niet laden. Bestaat deze nog?");
      } finally {
        setPageLoading(false);
      }
    };

    fetchCardData();
  }, [id]);

  // --- ACTIES ---

  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, '']);
  };

  const removeItem = (indexToRemove) => {
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    setErrorMsg(''); // Reset error
    
    // Validatie: Titel
    if (!title.trim()) {
      setErrorMsg("Vul alsjeblieft een titel in.");
      window.scrollTo(0,0);
      return;
    }
    
    // Validatie: Aantal items
    const cleanItems = items.filter(i => i.trim() !== '');
    if (cleanItems.length < 24) {
      setErrorMsg(`Te weinig woorden! Je hebt er ${cleanItems.length}, maar je hebt er minimaal 24 nodig.`);
      window.scrollTo(0,0);
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return navigate('/login');
    }

    try {
      let resultError;
      const payload = {
        title,
        items: cleanItems,
        is_public: isPublic,
      };

      if (id) {
        // --- UPDATE BESTAANDE KAART ---
        const { error } = await supabase
          .from('bingo_cards')
          .update({ ...payload, updated_at: new Date() })
          .eq('id', id)
          .eq('user_id', user.id);
        resultError = error;
      } else {
        // --- MAAK NIEUWE KAART ---
        const { error } = await supabase
          .from('bingo_cards')
          .insert([{ user_id: user.id, ...payload }]);
        resultError = error;
      }

      if (resultError) throw resultError;
      
      // Succes! Stuur gebruiker naar dashboard met groen bericht
      navigate('/dashboard', { 
        state: { success: id ? "Kaart succesvol bijgewerkt!" : "Nieuwe kaart aangemaakt!" } 
      });

    } catch (error) {
      console.error("Error saving:", error);
      setErrorMsg(`Opslaan mislukt: ${error.message || "Controleer je verbinding."}`);
      window.scrollTo(0,0);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-orange-500" size={48} />
           <p className="text-gray-400 font-bold uppercase text-xs tracking-widest animate-pulse">Kaart laden...</p>
        </div>
      </div>
    );
  }

  const validCount = items.filter(i => i.trim()).length;
  const isEnough = validCount >= 24;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans selection:bg-orange-100">
      
      {/* --- NIEUWE DONKERE HEADER --- */}
      <div className="pt-8 px-6 pb-6">
        <div className="max-w-6xl mx-auto bg-gray-900 rounded-[2.5rem] px-6 py-6 md:px-10 md:py-8 relative overflow-hidden shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Achtergrond Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

          {/* Links: Back & Titel */}
          <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
             <button 
               onClick={() => navigate('/dashboard')} 
               className="p-2.5 bg-gray-800 text-gray-400 rounded-xl hover:text-white hover:bg-gray-700 transition-colors"
             >
               <ChevronLeft size={24} />
             </button>
             <div className="text-left">
               <h2 className="text-xl md:text-3xl font-black italic uppercase text-white tracking-tight leading-none">
                 {id ? 'Kaart Bewerken' : 'Nieuwe Maken'}
               </h2>
               <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                 <Sparkles size={10} className="text-orange-500"/> Pingo Studio
               </p>
             </div>
          </div>

          {/* Rechts: Status Indicator */}
          <div className="relative z-10 flex items-center gap-3">
             <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-colors ${isEnough ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                {validCount} / 24+ Woorden
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Linker Kant (Settings) */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          {/* FOUTMELDING BALK */}
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex gap-3 animate-in slide-in-from-top-2 shadow-sm">
              <AlertCircle className="text-red-500 shrink-0" />
              <p className="text-red-700 text-sm font-bold">{errorMsg}</p>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-orange-100 transition-colors sticky top-8">
            <h3 className="text-2xl font-black text-gray-900 uppercase italic leading-none mb-6">Instellingen</h3>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Titel van je kaart</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bijv. Familie Kerst Bingo"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3.5 font-bold text-gray-700 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-2 mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Wie mag dit zien?</label>
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border-2 border-gray-100">
                <button 
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${!isPublic ? 'bg-white text-orange-500 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Lock size={14} /> Privé
                </button>
                <button 
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${isPublic ? 'bg-white text-orange-500 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Globe size={14} /> Publiek
                </button>
              </div>
            </div>
            
            {/* --- NIEUWE PRO TIP SECTIE --- */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 relative overflow-hidden mb-8 shadow-sm group hover:shadow-md transition-shadow">
              
              {/* Achtergrond decoratie */}
              <div className="absolute -right-6 -top-6 text-blue-100/50 rotate-12 pointer-events-none group-hover:rotate-45 transition-transform duration-700">
                 <Sparkles size={120} />
              </div>

              <div className="relative z-10 flex gap-4">
                {/* Icoon Box */}
                <div className="shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                  <Lightbulb size={24} strokeWidth={2.5} className="group-hover:text-yellow-400 transition-colors" />
                </div>

                {/* Tekst */}
                <div>
                  <h4 className="text-blue-900 font-black italic uppercase text-lg mb-1">Pro Tip</h4>
                  <p className="text-blue-700 text-xs font-bold leading-relaxed opacity-90">
                    Voeg méér dan 24 woorden toe! Het spel kiest dan voor elke speler willekeurig 24 woorden uit jouw lijst.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={loading}
              className={`w-full text-white py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isEnough ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-gray-400 hover:bg-gray-500 shadow-gray-200'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {id ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </div>

        {/* Rechter Kant (Items Grid) */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[80vh] flex flex-col">
            <div className="mb-6">
               <h2 className="text-xl font-black text-gray-900 uppercase italic">Bingo Pool</h2>
               <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Vul de vakjes met jouw content</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {items.map((item, index) => (
                <div key={index} className="relative group animate-in zoom-in duration-300">
                  <div className="absolute top-3 left-4 text-[10px] font-black text-gray-300 select-none">#{index + 1}</div>
                  
                  {/* Delete knopje */}
                  <button 
                    onClick={() => removeItem(index)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    tabIndex={-1} 
                  >
                    <X size={14} strokeWidth={3} />
                  </button>

                  <textarea
                    value={item}
                    onChange={(e) => handleItemChange(index, e.target.value)}
                    placeholder="..."
                    className="w-full h-28 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 pt-7 text-center font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all text-sm sm:text-base resize-none leading-tight flex items-center justify-center"
                  />
                </div>
              ))}
              
              {/* Toevoegen knop */}
              <button 
                onClick={addItem}
                className="w-full h-28 border-3 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50 transition-all group"
              >
                <Plus size={32} className="group-hover:scale-110 transition-transform mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest">Toevoegen</span>
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}