import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, AlertCircle, Sparkles, CheckCircle2, ShieldCheck, User } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!username.trim() || username.length < 3) {
      setErrorMessage("Kies een gebruikersnaam van minimaal 3 tekens.");
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Vul een geldig e-mailadres in.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Je wachtwoord moet minimaal 6 tekens lang zijn.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("De wachtwoorden komen niet overeen.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { display_name: username },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (error) throw error;
      if (data?.user?.identities?.length === 0) {
        setErrorMessage("Dit e-mailadres is al in gebruik.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center animate-in zoom-in duration-500 border-4 border-orange-50">
          <div className="mx-auto w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black italic mb-4 uppercase text-gray-900">Welkom, {username}!</h2>
          <p className="text-gray-400 font-bold leading-relaxed mb-8">Check je mailbox om je account te bevestigen.</p>
          <Link to="/login" className="inline-block bg-orange-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition">Naar Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 text-center sm:text-left">
      <div className="max-w-md w-full bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-50 animate-in zoom-in duration-300">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-orange-50 rounded-3xl text-orange-500 mb-6"><UserPlus size={32} /></div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Join <span className="text-orange-500">P</span>INGO</h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="flex-shrink-0" /><p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="text" placeholder="Gebruikersnaam" className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="email" placeholder="E-mailadres" className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="password" placeholder="Wachtwoord" className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="relative group">
            <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="password" placeholder="Herhaal wachtwoord" className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-orange-100 focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-800" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition active:scale-95 disabled:opacity-50"><Sparkles size={24} /> {loading ? 'Bezig...' : 'Account aanmaken'}</button>
        </form>
      </div>
    </div>
  );
}