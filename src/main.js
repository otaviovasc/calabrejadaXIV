import { GAME, INPUT } from "./config.js";
import { COLORS, LANE_PATTERN } from "../assets/definitions.js";
import { artReady, PICKUPS, VEHICLES } from "./art.js";
import { renderScene, trafficBounds } from "./renderer.js";
import { isGrass } from "./terrain.js";
import { Engine } from "./engine.js";
import { AudioKit } from "./audio.js";
import { GameEffects } from "./effects.js";
import { ui, capturePlayer, setRunStats, showReady, showGameOver, showRuntimeError } from "./ui.js";
const audio = new AudioKit();
let best = Number(localStorage.getItem("cluckrun-best") || 0);
ui.best.textContent = best;
class GameScene {
  constructor() {
    this.effects = new GameEffects({ reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false });
    this.queuedMove = null;
    this.mode = "ready";
    this.assetsLoaded = typeof Image === "undefined";
    this.elapsed = 0;
    this.vehicleIndex = 0;
    this.pickupIndex = 0;
    this.rows = new Map();
    this.cars = [];
    this.score = 0;
    this.crossed = 0;
    this.furthestLane = 0;
    this.collectedGrainLanes = new Set();
    this.playerLane = 0;
    this.playerX = GAME.width / 2;
    this.playerY = GAME.startY;
    this.playerScale = 1;
    this.playerRotation = 0;
    this.playerAlpha = 1;
    this.hop = 0;
    this.worldProgress = 0;
    this.cooldown = 0;
    this.cooldownDuration = 0;
    this.step = null;
    this.message = "";
    this.messageAlpha = 0;
    this.messageY = 190;
    this.flash = 0;
    this.cameraShake = 0;
    this.runId = 0;
    this.engine = null;
    this.roadStreak = 0;
    this.bankedGrain = 0;
    this.lastMilestone = 0;
    this.seed = 1;
    this.lastLaneKind = "start";
  }
  attach(engine2) {
    this.engine = engine2;
    this.seedRows();
    this.draw(engine2.ctx);
  }
  seedRows() {
    for (let lane = -GAME.lanesBehind; lane < GAME.lanesAhead; lane++) this.ensureLane(lane);
  }
  random() {
    this.seed = Math.imul(this.seed, 1664525) + 1013904223 >>> 0;
    return this.seed / 4294967296;
  }
  difficultyAt(lane) {
    const progress = Math.max(0, lane);
    return { speed: Math.min(LANE_PATTERN.difficulty.maxSpeedMultiplier, 1 + progress * LANE_PATTERN.difficulty.speedPerTile), trafficChance: Math.min(LANE_PATTERN.difficulty.maxTrafficChance, LANE_PATTERN.difficulty.trafficChanceStart + progress * LANE_PATTERN.difficulty.trafficChancePerTile), extraCars: Math.min(LANE_PATTERN.difficulty.maxCarsPerLane - 1, Math.floor(Math.max(0, progress - LANE_PATTERN.difficulty.extraCarStart) / LANE_PATTERN.difficulty.extraCarEvery)) };
  }
  ensureLane(lane) {
    if (this.rows.has(lane)) return this.rows.get(lane);
    let kind = "road";
    if (lane <= 0) kind = "start";
    else if (lane <= LANE_PATTERN.safeStartLanes) kind = lane === LANE_PATTERN.safeStartLanes ? "sidewalk" : "road";
    else {
      const run = this.roadStreak, forceSafe = run >= LANE_PATTERN.maxRoadStreak, forceRoad = this.lastLaneKind === "rest" && this.random() < 0.24;
      kind = forceSafe ? "sidewalk" : forceRoad ? "road" : this.random() < this.difficultyAt(lane).trafficChance ? "road" : this.random() < 0.22 ? "rest" : "sidewalk";
    }
    if (lane >= LANE_PATTERN.river.firstLane) {
      const previous = this.rows.get(lane - 1);
      if (previous?.kind === "water") kind = previous.riverDepth < this.riverDifficulty(lane).maxRows && this.random() < 0.38 ? "water" : "sidewalk";
      else if (previous?.kind === "sidewalk" || previous?.kind === "rest") {
        if (this.random() < LANE_PATTERN.river.chance) kind = "water";
      }
    }
    const row = { lane, kind, cars: [], logs: [], trees: [], grain: null };
    if (kind === "water") {
      row.riverDepth = (this.rows.get(lane - 1)?.riverDepth || 0) + 1;
      this.createLogs(row);
    }
    if (kind === "road") this.createTraffic(row);
    if ((kind === "sidewalk" || kind === "rest") && lane >= 4 && (lane === 4 || this.random() < LANE_PATTERN.pickups.landChance)) row.grain = { x: null, collected: false };
    if ((kind === "sidewalk" || kind === "rest") && lane > 0) this.createTrees(row);
    if (row.grain && kind !== "water") {
      const openSlots = [84, 132, 180, 228, 276].filter((x) => !row.trees.some((tree) => Math.abs(tree.x - x) < 24));
      if (openSlots.length) row.grain.x = lane === 4 ? 180 : openSlots[Math.floor(this.random() * openSlots.length)];
      else row.grain = null;
    }
    if (row.grain) row.grain.type = this.pickupIndex++ % PICKUPS.length;
    if (row.grain && this.collectedGrainLanes.has(lane)) row.grain.collected = true;
    if (lane > 0) {
      this.roadStreak = kind === "road" ? this.roadStreak + 1 : 0;
      this.lastLaneKind = kind;
    }
    this.rows.set(lane, row);
    return row;
  }
  riverDifficulty(lane) {
    const progress = Math.max(0, lane - LANE_PATTERN.river.firstLane);
    return { speed: Math.min(58, 24 + progress * 0.22), width: Math.max(100, 148 - progress * 0.28), gap: Math.min(66, 42 + progress * 0.12), maxRows: lane < 35 ? 1 : lane < 80 ? 2 : 3 };
  }
  createLogs(row) {
    const difficulty = this.riverDifficulty(row.lane), direction = this.random() < 0.5 ? 1 : -1, spacing = difficulty.width + difficulty.gap, count = Math.ceil(GAME.width / spacing) + 2, phase = this.random() * spacing;
    row.logCycle = count * spacing;
    row.logSpeed = direction * difficulty.speed;
    for (let i = 0; i < count; i++) row.logs.push({ x: -spacing + phase + i * spacing, width: difficulty.width, speed: row.logSpeed });
    if (this.random() < LANE_PATTERN.river.grainChance) {
      const log = row.logs[Math.floor(this.random() * row.logs.length)];
      row.grain = { x: log.x, log, collected: false };
    }
  }
  supportingLog(row, x = this.playerX) {
    return row.logs?.find((log) => Math.abs(log.x - x) <= log.width / 2 - 10);
  }
  collectGrain(row) {
    if (!row?.grain || row.grain.collected || Math.abs(this.playerX - row.grain.x) >= 24) return false;
    row.grain.collected = true;
    this.collectedGrainLanes.add(row.lane);
    const item = PICKUPS[row.grain.type ?? 0];
    this.bankedGrain++;
    this.score++;
    this.showMessage(this.bankedGrain === 16 ? "16 ITENS · DESAFIO CONCLUÍDO!" : `${item.name} · ${this.bankedGrain}/16`);
    if (this.bankedGrain === 16) {
      this.effects.celebrate();
      audio.play("victory");
    } else audio.checkpoint();
    this.updateScore();
    return true;
  }
  updateLogs(delta) {
    for (const row of this.rows.values()) {
      if (row.kind !== "water") continue;
      const riding = !this.step && this.playerLane === row.lane ? this.supportingLog(row) : null;
      for (const log of row.logs) {
        log.x += log.speed * delta;
        if (log.speed > 0 && log.x - log.width / 2 > GAME.width) log.x -= row.logCycle;
        if (log.speed < 0 && log.x + log.width / 2 < 0) log.x += row.logCycle;
      }
      if (row.grain?.log) row.grain.x = row.grain.log.x;
      if (riding) this.playerX += riding.speed * delta;
    }
  }
  checkWater() {
    const row = this.rows.get(this.playerLane);
    if (row?.kind === "water" && (!this.supportingLog(row) || this.playerX < 10 || this.playerX > GAME.width - 10)) {
      this.die("splash");
      return false;
    }
    return true;
  }
  createTrees(row) {
    if (!isGrass(row.kind)) { row.trees = []; return; }
    const slots = [84, 132, 228, 276], seeded = slots.map((x) => ({ x, sort: this.random() })).sort((a, b) => a.sort - b.sort), count = this.random() < 0.72 ? 1 : 2;
    row.trees = seeded.slice(0, count).map((item) => ({ x: item.x }));
  }
  createTraffic(row) {
    const difficulty = this.difficultyAt(row.lane), direction = this.random() < 0.5 ? 1 : -1, types = LANE_PATTERN.vehicleTypes, count = Math.min(LANE_PATTERN.difficulty.maxCarsPerLane, 1 + difficulty.extraCars + (this.random() < Math.min(0.5, difficulty.extraCars * 0.28) ? 1 : 0)), cars = [];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(this.random() * types.length)], speed = (LANE_PATTERN.carSpeedBase + this.random() * LANE_PATTERN.carSpeedVariance) * type.speed * difficulty.speed, gap = LANE_PATTERN.carGapMin + this.random() * (LANE_PATTERN.carGapMax - LANE_PATTERN.carGapMin), firstX = row.lane <= 3 ? direction > 0 ? -type.width : GAME.width + type.width : this.random() * GAME.width, car = { x: firstX + (direction > 0 ? -i * gap : i * gap), speed: direction * speed, width: type.width, color: COLORS.cars[Math.floor(this.random() * COLORS.cars.length)], lane: row.lane, type: type.name, sponsor: VEHICLES[this.vehicleIndex++ % VEHICLES.length], travelled:0, motionPhase:row.lane*1.618+i*2.399 };
      cars.push(car);
    }
    // One cruise speed per lane prevents fast followers from being pushed
    // backwards every frame by the spacing correction.
    const cruise=direction*Math.min(...cars.map(car=>Math.abs(car.speed)));
    for(const car of cars)car.speed=cruise;
    for (let i = 0; i < cars.length; i++) {
      const current = cars[i], previous = cars[(i + cars.length - 1) % cars.length];
      if (i && Math.abs(current.x - previous.x) < (current.width + previous.width) / 2 + 26) current.x = previous.x + direction * ((current.width + previous.width) / 2 + 26);
      row.cars.push(current);
      this.cars.push(current);
    }
  }
  keepTrafficSpaced(row) {
    if (row.cars.length < 2) return;
    const direction = Math.sign(row.cars[0].speed);
    for (let pass = 0; pass < row.cars.length; pass++) {
      const cars = [...row.cars].sort((a, b) => a.x - b.x);
      for (let i = 1; i < cars.length; i++) {
        const rear = direction > 0 ? cars[i - 1] : cars[i], front = direction > 0 ? cars[i] : cars[i - 1], minimum = (rear.width + front.width) / 2 + 22, gap = direction > 0 ? front.x - rear.x : rear.x - front.x;
        if (gap < minimum) rear.x -= direction * (minimum - gap);
      }
    }
  }
  start() {
    if (!this.assetsLoaded || !capturePlayer()) return;
    audio.start();
    syncSoundButton();
    this.effects.reset();
    this.queuedMove = null;
    this.runId++;
    this.elapsed = 0;
    this.vehicleIndex = 0;
    this.pickupIndex = 0;
    this.seed = Math.random() * 4294967296 >>> 0;
    this.roadStreak = 0;
    this.lastLaneKind = "start";
    this.engine.clearTweens(this);
    this.rows.clear();
    this.cars.length = 0;
    this.score = 0;
    this.crossed = 0;
    this.furthestLane = 0;
    this.collectedGrainLanes.clear();
    this.playerLane = 0;
    this.playerX = GAME.width / 2;
    this.playerY = GAME.startY;
    this.playerScale = 1;
    this.playerRotation = 0;
    this.playerAlpha = 1;
    this.hop = 0;
    this.worldProgress = 0;
    this.cooldown = 0;
    this.cooldownDuration = 0;
    this.step = null;
    this.messageAlpha = 0;
    this.bankedGrain = 0;
    this.lastMilestone = 0;
    this.seedRows();
    this.mode = "playing";
    setRunStats(0, best, 0, 0);
    showReady();
    audio.play("start");
  }
  move(dir) {
    if (this.mode !== "playing" || !["up", "down", "left", "right"].includes(dir)) return;
    // Keep just the latest intent, never a chain of automatic future hops.
    if (this.step) { this.queuedMove = dir; return; }
    let to = this.playerLane, x = this.playerX;
    if (dir === "up") to++;
    if (dir === "down") to = Math.max(0, to - 1);
    if (dir === "left") x = Math.max(28, x - 48);
    if (dir === "right") x = Math.min(GAME.width - 28, x + 48);
    if (to === this.playerLane && x === this.playerX) return;
    const row = this.ensureLane(to);
    if (row.trees.some((tree) => Math.abs(tree.x - x) < 21)) {
      this.showMessage("CUIDADO COM A ÁRVORE!");
      return;
    }
    const duration = (dir === "up" ? GAME.moveDuration : GAME.sideMoveDuration) / 1e3;
    this.cooldown = duration;
    this.cooldownDuration = duration;
    this.step = { fromLane: this.playerLane, toLane: to, fromX: this.playerX, toX: x, fromProgress: this.worldProgress, toProgress: to, elapsed: 0, duration, dir, row, drift: this.rows.get(this.playerLane)?.kind === "water" ? this.supportingLog(this.rows.get(this.playerLane))?.speed || 0 : 0 };
    this.playerScale = 1;
    audio.play(row.kind === "water" ? "wood" : "step");
  }
  finishStep() {
    const step = this.step;
    if (!step || this.mode !== "playing") return;
    this.worldProgress = step.toProgress;
    this.playerLane = step.toLane;
    this.playerX = step.toX;
    this.playerY = GAME.startY;
    this.hop = 0;
    this.playerScale = 1;
    this.step = null;
    this.cooldown = 0;
    if (!this.checkWater()) return;
    this.effects.landing(this.playerX, this.playerLane, step.row.kind);
    const advanced = step.dir === "up" && step.toLane > this.furthestLane;
    if (advanced) {
      this.furthestLane = step.toLane;
      this.crossed = this.furthestLane;
      this.score++;
    }
    const collected = this.collectGrain(step.row);
    if (advanced || step.row.grain?.collected) this.updateScore();
    if (advanced && !(collected && this.bankedGrain === 16)) this.milestone();
    this.pruneRows();
    const queued = this.queuedMove;
    this.queuedMove = null;
    if (queued) this.move(queued);
  }
  updateScore() {
    if (this.score > best) {
      best = this.score;
      localStorage.setItem("cluckrun-best", String(best));
    }
    setRunStats(this.score, best, this.crossed, this.bankedGrain);
  }
  milestone() {
    const mark = Math.floor(this.crossed / 10);
    if (mark > this.lastMilestone) {
      this.lastMilestone = mark;
      this.showMessage(`${mark * 10} CASAS · CONTINUE!`);
      audio.checkpoint();
    }
  }
  showMessage(text) {
    this.message = text;
    this.messageAlpha = 1;
    this.messageY = 113;
    this.engine.clearTweens(this, "messageAlpha");
    this.engine.tween(this, { messageAlpha: 0, messageY: 89 }, 0.9, "out");
  }
  laneY(lane) {
    return GAME.startY - (lane - this.worldProgress) * GAME.laneStep;
  }
  collides(row, x, y) {
    return row.cars.some((car) => Math.abs(car.x - x) < car.width * 0.43 + 10 && Math.abs(y - this.laneY(row.lane)) < GAME.laneHeight * 0.43);
  }
  die(cause = "hit") {
    if (this.mode !== "playing") return;
    this.mode = "dead";
    this.queuedMove = null;
    this.step = null;
    this.cooldown = 0;
    audio.play(cause);
    audio.update(this);
    this.cameraShake = 1;
    this.flash = 0.4;
    this.playerRotation = 0;
    this.playerAlpha = 1;
    this.engine.clearTweens(this);
    this.engine.tween(this, { flash: 0, cameraShake: 0 }, 0.45, "out");
    this.engine.tween(this, { playerRotation: 0.9, playerAlpha: 0.35, playerScale: 0.72 }, 0.43, "inout");
    const id = this.runId;
    setTimeout(() => {
      if (id === this.runId && this.mode === "dead") showGameOver(this.score, this.crossed, this.bankedGrain);
    }, 650);
  }
  pruneRows() {
    for (const [lane, row] of this.rows) {
      if (lane < this.playerLane - GAME.lanesBehind) {
        this.rows.delete(lane);
        for (const car of row.cars) {
          const i = this.cars.indexOf(car);
          if (i >= 0) this.cars.splice(i, 1);
        }
      }
    }
    for (let lane = this.playerLane - GAME.lanesBehind; lane < this.playerLane + GAME.lanesAhead; lane++) this.ensureLane(lane);
  }
  update(delta) {
    audio.update(this);
    this.effects.update(delta);
    if (this.mode === "ready" || this.mode === "dead") return;
    this.elapsed += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.updateLogs(delta);
    if (!this.step) {
      if (!this.checkWater()) return;
      this.collectGrain(this.rows.get(this.playerLane));
    }
    if (this.step) {
      const step = this.step;
      const travel = Math.min(delta, step.duration - step.elapsed);
      step.fromX += step.drift * travel;
      step.toX += step.drift * travel;
      step.elapsed = Math.min(step.duration, step.elapsed + delta);
      const p = step.elapsed / step.duration, e = 1 - Math.pow(1 - p, 3);
      this.worldProgress = step.fromProgress + (step.toProgress - step.fromProgress) * e;
      this.playerX = step.fromX + (step.toX - step.fromX) * e;
      this.hop = -Math.sin(p * Math.PI) * (step.dir === "up" ? 13 : step.dir === "down" ? 8 : 5);
      this.playerScale = 1 + Math.sin(p * Math.PI) * 0.1;
    }
    for (const car of this.cars) {
      car.travelled=(car.travelled??0)+Math.abs(car.speed)*delta;
      car.x+=car.speed*delta;
      const bounds=trafficBounds(car,this.worldProgress);
      const others=this.rows.get(car.lane)?.cars.filter(other=>other!==car)||[];
      if(car.speed>0&&car.x>bounds.right){
        car.x=Math.min(bounds.left,...others.map(other=>other.x-(car.width+other.width)/2-34));
      }
      if(car.speed<0&&car.x<bounds.left){
        car.x=Math.max(bounds.right,...others.map(other=>other.x+(car.width+other.width)/2+34));
      }
    }
    for (const row of this.rows.values()) if (row.kind === "road") this.keepTrafficSpaced(row);
    for (const car of this.cars) {
      const row = this.rows.get(car.lane);
      if (this.mode === "playing" && row && row.kind === "road" && this.collides(row, this.playerX, this.playerY)) {
        this.die();
        return;
      }
    }
    if (this.step && this.step.elapsed >= this.step.duration) this.finishStep();
  }
  draw(ctx) {
    renderScene(ctx, this);
  }
  onKey(event) {
    if (event.target?.matches?.("input,textarea,select") || !this.assetsLoaded || event.target?.matches?.("button:not([data-move]),a") && (event.key === "Enter" || event.key === " ")) return;
    const dir = INPUT.keys[event.key];
    if (dir) {
      event.preventDefault();
      if (this.mode === "ready") this.start();
      this.move(dir);
    } else if ((event.key === "Enter" || event.key === " ") && this.mode !== "playing") {
      event.preventDefault();
      this.start();
    }
  }
}
const canvas = document.querySelector("#game-canvas"), scene = new GameScene(), engine = new Engine(canvas, scene, GAME.width, GAME.height);
const isMobile = window.matchMedia?.("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const fullscreenTarget = document.documentElement;
const fullscreenButtons = document.querySelectorAll("[data-fullscreen]");
const fullscreenStatus = document.querySelector("#fullscreen-status");
const activeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
function updateFullscreenButtons() {
  const active = Boolean(activeFullscreen());
  fullscreenButtons.forEach((button) => {
    button.textContent = active ? "↙ SAIR DA TELA CHEIA" : "⛶ TELA CHEIA";
    button.setAttribute("aria-pressed", String(active));
  });
}
async function toggleFullscreen() {
  fullscreenStatus.hidden = true;
  try {
    if (activeFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      await exit.call(document);
    } else {
      const enter = fullscreenTarget.requestFullscreen || fullscreenTarget.webkitRequestFullscreen;
      if (!enter) {
        fullscreenStatus.textContent = "Este navegador não oferece tela cheia. No iPhone, use Compartilhar → Adicionar à Tela de Início e abra o jogo por lá.";
        fullscreenStatus.hidden = false;
        return;
      }
      await enter.call(fullscreenTarget);
    }
  } catch {
    fullscreenStatus.textContent = "Não foi possível ativar a tela cheia. Tente novamente ou abra o jogo diretamente no navegador.";
    fullscreenStatus.hidden = false;
  }
  updateFullscreenButtons();
}
scene.onError = showRuntimeError;
scene.attach(engine);
engine.start();
ui.form.addEventListener("submit", (event) => { event.preventDefault(); scene.start(); });
fullscreenButtons.forEach((button) => button.addEventListener("click", toggleFullscreen));
document.addEventListener("fullscreenchange", updateFullscreenButtons);
document.addEventListener("webkitfullscreenchange", updateFullscreenButtons);
updateFullscreenButtons();
if (isMobile) document.querySelector(".hint").innerHTML = "TOQUE PARA AVANÇAR · DESLIZE PARA MOVER<br>NO RIO, PULE NOS TRONCOS";
document.querySelectorAll("[data-move]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.classList.add("pressed");
    if (scene.mode === "ready") scene.start();
    scene.move(button.dataset.move);
  });
  for (const name of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(name, () => button.classList.remove("pressed"));
});
window.addEventListener("keydown", (event) => scene.onKey(event));
let touchStart = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" || scene.mode !== "playing") return;
  touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (!touchStart || touchStart.id !== event.pointerId) return;
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 18) {
    scene.move("up");
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) scene.move(dx < 0 ? "left" : "right");
  else scene.move(dy < 0 ? "up" : "down");
});
canvas.addEventListener("pointercancel", () => { touchStart = null; });
function syncSoundButton() {
  const button = document.querySelector("#sound");
  button.textContent = `SOM: ${audio.muted ? "DESLIGADO" : "LIGADO"}`;
  button.setAttribute("aria-pressed", String(!audio.muted));
}
document.querySelector("#sound").addEventListener("click", () => {
  audio.setMuted(!audio.muted);
  syncSoundButton();
  if (!audio.muted) audio.play("start");
});
document.addEventListener?.("visibilitychange", () => {
  audio.setHidden(document.hidden);
  if (document.hidden) scene.queuedMove = null;
});
ui.start.disabled = true;
ui.start.textContent = "CARREGANDO ARTES…";
artReady.then(() => {
  scene.assetsLoaded = true;
  ui.start.disabled = false;
  ui.start.textContent = "VAMOS ATRAVESSAR →";
  scene.draw(engine.ctx);
}).catch((error) => {
  ui.start.disabled = false;
  showRuntimeError(error);
});
export {
  GameScene
};
