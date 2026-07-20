import React, { useEffect, useRef } from "react";

interface KatexDisplayProps {
  math: string;
  block?: boolean;
}

/**
 * Safely renders a LaTeX mathematical formula using CDN-loaded KaTeX.
 * Falls back to plain text if KaTeX is not loaded yet or encounters an error.
 */
export const KatexDisplay: React.FC<KatexDisplayProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const renderMath = () => {
      const katex = (window as any).katex;
      if (containerRef.current && katex) {
        try {
          katex.render(math, containerRef.current, {
            displayMode: block,
            throwOnError: false,
          });
        } catch (err) {
          containerRef.current.textContent = math;
        }
      } else if (containerRef.current) {
        containerRef.current.textContent = math;
      }
    };

    // Attempt render immediately
    renderMath();

    // If katex is not yet loaded, wait and poll briefly
    if (!(window as any).katex) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).katex) {
          renderMath();
          clearInterval(interval);
        } else if (attempts > 20) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [math, block]);

  return <span ref={containerRef} className="select-all" />;
};
export default KatexDisplay;
