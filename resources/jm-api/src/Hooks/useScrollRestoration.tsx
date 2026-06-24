import { useLayoutEffect, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function useScrollRestoration() {
  const location = useLocation();
  const pathname = location.pathname;
  const key = `scroll-position:${pathname}${location.search}`;
  const restoreCalled = useRef(false);
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 定義不記錄滾動位置的路徑
  const skipPaths = ["/comic/detail", "/comic/detail/read"];
  const shouldSkip = skipPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (shouldSkip) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, [shouldSkip]);

  useLayoutEffect(() => {
    if (shouldSkip) return;

    const savedY = sessionStorage.getItem(key);
    if (!savedY) return;

    const targetY = parseInt(savedY, 10);

    const doScroll = () => {
      if (restoreCalled.current) return;
      const pageHeight = document.body.scrollHeight;
      if (pageHeight >= targetY) {
        window.scrollTo(0, targetY);
        restoreCalled.current = true;
      } else {
        requestAnimationFrame(doScroll);
      }
    };

    doScroll();

    const observer = new ResizeObserver(() => {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(() => {
        if (!restoreCalled.current) doScroll();
      }, 150);
    });

    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      restoreCalled.current = false;
    };
  }, [key, shouldSkip]);

  useEffect(() => {
    if (shouldSkip) return;

    const onScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      scrollTimeout.current = setTimeout(() => {
        sessionStorage.setItem(key, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [key, shouldSkip]);
}
