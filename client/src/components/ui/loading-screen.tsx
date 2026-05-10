import { Loader2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  className,
  fullScreen = true
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 select-none",
        fullScreen ? "fixed inset-0 min-h-screen" : "w-full h-full min-h-[400px]",
        className
      )}
    >
      {/* Ambient glow behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="ls-ambient-blob ls-ambient-blob--1" />
        <div className="ls-ambient-blob ls-ambient-blob--2" />
      </div>

      <div className="relative flex flex-col items-center justify-center space-y-8">
        {/* Logo + rings container */}
        <div className="relative w-36 h-36 flex items-center justify-center">

          {/* Outermost faint ring with dashed stroke */}
          <div className="absolute inset-0 rounded-full ls-ring-dashed" />

          {/* Outer gradient ring – spins slowly */}
          <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] ls-spin-slow" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="ls-grad-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="76" fill="none" stroke="url(#ls-grad-outer)" strokeWidth="3" strokeLinecap="round" />
          </svg>

          {/* Inner gradient ring – spins opposite */}
          <svg className="absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-8px)] ls-spin-reverse" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="ls-grad-inner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.7" />
                <stop offset="60%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <circle cx="70" cy="70" r="66" fill="none" stroke="url(#ls-grad-inner)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="12 8" />
          </svg>

          {/* Orbiting dots */}
          <div className="absolute inset-[-12px] w-[calc(100%+24px)] h-[calc(100%+24px)] ls-spin-orbit">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
          <div className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] ls-spin-orbit-reverse">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_hsl(var(--secondary)/0.5)]" />
          </div>

          {/* Pulsing glow ring */}
          <div className="absolute inset-2 rounded-full ls-glow-pulse" />

          {/* Logo container */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/15 shadow-2xl flex items-center justify-center bg-background/60 backdrop-blur-xl ls-logo-breathe">
            <img
              src="/plp_logo.png"
              alt="PLP Logo"
              className="w-[76px] h-[76px] object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Message + progress */}
        {message && (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2.5 text-foreground font-semibold">
              <Loader2 className="w-[18px] h-[18px] animate-spin text-primary" />
              <span className="text-base tracking-wide">{message}</span>
            </div>

            {/* Animated progress bar */}
            <div className="w-48 h-1 rounded-full bg-muted/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-primary/60 to-primary ls-progress-slide" />
            </div>
          </div>
        )}
      </div>

      {/* Scoped styles – co-located with the component */}
      <style>{`
        /* ── Ambient blobs ─────────────────────────────────────── */
        .ls-ambient-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
        }
        .ls-ambient-blob--1 {
          width: 260px; height: 260px;
          background: hsl(var(--primary));
          top: 30%; left: 20%;
          animation: ls-float 8s ease-in-out infinite;
        }
        .ls-ambient-blob--2 {
          width: 200px; height: 200px;
          background: hsl(var(--secondary));
          bottom: 25%; right: 20%;
          animation: ls-float 10s ease-in-out infinite reverse;
        }

        /* ── Dashed outer ring ─────────────────────────────────── */
        .ls-ring-dashed {
          border: 2px dashed hsl(var(--primary) / 0.12);
          animation: ls-spin-cw 20s linear infinite;
        }

        /* ── Ring spins ────────────────────────────────────────── */
        .ls-spin-slow   { animation: ls-spin-cw  3s linear infinite; }
        .ls-spin-reverse { animation: ls-spin-ccw 4s linear infinite; }

        /* ── Orbiting dots ─────────────────────────────────────── */
        .ls-spin-orbit         { animation: ls-spin-cw  2.5s linear infinite; }
        .ls-spin-orbit-reverse { animation: ls-spin-ccw 3.5s linear infinite; }

        /* ── Pulsing glow ──────────────────────────────────────── */
        .ls-glow-pulse {
          box-shadow: 0 0 20px 4px hsl(var(--primary) / 0.15),
                      0 0 40px 8px hsl(var(--primary) / 0.06);
          animation: ls-pulse-glow 2.5s ease-in-out infinite;
        }

        /* ── Logo breathe ──────────────────────────────────────── */
        .ls-logo-breathe {
          animation: ls-breathe 3s ease-in-out infinite;
        }

        /* ── Progress bar slide ────────────────────────────────── */
        .ls-progress-slide {
          width: 40%;
          animation: ls-slide 1.6s ease-in-out infinite;
        }

        /* ── Floating blob drift ───────────────────────────────── */
        @keyframes ls-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(15px, -20px) scale(1.08); }
          66%      { transform: translate(-10px, 10px) scale(0.95); }
        }

        /* ── Spins ─────────────────────────────────────────────── */
        @keyframes ls-spin-cw  { to { transform: rotate(360deg); } }
        @keyframes ls-spin-ccw { to { transform: rotate(-360deg); } }

        /* ── Glow pulse ────────────────────────────────────────── */
        @keyframes ls-pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px 4px hsl(var(--primary) / 0.12),
                        0 0 40px 8px hsl(var(--primary) / 0.04);
          }
          50% {
            box-shadow: 0 0 28px 8px hsl(var(--primary) / 0.22),
                        0 0 56px 16px hsl(var(--primary) / 0.08);
          }
        }

        /* ── Logo breathe scale ────────────────────────────────── */
        @keyframes ls-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }

        /* ── Progress slide ────────────────────────────────────── */
        @keyframes ls-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
