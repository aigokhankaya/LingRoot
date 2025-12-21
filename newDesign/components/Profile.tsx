
import React, { useState } from 'react';

interface ProfileProps {
  onSignOut: () => void;
}

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, value, onClick, destructive }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white transition-all border-b border-slate-100 last:border-b-0 active:scale-[0.99] ${destructive ? 'text-red-500' : 'text-slate-700'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${destructive ? 'bg-red-50' : 'bg-slate-50'}`}>
        <span className="material-icons-round text-xl">{icon}</span>
      </div>
      <div className="flex flex-col items-start">
        <span className="font-bold text-[15px] leading-tight">{label}</span>
        {value && <span className="text-[11px] text-slate-400 font-medium">{value}</span>}
      </div>
    </div>
    <span className="material-icons-round text-slate-300">chevron_right</span>
  </button>
);

const Profile: React.FC<ProfileProps> = ({ onSignOut }) => {
  const [view, setView] = useState<'menu' | 'account_settings' | 'reminder_settings'>('menu');
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [selectedAppLanguage, setSelectedAppLanguage] = useState<'English' | 'Turkish'>('English');
  
  // Form states for account settings
  const [formData, setFormData] = useState({
    firstName: 'Local',
    lastName: 'H',
    phone: '+90 555 123 4567'
  });

  // Reminder settings state
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [wordsPerDay, setWordsPerDay] = useState(5);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';
  const wordOptions = [1, 3, 5, 6, 10, 15, 20];

  const handleSaveAccount = () => {
    setView('menu');
  };

  const handleSaveReminders = () => {
    setView('menu');
  };

  const confirmAccountDeletion = () => {
    onSignOut();
  };

  const languages = [
    { id: 'English', name: 'English', flag: '🇬🇧' },
    { id: 'Turkish', name: 'Türkçe', flag: '🇹🇷' }
  ];

  if (view === 'reminder_settings') {
    return (
      <div className="animate-slide-up px-6 pt-12 pb-32">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setView('menu')}
            className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm active:scale-90 transition-all"
          >
            <span className="material-icons-round">arrow_back</span>
          </button>
          <h2 className="text-xl font-extrabold text-slate-800">Reminder Settings</h2>
        </div>

        <div className="bg-white/70 glass rounded-[2.5rem] p-6 border border-white/60 shadow-xl space-y-8">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-2">
            <div>
              <h3 className="font-bold text-slate-800">Enable Reminders</h3>
              <p className="text-xs text-slate-400">Get daily vocabulary notifications</p>
            </div>
            <button 
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              className={`w-14 h-8 rounded-full transition-all relative ${remindersEnabled ? 'bg-teal-500' : 'bg-slate-200'}`}
              style={remindersEnabled ? { backgroundColor: brandTeal } : {}}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${remindersEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Conditional Content */}
          <div className={`space-y-8 transition-all duration-500 ${remindersEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale-[0.5]'}`}>
            
            {/* Words Per Day */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Words Per Day</label>
              <div className="grid grid-cols-4 gap-2">
                {wordOptions.map(num => (
                  <button
                    key={num}
                    onClick={() => setWordsPerDay(num)}
                    className={`py-3 rounded-2xl font-bold text-sm transition-all border ${
                      wordsPerDay === num 
                        ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' 
                        : 'bg-white border-slate-100 text-slate-500'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notification Time Range</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] text-slate-300 font-bold uppercase ml-1">From</span>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-teal-500 outline-none text-slate-600 font-bold text-sm"
                  />
                </div>
                <div className="mt-6 text-slate-300">
                  <span className="material-icons-round">east</span>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] text-slate-300 font-bold uppercase ml-1">To</span>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 focus:border-teal-500 outline-none text-slate-600 font-bold text-sm"
                  />
                </div>
              </div>
            </div>

          </div>

          <button 
            onClick={handleSaveReminders}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-teal-500/20 active:scale-95 transition-all mt-4"
            style={{ backgroundColor: brandTeal }}
          >
            Save Settings
          </button>
        </div>
      </div>
    );
  }

  if (view === 'account_settings') {
    return (
      <div className="animate-slide-up px-6 pt-12">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setView('menu')}
            className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm active:scale-90 transition-all"
          >
            <span className="material-icons-round">arrow_back</span>
          </button>
          <h2 className="text-xl font-extrabold text-slate-800">Account Settings</h2>
        </div>

        <div className="bg-white/70 glass rounded-[2rem] p-6 border border-white/60 shadow-xl space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
            <input 
              type="text" 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
            <input 
              type="text" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700"
            />
          </div>

          <button 
            onClick={handleSaveAccount}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-teal-500/20 active:scale-95 transition-all mt-4"
            style={{ backgroundColor: brandTeal }}
          >
            Save Changes
          </button>
        </div>

        <button 
          onClick={() => setShowDeletePopup(true)}
          className="w-full mt-12 py-4 rounded-2xl border-2 border-red-50 text-red-400 font-bold hover:bg-red-50 transition-all active:scale-95"
        >
          Request to delete user data
        </button>

        {/* Delete Step 1: Email Popup */}
        {showDeletePopup && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-slide-up relative overflow-hidden">
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Delete Account</h3>
              <p className="text-slate-500 text-sm mb-6">Please enter your email address to confirm account deletion.</p>
              
              <input 
                type="email"
                placeholder="Enter your email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all mb-6"
              />

              <div className="flex flex-col gap-3">
                <button 
                  disabled={!deleteEmail.includes('@')}
                  onClick={() => {
                    setShowDeletePopup(false);
                    setShowFinalConfirm(true);
                  }}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${
                    !deleteEmail.includes('@') ? 'bg-slate-200 cursor-not-allowed' : 'bg-red-500 shadow-lg shadow-red-500/20 active:scale-95'
                  }`}
                >
                  Permanently delete account
                </button>
                <button 
                  onClick={() => setShowDeletePopup(false)}
                  className="w-full py-3 text-slate-400 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Step 2: Final Confirmation */}
        {showFinalConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-slide-up text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons-round text-3xl">warning</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Are you sure?</h3>
              <p className="text-slate-500 text-sm mb-8">This action is irreversible. All your data will be permanently removed.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinalConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmAccountDeletion}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Profile Header */}
      <div className="px-6 pt-12 pb-8 flex flex-col items-center">
        <div className="relative mb-4 group">
          <div 
            className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl border-4 border-white transition-transform group-hover:scale-105"
            style={{ backgroundColor: brandTeal }}
          >
            <span className="text-white text-3xl font-black">LH</span>
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-slate-50 cursor-pointer hover:scale-110 active:scale-90 transition-all"
            style={{ color: brandOrange }}
          >
            <span className="material-icons-round text-lg">edit</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{formData.firstName} {formData.lastName}</h2>
        <p className="text-slate-400 font-medium text-sm">localh@lingroot.ai</p>
      </div>

      {/* Menu Sections */}
      <div className="px-6 pb-32">
        <div className="bg-white/70 glass rounded-[2rem] overflow-hidden border border-white/60 shadow-xl shadow-slate-200/50">
          <MenuItem 
            icon="person_outline" 
            label="Account settings" 
            onClick={() => setView('account_settings')}
          />
          <MenuItem 
            icon="language" 
            label="App Language" 
            value={selectedAppLanguage}
            onClick={() => setShowLanguagePopup(true)}
          />
          <MenuItem 
            icon="notifications_none" 
            label="Reminder Settings" 
            onClick={() => setView('reminder_settings')}
          />
          <MenuItem icon="data_usage" label="Remaining Usage" />
          <MenuItem icon="card_membership" label="Package Information" />
          <MenuItem icon="help_outline" label="Support" />
          <div className="p-2">
             <MenuItem icon="logout" label="Sign Out" destructive onClick={onSignOut} />
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-8 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">LingRoot AI v1.0.4</p>
        </div>
      </div>

      {/* Language Selection Popup */}
      {showLanguagePopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-slide-up relative overflow-hidden">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="material-icons-round text-teal-500">language</span>
              App Language
            </h3>
            
            <div className="space-y-3 mb-8">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setSelectedAppLanguage(lang.id as any);
                    // Add a slight delay for feel before closing
                    setTimeout(() => setShowLanguagePopup(false), 200);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    selectedAppLanguage === lang.id 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className={`font-bold ${selectedAppLanguage === lang.id ? 'text-orange-600' : 'text-slate-700'}`}>
                      {lang.name}
                    </span>
                  </div>
                  {selectedAppLanguage === lang.id && (
                    <span className="material-icons-round text-orange-500">check_circle</span>
                  )}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowLanguagePopup(false)}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
