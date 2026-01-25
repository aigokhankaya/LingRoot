import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle, Lock, BookOpen, Mic, PlayCircle, Star, Briefcase } from 'lucide-react';

interface ContentItem {
    id: number | string;
    title: string;
    content_type?: string;
    type?: string;
    cefr_level?: string;
    level?: string;
    status?: 'completed' | 'in_progress' | 'not_started'; // Assuming this might be available
    is_completed?: boolean;
}

interface SectorSkillTreeProps {
    contentList: ContentItem[];
    onContentClick: (contentId: number | string) => void;
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LevelNode = ({ level, contents, isLocked, onContentClick }: { level: string, contents: ContentItem[], isLocked: boolean, onContentClick: (id: any) => void }) => {
    return (
        <div className={`relative pl-8 pb-12 border-l-2 ${isLocked ? 'border-gray-200 dark:border-gray-800' : 'border-teal-500'}`}>
            {/* Level Badge */}
            <div className={`
                absolute -left-4 top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${isLocked
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                    : 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'}
            `}>
                {level}
            </div>

            <div className="pt-1">
                <h3 className={`font-bold text-lg mb-4 ${isLocked ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    Seviye {level}
                </h3>

                {contents.length === 0 ? (
                    <div className="text-sm text-gray-400 italic">Bu seviye için henüz içerik yok.</div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {contents.map((content) => {
                            const isCompleted = content.status === 'completed' || content.is_completed;
                            const ContentIcon = getIconForType(content.content_type || content.type || '');

                            return (
                                <motion.div
                                    key={content.id}
                                    whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
                                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                                    onClick={() => !isLocked && onContentClick(content.id)}
                                    className={`
                                        relative group p-4 rounded-xl border transition-all cursor-pointer
                                        ${isLocked
                                            ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                                            : isCompleted
                                                ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800 shadow-sm hover:shadow-md'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 shadow-sm hover:shadow-md'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                                            ${isLocked
                                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                                                : isCompleted
                                                    ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                                                    : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'}
                                        `}>
                                            {isLocked ? <Lock className="w-5 h-5" /> : <ContentIcon className="w-5 h-5" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-medium text-sm mb-1 truncate ${isLocked ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                                {content.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="capitalize">{getContentLabel(content.content_type || content.type || '')}</span>
                                            </div>
                                        </div>

                                        {isCompleted && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle className="w-4 h-4 text-teal-500" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const getIconForType = (type: string) => {
    switch (type) {
        case 'dialogue': return Mic;
        case 'scenario': return Briefcase; // Assuming Briefcase is imported or available, otherwise Star
        case 'podcast': return PlayCircle;
        case 'article': return BookOpen;
        default: return Star;
    }
};

const getContentLabel = (type: string) => {
    const labels: Record<string, string> = {
        dialogue: 'Diyalog',
        scenario: 'Senaryo',
        podcast: 'Podcast',
        article: 'Makale',
        email: 'E-posta'
    };
    return labels[type] || type;
};

export const SectorSkillTree: React.FC<SectorSkillTreeProps> = ({ contentList, onContentClick }) => {
    // Group content by level
    const contentByLevel = React.useMemo(() => {
        const grouped: Record<string, ContentItem[]> = {};
        LEVELS.forEach(l => grouped[l] = []);

        contentList.forEach(content => {
            const level = content.cefr_level || content.level || 'A1'; // Default to A1 if missing
            if (grouped[level]) {
                grouped[level].push(content);
            } else {
                // Handle non-standard levels by mapping or putting in A1/C2
                grouped['A1'].push(content);
            }
        });
        return grouped;
    }, [contentList]);

    // Determine lock state - simple logic: lock if previous level has 0 completed items? 
    // For now, let's just unlock all for MVP or unlock if current level has content
    // Better: Unlock level if previous level has at least 1 completed item OR if it's A1.
    // Since we don't have full completion data structure properly passed yet, let's unlock all that have content.

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Gelişim Yol Haritası</h2>
                <p className="text-gray-500 dark:text-gray-400">Sektördeki uzmanlık seviyelerine göre hazırlanmış içerik yolu.</p>
            </div>

            <div className="ml-4">
                {LEVELS.map((level, index) => {
                    // Logic to determine if locked. For now, unlocked.
                    const isLocked = false;

                    // Only show levels that have content or are part of the path up to the highest available content?
                    // Let's show all levels to encourage progress, but maybe gray out empty ones?
                    // Actually, let's filter out empty levels from the RENDERING if we want a compact tree, 
                    // OR keep them to show the gap.
                    // "Kahramanın Yolculuğu" implies seeing the path ahead.

                    return (
                        <LevelNode
                            key={level}
                            level={level}
                            contents={contentByLevel[level]}
                            isLocked={isLocked}
                            onContentClick={onContentClick}
                        />
                    );
                })}

                {/* Final Goal Node */}
                <div className="relative pl-8 h-10">
                    <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-lg shadow-yellow-400/30 animate-pulse">
                        <Star className="w-5 h-5 fill-current" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SectorSkillTree;
