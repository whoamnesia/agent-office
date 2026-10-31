import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/vt323/400.css';
import './styles.css';
// CSP forbids eval; this module swaps Pixi's generated-code paths for static ones.
import 'pixi.js/unsafe-eval';
import { Application } from 'pixi.js';
import type { OfficeEvent } from '@agent-office/protocol';
import { loadAssets } from './assets.js';
import { Connection, takeToken, type LinkState, type Snapshot } from './data/connection.js';
import { Scene } from './render/scene.js';
import { mountUI, type UI } from './ui/ui.js';

declare global {
  interface Window {
    __ao?: {
      scene: Scene;
      ui: UI;
      ready: boolean;
      setTime(t: number | 'auto'): void;
      inject(events: OfficeEvent[]): void;
    };
  }
}

async function boot() {
  const stageEl = document.getElementById('stage')!;
  const uiEl = document.getElementById('ui')!;
  const loading = document.createElement('div');
  loading.className = 'ao-loading';
  loading.innerHTML = `<div class="ao-loading__card"><div class="ao-loading__mascot" aria-hidden="true"></div><div class="ao-loading__title">Agent Office</div><div class="ao-loading__bar"><span></span></div></div>`;
  document.body.appendChild(loading);
  const bar = loading.querySelector('span') as HTMLElement;

  await Promise.all([document.fonts.load('13px "Pixelify Sans"'), document.fonts.load('600 13px "Pixelify Sans"'), document.fonts.load('20px VT323')]).catch(() => undefined);
  const app = new Application();
  await app.init({
    resizeTo: stageEl,
    antialias: false,
    roundPixels: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    background: '#1b1424',
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  stageEl.appendChild(app.canvas);
  const atlas = await loadAssets('assets/', (p) => (bar.style.width = `${Math.round(p * 100)}%`));
  const scene = new Scene(app, atlas);
  const params = new URLSearchParams(location.search);
  const token = takeToken();

  let conn: Connection;
  const ui = mountUI(uiEl, scene, {
    post: (path, body, type) => conn.post(path, body, type),
  });
  let firstSnapshot = true;
  conn = new Connection(token, {
    snapshot: (s: Snapshot) => {
      ui.applyConfig(s.config);
      ui.setDemo(s.demo);
      ui.setLink(s.link);
      ui.resetLog(s.events);
      scene.world.applyAll(s.events, Date.now());
      if (firstSnapshot) {
        firstSnapshot = false;
        if (params.get('view') === 'all') scene.fitAll();
        else scene.focusHQ(true);
      }
    },
    events: (ev) => {
      for (const e of ev) {
        ui.log(e);
        if (!ui.replaying) scene.world.apply(e);
      }
    },
    config: (c) => ui.applyConfig(c),
    link: (l) => ui.setLink(l),
    demo: (on) => ui.setDemo(on),
    state: (st: LinkState) => ui.setState(st),
  });
  conn.start();
  if (!token) scene.focusHQ(true);

  // ---- input
  const canvas = app.canvas;
  let drag: { x: number; y: number; moved: boolean } | undefined;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.moved || Math.abs(dx) + Math.abs(dy) > 4) {
        drag.moved = true;
        scene.camera.pan(dx, dy);
        drag.x = e.clientX;
        drag.y = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
      return;
    }
    const key = scene.pickAgent(e.clientX - rect.left, e.clientY - rect.top);
    scene.hovered = key;
    canvas.style.cursor = key ? 'pointer' : 'grab';
    ui.hover(key, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerup', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (drag && !drag.moved) {
      const key = scene.pickAgent(e.clientX - rect.left, e.clientY - rect.top);
      if (key) ui.select(key);
      else {
        const b = scene.pickBuilding(e.clientX - rect.left, e.clientY - rect.top);
        if (b) {
          const bld = scene.world.buildings.get(b);
          if (bld?.openFloor) scene.focusFloor(bld.openFloor);
        } else ui.select(undefined);
      }
    }
    drag = undefined;
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('pointerleave', () => {
    scene.hovered = undefined;
    ui.hover(undefined, 0, 0);
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      scene.camera.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => ui.key(e));

  window.__ao = {
    scene,
    ui,
    ready: true,
    setTime: (t) => scene.setConfig(t === 'auto' ? { dayMode: 'auto' } : { dayMode: 'manual', timeOfDay: t }),
    inject: (ev) => ev.forEach((e) => scene.world.apply(e)),
  };
  loading.classList.add('ao-loading--done');
  setTimeout(() => loading.remove(), 400);
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<div class="ao-fatal" role="alert"><b>Agent Office failed to start.</b><br>${String(e?.message ?? e).replace(/[<>&]/g, '')}</div>`);
});
