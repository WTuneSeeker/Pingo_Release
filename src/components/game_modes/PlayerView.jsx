import React from 'react';
import { Shuffle, Sparkles, Trophy, Zap, Rocket, Flame, Star, Ghost, Gem, PartyPopper, Crown, Grid3X3, Users, UserMinus } from 'lucide-react';

export default function PlayerView({ 
    grid = [], 
    marked = [], 
    toggleTile, 
    handleShuffleClick, 
    bingoCount, 
    gameMode, 
    currentDraw, 
    participants = [], 
    isHost, 
    session, 
    sessionId, 
    myUserId, 
    supabase, 
    showShuffleConfirm, 
    setShowShuffleConfirm, 
    confirmShuffle 
}) {
    
    // FIX: Volledige Branding Lijst (ook hier nodig voor lobby)
    const getBranding = (rowCount, isFull) => {
        const titles = {
            0: { title: "PINGO", icon: <Sparkles size={16} /> },
            1: { title: "BINGO!", icon: <Trophy size={16} />, lobbyClass: "bg-orange-500 border-orange-600 text-white shadow-lg" },
            2: { title: "DUBBEL!", icon: <Zap size={16} />, lobbyClass: "bg-orange-600 border-orange-700 text-white shadow-lg" },
            3: { title: "TRIPPEL!", icon: <Rocket size={16} />, lobbyClass: "bg-red-500 border-red-600 text-white shadow-lg" },
            4: { title: "QUADRA!", icon: <Flame size={16} />, lobbyClass: "bg-red-600 border-red-700 text-white shadow-lg" },
            5: { title: "SUPER!", icon: <Star size={16} />, lobbyClass: "bg-purple-500 border-purple-600 text-white shadow-lg" },
            6: { title: "ULTRA!", icon: <Sparkles size={16} />, lobbyClass: "bg-purple-600 border-purple-700 text-white shadow-lg" },
            7: { title: "HYPER!", icon: <Zap size={16} />, lobbyClass: "bg-indigo-500 border-indigo-600 text-white shadow-lg" },
            8: { title: "INSANE!", icon: <Ghost size={16} />, lobbyClass: "bg-indigo-600 border-indigo-700 text-white shadow-lg" },
            9: { title: "GODLY!", icon: <Crown size={16} />, lobbyClass: "bg-yellow-400 border-yellow-500 text-black shadow-lg" },
            10: { title: "MYSTICAL!", icon: <Gem size={16} />, lobbyClass: "bg-pink-500 border-pink-600 text-white shadow-lg" },
            11: { title: "CELESTIAL!", icon: <PartyPopper size={16} />, lobbyClass: "bg-pink-600 border-pink-700 text-white shadow-lg" },
            12: { title: "FULL BINGO!", icon: <Crown size={16} />, lobbyClass: "bg-gray-900 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)]" }
        };
        const level = Math.min(rowCount, 12);
        const branding = titles[level] || titles[1];
        if (!branding.lobbyClass) branding.lobbyClass = "bg-white border-gray-50 text-gray-700";
        return branding;
    };

    return (
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-7xl mx-auto">
            {showShuffleConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center border-4 border-orange-500 shadow-2xl">
                        <Shuffle size={48} className="text-orange-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black uppercase italic mb-2 text-gray-900">Kaart Husselen?</h2>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowShuffleConfirm(false)} className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-gray-100">Annuleren</button>
                            <button onClick={confirmShuffle} className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-orange-500 text-white">Ja</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 w-full max-w-[600px] flex flex-col items-center mx-auto lg:mx-0">
                {gameMode === 'hall' && (
                   <div className="w-full bg-purple-600 text-white p-6 rounded-3xl mb-8 shadow-xl text-center border-4 border-purple-400 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400 rounded-full blur-[50px] opacity-50"></div>
                      <p className="font-black text-xs uppercase tracking-widest mb-2 opacity-80 relative z-10">Kijk naar het grote scherm!</p>
                      <p className="text-3xl font-black italic uppercase relative z-10">{currentDraw || "Wachten..."}</p>
                   </div>
                )}

                <div className="w-full flex justify-between items-end mb-3 px-2">
                  <div className="flex items-center gap-2 text-gray-400">
                     <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg">
                       {Math.max(0, (marked?.filter(Boolean).length || 0) - 1)}/24
                     </span>
                  </div>
                  <button onClick={handleShuffleClick} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-colors">
                    <Shuffle size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    Kaart Husselen
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full mb-12">
                  {grid && grid.map((text, index) => {
                    const isNumber = /^\d+$/.test(text);
                    return (
                        <button key={index} onClick={() => toggleTile(index)} className={`relative aspect-square flex items-center justify-center p-1 sm:p-2 text-center rounded-2xl transition-all border-2 font-black uppercase overflow-hidden ${index === 12 || marked[index] ? 'bg-orange-500 text-white border-orange-400 scale-95 shadow-inner' : 'bg-white text-gray-800 border-gray-100 hover:border-orange-200'}`}>
                          <span className={`leading-[1.1] tracking-tight break-words hyphens-auto w-full select-none ${index === 12 ? 'text-[8px] sm:text-[10px]' : isNumber ? 'text-xl sm:text-3xl' : 'text-[7px] sm:text-xs'}`}>
                            {index === 12 ? "PINGO FREE" : text}
                          </span>
                        </button>
                    );
                  })}
                </div>
            </div>

            {/* FIX: LOBBY ALLEEN TONEN BIJ MEERDERE SPELERS */}
            {participants && participants.length > 0 && gameMode !== 'hall' && session?.max_players > 1 && (
                <div className="w-full lg:w-96 shrink-0 bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl border border-white/50 mb-12 lg:sticky lg:top-32">
                    <div className="flex items-center justify-between mb-6 pl-2"><h3 className="text-xl font-black text-gray-900 flex items-center gap-3 italic uppercase"><Users className="text-orange-500" size={24} /> Lobby <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-sm not-italic ml-1">{participants.length}</span></h3></div>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto p-4 -mx-4 custom-scrollbar">
                        {participants.map((p) => {
                            const pCount = p.marked_indices?.length || 0;
                            const pFull = pCount === 25;
                            const tempG = new Array(25).fill(false);
                            if(p.marked_indices) p.marked_indices.forEach(i=>tempG[i]=true);
                            
                            const pWins = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]].filter(r => r.every(i => tempG[i])).length;
                            const branding = getBranding(pWins, pFull);
                            
                            const hasStatus = (gameMode === 'rows' && pWins > 0) || pFull;

                            return (
                                <div key={p.id} className={`group relative flex items-center gap-4 p-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${branding.lobbyClass} ${hasStatus ? 'shadow-md scale-[1.02]' : 'hover:border-orange-100 hover:shadow-md'}`}>
                                    <div className="relative shrink-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${hasStatus ? 'bg-white/20 backdrop-blur-sm' : 'bg-gray-100 text-gray-500'}`}>
                                            {(p.user_name || "S").charAt(0).toUpperCase()}
                                        </div>
                                        {p.user_id === session?.host_id && <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 p-0.5 rounded-full border-2 border-white shadow-sm z-10"><Crown size={10} fill="currentColor" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-12 relative">
                                        <div className="flex justify-between items-center mb-0.5"><span className="font-black text-xs uppercase truncate">{p.user_name || "Speler"}</span></div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest truncate flex items-center gap-1 opacity-80`}>{hasStatus ? (<>{branding.icon} {branding.title}</>) : 'Spelend...'}</span>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end w-16 h-full">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${hasStatus ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>{pCount > 0 ? pCount - 1 : 0}/24</span>
                                            {isHost && p.user_id !== myUserId && (
                                                <button onClick={async () => { await supabase.from('bingo_sessions').update({ banned_users: [...(session.banned_users||[]), p.user_id] }).eq('id', sessionId); await supabase.from('session_participants').delete().eq('id', p.id); }} className={`absolute right-0 p-1.5 rounded-lg transition-all duration-300 transform translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 ${hasStatus ? 'hover:bg-white/20' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'} `} title="Verwijder speler"><UserMinus size={14} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}