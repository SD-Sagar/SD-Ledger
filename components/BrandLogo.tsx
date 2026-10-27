'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showBadge?: boolean;
  subtext?: string;
  className?: string;
  interactive?: boolean;
}

export function BrandLogo({
  size = 'md',
  showText = true,
  showBadge = true,
  subtext,
  className = '',
  interactive = true,
}: BrandLogoProps) {
  // Dimension tokens based on size
  const sizeConfig = {
    sm: {
      box: 'h-8 w-8 min-w-8 rounded-xl',
      svg: 32,
      text: 'text-base',
      badge: 'hidden',
      sub: 'text-[9px]',
    },
    md: {
      box: 'h-9 w-9 sm:h-10 sm:w-10 min-w-9 sm:min-w-10 rounded-[14px]',
      svg: 40,
      text: 'text-lg sm:text-xl',
      badge: 'text-[10px] px-2 py-0.5',
      sub: 'text-[10px] sm:text-[11px]',
    },
    lg: {
      box: 'h-13 w-13 sm:h-14 sm:w-14 min-w-13 sm:min-w-14 rounded-2xl',
      svg: 56,
      text: 'text-2xl sm:text-3xl',
      badge: 'text-xs px-2.5 py-1',
      sub: 'text-xs sm:text-sm',
    },
    xl: {
      box: 'h-16 w-16 sm:h-20 sm:w-20 min-w-16 sm:min-w-20 rounded-3xl',
      svg: 80,
      text: 'text-3xl sm:text-4xl',
      badge: 'text-xs px-3 py-1',
      sub: 'text-sm sm:text-base',
    },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Dynamic Responsive SVG Icon Container */}
      <div
        className={`relative flex items-center justify-center p-0.5 shadow-md shadow-emerald-500/10 dark:shadow-emerald-500/20 transition-all duration-300 ${
          sizeConfig.box
        } ${
          interactive
            ? 'hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 cursor-pointer'
            : ''
        } bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400`}
      >
        {/* Inner backdrop: pristine white in light mode, deep zinc in dark mode */}
        <div className="relative flex h-full w-full items-center justify-center rounded-[inherit] bg-white dark:bg-zinc-950 overflow-hidden transition-colors duration-200">
          {/* Ambient inner glow in dark mode */}
          <div className="absolute inset-0 bg-radial from-emerald-500/15 via-transparent to-transparent opacity-0 dark:opacity-100 transition-opacity pointer-events-none" />

          {/* Bespoke Wallet & Ledger with SD Monogram Touch */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1.5 transition-transform duration-300 select-none"
          >
            <defs>
              {/* Light Mode Fills & Gradients */}
              <linearGradient id="walletFillLight" x1="4" y1="9" x2="28" y2="27" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f0fdfa" stopOpacity="0.7" />
              </linearGradient>

              {/* Dark Mode Fills & Gradients */}
              <linearGradient id="walletFillDark" x1="4" y1="9" x2="28" y2="27" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.6" />
              </linearGradient>

              {/* Peeking Card Gradient */}
              <linearGradient id="cardGradLight" x1="8" y1="4" x2="24" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
              <linearGradient id="cardGradDark" x1="8" y1="4" x2="24" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>

            {/* 1. TOP LEDGER TAB / CARD (Peeking from wallet pocket) */}
            <path
              d="M 8.5 10 V 6 C 8.5 4.9 9.4 4 10.5 4 H 21.5 C 22.6 4 23.5 4.9 23.5 6 V 10"
              className="stroke-[url(#cardGradLight)] dark:stroke-[url(#cardGradDark)] fill-cyan-500/10 dark:fill-cyan-400/20"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Ledger Register Balance Lines on peeking card */}
            <line
              x1="12"
              y1="6.8"
              x2="17"
              y2="6.8"
              className="stroke-[url(#cardGradLight)] dark:stroke-[url(#cardGradDark)]"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="19"
              y1="6.8"
              x2="20.5"
              y2="6.8"
              className="stroke-amber-400 dark:stroke-amber-300"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* 2. MAIN WALLET / LEDGER CHASSIS */}
            <rect
              x="4"
              y="9"
              width="24"
              height="18"
              rx="4"
              className="fill-[url(#walletFillLight)] dark:fill-[url(#walletFillDark)] stroke-emerald-600 dark:stroke-emerald-400 transition-colors"
              strokeWidth="1.8"
            />

            {/* Horizontal Leather Stitching / Fold Seam */}
            <line
              x1="4.5"
              y1="13.2"
              x2="27.5"
              y2="13.2"
              className="stroke-emerald-600/35 dark:stroke-emerald-400/35"
              strokeWidth="0.9"
              strokeDasharray="1.5 1.5"
            />

            {/* 3. EMBOSSED "SD" MONOGRAM (The personalized brand touch) */}
            <g className="transition-transform duration-200">
              {/* Embossed shield / plate on the wallet leather */}
              <rect
                x="6.5"
                y="15.5"
                width="11.5"
                height="9"
                rx="2"
                className="fill-emerald-500/15 dark:fill-emerald-400/20 stroke-emerald-600/30 dark:stroke-emerald-400/30"
                strokeWidth="0.75"
              />
              {/* Bold stylized SD Typography */}
              <text
                x="12.2"
                y="22.5"
                textAnchor="middle"
                className="fill-emerald-800 dark:fill-emerald-300 font-black tracking-tight select-none"
                style={{
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '7.8px',
                  fontWeight: 900,
                  letterSpacing: '-0.3px',
                }}
              >
                SD
              </text>
            </g>

            {/* 4. WALLET CLASP & SECURITY LOCK PIN */}
            {/* Clasp Flap extending from right */}
            <path
              d="M 19.5 15 H 27.5 C 28.3 15 29 15.7 29 16.5 V 20.5 C 29 21.3 28.3 22 27.5 22 H 19.5 C 18 22 17 20.8 17 18.5 C 17 16.2 18 15 19.5 15 Z"
              className="fill-white dark:fill-zinc-900 stroke-emerald-600 dark:stroke-emerald-400 transition-colors"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Golden Rivet / Metallic Clasp Lock Pin */}
            <circle
              cx="20.8"
              cy="18.5"
              r="1.4"
              className="fill-amber-400 stroke-amber-500 dark:fill-amber-300 dark:stroke-amber-400"
              strokeWidth="0.6"
            />

            {/* 5. DUAL BALANCED ACCOUNT DOTS (Micro credit & debit indicator) */}
            <circle
              cx="7.5"
              cy="11.2"
              r="0.8"
              className="fill-emerald-500 dark:fill-emerald-400"
            />
            <circle
              cx="10"
              cy="11.2"
              r="0.8"
              className="fill-cyan-500 dark:fill-cyan-400"
            />
          </svg>
        </div>
      </div>

      {/* Brand Text & Metadata */}
      {showText && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`font-black tracking-tight truncate ${sizeConfig.text} text-zinc-900 dark:text-white`}
            >
              SD
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                -Ledger
              </span>
            </span>

            {/* Optional Tagline Badge */}
            {showBadge && (
              <span
                className={`hidden md:inline-flex items-center rounded-full bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25 shrink-0 ${sizeConfig.badge}`}
              >
                Personal Bank Ledger
              </span>
            )}
          </div>

          {subtext && (
            <p className={`text-zinc-500 dark:text-zinc-400 truncate ${sizeConfig.sub}`}>
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
