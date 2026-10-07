import React, { useState, useRef, useMemo } from "react";

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

export interface AutocompleteItem {
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
