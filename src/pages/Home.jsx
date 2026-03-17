import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Sparkles, Plus, Users, ChevronRight, Star, Loader2, Trophy } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  
  // --- CMS STATE ---
  const [cmsContent, setCmsContent] = useState({
    titel: "BINGO, MAAR DAN MODERN.",
    intro: "Maak in seconden je eigen kaarten, deel ze met vrienden of speel direct met de community. Geen papier, geen gedoe.",
  });

  // --- OVERIGE STATE ---
  const [playerCount, setPlayerCount] = useState(124);
  const [demoTitle, setDemoTitle] = useState("Vrijmibo");
  const [demoMarked, setDemoMarked] = useState(Array(9).fill(false));
  const [showBingo, setShowBingo] = useState(false);

  // --- 1. CMS CONTENT OPHALEN ---
  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const API_URL = "https://finchbackend-empxmo2z9-wtuneseekers-projects.vercel.app"; 
        const DOMEIN = "pingobingo.io";
        const SLUG = "home";

        const res = await fetch(`${API_URL}/api/public/${DOMEIN}/${SLUG}`);
        const data = await res.json();

        if (data.content) {
          setCmsContent({
            titel: data.content.titelLive || "BINGO, MAAR DAN MODERN.",
            intro: data.content.introductieLive || "Maak in seconden je eigen kaarten...",
          });
        }
      } catch (err) {
        console.error("CMS kon niet laden, fallback actief.");
      }
    };
    fetchCMS();
  }, []);

  // --- 2. THE VISUAL BRIDGE (Communicatie met Finch Portaal) ---
  useEffect(() => {
    const portalUrl = "https://finch-frontend-bice.vercel.app";

    // Ontvangen van tekst-updates (tijdens het typen in de editor)
    const handleMessage = (event) => {
      if (event.origin !== portalUrl) return;

      if (event.data.type === "FINCH_UPDATE") {
        const { field, value } = event.data;
        const element = document.getElementById(`finch-${field}`);
        if (element) {
          element.innerText = value;
          element.style.color = "#3b82f6"; // Tijdelijk blauw effect
          setTimeout(() => { element.style.color = ""; }, 500);
        }
      }
    };

    // Versturen van klik-signaal naar Portaal (Veld selecteren)
    const handleClick = (e) => {
      const target = e.target.closest('[id^="finch-"]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();

        const field = target.id.replace('finch-', '');
        
        window.parent.postMessage({
          type: "FINCH_ELEMENT_CLICKED",
          field,
          value: target.innerText
        }, portalUrl);
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("click", handleClick, true);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-500/20">
      
      {/* --- CSS VOOR HOVER EFFECTEN IN DE EDITOR --- */}
      <style>{`
        [id^="finch-"] { cursor: pointer; transition: all 0.2s ease; }
        [id^="finch-"]:hover { 
          outline: 2px dashed #3b82f6 !important; 
          outline-offset: 10px; 
          background: rgba(59, 130, 246, 0.05); 
          border-radius: 12px;
        }
      `}</style>
      
      {/* --- HERO SECTIE --- */}
      <div className="relative bg-gray-900 rounded-b-[2.5rem] overflow-hidden pt-12 pb-16 md:pt-16 md:pb-20 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-orange-400 font-black text-[10px] uppercase tracking-widest mb-6">
              <Sparkles size={12} />
              <span>Nu live: Finch Visual Editor</span>
            </div>
            
            {/* BEWERKBARE TITEL */}
            <h1 id="finch-titel" className="text-5xl md:text-7xl font-black tracking-tighter italic text-white mb-4 leading-none uppercase">
               {cmsContent.titel}
            </h1>
            
            {/* BEWERKBARE INTRO */}
            <p id="finch-introductie" className="text-base md:text-lg text-gray-400 font-bold leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              {cmsContent.intro}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button className="bg-orange-500 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20">
                <Plus size={18} /> Maak Bingo
              </button>
            </div>
          </div>

          {/* RECHTER KANT: DE KAART */}
          <div className="relative hidden lg:block">
            <div className="relative w-80 h-[400px] bg-white rounded-[2rem] p-5 shadow-2xl rotate-6 mx-auto border-4 border-gray-100">
              <div className="flex justify-between items-center mb-4 px-2">
                 <div className="font-black text-xl italic uppercase text-gray-900">{demoTitle}</div>
                 <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse">LIVE</div>
              </div>
              <div className="grid grid-cols-3 gap-2 h-[280px]">
                 {Array(9).fill(0).map((_, i) => (
                   <div key={i} className={`rounded-xl flex items-center justify-center border-2 border-gray-50 ${i === 4 ? 'bg-orange-500 text-white' : 'bg-gray-50'}`}>
                      {i === 4 && <Star size={20} fill="currentColor" />}
                   </div>
                 ))}
              </div>
              <div className="absolute -bottom-4 -left-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-gray-700">
                 <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                 <p className="text-[10px] font-black uppercase tracking-widest leading-none">124 Spelers Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTIE --- */}
      <div className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-8 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-blue-200 shadow-sm transition-all duration-300">
            <h3 id="finch-feature1-titel" className="text-xl font-black mb-2 italic uppercase">100% Gratis</h3>
            <p id="finch-feature1-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Geen verborgen kosten voor al je feestjes.</p>
          </div>
          <div className="group p-8 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-blue-200 shadow-sm transition-all duration-300">
            <h3 id="finch-feature2-titel" className="text-xl font-black mb-2 italic uppercase">Slimme Kaarten</h3>
            <p id="finch-feature2-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Genereer unieke kaarten voor elke speler.</p>
          </div>
          <div className="group p-8 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-blue-200 shadow-sm transition-all duration-300">
            <h3 id="finch-feature3-titel" className="text-xl font-black mb-2 italic uppercase">Geen Account</h3>
            <p id="finch-feature3-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Spelers hoeven zich niet te registreren.</p>
          </div>
        </div>
      </div>
    </div>
  );
}