'use client';

interface ProgressRailProps {
  /** 0–1 scroll progress through the mechanism section */
  progress: number;
}

/** A hairline horizontal bar at the top of the sticky viewport that fills
 *  left-to-right as the user scrubs through the 5 pipeline stages. Using
 *  `scaleX` + `transform-origin: left` is GPU-composited — no layout reflow. */
export function ProgressRail({ progress }: ProgressRailProps) {
  return (
    <div aria-hidden className="pointer-events-none h-px w-full overflow-hidden bg-line">
      <div
        className="h-full w-full origin-left bg-data transition-transform duration-100"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
