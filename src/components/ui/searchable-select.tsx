import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", className = "" }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0); // 0 for None/Reset, 1...n for options
  
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (isOpen && optionsListRef.current) {
      const listElement = optionsListRef.current;
      const focusedElement = listElement.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        if (focusedElement.offsetTop < listElement.scrollTop) {
          listElement.scrollTop = focusedElement.offsetTop;
        } else if (focusedElement.offsetTop + focusedElement.offsetHeight > listElement.scrollTop + listElement.clientHeight) {
          listElement.scrollTop = focusedElement.offsetTop + focusedElement.offsetHeight - listElement.clientHeight;
        }
      }
    }
  }, [focusedIndex, isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex === 0) {
        onChange("");
      } else if (filteredOptions[focusedIndex - 1]) {
        onChange(filteredOptions[focusedIndex - 1].value);
      }
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        tabIndex={0}
        className={`w-full bg-white border border-slate-200 h-10 rounded-lg px-3 flex items-center justify-between text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className={selectedOption ? "text-slate-900 font-semibold" : "text-slate-500 font-semibold"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400 font-medium text-slate-800"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar" ref={optionsListRef}>
            <div 
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between transition-colors ${focusedIndex === 0 ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"} ${!value ? "text-blue-700 font-bold" : "text-slate-600 font-medium"}`}
              onClick={() => { onChange(""); setIsOpen(false); setSearchQuery(""); }}
            >
              <span>None / Reset</span>
              {!value && <Check size={14} className="text-blue-600" />}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400 text-center font-medium">No results found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const itemIndex = idx + 1;
                const isSelected = value === opt.value;
                const isFocused = focusedIndex === itemIndex;
                
                return (
                  <div 
                    key={opt.value}
                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between transition-colors ${isFocused ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"} ${isSelected ? "text-blue-700 font-bold" : "text-slate-700 font-medium"}`}
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearchQuery(""); }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} className="text-blue-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
