import React, { useState, useEffect, useRef, useMemo } from "react";

// Autocomplete command definitions
const AUTOCOMPLETE_COMMANDS = [
  // Greek letters
  { trigger: "/pi", insert: "π", label: "pi (π)" },
  { trigger: "/theta", insert: "θ", label: "theta (θ)" },
  { trigger: "/alpha", insert: "α", label: "alpha (α)" },
  { trigger: "/beta", insert: "β", label: "beta (β)" },
  { trigger: "/gamma", insert: "γ", label: "gamma (γ)" },
  { trigger: "/delta", insert: "δ", label: "delta (δ)" },
  { trigger: "/epsilon", insert: "ε", label: "epsilon (ε)" },
  { trigger: "/lambda", insert: "λ", label: "lambda (λ)" },
  { trigger: "/sigma", insert: "σ", label: "sigma (σ)" },
  { trigger: "/phi", insert: "φ", label: "phi (φ)" },
  { trigger: "/omega", insert: "ω", label: "omega (ω)" },
  { trigger: "/Delta", insert: "Δ", label: "Delta (Δ)" },
  { trigger: "/Sigma", insert: "Σ", label: "Sigma (Σ)" },

  // Math symbols
  { trigger: "/sqrt", insert: "√", label: "square root (√)" },
  { trigger: "/cbrt", insert: "∛", label: "cube root (∛)" },
  { trigger: "/inf", insert: "∞", label: "infinity (∞)" },
  { trigger: "/infinity", insert: "∞", label: "infinity (∞)" },
  { trigger: "/pm", insert: "±", label: "plus-minus (±)" },
  { trigger: "/neq", insert: "≠", label: "not equal (≠)" },
  { trigger: "/leq", insert: "≤", label: "less or equal (≤)" },
  { trigger: "/geq", insert: "≥", label: "greater or equal (≥)" },
  { trigger: "/approx", insert: "≈", label: "approximately (≈)" },
  { trigger: "/times", insert: "×", label: "times (×)" },
  { trigger: "/div", insert: "÷", label: "divide (÷)" },

  // Calculus
  { trigger: "/int", insert: "∫", label: "integral (∫)" },
  { trigger: "/integral", insert: "∫", label: "integral (∫)" },
  { trigger: "/sum", insert: "Σ", label: "summation (Σ)" },
  { trigger: "/partial", insert: "∂", label: "partial (∂)" },
  { trigger: "/nabla", insert: "∇", label: "nabla (∇)" },
  { trigger: "/lim", insert: "lim", label: "limit" },

  // Powers
  { trigger: "/sq", insert: "²", label: "squared (²)" },
  { trigger: "/squared", insert: "²", label: "squared (²)" },
  { trigger: "/cubed", insert: "³", label: "cubed (³)" },
  { trigger: "/^4", insert: "⁴", label: "to the 4th (⁴)" },
  { trigger: "/^n", insert: "ⁿ", label: "to the n (ⁿ)" },

  // Subscripts
  { trigger: "/_0", insert: "₀", label: "subscript 0 (₀)" },
  { trigger: "/_1", insert: "₁", label: "subscript 1 (₁)" },
  { trigger: "/_2", insert: "₂", label: "subscript 2 (₂)" },
  { trigger: "/_n", insert: "ₙ", label: "subscript n (ₙ)" },

  // Arrows
  { trigger: "/arrow", insert: "→", label: "arrow (→)" },
  { trigger: "/to", insert: "→", label: "arrow (→)" },
];

interface AutocompleteItem {
  trigger: string;
  insert: string;
  label: string;
}

interface UseAutocompleteResult {
  suggestions: AutocompleteItem[];
  selectedIndex: number;
  isOpen: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  selectSuggestion: (item: AutocompleteItem) => void;
  updateQuery: (text: string, cursorPos: number) => void;
  closeAutocomplete: () => void;
}

export const useAutocomplete = (
  onInsert: (text: string, replaceLength: number) => void
): UseAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [_currentQuery, setCurrentQuery] = useState("");
  const queryLengthRef = useRef(0);

  // Find matching commands based on current query
  const findMatches = useMemo(() => {
    return (query: string): AutocompleteItem[] => {
      if (!query.startsWith("/") || query.length < 2) return [];

      const searchTerm = query.toLowerCase();
      return AUTOCOMPLETE_COMMANDS.filter((cmd) =>
        cmd.trigger.toLowerCase().startsWith(searchTerm)
      ).slice(0, 8); // Limit to 8 suggestions
    };
  }, []);

  // Update query based on text input and cursor position
  const updateQuery = (text: string, cursorPos: number) => {
    // Find the word at cursor position
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/\/[\w^_]*$/);

    if (match) {
      const query = match[0];
      setCurrentQuery(query);
      queryLengthRef.current = query.length;

      const matches = findMatches(query);
      setSuggestions(matches);
      setIsOpen(matches.length > 0);
      setSelectedIndex(0);
    } else {
      closeAutocomplete();
    }
  };

  const closeAutocomplete = () => {
    setIsOpen(false);
    setSuggestions([]);
    setCurrentQuery("");
    queryLengthRef.current = 0;
  };

  const selectSuggestion = (item: AutocompleteItem) => {
    onInsert(item.insert, queryLengthRef.current);
    closeAutocomplete();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!isOpen) return false;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return true;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
        return true;

      case "Tab":
      case "Enter":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
          return true;
        }
        return false;

      case "Escape":
        e.preventDefault();
        closeAutocomplete();
        return true;

      default:
        return false;
    }
  };

  return {
    suggestions,
    selectedIndex,
    isOpen,
    handleKeyDown,
    selectSuggestion,
    updateQuery,
    closeAutocomplete,
  };
};

// Autocomplete dropdown component
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

    const selectedEl = list.children[selectedIndex] as HTMLElement;
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
