import { FLOOR_D, FLOOR_W, type Agent, type Achievement } from '@agent-office/office-core';
import { transcriptToEvents, validateEvents, type OfficeEvent } from '@agent-office/protocol';
import type { LinkState } from '../data/connection.js';
import { isoX, isoY } from '../iso.js';
import { STATUS_COLOR } from '../render/building.js';
import type { Scene } from '../render/scene.js';
import { Audio } from './audio.js';
import { detectLang, dict, type Dict, type Lang } from './i18n.js';
import { icon } from './icons.js';

export interface UI {
  applyConfig(c: Record<string, unknown>): void;
  setDemo(on: boolean): void;
  setLink(l: { relay: string; relayUrl?: string; lastEventAt?: number }): void;
  setState(s: LinkState): void;
  resetLog(events: OfficeEvent[]): void;
  log(e: OfficeEvent): void;
  readonly replaying: boolean;
  hover(key: string | undefined, x: number, y: number): void;
  select(key: string | undefined): void;
  key(e: KeyboardEvent): void;
}

interface Api {
  post(path: string, body: unknown, type?: string): Promise<Response | undefined>;
}

const CB: Record<string, string> = { thinking: '#cc79a7', reading: '#56b4e9', writing: '#e69f00', running: '#009e73', searching: '#f0e442', waiting_user: '#d55e00', error: '#ff4040', done: '#0072b2', idle: '#999999' };
const hexCss = (n: number) => '#' + n.toString(16).padStart(6, '0');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmtTokens = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const hhmm = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function mountUI(root: HTMLElement, scene: Scene, api: Api): UI {
  let lang: Lang = detectLang(undefined);
  let t: Dict = dict(lang);
  const audio = new Audio();
  let config: Record<string, unknown> = {};
  let state: LinkState = 'connecting';
  let demo = false;
  let link: { relay: string; relayUrl?: string } = { relay: 'off' };
  let selected: string | undefined;
  let logEvents: OfficeEvent[] = [];
  const feed: OfficeEvent[] = [];
  const replay = { on: false, playing: false, speed: 8, T: 0, t0: 0, t1: 0, events: [] as OfficeEvent[], idx: 0, imported: false };
  let uiHidden = false;
  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.innerHTML = `
    <a class="ao-skip" href="#ao-team">${t.skip}</a>
    <header class="ao-top" role="banner">
      <div class="ao-brand">
        <span class="ao-brand__logo" aria-hidden="true"></span>
        <div class="ao-brand__text"><h1>Agent Office</h1><div class="ao-pills" id="ao-pills"></div></div>
      </div>
      <div class="ao-clock" role="group" aria-labelledby="ao-clock-label">
        <span id="ao-clock-label" class="ao-sr">${t.time}</span>
        <div class="ao-clock__time"><span class="ao-num" id="ao-time">--:--</span><span class="ao-clock__phase" id="ao-phase"></span></div>
        <div class="ao-seg" role="radiogroup" aria-label="${t.time}" id="ao-daymode"></div>
        <input class="ao-range ao-clock__slider" id="ao-tod" type="range" min="0" max="1000" step="1" aria-label="${t.time}" />
      </div>
      <nav class="ao-tools" aria-label="${t.tools}" id="ao-tools"></nav>
    </header>
    <aside class="ao-panel ao-team" id="ao-team" aria-label="${t.team}" tabindex="-1"></aside>
    <aside class="ao-panel ao-card" id="ao-card" aria-label="${t.agentCard}" hidden></aside>
    <section class="ao-timeline" id="ao-timeline" aria-label="${t.timeline}"></section>
    <figure class="ao-minimap" id="ao-minimap"><canvas width="216" height="132" aria-label="${t.minimap}"></canvas><figcaption class="ao-sr">${t.minimap}</figcaption></figure>
    <div class="ao-toasts" id="ao-toasts" role="status" aria-live="polite"></div>
    <div class="ao-tip" id="ao-tip" hidden></div>
    <div class="ao-drop" id="ao-drop" hidden><div>${icon('upload', 28)}<p id="ao-drop-text"></p></div></div>
    <div class="ao-modal" id="ao-modal" hidden></div>
    <div class="ao-banner" id="ao-banner" hidden></div>
  `;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const team = $('#ao-team');
  const card = $('#ao-card');
  const timeline = $('#ao-timeline');
  const tools = $('#ao-tools');
  const toasts = $('#ao-toasts');
  const tip = $('#ao-tip');
  const modal = $('#ao-modal');
  const drop = $('#ao-drop');
  const banner = $('#ao-banner');
  const mini = root.querySelector('#ao-minimap canvas') as HTMLCanvasElement;

  // ------------------------------------------------------------- config & labels

  function saveConfig(patch: Record<string, unknown>) {
    config = { ...config, ...patch };
    try {
      localStorage.setItem('ao-ui', JSON.stringify(config));
    } catch {
      /* storage blocked */
    }
    void api.post('config', patch);
    push();
  }

  function push() {
    const rm = config.reducedMotion === 'on' || (config.reducedMotion !== 'off' && reducedMq.matches);
    lang = detectLang(config.lang as string);
    t = dict(lang);
    document.documentElement.lang = lang;
    document.documentElement.style.setProperty('--ao-scale', String(config.uiScale ?? 1));
    document.documentElement.classList.toggle('ao-reduced', rm);
    document.documentElement.classList.toggle('ao-cb', !!config.colorblind);
    scene.setConfig({
      dayMode: (config.dayMode as never) ?? 'auto',
      dayCycleMinutes: Number(config.dayCycleMinutes ?? 15),
      timeOfDay: Number(config.timeOfDay ?? 0.45),
      weather: (config.weather as never) ?? 'auto',
      weatherFollowsHealth: config.weatherFollowsHealth !== false,
      quality: (config.quality as never) ?? 'auto',
      fpsCap: (Number(config.fpsCap) || 60) as 60,
      reducedMotion: rm,
      colorblind: !!config.colorblind,
      seasonal: config.seasonal !== false,
      lang,
    });
    renderTools();
    renderDayMode();
    renderTeam(true);
    renderTimeline();
    relabel();
  }

  /** Static shell labels follow the language too. */
  function relabel() {
    ($('.ao-skip') as HTMLElement).textContent = t.skip;
    tools.setAttribute('aria-label', t.tools);
    card.setAttribute('aria-label', t.agentCard);
    team.setAttribute('aria-label', t.team);
    timeline.setAttribute('aria-label', t.timeline);
    mini.setAttribute('aria-label', t.minimap);
    $('#ao-clock-label').textContent = t.time;
    slider.setAttribute('aria-label', t.time);
    document.getElementById('stage')?.setAttribute('aria-label', t.stage);
  }

  function statusColor(s: string) {
    return config.colorblind ? CB[s] ?? '#999' : hexCss(STATUS_COLOR[s] ?? 0x999999);
  }
  function statusChip(s: string) {
    return `<span class="ao-chip ao-chip--${s}" style="--c:${statusColor(s)}"><i aria-hidden="true"></i>${esc(t.status[s] ?? s)}</span>`;
  }

  // ------------------------------------------------------------- top bar

  function renderPills() {
    const el = $('#ao-pills');
    const st = state === 'live' ? t.live : state === 'offline' ? t.offline : state === 'no-token' ? t.noToken : t.connecting;
    let html = `<span class="ao-pill ao-pill--${state}">${icon(state === 'live' ? 'live' : 'alert', 14)}${st}</span>`;
    if (demo) html += `<span class="ao-pill ao-pill--demo">${t.demo}</span>`;
    if (link.relay !== 'off') html += `<span class="ao-pill ao-pill--relay-${link.relay}" title="${esc(link.relayUrl ?? '')}">${icon('link', 14)}${t.relay}: ${link.relay}</span>`;
    if (replay.on) html += `<span class="ao-pill ao-pill--replay">${icon('play', 14)}${t.replay}</span>`;
    el.innerHTML = html;
  }

  function renderDayMode() {
    const mode = (config.dayMode as string) ?? 'auto';
    const opts: [string, string, string][] = [
      ['day', 'sun', t.day],
      ['night', 'moon', t.night],
      ['auto', 'auto', t.auto],
    ];
    $('#ao-daymode').innerHTML = opts
      .map(([v, ic, label]) => `<button type="button" role="radio" aria-checked="${mode === v}" class="ao-seg__btn" data-daymode="${v}">${icon(ic, 16)}<span>${label}</span></button>`)
      .join('');
  }

  function renderTools() {
    const weather = (config.weather as string) ?? 'auto';
    const wIcon = weather === 'auto' ? 'cloud' : weather === 'clear' ? 'sun' : weather;
    const btn = (id: string, ic: string, label: string, extra = '') => `<button type="button" class="ao-iconbtn" data-tool="${id}" aria-label="${esc(label)}" data-tip="${esc(label)}" ${extra}>${icon(ic, 18)}</button>`;
    tools.innerHTML =
      btn('weather', wIcon, `${t.weather}: ${t.weatherNames[weather]}`) +
      btn('sound', audio.enabled ? 'volume' : 'mute', audio.enabled ? t.soundOff : t.soundOn, `aria-pressed="${audio.enabled}"`) +
      btn('photo', 'camera', t.photo) +
      btn('overview', 'overview', t.overview) +
      btn('hide', 'hide', t.hideUI) +
      btn('help', 'help', t.help) +
      btn('settings', 'settings', t.settings);
  }

  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tool],[data-daymode],[data-agent],[data-floor],[data-act]');
    if (!el) return;
    if (el.dataset.daymode) saveConfig({ dayMode: el.dataset.daymode });
    if (el.dataset.agent) select(el.dataset.agent, true);
    if (el.dataset.floor) scene.focusFloor(el.dataset.floor);
    const tool = el.dataset.tool;
    if (tool === 'weather') {
      const order = ['auto', 'clear', 'rain', 'snow', 'fog'];
      saveConfig({ weather: order[(order.indexOf((config.weather as string) ?? 'auto') + 1) % order.length] });
    }
    if (tool === 'sound') void audio.enable(!audio.enabled).then(renderTools);
    if (tool === 'photo') void photo();
    if (tool === 'overview') scene.fitAll();
    if (tool === 'hide') toggleUI();
    if (tool === 'help') openHelp();
    if (tool === 'settings') openSettings();
    const act = el.dataset.act;
    if (act === 'close-card') select(undefined);
    if (act === 'close-modal') closeModal();
    if (act === 'demo') void api.post('demo?on=1', {});
    if (act === 'live') goLive();
    if (act === 'play') togglePlay();
    if (act === 'import') ($('#ao-file') as HTMLInputElement).click();
    if (act === 'replay-log') startReplay(logEvents, false);
  });

  const slider = $('#ao-tod') as HTMLInputElement;
  slider.addEventListener('input', () => {
    config.dayMode = 'manual';
    config.timeOfDay = Number(slider.value) / 1000;
    scene.setConfig({ dayMode: 'manual', timeOfDay: config.timeOfDay as number });
    renderDayMode();
  });
  slider.addEventListener('change', () => saveConfig({ dayMode: 'manual', timeOfDay: Number(slider.value) / 1000 }));

  // ------------------------------------------------------------- team list

  let structKey = '';
  /** Full render only when the structure changes; statuses and numbers are patched in place. */
  function renderTeam(force = false) {
    const w = scene.world;
    const now = Date.now();
    const st = scene.stats();
    const blds = [...w.buildings.values()].sort((a, b) => a.slot - b.slot);
    const key = `${lang}|${state}|${demo}|${blds.map((b) => b.id + ':' + b.openFloor + ':' + b.floors.map((f) => f + '=' + w.floorAgents(f).map((a) => a.key).join(',')).join(';')).join('|')}`;
    if (key !== structKey || force) {
      structKey = key;
      const focused = (document.activeElement as HTMLElement | null)?.dataset;
      const focusKey = focused?.agent ? `[data-agent="${CSS.escape(focused.agent)}"]` : focused?.floor ? `[data-floor="${CSS.escape(focused.floor)}"]` : '';
      const stat = (id: string, ic: string, label: string) => `<div class="ao-stat">${icon(ic, 16)}<span class="ao-num" data-stat="${id}">0</span><span class="ao-stat__label">${label}</span></div>`;
      let html = `<div class="ao-panel__head"><h2>${icon('users', 16)}${t.team}</h2></div>
        <div class="ao-stats">${stat('agents', 'users', t.agents)}${stat('calls', 'activity', t.calls)}${stat('errors', 'alert', t.errors)}${stat('tokens', 'coins', t.tokens)}</div>`;
      if (!blds.length) {
        html += `<div class="ao-empty"><span class="ao-empty__art" aria-hidden="true"></span><p>${t.empty}</p>${state === 'live' ? `<button type="button" class="ao-btn ao-btn--primary" data-act="demo">${icon('play', 16)}${t.startDemo}</button>` : ''}</div>`;
      }
      html += `<div class="ao-team__list">`;
      for (const b of blds) {
        html += `<section class="ao-bld"><h3>${icon(b.cloud ? 'cloud' : 'building', 15)}<span>${esc(b.cloud ? t.cloudBranch : b.name)}</span></h3>`;
        b.floors.forEach((fid, i) => {
          const f = w.floors.get(fid)!;
          const agents = w.floorAgents(fid).sort((x, y) => Number(y.director) - Number(x.director) || x.spawnedAt - y.spawnedAt);
          const open = b.openFloor === fid;
          html += `<div class="ao-floor${open ? ' is-open' : ''}">
            <button type="button" class="ao-floor__btn" data-floor="${esc(fid)}" aria-pressed="${open}" aria-label="${t.floor} ${i + 1}: ${esc(f.projectName)}">
              <span class="ao-floor__n ao-num">${i + 1}</span><span class="ao-floor__name">${esc(f.projectName)}</span>
              <span class="ao-src ao-src--${f.source}">${f.source}</span><span class="ao-floor__count ao-num">${agents.length}</span>
            </button><ul class="ao-agents">`;
          for (const a of agents)
            html += `<li><button type="button" class="ao-agent" data-agent="${esc(a.key)}">
              <span class="ao-dot" aria-hidden="true"></span>
              <span class="ao-agent__name">${esc(a.name)}</span>
              <span class="ao-agent__type">${esc(a.director ? t.director : a.type)}</span>
              <span class="ao-agent__status"></span>
            </button></li>`;
          html += `</ul></div>`;
        });
        html += `</section>`;
      }
      html += `</div>`;
      const scroll = team.querySelector('.ao-team__list')?.scrollTop ?? 0;
      team.innerHTML = html;
      const list = team.querySelector('.ao-team__list');
      if (list) list.scrollTop = scroll;
      if (focusKey) (team.querySelector(focusKey) as HTMLElement | null)?.focus();
    }
    // in-place updates
    const setStat = (id: string, v: string) => {
      const el = team.querySelector(`[data-stat="${id}"]`);
      if (el && el.textContent !== v) el.textContent = v;
    };
    setStat('agents', String(st.activeAgents));
    setStat('calls', String(st.callsWindow));
    setStat('errors', String(st.errorsWindow));
    setStat('tokens', fmtTokens(st.tokens));
    team.querySelectorAll<HTMLButtonElement>('.ao-agent').forEach((btn) => {
      const a = w.agents.get(btn.dataset.agent!);
      if (!a) return;
      const since = Math.max(0, Math.round((now - a.statusSince) / 1000));
      const label = `${t.status[a.status] ?? a.status}${since > 5 ? ` · ${since}s` : ''}`;
      const stEl = btn.querySelector('.ao-agent__status')!;
      if (stEl.textContent !== label) stEl.textContent = label;
      const dot = btn.querySelector<HTMLElement>('.ao-dot')!;
      const c = statusColor(a.status);
      if (dot.style.getPropertyValue('--c') !== c) dot.style.setProperty('--c', c);
      const sel = a.key === selected;
      btn.classList.toggle('is-selected', sel);
      btn.setAttribute('aria-current', String(sel));
      btn.setAttribute('aria-label', `${a.name}, ${a.director ? t.director : a.type}, ${t.status[a.status] ?? a.status}`);
      btn.classList.toggle('is-leaving', a.phase !== 'active' && a.phase !== 'enter');
    });
  }

  // ------------------------------------------------------------- agent card

  function portrait(preset: string): string {
    const tex = scene.atlas.frames(`${preset}/front/idle`)[0];
    if (!tex) return '';
    const src = tex.source.resource as CanvasImageSource;
    const c = document.createElement('canvas');
    c.width = 24 * 4;
    c.height = 36 * 4;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const fr = tex.frame;
    const trim = tex.trim;
    const ox = trim ? trim.x : 0;
    const oy = trim ? trim.y : 0;
    ctx.drawImage(src, fr.x, fr.y, fr.width, fr.height, ox * 4, oy * 4, fr.width * 4, fr.height * 4);
    return c.toDataURL();
  }

  let cardKey = '';
  function renderCard(force = false) {
    const a = selected ? scene.world.agents.get(selected) : undefined;
    if (!a) {
      card.hidden = true;
      cardKey = '';
      return;
    }
    const now = Date.now();
    const key = `${a.key}|${a.status}|${a.tools.length}|${a.tools.at(-1)?.ok}|${a.tokens}|${a.files.length}|${a.dept}|${Math.floor(now / 1000)}|${lang}`;
    if (key === cardKey && !force) return;
    cardKey = key;
    card.hidden = false;
    const f = scene.world.floors.get(a.floorId);
    const parent = a.parentId ? scene.world.agents.get(a.floorId + ':' + a.parentId) : undefined;
    const tools = [...a.tools].reverse().slice(0, 8);
    const since = Math.round((now - a.statusSince) / 1000);
    card.innerHTML = `
      <div class="ao-panel__head"><h2 class="ao-sr">${esc(a.name)}</h2><button type="button" class="ao-iconbtn ao-iconbtn--sm" data-act="close-card" aria-label="${t.close}">${icon('x', 16)}</button></div>
      <div class="ao-card__hero">
        <img class="ao-card__portrait" src="${portrait(a.preset)}" alt="" width="72" height="108" />
        <div>
          <div class="ao-card__name">${esc(a.name)}</div>
          <div class="ao-card__type">${esc(a.director ? t.director : a.type)}</div>
          ${statusChip(a.status)} <span class="ao-card__since ao-num">${since}s</span>
        </div>
      </div>
      <dl class="ao-kv">
        <dt>${t.department}</dt><dd>${esc(t.dept[a.dept] ?? a.dept)}</dd>
        ${a.task ? `<dt>${t.task}</dt><dd>${esc(a.task)}</dd>` : ''}
        ${parent ? `<dt>${t.parent}</dt><dd><button type="button" class="ao-link" data-agent="${esc(parent.key)}">${esc(parent.name)}</button></dd>` : ''}
        <dt>${t.session}</dt><dd>${esc(f?.projectName ?? '')} · <span class="ao-num">${esc(a.sessionId.slice(0, 8))}</span></dd>
      </dl>
      <div class="ao-stats ao-stats--card">
        <div class="ao-stat">${icon('activity', 16)}<span class="ao-num">${a.calls}</span><span class="ao-stat__label">${t.calls.split(' ')[0]}</span></div>
        <div class="ao-stat">${icon('alert', 16)}<span class="ao-num">${a.errors}</span><span class="ao-stat__label">${t.errors}</span></div>
        <div class="ao-stat">${icon('coins', 16)}<span class="ao-num">${fmtTokens(a.tokens)}</span><span class="ao-stat__label">${a.usd ? '$' + a.usd.toFixed(2) : t.tokens}</span></div>
      </div>
      <h3 class="ao-h3">${t.recentCalls}</h3>
      ${tools.length ? `<ol class="ao-calls">${tools.map((c) => `<li class="ao-call ao-call--${c.ok === undefined ? 'run' : c.ok ? 'ok' : 'err'}"><span class="ao-call__name">${esc(c.name)}</span><span class="ao-call__target" title="${esc(c.target ?? '')}">${esc(c.target ?? '')}</span><span class="ao-call__meta ao-num">${c.ok === undefined ? '…' : c.ok ? (c.durationMs !== undefined ? c.durationMs + t.ms : 'ok') : 'ERR'}</span></li>`).join('')}</ol>` : `<p class="ao-muted">${t.noCalls}</p>`}
      ${a.files.length ? `<h3 class="ao-h3">${icon('file', 14)}${t.files}</h3><ul class="ao-files">${a.files.slice(0, 8).map((x) => `<li title="${esc(x)}">${esc(x)}</li>`).join('')}</ul>` : ''}
    `;
  }

  function select(key: string | undefined, focus = false) {
    selected = key;
    scene.selected = key;
    if (key && focus) scene.focusAgent(key);
    else if (key) scene.focusAgent(key, Math.max(2, scene.camera.target.zoom));
    else scene.camera.follow = undefined;
    renderCard(true);
    renderTeam(true);
  }

  // ------------------------------------------------------------- timeline & replay

  /** Feed entry for an event: [icon, text], or undefined for noise we don't show. */
  function describe(e: OfficeEvent): [string, string] | undefined {
    const a = 'agent_id' in e && e.agent_id ? scene.world.agents.get(e.session_id + ':' + e.agent_id) : undefined;
    const who = a ? a.name : '';
    switch (e.type) {
      case 'tool.call':
        return ['chevron', `${who} ${e.name}${e.target ? ' ' + e.target : ''}`];
      case 'tool.result':
        return e.ok ? undefined : ['alert', `${who} ${e.name}: ${t.status.error}`];
      case 'agent.spawn':
        return ['users', `${e.agent_type}`];
      case 'agent.end':
        return ['upload', `${who} ${t.status.done}`];
      case 'task.created':
        return ['layers', e.subject];
      case 'task.completed':
        return ['trophy', e.subject];
      case 'notify':
        return ['alert', e.message ?? e.kind];
      case 'session.start':
        return ['building', e.project?.name ?? 'session'];
      case 'agent.status':
        return e.status === 'waiting_user' ? ['alert', `${who}: ${t.status.waiting_user}`] : undefined;
      default:
        return undefined;
    }
  }

  function chip(e: OfficeEvent): string {
    const d = describe(e);
    if (!d) return '';
    return `<li class="ao-ev ao-ev--${e.type.replace('.', '-')}${e.type === 'tool.result' ? ' ao-ev--err' : ''}"><span class="ao-num">${hhmm(e.ts).slice(0, 5)}</span>${icon(d[0], 13)}<span class="ao-ev__t">${esc(d[1])}</span></li>`;
  }

  function renderTimeline() {
    const items = feed.slice(-7).reverse();
    const span = replay.on ? `${hhmm(replay.T)}` : '';
    const pct = replay.on && replay.t1 > replay.t0 ? ((replay.T - replay.t0) / (replay.t1 - replay.t0)) * 1000 : 1000;
    timeline.innerHTML = `
      <div class="ao-tl__controls">
        <button type="button" class="ao-btn ${replay.on ? '' : 'ao-btn--active'}" data-act="live" aria-pressed="${!replay.on}">${icon('live', 16)}<span>${replay.on ? t.backToLive : t.live}</span></button>
        <button type="button" class="ao-iconbtn" data-act="${replay.on ? 'play' : 'replay-log'}" aria-label="${replay.on && replay.playing ? t.pause : t.replay}">${icon(replay.on && replay.playing ? 'pause' : 'play', 18)}</button>
        <label class="ao-tl__speed"><span class="ao-sr">${t.speed}</span>
          <select id="ao-speed" aria-label="${t.speed}">${[1, 4, 8, 16, 60].map((s) => `<option value="${s}"${replay.speed === s ? ' selected' : ''}>${s}×</option>`).join('')}</select>
        </label>
      </div>
      <input class="ao-range ao-tl__scrub" id="ao-scrub" type="range" min="0" max="1000" value="${Math.round(pct)}" aria-label="${t.timeline}" ${logEvents.length || replay.on ? '' : 'disabled'} />
      <span class="ao-tl__time ao-num">${span}</span>
      <ol class="ao-tl__feed" aria-label="${t.timeline}">${items.map(chip).join('')}</ol>
      <button type="button" class="ao-btn" data-act="import">${icon('upload', 16)}<span>${t.import}</span></button>
      <input type="file" id="ao-file" accept=".jsonl,.json,application/jsonl" hidden />
    `;
    ($('#ao-speed') as HTMLSelectElement).onchange = (e) => (replay.speed = Number((e.target as HTMLSelectElement).value));
    const scrub = $('#ao-scrub') as HTMLInputElement;
    scrub.oninput = () => {
      if (!replay.on) startReplay(logEvents, false, true);
      seek(replay.t0 + (Number(scrub.value) / 1000) * (replay.t1 - replay.t0));
    };
    ($('#ao-file') as HTMLInputElement).onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void importFile(file);
    };
    renderPills();
  }

  function seek(T: number) {
    replay.T = T;
    scene.world.reset();
    const upto = replay.events.filter((e) => e.ts <= T);
    replay.idx = upto.length;
    scene.world.applyAll(upto, T);
    scene.clock = () => replay.T;
  }

  function startReplay(events: OfficeEvent[], imported: boolean, paused = false) {
    if (!events.length) return;
    const sorted = [...events].sort((a, b) => a.ts - b.ts);
    replay.on = true;
    replay.imported = imported;
    replay.events = sorted;
    replay.t0 = sorted[0]!.ts - 500;
    replay.t1 = imported ? sorted[sorted.length - 1]!.ts + 3000 : Math.max(Date.now(), sorted[sorted.length - 1]!.ts);
    replay.playing = !paused;
    seek(replay.t0);
    renderTimeline();
  }

  function togglePlay() {
    if (!replay.on) return startReplay(logEvents, false);
    replay.playing = !replay.playing;
    renderTimeline();
  }

  function goLive() {
    if (!replay.on) return;
    replay.on = false;
    replay.playing = false;
    scene.clock = undefined;
    scene.world.reset();
    scene.world.applyAll(logEvents, Date.now());
    renderTimeline();
  }

  async function importFile(file: File) {
    const text = await file.text();
    const events = validateEvents(transcriptToEvents(text)).ok;
    if (!events.length) {
      toast(icon('alert', 16) + (lang === 'ru' ? 'Не удалось прочитать транскрипт' : 'Could not read that transcript'));
      return;
    }
    toast(icon('upload', 16) + `${file.name}: ${events.length}`);
    startReplay(events, true);
    scene.focusHQ();
  }

  // drag & drop import
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    dragDepth++;
    $('#ao-drop-text').textContent = t.dropHere;
    drop.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) drop.hidden = true;
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    drop.hidden = true;
    const f = e.dataTransfer?.files?.[0];
    if (f) void importFile(f);
  });

  // ------------------------------------------------------------- toasts, tips, modals

  function toast(html: string, cls = '') {
    const el = document.createElement('div');
    el.className = 'ao-toast ' + cls;
    el.innerHTML = html;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('is-leaving'), 4200);
    setTimeout(() => el.remove(), 4600);
    while (toasts.children.length > 4) toasts.firstElementChild?.remove();
  }
  scene.world.onAchievement = (a: Achievement) => {
    toast(`${icon('trophy', 18)}<div><b>${t.unlocked}</b><span>${esc(a.title[lang])}</span></div>`, 'ao-toast--trophy');
    audio.pop();
  };
  scene.onSound = (k) => {
    if (k === 'bell') audio.bell();
    else if (k === 'ding') audio.ding();
    else if (k === 'confetti') audio.pop();
  };

  function hover(key: string | undefined, x: number, y: number) {
    const a = key ? scene.world.agents.get(key) : undefined;
    if (!a) {
      tip.hidden = true;
      return;
    }
    const last = a.tools.at(-1);
    tip.innerHTML = `<b>${esc(a.name)}</b> <span class="ao-muted">${esc(a.director ? t.director : a.type)}</span><br>${statusChip(a.status)}${last ? `<div class="ao-tip__last">${esc(last.name)} ${esc(last.target ?? '')}</div>` : ''}`;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.transform = `translate(${Math.min(window.innerWidth - r.width - 8, x + 14)}px, ${Math.max(8, y - r.height - 10)}px)`;
  }

  let lastFocus: HTMLElement | null = null;
  function openModal(title: string, body: string, footer = '') {
    lastFocus = document.activeElement as HTMLElement;
    modal.innerHTML = `<div class="ao-modal__scrim" data-act="close-modal"></div>
      <div class="ao-modal__box" role="dialog" aria-modal="true" aria-labelledby="ao-modal-title">
        <div class="ao-panel__head"><h2 id="ao-modal-title">${title}</h2><button type="button" class="ao-iconbtn ao-iconbtn--sm" data-act="close-modal" aria-label="${t.close}">${icon('x', 16)}</button></div>
        <div class="ao-modal__body">${body}</div>${footer ? `<div class="ao-modal__foot">${footer}</div>` : ''}
      </div>`;
    modal.hidden = false;
    (modal.querySelector('input,select,button:not([data-act="close-modal"])') as HTMLElement | null)?.focus();
  }
  function closeModal() {
    modal.hidden = true;
    modal.innerHTML = '';
    lastFocus?.focus();
  }

  function openHelp() {
    const rows: [string, string][] = [
      ['N', t.kN],
      ['F', t.kF],
      ['← ↑ → ↓ / WASD', t.kArrows],
      ['+ / −', t.kZoom],
      ['L', t.kL],
      ['Space', t.kSpace],
      ['P', t.kP],
      ['H', t.kH],
      ['Esc', t.kEsc],
    ];
    openModal(t.shortcuts, `<dl class="ao-keys">${rows.map(([k, v]) => `<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('')}</dl>`);
  }

  function openSettings() {
    const c = config;
    const sel = (id: string, label: string, opts: [string, string][], val: string) =>
      `<label class="ao-field"><span>${label}</span><select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    const chk = (id: string, label: string, on: boolean) => `<label class="ao-check"><input type="checkbox" id="${id}"${on ? ' checked' : ''} /><span>${label}</span></label>`;
    const ach = scene.world.achievements;
    const a = selected ? scene.world.agents.get(selected) : undefined;
    const presets = scene.atlas.manifest.char.presets;
    const body = `
      <div class="ao-form">
        ${sel('s-lang', t.language, [['auto', 'Auto'], ['ru', 'Русский'], ['en', 'English']], String(c.lang ?? 'auto'))}
        <label class="ao-field"><span>${t.cycle}</span><input id="s-cycle" type="number" min="1" max="1440" value="${Number(c.dayCycleMinutes ?? 15)}" /></label>
        ${sel('s-quality', t.quality, [['auto', t.qualityNames.auto!], ['high', t.qualityNames.high!], ['low', t.qualityNames.low!]], String(c.quality ?? 'auto'))}
        ${sel('s-fps', t.fps, [['60', '60'], ['30', '30'], ['15', '15']], String(c.fpsCap ?? 60))}
        <label class="ao-field"><span>${t.uiScale}</span><input id="s-scale" type="range" min="0.75" max="1.5" step="0.05" value="${Number(c.uiScale ?? 1)}" /></label>
        ${sel('s-motion', t.reducedMotion, [['auto', lang === 'ru' ? 'Как в системе' : 'Follow system'], ['on', lang === 'ru' ? 'Включено' : 'On'], ['off', lang === 'ru' ? 'Выключено' : 'Off']], String(c.reducedMotion ?? 'auto'))}
        ${chk('s-cb', t.colorblind, !!c.colorblind)}
        ${chk('s-season', t.seasonal, c.seasonal !== false)}
        ${chk('s-health', t.healthWeather, c.weatherFollowsHealth !== false)}
        ${
          a && !a.director
            ? `<fieldset class="ao-field ao-field--wide"><legend>${t.appearance}: ${esc(a.name)}</legend><div class="ao-wardrobe">${presets
                .filter((p) => !p.startsWith('npc') && p !== 'director')
                .map((p) => `<button type="button" class="ao-ward${p === a.preset ? ' is-on' : ''}" data-preset="${p}" aria-pressed="${p === a.preset}"><img src="${portrait(p)}" alt="${p}" width="24" height="36" /></button>`)
                .join('')}</div></fieldset>`
            : ''
        }
      </div>
      <h3 class="ao-h3">${icon('trophy', 14)}${t.achievements}</h3>
      <ul class="ao-ach">${ach.map((x) => `<li class="${x.unlockedAt ? 'is-on' : ''}">${icon('trophy', 14)}<span>${esc(x.title[lang])}</span></li>`).join('')}</ul>`;
    openModal(t.settings, body, `<button type="button" class="ao-btn" data-act="close-modal">${t.cancel}</button><button type="button" class="ao-btn ao-btn--primary" id="s-save">${t.save}</button>`);
    modal.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) =>
      b.addEventListener('click', () => {
        const ag = selected ? scene.world.agents.get(selected) : undefined;
        if (!ag) return;
        ag.preset = b.dataset.preset!;
        const cust = { ...((config.customization as Record<string, unknown>) ?? {}), [ag.type]: { preset: ag.preset } };
        config.customization = cust;
        modal.querySelectorAll('.ao-ward').forEach((x) => x.classList.toggle('is-on', x === b));
      }),
    );
    $('#s-save').addEventListener('click', () => {
      const v = (id: string) => (modal.querySelector('#' + id) as HTMLInputElement).value;
      const k = (id: string) => (modal.querySelector('#' + id) as HTMLInputElement).checked;
      saveConfig({
        lang: v('s-lang'),
        dayCycleMinutes: Math.max(1, Math.min(1440, Number(v('s-cycle')) || 15)),
        quality: v('s-quality'),
        fpsCap: Number(v('s-fps')),
        uiScale: Number(v('s-scale')),
        reducedMotion: v('s-motion'),
        colorblind: k('s-cb'),
        seasonal: k('s-season'),
        weatherFollowsHealth: k('s-health'),
        customization: config.customization ?? {},
      });
      closeModal();
      toast(icon('settings', 16) + t.saved);
    });
  }

  async function photo() {
    const data = await scene.snapshot();
    const a = document.createElement('a');
    a.href = data;
    a.download = `agent-office-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    a.click();
  }

  function toggleUI() {
    uiHidden = !uiHidden;
    document.documentElement.classList.toggle('ao-ui-hidden', uiHidden);
    scene.setConfig({ showUI: !uiHidden });
  }

  // ------------------------------------------------------------- minimap

  const miniBg = document.createElement('canvas');
  const mw = mini.width;
  const mh = mini.height;
  const city = scene.city;
  const spanX = isoX(city.w, 0) - isoX(0, city.h);
  const spanY = isoY(city.w, city.h) - isoY(0, 0) + 320;
  const ms = Math.min(mw / spanX, mh / spanY) * 0.98;
  const mox = mw / 2 - (isoX(city.w / 2, city.h / 2)) * ms;
  const moy = mh / 2 - (isoY(city.w / 2, city.h / 2) - 160) * ms;
  const toMini = (tx: number, ty: number, z = 0): [number, number] => [mox + isoX(tx, ty) * ms, moy + isoY(tx, ty, z) * ms];
  {
    miniBg.width = mw;
    miniBg.height = mh;
    const g = miniBg.getContext('2d')!;
    const col = (tname: string) =>
      tname.startsWith('water') ? '#3f6f8c' : tname.startsWith('grass') ? '#7aa35a' : tname.startsWith('asphalt') || tname === 'parking' || tname === 'crosswalk' ? '#4b4a57' : tname === 'rail' ? '#8a8279' : tname === 'sand' ? '#d6bf95' : '#b9ad9f';
    for (let y = 0; y < city.h; y++)
      for (let x = 0; x < city.w; x++) {
        const [a, b] = toMini(x, y);
        const [c, d] = toMini(x + 1, y + 1);
        g.fillStyle = col(city.tileAt(x, y));
        g.fillRect(Math.floor(a - (a - c) / 2) - 1, Math.floor(b), Math.ceil(Math.abs(c - a)) + 2, Math.ceil(d - b) + 1);
      }
  }
  mini.addEventListener('click', (e) => {
    const r = mini.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * mw;
    const my = ((e.clientY - r.top) / r.height) * mh;
    scene.camera.follow = undefined;
    scene.camera.set((mx - mox) / ms, (my - moy) / ms);
  });
  function drawMini() {
    const g = mini.getContext('2d')!;
    g.clearRect(0, 0, mw, mh);
    g.drawImage(miniBg, 0, 0);
    for (const b of scene.world.buildings.values()) {
      const pts = [toMini(b.lot[0], b.lot[1]), toMini(b.lot[0] + FLOOR_W, b.lot[1]), toMini(b.lot[0] + FLOOR_W, b.lot[1] + FLOOR_D), toMini(b.lot[0], b.lot[1] + FLOOR_D)];
      g.fillStyle = b.cloud ? '#9fb8e8' : '#e9dcc6';
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    }
    for (const a of scene.world.agents.values()) {
      const f = scene.world.floors.get(a.floorId);
      const b = f && scene.world.buildings.get(f.buildingId);
      if (!b) continue;
      const [x, y] = toMini(b.lot[0] + a.pos[0], b.lot[1] + a.pos[1]);
      g.fillStyle = statusColor(a.status);
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    const cam = scene.camera;
    const [x0, y0] = cam.screenToWorld(0, 0);
    const [x1, y1] = cam.screenToWorld(cam.w, cam.h);
    g.strokeStyle = '#f2a65a';
    g.lineWidth = 1.5;
    g.strokeRect(mox + x0 * ms, moy + y0 * ms, (x1 - x0) * ms, (y1 - y0) * ms);
  }

  // ------------------------------------------------------------- keyboard

  function key(e: KeyboardEvent) {
    // Escape always closes the dialog, even when focus is inside one of its fields
    if (!modal.hidden && e.key === 'Escape') return closeModal();
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (!modal.hidden) return;
    const cam = scene.camera;
    switch (e.key) {
      case 'n':
      case 'N': {
        const order = ['day', 'night', 'auto'];
        saveConfig({ dayMode: order[(order.indexOf((config.dayMode as string) ?? 'auto') + 1) % 3] });
        break;
      }
      case 'f':
      case 'F':
        scene.fitAll();
        break;
      case 'h':
      case 'H':
        toggleUI();
        break;
      case 'p':
      case 'P':
        void photo();
        break;
      case 'l':
      case 'L':
        (team.querySelector('button') as HTMLElement | null)?.focus();
        break;
      case ' ':
        if (replay.on) {
          e.preventDefault();
          togglePlay();
        }
        break;
      case 'Escape':
        select(undefined);
        break;
      case '+':
      case '=':
        cam.zoomAt(1.25, cam.w / 2, cam.h / 2);
        break;
      case '-':
      case '_':
        cam.zoomAt(0.8, cam.w / 2, cam.h / 2);
        break;
      case 'ArrowLeft':
      case 'a':
        cam.pan(60, 0);
        break;
      case 'ArrowRight':
      case 'd':
        cam.pan(-60, 0);
        break;
      case 'ArrowUp':
      case 'w':
        cam.pan(0, 60);
        break;
      case 'ArrowDown':
      case 's':
        cam.pan(0, -60);
        break;
      default:
        return;
    }
  }

  // ------------------------------------------------------------- loop

  let lastT = performance.now();
  let slow = 0;
  function loop() {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    lastT = now;
    if (replay.on && replay.playing) {
      const next = replay.T + dt * 1000 * replay.speed;
      while (replay.idx < replay.events.length && replay.events[replay.idx]!.ts <= next) scene.world.apply(replay.events[replay.idx++]!);
      replay.T = next;
      if (replay.T >= replay.t1) {
        if (!replay.imported) goLive();
        else replay.playing = false;
        renderTimeline();
      }
    }
    slow += dt;
    if (slow > 0.25) {
      slow = 0;
      renderTeam();
      renderCard();
      drawMini();
      const d = scene.day;
      ($('#ao-time') as HTMLElement).textContent = `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}`;
      ($('#ao-phase') as HTMLElement).textContent = d.phase === 'night' ? t.nightPhase : d.phase === 'dawn' ? t.dawn : d.phase === 'dusk' ? t.dusk : t.dayPhase;
      if (document.activeElement !== slider) slider.value = String(Math.round(d.t * 1000));
      if (replay.on) {
        const tEl = timeline.querySelector('.ao-tl__time');
        if (tEl) tEl.textContent = hhmm(replay.T);
        const sc = timeline.querySelector('#ao-scrub') as HTMLInputElement | null;
        if (sc && document.activeElement !== sc) sc.value = String(Math.round(((replay.T - replay.t0) / Math.max(1, replay.t1 - replay.t0)) * 1000));
      }
      audio.setNight(d.night, scene.weatherNow === 'rain');
      const typing = [...scene.world.agents.values()].some((a) => a.anim === 'type');
      if (typing && Math.random() < 0.6) audio.click();
      const banners: string[] = [];
      if (scene.deadline) banners.push(`${icon('alert', 16)}${t.deadline}`);
      if (state === 'no-token') banners.push(`${icon('link', 16)}${t.noTokenHint}`);
      banner.hidden = !banners.length;
      banner.innerHTML = banners.join(' · ');
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  try {
    config = JSON.parse(localStorage.getItem('ao-ui') ?? '{}');
  } catch {
    config = {};
  }
  push();
  reducedMq.addEventListener('change', push);

  return {
    applyConfig(c) {
      config = { ...config, ...c };
      push();
    },
    setDemo(on) {
      demo = on;
      renderPills();
      renderTeam(true);
    },
    setLink(l) {
      link = l;
      scene.relayState = l.relay;
      renderPills();
    },
    setState(s) {
      state = s;
      renderPills();
      renderTeam(true);
    },
    resetLog(events) {
      logEvents = [...events];
      feed.length = 0;
      for (const e of events.slice(-40)) if (describe(e)) feed.push(e);
      renderTimeline();
    },
    log(e) {
      logEvents.push(e);
      if (logEvents.length > 20000) logEvents.splice(0, 5000);
      if (e.type === 'notify' && e.kind === 'permission_prompt') {
        const a = e.agent_id ? scene.world.agents.get(e.session_id + ':' + e.agent_id) : undefined;
        toast(`${icon('alert', 16)}<div><b>${esc(a?.name ?? t.director)}</b><span>${t.status.waiting_user}</span></div>`, 'ao-toast--warn');
      }
      if (describe(e)) {
        feed.push(e);
        if (feed.length > 60) feed.shift();
        const list = timeline.querySelector('.ao-tl__feed');
        if (list) list.innerHTML = feed.slice(-7).reverse().map(chip).join('');
      }
    },
    get replaying() {
      return replay.on;
    },
    hover,
    select: (k) => select(k, true),
    key,
  };
}

export type { Agent };
