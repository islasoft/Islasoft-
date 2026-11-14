import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Play, Search } from 'lucide-react';

export default function ProjectSearchTimer({ allProjects, activeTimer, onStartTimer }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  const results = query.trim().length > 0
    ? allProjects
        .filter(p => {
          const q = query.toLowerCase();
          return (
            p.client_name?.toLowerCase().includes(q) ||
            p.project_type?.toLowerCase().replace(/_/g, ' ').includes(q) ||
            p.description?.toLowerCase().includes(q)
          );
        })
        .slice(0, 4)
    : [];

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (project) => {
    setQuery('');
    setShowDropdown(false);
    onStartTimer(project);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder={activeTimer ? 'Stop current timer before starting a new one' : 'Search project to start timer…'}
          value={query}
          disabled={!!activeTimer}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query.trim() && setShowDropdown(true)}
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSelect(project)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <Play className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">{project.client_name}</p>
                <p className="text-xs text-slate-500 truncate">{project.project_type?.replace(/_/g, ' ')}</p>
              </div>
              {project.due_date && (
                <span className="text-xs text-slate-400 flex-shrink-0">
                  Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </button>
          ))}
          {query.trim().length > 0 && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">No projects found</p>
          )}
        </div>
      )}

      {query.trim().length > 0 && results.length === 0 && showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
          <p className="px-4 py-3 text-sm text-slate-500">No projects found for "{query}"</p>
        </div>
      )}
    </div>
  );
}