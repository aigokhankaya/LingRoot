import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Search } from 'lucide-react';
import { ProfileDropdownMenu } from '@/components/shared/ProfileDropdownMenu';

interface LibraryLayoutProps {
  children: ReactNode;
  activeFilter?: 'all' | 'in-progress' | 'finished';
  onFilterChange?: (filter: 'all' | 'in-progress' | 'finished') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const LibraryLayout: React.FC<LibraryLayoutProps> = ({ 
  children, 
  activeFilter = 'all', 
  onFilterChange,
  searchQuery = '',
  onSearchChange
}) => {
  const router = useRouter();

  const filters = [
    { id: 'all', label: 'Tümü', icon: BookOpen },
    { id: 'in-progress', label: 'Devam Edenler', icon: Clock },
    { id: 'finished', label: 'Bitenler', icon: CheckCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Kütüphanem
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Kitap veya doküman ara..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800/50 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-800 text-sm rounded-full outline-none transition-all placeholder:text-gray-500 dark:text-white"
                />
              </div>
              <ProfileDropdownMenu align="end" />
            </div>
          </div>

          {/* Filters Bar - Only show if filter props provided */}
          {onFilterChange && (
            <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }
                    `}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-gray-500'} />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
