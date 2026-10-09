import { useEffect, useState } from "react";

// Google's sign-in button takes a fixed pixel width, so it can't stretch with
// CSS. Match the form (max 384px) and shrink on phones so it never overflows.
const FORM_WIDTH = 384;
const PAGE_GUTTER = 40; // the page's left + right padding on phones

const widthFor = (viewport: number) =>
  Math.min(FORM_WIDTH, viewport - PAGE_GUTTER);

export const useGoogleButtonWidth = () => {
  const [width, setWidth] = useState(() => widthFor(window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(widthFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
};
