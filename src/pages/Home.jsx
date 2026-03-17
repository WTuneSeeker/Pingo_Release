import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Sparkles, Plus, Users, ChevronRight, Star, Loader2, Trophy } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  
  // --- CMS STATE (Beveiligde data) ---
  const [cmsContent, setCmsContent] = useState({
    titel: "BINGO, MAAR DAN MODERN.",
    intro: "Maak in seconden je eigen kaarten...",
    afbeelding: null
  });

  // --- OVERIGE STATE ---
  const [playerCount, setPlayerCount] = useState(null);
  const [demoTitle, setDemoTitle] = useState("Vrijmibo");
  const [demoMarked, setDemoMarked] = useState(Array(9).fill(false));
  const [showBingo, setShowBingo] = useState(false);

  // --- 1. CMS CONTENT OPHALEN (ALLEEN DE LIVE DATA) ---
  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const API_URL = "https://finchbackend-empxmo2z9-wtuneseekers-projects.vercel.app"; 
        const DOMEIN = "pingobingo.io";
        const SLUG = "home";

        // We halen hier specifiek de LIVE velden op uit de backend
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

  // --- 2. THE VISUAL BUILDER BRIDGE (ALLEEN VOOR DE PREVIEW) ---
  useEffect(() => {
    const portalUrl = "https://finch-frontend-bice.vercel.app";

    // Deze functie vangt wijzigingen op die je typt in het portaal
    const handleMessage = (event) => {
      if (event.origin !== portalUrl) return;

      if (event.data.type === "FINCH_UPDATE") {
        const { field, value } = event.data;
        const element = document.getElementById(`finch-${field}`);
        if (element) {
          element.innerText = value;
          // Subtiele indicator dat dit een tijdelijke preview-wijziging is
          element.style.color = "#3b82f6"; 
        }
      }
    };

    // Deze functie meldt aan het portaal dat er op een tekst is geklikt
    const handleClick = (e) => {
      const target = e.target.closest('[id^="finch-"]');
      if (target) {
        // Alleen klikken doorsturen als we in een iframe zitten (dus in het portaal)
        if (window.self !== window.top) {
          e.preventDefault();
          const field = target.id.replace('finch-', '');
          
          window.parent.postMessage({
            type: "FINCH_ELEMENT_CLICKED",
            field,
            value: target.innerText
          }, portalUrl);
        }
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

  // --- 4. BINGO ANIMATIE LOOP ---
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
      
      {/* CSS: Alleen interactieve stippellijnen als de site in het portaal wordt geladen */}
      <style>{`
        body:not(:hover) [id^="finch-"] { cursor: default; }
        @media (hover: hover) {
          [id^="finch-"]:hover { 
            outline: 2px dashed #3b82f6; 
            outline-offset: 8px; 
            background: rgba(59, 130, 246, 0.05); 
            border-radius: 12px;
            cursor: pointer;
          }
        }
      `}</style>
      
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
              <button onClick={() => navigate('/create')} className="group bg-orange-500 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95">
                <Plus size={18} /> Maak Bingo
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block perspective-1000">
            <div className="relative w-80 h-[400px] bg-white rounded-[2rem] p-5 shadow-2xl rotate-6 mx-auto border-4 border-gray-100 group">
              <div className="flex justify-between items-center mb-4">
                 <div className="font-black text-xl italic uppercase text-gray-900 truncate max-w-[180px]">
                   {demoTitle}
                 </div>
                 <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse">LIVE</div>
              </div>
              <div className="grid grid-cols-3 gap-2 h-[280px] relative">
                 {demoMarked.map((isMarked, i) => (
                   <div key={i} className={`rounded-xl flex items-center justify-center p-2 text-center border-2 transition-all duration-500 
                       ${i === 4 ? 'bg-orange-500 border-orange-500 text-white scale-95 shadow-inner' 
                       : isMarked ? 'bg-orange-400 border-orange-400 text-white scale-95 shadow-sm' 
                       : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                      {i === 4 ? <Star size={20} fill="currentColor" /> : (isMarked ? <div className="w-3 h-3 bg-white rounded-full shadow-sm animate-in zoom-in" /> : <div className="w-6 h-1.5 bg-gray-200 rounded-full"></div>)}
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <h3 id="finch-f1-titel" className="text-lg font-black mb-2 italic uppercase">100% Gratis</h3>
            <p id="finch-f1-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Geen verborgen kosten.</p>
          </div>
          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <h3 id="finch-f2-titel" className="text-lg font-black mb-2 italic uppercase">Slimme Generator</h3>
            <p id="finch-f2-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Vul een lijst met woorden.</p>
          </div>
          <div className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-orange-200 shadow-sm transition-all duration-300">
            <h3 id="finch-f3-titel" className="text-lg font-black mb-2 italic uppercase">Geen Account Nodig</h3>
            <p id="finch-f3-tekst" className="text-gray-400 text-xs font-bold leading-relaxed">Spelers hoeven zich niet te registreren.</p>
          </div>
        </div>
      </div>

    </div>
  );
}