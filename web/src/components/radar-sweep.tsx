"use client";

import React from "react";

const BLIPS = [
  { angle: 45, distance: 0.55, size: 6, delay: 0, label: "Acme" },
  { angle: 130, distance: 0.7, size: 5, delay: 0.4, label: "Nova" },
  { angle: 210, distance: 0.4, size: 7, delay: 0.8, label: "Pulse" },
  { angle: 310, distance: 0.62, size: 4, delay: 1.2, label: "Flux" },
  { angle: 175, distance: 0.82, size: 4, delay: 1.6, label: "Core" },
];

function Blip({
  angle,
  distance,
  size,
  delay,
  label,
}: {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  label: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = 50 + Math.cos(rad) * distance * 50;
  const y = 50 + Math.sin(rad) * distance * 50;

  return (
    <g>
      <circle
        cx={`${x}%`}
        cy={`${y}%`}
        r={size}
        fill="var(--brand)"
        opacity="0"
      >
        <animate
          attributeName="opacity"
          values="0;0;1;1;0"
          dur="4s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values={`${size};${size + 3};${size}`}
          dur="4s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>
      <text
        x={`${x}%`}
        y={`${y - 1.8}%`}
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize="8"
        fontFamily="var(--font-geist-mono), monospace"
        opacity="0"
      >
        {label}
        <animate
          attributeName="opacity"
          values="0;0;0.7;0.7;0"
          dur="4s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </text>
    </g>
  );
}

export function RadarSweep() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 400 400"
        className="h-full w-full max-h-[500px] max-w-[500px]"
        style={{ filter: "drop-shadow(0 0 40px rgba(124, 58, 237, 0.15))" }}
      >
        {/* Concentric rings */}
        {[0.25, 0.5, 0.75, 1.0].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r * 180}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Cross lines */}
        <line x1="200" y1="20" x2="200" y2="380" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
        <line x1="20" y1="200" x2="380" y2="200" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
        <line x1="73" y1="73" x2="327" y2="327" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" />
        <line x1="327" y1="73" x2="73" y2="327" stroke="var(--border)" strokeWidth="0.5" opacity="0.15" />

        {/* Sweep arc */}
        <defs>
          <linearGradient id="sweepGrad" gradientUnits="userSpaceOnUse" x1="200" y1="200" x2="200" y2="20">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.6" />
          </linearGradient>
          <clipPath id="sweepClip">
            <rect x="0" y="0" width="400" height="400" />
          </clipPath>
        </defs>

        {/* Sweep line + trail */}
        <g clipPath="url(#sweepClip)">
          <line
            x1="200"
            y1="200"
            x2="200"
            y2="20"
            stroke="var(--brand)"
            strokeWidth="2"
            opacity="0.9"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 200 200"
              to="360 200 200"
              dur="4s"
              repeatCount="indefinite"
            />
          </line>

          {/* Sweep trail (pie wedge) */}
          <path
            d="M200,200 L200,20 A180,180 0 0,1 340,80 Z"
            fill="url(#sweepGrad)"
            opacity="0.3"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 200 200"
              to="360 200 200"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* Center dot */}
        <circle cx="200" cy="200" r="4" fill="var(--brand)">
          <animate
            attributeName="r"
            values="3;5;3"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.6;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Pulsing ring from center */}
        <circle cx="200" cy="200" r="10" fill="none" stroke="var(--brand)" strokeWidth="1">
          <animate
            attributeName="r"
            values="10;180"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-width"
            values="1.5;0.2"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Blips (competitor detections) */}
        <g>
          {BLIPS.map((blip) => (
            <Blip key={blip.label} {...blip} />
          ))}
        </g>

        {/* Labels at edges */}
        <text x="200" y="14" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="var(--font-geist-mono), monospace" opacity="0.5">
          N
        </text>
        <text x="200" y="396" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="var(--font-geist-mono), monospace" opacity="0.5">
          S
        </text>
        <text x="6" y="203" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="var(--font-geist-mono), monospace" opacity="0.5">
          W
        </text>
        <text x="394" y="203" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="var(--font-geist-mono), monospace" opacity="0.5">
          E
        </text>
      </svg>

      {/* Overlay status */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-[var(--border)] bg-[var(--background)]/80 px-3 py-2 backdrop-blur-sm">
        <p className="font-mono text-[0.625rem] text-[var(--text-secondary)]">
          <span className="text-[var(--brand)]">&#9679;</span> Live scanning
        </p>
        <p className="mt-0.5 font-mono text-[0.5625rem] text-[var(--text-secondary)] opacity-60">
          5 targets tracked
        </p>
      </div>
    </div>
  );
}
