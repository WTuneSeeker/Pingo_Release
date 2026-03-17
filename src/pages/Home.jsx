import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Play, Plus, Users, ShieldCheck, Sparkles, ChevronRight, Star, Grid3X3, Loader2, Trophy } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  
  // --- CMS STATE ---
  const [cmsContent, setCmsContent] = useState({
    titel: "BINGO, MAAR DAN MODERN.",
    intro: "Maak in seconden je eigen kaarten, deel ze met vrienden of speel direct met de community. Geen papier, geen gedoe.",
    afbeelding: null
  });

  // --- OVERIGE STATE ---
  const [playerCount, setPlayerCount] = useState(null);
  const [demoTitle, setDemoTitle] = useState("Vrijmibo");
  const [demoMarked, setDemoMarked] = useState(Array(9).fill(false));
  const [showBingo, setShowBingo] = useState(false);

  // --- 1. CMS CONTENT OPHALEN (LIVE DATA) ---
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
            afbeelding: data.content.afbeeldingUrlLive
          });
        }
      } catch (err) {
        console.error("Finch CMS kon niet laden, fallback naar standaard tekst.");
      }
    };
    fetchCMS();
  }, []);

  // --- 2. THE VISUAL BUILDER BRIDGE (Communicatie met Portaal) ---
  useEffect(() => {
    const portalUrl = "https://finch-frontend-bice.vercel.app";

    // A. Luisteren naar updates vanuit het Portaal (Typen in de editor)
    const handleMessage = (event) => {
      if (event.origin !== portalUrl) return;

      if (event.data.type === "FINCH_UPDATE") {
        const { field, value } = event.data;
        const element = document.getElementById(`finch-${field}`);
        if (element) {
          element.innerText = value;
          // Subtiele flits om aan te geven dat het gewijzigd is
          element.style.transition = "color 0.3s";
          element.style.color = "#3b82f6"; // Blauw tijdens bewerken
          setTimeout(() => { element.style.color = ""; }, 800);
        }
      }
    };

    // B. Klikken op elementen doorsturen naar Portaal (Element selecteren)
    const handleClick = (e) => {
      const target = e.target.closest('[id^="finch-"]');
      if (target) {
        e.preventDefault();
        const field = target.id.replace('finch-', '');
        
        window.parent.postMessage({
          type: "FINCH_ELEMENT_CLICKED",
          field,
          value: target.innerText
        }, portalUrl);
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  // --- 3. STATS & TITEL LOGICA ---
  useEffect(() => {
    const titles = ["Vrijmibo", "Kerst Bingo", "Team Meeting", "Baby Shower", "Roadtrip", "Marketing", "Camping", "Familiedag"];
    setDemoTitle(titles[Math.floor(Math.random() * titles.length)]);

    const fetchStats = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .gt('updated_at', oneHourAgo);

        if (error) throw error;
        setPlayerCount(count > 0 ? count : Math.floor(Math.random() * 80) + 120);
      } catch (err) {
        setPlayerCount(128);
      }
    };
    fetchStats();
  }, []);

  // --- 4. LOGIN CHECK ---
  const handleCreateClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    user ? navigate('/create') : navigate('/login');
  };

  // --- 5. BINGO ANIMATIE LOOP ---
  useEffect(() => {
    let timeouts = [];
    const winPatterns = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

    const runSimulation = () => {
      setShowBingo(false);
      setDemoMarked([false, false, false, false, true, false, false, false, false]);
      const targetPattern = winPatterns[Math.floor(Math.random() * winPatterns.length)];
      const stepsToWin = targetPattern.filter(idx => idx !== 4);

      stepsToWin.forEach((gridIndex, i) => {
        timeouts.push(setTimeout(() => {
          setDemoMarked(prev => {
            const next = [...prev];
            next[gridIndex] = true;
            return next;
          });
        }, (i + 1) * 1000));
      });

      const bingoTime = (stepsToWin.length * 1000) + 500;
      timeouts.push(setTimeout(() => setShowBingo(true), bingoTime));
      timeouts.push(setTimeout(() => runSimulation(), bingoTime + 4000));
    };

    runSimulation();
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-orange-200">
      
      {/* --- EXTRA CSS VOOR DE EDITOR --- */}
      <style>{`
        [id^="finch-"] { cursor: pointer; transition: all 0.2s ease; }
        [id^="finch-"]:hover { 
          outline: 2px dashed #3b82f6; 
          outline-offset: 8px; 
          background: rgba(59, 130, 246, 0.05); 
          border-radius: 12px;
        }
      `}</style>
      
      {/* --- HERO SECTIE --- */}
      <div className="relative bg-gray-900 rounded-b-[2.5rem] overflow-hidden pt-12 pb-16 md:pt-16 md:pb-20 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-orange-400 font-black text-[10px] uppercase tracking-widest mb-6 backdrop-blur-md">
              <Sparkles size={12} />
              <span>Nu live: Finch Headless CMS</span>
            </div>
            
            {/* DYNAMISCHE TITEL MET FINCH-ID */}
            <h1 id="finch-titel" className="text-5xl md:text-7xl font-black tracking-tighter italic text-white mb-4 leading-none uppercase transition-all">
               {cmsContent.titel.includes("MODERN") ? (
                 <>BINGO, MAAR DAN <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">MODERN.</span></>
               ) : cmsContent.titel}
            </h1>
            
            {/* DYNAMISCHE INTRO MET FINCH-ID */}
            <p id="finch-introductie" className="text-base md:text-lg text-gray-400 font-bold leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 transition-all">
              {cmsContent.intro}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button onClick={handleCreateClick} className="group bg-orange-500 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95">
                <Plus size={18} /> Maak Bingo
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button onClick={() => navigate('/community')} className="bg-gray-800 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-700 transition border border-gray-700 active:scale-95">
                <Users size={18} className="text-gray-400" /> Community
              </button>
            </div>
          </div>

          {/* RECHTER KANT: ANIMATIE */}
          <div className="relative hidden lg:block perspective-1000">
            <div className="relative w-80 h-[400px] bg-white rounded-[2rem] p-5 shadow-2xl rotate-6 hover:rotate-3 transition-transform duration-500 mx-auto border-4 border-gray-100 group">
              
              <div className="flex justify-between items-center mb-4">
                 <div className="font-black text-xl italic uppercase text-gray-900 truncate max-w-[180px]">
                   {demoTitle}
                 </div>
                 <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse">LIVE</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 h-[280px] relative">
                 <div className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-300 ${showBingo ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl transform rotate-[-10deg] border-4 border-white flex items-center gap-3 animate-in zoom-in duration-300">
                       <Trophy size={32} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                       <span className="text-4xl font-black italic tracking-tighter">BINGO!</span>
                    </div>
                 </div>

                 {demoMarked.map((isMarked, i) => (
                   <div key={i} className={`rounded-xl flex items-center justify-center p-2 text-center border-2 transition-all duration-500 
                       ${i === 4 ? 'bg-orange-500 border-orange-500 text-white scale-95 shadow-inner' 
                       : isMarked ? 'bg-orange-400 border-orange-400 text-white scale-95 shadow-sm' 
                       : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                      {i === 4 ? <Star size={20} fill="currentColor" /> : (isMarked ? <div className="w-3 h-3 bg-white rounded-full shadow-sm animate-in zoom-in" /> : <div className="w-6 h-1.5 bg-gray-200 rounded-full"></div>)}
                   </div>
                 ))}
              </div>

              <div className="absolute -bottom-4 -left-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-gray-700 animate-bounce delay-1000 z-30">
                 <div className="bg-green-500 w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">Spelers Online</p>
                    <p className="text-sm font-black leading-none min-w-[30px]">
                      {playerCount !== null ? playerCount : <Loader2 size={12} className="animate-spin inline" />}
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTIE --- */}
      <div className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900 uppercase italic mb-2">Waarom <span className="text-orange-500">Pingo?</span></h2>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">De beste tools voor jouw spel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform"><Sparkles size={24} /></div>
            <h3 id="finch-mijndiv" className="text-lg font-black mb-2 italic uppercase">100% Gratis</h3>
            <p id="finch-mijndiv" className="text-gray-400 text-xs font-bold leading-relaxed">Geen verborgen kosten. Maak onbeperkt kaarten voor al je feestjes.</p>
          </div>

          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:-rotate-6 transition-transform"><Grid3X3 size={24} /></div>
            <h3 id="finch-mijndiv" className="text-lg font-black mb-2 italic uppercase">Slimme Generator</h3>
            <p id="finch-mijndiv" className="text-gray-400 text-xs font-bold leading-relaxed">Vul een lijst met woorden en wij genereren voor elke speler een unieke kaart.</p>
          </div>

          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform"><ShieldCheck size={24} /></div>
            <h3 id="finch-mijndiv" className="text-lg font-black mb-2 italic uppercase">Geen Account Nodig</h3>
            <p id="finch-mijndiv" className="text-gray-400 text-xs font-bold leading-relaxed">Spelers hoeven zich niet te registreren. Deel gewoon de code.</p>
          </div>
        </div>
      </div>

      {/* --- CTA BANNER --- */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
           <div className="relative z-10">
             <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase mb-4 tracking-tighter">
               Klaar om te <span className="text-orange-500">Winnen?</span>
             </h2>
             <p className="text-gray-400 font-bold text-xs mb-8 uppercase tracking-widest">Start vandaag nog je eerste sessie</p>
             <button onClick={handleCreateClick} className="bg-white text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl">
               Start Nu Gratis
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}