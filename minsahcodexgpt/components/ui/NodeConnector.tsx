'use client';

import React, { useId, useState, useEffect, useRef } from 'react';

export interface NodeTarget {
  id: string | number;
  yOffset: number; // Vertical offset relative to the button port (negative = up, positive = down)
  isActive?: boolean;
  label?: string;
}

export interface NodeConnectorProps {
  /** Array of target nodes/variants to connect from the popover */
  targets: NodeTarget[];
  /** Width of the gap between popover and product card (default: 32px) */
  gapWidth?: number;
  /** Brand color for the connector lines and sockets (default: #1c3a13) */
  color?: string;
  /**
   * Direction of the connection relative to the popover:
   * - 'popover-left': Popover is on the left, button is on the right.
   *   (Sockets on left edge of gap, arrow at right edge pointing into button)
   * - 'popover-right': Popover is on the right, button is on the left.
   *   (Sockets on right edge of gap, arrow at left edge pointing into button)
   */
  direction?: 'popover-left' | 'popover-right';
  /** Stroke width of the active/selected line (default: 1.5px solid) */
  activeStrokeWidth?: number;
  /** Stroke width of non-active lines (default: 0.75px) */
  strokeWidth?: number;
  className?: string;
}

/**
 * NodeConnector — Reusable SVG workflow connector component.
 * High-performance "Alive Brain" n8n-style dynamic workflow connector with:
 * 1. Flowing animated electric pulse dashes streaming along the cubic bezier S-curve.
 * 2. Glowing breathing neural socket ring with live ripple keyframes.
 * 3. Fiber-optic neon gradient core (#1c3a13 -> #10b981 -> #D4F6A2).
 * 4. Active port synapse spark where the wire docks into the selector button.
 * 5. Smooth 60fps dynamic S-curve glide between hovered/selected variant sockets.
 */
export default function NodeConnector({
  targets = [],
  gapWidth = 32,
  color = '#1c3a13',
  direction = 'popover-right',
  activeStrokeWidth = 1.5,
  strokeWidth = 0.75,
  className = '',
}: NodeConnectorProps) {
  const rawId = useId();
  const safeId = rawId.replace(/[:]/g, '');

  const isPopoverOnLeft = direction === 'popover-left';

  // Popover edge X (where sockets are placed)
  const popoverX = isPopoverOnLeft ? 0 : gapWidth;
  // Button edge X (where arrow is docked and points into button)
  const buttonX = isPopoverOnLeft ? gapWidth : 0;

  // Arrow dimensions
  const arrowLength = 5.5;
  const arrowWidth = 6.5;

  // The wire ends at the back of the arrow head
  const wireEndX = isPopoverOnLeft ? buttonX - (arrowLength - 0.5) : buttonX + (arrowLength - 0.5);
  const wireEndY = 0; // Aligned with the center of the selector button

  const activeTarget = targets.find((t) => t.isActive) || targets[0];
  const targetY = activeTarget?.yOffset ?? 0;

  // Fluid 60fps dynamic glide animation when hovering between options
  const [currentY, setCurrentY] = useState(targetY);
  const currentYRef = useRef(targetY);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    currentYRef.current = currentY;
  }, [currentY]);

  useEffect(() => {
    if (Math.abs(currentYRef.current - targetY) < 0.5) {
      setCurrentY(targetY);
      return;
    }

    const startY = currentYRef.current;
    const startTime = performance.now();
    const duration = 210; // 210ms smooth glide

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Fluid cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextY = startY + (targetY - startY) * ease;
      setCurrentY(nextY);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetY]);

  if (!targets || targets.length === 0) {
    return null;
  }

  const gradientId = `n8nPulseGrad-${safeId}`;
  const filterId = `n8nGlowFilter-${safeId}`;

  return (
    <div
      className={`relative pointer-events-none select-none ${className}`}
      style={{ width: `${gapWidth}px`, height: '1px' }}
      aria-hidden="true"
    >
      <svg
        className="overflow-visible absolute top-0 left-0"
        style={{ width: `${gapWidth}px`, height: '1px' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 1. Alive Pulse Gradient: flows from active socket towards selector button */}
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={popoverX}
            y1={currentY}
            x2={wireEndX}
            y2={wireEndY}
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#D4F6A2" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* 2. Soft Neon Socket Glow Filter */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.75" />
          </filter>

          {/* 3. Embedded 60fps CSS Keyframe Animations (Hardware-accelerated) */}
          <style>{`
            @keyframes n8nPulseStream_${safeId} {
              0% {
                stroke-dashoffset: ${isPopoverOnLeft ? 24 : -24};
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            @keyframes socketRipple_${safeId} {
              0% {
                r: 3.5px;
                opacity: 0.9;
                stroke-width: 1.5px;
              }
              60% {
                r: 7px;
                opacity: 0;
                stroke-width: 0.5px;
              }
              100% {
                r: 3.5px;
                opacity: 0;
                stroke-width: 0.5px;
              }
            }
            .n8n-pulse-wire-${safeId} {
              animation: n8nPulseStream_${safeId} 0.95s linear infinite;
            }
            .n8n-ripple-ring-${safeId} {
              animation: socketRipple_${safeId} 1.6s cubic-bezier(0.2, 0, 0.4, 1) infinite;
              transform-box: fill-box;
              transform-origin: center;
            }
          `}</style>
        </defs>

        {/* 1. Inactive Branches (Subtle converging guide lines) */}
        {targets.map((target) => {
          const isItemActive = target.id === activeTarget?.id;
          const startX = popoverX;
          const startY = target.yOffset;
          const endX = wireEndX;
          const endY = wireEndY;
          const dx = Math.abs(endX - startX);

          // S-Curve Control Points
          const cp1X = isPopoverOnLeft ? startX + dx * 0.45 : startX - dx * 0.45;
          const cp1Y = startY;
          const cp2X = isPopoverOnLeft ? endX - dx * 0.55 : endX + dx * 0.55;
          const cp2Y = endY;

          const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

          return (
            <path
              key={`inactive-line-${target.id}`}
              d={pathData}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={isItemActive ? 0 : 0.15}
              strokeLinecap="round"
              fill="none"
              style={{ transition: 'stroke-opacity 200ms ease' }}
            />
          );
        })}

        {/* 2. Active Branch: Multi-layered "Alive Brain" Workflow Connection */}
        {activeTarget && (() => {
          const startX = popoverX;
          const startY = currentY;
          const endX = wireEndX;
          const endY = wireEndY;
          const dx = Math.abs(endX - startX);

          const cp1X = isPopoverOnLeft ? startX + dx * 0.45 : startX - dx * 0.45;
          const cp1Y = startY;
          const cp2X = isPopoverOnLeft ? endX - dx * 0.55 : endX + dx * 0.55;
          const cp2Y = endY;

          const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

          return (
            <g key="active-connector-flow">
              {/* Layer A: Base Solid Dark Forest Backbone Line */}
              <path
                d={pathData}
                stroke={color}
                strokeWidth={activeStrokeWidth + 0.25}
                strokeOpacity={0.95}
                strokeLinecap="round"
                fill="none"
              />

              {/* Layer B: Electric Energy Pulse Dashes (Active Data Stream) */}
              <path
                d={pathData}
                stroke={`url(#${gradientId})`}
                strokeWidth={activeStrokeWidth + 0.5}
                strokeDasharray="4 8"
                strokeLinecap="round"
                className={`n8n-pulse-wire-${safeId}`}
                fill="none"
              />

              {/* Layer C: Fiber-Optic Inner Core Beam */}
              <path
                d={pathData}
                stroke="#D4F6A2"
                strokeWidth={0.65}
                strokeOpacity={0.7}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          );
        })()}

        {/* 3. Arrow pointing INTO the selector button */}
        {isPopoverOnLeft ? (
          // Popover on left: Arrow points RIGHT (►) into button at buttonX
          <g>
            <polygon
              points={`${buttonX} 0, ${buttonX - arrowLength} -${arrowWidth / 2}, ${buttonX - arrowLength} ${arrowWidth / 2}`}
              fill={color}
            />
            {/* Live Synapse Contact Dot on Arrow Point */}
            <circle cx={buttonX} cy={0} r={1.5} fill="#D4F6A2" />
          </g>
        ) : (
          // Popover on right: Arrow points LEFT (◄) into button at buttonX (0)
          <g>
            <polygon
              points={`0 0, ${arrowLength} -${arrowWidth / 2}, ${arrowLength} ${arrowWidth / 2}`}
              fill={color}
            />
            {/* Live Synapse Contact Dot on Arrow Point */}
            <circle cx={0} cy={0} r={1.5} fill="#D4F6A2" />
          </g>
        )}

        {/* 4. Socket Dots on the Popover Options */}
        {targets.map((target) => {
          const isSelected = target.id === activeTarget?.id;
          const cx = popoverX;
          const cy = target.yOffset;

          return (
            <g key={`socket-${target.id}`}>
              {/* Active Neural Breathing Ripple Ring */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  stroke="#10b981"
                  strokeWidth={1}
                  fill="none"
                  className={`n8n-ripple-ring-${safeId}`}
                />
              )}

              {/* Outer Socket Ring */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 4 : 2.5}
                fill={isSelected ? color : '#ffffff'}
                stroke={isSelected ? '#10b981' : color}
                strokeWidth={isSelected ? 1.75 : 1}
                strokeOpacity={isSelected ? 1 : 0.4}
                filter={isSelected ? `url(#${filterId})` : undefined}
                style={{ transition: 'all 200ms ease-out' }}
              />

              {/* Luminous Core Dot for Active Socket */}
              {isSelected && (
                <circle cx={cx} cy={cy} r={1.6} fill="#D4F6A2" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
