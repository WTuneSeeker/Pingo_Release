import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, type = 'info', onConfirm, confirmText = 'Bevestigen', loading = false }) {
  if (!isOpen) return null;

  // Kleur en Icoon bepalen op basis van type
  const getStyle = () => {
    switch (type) {
      case 'danger': return { icon: <AlertTriangle className="text-red-500" size={24} />, bgIcon: 'bg-red-50', btn: 'bg-red-500 hover:bg-red-600' };
      case 'success': return { icon: <CheckCircle className="text-green-500" size={24} />, bgIcon: 'bg-green-50', btn: 'bg-green-500 hover:bg-green-600' };
      default: return { icon: <Info className="text-blue-500" size={24} />, bgIcon: 'bg-blue-50', btn: 'bg-gray-900 hover:bg-gray-800' };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border-4 border-white transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${style.bgIcon}`}>{style.icon}</div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2">{title}</h3>
        <div className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
          {children}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Annuleren
          </button>
          
          {onConfirm && (
            <button 
              onClick={onConfirm} 
              disabled={loading}
              className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${style.btn} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Bezig...' : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}