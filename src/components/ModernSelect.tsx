import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

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

  const isGrouped = (opts: string[] | OptionGroup[]): opts is OptionGroup[] => {
    return opts.length > 0 && typeof opts[0] !== 'string';
  };

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
        <span className={`text-sm tracking-tight ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className={`${isOpen ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400'}`}
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
            className="absolute z-[60] w-full bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-2"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 uppercase tracking-widest font-bold transition-colors"
              >
                {placeholder}
              </button>
              
              {isGrouped(options) ? (
                options.map((group, gIdx) => (
                  <div key={group.group} className={gIdx > 0 ? "mt-2 pt-2 border-t border-gray-50" : ""}>
                    <div className="px-4 py-1.5 text-[10px] font-extrabold text-blue-600/60 uppercase tracking-[0.2em] bg-blue-50/30">
                      {group.group}
                    </div>
                    {group.items.map(option => renderOption(option))}
                  </div>
                ))
              ) : (
                options.map((option) => renderOption(option))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
