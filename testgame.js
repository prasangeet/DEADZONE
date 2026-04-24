'use strict';

window.DEADZONE_TEST = {
  active: false,
  weaponOrder: ['pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'plasma', 'woofer'],
  targetSpots: [
    { x: 0, z: -12, health: 180 },
    { x: -4, z: -13, health: 180 },
    { x: 4, z: -13, health: 180 },
    { x: -8, z: -15, health: 220 },
    { x: 8, z: -15, health: 220 },
    { x: 0, z: -18, health: 260 },
    { x: -6, z: -20, health: 260 },
    { x: 6, z: -20, health: 260 }
  ],
  start() {
    this.active = true;
  },
  stop() {
    this.active = false;
  }
};

window.startTestGame = function startTestGame() {
  window.DEADZONE_TEST.start();
  if (typeof startGame === 'function') {
    startGame('test');
  }
};
