import { Link } from 'react-router-dom';
import { Sparkles, Github, Twitter, Heart, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 pt-20 pb-10 rounded-t-[3rem] mt-auto relative overflow-hidden">
      
      {/* Achtergrond Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Bovenste deel: Logo, Links & Socials */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 border-b border-gray-800 pb-16">
          
          {/* 1. Brand Sectie */}
          <div className="md:col-span-5 text-center md:text-left">
            <Link to="/" className="inline-flex items-center gap-2 group mb-6">
              <div className="bg-orange-500 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-900/20">
                <Sparkles className="text-white" size={24} />
              </div>
              <span className="text-3xl font-black tracking-tighter italic text-white">
                <span className="text-orange-500">P</span>INGO
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed font-medium text-sm max-w-sm mx-auto md:mx-0">
              De makkelijkste manier om bingo te spelen met vrienden, collega's of familie. 
              Maak je eigen kaarten, deel ze met de community en speel direct live.
            </p>
          </div>

          {/* 2. Navigatie Links */}
          <div className="md:col-span-3 text-center md:text-left">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Ontdekken</h4>
            <ul className="space-y-4">
              <li><Link to="/community" className="text-gray-400 hover:text-orange-500 transition-colors font-bold text-sm">Community Hub</Link></li>
              <li><Link to="/create" className="text-gray-400 hover:text-orange-500 transition-colors font-bold text-sm">Nieuwe Kaart</Link></li>
              <li><Link to="/dashboard" className="text-gray-400 hover:text-orange-500 transition-colors font-bold text-sm">Mijn Dashboard</Link></li>
            </ul>
          </div>

          {/* 3. Socials & Contact */}
          <div className="md:col-span-4 text-center md:text-right">
             <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Connect</h4>
             <div className="flex justify-center md:justify-end gap-4 mb-6">
               <a href="#" className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:bg-orange-500 hover:text-white transition-all"><Github size={20}/></a>
               <a href="#" className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:bg-orange-500 hover:text-white transition-all"><Twitter size={20}/></a>
               <a href="#" className="p-3 bg-gray-800 rounded-2xl text-gray-400 hover:bg-orange-500 hover:text-white transition-all"><Mail size={20}/></a>
             </div>
             <p className="text-gray-500 text-xs font-bold">Vragen? support@pingo.app</p>
          </div>
        </div>

        {/* Onderste deel: Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <p>© 2026 Pingo. Alle rechten voorbehouden.</p>
          
          <div className="flex items-center gap-2">
            <span>Gemaakt met</span>
            <Heart size={14} className="text-red-500 animate-pulse" fill="currentColor" />
            <span>voor Bingo liefhebbers</span>
          </div>
        </div>

      </div>
    </footer>
  );
}