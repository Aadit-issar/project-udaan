import { useEffect, useRef, useState } from 'react';
import type { SceneAction, SceneData, UdaanScene, XRMode } from '../xr/scene';
import { Icon } from './Icon';

interface Props {
  kind: 'room' | 'world';
  data: SceneData;
  lowPerf: boolean;
  reducedMotion: boolean;
  onAction: (a: SceneAction) => void;
  onInspect?: (label: string) => void;
  label: string;
}

/**
 * Lazy-loads Three.js only when a 3D view is opened, and exposes real WebXR
 * entry buttons only when `isSessionSupported` says the device can do it.
 */
export function Stage3D({ kind, data, lowPerf, reducedMotion, onAction, onInspect, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<UdaanScene | null>(null);
  const actionRef = useRef(onAction);
  const inspectRef = useRef(onInspect);
  actionRef.current = onAction;
  inspectRef.current = onInspect;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [xr, setXr] = useState<{ vr: boolean; ar: boolean; note: string } | null>(null);
  const [mode, setMode] = useState<XRMode>('none');
  const [xrError, setXrError] = useState('');

  useEffect(() => {
    let disposed = false;
    import('../xr/scene')
      .then(({ createUdaanScene, detectXR }) => {
        if (disposed || !box.current) return;
        try {
          scene.current = createUdaanScene(box.current, {
            kind,
            lowPerf,
            reducedMotion,
            onAction: (a) => actionRef.current(a),
            onInspect: (l) => inspectRef.current?.(l),
            onXRChange: setMode,
            onContextLost: () => setStatus('error'),
          });
          setStatus('ready');
        } catch {
          setStatus('error');
        }
        detectXR().then((r) => !disposed && setXr(r));
      })
      .catch(() => setStatus('error'));
    return () => {
      disposed = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [kind, lowPerf, reducedMotion]);

  useEffect(() => {
    scene.current?.update(data);
  });

  const enter = (which: 'vr' | 'ar') => {
    setXrError('');
    const s = scene.current;
    if (!s) return;
    (which === 'vr' ? s.enterVR() : s.enterAR()).catch((e: Error) => setXrError(e?.message || 'The headset session could not start.'));
  };

  return (
    <div className="stage" ref={box} aria-label={label}>
      {status === 'loading' && <div className="loading">Building your {kind === 'room' ? 'focus room' : 'Skyworld'}…</div>}
      {status === 'error' && (
        <div className="loading" role="alert" style={{ padding: 24, textAlign: 'center' }}>
          3D isn’t available on this device right now. Everything still works in the 2D view.
        </div>
      )}
      {status === 'ready' && (
        <div className="hud">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {xr?.vr && mode === 'none' && (
              <button className="btn btn-primary btn-sm" onClick={() => enter('vr')}><Icon name="vr" /> Enter VR</button>
            )}
            {xr?.ar && mode === 'none' && kind === 'room' && (
              <button className="btn btn-light btn-sm" onClick={() => enter('ar')}><Icon name="cube" /> Place board in AR</button>
            )}
            {mode !== 'none' && <span className="chip chip-amber">{mode === 'vr' ? 'Immersive VR session active' : 'AR session active'}</span>}
          </div>
          {xr && !xr.vr && !xr.ar && <p className="xr-note">{xr.note}</p>}
          {xrError && <p className="xr-note" role="alert">{xrError}</p>}
        </div>
      )}
      {status === 'ready' && (
        <p className="hint">{kind === 'room' ? 'Drag to look around · click the boards or the lamp' : 'Drag to orbit · scroll to zoom · click an unlock'}</p>
      )}
    </div>
  );
}
