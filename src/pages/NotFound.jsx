import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans text-center selection:bg-orange-100">
      
      <div className="max-w-md w-full">
        
        {/* --- 404 BINGO BALLEN --- */}
        <div className="flex justify-center gap-4 mb-10">
          {/* Bal 4 */}
          <div className="w-24 h-24 bg-white rounded-3xl border-b-8 border-r-8 border-gray-200 flex items-center justify-center shadow-xl transform -rotate-12 animate-in zoom-in duration-500">
            <span className="text-6xl font-black text-gray-900">4</span>
          </div>

          {/* Bal 0 (De Ghost) */}
          <div className="w-24 h-24 bg-orange-500 rounded-3xl border-b-8 border-r-8 border-orange-600 flex items-center justify-center shadow-xl shadow-orange-200 z-10 animate-bounce">
            <Ghost size={48} className="text-white" strokeWidth={2.5} />
          </div>

          {/* Bal 4 */}
          <div className="w-24 h-24 bg-white rounded-3xl border-b-8 border-r-8 border-gray-200 flex items-center justify-center shadow-xl transform rotate-12 animate-in zoom-in duration-500 delay-100">
            <span className="text-6xl font-black text-gray-900">4</span>
          </div>
        </div>

        {/* --- TEKST --- */}
        <h1 className="text-4xl font-black text-gray-900 uppercase italic mb-4 tracking-tight">
          Vals <span className="text-orange-500">Alarm!</span>
        </h1>
        
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-10 leading-relaxed">
          Oeps! Het lijkt erop dat dit balletje nog niet gevallen is. De pagina die je zoekt bestaat niet (meer).
        </p>

        {/* --- KNOPPEN --- */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-lg flex items-center justify-center gap-3 group"
          >
            <Home size={18} className="group-hover:-translate-y-1 transition-transform" /> 
            Terug naar Home
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-white text-gray-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:text-gray-600 border-2 border-transparent hover:border-gray-200 transition-all flex items-center justify-center gap-3"
          >
            <ArrowLeft size={18} /> 
            Ga Terug
          </button>
        </div>

      </div>
    </div>
  );
}