import * as THREE from 'three';

export type SceneAction =
  | { type: 'start'; min: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'finish' }
  | { type: 'toggle'; id: string }
  | { type: 'view' }
  | { type: 'exit' };

interface Btn { x: number; y: number; w: number; h: number; action: SceneAction; }

const DISPLAY = "'Fraunces Variable', Georgia, serif";
const BODY = "'Inter Tight Variable', system-ui, sans-serif";

/**
 * A spatial UI panel: a canvas-textured plane with clickable regions.
 * Hit testing uses the raycast UV, so it works the same for mouse, touch,
 * VR controllers and hand-tracking "select" events.
 */
export class Panel {
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private buttons: Btn[] = [];
  private last = '';
  hover: SceneAction | null = null;

  constructor(readonly w = 1024, readonly h = 640, width = 0.96) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const height = (width * h) / w;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true }));
    this.mesh.userData.panel = this;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, height + 0.03, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0b1229, roughness: 0.6 }),
    );
    back.position.z = -0.012;
    this.group.add(back, this.mesh);
  }

  /** Redraws only when the content key changes, keeping per-frame cost near zero. */
  draw(key: string, paint: (p: Painter) => void) {
    if (key === this.last) return;
    this.last = key;
    this.buttons = [];
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    paint(new Painter(c, this.w, this.h, this.buttons, this.hover));
    this.tex.needsUpdate = true;
  }

  invalidate() { this.last = ''; }

  hit(uv: THREE.Vector2): SceneAction | null {
    const x = uv.x * this.w;
    const y = (1 - uv.y) * this.h;
    const b = this.buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    return b?.action ?? null;
  }

  dispose() {
    this.tex.dispose();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
  }
}

export class Painter {
  constructor(
    readonly c: CanvasRenderingContext2D,
    readonly w: number,
    readonly h: number,
    private buttons: Btn[],
    private hover: SceneAction | null,
  ) {}

  bg() {
    const c = this.c;
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#16224a');
    g.addColorStop(1, '#0d1531');
    c.fillStyle = g;
    this.round(0, 0, this.w, this.h, 40);
    c.fill();
    const glow = c.createRadialGradient(this.w, this.h, 10, this.w, this.h, this.w * 0.7);
    glow.addColorStop(0, 'rgba(240,138,36,0.35)');
    glow.addColorStop(1, 'rgba(240,138,36,0)');
    c.fillStyle = glow;
    this.round(0, 0, this.w, this.h, 40);
    c.fill();
  }

  round(x: number, y: number, w: number, h: number, r: number) {
    const c = this.c;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  text(s: string, x: number, y: number, size: number, opts: { color?: string; weight?: number; display?: boolean; align?: CanvasTextAlign; max?: number } = {}) {
    const c = this.c;
    c.font = `${opts.weight ?? 500} ${size}px ${opts.display ? DISPLAY : BODY}`;
    c.fillStyle = opts.color ?? '#ffffff';
    c.textAlign = opts.align ?? 'left';
    c.textBaseline = 'alphabetic';
    let out = s;
    if (opts.max) {
      while (out.length > 1 && c.measureText(out).width > opts.max) out = out.slice(0, -2);
      if (out !== s) out = out.trimEnd() + '…';
    }
    c.fillText(out, x, y);
  }

  eyebrow(s: string, x: number, y: number) {
    this.c.save();
    this.c.letterSpacing = '4px';
    this.text(s.toUpperCase(), x, y, 22, { color: '#f7c995', weight: 700 });
    this.c.restore();
  }

  bar(x: number, y: number, w: number, h: number, pct: number, colors = ['#f08a24', '#ffc68a']) {
    const c = this.c;
    c.fillStyle = 'rgba(255,255,255,0.12)';
    this.round(x, y, w, h, h / 2);
    c.fill();
    if (pct > 0) {
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, colors[0]);
      g.addColorStop(1, colors[1]);
      c.fillStyle = g;
      this.round(x, y, Math.max(h, w * Math.min(1, pct)), h, h / 2);
      c.fill();
    }
  }

  button(label: string, x: number, y: number, w: number, h: number, action: SceneAction, kind: 'primary' | 'light' | 'ghost' = 'primary') {
    const c = this.c;
    const hovered = this.hover && JSON.stringify(this.hover) === JSON.stringify(action);
    c.fillStyle = kind === 'primary' ? (hovered ? '#ffa24a' : '#f08a24') : kind === 'light' ? (hovered ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)') : 'rgba(0,0,0,0)';
    this.round(x, y, w, h, h / 2);
    c.fill();
    if (kind !== 'primary') {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      c.stroke();
    }
    this.text(label, x + w / 2, y + h / 2 + 11, 32, { color: kind === 'primary' ? '#1b1203' : '#ffffff', weight: 680, align: 'center' });
    this.buttons.push({ x, y, w, h, action });
  }

  checkbox(x: number, y: number, done: boolean, action: SceneAction) {
    const c = this.c;
    c.lineWidth = 4;
    c.strokeStyle = done ? '#2bb39b' : 'rgba(255,255,255,0.5)';
    c.fillStyle = done ? '#1f8f7c' : 'rgba(255,255,255,0.04)';
    this.round(x, y, 44, 44, 12);
    c.fill();
    c.stroke();
    if (done) {
      c.strokeStyle = '#fff';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + 11, y + 23);
      c.lineTo(x + 19, y + 31);
      c.lineTo(x + 34, y + 14);
      c.stroke();
    }
    // Generous hit target for controllers.
    this.buttons.push({ x: x - 10, y: y - 10, w: 64 + 600, h: 64, action });
  }
}
