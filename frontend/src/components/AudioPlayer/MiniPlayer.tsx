import React, { useState, useRef, useEffect } from 'react';
import { useAudioPlayerSafe } from '../../context/AudioPlayerContext';

interface Position {
    x: number;
    y: number;
}

const MiniPlayer: React.FC = () => {
    const player = useAudioPlayerSafe();

    // Draggable state - SSR için varsayılan değerler
    const [position, setPosition] = useState<Position>({ x: 20, y: 500 });
    const [isDragging, setIsDragging] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Client-side detection for SSR compatibility
    useEffect(() => {
        setIsClient(true);
        // Set initial position based on window size
        setPosition({ x: 20, y: window.innerHeight - 100 });
    }, []);

    // Load saved position from localStorage
    useEffect(() => {
        if (!isClient) return;
        try {
            const saved = localStorage.getItem('miniPlayerPosition');
            if (saved) {
                const parsed = JSON.parse(saved);
                setPosition(parsed);
            }
        } catch (e) {
            console.error('Error loading mini player position:', e);
        }
    }, [isClient]);

    // Save position to localStorage
    useEffect(() => {
        if (!isClient) return;
        try {
            localStorage.setItem('miniPlayerPosition', JSON.stringify(position));
        } catch (e) {
            console.error('Error saving mini player position:', e);
        }
    }, [position, isClient]);

    // Mouse down handler - start drag
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: position.x,
            posY: position.y,
        };
    };

    // Touch start handler - start drag
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        dragStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            posX: position.x,
            posY: position.y,
        };
    };

    // Global mouse/touch move handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStartRef.current) return;

            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + deltaX));
            const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + deltaY));

            setPosition({ x: newX, y: newY });
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging || !dragStartRef.current) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - dragStartRef.current.x;
            const deltaY = touch.clientY - dragStartRef.current.y;

            const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + deltaX));
            const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + deltaY));

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    // Don't render if no player context or no active track or not minimized
    if (!player || !player.activeTrack || !player.isMinimized) {
        return null;
    }

    const { activeTrack, isPlaying, currentTime, duration, togglePlayPause, expand, close } = player;

    // Format time
    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Progress percentage
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className="fixed z-[9999] select-none"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none',
            }}
        >
            <div
                className={`
          flex items-center gap-2 px-3 py-2 
          bg-gradient-to-r from-primary to-primary/90
          text-white rounded-full shadow-2xl
          border border-white/20
          ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}
          transition-transform duration-100
        `}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Drag handle indicator */}
                <div className="flex flex-col gap-0.5 mr-1 opacity-60">
                    <div className="w-4 h-0.5 bg-white/60 rounded"></div>
                    <div className="w-4 h-0.5 bg-white/60 rounded"></div>
                </div>

                {/* Play/Pause button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                    {isPlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Track info and progress */}
                <div className="flex flex-col min-w-[100px] max-w-[150px]">
                    <span className="text-xs font-medium truncate">{activeTrack.title}</span>
                    <div className="flex items-center gap-1">
                        {/* Mini progress bar */}
                        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-100"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-[10px] opacity-80">{formatTime(currentTime)}</span>
                        {/* Percentage badge */}
                        <span className="text-[9px] bg-white/20 px-1 rounded opacity-80">
                            {Math.round(progressPercent)}%
                        </span>
                    </div>
                </div>

                {/* Expand button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        expand();
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title="Büyüt"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>

                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        close();
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                    title="Kapat"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default MiniPlayer;
