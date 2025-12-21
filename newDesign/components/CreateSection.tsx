
import React from 'react';

interface CreateSectionProps {
  onOpenTTS: () => void;
  onOpenUpload: () => void;
  onOpenPodcast: () => void;
  onOpenTopicTree?: () => void;
  onOpenVocabulary?: () => void;
}

const CreateSection: React.FC<CreateSectionProps> = ({ 
  onOpenTTS, 
  onOpenUpload, 
  onOpenPodcast, 
  onOpenTopicTree,
  onOpenVocabulary 
}) => {
  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-lg font-extrabold text-slate-800">Create</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Text to Speech Card */}
        <div 
          onClick={onOpenTTS}
          className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-indigo-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-blue-500 cursor-pointer h-40 flex flex-col justify-between"
        >
          <div className="absolute top-2 right-2 text-blue-500/10 group-hover:text-blue-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl" style={{ transform: 'rotate(12deg)' }}>text_fields</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 text-blue-500 transition-transform group-hover:scale-110 border border-blue-100 relative z-10">
            <span className="material-icons-round text-2xl">translate</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">Text to Speech</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Convert text instantly</p>
          </div>
        </div>

        {/* Upload File Card */}
        <div 
          onClick={onOpenUpload}
          className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-green-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-green-500 cursor-pointer h-40 flex flex-col justify-between"
        >
          <div className="absolute top-2 right-2 text-green-500/10 group-hover:text-green-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl" style={{ transform: 'rotate(-15deg)' }}>description</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3 text-green-500 transition-transform group-hover:scale-110 border border-green-100 relative z-10">
            <span className="material-icons-round text-2xl">post_add</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">Upload File</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">PDF & Word docs</p>
          </div>
        </div>

        {/* Podcast Card */}
        <div 
          onClick={onOpenPodcast}
          className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-purple-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-purple-500 cursor-pointer h-40 flex flex-col justify-between"
        >
          <div className="absolute top-2 right-2 text-purple-500/10 group-hover:text-purple-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl" style={{ transform: 'rotate(20deg)' }}>podcasts</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3 text-purple-500 transition-transform group-hover:scale-110 border border-purple-100 relative z-10">
            <span className="material-icons-round text-2xl">mic</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">Podcast</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Learn by listening</p>
          </div>
        </div>

        {/* My Topic Tree Card - New */}
        <div 
          onClick={onOpenTopicTree}
          className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-fuchsia-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-fuchsia-500 cursor-pointer h-40 flex flex-col justify-between"
        >
          <div className="absolute top-2 right-2 text-fuchsia-500/10 group-hover:text-fuchsia-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl" style={{ transform: 'rotate(5deg)' }}>account_tree</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center mb-3 text-fuchsia-500 transition-transform group-hover:scale-110 border border-fuchsia-100 relative z-10">
            <span className="material-icons-round text-2xl">hub</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">My Topic Tree</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Explore your roadmap</p>
          </div>
        </div>

        {/* Vocabulary Card */}
        <div 
          onClick={onOpenVocabulary}
          className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-amber-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-amber-500 cursor-pointer h-40 flex flex-col justify-between"
        >
          <div className="absolute top-2 right-2 text-amber-500/10 group-hover:text-amber-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl" style={{ transform: 'rotate(-8deg)' }}>spellcheck</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3 text-amber-500 transition-transform group-hover:scale-110 border border-amber-100 relative z-10">
            <span className="material-icons-round text-2xl">menu_book</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">Vocabulary</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Your word list</p>
          </div>
        </div>

        {/* Search Books Card */}
        <div className="group relative overflow-hidden rounded-3xl p-5 bg-white shadow-sm hover:shadow-teal-500/10 transition-all duration-300 border border-slate-200/50 border-l-[6px] border-l-teal-500 cursor-pointer h-40 flex flex-col justify-between">
          <div className="absolute top-2 right-2 text-teal-500/10 group-hover:text-teal-500/20 transition-all duration-500 pointer-events-none">
            <span className="material-icons-round text-7xl">search</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3 text-teal-500 transition-transform group-hover:scale-110 border border-teal-100 relative z-10">
            <span className="material-icons-round text-2xl">manage_search</span>
          </div>
          
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 leading-tight">Search Books</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Find your next read</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSection;
