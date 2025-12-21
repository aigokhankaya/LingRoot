
import React, { useState } from 'react';

interface SubTopic {
  title: string;
  description: string;
}

interface TopicTreeItem {
  level: number;
  selectedSubTopic: SubTopic | null;
}

interface CreateScreenProps {
  onBack: () => void;
  initialMode?: 'text' | 'file' | 'podcast' | 'topic-tree';
}

const CreateScreen: React.FC<CreateScreenProps> = ({ onBack, initialMode = 'text' }) => {
  const [mode, setMode] = useState<'text' | 'file' | 'podcast' | 'topic-tree'>(initialMode);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [mainTopicTitle, setMainTopicTitle] = useState('Osmanlıca vergi sistemi');
  const [isMainTopicSelected, setIsMainTopicSelected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [level, setLevel] = useState('B1');
  const [duration, setDuration] = useState('5');

  // Mock data for the Topic Tree matching the screenshot
  const [topicTree, setTopicTree] = useState<TopicTreeItem[]>([
    { 
      level: 1, 
      selectedSubTopic: { 
        title: 'Tax Collection Methods', 
        description: 'This subtopic discusses the methods used by the Ottoman authorities to collect taxes from citizens and businesses.' 
      } 
    },
    { 
      level: 2, 
      selectedSubTopic: { 
        title: 'Vergi Toplama Yöntemleri', 
        description: 'Vergi toplama yöntemleri, devletlerin gelir elde etme stratejilerini belirler. Bu yöntemler, vergi türüne ve ülkenin yasalarına göre değişiklik göst...' 
      } 
    },
    { 
      level: 3, 
      selectedSubTopic: { 
        title: 'Vergi Beyannamesi Süreci', 
        description: 'Vergi beyannamesi, bireylerin veya şirketlerin yıllık gelirlerini beyan ettiği belgedir. Bu süreç, vergi hesaplamaları için önemlidir.' 
      } 
    },
    { 
      level: 4, 
      selectedSubTopic: null 
    }
  ]);

  // Voice states
  const [voiceType, setVoiceType] = useState<'standard' | 'neural'>('neural');
  const [accent, setAccent] = useState('US');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [selectedModel, setSelectedModel] = useState('Zephyr');
  
  // Podcast specific voice states
  const [hostVoice, setHostVoice] = useState('Kore');
  const [guestVoice, setGuestVoice] = useState('Puck');

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const models = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
  const durations = ['1.5', '5', '10', '15'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const isFormValid = mode === 'text' 
    ? text.length > 0 
    : mode === 'file' 
    ? selectedFile !== null 
    : mode === 'podcast'
    ? topic.length > 0
    : mainTopicTitle.length > 0;

  const getHeaderTitle = () => {
    if (mode === 'text') return 'Create Audio';
    if (mode === 'file') return 'Upload File';
    if (mode === 'podcast') return 'Create Podcast';
    return 'My Topic Tree';
  };

  return (
    <div className="h-full flex flex-col animate-slide-up bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm active:scale-90 transition-all"
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          {getHeaderTitle()}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar space-y-8">
        {/* CEFR Selection - Circle Buttons at the top as per screenshot */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">CEFR Difficulty</label>
          <div className="flex justify-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {levels.map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`w-12 h-12 rounded-full font-bold text-xs transition-all border flex items-center justify-center shrink-0 ${
                  level === lvl 
                    ? 'text-white border-transparent shadow-lg' 
                    : 'bg-white border-slate-100 text-slate-300'
                }`}
                style={level === lvl ? { backgroundColor: brandTeal, boxShadow: `0 8px 15px -3px hsla(172, 66%, 45%, 0.3)` } : {}}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* TOPIC TREE MODE SPECIFIC VIEW */}
        {mode === 'topic-tree' ? (
          <div className="space-y-8">
            {/* Input Section - Top Card */}
            <div className="bg-white/90 rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Topic Title</label>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <input 
                  type="text" 
                  value={mainTopicTitle}
                  onChange={(e) => setMainTopicTitle(e.target.value)}
                  placeholder="Enter topic name..."
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-bold text-base placeholder:text-slate-300"
                />
              </div>
              <button 
                className="w-full py-4 rounded-2xl text-white font-black text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                style={{ backgroundColor: brandTeal }}
              >
                <span className="material-icons-round text-lg">add_circle</span>
                Create Main Topic
              </button>
            </div>

            {/* Combined Topic Tree Container - wrapped in a dashed border container as per screenshot */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic Tree</label>
              
              <div className="bg-white/30 rounded-[2.5rem] p-6 border-2 border-dashed border-blue-200/60 space-y-8">
                {/* Active Topic Bar - Clickable with toggleable selection state */}
                <div 
                  onClick={() => setIsMainTopicSelected(!isMainTopicSelected)}
                  className={`rounded-3xl px-6 py-5 border shadow-inner transition-all cursor-pointer ${
                    isMainTopicSelected 
                      ? 'bg-blue-100/80 border-teal-500/50 shadow-teal-500/10' 
                      : 'bg-slate-100/60 border-slate-200/50 hover:bg-slate-200/40'
                  }`}
                >
                  <h3 className={`text-xl font-extrabold text-center truncate transition-colors ${
                    isMainTopicSelected ? 'text-teal-700' : 'text-slate-700'
                  }`}>
                    {mainTopicTitle}
                  </h3>
                </div>

                {/* Level Detail Cards */}
                <div className="space-y-6">
                  {topicTree.map((item) => (
                    <div key={item.level} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/10 space-y-4">
                      <p className="text-xs font-bold text-slate-400 ml-1">Level {item.level} subtopic</p>
                      
                      {item.selectedSubTopic ? (
                        <div className="bg-blue-50/40 rounded-2xl p-5 border-2 border-teal-500/10 flex items-start justify-between gap-4 cursor-pointer hover:bg-blue-50/50 transition-all group">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-extrabold text-slate-800 text-lg group-hover:text-teal-600 transition-colors">{item.selectedSubTopic.title}</h4>
                            <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                              {item.selectedSubTopic.description}
                            </p>
                          </div>
                          <span className="material-icons-round text-slate-400 mt-1 shrink-0">arrow_drop_down</span>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 rounded-2xl p-5 border-2 border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all">
                          <span className="font-extrabold text-slate-300 text-lg italic">Select subtopic</span>
                          <span className="material-icons-round text-slate-300">arrow_drop_down</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions - Exactly matched to crop styling */}
            <div className="grid grid-cols-2 gap-3 pt-6">
              {/* Create Audio - Large Full Width Orange Button */}
              <button 
                className="col-span-2 py-5 rounded-[2.5rem] text-white font-black text-xl shadow-2xl shadow-orange-500/30 active:scale-95 flex items-center justify-center gap-3 transition-transform"
                style={{ background: `linear-gradient(135deg, ${brandOrange}, #f59e0b)` }}
              >
                <span className="material-icons-round">graphic_eq</span>
                Create Audio
              </button>
              
              {/* Suggest Subtopics - Outlined Teal Half Width */}
              <button 
                className="py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-slate-700 bg-white" 
                style={{ borderColor: brandTeal }}
              >
                Suggest Subtopics
              </button>
              
              {/* Add Manual - Outlined Teal Half Width */}
              <button 
                className="py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-slate-700 bg-white" 
                style={{ borderColor: brandTeal }}
              >
                Add Manual
              </button>
              
              {/* Delete - Full Width Light Red Button */}
              <button className="col-span-2 py-4 rounded-2xl bg-red-100/50 text-red-500 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                <span className="material-icons-round text-xl">delete_outline</span>
                Delete
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD MODES VIEW (Text, File, Podcast) - Retained for functional consistency */
          <>
            <div className="bg-white/70 glass rounded-[2rem] p-6 border border-white/60 shadow-xl shadow-slate-200/50">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {mode === 'text' ? 'Input Text' : mode === 'file' ? 'Select Document' : 'Topic'}
                </label>
                {mode === 'text' && (
                  <span className="text-[10px] font-bold text-slate-300">{text.length} characters</span>
                )}
              </div>
              
              <div className="space-y-3">
                {mode === 'text' ? (
                  <>
                    <textarea 
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste or type your text here to convert it into a beautiful natural voice..."
                      className={`w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 font-medium text-sm resize-none ${isExpanded ? 'h-80' : 'h-32'}`}
                    />
                    
                    <div className="flex justify-center">
                      <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-center px-10 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-teal-600 hover:bg-white hover:shadow-sm transition-all text-[11px] font-black uppercase tracking-widest active:scale-95"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                  </>
                ) : mode === 'file' ? (
                  <div className="relative">
                    <input 
                      type="file" 
                      id="file-upload"
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                    />
                    <label 
                      htmlFor="file-upload"
                      className={`w-full border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/50 group ${
                        selectedFile ? 'border-green-400 bg-green-50/10' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                        selectedFile ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400'
                      }`}>
                        <span className="material-icons-round text-3xl">
                          {selectedFile ? 'check_circle' : 'cloud_upload'}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className={`font-bold text-sm ${selectedFile ? 'text-green-600' : 'text-slate-600'}`}>
                          {selectedFile ? selectedFile.name : 'Click to select or drag document'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                          PDF, DOCX, TXT UP TO 10MB
                        </p>
                      </div>
                    </label>
                    {selectedFile && (
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-red-400 active:scale-90"
                      >
                        <span className="material-icons-round text-lg">close</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What should the podcast be about?"
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 font-medium text-sm"
                  />
                )}
              </div>
            </div>

            {/* Standard Action Button for non-tree modes */}
            <button 
              disabled={!isFormValid}
              className={`w-full py-5 rounded-[2.5rem] text-white font-extrabold text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!isFormValid ? 'bg-slate-200 cursor-not-allowed opacity-50' : ''}`}
              style={isFormValid ? { 
                background: `linear-gradient(135deg, ${brandOrange}, #f59e0b)`,
                boxShadow: `0 20px 25px -5px hsla(38, 92%, 60%, 0.2)`
              } : {}}
            >
              <span className="material-icons-round">
                {mode === 'text' ? 'graphic_eq' : mode === 'file' ? 'auto_fix_high' : 'mic'}
              </span>
              {mode === 'text' ? 'Create Audio' : mode === 'file' ? 'Analyze & Create' : 'Create Podcast'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateScreen;
