import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage("Oeps! Dat klopt niet: " + error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-gray-100 border border-gray-50 animate-in zoom-in duration-300">
        
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-orange-50 rounded-3xl text-orange-500 mb-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            Welkom bij <span className="text-orange-500">P</span>INGO
          </h1>
          <p className="text-gray-400 font-bold">Log in om je kaarten te beheren</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="email" 
              placeholder="E-mailadres" 
              className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="password" 
              placeholder="Wachtwoord" 
              className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition shadow-2xl shadow-orange-100 active:scale-95 disabled:opacity-50"
          >
            <LogIn size={24} /> {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 font-bold">
          Nog geen account?{' '}
          <Link to="/register" className="text-orange-500 hover:text-orange-600 underline decoration-2 underline-offset-4 transition-colors">
            Maak er eentje aan!
          </Link>
        </p>
      </div>
    </div>
  );
}