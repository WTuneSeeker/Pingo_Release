import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Users, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Hero Sectie */}
      <div className="relative overflow-hidden bg-orange-50/30 pb-20 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 font-black text-sm mb-6 animate-bounce">
              <Sparkles size={18} />
              <span>Nu live: De leukste Bingo van Nederland</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic mb-8">
              <span className="text-orange-500">P</span>INGO
            </h1>
            
            <p className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-400 font-bold leading-relaxed mb-12">
              Maak, deel en speel bingo met je vrienden in een handomdraai. 
              De moderne manier om van elk evenement een feestje te maken.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={() => navigate('/create')}
                className="group bg-orange-500 text-white px-10 py-6 rounded-[2.5rem] font-black text-xl flex items-center gap-3 hover:bg-orange-600 transition shadow-2xl shadow-orange-200 active:scale-95"
              >
                <Plus size={24} /> Maak je Bingo
                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => navigate('/community')}
                className="bg-white text-gray-900 px-10 py-6 rounded-[2.5rem] font-black text-xl flex items-center gap-3 hover:bg-gray-50 transition border-2 border-gray-100 active:scale-95"
              >
                <Users size={24} className="text-orange-500" /> Community
              </button>
            </div>
          </div>
        </div>

        {/* Abstracte achtergrond vormen */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Features Sectie */}
      <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className="group p-10 bg-white rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-orange-100 transition-all">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-black mb-4 italic">Helemaal Gratis</h3>
            <p className="text-gray-400 font-bold leading-relaxed">
              Geen verborgen kosten of abonnementen. Maak onbeperkt kaarten voor al je feestjes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group p-10 bg-white rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-orange-100 transition-all">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <h3 className="text-2xl font-black mb-4 italic">Samen Spelen</h3>
            <p className="text-gray-400 font-bold leading-relaxed">
              Deel je unieke link en speel direct mee op je mobiel of tablet. Geen app-download nodig.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-10 bg-white rounded-[3.5rem] border border-gray-50 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-orange-100 transition-all">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black mb-4 italic">Veilig & Privé</h3>
            <p className="text-gray-400 font-bold leading-relaxed">
              Jij bepaalt wie je kaarten ziet. Zet ze op privé of deel ze met de PINGO community.
            </p>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="py-20 text-center border-t border-gray-50">
        <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">
          Klaar voor <span className="text-orange-500">P</span>INGO?
        </h2>
        <div className="flex justify-center gap-4">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-orange-300 rounded-full animate-pulse delay-75"></div>
          <div className="w-3 h-3 bg-orange-100 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
}