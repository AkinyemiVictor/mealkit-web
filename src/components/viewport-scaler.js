"use client";

import { useEffect } from "react";

export default function ViewportScaler({ baseWidth = 1200 }) {
  useEffect(() => {
    const wrapper = document.getElementById("viewport-wrapper");
    const content = document.getElementById("viewport-content");
    if (!wrapper || !content) return;

    function applyScale() {
      const ww = Math.max(window.innerWidth || 0, 1);
      const scale = Math.min(1, ww / baseWidth);
      const scaledWidth = baseWidth * scale;

      wrapper.style.transformOrigin = "top left";
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.width = `${baseWidth}px`;

      // Center the scaled canvas horizontally for all widths
      const offset = Math.max(0, (ww - scaledWidth) / 2);
      wrapper.style.marginLeft = `${Math.round(offset)}px`;
      // Expose scale and offset for inner exceptions (footer / download section)
      wrapper.style.setProperty("--gscale", String(scale));
      wrapper.style.setProperty("--goffset", `${Math.round(offset)}px`);

      // Match wrapper layout height to scaled visual height so scrolling works correctly
      const contentHeight = content.scrollHeight || content.offsetHeight || 0;
      const layoutHeight = Math.ceil(contentHeight / scale);
      wrapper.style.height = `${layoutHeight}px`;
    }

    const ro = new ResizeObserver(() => applyScale());
    try { ro.observe(content); } catch {}
    window.addEventListener("resize", applyScale);
    window.addEventListener("orientationchange", applyScale);
    // Initial call
    applyScale();

    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener("resize", applyScale);
      window.removeEventListener("orientationchange", applyScale);
    };
  }, [baseWidth]);

  return null;
}
