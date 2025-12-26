import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  Keyboard,
  Calculator,
  Lightbulb,
  Command,
  CornerDownLeft,
} from "lucide-react";

const HelpSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"shortcuts" | "symbols" | "tips">(
    "shortcuts"
  );

  const shortcuts = [
    { key: "/sqrt", desc: "Square root", icon: "√" },
    { key: "/pi", desc: "Pi", icon: "π" },
    { key: "/theta", desc: "Theta", icon: "θ" },
    { key: "/inf", desc: "Infinity", icon: "∞" },
    { key: "/sq", desc: "Squared", icon: "x²" },
    { key: "/int", desc: "Integral", icon: "∫" },
    { key: "/sum", desc: "Sum", icon: "Σ" },
    { key: "/neq", desc: "Not equal", icon: "≠" },
  ];

  const symbols = [
    { category: "Powers", items: ["²", "³", "⁴", "ⁿ"] },
    { category: "Greek", items: ["π", "θ", "α", "β", "γ", "δ", "λ", "σ"] },
    { category: "Operators", items: ["±", "×", "÷", "≠", "≤", "≥", "∞"] },
    { category: "Calculus", items: ["∫", "∑", "∏", "∂", "∇"] },
  ];

  const tips = [
    { text: "Use toolbar for math symbols", icon: Calculator },
    { text: "Type / for keyboard shortcuts", icon: Command },
    { text: "Tab/Enter to autocomplete", icon: CornerDownLeft },
    { text: "Shift+Enter for new line", icon: Keyboard },
  ];

  return (
    <div className="bg-white dark:bg-[#0f1117]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 border-l-2 ${
          isOpen
            ? "bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-500"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 border-transparent"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle
            className={`w-4 h-4 ${
              isOpen ? "fill-blue-100 dark:fill-blue-900/30" : ""
            }`}
          />
          <span>Help & Shortcuts</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-blue-500" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-1 bg-gray-50/50 dark:bg-[#0f1117] border-b border-gray-100 dark:border-white/5">
          {/* Custom Tab Switcher */}
          <div className="flex p-1 mb-4 bg-gray-200/50 dark:bg-white/5 rounded-xl backdrop-blur-sm">
            {(["shortcuts", "symbols", "tips"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab === "shortcuts" && <Keyboard className="w-3.5 h-3.5" />}
                {tab === "symbols" && <Calculator className="w-3.5 h-3.5" />}
                {tab === "tips" && <Lightbulb className="w-3.5 h-3.5" />}
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            {/* Shortcuts Tab */}
            {activeTab === "shortcuts" && (
              <div className="grid grid-cols-2 gap-2">
                {shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex flex-col p-2 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
                        {s.key}
                      </code>
                      <span className="text-gray-400 opacity-50 font-serif italic text-xs group-hover:opacity-100 transition-opacity">
                        {s.icon}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium pl-0.5">
                      {s.desc}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Symbols Tab */}
            {activeTab === "symbols" && (
              <div className="space-y-4">
                {symbols.map((s) => (
                  <div key={s.category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100 dark:bg-white/10" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {s.category}
                      </span>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-white/10" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {s.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center h-8 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-serif border border-gray-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-crosshair select-all"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tips Tab */}
            {activeTab === "tips" && (
              <div className="space-y-2.5">
                {tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-linear-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-xl border border-yellow-100/50 dark:border-yellow-900/20"
                  >
                    <div className="p-1.5 bg-white dark:bg-white/5 rounded-full shadow-sm text-yellow-600 dark:text-yellow-400 shrink-0">
                      <tip.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed pt-0.5">
                      {tip.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSection;
