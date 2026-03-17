import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Crown, CheckCircle2, ShieldBan, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Premium() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Haal de ingelogde gebruiker op
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleUpgradeClick = () => {
    if (!user) return;

    // JOUW LEMON SQUEEZY LINK (vervang dit met jouw echte link uit Fase 1)
    const baseUrl = "https://pingobingo.lemonsqueezy.com/checkout/buy/3d65326b-9096-4624-a124-a0136f78d8cd";
    
    // HIER GEBEURT DE MAGIC: We sturen de user_id mee als custom data
    const checkoutUrl = `${baseUrl}?checkout[custom][user_id]=${user.id}`;
    
    // Stuur de gebruiker naar de veilige betaalpagina
    window.location.href = checkoutUrl;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 text-yellow-600 rounded-full mb-6 shadow-sm">
          <Crown size={32} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-gray-900 mb-4">
          Upgrade naar <span className="text-yellow-500">Premium</span>
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest">Speel Pingo zonder onderbrekingen</p>
      </div>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-lg w-full border-4 border-yellow-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10">
            <h2 className="text-3xl font-black text-gray-900 uppercase mb-2">Pingo Pro</h2>
            <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black text-gray-900">€3,99</span>
                <span className="text-gray-400 font-bold">/ maand</span>
            </div>

            <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 font-bold text-gray-700">
                    <ShieldBan className="text-green-500" size={24} /> 100% Reclamevrij spelen
                </li>
                <li className="flex items-center gap-3 font-bold text-gray-700">
                    <Sparkles className="text-yellow-500" size={24} /> Exclusieve Pro Badges in de lobby
                </li>
                <li className="flex items-center gap-3 font-bold text-gray-700">
                    <CheckCircle2 className="text-green-500" size={24} /> Onbeperkt spelen en maken van sessies
                </li>
            </ul>

            <button 
                onClick={handleUpgradeClick}
                className="w-full bg-yellow-400 text-yellow-900 py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-yellow-300 hover:shadow-xl hover:-translate-y-1 transition-all active:translate-y-0"
            >
                Upgrade Nu
            </button>
            <p className="text-center text-xs text-gray-400 font-bold mt-4">
                Veilig betalen via Lemon Squeezy. Je kunt op elk moment opzeggen.
            </p>
        </div>
      </div>
    </div>
  );
}