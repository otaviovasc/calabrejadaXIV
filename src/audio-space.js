import { project } from './renderer.js';
import { GAME } from './config.js';

// Use the same camera as the sprites: sound follows the visible vehicle,
// including the diagonal offset of distant lanes.
export function vehicleSoundPosition(car, scene) {
  const screen = project(car.x, car.lane, scene.worldProgress);
  const listener = project(scene.playerX, scene.worldProgress, scene.worldProgress);
  const dx = screen.x - listener.x, dy = screen.y - listener.y;
  const distance = Math.hypot(dx / 160, dy / 115);
  const edge = Math.max(0, Math.min(1, (screen.x + 90) / 90, (GAME.width + 90 - screen.x) / 90,
    (screen.y + 80) / 80, (GAME.height + 80 - screen.y) / 80));
  const level = edge / (1 + distance * distance * 1.8);
  // Mild pitch shift on approach/recession; never a cartoon siren.
  const approach = Math.max(-1, Math.min(1, -Math.sign(dx) * car.speed / 120));
  return { pan: Math.max(-.95, Math.min(.95, (screen.x - GAME.width / 2) / (GAME.width / 2))),
    level, pitch: 1 + approach * .065, distance,
    approaching: dx * car.speed < 0, screen };
}
