/** Placeholder shown while a 3D canvas chunk loads — a faint pulsing vault on a
 *  soft glow, so the slot reads as "the vault is arriving", not a cheap black
 *  square. Keeps the canvas footprint so nothing shifts when the scene mounts. */
export function CanvasLoader() {
  return (
    <div
      aria-hidden
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(63,233,224,0.10),transparent_62%)]"
    >
      <span
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[4px] bg-data/20 motion-safe:animate-pulse"
        style={{ boxShadow: '0 0 44px rgba(63,233,224,0.3)' }}
      />
    </div>
  );
}
