import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trash2, Play, Plus, Edit, LayoutGrid, CheckCircle, Eye, Globe, Lock, 
  User, Mail, Shield, LogOut, Save, X, Loader2, 
  Activity, BarChart3, Heart, StopCircle, Trophy, Gamepad2, Clock, Crown
} from 'lucide-react';

export default function Dashboard() {
  // --- STATE ---
  const [cards, setCards] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]); // Widget data
  const [joinedSessions, setJoinedSessions] = useState([]); // Tab data
  
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cards'); 
  const [userData, setUserData] = useState(null);
  
  // Account Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [avatarColor, setAvatarColor] = useState('bg-orange-500');

  const [notification, setNotification] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // --- INIT ---
  useEffect(() => {
    window.scrollTo(0, 0);

    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');

      const { data: profile } = await supabase
        .from('profiles')
        .select('username') 
        .eq('id', user.id)
        .single();

      setUserData({
        id: user.id,
        email: user.email,
        username: profile?.username || 'Geen gebruikersnaam',
        createdAt: user.created_at
      });

      setNewUsername(profile?.username || '');

      // We voeren alle fetches parallel uit voor snelheid
      await Promise.all([
        fetchCards(user.id),
        fetchActiveSessions(user.id), // Voor de widget
        fetchTotalSessions(user.id),  // Voor de stats
        fetchJoinedSessions(user.id)  // Voor de 'Openstaande Spellen' tab
      ]);
      
      setLoading(false);
    };

    initData();

    if (location.state?.success) {
      setNotification(location.state.success);
      window.history.replaceState({}, document.title);
      setTimeout(() => setNotification(''), 4000);
    }
  }, [location, navigate]);

  // --- DATA FETCHING ---
  
  const fetchCards = async (userId) => {
    const { data } = await supabase
      .from('bingo_cards')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (data) setCards(data);
  };

  // Widget Fetch (Alleen Host)
  const fetchActiveSessions = async (userId) => {
    const { data } = await supabase
      .from('bingo_sessions')
      .select('*, bingo_cards(title)')
      .eq('host_id', userId)
      .neq('status', 'finished') 
      .order('created_at', { ascending: false });
      
    if (data) setActiveSessions(data);
  };

  // --- DE BELANGRIJKE FIX: OPENSTAANDE SPELLEN ---
  const fetchJoinedSessions = async (userId) => {
    try {
      // Stap 1: Haal alles op waar ik HOST ben (Direct uit bingo_sessions)
      const { data: hostedGames } = await supabase
        .from('bingo_sessions')
        .select('*, bingo_cards(title)')
        .eq('host_id', userId)
        .neq('status', 'finished');

      // Stap 2: Haal alles op waar ik SPELER ben (Uit session_participants)
      const { data: participantGames } = await supabase
        .from('session_participants')
        .select(`
          last_active:updated_at,
          bingo_sessions!inner (
            id,
            join_code,
            status,
            created_at,
            host_id,
            bingo_cards (title)
          )
        `)
        .eq('user_id', userId)
        .neq('bingo_sessions.status', 'finished');

      // Stap 3: Samenvoegen (Gebruik een Map om dubbelen te voorkomen)
      const gamesMap = new Map();

      // Voeg hosted games toe
      if (hostedGames) {
        hostedGames.forEach(game => {
          gamesMap.set(game.id, {
            id: game.id,
            join_code: game.join_code,
            title: game.bingo_cards?.title || 'Naamloze Sessie',
            host_id: game.host_id,
            started_at: game.created_at,
            is_host: true, // Ik ben de eigenaar
            last_active: game.created_at
          });
        });
      }

      // Voeg participant games toe (als ze al bestaan, overschrijf/update ze)
      if (participantGames) {
        participantGames.forEach(p => {
          const s = p.bingo_sessions;
          if (!gamesMap.has(s.id)) {
            gamesMap.set(s.id, {
              id: s.id,
              join_code: s.join_code,
              title: s.bingo_cards?.title || 'Naamloze Sessie',
              host_id: s.host_id,
              started_at: s.created_at,
              is_host: s.host_id === userId,
              last_active: p.last_active
            });
          }
        });
      }

      // Stap 4: Omzetten naar array en sorteren (Nieuwste eerst)
      const combinedList = Array.from(gamesMap.values()).sort((a, b) => 
        new Date(b.started_at) - new Date(a.started_at)
      );

      setJoinedSessions(combinedList);

    } catch (err) {
      console.error("Fout bij ophalen openstaande spellen:", err);
    }
  };

  const fetchTotalSessions = async (userId) => {
    const { count } = await supabase
      .from('bingo_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', userId);
    setSessionCount(count || 0);
  };

  // --- STATS ---
  const totalPlays = cards.reduce((sum, card) => sum + (card.play_count || 0), 0);
  const totalCards = cards.length;
  const topCard = cards.length > 0 ? cards.reduce((prev, current) => (prev.play_count > current.play_count) ? prev : current) : null;

  // --- ACTIONS ---
  const closeSession = async (sessionId) => {
    if (!confirm("Weet je zeker dat je deze sessie wilt stoppen?")) return;
    
    const { error } = await supabase
      .from('bingo_sessions')
      .update({ status: 'finished' })
      .eq('id', sessionId);
      
    if (!error) {
      // Verwijder direct uit beide lijsten voor snelle UI update
      setActiveSessions(c => c.filter(s => s.id !== sessionId));
      setJoinedSessions(c => c.filter(s => s.id !== sessionId));
      
      setNotification("Sessie beëindigd.");
      setTimeout(() => setNotification(''), 4000);
    } else {
      alert("Kon sessie niet sluiten. Mogelijk ben je geen host.");
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === userData.username) { setIsEditingName(false); return; }
    setUpdatingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ username: newUsername.trim() }).eq('id', userData.id);
      if (error) throw error;
      setUserData(prev => ({ ...prev, username: newUsername.trim() }));
      setNotification('Gebruikersnaam succesvol aangepast!');
      setTimeout(() => setNotification(''), 4000);
      setIsEditingName(false);
    } catch (error) {
      console.error('Update error:', error);
      alert('Kon gebruikersnaam niet aanpassen.');
    } finally { setUpdatingName(false); }
  };

  const deleteCard = async (cardId) => {
    if (!confirm("Weet je zeker dat je deze kaart wilt verwijderen?")) return;
    setCards(current => current.filter(c => c.id !== cardId));
    const { error } = await supabase.from('bingo_cards').delete().eq('id', cardId);
    if (error) { alert("Fout bij verwijderen."); fetchCards(userData.id); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const colors = ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-red-500', 'bg-gray-900'];

  if (loading && !userData) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-orange-500 font-black text-2xl animate-pulse uppercase italic">Laden...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 selection:bg-orange-100">
      
      <div className="max-w-7xl mx-auto p-6 pt-10">
        
        {/* NOTIFICATIE */}
        {notification && (
          <div className="mb-8 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-4">
            <CheckCircle className="text-green-500 shrink-0" size={24} />
            <div><p className="font-black text-sm uppercase tracking-wide">Succes!</p><p className="text-sm font-medium">{notification}</p></div>
          </div>
        )}

        {/* HEADER */}
        <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h2 className="text-4xl font-black text-gray-900 uppercase italic mb-6 tracking-tighter">Mijn Dashboard</h2>
            <div className="flex p-1 bg-white border border-gray-200 rounded-2xl w-fit shadow-sm overflow-x-auto max-w-full">
              <button onClick={() => setActiveTab('cards')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cards' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Mijn Kaarten</button>
              <button onClick={() => setActiveTab('sessions')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sessions' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Openstaande Spellen</button>
              <button onClick={() => setActiveTab('favorites')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'favorites' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Favorieten</button>
              <button onClick={() => setActiveTab('account')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'account' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>Mijn Account</button>
            </div>
          </div>
          <div className="flex gap-4">
             <Link to="/create" className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition shadow-lg hover:shadow-orange-200 active:scale-95 flex items-center gap-2 h-fit self-end">
                <Plus size={16} strokeWidth={3} /> Nieuwe Bingo
             </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- MAIN CONTENT --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* TAB 1: MIJN KAARTEN */}
            {activeTab === 'cards' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {cards.length === 0 ? (
                  <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-4">Nog geen kaarten</p>
                    <Link to="/create" className="text-orange-500 font-black uppercase text-xs border-b-2 border-orange-200">Nu aanmaken</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {cards.map((card) => (
                      <div key={card.id} className="group relative bg-white rounded-[2rem] border-2 border-transparent hover:border-orange-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${card.is_public ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{card.is_public ? 'Publiek' : 'Privé'}</div>
                            <div className="bg-orange-50 text-orange-500 border border-orange-100 px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5"><Eye size={12} /> {card.play_count || 0}</div>
                          </div>
                          <h3 className="text-xl font-black text-gray-900 uppercase italic mb-6 break-words line-clamp-2">{card.title}</h3>
                          <div className="flex gap-2 mt-auto">
                            {/* AANGEPASTE SPEEL KNOP: GAAT NU NAAR SETUP PAGINA */}
                            <button onClick={() => navigate(`/setup/${card.id}`)} className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-orange-600 shadow-md"><Play size={14} fill="currentColor" /> Speel</button>
                            <button onClick={() => navigate(`/edit/${card.id}`)} className="flex-1 bg-gray-50 text-gray-600 py-3 rounded-xl flex items-center justify-center hover:bg-gray-200 border border-gray-100"><Edit size={16} /></button>
                            <button onClick={() => deleteCard(card.id)} className="flex-none px-3 bg-red-50 text-red-400 py-3 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-50"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OPENSTAANDE SPELLEN */}
            {activeTab === 'sessions' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {joinedSessions.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                     <div className="bg-blue-50 p-6 rounded-full inline-block mb-6"><Gamepad2 className="text-blue-400" size={48} /></div>
                     <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">Geen open spellen</h3>
                     <p className="text-gray-400 font-bold text-sm max-w-md mx-auto mb-8">Je hebt geen actieve sessies als host of speler.</p>
                     <button onClick={() => document.querySelector('input[placeholder="JOIN CODE..."]')?.focus()} className="text-blue-500 font-black uppercase text-xs border-b-2 border-blue-200 hover:border-blue-500">Join een game met code</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {joinedSessions.map((session) => (
                      <div key={session.id} className="bg-white rounded-3xl p-6 border-2 border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-6">
                        
                        <div className="flex items-center gap-6 w-full sm:w-auto">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner ${session.is_host ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                            {session.is_host ? <Crown size={32} fill="currentColor"/> : <User size={32}/>}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{session.title}</span>
                              {session.is_host && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-md font-black uppercase">Host</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Gamepad2 size={14}/> Code: <span className="text-gray-900">{session.join_code}</span></span>
                              <span className="flex items-center gap-1"><Clock size={14}/> {new Date(session.started_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Link 
                            to={`/play-session/${session.id}`} 
                            className="flex-1 sm:flex-none bg-gray-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg active:scale-95 text-center"
                          >
                            Speel Verder
                          </Link>
                          
                          {session.is_host && (
                            <button 
                              onClick={() => closeSession(session.id)}
                              className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-red-100"
                              title="Sessie stoppen voor iedereen"
                            >
                              <StopCircle size={20} />
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FAVORIETEN */}
            {activeTab === 'favorites' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <div className="bg-pink-50 p-6 rounded-full inline-block mb-6"><Heart className="text-pink-400" size={48} /></div>
                 <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">Favorieten</h3>
                 <p className="text-gray-400 font-bold text-sm max-w-md mx-auto mb-8">Binnenkort kun je hier je favoriete kaarten opslaan!</p>
                 <Link to="/community" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg">Ontdek de Community</Link>
              </div>
            )}

            {/* TAB 4: ACCOUNT */}
            {activeTab === 'account' && userData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                  <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-6">
                      <div className={`w-24 h-24 ${avatarColor} rounded-full flex items-center justify-center text-4xl font-black shadow-lg`}>{userData.username.charAt(0).toUpperCase()}</div>
                      <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-wide">{userData.username}</h3>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Lid sinds {new Date(userData.createdAt).getFullYear()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid gap-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Gebruikersnaam</label>
                        <div className="flex items-center justify-between min-h-[2.5rem]">
                          {isEditingName ? (
                            <div className="flex items-center gap-2 w-full animate-in fade-in">
                              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 w-full focus:outline-none focus:border-orange-500 transition-all" autoFocus />
                              <button onClick={handleUpdateUsername} disabled={updatingName} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm">{updatingName ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}</button>
                              <button onClick={() => { setIsEditingName(false); setNewUsername(userData.username); }} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"><X size={16} /></button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 text-gray-900 font-bold"><User size={18} className="text-orange-500" />{userData.username}</div>
                              <button onClick={() => setIsEditingName(true)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white rounded-xl transition-all"><Edit size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-80"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">E-mail</label><div className="flex items-center gap-3 text-gray-900 font-bold"><Mail size={18} className="text-orange-500" />{userData.email}</div></div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">User ID</label><div className="flex items-center gap-3 text-gray-500 font-mono text-xs"><Shield size={18} className="text-orange-500" />{userData.id}</div></div>
                    </div>
                    <div className="pt-4"><button onClick={handleLogout} className="w-full bg-red-50 text-red-500 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"><LogOut size={16} /> Uitloggen</button></div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* --- RECHTER KOLOM --- */}
          <div className="space-y-6">
            
            {/* WIDGET 1: LIVE HOST (Widget is nu gekoppeld aan dezelfde data!) */}
            <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
               <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="bg-white/10 p-2 rounded-lg"><Activity className="text-orange-400" size={20} /></div>
                  <h3 className="text-lg font-black italic uppercase">Live Host</h3>
               </div>
               <div className="space-y-3 relative z-10">
                  {activeSessions.length > 0 ? (
                    activeSessions.map(session => (
                      <div key={session.id} className="bg-white/10 p-4 rounded-2xl border border-white/5 hover:bg-white/20 transition-colors">
                         <div className="flex justify-between items-start mb-1">
                           <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Code: {session.join_code}</p>
                           <button onClick={() => closeSession(session.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"><X size={16} /></button>
                         </div>
                         <h4 className="font-bold text-sm mb-3 truncate">{session.bingo_cards?.title || 'Naamloze Sessie'}</h4>
                         <Link to={`/play-session/${session.id}`} className="block w-full bg-orange-500 text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors">Hervatten</Link>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6"><p className="text-gray-500 text-xs font-bold uppercase">Geen host sessies</p></div>
                  )}
               </div>
            </div>

            {/* WIDGET 2: IMPACT */}
            {cards.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><BarChart3 size={20} /></div>
                    <h3 className="text-lg font-black text-gray-900 italic uppercase">Jouw Impact</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Eye size={12}/> Views</p><p className="text-2xl font-black text-gray-900">{totalPlays}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Gamepad2 size={12}/> Hosted</p><p className="text-2xl font-black text-orange-500">{sessionCount}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><LayoutGrid size={12}/> Cards</p><p className="text-2xl font-black text-gray-900">{totalCards}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Trophy size={12}/> Top</p>{topCard ? <p className="text-xs font-black text-gray-900 line-clamp-1">{topCard.title}</p> : <p>-</p>}</div>
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}