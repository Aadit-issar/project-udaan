import * as THREE from 'three';

/**
 * Procedural UDAAN Skyworld. Everything is built from primitives in code
 * (no external models). `level` comes from real XP via domain/progress.
 */
export const PALETTE = {
  ink: 0x111a35,
  rock: 0x39436e,
  rockDark: 0x262f55,
  sand: 0xe8dcc4,
  grass: 0x86b47f,
  grassDeep: 0x5f9a6e,
  leaf: 0x3f8a6a,
  leafWarm: 0xc9a253,
  trunk: 0x7a5236,
  amber: 0xf08a24,
  paper: 0xf6f1e7,
  wood: 0xc49a6c,
};

const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });

export function makeIsland(radius: number, depth: number, top: number, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, 0.28, 28, 1), mat(top));
  cap.position.y = -0.14;
  cap.receiveShadow = true;
  g.add(cap);
  const under = new THREE.ConeGeometry(radius * 0.94, depth, 14, 3);
  // Jitter the underside so it reads as rock, deterministically.
  const pos = under.attributes.position as THREE.BufferAttribute;
  let s = seed * 9301;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < depth / 2 - 0.01) {
      pos.setX(i, pos.getX(i) * (0.85 + rnd() * 0.3));
      pos.setZ(i, pos.getZ(i) * (0.85 + rnd() * 0.3));
    }
  }
  under.computeVertexNormals();
  const rock = new THREE.Mesh(under, mat(PALETTE.rock));
  rock.rotation.x = Math.PI;
  rock.position.y = -0.28 - depth / 2;
  g.add(rock);
  return g;
}

function tree(h: number, color: number): THREE.Group {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h * 0.4, 6), mat(PALETTE.trunk));
  trunk.position.y = h * 0.2;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(h * 0.28, h * 0.75, 7), mat(color));
  crown.position.y = h * 0.62;
  crown.castShadow = true;
  t.add(trunk, crown);
  return t;
}

function roundTree(h: number, color: number): THREE.Group {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h * 0.5, 6), mat(PALETTE.trunk));
  trunk.position.y = h * 0.25;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.32, 0), mat(color));
  crown.position.y = h * 0.66;
  crown.castShadow = true;
  t.add(trunk, crown);
  return t;
}

function lantern(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.7, 6), mat(PALETTE.ink));
  post.position.y = 0.35;
  const glow = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.06, 0),
    new THREE.MeshStandardMaterial({ color: 0xffd39a, emissive: 0xffa14a, emissiveIntensity: 1.6, flatShading: true }),
  );
  glow.position.y = 0.76;
  g.add(post, glow);
  return g;
}

function windmill(): { group: THREE.Group; blades: THREE.Object3D } {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.3, 8), mat(PALETTE.paper));
  body.position.y = 0.65;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 8), mat(PALETTE.ink));
  roof.position.y = 1.47;
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.02), mat(PALETTE.amber));
    b.position.y = 0.35;
    const arm = new THREE.Group();
    arm.add(b);
    arm.rotation.z = (i * Math.PI) / 2;
    blades.add(arm);
  }
  blades.position.set(0, 1.15, 0.3);
  g.add(body, roof, blades);
  return { group: g, blades };
}

function lighthouse(): { group: THREE.Group; beam: THREE.Object3D } {
  const g = new THREE.Group();
  const stripes = [PALETTE.paper, PALETTE.amber, PALETTE.paper, PALETTE.amber];
  stripes.forEach((c, i) => {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.025, 0.23 - i * 0.025, 0.4, 10), mat(c));
    seg.position.y = 0.2 + i * 0.4;
    g.add(seg);
  });
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc070, emissiveIntensity: 2 }),
  );
  lamp.position.y = 1.7;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 10), mat(PALETTE.ink));
  cap.position.y = 1.89;
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 3, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 1.5;
  const pivot = new THREE.Group();
  pivot.position.y = 1.7;
  pivot.add(beam);
  g.add(lamp, cap, pivot);
  return { group: g, beam: pivot };
}

function glider(): THREE.Mesh {
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.22, -0.16, 0, 0.12, 0, 0.03, 0.08, 0, 0, -0.22, 0, 0.03, 0.08, 0.16, 0, 0.12], 3));
  shape.computeVertexNormals();
  return new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color: 0xfffaf0, side: THREE.DoubleSide, flatShading: true }));
}

export interface SkyWorld {
  group: THREE.Group;
  tick: (t: number) => void;
  /** Named, inspectable unlocks (for raycast labels). */
  labels: { object: THREE.Object3D; label: string }[];
}

/** Builds the island state for a given level (0–7). Deterministic for a given level. */
export function buildSkyWorld(level: number, { lowPerf = false, keepDeskArea = true } = {}): SkyWorld {
  const group = new THREE.Group();
  const labels: SkyWorld['labels'] = [];
  const tickers: ((t: number) => void)[] = [];

  const main = makeIsland(3.2, 3.4, level >= 1 ? PALETTE.grass : PALETTE.sand, 3);
  group.add(main);
  labels.push({ object: main, label: 'Home isle' });

  // Stepping-stone path toward the horizon (always present).
  for (let i = 0; i < 5; i++) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 7), mat(PALETTE.sand));
    stone.position.set(1.2 + i * 0.32, 0.02, -0.6 - i * 0.38);
    group.add(stone);
  }

  // Small floating rocks — cheap depth cues.
  [[-4.2, -1.4, 1.5, 0.35], [4.6, 0.8, 2.2, 0.25], [-2.6, 1.6, -4.8, 0.3], [3.4, -2.4, -2.5, 0.45]].forEach(([x, y, z, r], i) => {
    const m = makeIsland(r, r * 2.2, level >= 1 ? PALETTE.grassDeep : PALETTE.sand, i + 7);
    m.position.set(x, y, z);
    group.add(m);
    tickers.push((t) => (m.position.y = y + Math.sin(t * 0.4 + i) * 0.06));
  });

  if (level >= 1) {
    const sap = roundTree(0.6, PALETTE.leaf);
    sap.position.set(1.9, 0, 0.9);
    group.add(sap);
    labels.push({ object: sap, label: 'First Light — your first sapling' });
  }
  if (level >= 2) {
    const spots: [number, number, number, number][] = [
      [-2.3, -1.2, 1.1, PALETTE.leaf], [-2.6, 0.2, 0.9, PALETTE.grassDeep], [-1.9, 1.6, 1.3, PALETTE.leafWarm],
      [2.4, 1.6, 0.9, PALETTE.leaf], [-1.2, -2.4, 1.0, PALETTE.grassDeep], [2.6, -0.4, 0.8, PALETTE.leafWarm],
    ];
    spots.forEach(([x, z, h, c], i) => {
      const t = i % 2 ? roundTree(h, c) : tree(h, c);
      t.position.set(x, 0, z);
      group.add(t);
      labels.push({ object: t, label: 'Study Grove' });
    });
  }
  if (level >= 3) {
    [[-1.2, 1.9], [0.0, 2.3], [1.2, 1.9], [-2.7, -0.6]].forEach(([x, z]) => {
      const l = lantern();
      l.position.set(x, 0, z);
      group.add(l);
      labels.push({ object: l, label: 'Lantern Path' });
    });
    if (!lowPerf) {
      const pl = new THREE.PointLight(0xffa860, 1.2, 4, 2);
      pl.position.set(0, 0.9, 2.1);
      group.add(pl);
    }
  }
  if (level >= 4) {
    const isle2 = makeIsland(1.6, 2.2, PALETTE.grass, 11);
    isle2.position.set(5.6, -0.5, -4.4);
    group.add(isle2);
    labels.push({ object: isle2, label: 'Skybridge isle' });
    const from = new THREE.Vector3(2.7, 0, -1.6);
    const to = new THREE.Vector3(4.6, -0.5, -3.6);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const p = from.clone().lerp(to, (i + 0.5) / n);
      p.y += Math.sin((i / (n - 1)) * Math.PI) * -0.12;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.22), mat(PALETTE.wood));
      plank.position.copy(p);
      plank.lookAt(to.x, p.y, to.z);
      group.add(plank);
    }
    if (level >= 5) {
      const { group: wm, blades } = windmill();
      wm.position.set(5.6, -0.5, -4.4);
      wm.rotation.y = -0.6;
      group.add(wm);
      labels.push({ object: wm, label: 'Windmill Rise' });
      tickers.push((t) => (blades.rotation.z = t * 0.6));
    }
  }
  if (level >= 6) {
    const isle3 = makeIsland(1.1, 1.8, PALETTE.sand, 13);
    isle3.position.set(-5.4, 0.6, -3.6);
    group.add(isle3);
    const { group: lh, beam } = lighthouse();
    lh.position.set(-5.4, 0.6, -3.6);
    group.add(lh);
    labels.push({ object: lh, label: 'Lighthouse' });
    tickers.push((t) => (beam.rotation.y = t * 0.5));
  }
  if (level >= 7) {
    for (let i = 0; i < 5; i++) {
      const gl = glider();
      const r = 4 + i * 0.7;
      const h = 1.6 + (i % 3) * 0.5;
      const sp = 0.18 + i * 0.03;
      group.add(gl);
      labels.push({ object: gl, label: 'Open Horizon — paper gliders' });
      tickers.push((t) => {
        const a = t * sp + i * 1.3;
        gl.position.set(Math.cos(a) * r, h + Math.sin(t * 0.7 + i) * 0.2, Math.sin(a) * r);
        gl.rotation.y = -a;
        gl.rotation.z = 0.25;
      });
    }
  }
  void keepDeskArea;
  return { group, labels, tick: (t) => tickers.forEach((f) => f(t)) };
}

/** Gradient sky dome with a soft sunrise glow — shared by every scene. */
export function makeSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(80, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { sunDir: { value: new THREE.Vector3(-0.25, 0.05, -1).normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir;
      void main(){
        float y = vDir.y;
        vec3 top = vec3(0.05,0.08,0.19);
        vec3 mid = vec3(0.17,0.21,0.40);
        vec3 hor = vec3(0.98,0.62,0.36);
        vec3 low = vec3(0.93,0.74,0.62);
        vec3 c = mix(mid, top, smoothstep(0.05, 0.75, y));
        c = mix(hor, c, smoothstep(-0.02, 0.28, y));
        c = mix(c, low, smoothstep(0.0, 0.45, -y));
        float s = max(dot(vDir, sunDir), 0.0);
        c += vec3(1.0,0.62,0.30) * pow(s, 24.0) * 0.55 + vec3(1.0,0.85,0.6) * pow(s, 900.0) * 1.2;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = -1;
  return mesh;
}

/** A soft sea of clouds far below the islands, as one instanced mesh. */
export function makeClouds(count: number): THREE.InstancedMesh {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const m = new THREE.MeshStandardMaterial({ color: 0xfff1e6, roughness: 1, flatShading: true, transparent: true, opacity: 0.78 });
  const inst = new THREE.InstancedMesh(geo, m, count);
  const d = new THREE.Object3D();
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 7 + rnd() * 34;
    d.position.set(Math.cos(a) * r, -7.5 - rnd() * 3, Math.sin(a) * r);
    const sc = 1.1 + rnd() * 2.4;
    d.scale.set(sc * 1.6, sc * 0.55, sc);
    d.rotation.y = rnd() * 3;
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  return inst;
}
