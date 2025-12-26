import { useCallback, useEffect, useState } from "react";

interface SidebarResizerProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

const SidebarResizer = ({
  onResize,
  minWidth = 240,
  maxWidth = 480,
}: SidebarResizerProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      // Calculate width from the left edge (sidebar grows to the right)
      const newWidth = e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      onResize(clampedWidth);
    },
    [isDragging, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute right-0 top-0 w-1.5 h-full cursor-col-resize transition-colors shrink-0 group z-50 ${
        isDragging ? "bg-blue-500" : "bg-transparent hover:bg-blue-400"
      }`}
    >
      {/* Drag handle indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-1 bg-gray-500 rounded-full" />
        <div className="w-1 h-1 bg-gray-500 rounded-full" />
        <div className="w-1 h-1 bg-gray-500 rounded-full" />
      </div>
    </div>
  );
};

export default SidebarResizer;
