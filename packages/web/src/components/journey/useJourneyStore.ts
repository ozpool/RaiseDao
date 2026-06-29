import { create } from 'zustand';

/** Scroll progress (0..1 across the pinned journey) lives here, not in React
 *  state, so the 3D scene can read it 60×/sec without re-rendering React. The
 *  ScrollTrigger writes it; the gem reads it imperatively inside useFrame via
 *  `useJourneyStore.getState().progress` (the zustand "transient update" pattern). */
interface JourneyState {
  progress: number;
  setProgress: (p: number) => void;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
}));
