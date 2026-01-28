import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, LogOut, Menu, X, Sparkles, Users, 
  ArrowRight, User, Home, Settings, ChevronDown, Clock 
} from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [isOpen, setIsOpen] = useState(false); // Mobiel menu
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Desktop dropdown
  
  const [joinCode, setJoinCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  
  const navigate = useNavigate();
  const profileMenuRef = useRef(null); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUsername('');
      }
    });

    // Click outside listener voor dropdown
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data) setUsername(data.username);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    setIsProfileOpen(false);
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

  // Blokkeer scrollen als mobiel menu open is
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  return (
    <>
      {/* AANPASSING HIER: z-[999] in plaats van z-[50] */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0 z-[60]" onClick={() => setIsOpen(false)}>
              <div className="bg-orange-500 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-100">
                <Sparkles className="text-white" size={24} />
              </div>
              <span className="text-3xl font-black tracking-tighter italic">
                <span className="text-orange-500">P</span>INGO
              </span>
            </Link>

            {/* Desktop Navigatie */}
            <div className="hidden md:flex items-center gap-6">
              
              {/* Join Code Input */}
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
                <button type="submit" disabled={loadingCode} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-orange-500 transition-colors">
                  <ArrowRight size={18} />
                </button>
              </form>

              <Link to="/community" className="text-gray-400 hover:text-orange-500 font-bold transition-colors text-sm">Community</Link>
              
              {user ? (
                // --- DESKTOP USER MENU (DROPDOWN) ---
                <div className="relative" ref={profileMenuRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border-2 transition-all ${isProfileOpen ? 'border-orange-200 bg-orange-50' : 'border-transparent hover:bg-gray-50'}`}
                  >
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md">
                      {username ? username.charAt(0).toUpperCase() : <User size={16} />}
                    </div>
                    <span className="text-xs font-black text-gray-700 max-w-[100px] truncate hidden lg:block">
                      {username || 'Account'}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Content */}
                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border-2 border-orange-100 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 z-[1000]">
                      
                      <div className="px-4 py-3 border-b border-gray-50 mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingelogd als</p>
                        <p className="font-black text-gray-900 truncate">{username}</p>
                      </div>

                      <Link 
                        to="/dashboard" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <LayoutDashboard size={18} /> Mijn Dashboard
                      </Link>

                      {/* Placeholder features */}
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-left cursor-not-allowed">
                        <Clock size={18} /> Openstaande Sessies
                      </button>
                      
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-left cursor-not-allowed">
                        <Settings size={18} /> Instellingen
                      </button>

                      <div className="border-t border-gray-50 my-2"></div>

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut size={18} /> Uitloggen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-gray-900 font-black hover:text-orange-500 transition text-sm">Inloggen</Link>
                  <Link to="/register" className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black hover:bg-orange-600 transition shadow-lg shadow-orange-100 active:scale-95 text-sm">Start Gratis</Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden z-[60]">
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-900 bg-gray-50 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-colors"
              >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBIEL MENU (FULLSCREEN OVERLAY) --- */}
      {isOpen && (
        <div className="fixed inset-0 bg-white z-[1000] pt-24 pb-8 px-6 flex flex-col animate-in slide-in-from-top-4 duration-300 md:hidden overflow-y-auto">
          
          {/* 1. Join Code Sectie */}
          <div className="mb-8 w-full max-w-sm mx-auto">
            <form onSubmit={handleJoinSession} className="relative">
              <input 
                type="text"
                placeholder="VUL CODE IN..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full py-5 px-6 bg-gray-50 border-2 border-gray-100 focus:border-orange-500 rounded-3xl text-center text-xl font-black tracking-widest text-gray-900 placeholder-gray-300 focus:outline-none transition-all shadow-sm"
                autoFocus
              />
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-200 active:scale-90 transition-transform"
              >
                <ArrowRight size={24} />
              </button>
            </form>
          </div>

          {/* 2. Grote Navigatie Links */}
          <div className="flex-1 flex flex-col items-center justify-start space-y-6 w-full max-w-sm mx-auto">
            
            <Link 
              to="/" 
              onClick={() => setIsOpen(false)}
              className="text-3xl font-black text-gray-300 hover:text-orange-500 uppercase italic tracking-tight transition-colors flex items-center gap-3"
            >
              <Home size={28} /> Home
            </Link>

            <Link 
              to="/community" 
              onClick={() => setIsOpen(false)}
              className="text-3xl font-black text-gray-300 hover:text-orange-500 uppercase italic tracking-tight transition-colors"
            >
              Community
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={() => setIsOpen(false)}
                  className="text-3xl font-black text-gray-900 hover:text-orange-500 uppercase italic tracking-tight transition-colors"
                >
                  Dashboard
                </Link>

                <div className="flex flex-col gap-4 w-full pt-4">
                   <button className="text-xl font-bold text-gray-400 uppercase tracking-widest text-center cursor-not-allowed">
                     Instellingen
                   </button>
                </div>
                
                {/* Profiel Kaartje (Logout) */}
                <div className="mt-4 w-full bg-gray-50 p-6 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-500 font-black text-lg">
                      {username ? username.charAt(0).toUpperCase() : <User />}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingelogd als</p>
                      <p className="font-black text-gray-900 text-lg">{username || '...'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-3 bg-white text-red-500 rounded-xl shadow-sm hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  onClick={() => setIsOpen(false)}
                  className="text-3xl font-black text-gray-900 hover:text-orange-500 uppercase italic tracking-tight transition-colors"
                >
                  Inloggen
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setIsOpen(false)}
                  className="mt-4 w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl shadow-orange-200 active:scale-95 transition-transform text-center"
                >
                  Start Gratis
                </Link>
              </>
            )}

            {/* Afsluitknop */}
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-8 text-gray-400 font-bold uppercase tracking-widest text-xs py-4 px-8 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <X size={16} /> Menu Sluiten
            </button>

          </div>

          {/* 3. Footer in Menu */}
          <div className="mt-auto text-center pt-8">
            <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">© Pingo 2024</p>
          </div>

        </div>
      )}
    </>
  );
}