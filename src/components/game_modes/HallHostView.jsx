import { Users, Play, RotateCcw, Smartphone, Star, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, AlertOctagon, AlertTriangle } from 'lucide-react';

export default function HallHostView({ 
    currentDraw, drawnItems, participants, verificationClaim, setVerificationClaim, handleHostDraw, resetDraws, session, sessionId, supabase, winPattern 
}) {

    const handleFalseBingo = async () => {
        const validIndices = verificationClaim.marked_indices.filter(idx => {
            if (idx === 12) return true;
            const itemText = verificationClaim.grid_snapshot[idx];
            return drawnItems.includes(itemText);
        });
        await supabase.from('session_participants').update({ has_bingo: false, marked_indices: validIndices, updated_at: new Date().toISOString() }).eq('id', verificationClaim.id);
        
        // FIX: Kanaalnaam matcht nu met PlayBingo.jsx
        await supabase.channel(`room_${sessionId}`).send({ type: 'broadcast', event: 'false_bingo', payload: {} });
        setVerificationClaim(null);
    };

    const handleConfirmWin = async () => {
        await supabase.from('bingo_sessions').update({ 
            status: 'finished', 
            winner_name: verificationClaim.user_name, // NAAM OPSLAAN
            updated_at: new Date().toISOString() 
        }).eq('id', sessionId);
        
        // FIX: Kanaalnaam matcht nu met PlayBingo.jsx
        await supabase.channel(`room_${sessionId}`).send({ type: 'broadcast', event: 'game_won', payload: { winnerName: verificationClaim.user_name } });
        setVerificationClaim(null);
    };

    const getWinningIndices = (grid, marked) => {
        if (!grid || !marked) return [];
        const rows = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];
        let winningIndices = new Set();

        if (winPattern === 'full') return marked; 

        rows.forEach(row => {
            if (row.every(index => marked.includes(index))) {
                row.forEach(idx => winningIndices.add(idx));
            }
        });
        return Array.from(winningIndices);
    };

    const winningIndices = verificationClaim ? getWinningIndices(verificationClaim.grid_snapshot, verificationClaim.marked_indices) : [];

    return (
        <div className="w-full max-w-6xl mx-auto -mt-24 relative z-20 animate-in slide-in-from-top-4 duration-500">
            {verificationClaim && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-5 w-full max-w-lg shadow-2xl border-4 border-orange-500 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black uppercase italic text-gray-900 flex items-center gap-2"><AlertOctagon className="text-orange-500"/> Controle</h2>
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wide truncate max-w-[150px]">{verificationClaim.user_name}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 border-2 border-gray-100 mb-4">
                            <div className="grid grid-cols-5 gap-2">
                                {verificationClaim?.grid_snapshot?.map((item, i) => {
                                    const isMarked = verificationClaim.marked_indices.includes(i);
                                    const isDrawn = i === 12 || drawnItems.includes(item);
                                    const isPartOfWin = winningIndices.includes(i);
                                    const isNumber = /^\d+$/.test(item);
                                    let cellClass = 'bg-white text-gray-300 border-gray-200';
                                    if (i === 12) cellClass = 'bg-gray-800 text-white border-gray-900';
                                    else if (isMarked) {
                                        if (isPartOfWin) {
                                            if (isDrawn) cellClass = 'bg-green-500 text-white border-green-600 shadow-md scale-105 z-10';
                                            else cellClass = 'bg-red-500 text-white border-red-600 animate-pulse';
                                        } else cellClass = 'bg-gray-100 text-gray-400 border-gray-300';
                                    }
                                    return (
                                        <div key={i} className={`aspect-square flex items-center justify-center p-1 font-black uppercase text-center rounded-xl border-2 leading-tight break-words transition-all ${cellClass} ${isNumber ? 'text-lg' : 'text-[7px]'}`}>
                                            {i === 12 ? <Star size={14} fill="currentColor"/> : <span>{item}</span>}
                                        </div>
                                    )
                                }) || <p className="col-span-5 text-center">Laden...</p>}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleFalseBingo} className="flex-1 bg-red-50 text-red-600 border-2 border-red-100 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"><ThumbsDown size={16}/> Valse Bingo</button>
                            <button onClick={handleConfirmWin} className="flex-1 bg-green-500 text-white border-2 border-green-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-green-600 transition-all shadow-xl flex items-center justify-center gap-2"><ThumbsUp size={16}/> Goedkeuren</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col-reverse lg:flex-row gap-6">
                {/* REST VAN DE LAYOUT BLIJFT GELIJK - ALLEEN CHANNEL NAAM AANGEPAST IN FUNCTIES */}
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border-4 border-purple-500 overflow-hidden relative min-h-[300px] md:min-h-[400px] flex flex-col">
                    <div className="bg-purple-500 p-3 text-center border-b border-purple-400 flex justify-between items-center px-6">
                        <h2 className="text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm">{currentDraw ? "ON AIR" : "LOBBY FASE"}</h2>
                        {currentDraw && <button onClick={resetDraws} className="text-white/60 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><RotateCcw size={12}/> Reset</button>}
                    </div>
                    <div className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center text-center">
                        {!currentDraw ? (
                            <div className="animate-in zoom-in">
                                <Users className="text-purple-200 w-16 h-16 md:w-24 md:h-24 mx-auto mb-4" />
                                <h2 className="text-2xl md:text-4xl font-black text-gray-900 uppercase italic mb-2">Wachten op spelers...</h2>
                                <button onClick={handleHostDraw} className="bg-purple-600 text-white px-8 py-4 md:px-12 md:py-5 rounded-2xl font-black text-lg md:text-xl uppercase tracking-widest hover:bg-purple-500 hover:scale-105 transition-all shadow-xl shadow-purple-200 mt-6"><Play fill="currentColor" className="inline-block mr-2 mb-1" size={20}/> Start Spel</button>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col justify-center animate-in zoom-in">
                                <span className="text-[10px] md:text-xs font-black text-purple-400 uppercase tracking-widest mb-2 md:mb-4">Huidig Getrokken Item</span>
                                <div className="text-4xl md:text-7xl font-black text-gray-900 uppercase italic leading-tight py-4 break-words">{currentDraw}</div>
                                <div className="mt-6 md:mt-8 flex flex-col gap-3">
                                    <button onClick={handleHostDraw} className="bg-purple-600 text-white px-8 py-4 rounded-xl font-black text-sm md:text-lg uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg active:scale-95">Trek Volgende</button>
                                    <button onClick={async () => await supabase.channel(`room_${sessionId}`).send({ type: 'broadcast', event: 'false_bingo', payload: {} })} className="bg-red-50 text-red-500 border border-red-100 px-8 py-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"><AlertTriangle size={16}/> Alarm Test</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-full lg:w-96 bg-gray-900 rounded-[2.5rem] shadow-2xl p-6 md:p-8 text-white flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                    <h3 className="text-lg md:text-xl font-black italic uppercase mb-4 md:mb-6 relative z-10">Scan & Join</h3>
                    <div className="bg-white p-3 md:p-4 rounded-2xl mb-4 md:mb-6 relative z-10"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.href}`} alt="QR Code" className="w-32 h-32 md:w-48 md:h-48 mix-blend-multiply" /></div>
                    <div className="w-full bg-white/10 rounded-xl p-3 md:p-4 mb-4 backdrop-blur-sm border border-white/5"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Code</p><p className="text-2xl md:text-3xl font-black text-white tracking-widest">{session?.join_code}</p></div>
                    <div className="w-full flex items-center justify-between px-2 md:px-4"><div className="flex items-center gap-2"><Smartphone size={16} className="text-purple-400"/><span className="text-xs md:text-sm font-bold">Spelers:</span></div><span className="text-xl md:text-2xl font-black text-purple-400">{participants.length}</span></div>
                </div>
            </div>
        </div>
    );
}