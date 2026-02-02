import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Dices, RotateCcw, ChevronRight, RefreshCw, AlertOctagon, ThumbsDown, ThumbsUp, Star, X, Check } from 'lucide-react';

// HULPFUNCTIE: Bepaal letter bij nummer
const getBingoLetter = (num) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
};

// HULPFUNCTIE: Bepaal kleur en reeks voor rijen
const getRowData = (letter) => {
    switch(letter) {
        case 'B': return { color: 'text-blue-500 bg-blue-50 border-blue-200', range: [1, 15] };
        case 'I': return { color: 'text-red-500 bg-red-50 border-red-200', range: [16, 30] };
        case 'N': return { color: 'text-green-500 bg-green-50 border-green-200', range: [31, 45] };
        case 'G': return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', range: [46, 60] };
        case 'O': return { color: 'text-purple-500 bg-purple-50 border-purple-200', range: [61, 75] };
        default: return { color: 'text-gray-500', range: [] };
    }
};

export default function ClassicHostView({ 
    session, 
    supabase, 
    verificationClaim, 
    setVerificationClaim, 
    setWinner, 
    setShowWinnerPopup
}) {
    const [lastNumber, setLastNumber] = useState(session.current_draw);
    const [history, setHistory] = useState(session.drawn_items || []);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(session.draw_speed || 5);
    
    const timerRef = useRef(null);
    const countdownRef = useRef(null);

    // --- ENGINE LOGICA ---
    useEffect(() => {
        if (isPlaying && !verificationClaim) {
            countdownRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) return session.draw_speed;
                    return prev - 1;
                });
            }, 1000);

            timerRef.current = setInterval(drawNextBall, session.draw_speed * 1000);
        } else {
            clearInterval(timerRef.current);
            clearInterval(countdownRef.current);
        }

        return () => {
            clearInterval(timerRef.current);
            clearInterval(countdownRef.current);
        };
    }, [isPlaying, history, verificationClaim]);

    useEffect(() => {
        if (verificationClaim) setIsPlaying(false);
    }, [verificationClaim]);

    const drawNextBall = async () => {
        const allNumbers = Array.from({length: 75}, (_, i) => i + 1);
        const available = allNumbers.filter(n => !history.includes(n));

        if (available.length === 0) { setIsPlaying(false); return; }

        const nextNum = available[Math.floor(Math.random() * available.length)];
        const newHistory = [nextNum, ...history];

        setLastNumber(nextNum);
        setHistory(newHistory);
        setTimeLeft(session.draw_speed);

        await supabase.from('bingo_sessions').update({ current_draw: nextNum, drawn_items: newHistory, updated_at: new Date().toISOString() }).eq('id', session.id);
    };

    const resetGame = async () => {
        if (confirm("Weet je zeker dat je wilt resetten?")) {
            setIsPlaying(false);
            setLastNumber(null);
            setHistory([]);
            setTimeLeft(session.draw_speed);
            await supabase.from('bingo_sessions').update({ current_draw: null, drawn_items: [] }).eq('id', session.id);
        }
    };

    // --- VERIFICATIE ACTIES (AANGEPAST) ---
    
    const handleFalseBingo = async () => {
        if (!verificationClaim) return;

        // 1. Haal de gemarkeerde vakjes en het grid van de speler op
        const markedIndices = verificationClaim.marked_indices || [];
        const playerGrid = verificationClaim.grid_snapshot || [];

        // 2. Filter: Houd alleen de vakjes die ÉCHT getrokken zijn (of FREE space)
        const correctedIndices = markedIndices.filter(index => {
            // Index 12 is altijd FREE space (geldig)
            if (index === 12) return true;

            // Haal de waarde op van dit vakje op de kaart van de speler
            const cellValue = playerGrid[index];

            // Check of dit nummer voorkomt in de getrokken geschiedenis
            // We gebruiken Number() voor de zekerheid, hoewel classic grid al numbers heeft
            return history.includes(Number(cellValue));
        });

        // 3. Update de speler in de database:
        // - Zet has_bingo op FALSE
        // - Overschrijf marked_indices met de GECORRIGEERDE lijst (dus valse vakjes zijn weg)
        await supabase
            .from('session_participants')
            .update({ 
                has_bingo: false, 
                marked_indices: correctedIndices, // <--- HIER GEBEURT DE MAGIC
                updated_at: new Date().toISOString() 
            })
            .eq('id', verificationClaim.id);
        
        // 4. Stuur broadcast voor geluid/notificatie
        await supabase.channel(`room_${session.id}`).send({ type: 'broadcast', event: 'false_bingo', payload: {} });
        
        setVerificationClaim(null);
    };

    const handleConfirmWin = async () => {
        if (!verificationClaim) return;
        
        await supabase.from('bingo_sessions').update({ 
            status: 'finished', 
            winner_name: verificationClaim.user_name,
            updated_at: new Date().toISOString() 
        }).eq('id', session.id);
        
        await supabase.channel(`room_${session.id}`).send({ type: 'broadcast', event: 'game_won', payload: { winnerName: verificationClaim.user_name } });
        
        if (setWinner && setShowWinnerPopup) {
            setWinner(verificationClaim.user_name);
            setShowWinnerPopup(true);
        }

        setVerificationClaim(null);
    };

    const getWinningIndices = (grid, marked) => {
        if (!grid || !marked) return [];
        const rows = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24]];
        const cols = [[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24]];
        const diags = [[0,6,12,18,24],[4,8,12,16,20]];
        const allLines = [...rows, ...cols, ...diags];

        let winningIndices = new Set();
        if (session.win_pattern === 'full') return marked; 

        allLines.forEach(line => {
            if (line.every(index => marked.includes(index))) {
                line.forEach(idx => winningIndices.add(idx));
            }
        });
        return Array.from(winningIndices);
    };

    const currentStyle = lastNumber ? getRowData(getBingoLetter(lastNumber)) : { color: 'border-gray-200' };

    // 2. RENDER DE UI
    return (
        <div className="w-full max-w-7xl mx-auto py-6 flex flex-col gap-12 relative">
            
            {/* --- VERIFICATIE POPUP --- */}
            {verificationClaim && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-5 w-full max-w-lg shadow-2xl border-4 border-orange-500 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black uppercase italic text-gray-900 flex items-center gap-2"><AlertOctagon className="text-orange-500"/> Controle</h2>
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wide truncate max-w-[150px]">{verificationClaim.user_name}</span>
                        </div>
                        
                        {/* HET GRID VAN DE SPELER */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 border-2 border-gray-100 mb-4">
                            <div className="grid grid-cols-5 gap-2">
                                {verificationClaim?.grid_snapshot?.map((item, i) => {
                                    const isMarked = verificationClaim.marked_indices.includes(i);
                                    // Check of het getal ook echt getrokken is (of free space)
                                    const isDrawn = i === 12 || history.includes(Number(item));
                                    const isPartOfWin = getWinningIndices(verificationClaim.grid_snapshot, verificationClaim.marked_indices).includes(i);
                                    
                                    let cellClass = 'bg-white text-gray-300 border-gray-200';
                                    if (i === 12) cellClass = 'bg-gray-800 text-white border-gray-900'; // Free space
                                    else if (isMarked) {
                                        if (isPartOfWin) {
                                            // Winnaar en getrokken = GROEN
                                            if (isDrawn) cellClass = 'bg-green-500 text-white border-green-600 shadow-md scale-105 z-10';
                                            // Winnaar maar NIET getrokken = VALS (ROOD)
                                            else cellClass = 'bg-red-500 text-white border-red-600 animate-pulse';
                                        } else {
                                            // Gewoon gemarkeerd
                                            if (isDrawn) cellClass = 'bg-blue-100 text-blue-900 border-blue-200'; // Geldig gemarkeerd
                                            else cellClass = 'bg-red-100 text-red-900 border-red-200 opacity-60'; // Ongeldig gemarkeerd (foutje)
                                        }
                                    }
                                    
                                    return (
                                        <div key={i} className={`aspect-square flex items-center justify-center p-1 font-black uppercase text-center rounded-xl border-2 leading-tight break-words transition-all ${cellClass} text-sm`}>
                                            {i === 12 ? <Star size={14} fill="currentColor"/> : <span>{item}</span>}
                                        </div>
                                    )
                                }) || <p className="col-span-5 text-center">Laden...</p>}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleFalseBingo} className="flex-1 bg-red-50 text-red-600 border-2 border-red-100 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"><X size={16}/> Valse Bingo</button>
                            <button onClick={handleConfirmWin} className="flex-1 bg-green-500 text-white border-2 border-green-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-green-600 transition-all shadow-xl flex items-center justify-center gap-2"><Check size={16}/> Goedkeuren</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ... REST VAN DE UI (BAL & BORD) ... */}
            <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:gap-24 px-4 lg:px-12">
                {/* 1. DE GROTE BAL (LINKS) */}
                <div className="relative shrink-0 group">
                    <div className={`absolute inset-0 rounded-full blur-[60px] opacity-20 transition-all duration-1000 ${isPlaying ? 'bg-blue-500 scale-110' : 'bg-gray-300 scale-100'}`}></div>
                    
                    <div className={`relative w-72 h-72 bg-white rounded-full border-[16px] shadow-2xl flex flex-col items-center justify-center transition-colors duration-500 ${currentStyle.color.split(' ')[2] || 'border-gray-100'}`}>
                        {lastNumber ? (
                            <div className="text-center animate-in zoom-in duration-300">
                                <span className={`block text-5xl font-black uppercase tracking-widest mb-[-5px] ${currentStyle.color.split(' ')[0]}`}>
                                    {getBingoLetter(lastNumber)}
                                </span>
                                <span className="block text-[9rem] leading-none font-black text-gray-900 tracking-tighter">
                                    {lastNumber}
                                </span>
                            </div>
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center">
                                <Dices size={80} strokeWidth={1.5} />
                                <span className="text-xs font-black uppercase tracking-widest mt-4">Klaar voor start</span>
                            </div>
                        )}

                        {isPlaying && (
                            <div className="absolute -bottom-5 bg-gray-900 text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border-4 border-white">
                                <RefreshCw size={12} className="animate-spin" /> {timeLeft}s
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. CONTROLS (RECHTS) */}
                <div className="flex-1 w-full max-w-xl flex flex-col gap-6">
                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-4xl font-black italic uppercase text-gray-900">Host Controls</h2>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Beheer de trekking automatisch of handmatig</p>
                    </div>

                    <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        className={`w-full py-8 rounded-[2rem] font-black uppercase text-2xl tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl hover:shadow-2xl active:scale-95 border-b-8 ${
                            isPlaying 
                            ? 'bg-yellow-400 text-yellow-900 border-yellow-600 hover:bg-yellow-300' 
                            : 'bg-green-500 text-white border-green-700 hover:bg-green-400'
                        }`}
                    >
                        {isPlaying ? <><Pause fill="currentColor" size={32}/> Pauzeren</> : <><Play fill="currentColor" size={32}/> {history.length > 0 ? 'Hervatten' : 'Start Spel'}</>}
                    </button>

                    <div className="flex gap-4">
                        <button 
                            onClick={drawNextBall} 
                            disabled={isPlaying}
                            className="flex-1 bg-white border-2 border-gray-200 text-gray-900 py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <ChevronRight size={18} /> Handmatig
                        </button>
                        <button 
                            onClick={resetGame}
                            className="px-8 bg-white border-2 border-red-50 text-red-500 py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-red-50 hover:border-red-100 transition-all shadow-sm active:scale-95"
                            title="Reset Spel"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SECTION: BINGO BOARD (RIJEN) --- */}
            <div className="w-full bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                        <Dices size={16}/> Overzicht Bord
                    </h3>
                    <div className="text-xs font-bold text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                        {history.length} / 75 Getrokken
                    </div>
                </div>
                
                <div className="p-6 lg:p-10 space-y-3">
                    {['B', 'I', 'N', 'G', 'O'].map((letter) => {
                        const { color, range } = getRowData(letter);
                        const [min, max] = range;
                        const numbers = Array.from({length: max - min + 1}, (_, i) => min + i);

                        return (
                            <div key={letter} className="flex flex-col md:flex-row gap-4 items-center group">
                                <div className={`w-12 h-12 md:w-16 md:h-14 flex items-center justify-center rounded-2xl font-black text-2xl border-2 shrink-0 shadow-sm ${color}`}>
                                    {letter}
                                </div>
                                
                                <div className="flex-1 flex flex-wrap gap-1.5 justify-center md:justify-start">
                                    {numbers.map(num => {
                                        const isDrawn = history.includes(num);
                                        const isLatest = history[0] === num;
                                        
                                        return (
                                            <div 
                                                key={num}
                                                className={`
                                                    w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-sm md:text-base font-bold transition-all duration-500
                                                    ${isLatest 
                                                        ? 'bg-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-100 z-10' 
                                                        : isDrawn 
                                                            ? 'bg-gray-900 text-white shadow-sm' 
                                                            : 'bg-gray-50 text-gray-300'
                                                    }
                                                `}
                                            >
                                                {num}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}