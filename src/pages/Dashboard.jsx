import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Trash2, Play, Plus, Edit, LayoutGrid, CheckCircle, Eye, Globe, Lock, 
  User, Mail, Shield, LogOut, Save, X, Loader2, 
  Activity, BarChart3, Heart, StopCircle, Trophy, Gamepad2, Clock, Crown,
  ChevronDown, Timer, ArrowRight, Copy, Users, UserPlus, UserMinus,
  // NIEUWE AVATAR ICONEN
  Ghost, Smile, Zap, Flame, Rocket, Star, Cat, Dog, Pizza, Coffee, Heart as HeartIcon
} from 'lucide-react';

import Modal from '../components/Modal';

// --- CONFIGURATIE ---
const AVATAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
  'bg-pink-500', 'bg-red-500', 'bg-indigo-500', 'bg-emerald-500'
];

const AVATAR_ICONS = {
  User, Ghost, Zap, Flame, Rocket, Star, 
  Heart: HeartIcon, Smile, Gamepad2, Cat, Dog, Pizza, Coffee
};

// TIMER COMPONENT
const SessionTimer = ({ lastActive }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const expiryTime = new Date(lastActive).getTime() + (24 * 60 * 60 * 1000);
            const now = new Date().getTime();
            const distance = expiryTime - now;
            if (distance < 0) { setIsExpired(true); setTimeLeft("Verlopen"); } 
            else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                return `${hours}u ${minutes}m`;
            }
        };
        const timer = setInterval(() => { setTimeLeft(calculateTimeLeft()); }, 60000);
        setTimeLeft(calculateTimeLeft());
        return () => clearInterval(timer);
    }, [lastActive]);

    if (isExpired) return <span className="text-red-500 font-black text-[10px] uppercase">Verlopen</span>;
    return <span className="flex items-center gap-1 text-orange-500 font-black text-[10px] uppercase tracking-wide bg-orange-50 px-2 py-1 rounded-lg border border-orange-100"><Timer size={10} /> {timeLeft} over</span>;
};

// NIEUW: AVATAR DISPLAY HELPER
const AvatarPreview = ({ iconName, bgColor, size = 40 }) => {
    const IconComponent = AVATAR_ICONS[iconName] || AVATAR_ICONS.User;
    return (
        <div className={`${bgColor} rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white/20`} style={{ width: size, height: size }}>
            <IconComponent size={size * 0.55} className="text-white" strokeWidth={2.5} />
        </div>
    );
};

export default function Dashboard() {
  // --- STATE ---
  const [cards, setCards] = useState([]); 
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [likedCardIds, setLikedCardIds] = useState(new Set()); 
  const [friends, setFriends] = useState([]);
  const [newFriendId, setNewFriendId] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  const [activeSessions, setActiveSessions] = useState([]); 
  const [joinedSessions, setJoinedSessions] = useState([]); 
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cards'); 
  const [userData, setUserData] = useState(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [notification, setNotification] = useState('');
  const [idCopied, setIdCopied] = useState(false);

  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const [actionLoading, setActionLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // --- INIT ---
  useEffect(() => {
    window.scrollTo(0, 0);
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');

      // Haal profiel op inclusief avatar data
      const { data: profile } = await supabase.from('profiles').select('username, avatar_icon, avatar_color').eq('id', user.id).single();

      setUserData({
        id: user.id,
        email: user.email,
        username: profile?.username || 'Geen gebruikersnaam',
        avatarIcon: profile?.avatar_icon || 'User',
        avatarColor: profile?.avatar_color || 'bg-orange-500',
        createdAt: user.created_at
      });
      setNewUsername(profile?.username || '');

      await Promise.all([
        fetchCards(user.id),
        fetchFavorites(user.id), 
        fetchFriends(user.id),
        fetchActiveSessions(user.id),
        fetchTotalSessions(user.id),
        fetchJoinedSessions(user.id)
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

  // --- FETCHING ---
  const fetchCards = async (userId) => {
    const { data } = await supabase.from('bingo_cards').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (data) setCards(data);
  };

  const fetchFavorites = async (userId) => {
      const { data } = await supabase.from('favorites').select('card_id, bingo_cards(*)').eq('user_id', userId);
      if (data) {
          const validCards = data.map(f => f.bingo_cards).filter(Boolean);
          setFavoriteCards(validCards);
          setLikedCardIds(new Set(data.map(f => f.card_id)));
      }
  };

  const fetchFriends = async (userId) => {
      const { data } = await supabase.from('friends').select('id, friend_id, profiles!friend_id(username)').eq('user_id', userId);
      if (data) setFriends(data);
  };

  const fetchActiveSessions = async (userId) => {
    const { data } = await supabase.from('bingo_sessions').select('*, bingo_cards(title)').eq('host_id', userId).neq('status', 'finished').eq('game_mode', 'hall').order('created_at', { ascending: false });
    if (data) setActiveSessions(data);
  };

  const fetchJoinedSessions = async (userId) => {
    try {
      const { data: hostedGames } = await supabase.from('bingo_sessions').select('*, bingo_cards(title)').eq('host_id', userId).neq('status', 'finished');
      const { data: participantGames } = await supabase.from('session_participants').select(`last_active:updated_at, bingo_sessions!inner (id, join_code, status, created_at, updated_at, host_id, game_mode, bingo_cards (title))`).eq('user_id', userId).neq('bingo_sessions.status', 'finished');

      const gamesMap = new Map();
      if (hostedGames) {
        hostedGames.forEach(game => {
          gamesMap.set(game.id, { id: game.id, join_code: game.join_code, title: game.bingo_cards?.title || 'Naamloze Sessie', host_id: game.host_id, started_at: game.created_at, is_host: true, game_mode: game.game_mode, last_active: game.updated_at || game.created_at });
        });
      }
      if (participantGames) {
        participantGames.forEach(p => {
          const s = p.bingo_sessions;
          if (!gamesMap.has(s.id)) {
            gamesMap.set(s.id, { id: s.id, join_code: s.join_code, title: s.bingo_cards?.title || 'Naamloze Sessie', host_id: s.host_id, started_at: s.created_at, is_host: s.host_id === userId, game_mode: s.game_mode, last_active: s.updated_at || s.created_at });
          }
        });
      }
      setJoinedSessions(Array.from(gamesMap.values()).sort((a, b) => new Date(b.started_at) - new Date(a.started_at)));
    } catch (err) { console.error(err); }
  };

  const fetchTotalSessions = async (userId) => {
    const { count } = await supabase.from('bingo_sessions').select('*', { count: 'exact', head: true }).eq('host_id', userId);
    setSessionCount(count || 0);
  };

  // --- ACTIONS ---
  
  // NIEUW: UPDATE AVATAR
  const updateAvatar = async (newIcon, newColor) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_icon: newIcon, avatar_color: newColor })
            .eq('id', userData.id);

        if (error) throw error;
        
        setUserData(prev => ({ ...prev, avatarIcon: newIcon, avatarColor: newColor }));
        setNotification('Avatar succesvol bijgewerkt!');
        setTimeout(() => setNotification(''), 4000);
    } catch (e) {
        setNotification('Fout bij bijwerken avatar.');
        setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleAddFriend = async () => {
      if (!newFriendId.trim()) return alert("Vul een User ID in.");
      if (newFriendId === userData.id) return alert("Je kan jezelf niet toevoegen.");
      setAddingFriend(true);
      try {
          const { data: profile, error: pError } = await supabase.from('profiles').select('id, username').eq('id', newFriendId).single();
          if (pError || !profile) {
              alert("Gebruiker niet gevonden. Check het ID.");
              setAddingFriend(false);
              return;
          }
          const { error: fError } = await supabase.from('friends').insert({ user_id: userData.id, friend_id: newFriendId });
          if (fError) {
              if (fError.code === '23505') alert("Deze gebruiker staat al in je lijst.");
              else alert("Fout bij toevoegen.");
          } else {
              setNotification(`${profile.username} toegevoegd!`);
              setNewFriendId('');
              fetchFriends(userData.id);
              setTimeout(() => setNotification(''), 4000);
          }
      } catch (e) { alert("Er ging iets mis."); } finally { setAddingFriend(false); }
  };

  const handleRemoveFriend = async (friendId, recordId) => {
      if (!confirm("Vriend verwijderen?")) return;
      const { error } = await supabase.from('friends').delete().eq('id', recordId);
      if (!error) { setFriends(prev => prev.filter(f => f.id !== recordId)); }
  };

  const toggleLike = async (card) => {
      if (!userData) return;
      const isLiked = likedCardIds.has(card.id);
      const newSet = new Set(likedCardIds);
      if (isLiked) {
          newSet.delete(card.id);
          setFavoriteCards(prev => prev.filter(c => c.id !== card.id));
      } else {
          newSet.add(card.id);
          setFavoriteCards(prev => [card, ...prev]);
      }
      setLikedCardIds(newSet);
      try {
          if (isLiked) await supabase.from('favorites').delete().eq('user_id', userData.id).eq('card_id', card.id);
          else await supabase.from('favorites').insert({ user_id: userData.id, card_id: card.id });
      } catch (e) { fetchFavorites(userData.id); }
  };

  const copyUserId = () => {
      if (userData?.id) {
          navigator.clipboard.writeText(userData.id);
          setIdCopied(true);
          setTimeout(() => setIdCopied(false), 2000);
      }
  };

  const confirmDeleteCard = (cardId) => { setModalState({ isOpen: true, type: 'delete_card', data: cardId }); };
  const confirmStopSession = (sessionId) => { setModalState({ isOpen: true, type: 'stop_session', data: sessionId }); };

  const handleModalConfirm = async () => {
      setActionLoading(true);
      const { type, data } = modalState;
      if (type === 'delete_card') {
          const { error } = await supabase.from('bingo_cards').delete().eq('id', data);
          if (!error) {
              setCards(current => current.filter(c => c.id !== data));
              setNotification("Kaart verwijderd.");
          }
      }
      if (type === 'stop_session') {
          const { error } = await supabase.from('bingo_sessions').update({ status: 'finished' }).eq('id', data);
          if (!error) {
              setActiveSessions(c => c.filter(s => s.id !== data));
              setJoinedSessions(c => c.filter(s => s.id !== data));
              setNotification("Sessie beëindigd.");
          }
      }
      setActionLoading(false);
      setModalState({ isOpen: false, type: null, data: null });
      setTimeout(() => setNotification(''), 4000);
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
    } finally { setUpdatingName(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const getTabLabel = (tab) => {
    switch(tab) {
        case 'cards': return 'Mijn Kaarten';
        case 'sessions': return 'Openstaande Spellen';
        case 'favorites': return 'Favorieten';
        case 'friends': return 'Vrienden';
        case 'account': return 'Mijn Account';
        default: return 'Menu';
    }
  };

  if (loading && !userData) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-orange-500 font-black text-2xl animate-pulse uppercase italic">Laden...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 selection:bg-orange-100">
      
      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onConfirm={handleModalConfirm}
        title={modalState.type === 'delete_card' ? 'Kaart Verwijderen' : 'Sessie Stoppen'}
        type="danger"
        confirmText={modalState.type === 'delete_card' ? 'Verwijderen' : 'Stoppen'}
        loading={actionLoading}
      >
        {modalState.type === 'delete_card' ? "Weet je zeker dat je deze bingokaart wilt verwijderen?" : "Weet je zeker dat je dit spel wilt beëindigen?"}
      </Modal>

      <div className="max-w-7xl mx-auto p-6 pt-10">
        
        {notification && (
          <div className="mb-8 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-4">
            <CheckCircle className="text-green-500 shrink-0" size={24} />
            <div><p className="font-black text-sm uppercase tracking-wide">Succes!</p><p className="text-sm font-medium">{notification}</p></div>
          </div>
        )}

        {/* HEADER */}
        <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="w-full lg:w-auto">
            <h2 className="text-4xl font-black text-gray-900 uppercase italic mb-6 tracking-tighter">Mijn Dashboard</h2>
            <div className="hidden lg:flex p-1 bg-white border border-gray-200 rounded-2xl w-fit shadow-sm">
              {['cards', 'sessions', 'favorites', 'friends', 'account'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>{getTabLabel(tab)}</button>
              ))}
            </div>
            <div className="lg:hidden relative w-full z-30">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 flex justify-between items-center shadow-sm text-gray-900 font-black uppercase tracking-widest text-xs">
                    {getTabLabel(activeTab)}
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {['cards', 'sessions', 'favorites', 'friends', 'account'].map((tab) => (
                            <button key={tab} onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }} className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors ${activeTab === tab ? 'text-orange-500 bg-orange-50' : 'text-gray-500'}`}>{getTabLabel(tab)}</button>
                        ))}
                    </div>
                )}
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto justify-end">
             <Link to="/create" className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition shadow-lg hover:shadow-orange-200 active:scale-95 flex items-center gap-2 h-fit">
                <Plus size={16} strokeWidth={3} /> Nieuwe Bingo
             </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
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
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(card); }} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-pink-50 transition-all shadow-sm group-hover:scale-110">
                            <Heart size={18} className={likedCardIds.has(card.id) ? "fill-pink-500 text-pink-500" : "text-gray-300 hover:text-pink-400"} />
                        </button>
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4 pr-10">
                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${card.is_public ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{card.is_public ? 'Publiek' : 'Privé'}</div>
                            <div className="bg-orange-50 text-orange-500 border border-orange-100 px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5"><Eye size={12} /> {card.play_count || 0}</div>
                          </div>
                          <h3 className="text-xl font-black text-gray-900 uppercase italic mb-6 break-words line-clamp-2">{card.title}</h3>
                          <div className="flex gap-2 mt-auto">
                            <button onClick={() => navigate(`/setup/${card.id}`)} className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-orange-600 shadow-md"><Play size={14} fill="currentColor" /> Speel</button>
                            <button onClick={() => navigate(`/edit/${card.id}`)} className="flex-1 bg-gray-50 text-gray-600 py-3 rounded-xl flex items-center justify-center hover:bg-gray-200 border border-gray-100"><Edit size={16} /></button>
                            <button onClick={() => confirmDeleteCard(card.id)} className="flex-none px-3 bg-red-50 text-red-400 py-3 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-50"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {joinedSessions.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                      <div className="bg-blue-50 p-6 rounded-full inline-block mb-6"><Gamepad2 className="text-blue-400" size={48} /></div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">Geen open spellen</h3>
                      <p className="text-gray-400 font-bold text-sm max-w-md mx-auto mb-8">Je hebt geen actieve sessies.</p>
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
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                              <span className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{session.title}</span>
                              <div className="flex gap-2">
                                {session.is_host && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-md font-black uppercase">Host</span>}
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${session.game_mode === 'hall' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{session.game_mode === 'hall' ? 'Zaal' : 'Solo'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Gamepad2 size={14}/> Code: <span className="text-gray-900">{session.join_code}</span></span>
                              <span className="flex items-center gap-1"><Clock size={14}/> {new Date(session.started_at).toLocaleDateString()}</span>
                              <SessionTimer lastActive={session.last_active} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Link to={`/play-session/${session.id}`} className="flex-1 sm:flex-none bg-gray-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg active:scale-95 text-center">Speel Verder</Link>
                          {session.is_host && (
                            <button onClick={() => confirmStopSession(session.id)} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-red-100" title="Sessie stoppen"><StopCircle size={20} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {favoriteCards.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="bg-pink-50 p-6 rounded-full inline-block mb-6"><Heart className="text-pink-400" size={48} /></div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">Nog geen favorieten</h3>
                        <p className="text-gray-400 font-bold text-sm max-w-md mx-auto mb-8">Klik op het hartje bij een kaart om hem hier op te slaan!</p>
                        <Link to="/community" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg">Ontdek de Community</Link>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {favoriteCards.map((card) => (
                        <div key={card.id} className="group relative bg-white rounded-[2rem] border-2 border-transparent hover:border-pink-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                            <button onClick={(e) => { e.stopPropagation(); toggleLike(card); }} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-gray-100 transition-all shadow-sm">
                                <Heart size={18} className="fill-pink-500 text-pink-500" />
                            </button>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4 pr-10">
                                    <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${card.is_public ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{card.is_public ? 'Publiek' : 'Privé'}</div>
                                    <div className="bg-orange-50 text-orange-500 border border-orange-100 px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5"><Eye size={12} /> {card.play_count || 0}</div>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase italic mb-6 break-words line-clamp-2">{card.title}</h3>
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => navigate(`/setup/${card.id}`)} className="w-full bg-pink-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-pink-600 shadow-md"><Play size={14} fill="currentColor" /> Speel</button>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'friends' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-8">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-4 flex items-center gap-2"><UserPlus className="text-orange-500"/> Vriend Toevoegen</h3>
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                placeholder="Vul User ID in (bijv. a0eebc...)" 
                                value={newFriendId}
                                onChange={(e) => setNewFriendId(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500 transition-all"
                            />
                            <button onClick={handleAddFriend} disabled={addingFriend} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-orange-600 transition-colors shadow-lg active:scale-95 disabled:opacity-50">
                                {addingFriend ? <Loader2 className="animate-spin" /> : 'Toevoegen'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Mijn Vrienden ({friends.length})</h3>
                        {friends.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-[2rem] border border-gray-100 border-dashed">
                                <p className="text-gray-400 font-bold uppercase text-xs">Je hebt nog geen vrienden toegevoegd.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {friends.map((friend) => (
                                    <div key={friend.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-black text-gray-500">
                                                {friend.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 uppercase text-sm">{friend.profiles?.username || 'Onbekend'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {friend.friend_id.substring(0,8)}...</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveFriend(friend.friend_id, friend.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><UserMinus size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'account' && userData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                  <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-6">
                      {/* DYNAMISCHE AVATAR PREVIEW IN HEADER */}
                      <AvatarPreview iconName={userData.avatarIcon} bgColor={userData.avatarColor} size={96} />
                      <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-wide">{userData.username}</h3>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Lid sinds {new Date(userData.createdAt).getFullYear()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-10">
                    
                    {/* NIEUW: AVATAR BUILDER SECTIE */}
                    <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex flex-col items-center gap-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preview</label>
                            <AvatarPreview iconName={userData.avatarIcon} bgColor={userData.avatarColor} size={120} />
                        </div>
                        <div className="flex-1 space-y-6 w-full">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Kies Kleur</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {AVATAR_COLORS.map(color => (
                                        <button 
                                            key={color} 
                                            onClick={() => updateAvatar(userData.avatarIcon, color)}
                                            className={`w-9 h-9 rounded-full ${color} border-4 transition-all ${userData.avatarColor === color ? 'border-gray-900 scale-110 shadow-md' : 'border-white hover:scale-105'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Kies Icoon</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {Object.keys(AVATAR_ICONS).map(iconName => {
                                        const Icon = AVATAR_ICONS[iconName];
                                        return (
                                            <button 
                                                key={iconName} 
                                                onClick={() => updateAvatar(iconName, userData.avatarColor)}
                                                className={`p-2.5 rounded-xl border-2 transition-all ${userData.avatarIcon === iconName ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-white hover:border-orange-200'}`}
                                            >
                                                <Icon size={22} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

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
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">User ID</label>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-gray-500 font-mono text-xs truncate mr-4"><Shield size={18} className="text-orange-500 shrink-0" />{userData.id}</div>
                              <button onClick={copyUserId} className={`p-2 rounded-xl transition-all ${idCopied ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 hover:text-orange-500 hover:bg-orange-50 shadow-sm'}`} title="Kopieer ID">{idCopied ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                          </div>
                      </div>
                    </div>
                    <div className="pt-4"><button onClick={handleLogout} className="w-full bg-red-50 text-red-500 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"><LogOut size={16} /> Uitloggen</button></div>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
               <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="bg-white/10 p-2 rounded-lg"><Activity className="text-orange-400" size={20} /></div>
                  <h3 className="text-lg font-black italic uppercase">Live Host</h3>
               </div>
               <div className="space-y-3 relative z-10">
                  {activeSessions.length > 0 ? (
                    <>
                        {activeSessions.slice(0, 3).map(session => (
                        <div key={session.id} className="bg-white/10 p-4 rounded-2xl border border-white/5 hover:bg-white/20 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Code: {session.join_code}</p>
                                <button onClick={() => confirmStopSession(session.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"><X size={16} /></button>
                            </div>
                            <h4 className="font-bold text-sm mb-3 truncate">{session.bingo_cards?.title || 'Naamloze Sessie'}</h4>
                            <Link to={`/play-session/${session.id}`} className="block w-full bg-orange-500 text-center py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors">Hervatten</Link>
                        </div>
                        ))}
                        {activeSessions.length > 3 && (
                            <button onClick={() => setActiveTab('sessions')} className="w-full py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white flex items-center justify-center gap-1 group">
                                Bekijk alle {activeSessions.length} sessies <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                            </button>
                        )}
                    </>
                  ) : (
                    <div className="text-center py-6"><p className="text-gray-500 text-xs font-bold uppercase">Geen host sessies</p></div>
                  )}
               </div>
            </div>

            {cards.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><BarChart3 size={20} /></div>
                    <h3 className="text-lg font-black text-gray-900 italic uppercase">Jouw Impact</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Eye size={12}/> Views</p><p className="text-2xl font-black text-gray-900">{cards.reduce((sum, card) => sum + (card.play_count || 0), 0)}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Gamepad2 size={12}/> Hosted</p><p className="text-2xl font-black text-orange-500">{sessionCount}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><LayoutGrid size={12}/> Cards</p><p className="text-2xl font-black text-gray-900">{cards.length}</p></div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-center gap-1"><Trophy size={12}/> Top</p>{cards.length > 0 ? <p className="text-xs font-black text-gray-900 line-clamp-1">{cards.reduce((prev, current) => (prev.play_count > current.play_count) ? prev : current).title}</p> : <p>-</p>}</div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}