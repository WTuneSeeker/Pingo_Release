import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Users, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function Join() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Zoek de sessie met deze code
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('id')
        .eq('join_code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        throw new Error("Code niet gevonden. Check even of 'ie klopt!");
      }

      // Stuur de user naar de speelpagina met de sessie-ID
      navigate(`/play-session/${session.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-50 text-center animate-in zoom-in duration-300">
        <div className="inline-flex p-4 bg-orange-50 rounded-3xl text-orange-500 mb-6">
          <Users size={32} />
        </div>
        
        <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-gray-900">
          Join de <span className="text-orange-500">P</span>ARTY
        </h1>
        <p className="text-gray-400 font-bold mb-8 text-balance">Vul de code van je vrienden in om samen te spelen.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold animate-in slide-in-from-top-2 text-left">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <input 
            type="text"
            placeholder="P-1234"
            className="w-full text-center text-3xl font-black tracking-[0.2em] py-6 bg-gray-50 border-2 border-transparent rounded-[2rem] outline-none focus:ring-8 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all text-orange-500 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
          />

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition shadow-2xl shadow-orange-100 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Bezig met zoeken...' : 'Speel Mee!'}
            <ArrowRight size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}