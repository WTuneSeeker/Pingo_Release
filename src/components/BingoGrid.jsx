import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function BingoGrid({ items }) {
  const [grid, setGrid] = useState([]);
  const [checked, setChecked] = useState(new Array(25).fill(false));
  const [winMode, setWinMode] = useState('line'); // 'line' of 'full'
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    generateNewCard();
  }, [items]);

  const generateNewCard = () => {
    // Schudden en Free Space logica
    const shuffled = [...items].sort(() => 0.5 - Math.random()).slice(0, 24);
    const finalGrid = [...shuffled.slice(0, 12), "🎁 FREE", ...shuffled.slice(12, 24)];
    setGrid(finalGrid);
    
    const startChecked = new Array(25).fill(false);
    startChecked[12] = true; // Midden is gratis
    setChecked(startChecked);
    setHasWon(false);
  };

  const checkWin = (newChecked) => {
    if (winMode === 'full') {
      return newChecked.every(tile => tile === true);
    } else {
      const lines = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Hor
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Vert
        [0,6,12,18,24], [4,8,12,16,20] // Diag
      ];
      return lines.some(line => line.every(index => newChecked[index]));
    }
  };

  const toggleTile = (index) => {
    if (index === 12 || hasWon) return; 
    
    const newChecked = [...checked];
    newChecked[index] = !newChecked[index];
    setChecked(newChecked);

    if (checkWin(newChecked)) {
      setHasWon(true);
      triggerWin();
    }
  };

  const triggerWin = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2563eb', '#fbbf24', '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2563eb', '#fbbf24', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      
      {/* Game Mode Selector */}
      <div className="flex justify-center gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit mx-auto">
        <button 
          onClick={() => setWinMode('line')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${winMode === 'line' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Eén Lijn
        </button>
        <button 
          onClick={() => setWinMode('full')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${winMode === 'full' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Volle Kaart
        </button>
      </div>

      {/* Win Melding */}
      <div className={`text-center mb-8 transition-all duration-700 transform ${hasWon ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none h-0 overflow-hidden'}`}>
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-yellow-500 py-2">
          BINGO! 🎉
        </h2>
        <p className="text-gray-500 font-medium italic">Gefeliciteerd met je overwinning!</p>
      </div>

      {/* Container voor Grid + Zwevende Knop */}
      <div className="relative group">
        {/* Het Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 p-4 bg-white rounded-3xl shadow-xl border border-gray-100">
          {grid.map((item, index) => (
            <div
              key={index}
              onClick={() => toggleTile(index)}
              className={`aspect-square flex items-center justify-center p-2 text-center text-[10px] sm:text-xs font-bold border-2 rounded-xl transition-all duration-200 cursor-pointer
                ${checked[index] 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-inner scale-95' 
                  : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-blue-200 hover:bg-white'}`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Alleen de subtiele reset knop rechtsonder */}
        <button 
          onClick={generateNewCard}
          title="Nieuwe kaart genereren"
          className="absolute -bottom-3 -right-3 bg-white text-gray-400 p-3 rounded-full shadow-lg border border-gray-100 hover:text-blue-600 hover:shadow-blue-200 transition-all active:scale-90 z-10"
        >
          <svg 
            className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
    </div>
  );
}