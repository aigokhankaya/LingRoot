
import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isCreateActive?: boolean;
  onCreateClick?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isCreateActive, onCreateClick }) => {
  // Brand colors
  const tealBorder = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';
  const brandOrangeLight = 'hsl(38, 92%, 94%)';

  const isTabActive = (tab: AppTab) => activeTab === tab && !isCreateActive;

  const getTabStyles = (tab: AppTab) => {
    const active = isTabActive(tab);
    return `w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all relative ${
      active ? '' : 'text-slate-400 hover:text-slate-600'
    }`;
  };

  const getTabInlineStyle = (tab: AppTab) => {
    if (isTabActive(tab)) {
      return { color: brandOrange, backgroundColor: brandOrangeLight };
    }
    return {};
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50">
      <nav 
        className="bg-white/80 backdrop-blur-xl rounded-full shadow-2xl p-2 flex justify-between items-center max-w-sm mx-auto border"
        style={{ borderColor: tealBorder }}
      >
        <button 
          onClick={() => onTabChange('home')}
          className={getTabStyles('home')}
          style={getTabInlineStyle('home')}
        >
          <span className="material-icons-round">home</span>
          {isTabActive('home') && <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: brandOrange }} />}
        </button>

        <button 
          onClick={() => onTabChange('library')}
          className={getTabStyles('library')}
          style={getTabInlineStyle('library')}
        >
          <span className="material-icons-round">library_books</span>
          {isTabActive('library') && <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: brandOrange }} />}
        </button>

        {/* Central button: Reflects active state when in Create screen */}
        <button 
          onClick={onCreateClick}
          className={`w-12 h-12 rounded-full flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all border shadow-sm ${
            isCreateActive 
              ? 'border-transparent shadow-lg shadow-orange-200' 
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          style={isCreateActive ? { color: brandOrange, backgroundColor: brandOrangeLight, borderColor: brandOrange } : {}}
        >
          <span className="material-icons-round text-2xl">add</span>
        </button>

        <button 
          onClick={() => onTabChange('chat')}
          className={getTabStyles('chat')}
          style={getTabInlineStyle('chat')}
        >
          <span className="material-icons-round">forum</span>
          {isTabActive('chat') && <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: brandOrange }} />}
        </button>

        <button 
          onClick={() => onTabChange('profile')}
          className={getTabStyles('profile')}
          style={getTabInlineStyle('profile')}
        >
          <span className="material-icons-round">person</span>
          {isTabActive('profile') && <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: brandOrange }} />}
        </button>
      </nav>
    </div>
  );
};

export default BottomNav;
