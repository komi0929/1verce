import React from 'react';
import { History, X } from 'lucide-react';

interface RecentSearchesProps {
  searches: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
  onRemove: (query: string) => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSelect,
  onClear,
  onRemove,
}) => {
  if (searches.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pt-1.5 text-[11px] font-jp">
      <div className="flex items-center gap-1 text-[#6C6C70] shrink-0 font-bold pr-1">
        <History className="w-3 h-3" />
        <span>履歴:</span>
      </div>
      {searches.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] text-[#D1D1D6] hover:text-[#FFFFFF] hover:border-[#48484A] shrink-0 transition-colors"
        >
          <button
            type="button"
            onClick={() => onSelect(s)}
            className="cursor-pointer"
          >
            {s}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(s);
            }}
            aria-label={`${s} を履歴から削除`}
            className="text-[#6C6C70] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-[10px] text-[#6C6C70] hover:text-[#AEAEB2] shrink-0 underline ml-1 cursor-pointer"
      >
        すべて消去
      </button>
    </div>
  );
};
