import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface OptionGroup {
  group: string;
  items: string[];
}

interface ModernSelectProps {
  label: string;
  options: string[] | OptionGroup[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function ModernSelect({ label, options, value, onChange, placeholder = "-- Pilih --", required = false }: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const isGrouped = (opts: string[] | OptionGroup[]): opts is OptionGroup[] => {
    return opts.length > 0 && typeof opts[0] !== 'string';
  };

  const filteredOptions = () => {
    const term = searchTerm.toLowerCase();
    if (!term) return options;

    if (isGrouped(options)) {
      return options
        .map(g => ({
          ...g,
          items: g.items.filter(item => item.toLowerCase().includes(term))
        }))
        .filter(g => g.items.length > 0);
    } else {
      return options.filter(item => item.toLowerCase().includes(term));
    }
  };

  const currentFilteredOptions = filteredOptions();

  const renderOption = (option: string) => (
    <button
      key={option}
      type="button"
      onClick={() => handleSelect(option)}
      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-all group ${
        value === option 
        ? 'bg-blue-50 text-blue-700 font-bold' 
        : 'text-gray-600 hover:bg-blue-50/50 hover:text-blue-600'
      }`}
    >
      <span className="tracking-tight">{option}</span>
      {value === option && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-blue-500"
        >
          <Check size={16} strokeWidth={3} />
        </motion.div>
      )}
    </button>
  );

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 ml-1 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 border transition-all duration-300 rounded-xl group ${
          isOpen 
          ? 'border-blue-500 ring-4 ring-blue-50/50 bg-white shadow-sm' 
          : 'border-gray-200 hover:border-blue-300 hover:bg-white'
        }`}
      >
        <span className={`text-sm tracking-tight text-left truncate pr-2 ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className={`shrink-0 ${isOpen ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400'}`}
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "circOut" }}
            className="absolute z-[60] w-full bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-0"
          >
            {/* Search Bar */}
            <div className="p-2 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-blue-300 transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 uppercase tracking-widest font-bold transition-colors"
                >
                  {placeholder}
                </button>
              )}
              
              {currentFilteredOptions.length > 0 ? (
                isGrouped(currentFilteredOptions) ? (
                  currentFilteredOptions.map((group, gIdx) => (
                    <div key={group.group} className={gIdx > 0 ? "mt-2 pt-2 border-t border-gray-50" : ""}>
                      <div className="px-4 py-1.5 text-[10px] font-extrabold text-blue-600/60 uppercase tracking-[0.2em] bg-blue-50/30">
                        {group.group}
                      </div>
                      {group.items.map(option => renderOption(option))}
                    </div>
                  ))
                ) : (
                  (currentFilteredOptions as string[]).map((option) => renderOption(option))
                )
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-xs uppercase tracking-widest font-bold">Tidak ditemukan</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
