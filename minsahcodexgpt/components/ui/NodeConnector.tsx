'use client';

import React from 'react';

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
  /** Stroke width of the active/selected line (default: 1.25px solid) */
  activeStrokeWidth?: number;
  /** Stroke width of non-active lines (default: 0.75px) */
  strokeWidth?: number;
  className?: string;
}

/**
 * NodeConnector — Reusable SVG workflow connector component.
 * Connects variant sockets on the popover to the product card's selector button
 * using smooth Cubic Bezier S-curves (n8n workflow style).
 */
export default function NodeConnector({
  targets = [],
  gapWidth = 32,
  color = '#1c3a13',
  direction = 'popover-left',
  activeStrokeWidth = 1.25,
  strokeWidth = 0.75,
  className = '',
}: NodeConnectorProps) {
  if (!targets || targets.length === 0) {
    return null;
  }

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
        {/* 1. Inactive Branches (subtle converging lines from other variants) */}
        {targets
          .filter((t) => !t.isActive)
          .map((target) => {
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
                strokeOpacity={0.25}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}

        {/* 2. Active Branch (1px solid brand dark green #1c3a13) */}
        {activeTarget && (() => {
          const startX = popoverX;
          const startY = activeTarget.yOffset;
          const endX = wireEndX;
          const endY = wireEndY;
          const dx = Math.abs(endX - startX);

          const cp1X = isPopoverOnLeft ? startX + dx * 0.45 : startX - dx * 0.45;
          const cp1Y = startY;
          const cp2X = isPopoverOnLeft ? endX - dx * 0.55 : endX + dx * 0.55;
          const cp2Y = endY;

          const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

          return (
            <path
              key={`active-line-${activeTarget.id}`}
              d={pathData}
              stroke={color}
              strokeWidth={activeStrokeWidth}
              strokeOpacity={1}
              strokeLinecap="round"
              fill="none"
            />
          );
        })()}

        {/* 3. Arrow pointing INTO the selector button */}
        {isPopoverOnLeft ? (
          // Popover on left: Arrow points RIGHT (►) into button at buttonX
          <polygon
            points={`${buttonX} 0, ${buttonX - arrowLength} -${arrowWidth / 2}, ${buttonX - arrowLength} ${arrowWidth / 2}`}
            fill={color}
          />
        ) : (
          // Popover on right: Arrow points LEFT (◄) into button at buttonX (0)
          <polygon
            points={`0 0, ${arrowLength} -${arrowWidth / 2}, ${arrowLength} ${arrowWidth / 2}`}
            fill={color}
          />
        )}

        {/* 4. Socket Dots on the Popover Options */}
        {targets.map((target) => {
          const isSelected = target.isActive;
          const cx = popoverX;
          const cy = target.yOffset;

          return (
            <g key={`socket-${target.id}`}>
              {/* Outer circle */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 3.5 : 2.5}
                fill={isSelected ? color : '#ffffff'}
                stroke={color}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeOpacity={isSelected ? 1 : 0.5}
              />
              {/* Inner core dot for active socket */}
              {isSelected && <circle cx={cx} cy={cy} r={1.25} fill="#ffffff" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
