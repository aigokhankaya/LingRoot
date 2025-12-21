
import React, { useState } from 'react';

interface RegisterProps {
  onRegister: () => void;
  onGoToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';
  const brandTealLight = 'hsla(172, 66%, 45%, 0.1)';

  const languages = [
    { name: 'English', flag: '🇬🇧' },
    { name: 'Spanish', flag: '🇪🇸' },
    { name: 'French', flag: '🇫🇷' },
    { name: 'German', flag: '🇩🇪' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 overflow-hidden max-w-md mx-auto">
      {/* Background blobs */}
      <div className="app-bg" />
      <div className="blob bg-indigo-400 w-64 h-64 rounded-full -top-10 -left-10 opacity-30 animate-float" />
      <div className="blob bg-teal-400 w-80 h-80 rounded-full bottom-20 -right-10 opacity-30 animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full bg-white/75 glass rounded-[2.5rem] p-8 shadow-glass border border-white/60 animate-slide-up relative z-10 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 relative overflow-hidden"
            style={{ backgroundColor: brandTeal }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
            <span className="material-icons-round text-white text-4xl relative z-10">person_add_alt_1</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join LingRoot</h1>
          <p className="text-slate-500 font-medium mt-1">Start your AI language journey</p>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">I want to learn</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {languages.map((lang) => (
              <button
                key={lang.name}
                onClick={() => setSelectedLang(lang.name)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 font-bold text-sm
                  ${selectedLang === lang.name 
                    ? `border-[${brandTeal}] bg-[${brandTealLight}] text-teal-700` 
                    : 'border-slate-100 bg-white text-slate-400'}`}
                style={selectedLang === lang.name ? { borderColor: brandTeal, backgroundColor: brandTealLight } : {}}
              >
                <span>{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3.5">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">person</span>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300 font-medium"
            />
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">alternate_email</span>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300 font-medium"
            />
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">lock</span>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create Password"
              className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300 font-medium"
            />
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">verified_user</span>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300 font-medium"
            />
          </div>

          <button 
            onClick={onRegister}
            className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 group"
            style={{ background: `linear-gradient(135deg, ${brandOrange}, #f59e0b)` }}
          >
            Create Account
            <span className="material-icons-round group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-7 text-center">
          <hr className="border-slate-100" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">or sign up with</span>
        </div>

        {/* Social Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
            <span className="text-sm font-bold text-slate-700">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
            <span className="material-icons-round text-xl text-slate-900">apple</span>
            <span className="text-sm font-bold text-slate-700">Apple</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account? {' '}
            <button 
              onClick={onGoToLogin}
              className="font-black hover:underline transition-all"
              style={{ color: brandTeal }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
