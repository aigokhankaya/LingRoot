
import React, { useState } from 'react';
import Header from './components/Header';
import LiroBanner from './components/LiroBanner';
import CreateSection from './components/CreateSection';
import BookLibraryCard from './components/BookLibraryCard';
import JumpBackIn from './components/JumpBackIn';
import TipBox from './components/TipBox';
import BottomNav from './components/BottomNav';
import TTSOverlay from './components/TTSOverlay';
import Login from './components/Login';
import Register from './components/Register';
import LibraryDetail from './components/LibraryDetail';
import Profile from './components/Profile';
import Vocabulary from './components/Vocabulary';
import CreateScreen from './components/CreateScreen';
import { AppTab } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'app' | 'vocabulary' | 'create'>('login');
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [createMode, setCreateMode] = useState<'text' | 'file' | 'podcast' | 'topic-tree'>('text');
  const [showTTS, setShowTTS] = useState(false);

  const handleLogin = () => setView('app');
  const handleGoToRegister = () => setView('register');
  const handleGoToLogin = () => setView('login');
  
  const handleOpenLibrary = () => {
    setActiveTab('library');
    setView('app');
  };
  
  const handleOpenVocabulary = () => {
    setView('vocabulary');
  };

  const handleOpenCreate = (mode: 'text' | 'file' | 'podcast' | 'topic-tree' = 'text') => {
    setCreateMode(mode);
    setView('create');
  };

  const handleBackToHome = () => {
    setActiveTab('home');
    setView('app');
  };
  
  const handleSignOut = () => setView('login');

  const handleOpenTopicTree = () => {
    handleOpenCreate('topic-tree');
  };

  if (view === 'login') {
    return <Login onLogin={handleLogin} onGoToRegister={handleGoToRegister} />;
  }

  if (view === 'register') {
    return <Register onRegister={handleLogin} onGoToLogin={handleGoToLogin} />;
  }

  if (view === 'vocabulary') {
    return (
      <div className="relative min-h-screen w-full flex flex-col max-w-md mx-auto bg-slate-50 overflow-x-hidden">
        <div className="app-bg" />
        <Vocabulary onBack={handleBackToHome} />
        <BottomNav activeTab={activeTab} onTabChange={(tab) => { setView('app'); setActiveTab(tab); }} onCreateClick={() => handleOpenCreate('text')} isCreateActive={view === 'create'} />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="relative min-h-screen w-full flex flex-col max-w-md mx-auto bg-slate-50 overflow-x-hidden">
        <div className="app-bg" />
        <CreateScreen onBack={handleBackToHome} initialMode={createMode} />
        <BottomNav activeTab={activeTab} onTabChange={(tab) => { setView('app'); setActiveTab(tab); }} onCreateClick={() => handleOpenCreate('text')} isCreateActive={view === 'create'} />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="px-6 space-y-8 mt-4">
            <LiroBanner />
            <CreateSection 
              onOpenTTS={() => handleOpenCreate('text')} 
              onOpenUpload={() => handleOpenCreate('file')}
              onOpenPodcast={() => handleOpenCreate('podcast')}
              onOpenTopicTree={handleOpenTopicTree}
              onOpenVocabulary={handleOpenVocabulary}
            />
            <BookLibraryCard onClick={handleOpenLibrary} />
            <JumpBackIn />
            <TipBox />
          </div>
        );
      case 'profile':
        return <Profile onSignOut={handleSignOut} />;
      case 'library':
        return (
          <div className="h-full">
            <LibraryDetail onBack={handleBackToHome} />
          </div>
        );
      case 'chat':
        return (
          <div className="px-6 pt-12 flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <span className="material-icons-round text-6xl mb-4 opacity-20">forum</span>
            <p className="font-bold">AI Chat coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col max-w-md mx-auto bg-slate-50 overflow-x-hidden">
      {/* Background blobs */}
      <div className="app-bg" />
      <div className="blob bg-indigo-400 w-64 h-64 rounded-full -top-10 -left-10 opacity-30 animate-float" />
      <div className="blob bg-blue-500 w-80 h-80 rounded-full bottom-20 -right-10 opacity-30 animate-float" style={{ animationDelay: '2s' }} />

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto no-scrollbar ${activeTab === 'library' ? '' : 'pb-32'}`}>
        {activeTab === 'home' && <Header username="Local H" audioCreated={12} minutesContent={48} />}
        {renderTabContent()}
      </div>

      {/* Persistent Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onCreateClick={() => handleOpenCreate('text')} isCreateActive={view === 'create'} />
    </div>
  );
};

export default App;
