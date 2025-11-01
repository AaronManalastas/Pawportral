// components/BackgroundFX.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";

type Variant = "soft" | "normal" | "bold";

/**
 * Aurora + paw pattern + blobs + grid + noise — adapts to dark mode.
 */
export default function BackgroundFX({
  className = "",
  global = false,
  variant = "soft",
}: {
  className?: string;
  global?: boolean;
  variant?: Variant;
}) {
  const { theme } = useTheme(); // detect dark vs light

  const cfg = {
    soft:   { tile: 160, pawOpacity: 0.08, pawFillAlpha: 0.18, gridOpacity: 0.03, bigPaw: 0.05 },
    normal: { tile: 120, pawOpacity: 0.14, pawFillAlpha: 0.30, gridOpacity: 0.05, bigPaw: 0.09 },
    bold:   { tile:  90, pawOpacity: 0.22, pawFillAlpha: 0.55, gridOpacity: 0.08, bigPaw: 0.12 },
  }[variant];

  // paw color changes with theme
  const pawColor = theme === "dark" ? "#c4b5fd" /* violet-300 */ : "#8b5cf6"; // violet-500 in light

  const pawUrl = React.useMemo(() => {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
        <g fill='${pawColor}' fill-opacity='${cfg.pawFillAlpha}'>
          <circle cx='20' cy='16' r='6'/>
          <circle cx='32' cy='12' r='5'/>
          <circle cx='44' cy='16' r='6'/>
          <circle cx='26' cy='36' r='10'/>
          <circle cx='38' cy='36' r='10'/>
        </g>
      </svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [pawColor, cfg.pawFillAlpha]);

  const maskNone = global ? "" : "[mask-image:radial-gradient(ellipse_at_center,black,transparent_60%)]";
  const gridMask = global ? "" : "[mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]";

  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none inset-0 -z-10 overflow-hidden",
        className || "absolute",
      ].join(" ")}
    >
      {/* Aurora blobs */}
      <div className="absolute left-1/2 top-[-22rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[conic-gradient(at_50%_50%,theme(colors.indigo.400/.32),theme(colors.fuchsia.400/.32),theme(colors.violet.400/.32),transparent_60%)] blur-3xl animate-slow-spin" />
      <div className="absolute right-[-14rem] bottom-[-18rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-indigo-400/18 via-fuchsia-400/18 to-violet-400/18 blur-3xl animate-float" />

      {/* extra blobs */}
      <div className="absolute left-[8%] top-[30%] h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 blur-2xl animate-float-slower [mask-image:radial-gradient(closest-side,black,transparent)]" />
      <div className="absolute right-[12%] top-[8%] h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/18 to-fuchsia-500/18 blur-2xl animate-float delay-300 [mask-image:radial-gradient(closest-side,black,transparent)]" />

      {/* subtle grid */}
      <div
        className={`pattern-grid absolute inset-0 ${gridMask}`}
        style={{ opacity: cfg.gridOpacity }}
      />

      {/* paw tile */}
      <div
        className={`absolute inset-0 animate-paws-pan ${maskNone}`}
        style={{
          opacity: cfg.pawOpacity,
          backgroundImage: pawUrl,
          backgroundRepeat: "repeat",
          backgroundSize: `${cfg.tile}px ${cfg.tile}px`,
          mixBlendMode: theme === "dark" ? "screen" : "multiply",
        }}
      />

      {/* large decorative paws */}
      <div
        className="absolute left-[6%] top-[58%] h-56 w-56 rotate-12"
        style={{
          opacity: cfg.bigPaw,
          backgroundImage: pawUrl,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          mixBlendMode: theme === "dark" ? "screen" : "multiply",
        }}
      />
      <div
        className="absolute right-[8%] top-[42%] h-44 w-44 -rotate-6"
        style={{
          opacity: cfg.bigPaw * 0.9,
          backgroundImage: pawUrl,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          mixBlendMode: theme === "dark" ? "screen" : "multiply",
        }}
      />

      {/* vertical fade */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,.0),rgba(255,255,255,.06)_20%,rgba(255,255,255,.06)_80%,rgba(255,255,255,.0))] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,.0),rgba(0,0,0,.06)_20%,rgba(0,0,0,.06)_80%,rgba(0,0,0,.0))]" />

      {/* grain */}
      <div className="noise absolute inset-0 opacity-[0.03]" />
    </div>
  );
}
