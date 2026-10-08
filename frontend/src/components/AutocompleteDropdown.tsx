import React, { useEffect, useRef } from "react";
import type { AutocompleteItem } from "../hooks/useAutocomplete";

// Dropdown for autocomplete suggestions
interface AutocompleteDropdownProps {
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  onSelect: (item: AutocompleteItem) => void;
  style?: React.CSSProperties;
}

export const AutocompleteDropdown = ({
  suggestions,
  selectedIndex,
  onSelect,
  style,
}: AutocompleteDropdownProps) => {
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedEl = list.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
      style={style}
    >
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        Type to filter • Tab/Enter to insert
      </div>
      <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {suggestions.map((item, idx) => (
          <li key={item.trigger}>
            <button
              onClick={() => onSelect(item)}
              className={`
                w-full px-3 py-2 text-left flex items-center justify-between
                transition-colors
                ${
                  idx === selectedIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                }
              `}
            >
              <span className="text-sm">{item.label}</span>
              <code className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {item.trigger}
              </code>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
