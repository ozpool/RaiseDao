'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Segmented } from './Segmented';
import { Slider } from './Slider';
import { Readouts } from './Readouts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFps } from '@/hooks/useFps';
import type { VaultLod, VaultState } from '@/components/vault';

// 3D never runs during SSR (avoids a hydration mismatch); it loads after paint.
const VaultCanvas = dynamic(
  () => import('@/components/vault/VaultCanvas').then((m) => m.VaultCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-void" aria-hidden />,
  },
);

const STATES: { value: VaultState; label: string }[] = [
  { value: 'loading', label: 'loading' },
  { value: 'live', label: 'live' },
  { value: 'unlocking', label: 'unlocking' },
];
const LODS: { value: VaultLod; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'card', label: 'card' },
];

const GROUP = 'px-6 py-6 lg:px-8';

/** The optical-bench showcase for the Vault: a square specimen stage and a docked
 *  instrument rail to drive every prop in real time (design direction). */
export function VaultBench() {
  const [fill, setFill] = useState(0.42);
  const [state, setState] = useState<VaultState>('live');
  const [lod, setLod] = useState<VaultLod>('full');
  const [seamPulse, setSeamPulse] = useState(0);
  const [simReduce, setSimReduce] = useState(false);

  const osReduce = useReducedMotion();
  const reduced = osReduce || simReduce;
  const fps = useFps();
  const mock = true; // /lab data is always mocked — never a plausible live value

  const triggerPulse = (): void => {
    // flushSync commits the rising edge synchronously so a frame can't be starved
    // past the reset; the reset re-arms the next press.
    flushSync(() => setSeamPulse(1));
    window.setTimeout(() => setSeamPulse(0), 120);
  };

  return (
    <div className="min-h-screen bg-void p-4 lg:p-8">
      <div className="flex min-h-[calc(100dvh-2rem)] flex-col border border-line lg:min-h-[calc(100dvh-4rem)] lg:flex-row">
        <section className="flex flex-1 flex-col justify-center p-4 lg:p-8">
          <p className="mb-3 font-mono text-caption uppercase tracking-widest text-mist">
            VAULT // LAB BENCH
          </p>
          <div className="relative mx-auto aspect-square w-full max-w-[68vh] border border-line">
            {mock && (
              <span className="absolute left-3 top-3 z-10 border border-dashed border-mist px-2 py-0.5 font-mono text-caption uppercase tracking-wide text-mist">
                Mock
              </span>
            )}
            <VaultCanvas
              fillLevel={fill}
              state={state}
              lod={lod}
              seamPulse={seamPulse}
              mock={mock}
              reducedMotion={reduced}
            />
          </div>
          <Readouts fill={fill} state={state} fps={fps} mock={mock} />
        </section>

        <aside className="w-full shrink-0 divide-y divide-line border-t border-line lg:w-[360px] lg:border-l lg:border-t-0">
          <div className={GROUP}>
            <Segmented label="State" options={STATES} value={state} onChange={setState} />
          </div>
          <div className={GROUP}>
            <Slider label="Fill level" value={fill} onChange={setFill} />
          </div>
          <div className={GROUP}>
            <Segmented label="LOD" options={LODS} value={lod} onChange={setLod} />
          </div>
          <div className={`${GROUP} space-y-4`}>
            <button
              type="button"
              onClick={triggerPulse}
              disabled={state === 'loading'}
              className="w-full border border-signal bg-panel py-3 font-sans text-small text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-void enabled:hover:bg-line disabled:border-line disabled:text-mist"
            >
              Trigger seam pulse
            </button>
            <label className="flex cursor-pointer items-center justify-between">
              <span className="font-sans text-small text-paper">Simulate reduced motion</span>
              <input
                type="checkbox"
                checked={simReduce}
                onChange={(event) => setSimReduce(event.target.checked)}
                className="h-4 w-4 accent-paper"
              />
            </label>
            {reduced && (
              <p className="font-mono text-caption text-mist">
                motion: frozen{osReduce ? ' (OS preference)' : ''}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
