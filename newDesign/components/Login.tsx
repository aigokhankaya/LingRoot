
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onGoToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 overflow-hidden max-w-md mx-auto">
      {/* Background blobs */}
      <div className="app-bg" />
      <div className="blob bg-indigo-400 w-64 h-64 rounded-full -top-10 -left-10 opacity-30 animate-float" />
      <div className="blob bg-blue-500 w-80 h-80 rounded-full bottom-20 -right-10 opacity-30 animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full bg-white/80 glass rounded-[2.5rem] p-8 shadow-glass border border-white/50 animate-slide-up relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-4"
            style={{ backgroundColor: brandTeal }}
          >
            <span className="material-icons-round text-white text-3xl">school</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">LingRoot AI</h1>
          <p className="text-slate-400 text-sm font-medium">Welcome back, explorer!</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@example.com"
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-slate-200 text-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-slate-200 text-slate-700"
            />
          </div>

          <button 
            onClick={onLogin}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-2"
            style={{ background: `linear-gradient(135deg, ${brandOrange}, #f9ae3f)` }}
          >
            Sign In
          </button>
        </div>

        <div className="relative my-8 text-center flex items-center justify-center">
          <div className="flex-1 border-t border-slate-100"></div>
          <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">With</span>
          <div className="flex-1 border-t border-slate-100"></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-white border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm">
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
            <span className="text-xs font-bold text-slate-600">Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-white border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-icons-round text-lg text-slate-900">apple</span>
            <span className="text-xs font-bold text-slate-600">Apple</span>
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-400 font-semibold">
            Don't have an account? {' '}
            <button 
              onClick={onGoToRegister}
              className="font-bold hover:underline"
              style={{ color: brandTeal }}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
