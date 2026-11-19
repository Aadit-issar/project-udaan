import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSkyWorld, makeClouds, makeSky, PALETTE, type SkyWorld } from './island';
import { Panel, type SceneAction } from './panel';

export type { SceneAction };
export type XRMode = 'none' | 'vr' | 'ar';

export interface SceneData {
  taskTitle: string;
  step: string;
  remaining: string;
  pct: number;
  state: 'idle' | 'running' | 'paused';
  focusMin: number;
  tasks: { id: string; title: string; done: boolean; due: string }[];
  level: number;
  levelName: string;
  xp: number;
  levelPct: number;
  nextName: string | null;
}

export interface SceneOptions {
  kind: 'room' | 'world';
  lowPerf: boolean;
  reducedMotion: boolean;
  onAction: (a: SceneAction) => void;
  onXRChange?: (m: XRMode) => void;
  onInspect?: (label: string) => void;
  onContextLost?: () => void;
}

export interface UdaanScene {
  update: (d: SceneData) => void;
  enterVR: () => Promise<void>;
  enterAR: () => Promise<void>;
  dispose: () => void;
}

const WORLD_VIEWS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [0, 0, 1.9], yaw: 0 },
  { pos: [2.2, 0, 0.4], yaw: 0.9 },
  { pos: [-6, 2.2, 7], yaw: -0.75 },
];

/**
 * Creates the UDAAN 3D scene (Focus Room or Progress World) inside `container`.
 * Desktop/mobile: orbit camera + click/tap on spatial panels.
 * WebXR: real immersive-vr / immersive-ar sessions requested only from a user gesture.
 */
export function createUdaanScene(container: HTMLElement, opts: SceneOptions): UdaanScene {
  const { kind, lowPerf, reducedMotion } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPerf, alpha: true, powerPreference: lowPerf ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPerf ? 1 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lowPerf;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', kind === 'room' ? '3D Virtual Focus Room' : '3D Progress World');
  renderer.domElement.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(kind === 'room' ? 58 : 45, 1, 0.05, 220);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // ─── Environment ───
  const sky = makeSky();
  scene.add(sky);
  const clouds = makeClouds(lowPerf ? 26 : 72);
  scene.add(clouds);

  const hemi = new THREE.HemisphereLight(0xc6d4ff, 0xf3a76b, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a8, 2.2);
  sun.position.set(-6, 9, 5);
  sun.castShadow = !lowPerf;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xff9a5a, 1.1);
  rim.position.set(-3, 1.5, -12);
  scene.add(rim);

  let world: SkyWorld | null = null;
  let worldLevel = -1;
  const worldHolder = new THREE.Group();
  scene.add(worldHolder);
  if (kind === 'world') worldHolder.position.set(0, 0, 0);

  // ─── Focus Room: desk, lamp, books, spatial panels ───
  const desk = new THREE.Group();
  const board = new THREE.Group();
  const timerPanel = new Panel(1024, 640, 0.92);
  const boardPanel = new Panel(1024, 640, 0.92);
  const infoPanel = new Panel(1024, 520, 0.8);
  let lampLight: THREE.PointLight | null = null;
  let lampBulb: THREE.Mesh | null = null;
  let lampOn = true;

  if (kind === 'room') {
    const m = (c: number, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.7), m(PALETTE.wood, 0.55));
    top.position.y = 0.74;
    top.castShadow = top.receiveShadow = true;
    desk.add(top);
    [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.72, 8), m(PALETTE.ink));
      leg.position.set(x, 0.36, z);
      desk.add(leg);
    });
    // Lamp (clickable: toggles the warm light).
    const lamp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 16), m(PALETTE.ink));
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.38, 8), m(PALETTE.ink));
    arm1.position.set(0, 0.19, 0);
    arm1.rotation.z = -0.25;
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), m(PALETTE.ink));
    arm2.position.set(0.12, 0.42, 0);
    arm2.rotation.z = 1.05;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 16, 1, true), new THREE.MeshStandardMaterial({ color: PALETTE.amber, side: THREE.DoubleSide, roughness: 0.5 }));
    shade.position.set(0.25, 0.47, 0);
    shade.rotation.z = 0.7;
    lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffb466, emissiveIntensity: 3 }));
    lampBulb.position.set(0.27, 0.43, 0);
    lamp.add(base, arm1, arm2, shade, lampBulb);
    lamp.position.set(-0.66, 0.765, 0.02);
    lamp.scale.setScalar(0.78);
    lamp.traverse((o) => (o.userData.action = 'lamp'));
    desk.add(lamp);
    if (!lowPerf) {
      lampLight = new THREE.PointLight(0xffb36b, 2.4, 2.4, 1.6);
      lampLight.position.set(-0.45, 1.06, 0.02);
      desk.add(lampLight);
    }
    // Books + mug: small, warm details.
    [[0xec6a4f, 0.06], [0x8fb4dc, 0.05], [0xf6f1e7, 0.045]].forEach(([c, h], i) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.26 - i * 0.02, h as number, 0.19), m(c as number));
      b.position.set(0.5, 0.765 + 0.03 + i * 0.055, 0.05);
      b.rotation.y = i * 0.15 - 0.1;
      b.castShadow = true;
      desk.add(b);
    });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), m(PALETTE.paper, 0.4));
    mug.position.set(0.2, 0.815, 0.12);
    desk.add(mug);
    const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.22), m(0xfffaf0, 0.9));
    notebook.position.set(-0.08, 0.772, 0.1);
    notebook.rotation.y = 0.12;
    desk.add(notebook);
    desk.position.set(0, 0, -0.75);
    scene.add(desk);

    timerPanel.group.position.set(0.5, 1.4, -1.2);
    timerPanel.group.rotation.y = -0.3;
    boardPanel.group.position.set(-0.5, 1.4, -1.2);
    boardPanel.group.rotation.y = 0.3;
    board.add(timerPanel.group, boardPanel.group);
    scene.add(board);
  } else {
    // Progress World: an info panel that only appears in VR, attached to the rig.
    infoPanel.group.position.set(0, 1.05, -1.0);
    infoPanel.group.rotation.x = -0.35;
    infoPanel.group.visible = false;
    rig.add(infoPanel.group);
  }
  const panels = kind === 'room' ? [timerPanel, boardPanel] : [infoPanel];

  // ─── Camera / controls ───
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reducedMotion;
  controls.enablePan = false;
  if (kind === 'room') {
    camera.position.set(0, 1.5, 0.42);
    controls.target.set(0, 1.27, -1.0);
    controls.minDistance = 0.6;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI * 0.62;
  } else {
    camera.position.set(8, 4.6, 9);
    controls.target.set(0.6, 0.2, -1.2);
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.58;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.35;
  }
  controls.update();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    if (renderer.xr.isPresenting) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens: widen the vertical FOV so both room panels stay in view.
    camera.fov = (kind === "room" ? 58 : 45) * (w / h < 1 ? 1.45 : 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ─── Data → panels ───
  let data: SceneData | null = null;
  let xrMode: XRMode = 'none';

  const paint = () => {
    if (!data) return;
    const d = data;
    const inXR = xrMode !== 'none';
    if (kind === 'room') {
      timerPanel.draw(JSON.stringify([d.taskTitle, d.step, d.remaining, Math.round(d.pct * 200), d.state, d.focusMin, inXR, timerPanel.hover]), (p) => {
        p.bg();
        p.eyebrow('Focus Room', 56, 78);
        p.text(d.state === 'running' ? '● In session' : d.state === 'paused' ? 'Paused' : 'Ready', 968, 78, 24, { align: 'right', color: d.state === 'running' ? '#7fe0c9' : '#c7cde8', weight: 650 });
        p.text(d.taskTitle, 56, 150, 46, { display: true, weight: 560, max: 912 });
        if (d.step) p.text(`Step: ${d.step}`, 56, 198, 28, { color: '#c7cde8', max: 912 });
        p.text(d.remaining, 50, 360, 150, { display: true, weight: 420 });
        p.bar(56, 398, 912, 14, d.pct);
        const y = 452;
        if (d.state === 'idle') {
          p.button('Just 2 min', 56, y, 280, 84, { type: 'start', min: 2 });
          p.button(`Focus ${d.focusMin} min`, 356, y, 320, 84, { type: 'start', min: d.focusMin }, 'light');
        } else if (d.state === 'running') {
          p.button('Pause', 56, y, 240, 84, { type: 'pause' }, 'light');
          p.button('Finish', 316, y, 240, 84, { type: 'finish' });
        } else {
          p.button('Resume', 56, y, 240, 84, { type: 'resume' });
          p.button('Finish', 316, y, 240, 84, { type: 'finish' }, 'light');
        }
        if (inXR) p.button(xrMode === 'ar' ? 'Exit AR' : 'Exit VR', 748, y, 220, 84, { type: 'exit' }, 'ghost');
        p.text(inXR ? 'Point and pull the trigger (or pinch) to select' : 'Click the buttons on this board', 56, 600, 24, { color: '#8a92b6' });
      });
      boardPanel.draw(JSON.stringify([d.tasks, d.level, d.xp, Math.round(d.levelPct * 100), boardPanel.hover]), (p) => {
        p.bg();
        p.eyebrow("Today's priorities", 56, 78);
        if (!d.tasks.length) p.text('No open tasks — add one in the planner.', 56, 160, 32, { color: '#c7cde8' });
        d.tasks.slice(0, 4).forEach((t, i) => {
          const y = 116 + i * 92;
          p.checkbox(56, y, t.done, { type: 'toggle', id: t.id });
          p.text(t.title, 124, y + 30, 34, { weight: 600, max: 840, color: t.done ? '#8a92b6' : '#ffffff' });
          p.text(t.done ? 'Done' : t.due, 124, y + 62, 22, { color: t.done ? '#7fe0c9' : '#f7c995', weight: 600 });
        });
        p.text(`Skyworld · Level ${d.level} · ${d.levelName}`, 56, 530, 28, { display: true, weight: 560 });
        p.text(`${d.xp} XP`, 968, 530, 26, { align: 'right', color: '#f7c995', weight: 700 });
        p.bar(56, 556, 912, 14, d.levelPct, ['#2bb39b', '#7fe0c9']);
        p.text(d.nextName ? `Next unlock: ${d.nextName}` : 'Every island unlocked', 56, 606, 22, { color: '#8a92b6' });
      });
    } else {
      infoPanel.draw(JSON.stringify([d.level, d.xp, Math.round(d.levelPct * 100), xrMode, infoPanel.hover]), (p) => {
        p.bg();
        p.eyebrow('Your Skyworld', 56, 78);
        p.text(`Level ${d.level} · ${d.levelName}`, 56, 160, 60, { display: true, weight: 560, max: 912 });
        p.text(`${d.xp} XP earned from real tasks and focus sessions`, 56, 214, 28, { color: '#c7cde8', max: 912 });
        p.bar(56, 248, 912, 14, d.levelPct, ['#2bb39b', '#7fe0c9']);
        p.text(d.nextName ? `Next unlock: ${d.nextName}` : 'Every island unlocked', 56, 300, 26, { color: '#f7c995', weight: 600 });
        p.button('Next viewpoint', 56, 370, 340, 84, { type: 'view' });
        p.button('Exit VR', 416, 370, 220, 84, { type: 'exit' }, 'light');
      });
    }
  };

  const setLevel = (lv: number) => {
    if (lv === worldLevel) return;
    worldLevel = lv;
    if (world) {
      worldHolder.remove(world.group);
      world.group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    }
    world = buildSkyWorld(lv, { lowPerf });
    world.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = !lowPerf;
    });
    worldHolder.add(world.group);
  };

  // ─── Interaction (mouse/touch + XR controllers share one path) ───
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Matrix4();

  const handleHit = (hits: THREE.Intersection[]): boolean => {
    for (const h of hits) {
      const panel = h.object.userData.panel as Panel | undefined;
      if (panel && h.uv) {
        const a = panel.hit(h.uv);
        if (a) { runAction(a); return true; }
        return false;
      }
      if (h.object.userData.action === 'lamp') {
        lampOn = !lampOn;
        if (lampLight) lampLight.visible = lampOn;
        if (lampBulb) (lampBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = lampOn ? 3 : 0.1;
        return true;
      }
      if (kind === 'world' && world) {
        const lbl = world.labels.find((l) => l.object === h.object || isChild(h.object, l.object));
        if (lbl) { opts.onInspect?.(lbl.label); return true; }
      }
    }
    return false;
  };

  const interactive = () => [...panels.filter((p) => p.group.visible && (p.group.parent?.visible ?? true)).map((p) => p.mesh), desk, ...(world ? [world.group] : [])];

  let viewIdx = 0;
  const runAction = (a: SceneAction) => {
    if (a.type === 'exit') { renderer.xr.getSession()?.end(); return; }
    if (a.type === 'view') {
      viewIdx = (viewIdx + 1) % WORLD_VIEWS.length;
      applyView();
      return;
    }
    opts.onAction(a);
  };

  const applyView = () => {
    const v = WORLD_VIEWS[viewIdx];
    rig.position.set(...v.pos);
    rig.rotation.y = v.yaw;
  };

  let downAt: { x: number; y: number } | null = null;
  const toNdc = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    toNdc(e);
    raycaster.setFromCamera(ndc, camera);
    handleHit(raycaster.intersectObjects(interactive(), true));
  };
  const onMove = (e: PointerEvent) => {
    if (e.buttons) return;
    toNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(interactive(), true);
    const h = hits[0];
    const panel = h?.object.userData.panel as Panel | undefined;
    const action = panel && h.uv ? panel.hit(h.uv) : null;
    const clickable = !!action || h?.object.userData.action === 'lamp' || (kind === 'world' && !!h);
    renderer.domElement.style.cursor = clickable ? 'pointer' : 'grab';
    setHover(panel ?? null, action);
  };
  const setHover = (panel: Panel | null, action: SceneAction | null) => {
    for (const p of panels) {
      const next = p === panel ? action : null;
      if (JSON.stringify(next) !== JSON.stringify(p.hover)) {
        p.hover = next;
        p.invalidate();
      }
    }
    paint();
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);

  // XR controllers: a thin amber ray + "select" (trigger or hand pinch).
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
  const controllers: THREE.XRTargetRaySpace[] = [];
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    const line = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xffb466, transparent: true, opacity: 0.8 }));
    line.scale.z = 3;
    c.add(line);
    c.addEventListener('select', () => onSelect(c));
    rig.add(c);
    controllers.push(c);
  }
  const cursor = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.014, 20), new THREE.MeshBasicMaterial({ color: 0xffd39a, depthTest: false }));
  cursor.visible = false;
  cursor.renderOrder = 10;
  scene.add(cursor);

  const rayFrom = (c: THREE.Object3D) => {
    tmp.identity().extractRotation(c.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmp);
  };

  // ─── AR placement (hit-test) ───
  let hitSource: XRHitTestSource | null = null;
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf08a24 }));
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const onSelect = (c: THREE.Object3D) => {
    rayFrom(c);
    if (handleHit(raycaster.intersectObjects(interactive(), true))) return;
    if (xrMode === 'ar' && reticle.visible) {
      const p = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
      board.position.set(p.x, p.y + 0.05, p.z);
      const cam = renderer.xr.getCamera();
      const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      board.rotation.set(0, Math.atan2(cp.x - p.x, cp.z - p.z), 0);
    }
  };

  // ─── Sessions ───
  const savedCam = new THREE.Vector3();
  const setMode = (m: XRMode) => {
    xrMode = m;
    const ar = m === 'ar';
    sky.visible = clouds.visible = worldHolder.visible = desk.visible = !ar;
    hemi.intensity = ar ? 2 : 1.25;
    infoPanel.group.visible = m === 'vr' && kind === 'world';
    panels.forEach((p) => p.invalidate());
    paint();
    opts.onXRChange?.(m);
  };

  const start = async (mode: 'immersive-vr' | 'immersive-ar') => {
    if (!navigator.xr) throw new Error('WebXR is not available in this browser.');
    const init: XRSessionInit =
      mode === 'immersive-vr'
        ? { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] }
        : { optionalFeatures: ['hit-test', 'local-floor', 'dom-overlay'], domOverlay: { root: document.body } };
    const session = await navigator.xr.requestSession(mode, init);
    savedCam.copy(camera.position);
    controls.enabled = false;
    renderer.xr.setReferenceSpaceType(mode === 'immersive-ar' ? 'local' : 'local-floor');
    await renderer.xr.setSession(session);
    camera.position.set(0, 0, 0);
    if (mode === 'immersive-vr') {
      if (kind === 'room') rig.position.set(0, 0, 0.1);
      else { viewIdx = 0; applyView(); }
      setMode('vr');
    } else {
      // Start with the board floating ~1m ahead until the student places it on a surface.
      board.scale.setScalar(0.55);
      board.position.set(0, -0.35, -1.1);
      board.rotation.set(0, 0, 0);
      setMode('ar');
      try {
        const viewer = await session.requestReferenceSpace('viewer');
        hitSource = (await session.requestHitTestSource?.({ space: viewer })) ?? null;
      } catch {
        hitSource = null; // Hit-test not granted: the board still floats in front.
      }
    }
    session.addEventListener('end', () => {
      hitSource?.cancel();
      hitSource = null;
      reticle.visible = cursor.visible = false;
      rig.position.set(0, 0, 0);
      rig.rotation.set(0, 0, 0);
      board.scale.setScalar(1);
      board.position.set(0, 0, 0);
      board.rotation.set(0, 0, 0);
      camera.position.copy(savedCam);
      controls.enabled = true;
      controls.update();
      setMode('none');
      resize();
    });
  };

  // ─── Loop ───
  const clock = new THREE.Clock();
  renderer.setAnimationLoop((_, frame) => {
    const t = clock.getElapsedTime();
    const motion = !reducedMotion;
    if (motion) {
      world?.tick(t);
      clouds.rotation.y = t * 0.004;
    }
    if (xrMode === 'none') controls.update();
    else {
      cursor.visible = false;
      for (const c of controllers) {
        rayFrom(c);
        const hits = raycaster.intersectObjects(panels.map((p) => p.mesh), false);
        if (hits[0]) {
          cursor.position.copy(hits[0].point);
          cursor.quaternion.copy(hits[0].object.getWorldQuaternion(new THREE.Quaternion()));
          cursor.visible = true;
        }
      }
      if (frame && hitSource) {
        const ref = renderer.xr.getReferenceSpace();
        const res = frame.getHitTestResults(hitSource);
        const pose = ref && res[0]?.getPose(ref);
        reticle.visible = !!pose;
        if (pose) reticle.matrix.fromArray(pose.transform.matrix);
      }
    }
    renderer.render(scene, camera);
  });

  const onLost = (e: Event) => { e.preventDefault(); opts.onContextLost?.(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  document.fonts?.ready.then(() => { panels.forEach((p) => p.invalidate()); paint(); }).catch(() => {});

  return {
    update(d) {
      data = d;
      setLevel(d.level);
      paint();
    },
    enterVR: () => start('immersive-vr'),
    enterAR: () => start('immersive-ar'),
    dispose() {
      renderer.setAnimationLoop(null);
      renderer.xr.getSession()?.end().catch(() => {});
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mt = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x.dispose());
      });
      panels.forEach((p) => p.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function isChild(o: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === root) return true;
  return false;
}

/** Real capability detection — never assumed. */
export async function detectXR(): Promise<{ vr: boolean; ar: boolean; note: string }> {
  if (!window.isSecureContext) return { vr: false, ar: false, note: 'WebXR needs a secure (HTTPS) page.' };
  if (!navigator.xr) return { vr: false, ar: false, note: 'This browser does not expose WebXR. Open UDAAN in a headset browser (e.g. Meta Quest Browser) for VR.' };
  const [vr, ar] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
  ]);
  return {
    vr,
    ar,
    note: vr || ar ? '' : 'No VR headset detected here — the 3D view works on screen. Open this page in a WebXR headset browser (e.g. Meta Quest) to enter VR.',
  };
}
