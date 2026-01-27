import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, LogOut, Menu, X, Sparkles, Users, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(''); // State voor naam
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check sessie bij laden
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    // Luister naar login/logout updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUsername('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Functie om de naam op te halen
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data) setUsername(data.username);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoadingCode(true);
    try {
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('id')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        console.error("Sessie niet gevonden");
        return;
      }

      setJoinCode('');
      setIsOpen(false);
      navigate(`/play-session/${data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCode(false);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-50 sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo Sectie */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="bg-orange-500 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-100">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-3xl font-black tracking-tighter italic">
              <span className="text-orange-500">P</span>INGO
            </span>
          </Link>

          {/* Desktop Navigatie */}
          <div className="hidden md:flex items-center gap-6">
            
            {/* JOIN CODE INPUT - Breder gemaakt (w-60 focus:w-80) */}
            <form onSubmit={handleJoinSession} className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                <Users size={18} />
              </div>
              <input 
                type="text"
                placeholder="JOIN CODE..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="pl-11 pr-10 py-2.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black tracking-widest focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all w-60 focus:w-80"
              />
              <button 
                type="submit"
                disabled={loadingCode}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-orange-500 transition-colors"
              >
                <ArrowRight size={18} />
              </button>
            </form>

            <Link to="/community" className="text-gray-400 hover:text-orange-500 font-bold transition-colors text-sm">
              Community
            </Link>
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 bg-orange-50 text-orange-600 px-5 py-2.5 rounded-2xl font-black hover:bg-orange-100 transition shadow-sm text-sm"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>

                {/* NAAM: Verplaatst naar naast de uitlog knop */}
                <div className="hidden lg:flex flex-col items-end">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ingelogd als</span>
                   <span className="text-xs font-black text-gray-900 leading-none truncate max-w-[150px]">{username || 'Laden...'}</span>
                </div>

                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                  title="Uitloggen"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-gray-900 font-black hover:text-orange-500 transition text-sm">
                  Inloggen
                </Link>
                <Link 
                  to="/login" 
                  className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black hover:bg-orange-600 transition shadow-lg shadow-orange-100 active:scale-95 text-sm"
                >
                  Start Gratis
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobiele Navigatie */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-50 p-4 space-y-4 animate-in slide-in-from-top-2">
          <form onSubmit={handleJoinSession} className="relative mb-6">
            <input 
              type="text"
              placeholder="VUL CODE IN..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full pl-4 pr-12 py-4 bg-gray-50 border-2 border-orange-100 rounded-2xl text-center font-black tracking-widest text-orange-500"
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500">
              <ArrowRight size={24} />
            </button>
          </form>

          <Link 
            to="/community" 
            className="block px-4 py-3 text-gray-900 font-black hover:bg-orange-50 rounded-xl transition"
            onClick={() => setIsOpen(false)}
          >
            Community
          </Link>
          {user ? (
            <>
              {/* Mobiele weergave van de naam */}
              <div className="px-4 py-2 border-b border-gray-50 mb-2">
                 <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingelogd als</span>
                 <span className="block text-sm font-black text-gray-900">{username}</span>
              </div>

              <Link 
                to="/dashboard" 
                className="block px-4 py-3 bg-orange-50 text-orange-600 font-black rounded-xl"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <button 
                onClick={() => { handleLogout(); setIsOpen(false); }}
                className="w-full text-left px-4 py-3 text-red-500 font-black hover:bg-red-50 rounded-xl transition"
              >
                Uitloggen
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2 border-t border-gray-50">
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-center text-gray-900 font-black">Inloggen</Link>
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-center bg-orange-500 text-white font-black rounded-xl shadow-lg">Start Gratis</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}