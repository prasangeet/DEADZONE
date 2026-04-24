'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const GRAVITY        = -28;
const PLAYER_HEIGHT  = 1.7;
const PLAYER_RADIUS  = 0.4;
const WALK_SPEED     = 6;
const SPRINT_SPEED   = 11;
const JUMP_FORCE     = 9;
const MAX_STAMINA    = 100;
const STAMINA_DRAIN  = 25;
const STAMINA_REGEN  = 15;
let MAX_HEALTH       = 100;
const playerPerks    = new Set();

const PERKS = {
  juggernog: { name: 'Juggernog', cost: 2500, color: '#ff4444', icon: '✚' },
  speedcola: { name: 'Speed Cola', cost: 3000, color: '#44ff44', icon: '⚡' },
  doubletap: { name: 'Double Tap', cost: 2000, color: '#ffaa00', icon: '✖2' },
  staminup:  { name: 'Stamin-Up',  cost: 2000, color: '#ffff44', icon: '🏃' }
};

const WEAPONS = {
  pistol: {
    fireRate: 0.25,
    reloadTime: 1.5,
    maxAmmo: 12,
    maxReserve: 48,
    damage: 55,
    name: 'Pistol',
    color: 0x777777,
    adsFOV: 24
  },
  smg: {
    fireRate: 0.08,
    reloadTime: 1.8,
    maxAmmo: 40,
    maxReserve: 120,
    damage: 28,
    name: 'SMG',
    color: 0x445566,
    adsFOV: 22
  },
  rifle: {
    fireRate: 0.12,
    reloadTime: 2.2,
    maxAmmo: 30,
    maxReserve: 90,
    damage: 45,
    name: 'Assault Rifle',
    color: 0x1a1a1a,
    adsFOV: 18
  },
  shotgun: {
    fireRate: 0.8,
    reloadTime: 3.0,
    maxAmmo: 8,
    maxReserve: 24,
    damage: 70, 
    pellets: 8,
    spread: 0.15,
    name: 'Shotgun',
    color: 0x443322,
    adsFOV: 24
  },
  minigun: {
    fireRate: 0.05,
    reloadTime: 4.5,
    maxAmmo: 250,
    maxReserve: 0,
    damage: 60,
    name: 'Minigun',
    color: 0x111111,
    adsFOV: 20
  },
  plasma: {
    fireRate: 0.22,
    reloadTime: 0,
    maxAmmo: 72,
    maxReserve: 0,
    damage: 10000,
    name: 'Plasma GL',
    color: 0x33ffff,
    projectileColor: 0x66ffee,
    splashRadius: 9.5,
    splashDamage: 360,
    adsFOV: 75,
    isSpecial: true,
    noReload: true
  },
  woofer: {
    fireRate: 0.45,
    reloadTime: 0,
    maxAmmo: 40,
    maxReserve: 0,
    damage: 10000,
    name: 'Plasma Woofer',
    color: 0x66ccff,
    projectileColor: 0x99ddff,
    splashRadius: 15,
    splashDamage: 260,
    adsFOV: 75,
    isSpecial: true,
    noReload: true
  },
  sniper: {
    fireRate: 1.5,
    reloadTime: 3.5,
    maxAmmo: 5,
    maxReserve: 15,
    damage: 400,
    name: 'Sniper Rifle',
    color: 0x223322,
    adsFOV: 8
  }
};
const AMMO_DROP_CHANCE = 0.6; // 60% chance
const ZOMBIE_DAMAGE  = 15;   // per attack
const ATTACK_COOLDOWN = 1.0;
const ATTACK_RANGE   = 1.6;
const ARENA_SIZE     = 40;
const INTERACT_RANGE = 3.2;
const GUN_CRATE_COST = 750;
const AMMO_CRATE_COST = 250;
const WAVE_PREP_DURATION = 8;
const WAVE_WARNING_START = 5;

// ─── Sound System ─────────────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
const output = noiseBuffer.getChannelData(0);
for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;

function playSound(type, vol = 0.1) {
  if (audioCtx.state === 'suspended') return;
  const t = audioCtx.currentTime;

  if (type === 'shoot') {
    const noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1000;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.setValueAtTime(vol, t); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(t); noise.stop(t + 0.15);

    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    gain.gain.setValueAtTime(vol * 1.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
  } else if (type === 'explosion') {
    const noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 800;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.setValueAtTime(vol * 2.5, t); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(t); noise.stop(t + 0.8);

    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(10, t + 0.6);
    gain.gain.setValueAtTime(vol * 1.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.6);
  } else if (type === 'hit') {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
  } else if (type === 'empty') {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t); gain.gain.setValueAtTime(vol * 0.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
  } else if (type === 'hurt') {
    const noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 400;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.setValueAtTime(vol * 1.5, t); noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(t); noise.stop(t + 0.3);
  } else if (type === 'zombie_attack') {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(vol, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
  } else if (type === 'throw') {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t); osc.frequency.linearRampToValueAtTime(200, t + 0.2);
    gain.gain.setValueAtTime(vol, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
  } else if (type === 'reload') {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t); osc.frequency.linearRampToValueAtTime(400, t + 0.1);
    gain.gain.setValueAtTime(vol, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
  }
}

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x05150a, 0.035);
scene.background = new THREE.Color(0x05150a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 500);
camera.position.set(0, PLAYER_HEIGHT, 0);

const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.0;
bloomPass.radius = 0.5;

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x331111, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xff4433, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far  = 100;
dirLight.shadow.camera.left  = -50;
dirLight.shadow.camera.right =  50;
dirLight.shadow.camera.top   =  50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

const lightningLight = new THREE.DirectionalLight(0xaaccff, 0);
lightningLight.position.set(0, 50, 0);
scene.add(lightningLight);

const pointLight1 = new THREE.PointLight(0xff3311, 1.5, 20);
pointLight1.position.set(-8, 3, -8);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x1144ff, 1.0, 18);
pointLight2.position.set(12, 3, 8);
scene.add(pointLight2);

function getWeaponCost(type) {
  const prices = {
    pistol: 0,
    smg: 1200,
    rifle: 1500,
    shotgun: 1750,
    minigun: 2500,
    sniper: 2200,
    plasma: 3000,
    woofer: 3500
  };
  return prices[type] || 1500;
}

function getWeaponMinWave(type) {
  const requirements = {
    pistol: 1,
    smg: 1,
    shotgun: 3,
    rifle: 4,
    sniper: 5,
    minigun: 5,
    plasma: 6,
    woofer: 7,
    sniper: 8
  };
  return requirements[type] || 1;
}

function createLabel(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.roundRect ? ctx.roundRect(0, 0, 512, 128, 20) : ctx.fillRect(0, 0, 512, 128);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = 'bold 60px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(text.toUpperCase(), 256, 82);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 0.65, 1);
  return sprite;
}

function spawnGunCrate(type, x, z, cost = getWeaponCost(type), minWave = getWeaponMinWave(type)) {
  const w = WEAPONS[type];
  const crateMat = new THREE.MeshStandardMaterial({ color: w.color, emissive: w.color, emissiveIntensity: 0.35, roughness: 0.65 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), crateMat);
  crate.position.set(x, 0.5, z);
  crate.castShadow = true;
  scene.add(crate);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffff66 })
  );
  sign.position.set(0, 0.55, 0.48);
  crate.add(sign);

  const light = new THREE.PointLight(w.color, 1.8, 5);
  light.position.set(x, 1.2, z);
  scene.add(light);

  const label = createLabel(`${w.name} - $${cost}`, '#ffffff');
  label.position.set(x, 2.2, z);
  scene.add(label);

  obstacles.push({ mesh: crate, x, z, hw: 0.45, hd: 0.45 });

  shopStations.push({
    type: 'gun',
    weaponType: type,
    cost,
    minWave,
    mesh: crate,
    light,
    x,
    z
  });
}

function spawnAmmoCrate(x, z, cost = AMMO_CRATE_COST) {
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2266cc, emissiveIntensity: 0.35, roughness: 0.7 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), crateMat);
  crate.position.set(x, 0.45, z);
  crate.castShadow = true;
  scene.add(crate);

  const label = createLabel(`AMMO - $${cost}`, '#88ccff');
  label.position.set(x, 1.8, z);
  scene.add(label);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.1, 0.82),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.position.set(0, 0.1, 0);
  crate.add(stripe);

  const light = new THREE.PointLight(0x5599ff, 1.6, 5);
  light.position.set(x, 1.0, z);
  scene.add(light);

  obstacles.push({ mesh: crate, x, z, hw: 0.4, hd: 0.4 });

  shopStations.push({
    type: 'ammo',
    cost,
    minWave: 1,
    mesh: crate,
    light,
    x,
    z
  });
}

// ─── Environment ─────────────────────────────────────────────────────────────
function buildEnvironment() {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x112211, roughness: 0.95, metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Boundary walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x05110a, roughness: 1.0 });
  const wallH = 10;
  const wallConfigs = [
    { x: 0, z: -ARENA_SIZE, rx: 0 },
    { x: 0, z:  ARENA_SIZE, rx: Math.PI },
    { x: -ARENA_SIZE, z: 0, ry: Math.PI/2 },
    { x:  ARENA_SIZE, z: 0, ry: -Math.PI/2 },
  ];
  wallConfigs.forEach(c => {
    const wGeo = new THREE.BoxGeometry(ARENA_SIZE * 2, wallH, 1.0);
    const wall = new THREE.Mesh(wGeo, wallMat);
    wall.position.set(c.x, wallH / 2, c.z);
    if (c.ry) wall.rotation.y = c.ry;
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    obstacles.push({ mesh: wall, x: wall.position.x, z: wall.position.z,
      hw: c.ry ? 0.5 : ARENA_SIZE, hd: c.ry ? ARENA_SIZE : 0.5 });
  });

  // Trees
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1d12, roughness: 0.9 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x0c2511, roughness: 0.8 });
  
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() - 0.5) * ARENA_SIZE * 1.8;
    const z = (Math.random() - 0.5) * ARENA_SIZE * 1.8;
    if (x*x + z*z < 30) continue; // Clear center
    
    const trunkH = 2.0 + Math.random() * 4.0;
    const trunkR = 0.3 + Math.random() * 0.3;
    const trunkGeo = new THREE.CylinderGeometry(trunkR*0.7, trunkR, trunkH, 7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true; trunk.receiveShadow = true;
    scene.add(trunk);
    
    const leavesGeo = new THREE.ConeGeometry(trunkR * 6, trunkH * 1.5, 7);
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, trunkH + trunkH*0.5, z);
    leaves.castShadow = true;
    scene.add(leaves);
    
    obstacles.push({ mesh: trunk, x, z, hw: trunkR, hd: trunkR });
  }

  // Red Moon
  const moonGeo = new THREE.SphereGeometry(15, 32, 32);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xff1100, transparent: true, opacity: 0.9, fog: false });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(-60, 40, -80);
  scene.add(moon);

  // Atmospheric debris particles
  const debrisGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 300; i++) {
    pts.push((Math.random()-0.5)*ARENA_SIZE*1.8, Math.random()*8, (Math.random()-0.5)*ARENA_SIZE*1.8);
  }
  debrisGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const debrisMat = new THREE.PointsMaterial({ color: 0x224422, size: 0.06, sizeAttenuation: true });
  scene.add(new THREE.Points(debrisGeo, debrisMat));

  // Wall-buy style crates
  spawnGunCrate('smg', -18, -12);
  spawnGunCrate('shotgun', 16, -14);
  spawnGunCrate('sniper', -14, 18);
  spawnGunCrate('plasma', 18, 14);
  spawnGunCrate('woofer', 0, 20);
  spawnAmmoCrate(-20, 0);
  spawnAmmoCrate(20, 0);
  
  spawnPerkCrate('juggernog', -10, -25);
  spawnPerkCrate('speedcola', 10, -25);
  spawnPerkCrate('doubletap', -10, 25);
  spawnPerkCrate('staminup', 10, 25);
  
  spawnMysteryBox(0, -30);
}

// ─── Pathfinding ─────────────────────────────────────────────────────────────
const pathGridSize = 80;
let pathGrid = [];
let flowField = [];
let flowFieldTimer = 0;

function initPathGrid() {
  pathGrid = new Array(pathGridSize);
  for (let i = 0; i < pathGridSize; i++) {
    pathGrid[i] = new Array(pathGridSize).fill(0);
  }
  
  obstacles.forEach(obs => {
    const padding = 0.4;
    const startX = Math.max(0, Math.floor(obs.x - obs.hw - padding + ARENA_SIZE));
    const endX   = Math.min(pathGridSize - 1, Math.floor(obs.x + obs.hw + padding + ARENA_SIZE));
    const startZ = Math.max(0, Math.floor(obs.z - obs.hd - padding + ARENA_SIZE));
    const endZ   = Math.min(pathGridSize - 1, Math.floor(obs.z + obs.hd + padding + ARENA_SIZE));
    
    for (let i = startX; i <= endX; i++) {
      for (let j = startZ; j <= endZ; j++) {
        pathGrid[i][j] = 1;
      }
    }
  });
}

function hasLineOfSight(x0, z0, x1, z1) {
  let x = Math.floor(x0), z = Math.floor(z0);
  const endX = Math.floor(x1), endZ = Math.floor(z1);
  const dx = Math.abs(endX - x);
  const dz = Math.abs(endZ - z);
  const stepX = x < endX ? 1 : -1;
  const stepZ = z < endZ ? 1 : -1;
  let err = dx - dz;
  
  while (true) {
    if (x < 0 || x >= pathGridSize || z < 0 || z >= pathGridSize) return false;
    if (pathGrid[x][z] === 1) return false;
    if (x === endX && z === endZ) return true;
    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; x += stepX; }
    if (e2 < dx) { err += dx; z += stepZ; }
  }
}

function updateFlowField(tx, tz) {
  if (pathGrid.length === 0) return;
  
  flowField = new Array(pathGridSize);
  for (let i = 0; i < pathGridSize; i++) {
    flowField[i] = new Array(pathGridSize);
    for (let j = 0; j < pathGridSize; j++) {
      flowField[i][j] = { dx: 0, dz: 0, cost: 9999 };
    }
  }
  
  const targetGridX = Math.max(0, Math.min(pathGridSize - 1, Math.floor(tx + ARENA_SIZE)));
  const targetGridZ = Math.max(0, Math.min(pathGridSize - 1, Math.floor(tz + ARENA_SIZE)));
  
  flowField[targetGridX][targetGridZ] = { dx: 0, dz: 0, cost: 0 };
  const queue = [{ x: targetGridX, z: targetGridZ }];
  let head = 0;
  
  const dirs = [
    {dx: 0, dz: -1}, {dx: 1, dz: 0}, {dx: 0, dz: 1}, {dx: -1, dz: 0},
    {dx: 1, dz: -1}, {dx: 1, dz: 1}, {dx: -1, dz: 1}, {dx: -1, dz: -1}
  ];
  
  while (head < queue.length) {
    const curr = queue[head++];
    const cCost = flowField[curr.x][curr.z].cost;
    
    for (let d of dirs) {
      const nx = curr.x + d.dx;
      const nz = curr.z + d.dz;
      if (nx >= 0 && nx < pathGridSize && nz >= 0 && nz < pathGridSize) {
        if (pathGrid[nx][nz] === 1) continue;
        
        const moveCost = (d.dx !== 0 && d.dz !== 0) ? 1.4 : 1.0;
        const nCost = cCost + moveCost;
        
        if (nCost < flowField[nx][nz].cost) {
          flowField[nx][nz] = { dx: -d.dx, dz: -d.dz, cost: nCost };
          queue.push({ x: nx, z: nz });
        }
      }
    }
  }
}

// ─── State ───────────────────────────────────────────────────────────────────
let gameActive  = false;
let gamePaused   = false;
let inventoryOpen = false;
let score       = 0;
let cash        = 500;
let waveLevel   = 1;
let waveTransition = false;
let pendingWaveLevel = 1;
let waveCooldown = 0;
let waveWarningTimer = null;
let waveKills = 0;
let waveKillTarget = 10;
let waveZombiesSpawned = 0;
let survivalTime = 0;
let obstacles   = [];
let zombies     = [];
let pickups     = [];
let shopStations = [];
let bullets     = [];
let spawnTimer  = 0;
let frameId;
let currentSightIndex = 1; // Red Dot as default
let sightsList  = [];
let interactTarget = null;

let isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
let joyActive = false;
let joyCenter = { x: 0, y: 0 };
let lookTouchId = null;
let lastLook = { x: 0, y: 0 };

let isEditingHUD = false;
let dragData = null;

function loadHUDLayout() {
  const data = localStorage.getItem('deadzone_hud_layout');
  if (data) {
    try {
      const layout = JSON.parse(data);
      Object.keys(layout).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.left = layout[id].left;
          btn.style.top = layout[id].top;
          btn.style.right = layout[id].right;
          btn.style.bottom = layout[id].bottom;
        }
      });
    } catch(e) {}
  }
}
loadHUDLayout();

let minigunSpawned = false;
let spawnedWaves = new Set();
let gameMode = 'survival';

// ─── Player ──────────────────────────────────────────────────────────────────
const player = {
  health: 100,
  velocity: new THREE.Vector3(),
  onGround: false,
  yaw: 0,
  pitch: 0,
  keys: {},
  moveInput: { x: 0, y: 0 },
  mobileJump: false,
  mobileSprint: false,
  weaponType: 'pistol',
  weapons: {
    pistol: { ammo: 12, reserve: 48, reloading: false, reloadTimer: 0 }
  },
  inventory: ['pistol'],
  weaponSlot: 0,
  sightByWeapon: {},
  healthPacks: 0,
  nukeReady: false,
  fireCooldown: 0,
  stamina: MAX_STAMINA,
  sprinting: false,
  bobTime: 0,
  bobOffset: 0,
  aiming: false,
  firing: false,
};

// ─── Weapon Visual ───────────────────────────────────────────────────────────
let weaponGroup;

function createWeapon(type = 'rifle') {
  if (weaponGroup) {
    camera.remove(weaponGroup);
  }
  weaponGroup = new THREE.Group();
  player.weaponType = type;

  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 });
  const stockMat  = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
  const detailMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.9 });

  if (type === 'rifle') {
    // Receiver body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), bodyMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), detailMat);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.45);
    weaponGroup.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.2), stockMat);
    stock.position.set(0, -0.01, 0.28); weaponGroup.add(stock);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.04), stockMat);
    grip.position.set(0, -0.09, 0.1); grip.rotation.x = 0.15; weaponGroup.add(grip);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), bodyMat);
    mag.position.set(0, -0.12, -0.02); weaponGroup.add(mag);
  } else if (type === 'pistol') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.18), bodyMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), detailMat);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.02, -0.1); weaponGroup.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), stockMat);
    grip.position.set(0, -0.06, 0.04); grip.rotation.x = 0.2; weaponGroup.add(grip);
  } else if (type === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.35), bodyMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), detailMat);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.02, -0.25); weaponGroup.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.05), stockMat);
    grip.position.set(0, -0.08, 0.1); weaponGroup.add(grip);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 0.04), bodyMat);
    mag.position.set(0, -0.1, -0.05); weaponGroup.add(mag);
  } else if (type === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.45), bodyMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), detailMat);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.45); weaponGroup.add(barrel);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), stockMat);
    pump.rotation.x = Math.PI/2; pump.position.set(0, -0.01, -0.25); weaponGroup.add(pump);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.25), stockMat);
    stock.position.set(0, -0.02, 0.3); weaponGroup.add(stock);
  } else if (type === 'minigun') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16), bodyMat);
    body.rotation.x = Math.PI/2; weaponGroup.add(body);
    for(let i=0; i<6; i++) {
      const angle = (i/6) * Math.PI*2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), detailMat);
      b.position.x = Math.cos(angle) * 0.05; b.position.y = Math.sin(angle) * 0.05;
      b.rotation.x = Math.PI/2; b.position.z = -0.3; weaponGroup.add(b);
    }
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.2), bodyMat);
    rear.position.z = 0.2; weaponGroup.add(rear);
  } else if (type === 'sniper') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.6), bodyMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), detailMat);
    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.025, -0.7); weaponGroup.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.3), stockMat);
    stock.position.set(0, -0.01, 0.4); weaponGroup.add(stock);
  } else if (type === 'plasma') {
    const plasmaMat = new THREE.MeshStandardMaterial({ color: 0x33ffff, emissive: 0x11aaaa, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.45), plasmaMat);
    weaponGroup.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 10), plasmaMat);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.52); weaponGroup.add(barrel);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    core.position.set(0, 0.03, -0.05); weaponGroup.add(core);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 16), new THREE.MeshStandardMaterial({ color: 0x99ffff, emissive: 0x33ffff, emissiveIntensity: 0.7 }));
    coil.rotation.x = Math.PI / 2; coil.position.set(0, -0.01, -0.18); weaponGroup.add(coil);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.05), stockMat);
    grip.position.set(0, -0.08, 0.12); grip.rotation.x = 0.15; weaponGroup.add(grip);
  } else if (type === 'woofer') {
    const wooferMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x225577, emissiveIntensity: 0.85, roughness: 0.18, metalness: 0.45 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.5), wooferMat);
    weaponGroup.add(body);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.18, 12, 1, false), wooferMat);
    dish.rotation.x = Math.PI / 2; dish.position.set(0, 0.02, -0.48); weaponGroup.add(dish);
    const speaker = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 10, 20), new THREE.MeshBasicMaterial({ color: 0xe6f7ff }));
    speaker.rotation.x = Math.PI / 2; speaker.position.set(0, 0.02, -0.2); weaponGroup.add(speaker);
    const amp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), stockMat);
    amp.position.set(0, -0.07, 0.14); amp.rotation.x = 0.2; weaponGroup.add(amp);
  }

  // Sights logic moved into each weapon block for better alignment
  const sightsGroup = new THREE.Group();
  weaponGroup.add(sightsGroup);
  sightsList = [];

  function addSights(sY, hasOptics = false) {
    // Iron Sights
    const ironGroup = new THREE.Group();
    const ironBase = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.4), detailMat);
    ironBase.position.set(0, sY, -0.25);
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.01), detailMat);
    rearSight.position.set(0, sY + 0.01, -0.1);
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.01), detailMat);
    frontSight.position.set(0, sY + 0.015, -0.4);
    ironGroup.add(ironBase, rearSight, frontSight);
    ironGroup.adsY = -(sY + 0.012);
    ironGroup.adsZ = -0.25;
    sightsList.push({ group: ironGroup, fov: 65, name: 'Iron Sights' });

    if (hasOptics) {
      // Red Dot
      const rdGroup = new THREE.Group();
      const rdBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.08), detailMat);
      rdBase.position.set(0, sY + 0.01, -0.15);
      const rdGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), new THREE.MeshBasicMaterial({color: 0x88ccff, transparent: true, opacity: 0.15, side: THREE.DoubleSide}));
      rdGlass.position.set(0, sY + 0.035, -0.175);
      const rdDot = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 8), new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide}));
      rdDot.position.set(0, sY + 0.035, -0.174);
      rdGroup.add(rdBase, rdGlass, rdDot);
      rdGroup.adsY = -(sY + 0.035);
      rdGroup.adsZ = -0.2;
      sightsList.push({ group: rdGroup, fov: 50, name: 'Red Dot', sightKind: 'red-dot' });

      // Holo
      const hGroup = new THREE.Group();
      const hBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.1), detailMat);
      hBase.position.set(0, sY + 0.015, -0.15);
      const hGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({color: 0xffaa44, transparent: true, opacity: 0.1, side: THREE.DoubleSide}));
      hGlass.position.set(0, sY + 0.05, -0.15);
      const hReticle = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.006, 8), new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide}));
      hReticle.position.set(0, sY + 0.05, -0.149);
      hGroup.add(hBase, hGlass, hReticle);
      hGroup.adsY = -(sY + 0.05);
      hGroup.adsZ = -0.2;
      sightsList.push({ group: hGroup, fov: 45, name: 'Holo Sight', reticleMeshes: [hReticle], sightKind: 'holo' });
    }
  }

  if (type === 'rifle') addSights(0.04, true);
  else if (type === 'pistol') addSights(0.035, false);
  else if (type === 'smg') addSights(0.045, true);
  else if (type === 'shotgun') addSights(0.05, false);
  else if (type === 'sniper') {
    const scopeGroup = new THREE.Group();
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 14), detailMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.075, -0.1);
    const scopeLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.037, 16),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    scopeLens.position.set(0, 0.075, -0.29);
    scopeGroup.add(scopeTube, scopeLens);
    scopeGroup.adsY = -0.058;
    scopeGroup.adsZ = -0.31;
    sightsList.push({ group: scopeGroup, fov: 15, name: 'Sniper Scope', sightKind: 'scope' });
  }
  else if (type === 'plasma') { /* No sights */ }
  else if (type === 'woofer') { /* No sights */ }
  else if (type === 'minigun') {
    const miniSight = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), detailMat);
    s1.position.set(0, 0.12, -0.4);
    miniSight.add(s1);
    miniSight.adsY = -0.12;
    miniSight.adsZ = -0.2;
    sightsList.push({ group: miniSight, fov: 60, name: 'Minigun Post' });
  }

  // Fallback for weapons with no sights
  if (sightsList.length === 0) {
    sightsList.push({ group: new THREE.Group(), fov: 75, name: 'Standard' });
  }

  sightsList.forEach(s => {
    s.group.visible = false;
    sightsGroup.add(s.group);
  });
  const savedSight = player.sightByWeapon[type];
  currentSightIndex = Number.isInteger(savedSight) ? savedSight : 0;
  if (currentSightIndex < 0 || currentSightIndex >= sightsList.length) currentSightIndex = 0;
  if (sightsList[currentSightIndex]) sightsList[currentSightIndex].group.visible = true;

  weaponGroup.position.set(0.22, -0.22, -0.35);
  
  // Make weapon render on top of world to prevent clipping through models
  weaponGroup.renderOrder = 999;
  weaponGroup.onBeforeRender = function(renderer) {
    renderer.clearDepth();
  };

  camera.add(weaponGroup);
  scene.add(camera);
}

function switchSight() {
  if (!weaponGroup || sightsList.length === 0) return;
  player.sightByWeapon[player.weaponType] = currentSightIndex;
  sightsList[currentSightIndex].group.visible = false;
  currentSightIndex = (currentSightIndex + 1) % sightsList.length;
  sightsList[currentSightIndex].group.visible = true;
  player.sightByWeapon[player.weaponType] = currentSightIndex;
  
  const ind = document.getElementById('sight-indicator');
  ind.textContent = `Sight: ${sightsList[currentSightIndex].name}`;
  ind.classList.add('visible');
  setTimeout(() => ind.classList.remove('visible'), 2000);
}

function updateInventoryHUD() {
  const inv = document.getElementById('inventory-hud');
  if (!inv) return;
  inv.innerHTML = '';
  player.inventory.forEach((type, i) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (i === player.weaponSlot ? ' active' : '');
    slot.onclick = () => switchWeapon(i);
    
    const key = document.createElement('div');
    key.className = 'inv-key';
    key.textContent = i + 1;
    
    const name = document.createElement('div');
    name.textContent = WEAPONS[type].name.includes('Plasma')
      ? WEAPONS[type].name.toUpperCase()
      : WEAPONS[type].name.split(' ')[0].toUpperCase();
    
    slot.appendChild(key);
    slot.appendChild(name);
    inv.appendChild(slot);
  });
  updateInventoryOverlay();
}

function updateInventoryOverlay() {
  const screen = document.getElementById('inventory-screen');
  const grid = document.getElementById('inventory-grid');
  const details = document.getElementById('inventory-details');
  if (!screen || !grid || !details) return;

  grid.innerHTML = '';
  details.innerHTML = '';

  const ownedWeapons = player.inventory.map((type, i) => ({
    type,
    index: i,
    weapon: WEAPONS[type],
    state: player.weapons[type]
  }));

  ownedWeapons.forEach(({ type, index, weapon, state }) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'inv-card' + (index === player.weaponSlot ? ' active' : '');
    slot.onclick = () => switchWeapon(index);

    const badge = document.createElement('div');
    badge.className = 'inv-card-badge';
    badge.textContent = `#${index + 1}`;

    const title = document.createElement('div');
    title.className = 'inv-card-title';
    title.textContent = weapon.name;

    const ammo = document.createElement('div');
    ammo.className = 'inv-card-ammo';
    ammo.textContent = `${state.ammo}/${state.reserve}` + (state.reloading ? ' RELOADING' : '');

    slot.appendChild(badge);
    slot.appendChild(title);
    slot.appendChild(ammo);
    grid.appendChild(slot);
  });

  const current = WEAPONS[player.weaponType];
  const currentState = player.weapons[player.weaponType];
  const targetLine = waveTransition
    ? `NEXT WAVE IN ${Math.max(0, Math.ceil(waveCooldown))}`
    : (gameMode === 'test' ? 'WEAPON TEST RANGE ACTIVE' : `${waveKills}/${waveKillTarget} KILLS THIS WAVE`);

  let totalNormalAmmo = 0;
  let totalSpecialAmmo = 0;
  Object.keys(player.weapons).forEach(type => {
    const w = WEAPONS[type];
    const s = player.weapons[type];
    if (w.isSpecial) totalSpecialAmmo += s.ammo + (s.reserve || 0);
    else totalNormalAmmo += s.ammo + (s.reserve || 0);
  });

  details.innerHTML = `
    <div class="inventory-header">LOADOUT</div>
    <div class="inventory-current">${current.name}</div>
    <div class="inventory-meta">AMMO ${currentState.ammo}${current.noReload ? '' : ' / ' + currentState.reserve}</div>
    <div style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:15px;">
      <div class="inventory-header">SUPPLIES</div>
      <div class="inventory-meta">Normal Ammo: <span style="color:#66ff99">${totalNormalAmmo}</span></div>
      <div class="inventory-meta">Special Ammo: <span style="color:#33ffff">${totalSpecialAmmo}</span></div>
      <div class="inventory-meta">Health Kits: ${player.healthPacks}</div>
    </div>
    <div class="inventory-header" style="margin-top:20px">WAVE ${waveLevel}</div>
    <div class="inventory-meta">${targetLine}</div>
    <div class="inventory-tip">TAB TO CLOSE · 1-9 TO SWITCH</div>
  `;
}

function switchWeapon(slot) {
  if (slot < 0 || slot >= player.inventory.length) return;
  if (slot === player.weaponSlot && weaponGroup) return;
  
  // Cancel all active reloads when switching weapons
  Object.values(player.weapons).forEach(state => {
    state.reloading = false;
    state.reloadTimer = 0;
  });
  
  player.weaponSlot = slot;
  const type = player.inventory[slot];
  player.weaponType = type;
  
  createWeapon(type);
  updateAmmoHUD();
  updateInventoryHUD();
  document.getElementById('reload-indicator').classList.toggle('visible', !!player.weapons[type]?.reloading);
}

function cycleWeapon(delta) {
  if (!player.inventory.length) return;
  const next = (player.weaponSlot + delta + player.inventory.length) % player.inventory.length;
  switchWeapon(next);
}

window.addEventListener('keydown', e => {
  if (!gameActive) return;
  if (gamePaused || inventoryOpen) return;
  if (e.code.startsWith('Digit')) {
    const slot = parseInt(e.code.replace('Digit', '')) - 1;
    switchWeapon(slot);
  }
});

window.addEventListener('wheel', e => {
  if (!gameActive || gamePaused || inventoryOpen) return;
  if (!document.pointerLockElement) return;
  if (e.deltaY === 0) return;
  e.preventDefault();
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

// ─── Zombie ──────────────────────────────────────────────────────────────────
class Zombie {
  constructor(x, z, wave, type = 'normal') {
    this.wave       = wave;
    this.type       = type;
    this.attackCD   = 0;
    this.dead       = false;
    this.deathTimer = 0;

    // Type Stats
    let baseHealth = 60 + wave * 20;
    let baseSpeed  = 2.0 + wave * 0.2 + Math.random() * 0.5;
    let scale      = 1.0;

    if (type === 'runner') {
      baseHealth *= 0.6;
      baseSpeed *= 1.85;
      scale = 0.82;
    } else if (type === 'tank') {
      baseHealth *= 5.0;
      baseSpeed *= 0.55;
      scale = 1.38;
    }

    this.health     = baseHealth;
    this.maxHealth  = baseHealth;
    this.speed      = baseSpeed;

    // Visual
    this.group = new THREE.Group();
    this.group.scale.set(scale, scale, scale);

    const skinColor = type === 'tank' ? 0x5a5a5a : 0x4a7a3a;
    const skinMat  = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: type === 'runner' ? 0x552222 : 0x2a2a3a, roughness: 0.95 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.95 });
    
    const eyeColor = type === 'runner' ? 0xffff00 : 0xff2200;
    const eyeMat   = new THREE.MeshStandardMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 2.0 });

    // Body
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.28), shirtMat);
    this.body.position.y = 0.95;
    this.group.add(this.body);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.35), skinMat);
    this.head.position.y = 1.55;
    this.group.add(this.head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 1.58, 0.18);
    eyeR.position.set( 0.1, 1.58, 0.18);
    this.head.add(eyeL, eyeR);

    // Arms
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), skinMat);
    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), skinMat);
    this.armL.position.set(-0.38, 1.1, 0.15);
    this.armR.position.set( 0.38, 1.1, 0.15);
    this.armL.rotation.x = -Math.PI / 2.5;
    this.armR.rotation.x = -Math.PI / 2.5;
    this.group.add(this.armL, this.armR);

    // Legs
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), pantsMat);
    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), pantsMat);
    this.legL.position.set(-0.15, 0.3, 0);
    this.legR.position.set( 0.15, 0.3, 0);
    this.group.add(this.legL, this.legR);

    this.group.position.set(x, 0, z);
    scene.add(this.group);
    this.group.zombieRef = this;
    this.head.zombieRef = this;

    // Health bar above head
    this.hbPivot = new THREE.Group();
    this.hbPivot.position.y = 1.95;
    this.group.add(this.hbPivot);
    const hbBgGeo = new THREE.PlaneGeometry(0.6, 0.08);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    this.hbBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    this.hbPivot.add(this.hbBg);
    const hbBarGeo = new THREE.PlaneGeometry(0.58, 0.06);
    const hbBarMat = new THREE.MeshBasicMaterial({ color: 0x22dd44 });
    this.hbBar = new THREE.Mesh(hbBarGeo, hbBarMat);
    this.hbBar.position.z = 0.001;
    this.hbPivot.add(this.hbBar);

    this.walkTimer = Math.random() * Math.PI * 2;
    this.animTimer = 0;
  }

  update(dt) {
    if (this.dead) {
      this.deathTimer += dt;
      if (this.deathTimer < 0.4) {
        this.group.position.y -= dt * 4;
        this.group.rotation.x += dt * 5;
      } else if (this.deathTimer > 2.0) {
        scene.remove(this.group);
        return true; // remove
      }
      return false;
    }

    if (this.isTestDummy) {
      this.hbPivot.lookAt(camera.position);
      this.hbBg.lookAt(camera.position);
      const hpRatio = this.health / this.maxHealth;
      this.hbBar.scale.x = Math.max(0, hpRatio);
      this.hbBar.position.x = -(1 - hpRatio) * 0.29;
      const c = hpRatio > 0.5 ? 0x22dd44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2200;
      this.hbBar.material.color.setHex(c);
      return false;
    }

    const px = camera.position.x;
    const pz = camera.position.z;
    const dx = px - this.group.position.x;
    const dz = pz - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.01) {
      let nx = dx / dist;
      let nz = dz / dist;

      const zGridX = this.group.position.x + ARENA_SIZE;
      const zGridZ = this.group.position.z + ARENA_SIZE;
      const pGridX = px + ARENA_SIZE;
      const pGridZ = pz + ARENA_SIZE;

      if (!hasLineOfSight(zGridX, zGridZ, pGridX, pGridZ)) {
        const zx = Math.max(0, Math.min(pathGridSize - 1, Math.floor(zGridX)));
        const zz = Math.max(0, Math.min(pathGridSize - 1, Math.floor(zGridZ)));
        
        if (flowField[zx] && flowField[zx][zz] && flowField[zx][zz].cost < 9999) {
          const dir = flowField[zx][zz];
          if (dir.dx !== 0 || dir.dz !== 0) {
            const len = Math.sqrt(dir.dx*dir.dx + dir.dz*dir.dz);
            nx = (nx * 0.1) + (dir.dx / len) * 0.9;
            nz = (nz * 0.1) + (dir.dz / len) * 0.9;
            const blen = Math.sqrt(nx*nx + nz*nz);
            nx /= blen; nz /= blen;
          }
        }
      }

      const targetRotY = Math.atan2(nx, nz);
      let diff = targetRotY - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * 10 * dt;

      if (dist > ATTACK_RANGE) {
        const speed = this.speed * (dist < 5 ? 1.2 : 1.0);
        this.group.position.x += nx * speed * dt;
        this.group.position.z += nz * speed * dt;

        // Zombie-Obstacle Collision
        obstacles.forEach(obs => {
          const ox = this.group.position.x - obs.x;
          const oz = this.group.position.z - obs.z;
          const overlapX = (obs.hw + 0.35) - Math.abs(ox);
          const overlapZ = (obs.hd + 0.35) - Math.abs(oz);
          if (overlapX > 0 && overlapZ > 0) {
            if (overlapX < overlapZ) {
              this.group.position.x += overlapX * Math.sign(ox);
            } else {
              this.group.position.z += overlapZ * Math.sign(oz);
            }
          }
        });

        // Walk animation
        const animSpeed = this.type === 'tank' ? 1.5 : this.type === 'runner' ? 5.0 : 3.0;
        this.animTimer += dt * speed * animSpeed;
        this.legL.rotation.x =  Math.sin(this.animTimer) * 0.5;
        this.legR.rotation.x = -Math.sin(this.animTimer) * 0.5;
      } else {
        // Attack
        this.attackCD -= dt;
        if (this.attackCD <= 0) {
          playSound('zombie_attack', 0.15);
          damagePlayer(ZOMBIE_DAMAGE);
          this.attackCD = ATTACK_COOLDOWN;
          // Attack lunge anim
          this.body.position.z = 0.1;
          setTimeout(() => { if (this.body) this.body.position.z = 0; }, 120);
        }
      }
    }

    // Health bar faces camera
    this.hbPivot.lookAt(camera.position);
    this.hbBg.lookAt(camera.position);
    const hpRatio = this.health / this.maxHealth;
    this.hbBar.scale.x = Math.max(0, hpRatio);
    this.hbBar.position.x = -(1 - hpRatio) * 0.29;
    const c = hpRatio > 0.5 ? 0x22dd44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2200;
    this.hbBar.material.color.setHex(c);

    // Clamp to arena
    this.group.position.x = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, this.group.position.x));
    this.group.position.z = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, this.group.position.z));

    return false;
  }

  takeDamage(dmg, hitPoint) {
    if (this.dead) return;

    let points = 10;
    let isHeadshot = false;

    // Check for headshot
    if (hitPoint) {
      const headDist = hitPoint.y - (this.group.position.y + 0.52);
      if (Math.abs(headDist) < 0.15) {
        dmg *= 2.5;
        isHeadshot = true;
      }
    }

    this.health -= dmg;

    // Flash red
    this.group.traverse(c => {
      if (c.isMesh && c.material.color) {
        const orig = c.material.color.getHex();
        c.material.color.setHex(0xff2200);
        setTimeout(() => { if (c.material) c.material.color.setHex(orig); }, 80);
      }
    });

    if (this.health <= 0) {
      this.dead = true;
      score++;
      waveKills++;
      points = isHeadshot ? 100 : 60;
      
      updateScoreHUD();
      updateWaveHUD();

      if (score >= 150 && !player.nukeReady) {
        player.nukeReady = true;
        document.getElementById('nuke-alert').style.display = 'block';
        document.getElementById('m-btn-nuke').style.display = 'block';
        playSound('reload', 0.5);
      }
      if (Math.random() < AMMO_DROP_CHANCE) {
        spawnAmmoDrop(this.group.position.x, this.group.position.z);
      }
    }

    addPoints(points, hitPoint);
  }
}

function triggerNuke() {
  if (!player.nukeReady) return;
  player.nukeReady = false;
  document.getElementById('nuke-alert').style.display = 'none';
  document.getElementById('m-btn-nuke').style.display = 'none';
  
  playSound('explosion', 1.0);
  applyScreenShake(1.5, 3000);
  
  const flash = document.createElement('div');
  flash.style.position = 'fixed'; flash.style.top = '0'; flash.style.left = '0';
  flash.style.width = '100%'; flash.style.height = '100%';
  flash.style.background = 'white'; flash.style.zIndex = '10000';
  flash.style.opacity = '1'; flash.style.transition = 'opacity 4s';
  document.body.appendChild(flash);
  
  setTimeout(() => { flash.style.opacity = '0'; }, 50);
  setTimeout(() => { document.body.removeChild(flash); }, 4100);
  
  zombies.forEach(z => {
    if (!z.dead) z.takeDamage(10000);
  });
}

function spawnWeaponPickup(type, x, z) {
  const w = WEAPONS[type];
  const geo = new THREE.BoxGeometry(0.4, 0.2, 0.6);
  const mat = new THREE.MeshStandardMaterial({ color: w.color, emissive: w.color, emissiveIntensity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.3, z);
  mesh.castShadow = true;
  scene.add(mesh);
  
  const light = new THREE.PointLight(w.color, 1.5, 3);
  light.position.copy(mesh.position);
  scene.add(light);
  
  pickups.push({ mesh, x, z, amount: 0, type: 'weapon', weaponType: type, light });
}

function spawnHealthPack(x, z) {
  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.15, z);
  
  const cMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.31), cMat);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.31), cMat);
  mesh.add(c1, c2);
  
  scene.add(mesh);
  const light = new THREE.PointLight(0xff4444, 1.2, 4);
  light.position.set(x, 0.5, z);
  scene.add(light);
  
  pickups.push({ mesh, x, z, type: 'health', amount: 1, light });
}

function useHealthPack() {
  if (player.healthPacks > 0 && player.health < 100) {
    player.healthPacks--;
    player.health = 100;
    updateHealthHUD();
    updateMedHUD();
    playSound('reload', 0.2);
    // Visual flash
    const dv = document.getElementById('damage-vignette');
    dv.style.background = 'radial-gradient(circle, transparent 20%, rgba(0,255,0,0.2) 100%)';
    dv.style.opacity = '1';
    setTimeout(() => { 
      dv.style.opacity = '0'; 
      dv.style.background = 'radial-gradient(circle, transparent 20%, rgba(255,0,0,0.4) 100%)';
    }, 500);
  }
}

function spawnMinigun(x, z) {
  spawnWeaponPickup('minigun', x, z);
}

function spawnPlasmaShooter(x, z) {
  spawnWeaponPickup('plasma', x, z);
}

function spawnPlasmaWoofer(x, z) {
  spawnWeaponPickup('woofer', x, z);
}

function spawnWaveWeaponPickup(type) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 8 + Math.random() * 4;
  const x = Math.cos(angle) * dist;
  const z = Math.sin(angle) * dist;
  spawnWeaponPickup(type, x, z);
}

// ─── Spawning ─────────────────────────────────────────────────────────────────
function getSpawnInterval() {
  return Math.max(0.5, 3.0 - waveLevel * 0.15);
}

function spawnZombie() {
  if (gameMode === 'test') return;
  const angle = Math.random() * Math.PI * 2;
  const dist  = ARENA_SIZE * 0.7 + Math.random() * ARENA_SIZE * 0.25;
  const x     = Math.cos(angle) * dist;
  const z     = Math.sin(angle) * dist;

  let type = 'normal';
  const rand = Math.random();
  if (waveLevel >= 5) {
    if (rand < 0.15) type = 'tank';
    else if (rand < 0.40) type = 'runner';
  } else if (waveLevel >= 3) {
    if (rand < 0.25) type = 'runner';
  }

  zombies.push(new Zombie(x, z, waveLevel, type));
}

function spawnTestDummy(x, z, health = 200) {
  const dummy = new Zombie(x, z, 1);
  dummy.isTestDummy = true;
  dummy.health = health;
  dummy.maxHealth = health;
  dummy.speed = 0;
  dummy.attackCD = Number.POSITIVE_INFINITY;
  zombies.push(dummy);
}

function spawnAmmoDrop(x, z) {
  const geo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x55aa55, roughness: 0.7, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.075, z);
  mesh.castShadow = true;
  scene.add(mesh);
  pickups.push({ mesh, x, z, amount: 10 + Math.floor(Math.random() * 15) });
}

function addPoints(amount, hitPoint) {
  cash += amount;
  updateCashHUD();

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (hitPoint) {
    const vector = hitPoint.clone().project(camera);
    x = (vector.x + 1) / 2 * window.innerWidth;
    y = -(vector.y - 1) / 2 * window.innerHeight;
  }

  const popup = document.createElement('div');
  popup.className = 'point-popup';
  popup.textContent = `+${amount}`;
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  document.getElementById('points-popups').appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function updateCashHUD() {
  const el = document.getElementById('cash-val');
  if (el) el.textContent = cash;
}

function showInteractPrompt(text) {
  const prompt = document.getElementById('interact-prompt');
  if (!prompt) return;
  if (!text) {
    prompt.textContent = '';
    prompt.classList.remove('visible');
    return;
  }
  prompt.textContent = text;
  prompt.classList.add('visible');
}

function getNearestShopStation() {
  let nearest = null;
  let bestDist = INTERACT_RANGE * INTERACT_RANGE;
  for (const station of shopStations) {
    const dx = camera.position.x - station.x;
    const dz = camera.position.z - station.z;
    const d2 = dx * dx + dz * dz;
    if (d2 <= bestDist) {
      bestDist = d2;
      nearest = station;
    }
  }
  return nearest;
}

function canBuy(cost) {
  return cash >= cost;
}

function buyWeaponFromCrate(station) {
  const type = station.weaponType;
  const w = WEAPONS[type];
  if (!w) return;
  if (waveLevel < (station.minWave || 1)) {
    playSound('empty', 0.1);
    return;
  }

  if (!canBuy(station.cost)) {
    playSound('empty', 0.1);
    return;
  }

  cash -= station.cost;

  if (!player.weapons[type]) {
    player.weapons[type] = { ammo: w.maxAmmo, reserve: w.maxReserve, reloading: false, reloadTimer: 0 };
    player.inventory.push(type);
  } else {
    const state = player.weapons[type];
    state.ammo = w.maxAmmo;
    state.reserve += Math.max(w.maxAmmo, 1) * 2;
  }

  player.weaponSlot = player.inventory.indexOf(type);
  switchWeapon(player.weaponSlot);

  updateCashHUD();
  playSound('reload', 0.2);
}

function buyAmmoFromCrate(station) {
  const w = WEAPONS[player.weaponType];
  const state = player.weapons[player.weaponType];
  if (!state || w.maxReserve === 0) {
    playSound('empty', 0.1);
    return;
  }
  if (!canBuy(station.cost)) {
    playSound('empty', 0.1);
    return;
  }

  cash -= station.cost;
  state.ammo = w.maxAmmo;
  state.reserve += Math.max(w.maxAmmo, 1) * 3;
  updateCashHUD();
  updateAmmoHUD();
  playSound('reload', 0.2);
}

function interactWithStation(station) {
  if (!station) return false;
  if (station.type === 'gun') { buyWeaponFromCrate(station); return true; }
  if (station.type === 'ammo') { buyAmmoFromCrate(station); return true; }
  if (station.type === 'perk') { buyPerk(station.perkType); return true; }
  if (station.type === 'mystery') { buyMysteryBox(); return true; }
  return false;
}

function togglePause(forceState = null) {
  if (!gameActive) return;
  const nextPaused = forceState === null ? !gamePaused : forceState;
  if (nextPaused === gamePaused) return;

  gamePaused = nextPaused;
  if (gamePaused) {
    inventoryOpen = false;
    const invScreen = document.getElementById('inventory-screen');
    if (invScreen) invScreen.style.display = 'none';
  }
  player.keys = {};
  player.firing = false;
  player.aiming = false;
  player.mobileJump = false;
  player.mobileSprint = false;
  showInteractPrompt('');

  const screen = document.getElementById('pause-screen');
  if (screen) {
    screen.style.display = gamePaused ? 'flex' : 'none';
    if (gamePaused) {
      document.getElementById('pause-kills').textContent = score;
      document.getElementById('pause-cash').textContent = cash;
      document.getElementById('pause-wave').textContent = waveLevel;
      document.exitPointerLock();
    } else if (!isMobile) {
      canvas.requestPointerLock();
    }
  }
}

function toggleInventory(forceState = null) {
  if (!gameActive || gamePaused) return;
  const nextOpen = forceState === null ? !inventoryOpen : forceState;
  if (nextOpen === inventoryOpen) return;

  inventoryOpen = nextOpen;
  const invScreen = document.getElementById('inventory-screen');
  if (invScreen) invScreen.style.display = inventoryOpen ? 'flex' : 'none';

  player.keys = {};
  player.firing = false;
  player.aiming = false;
  player.mobileJump = false;
  player.mobileSprint = false;
  showInteractPrompt('');
  updateInventoryOverlay();

  if (inventoryOpen) {
    document.exitPointerLock();
  } else if (!isMobile) {
    canvas.requestPointerLock();
  }
}

function updateInteractPrompt() {
  if (gamePaused || inventoryOpen || !gameActive) {
    interactTarget = null;
    showInteractPrompt('');
    return;
  }

  const station = getNearestShopStation();
  interactTarget = station;
  if (!station) {
    showInteractPrompt('');
    return;
  }

  let label = 'Press E to buy';
  if (station.type === 'gun') {
    const owned = !!player.weapons[station.weaponType];
    const w = WEAPONS[station.weaponType];
    if (waveLevel < (station.minWave || 1)) {
      label = `${w.name} unlocks at wave ${station.minWave}`;
    } else {
      label = owned
        ? `Press E to buy ammo $${station.cost}`
        : `Press E to buy ${w.name} $${station.cost}`;
    }
  } else if (station.type === 'ammo') {
    label = `Press E for ammo $${station.cost}`;
  }

  if (cash >= station.cost) {
    showInteractPrompt(label);
  } else {
    showInteractPrompt(`${label} [NOT ENOUGH CASH]`);
  }
}

// ─── Input ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!gameActive) return;
  if (e.code === 'Tab') {
    e.preventDefault();
    toggleInventory();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (inventoryOpen) {
      toggleInventory(false);
      return;
    }
    togglePause();
    return;
  }
  if (gamePaused || inventoryOpen) return;

  player.keys[e.code] = true;
  if (e.code === 'KeyR') {
    startReload();
  }
  if (e.code === 'KeyT') {
    switchSight();
  }
  if (e.code === 'KeyG') {
    throwGrenade();
  }
  if (e.code === 'KeyE') {
    const station = getNearestShopStation();
    if (station) {
      interactWithStation(station);
    } else {
      useHealthPack();
    }
  }
  if (e.code === 'KeyN') {
    triggerNuke();
  }
});
document.addEventListener('keyup', e => { player.keys[e.code] = false; });

document.addEventListener('mousemove', e => {
  if (!gameActive || !document.pointerLockElement) return;
  const sens = 0.0018;
  player.yaw   -= e.movementX * sens;
  player.pitch  = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, player.pitch - e.movementY * sens));
});

document.addEventListener('mousedown', e => {
  if (!gameActive) return;
  if (!document.pointerLockElement) { canvas.requestPointerLock(); return; }
  const w = WEAPONS[player.weaponType];
  if (e.button === 0) player.firing = true;
  if (e.button === 2 && !w.noReload) player.aiming = true;
});

document.addEventListener('mouseup', e => {
  if (e.button === 0) player.firing = false;
  if (e.button === 2) player.aiming = false;
});

document.addEventListener('contextmenu', e => e.preventDefault());

// ─── Mobile Controls Events ─────────────────────────────────────────────────
const leftZone = document.getElementById('m-left-zone');
const rightZone = document.getElementById('m-right-zone');
const joystick = document.getElementById('m-joystick');
const joystickKnob = document.getElementById('m-joystick-knob');

leftZone.addEventListener('touchstart', e => {
  if (isEditingHUD) return;
  e.preventDefault();
  const t = e.changedTouches[0];
  joyActive = true;
  joyCenter = { x: t.clientX, y: t.clientY };
  joystick.style.left = t.clientX + 'px';
  joystick.style.top = t.clientY + 'px';
  joystick.style.display = 'block';
  joystickKnob.style.transform = `translate(-50%, -50%)`;
  player.moveInput.x = 0; player.moveInput.y = 0;
}, { passive: false });

leftZone.addEventListener('touchmove', e => {
  if (isEditingHUD) return;
  e.preventDefault();
  if (!joyActive) return;
  const t = e.changedTouches[0];
  let dx = t.clientX - joyCenter.x;
  let dy = t.clientY - joyCenter.y;
  
  if (dy < -45) player.mobileSprint = true;
  else if (dy > -20) player.mobileSprint = false;

  const dist = Math.sqrt(dx*dx + dy*dy);
  const maxR = 60;
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  player.moveInput.x = dx / maxR;
  player.moveInput.y = -dy / maxR;
}, { passive: false });

leftZone.addEventListener('touchend', e => {
  if (isEditingHUD) return;
  e.preventDefault();
  joyActive = false;
  joystick.style.display = 'none';
  player.moveInput.x = 0; player.moveInput.y = 0;
}, { passive: false });

function handleLookStart(e) {
  if (isEditingHUD) return;
  e.preventDefault();
  for(let i=0; i<e.changedTouches.length; i++){
    if(lookTouchId === null) {
      const t = e.changedTouches[i];
      lookTouchId = t.identifier;
      lastLook = { x: t.clientX, y: t.clientY };
    }
  }
}

function handleLookMove(e) {
  if (isEditingHUD) return;
  e.preventDefault();
  for(let i=0; i<e.changedTouches.length; i++){
    const t = e.changedTouches[i];
    if(t.identifier === lookTouchId) {
      const dx = t.clientX - lastLook.x;
      const dy = t.clientY - lastLook.y;
      const sens = 0.006;
      player.yaw -= dx * sens;
      player.pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, player.pitch - dy * sens));
      lastLook = { x: t.clientX, y: t.clientY };
    }
  }
}

function handleLookEnd(e) {
  if (isEditingHUD) return;
  e.preventDefault();
  for(let i=0; i<e.changedTouches.length; i++){
    if(e.changedTouches[i].identifier === lookTouchId) {
      lookTouchId = null;
    }
  }
}

rightZone.addEventListener('touchstart', handleLookStart, { passive: false });
rightZone.addEventListener('touchmove', handleLookMove, { passive: false });
rightZone.addEventListener('touchend', handleLookEnd, { passive: false });

const mBtnShoot = document.getElementById('m-btn-shoot');
mBtnShoot.addEventListener('touchstart', e => {
  if (isEditingHUD) return;
  player.firing = true;
  handleLookStart(e);
}, { passive: false });
mBtnShoot.addEventListener('touchmove', handleLookMove, { passive: false });
mBtnShoot.addEventListener('touchend', e => {
  if (isEditingHUD) return;
  player.firing = false;
  handleLookEnd(e);
}, { passive: false });

function attachTouch(id, onStart, onEnd) {
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('touchstart', e => { if (isEditingHUD) return; e.preventDefault(); if(onStart) onStart(); }, { passive: false });
  el.addEventListener('touchend', e => { if (isEditingHUD) return; e.preventDefault(); if(onEnd) onEnd(); }, { passive: false });
}
attachTouch('m-btn-aim', () => {
  const w = WEAPONS[player.weaponType];
  if (!w.noReload) player.aiming = true;
}, () => player.aiming = false);
attachTouch('m-btn-jump', () => player.mobileJump = true);
attachTouch('m-btn-sprint', () => player.mobileSprint = !player.mobileSprint);
attachTouch('m-btn-reload', () => startReload());
attachTouch('m-btn-grenade', () => throwGrenade());
attachTouch('m-btn-med', () => useHealthPack());
attachTouch('m-btn-nuke', () => triggerNuke());
attachTouch('m-btn-sight', () => switchSight());

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

canvas.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (gameActive) canvas.requestPointerLock();
});

// ─── Shooting ────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();

function getWeaponMuzzlePosition() {
  if (!weaponGroup) return camera.position.clone();

  const muzzleOffsets = {
    pistol:  new THREE.Vector3(0.01, 0.00, -0.12),
    smg:     new THREE.Vector3(0.01, 0.00, -0.22),
    rifle:   new THREE.Vector3(0.01, 0.01, -0.42),
    shotgun: new THREE.Vector3(0.01, 0.01, -0.48),
    minigun: new THREE.Vector3(0.01, 0.02, -0.34),
    sniper:  new THREE.Vector3(0.01, 0.01, -0.66),
    plasma:  new THREE.Vector3(0.01, 0.01, -0.58),
    woofer:  new THREE.Vector3(0.01, 0.01, -0.52)
  };

  const localMuzzle = (muzzleOffsets[player.weaponType] || new THREE.Vector3(0.01, 0.01, -0.3)).clone();
  weaponGroup.updateMatrixWorld(true);
  return weaponGroup.localToWorld(localMuzzle);
}

function getCenterAimDirection() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  return forward.normalize();
}

function buildRaycastTargets() {
  const zombieMeshes = [];
  zombies.forEach(z => {
    if (!z.dead) {
      z.group.traverse(c => {
        if (c.isMesh) {
          c.zombieRef = z;
          zombieMeshes.push(c);
        }
      });
    }
  });

  const envObjs = [];
  scene.children.forEach(c => {
    if (c.type === 'Mesh' && !zombieMeshes.includes(c) && !c.isBullet && !c.isGrenade) {
      envObjs.push(c);
    }
  });

  return { zombieMeshes, envObjs };
}

function fireRaycastShot(dir, damage, color, maxDist = 200, applyDamage = true) {
  const { zombieMeshes, envObjs } = buildRaycastTargets();
  raycaster.set(camera.position, dir);

  const hits = raycaster.intersectObjects([...zombieMeshes, ...envObjs]);
  let hitPoint = camera.position.clone().addScaledVector(dir, maxDist);
  let hitObject = null;

  for (const hit of hits) {
    if (hit.distance <= maxDist) {
      hitPoint = hit.point.clone();
      hitObject = hit.object;
      break;
    }
  }

  if (applyDamage && hitObject && hitObject.zombieRef) {
    hitObject.zombieRef.takeDamage(damage);
    showHitMarker();
    playSound('hit', 0.1);
    spawnHitParticle(hitPoint, 0xff0044);
  } else if (hitObject) {
    spawnHitParticle(hitPoint, color);
  }

  return hitPoint;
}

function spawnBullet(dir, damage, color = 0xffdd44, weaponType = null, origin = null, options = {}) {
  const bGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const bMat = new THREE.MeshBasicMaterial({ color });
  const bMesh = new THREE.Mesh(bGeo, bMat);
  bMesh.isBullet = true;
  bMesh.position.copy(origin || camera.position).addScaledVector(dir, 0.02);
  scene.add(bMesh);

  const targetPoint = options.targetPoint || null;
  const speed = options.speed || 150;
  
  bullets.push({
    mesh: bMesh,
    velocity: targetPoint
      ? targetPoint.clone().sub(origin || camera.position).normalize().multiplyScalar(speed)
      : dir.clone().multiplyScalar(speed),
    damage: damage,
    life: 2.0,
    weaponType,
    visualOnly: !!options.visualOnly,
    targetPoint,
    impactAction: options.impactAction || null
  });
}

function shoot() {
  if (!gameActive) return;
  if (player.fireCooldown > 0) return;
  
  const w = WEAPONS[player.weaponType];
  const state = player.weapons[player.weaponType];
  if (state.reloading) return;
  
  if (state.ammo <= 0) { 
    if (w.noReload) return;
    playSound('empty', 0.1);
    startReload(); 
    return; 
  }

  state.ammo--;
  let rate = w.fireRate;
  if (playerPerks.has('doubletap')) rate *= 0.65;
  player.fireCooldown = rate;
  updateAmmoHUD();
  
  playSound('shoot', 0.15);

  // Recoil
  player.pitch += (Math.random() * 0.012 + 0.008);
  player.yaw   += (Math.random() - 0.5) * 0.008;

  // Weapon kick anim
  if (weaponGroup) {
    weaponGroup.position.z += 0.06;
    weaponGroup.rotation.x -= 0.08;
    if (player.weaponType === 'minigun') {
      weaponGroup.rotation.z += 0.5;
    }
  }

  // Muzzle flash
  const mf = document.getElementById('muzzle-flash');
  mf.style.opacity = '1';
  setTimeout(() => { mf.style.opacity = '0'; }, 50);

  // Screen shake
  applyScreenShake(0.008, 150);

  if (w.pellets) {
    const muzzle = getWeaponMuzzlePosition();
    for (let i = 0; i < w.pellets; i++) {
      const dir = getCenterAimDirection();
      dir.x += (Math.random() - 0.5) * w.spread;
      dir.y += (Math.random() - 0.5) * w.spread;
      dir.normalize();
      const hitPoint = fireRaycastShot(dir, w.damage, w.projectileColor || 0xffdd44);
      spawnBullet(dir, w.damage, w.projectileColor || 0xffdd44, player.weaponType, muzzle, {
        visualOnly: true,
        targetPoint: hitPoint
      });
    }
  } else {
    const muzzle = getWeaponMuzzlePosition();
    const dir = getCenterAimDirection();
    if (player.weaponType === 'plasma' || player.weaponType === 'woofer') {
      const hitPoint = fireRaycastShot(dir, 0, w.projectileColor || 0xffdd44, 200, false);
      spawnBullet(dir, w.damage, w.projectileColor || 0xffdd44, player.weaponType, muzzle, {
        visualOnly: true,
        targetPoint: hitPoint,
        impactAction: (pos) => explodePlasma(pos, player.weaponType)
      });
    } else {
      const hitPoint = fireRaycastShot(dir, w.damage, w.projectileColor || 0xffdd44);
      spawnBullet(dir, w.damage, w.projectileColor || 0xffdd44, player.weaponType, muzzle, {
        visualOnly: true,
        targetPoint: hitPoint
      });
    }
  }

  if (state.ammo === 0 && state.reserve > 0) startReload();
}

function updateBullets(dt) {
  const zombieMeshes = [];
  zombies.forEach(z => { 
    if (!z.dead) z.group.traverse(c => { 
      if (c.isMesh) { c.zombieRef = z; zombieMeshes.push(c); } 
    }); 
  });

  const envObjs = [];
  scene.children.forEach(c => {
    if (c.type === 'Mesh' && !zombieMeshes.includes(c) && !c.isBullet && !c.isGrenade) {
      envObjs.push(c);
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }

    if (b.visualOnly && b.targetPoint) {
      const toTarget = b.targetPoint.clone().sub(b.mesh.position);
      const step = b.velocity.length() * dt;
      if (toTarget.length() <= step) {
        b.mesh.position.copy(b.targetPoint);
        if (b.impactAction) b.impactAction(b.targetPoint.clone());
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        continue;
      }
      b.mesh.position.addScaledVector(toTarget.normalize(), step);
      continue;
    }

    const dist = b.velocity.length() * dt;
    const dir = b.velocity.clone().normalize();
    raycaster.set(b.mesh.position, dir);
    
    const hits = raycaster.intersectObjects([...zombieMeshes, ...envObjs]);
    let hitSomething = false;
    
    for (let hit of hits) {
      if (hit.distance <= dist) {
        if (hit.object.zombieRef) {
          hit.object.zombieRef.takeDamage(b.damage);
          showHitMarker();
          playSound('hit', 0.1);
          spawnHitParticle(hit.point, 0xff0044);
        } else {
          spawnHitParticle(hit.point, 0xffdd44);
        }
        if (b.weaponType === 'plasma' || b.weaponType === 'woofer') {
          explodePlasma(hit.point, b.weaponType);
        }
        hitSomething = true;
        break;
      }
    }

    if (hitSomething) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    } else {
      b.mesh.position.addScaledVector(b.velocity, dt);
    }
  }
}

function startReload() {
  const w = WEAPONS[player.weaponType];
  if (w.noReload) return;
  const state = player.weapons[player.weaponType];
  if (!state || state.reloading || state.reserve <= 0 || state.ammo === w.maxAmmo) return;
  if (Object.values(player.weapons).some(s => s.reloading)) return;
  state.reloading = true;
  let rTime = w.reloadTime;
  if (playerPerks.has('speedcola')) rTime *= 0.5;
  state.reloadTimer = rTime;
  playSound('reload', 0.1);
  document.getElementById('reload-indicator').classList.add('visible');
}

function finishReload(weaponType = player.weaponType) {
  const w = WEAPONS[weaponType];
  const state = player.weapons[weaponType];
  if (!w || !state) return;
  const needed = w.maxAmmo - state.ammo;
  const take   = Math.min(needed, state.reserve);
  state.ammo    += take;
  state.reserve -= take;
  state.reloading = false;
  state.reloadTimer = 0;
  if (weaponType === player.weaponType) {
    document.getElementById('reload-indicator').classList.remove('visible');
  }
  updateAmmoHUD();
  updateInventoryHUD();
}

// ─── Hit Particles ─────────────────────────────────────────────────────────
const hitParticles = [];

function spawnHitParticle(pos, color = 0xff0044) {
  const geo  = new THREE.BufferGeometry();
  const pts  = [];
  const vels = [];
  for (let i = 0; i < 12; i++) {
    pts.push(pos.x, pos.y, pos.z);
    vels.push((Math.random()-0.5)*4, Math.random()*3+1, (Math.random()-0.5)*4);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({ 
    color: color, 
    size: 0.1, 
    sizeAttenuation: true, 
    transparent: true, 
    opacity: 0.8, 
    depthWrite: false, 
    blending: THREE.AdditiveBlending 
  });
  const ps  = new THREE.Points(geo, mat);
  scene.add(ps);
  hitParticles.push({ mesh: ps, vels, life: 0.5, age: 0 });
}

function updateHitParticles(dt) {
  for (let i = hitParticles.length - 1; i >= 0; i--) {
    const p = hitParticles[i];
    p.age += dt;
    const pos = p.mesh.geometry.attributes.position.array;
    for (let j = 0; j < p.vels.length / 3; j++) {
      pos[j*3]   += p.vels[j*3]   * dt;
      pos[j*3+1] += p.vels[j*3+1] * dt;
      pos[j*3+2] += p.vels[j*3+2] * dt;
      p.vels[j*3+1] += GRAVITY * 0.3 * dt;
    }
    p.mesh.geometry.attributes.position.needsUpdate = true;
    p.mesh.material.opacity = 1 - p.age / p.life;
    p.mesh.material.transparent = true;
    if (p.age >= p.life) { scene.remove(p.mesh); hitParticles.splice(i, 1); }
  }
}

// ─── Screen Shake ─────────────────────────────────────────────────────────
let shakeIntensity = 0;
let shakeDecay     = 0;

function applyScreenShake(intensity, durationMs) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDecay     = intensity / (durationMs / 1000);
}

// ─── Player Movement & Physics ────────────────────────────────────────────
function updatePlayer(dt) {
  if (!gameActive) return;

  // Reload timers are tracked per weapon but cancelled on switch.
  for (const [weaponType, state] of Object.entries(player.weapons)) {
    if (state.reloading) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) finishReload(weaponType);
    }
  }
  document.getElementById('reload-indicator').classList.toggle('visible', !!player.weapons[player.weaponType]?.reloading);

  // Fire cooldown
  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  if (player.firing && player.fireCooldown <= 0 && !player.weapons[player.weaponType]?.reloading) {
    shoot();
  }

  // Sprint / stamina
  const wantSprint = player.keys['ShiftLeft'] || player.keys['ShiftRight'] || player.mobileSprint;
  const moving     = player.keys['KeyW'] || player.keys['KeyS'] || player.keys['KeyA'] || player.keys['KeyD'] || (Math.abs(player.moveInput.x) + Math.abs(player.moveInput.y) > 0.1);
  player.sprinting = wantSprint && moving && player.stamina > 0;

  if (player.sprinting) {
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * dt);
  } else {
    player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN * dt);
  }

  let speed = player.sprinting ? SPRINT_SPEED : WALK_SPEED;
  if (playerPerks.has('staminup')) speed *= 1.25;

  // Direction
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right   = new THREE.Vector3( Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const move    = new THREE.Vector3();
  let moveX = 0; let moveY = 0;

  if (player.keys['KeyW']) moveY += 1;
  if (player.keys['KeyS']) moveY -= 1;
  if (player.keys['KeyA']) moveX -= 1;
  if (player.keys['KeyD']) moveX += 1;
  
  moveX += player.moveInput.x;
  moveY += player.moveInput.y;

  move.addScaledVector(forward, moveY);
  move.addScaledVector(right, moveX);
  
  if (move.lengthSq() > 1) move.normalize();

  player.velocity.x = move.x * speed;
  player.velocity.z = move.z * speed;

  // Gravity
  if (!player.onGround) player.velocity.y += GRAVITY * dt;

  // Jump
  if ((player.keys['Space'] || player.keys['KeySpace'] || player.mobileJump) && player.onGround) {
    player.velocity.y = JUMP_FORCE;
    player.onGround = false;
    player.mobileJump = false;
  }

  // Move
  camera.position.x += player.velocity.x * dt;
  camera.position.y += player.velocity.y * dt;
  camera.position.z += player.velocity.z * dt;

  // Ground collision
  if (camera.position.y < PLAYER_HEIGHT) {
    camera.position.y = PLAYER_HEIGHT;
    player.velocity.y = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // Arena bounds
  camera.position.x = Math.max(-ARENA_SIZE + PLAYER_RADIUS, Math.min(ARENA_SIZE - PLAYER_RADIUS, camera.position.x));
  camera.position.z = Math.max(-ARENA_SIZE + PLAYER_RADIUS, Math.min(ARENA_SIZE - PLAYER_RADIUS, camera.position.z));

  // Simple AABB obstacle collision
  obstacles.forEach(obs => {
    const ox = camera.position.x - obs.x;
    const oz = camera.position.z - obs.z;
    const overlapX = (obs.hw + PLAYER_RADIUS) - Math.abs(ox);
    const overlapZ = (obs.hd + PLAYER_RADIUS) - Math.abs(oz);
    if (overlapX > 0 && overlapZ > 0) {
      if (overlapX < overlapZ) {
        camera.position.x += overlapX * Math.sign(ox);
      } else {
        camera.position.z += overlapZ * Math.sign(oz);
      }
    }
  });

  // Bob
  if (moving && player.onGround) {
    player.bobTime += dt * (player.sprinting ? 10 : 7);
    player.bobOffset = Math.sin(player.bobTime) * (player.sprinting ? 0.045 : 0.025);
  } else {
    player.bobTime *= 0.9;
    player.bobOffset *= 0.8;
  }

  // Camera rotation
  const euler = new THREE.Euler(player.pitch + player.bobOffset * 0.3, player.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);

  // Screen shake
  if (shakeIntensity > 0) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity;
    shakeIntensity = Math.max(0, shakeIntensity - shakeDecay * dt);
  }

  // Player-Zombie Collision
  zombies.forEach(z => {
    if (z.dead) return;
    const dx = camera.position.x - z.group.position.x;
    const dz = camera.position.z - z.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = PLAYER_RADIUS + 0.35; 
    if (dist < minDist) {
      const push = (minDist - dist) / dist;
      camera.position.x += dx * push;
      camera.position.z += dz * push;
    }
  });

  // ADS Camera FOV
  const currentSight = sightsList[currentSightIndex] || sightsList[0];
  const sightGroup = currentSight.group || currentSight;
  const w = WEAPONS[player.weaponType];
  const targetFov = player.aiming ? (currentSight.fov || w.adsFOV || 30) : 75;
  camera.fov += (targetFov - camera.fov) * 15 * dt;
  camera.updateProjectionMatrix();

  // Handle full-screen scope overlay
  const isScoping = player.aiming && currentSight.sightKind === 'scope';
  const scopeOverlay = document.getElementById('scope-overlay');
  if (scopeOverlay) {
    scopeOverlay.style.opacity = isScoping ? '1' : '0';
  }

  // Weapon bob, ADS position, and Reload Animation
  if (weaponGroup) {
    // Hide gun model when using full-screen scope
    weaponGroup.visible = !isScoping;
    
    const aimBob = player.bobOffset * 0.04;
    const sightY = sightGroup.adsY ?? -0.04;
    const sightZ = sightGroup.adsZ ?? -0.18;
    const isOpticSight = currentSight.sightKind === 'red-dot' || currentSight.sightKind === 'holo';
    let targetY = player.aiming
      ? (isOpticSight ? sightY + 0.0 + aimBob : sightY - 0.02 + aimBob)
      : -0.22 + player.bobOffset * 0.5;
    let targetX = player.aiming ? 0.0 : 0.22 + player.bobOffset * 0.2;
    let targetZ = player.aiming
      ? (isOpticSight ? sightZ - 0.03 : sightZ - 0.03)
      : -0.35;
    let targetRotX = 0;
    let targetRotY = 0;
    let targetRotZ = 0;

    if (player.weapons[player.weaponType]?.reloading) {
      const state = player.weapons[player.weaponType];
      const p = 1 - (state.reloadTimer / w.reloadTime);
      const reloadKick = Math.sin(p * Math.PI);
      targetY -= reloadKick * 0.12;
      targetX += reloadKick * 0.03;
      targetRotX = reloadKick * -0.18;
      targetRotY = reloadKick * 0.08;
      targetRotZ = reloadKick * 0.12;
    }
    
    weaponGroup.position.x += (targetX - weaponGroup.position.x) * 15 * dt;
    weaponGroup.position.y += (targetY - weaponGroup.position.y) * 15 * dt;
    weaponGroup.position.z += (targetZ - weaponGroup.position.z) * 15 * dt;

    weaponGroup.rotation.x += (targetRotX - weaponGroup.rotation.x) * 15 * dt;
    weaponGroup.rotation.y += (targetRotY - weaponGroup.rotation.y) * 15 * dt;
    weaponGroup.rotation.z += (targetRotZ - weaponGroup.rotation.z) * 15 * dt;
  }
  
  // Crosshair visibility
  document.getElementById('crosshair').style.opacity = player.aiming ? '0' : '1';
  sightsList.forEach(s => {
    if (s.reticleMeshes) s.reticleMeshes.forEach(m => {
      m.visible = !!player.aiming && !isScoping; // Hide 3D reticles if using 2D scope
    });
  });

  // Pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.mesh.rotation.y += dt;
    const dx = camera.position.x - p.x;
    const dz = camera.position.z - p.z;
    if (dx*dx + dz*dz < 2.0) { // Pickup radius
      if (p.type === 'weapon') {
        const type = p.weaponType;
        if (!player.weapons[type]) {
          player.weapons[type] = {
            ammo: WEAPONS[type].maxAmmo,
            reserve: WEAPONS[type].maxReserve,
            reloading: false,
            reloadTimer: 0
          };
          player.inventory.push(type);
          updateInventoryHUD();
        } else {
          player.weapons[type].reserve += WEAPONS[type].maxAmmo;
        }
        switchWeapon(player.inventory.indexOf(type));
        playSound('reload', 0.2);
        if (p.light) scene.remove(p.light);
      } else if (p.type === 'health') {
        player.healthPacks += p.amount;
        updateMedHUD();
        playSound('reload', 0.1);
        if (p.light) scene.remove(p.light);
      } else {
        const state = player.weapons[player.weaponType];
        if (WEAPONS[player.weaponType].isSpecial) return; // Special ammo not dropped by zombies
        state.reserve += p.amount;
        playSound('reload', 0.1);
      }
      updateAmmoHUD();
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }

  updateInteractPrompt();

  // Sprint HUD
  const sprintWrap = document.getElementById('sprint-bar-wrap');
  if (player.stamina < MAX_STAMINA) {
    sprintWrap.classList.add('visible');
    const sb = document.getElementById('sprint-bar');
    sb.style.width = (player.stamina / MAX_STAMINA * 100) + '%';
    sb.style.background = player.stamina < 20 ? '#ff4422' : '#66aaff';
  } else {
    sprintWrap.classList.remove('visible');
  }
}

// ─── Damage Player ────────────────────────────────────────────────────────
function damagePlayer(dmg) {
  playSound('hurt', 0.2);
  player.health = Math.max(0, player.health - dmg);
  updateHealthHUD();

  // Red vignette flash
  const dv = document.getElementById('damage-vignette');
  dv.style.opacity = '1';
  applyScreenShake(0.015, 200);
  setTimeout(() => { dv.style.opacity = '0'; }, 300);

  if (player.health <= 0) endGame();
}

// ─── HUD Updates ─────────────────────────────────────────────────────────
function updateHealthHUD() {
  const pct = player.health / MAX_HEALTH;
  document.getElementById('health-bar').style.width = (pct * 100) + '%';
  document.getElementById('health-val').textContent = Math.ceil(player.health);
  document.getElementById('health-bar').style.background =
    pct > 0.6 ? '#22dd66' : pct > 0.3 ? '#ffaa00' : '#ff2200';
}

function updateMedHUD() {
  document.getElementById('med-count').textContent = player.healthPacks;
}

function updateAmmoHUD() {
  const w = WEAPONS[player.weaponType];
  const state = player.weapons[player.weaponType];
  document.getElementById('ammo-val').textContent = state.ammo;
  document.getElementById('ammo-reserve').textContent = w.noReload ? '' : `/ ${state.reserve}`;
  document.getElementById('sight-indicator').textContent = `Weapon: ${w.name}`;
  updateInventoryHUD();
}

function updateScoreHUD() {
  document.getElementById('score-val').textContent = score;
  const progress = document.getElementById('nuke-progress');
  if (progress) {
    progress.textContent = `NUKE: ${score}/150`;
    if (score >= 150) {
      progress.style.color = '#ffaa00';
      progress.style.textShadow = '0 0 5px #ff4400';
      progress.textContent = 'NUKE READY!';
    } else if (score >= 100) {
      progress.style.color = '#ffff00';
    } else {
      progress.style.color = 'rgba(255,255,255,0.4)';
    }
  }
}

function updateTimeHUD() {
  const m = Math.floor(survivalTime / 60);
  const s = Math.floor(survivalTime % 60).toString().padStart(2, '0');
  document.getElementById('time-val').textContent = `${m}:${s}`;
}

function updateWaveHUD() {
  if (gameMode === 'test') {
    document.getElementById('wave-val').textContent = 'TEST';
    const progress = document.getElementById('wave-progress');
    if (progress) {
      progress.textContent = 'ALL WEAPONS UNLOCKED';
      progress.style.color = '#66ff99';
      progress.style.textShadow = '0 0 10px #33ff77';
    }
    return;
  }
  document.getElementById('wave-val').textContent = waveLevel;
  const progress = document.getElementById('wave-progress');
  if (progress) {
    if (waveTransition) {
      progress.textContent = `PREP ${Math.max(0, Math.ceil(waveCooldown))}`;
      progress.style.color = '#ffb366';
      progress.style.textShadow = '0 0 10px #ff6622';
    } else {
      progress.textContent = `${waveKills}/${waveKillTarget} KILLS`;
      progress.style.color = 'rgba(255,255,255,0.5)';
      progress.style.textShadow = 'none';
    }
  }
}

function getWaveZombieTarget(wave) {
  const base = 10;
  const growth = 1.45;
  return Math.max(1, Math.round(base * Math.pow(growth, Math.max(0, wave - 1))));
}

function showWaveWarning(text) {
  const el = document.getElementById('wave-warning');
  if (!el) return;
  if (waveWarningTimer) {
    clearTimeout(waveWarningTimer);
    waveWarningTimer = null;
  }
  if (!text) {
    el.textContent = '';
    el.classList.remove('visible');
    return;
  }
  el.textContent = text;
  el.classList.add('visible');

  if (text.includes('WAVE')) {
    el.style.color = '#ff4444';
    el.style.fontSize = '32px';
    el.style.textShadow = '0 0 20px #aa1100';
  } else {
    el.style.color = '';
    el.style.fontSize = '';
    el.style.textShadow = '';
  }
}

function flashWaveWarning(text, duration = 1400) {
  showWaveWarning(text);
  waveWarningTimer = setTimeout(() => {
    if (!waveTransition) showWaveWarning('');
  }, duration);
}

function startWave(nextWave) {
  waveLevel = nextWave;
  waveKills = 0;
  waveKillTarget = getWaveZombieTarget(nextWave);
  waveZombiesSpawned = 0;
  spawnTimer = getSpawnInterval();

  if (!spawnedWaves.has(nextWave)) {
    spawnedWaves.add(nextWave);

    const waveWeps = ['pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'plasma', 'woofer'];
    const wep = waveWeps[nextWave - 1];
    if (wep && nextWave > 1) {
      spawnWaveWeaponPickup(wep);
    }
    if (nextWave > 1) {
      spawnHealthPack(4, 4);
    }
  }
  updateWaveHUD();
  flashWaveWarning(`WAVE ${nextWave} START`);
}

function beginWavePrep(nextWave) {
  waveTransition = true;
  pendingWaveLevel = nextWave;
  waveCooldown = WAVE_PREP_DURATION;
  showWaveWarning(`WAVE ${waveLevel} CLEARED`);
}

// ─── Grenades ─────────────────────────────────────────────────────────────
let grenades = [];
const GRENADE_COOLDOWN = 0.65;
let grenadeCD = 0;

function throwGrenade() {
  if (grenadeCD > 0) return;
  grenadeCD = GRENADE_COOLDOWN;
  
  const geo = new THREE.SphereGeometry(0.12, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0x44ff44, 
    emissive: 0x22ff22, 
    emissiveIntensity: 2.5, 
    roughness: 0.2 
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.isGrenade = true;
  
  const light = new THREE.PointLight(0x22ff22, 1.5, 8);
  mesh.add(light);
  
  playSound('throw', 0.1);
  
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(camera.quaternion);
  
  mesh.position.copy(camera.position).addScaledVector(dir, 0.6);
  scene.add(mesh);
  
  const velocity = dir.clone().multiplyScalar(18).add(new THREE.Vector3(0, 4, 0));
  
  grenades.push({
    mesh,
    velocity,
    timer: 2.0
  });
}

function updateGrenades(dt) {
  if (grenadeCD > 0) grenadeCD -= dt;
  
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.timer -= dt;
    
    g.velocity.y += GRAVITY * dt;
    g.mesh.position.addScaledVector(g.velocity, dt);
    
    // Floor
    if (g.mesh.position.y <= 0.12) {
      g.mesh.position.y = 0.12;
      g.velocity.y *= -0.5;
      g.velocity.x *= 0.8;
      g.velocity.z *= 0.8;
    }
    
    // Obstacles
    obstacles.forEach(obs => {
      const ox = g.mesh.position.x - obs.x;
      const oz = g.mesh.position.z - obs.z;
      const overlapX = (obs.hw + 0.12) - Math.abs(ox);
      const overlapZ = (obs.hd + 0.12) - Math.abs(oz);
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) {
          g.mesh.position.x += overlapX * Math.sign(ox);
          g.velocity.x *= -0.5;
        } else {
          g.mesh.position.z += overlapZ * Math.sign(oz);
          g.velocity.z *= -0.5;
        }
      }
    });
    
    if (g.timer <= 0) {
      explodeGrenade(g.mesh.position.clone());
      scene.remove(g.mesh);
      grenades.splice(i, 1);
    }
  }
}

function explodeGrenade(pos) {
  playSound('explosion', 0.3);
  const exGeo = new THREE.SphereGeometry(1, 16, 16);
  const exMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
  const explosion = new THREE.Mesh(exGeo, exMat);
  explosion.position.copy(pos);
  scene.add(explosion);
  
  let scale = 1;
  let op = 0.8;
  const anim = setInterval(() => {
    scale += 0.8;
    op -= 0.05;
    explosion.scale.set(scale, scale, scale);
    explosion.material.opacity = op;
    if (op <= 0 || !gameActive) {
      scene.remove(explosion);
      clearInterval(anim);
    }
  }, 16);
  
  applyScreenShake(0.3, 700);
  
  const G_RADIUS = 9.5;
  const G_DMG = 420;
  
  zombies.forEach(z => {
    if (z.dead) return;
    const dist = z.group.position.distanceTo(pos);
    if (dist <= G_RADIUS) {
      z.takeDamage(G_DMG * (1 - dist/G_RADIUS));
    }
  });
}

function explodePlasma(pos, weaponType = 'plasma') {
  const w = WEAPONS[weaponType] || WEAPONS.plasma;
  const burstColor = weaponType === 'woofer' ? 0x99ddff : 0x66ffee;
  playSound('explosion', weaponType === 'woofer' ? 0.22 : 0.18);
  const exGeo = new THREE.SphereGeometry(weaponType === 'woofer' ? 1.2 : 0.9, 16, 16);
  const exMat = new THREE.MeshBasicMaterial({ color: burstColor, transparent: true, opacity: 0.7 });
  const burst = new THREE.Mesh(exGeo, exMat);
  burst.position.copy(pos);
  scene.add(burst);

  let scale = 1;
  let op = 0.7;
  const anim = setInterval(() => {
    scale += 0.7;
    op -= 0.08;
    burst.scale.set(scale, scale, scale);
    burst.material.opacity = op;
    if (op <= 0 || !gameActive) {
      scene.remove(burst);
      clearInterval(anim);
    }
  }, 16);

  applyScreenShake(weaponType === 'woofer' ? 0.16 : 0.12, weaponType === 'woofer' ? 350 : 250);

  const P_RADIUS = w.splashRadius;
  const P_DMG = w.splashDamage;

  zombies.forEach(z => {
    if (z.dead) return;
    const dist = z.group.position.distanceTo(pos);
    if (dist <= P_RADIUS) {
      z.takeDamage(P_DMG * (1 - dist / P_RADIUS));
    }
  });
}

// ─── Hit Marker ───────────────────────────────────────────────────────────
let hitMarkerTimer = null;

function showHitMarker() {
  const hm = document.getElementById('hitmarker');
  hm.style.opacity = '1';
  clearTimeout(hitMarkerTimer);
  hitMarkerTimer = setTimeout(() => { hm.style.opacity = '0'; }, 120);
}

// ─── Game Loop ───────────────────────────────────────────────────────────
let lastTime = 0;

function gameLoop(timestamp) {
  frameId = requestAnimationFrame(gameLoop);
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  if (!gameActive) { composer.render(); return; }
  if (gamePaused || inventoryOpen) { composer.render(); return; }

  survivalTime += dt;
  if (gameMode !== 'test' && waveTransition) {
    waveCooldown -= dt;
    const secondsLeft = Math.max(0, Math.ceil(waveCooldown));
    if (waveCooldown <= WAVE_WARNING_START) {
      showWaveWarning(`WAVE ${pendingWaveLevel} STARTS IN ${secondsLeft}`);
    } else {
      showWaveWarning(`PREPARE FOR WAVE ${pendingWaveLevel}`);
    }
    if (waveCooldown <= 0) {
      waveTransition = false;
      showWaveWarning('');
      startWave(pendingWaveLevel);
    }
  }

  updateTimeHUD();
  updateWaveHUD();

  flowFieldTimer -= dt;
  if (flowFieldTimer <= 0) {
    updateFlowField(camera.position.x, camera.position.z);
    flowFieldTimer = 0.2;
  }

  // Spawn
  if (gameMode !== 'test' && !waveTransition && waveZombiesSpawned < waveKillTarget) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const burst = 1 + Math.floor(waveLevel / 3);
      const count = Math.min(burst, waveKillTarget - waveZombiesSpawned);
      for (let i = 0; i < count; i++) spawnZombie();
      waveZombiesSpawned += count;
      spawnTimer = getSpawnInterval();
    }
  }

  // Lightning flash
  if (Math.random() > 0.995) {
    lightningLight.intensity = 2 + Math.random() * 4;
  } else if (lightningLight.intensity > 0) {
    lightningLight.intensity = Math.max(0, lightningLight.intensity - dt * 15);
  }

  updatePlayer(dt);
  updateBullets(dt);
  updateHitParticles(dt);
  updateGrenades(dt);

  for (let i = zombies.length - 1; i >= 0; i--) {
    const remove = zombies[i].update(dt);
    if (remove) zombies.splice(i, 1);
  }

  if (gameMode !== 'test' && !waveTransition && waveZombiesSpawned >= waveKillTarget && zombies.length === 0) {
    beginWavePrep(waveLevel + 1);
  }

  composer.render();
}

// ─── Start / End ─────────────────────────────────────────────────────────
function setupTestMode() {
  const testConfig = window.DEADZONE_TEST || {};
  const weaponOrder = testConfig.weaponOrder || Object.keys(WEAPONS);

  player.weapons = {};
  player.inventory = [];
  weaponOrder.forEach(type => {
    const w = WEAPONS[type];
    if (!w) return;
    player.weapons[type] = {
      ammo: w.maxAmmo,
      reserve: Math.max(w.maxReserve * 2, w.maxAmmo),
      reloading: false,
      reloadTimer: 0
    };
    player.inventory.push(type);
  });

  player.weaponSlot = 0;
  player.weaponType = player.inventory[0] || 'pistol';
  currentSightIndex = player.sightByWeapon[player.weaponType] ?? 0;
  cash = 99999;
  score = 0;
  player.healthPacks = 5;

  (testConfig.targetSpots || []).forEach(spot => {
    spawnTestDummy(spot.x, spot.z, spot.health || 200);
  });

  waveLevel = 1;
  waveKills = 0;
  waveKillTarget = 9999;
  waveTransition = false;
  pendingWaveLevel = 1;
  waveCooldown = 0;
  showWaveWarning('WEAPON TEST RANGE');
}

function startGame(mode = 'survival') {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  gameMode = mode;
  if (window.DEADZONE_TEST) window.DEADZONE_TEST.active = mode === 'test';
  // Reset state
  gamePaused   = false;
  score        = 0;
  cash         = 500;
  waveLevel    = 1;
  survivalTime = 0;
  spawnTimer   = 1.5;
  obstacles    = [];
  zombies.forEach(z => scene.remove(z.group));
  zombies      = [];
  hitParticles.forEach(p => scene.remove(p.mesh));
  hitParticles.length = 0;
  grenades.forEach(g => scene.remove(g.mesh));
  grenades.length = 0;
  grenadeCD = 0;
  pickups.forEach(p => scene.remove(p.mesh));
  pickups.length = 0;
  shopStations.forEach(s => {
    if (s.mesh) scene.remove(s.mesh);
    if (s.light) scene.remove(s.light);
  });
  shopStations.length = 0;
  interactTarget = null;
  showInteractPrompt('');
  if (typeof bullets !== 'undefined') {
    bullets.forEach(b => scene.remove(b.mesh));
    bullets.length = 0;
  }

  // Clear old scene objects except camera
  while (scene.children.length > 0) scene.remove(scene.children[0]);

  // Re-add lights
  scene.add(ambient, dirLight, pointLight1, pointLight2, lightningLight, camera);

  // Reset player
  camera.position.set(0, PLAYER_HEIGHT, 0);
  player.health     = 100;
  player.weaponType = 'pistol';
  player.weapons    = { pistol: { ammo: 12, reserve: 48, reloading: false, reloadTimer: 0 } };
  player.inventory  = ['pistol'];
  player.weaponSlot = 0;
  player.sightByWeapon = {};
  player.healthPacks = 0;
  player.nukeReady = false;
  document.getElementById('nuke-alert').style.display = 'none';
  document.getElementById('m-btn-nuke').style.display = 'none';
  player.stamina    = MAX_STAMINA;
  player.velocity.set(0, 0, 0);
  player.yaw        = 0;
  player.pitch      = 0;
  player.sprinting  = false;
  player.aiming     = false;
  player.firing     = false;
  player.fireCooldown = 0;
  spawnedWaves = new Set([1]); // Wave 1 weapon is starting weapon
  waveLevel = 1;
  waveTransition = false;
  pendingWaveLevel = 1;
  waveCooldown = 0;
  waveKills = 0;
  waveKillTarget = getWaveZombieTarget(1);
  waveZombiesSpawned = 0;
  inventoryOpen = false;
  waveTransition = false;
  showWaveWarning('');
  document.getElementById('pause-screen').style.display = 'none';
  const invScreen = document.getElementById('inventory-screen');
  if (invScreen) invScreen.style.display = 'none';

  buildEnvironment();
  initPathGrid();
  createWeapon('pistol');
  if (gameMode === 'test') {
    setupTestMode();
  }

  updateHealthHUD();
  updateMedHUD();
  updateAmmoHUD();
  updateCashHUD();
  updateInventoryHUD();
  updateScoreHUD();
  updateTimeHUD();
  updateWaveHUD();

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';

  gameActive = true;
  if (isMobile) {
    enterFullscreen();
    document.getElementById('mobile-controls').style.display = 'block';
  } else {
    canvas.requestPointerLock();
  }

  if (frameId) cancelAnimationFrame(frameId);
  lastTime = performance.now();
  gameLoop(lastTime);
}

function endGame() {
  gameActive = false;
  gamePaused = false;
  inventoryOpen = false;
  waveTransition = false;
  pendingWaveLevel = 1;
  waveCooldown = 0;
  showWaveWarning('');
  document.exitPointerLock();

  document.getElementById('hud').style.display = 'none';
  if (isMobile) document.getElementById('mobile-controls').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'flex';
  document.getElementById('pause-screen').style.display = 'none';
  const invScreen = document.getElementById('inventory-screen');
  if (invScreen) invScreen.style.display = 'none';

  document.getElementById('go-kills').textContent = score;
  document.getElementById('go-wave').textContent  = waveLevel;
  const m = Math.floor(survivalTime / 60);
  const s = Math.floor(survivalTime % 60).toString().padStart(2, '0');
  document.getElementById('go-time').textContent  = `${m}:${s}`;
}

function quitGame() {
  gameActive = false;
  gamePaused = false;
  inventoryOpen = false;
  waveTransition = false;
  pendingWaveLevel = 1;
  waveCooldown = 0;
  showWaveWarning('');
  document.exitPointerLock();

  document.getElementById('hud').style.display = 'none';
  if (isMobile) document.getElementById('mobile-controls').style.display = 'none';
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('gameover-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  const invScreen = document.getElementById('inventory-screen');
  if (invScreen) invScreen.style.display = 'none';

  // Clean up existing zombies and bullets
  zombies.forEach(z => scene.remove(z.group));
  zombies = [];
  bullets.forEach(b => scene.remove(b.mesh));
  bullets = [];
  pickups.forEach(p => scene.remove(p.mesh));
  pickups = [];
}

// ─── Buttons ─────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => startGame('survival'));
document.getElementById('test-btn').addEventListener('click', () => {
  if (typeof window.startTestGame === 'function') {
    window.startTestGame();
  } else {
    startGame('test');
  }
});
document.getElementById('restart-btn').addEventListener('click', () => startGame(gameMode));
document.getElementById('resume-btn').addEventListener('click', () => togglePause(false));
document.getElementById('quit-btn').addEventListener('click', () => quitGame());

if (isMobile) {
  document.getElementById('customize-btn').style.display = 'block';
}

document.getElementById('customize-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud-edit-screen').style.display = 'flex';
  const mc = document.getElementById('mobile-controls');
  mc.style.display = 'block';
  mc.classList.add('edit-mode');
  enterFullscreen();
  isEditingHUD = true;
});

document.getElementById('hud-save-btn').addEventListener('click', () => {
  const layout = {};
  document.querySelectorAll('.m-btn').forEach(btn => {
    layout[btn.id] = { left: btn.style.left, top: btn.style.top, right: btn.style.right, bottom: btn.style.bottom };
  });
  localStorage.setItem('deadzone_hud_layout', JSON.stringify(layout));
  
  isEditingHUD = false;
  document.getElementById('hud-edit-screen').style.display = 'none';
  const mc = document.getElementById('mobile-controls');
  mc.style.display = 'none';
  mc.classList.remove('edit-mode');
  document.getElementById('start-screen').style.display = 'flex';
});

document.getElementById('hud-reset-btn').addEventListener('click', () => {
  localStorage.removeItem('deadzone_hud_layout');
  document.querySelectorAll('.m-btn').forEach(btn => {
    btn.style.left = ''; btn.style.top = ''; btn.style.right = ''; btn.style.bottom = '';
  });
});

document.querySelectorAll('.m-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => {
    if (!isEditingHUD) return;
    e.preventDefault(); e.stopPropagation();
    const t = e.changedTouches[0];
    const rect = btn.getBoundingClientRect();
    dragData = { el: btn, offsetX: t.clientX - rect.left, offsetY: t.clientY - rect.top, id: t.identifier };
  }, { passive: false });
  
  btn.addEventListener('touchmove', e => {
    if (!isEditingHUD || !dragData || dragData.el !== btn) return;
    e.preventDefault(); e.stopPropagation();
    for(let i=0; i<e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dragData.id) {
        const t = e.changedTouches[i];
        btn.style.left = (t.clientX - dragData.offsetX) + 'px';
        btn.style.top = (t.clientY - dragData.offsetY) + 'px';
        btn.style.right = 'auto'; btn.style.bottom = 'auto';
      }
    }
  }, { passive: false });

  btn.addEventListener('touchend', e => {
    if (!isEditingHUD || !dragData || dragData.el !== btn) return;
    e.preventDefault(); e.stopPropagation();
    for(let i=0; i<e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dragData.id) dragData = null;
    }
  }, { passive: false });
});

// ─── Idle render loop (before game starts) ───────────────────────────────
(function idleLoop(ts) {
  if (!gameActive) { composer.render(); requestAnimationFrame(idleLoop); }
})(0);

// ─── Pointer lock change ──────────────────────────────────────────────────
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && gameActive) {
    // Paused via pointer lock loss (e.g. ESC) — don't end game, just note
  }
});

// ─── Initial scene for start screen ──────────────────────────────────────
scene.add(ambient, dirLight, pointLight1, pointLight2, lightningLight, camera);
buildEnvironment();
createWeapon();
camera.position.set(0, PLAYER_HEIGHT, 8);
camera.rotation.y = Math.PI;
function spawnPerkCrate(perkType, x, z) {
  const p = PERKS[perkType];
  const geo = new THREE.BoxGeometry(1.2, 1.8, 1.2);
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6, metalness: 0.4 });
  const machine = new THREE.Mesh(geo, mat);
  machine.position.set(x, 0.9, z);
  machine.castShadow = true;
  scene.add(machine);

  const topGeo = new THREE.BoxGeometry(1.3, 0.4, 1.3);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 1.1;
  machine.add(top);

  const light = new THREE.PointLight(p.color, 1.5, 6);
  light.position.set(x, 2.5, z);
  scene.add(light);

  const label = createLabel(`${p.name} - $${p.cost}`, p.color);
  label.position.set(x, 2.6, z);
  scene.add(label);

  shopStations.push({ type: 'perk', perkType, cost: p.cost, x, z });
  obstacles.push({ mesh: machine, x, z, hw: 0.6, hd: 0.6 });
}

function spawnMysteryBox(x, z) {
  const geo = new THREE.BoxGeometry(2.5, 0.8, 1.2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x443311, roughness: 0.9 });
  const box = new THREE.Mesh(geo, mat);
  box.position.set(x, 0.4, z);
  box.castShadow = true;
  scene.add(box);

  // Strong Cyan Light
  const light = new THREE.PointLight(0x00ffff, 4, 10);
  light.position.set(x, 1.5, z);
  scene.add(light);

  // Light Beam (COD Style)
  const beamGeo = new THREE.CylinderGeometry(0.2, 0.5, 20, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(x, 10, z);
  scene.add(beam);

  const label = createLabel(`MYSTERY BOX - $950`, '#00ffff');
  label.position.set(x, 2.0, z);
  scene.add(label);

  shopStations.push({ type: 'mystery', cost: 950, x, z });
  obstacles.push({ mesh: box, x, z, hw: 1.25, hd: 0.6 });
}

function buyPerk(perkType) {
  const p = PERKS[perkType];
  if (playerPerks.has(perkType)) return;
  if (!canBuy(p.cost)) return;

  cash -= p.cost;
  updateCashHUD();
  playerPerks.add(perkType);
  playSound('reload', 0.5);
  
  if (perkType === 'juggernog') {
    MAX_HEALTH = 250;
    player.health = MAX_HEALTH;
    updateHealthHUD();
  }

  // Add icon to HUD
  const hud = document.getElementById('perks-hud');
  const icon = document.createElement('div');
  icon.className = `perk-icon ${perkType}`;
  icon.textContent = p.icon;
  icon.title = p.name;
  hud.appendChild(icon);
}

function buyMysteryBox() {
  if (!canBuy(950)) return;
  cash -= 950;
  updateCashHUD();
  
  const types = Object.keys(WEAPONS);
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  const prompt = document.getElementById('interact-prompt');
  prompt.textContent = `BOX GAVE: ${WEAPONS[randomType].name.toUpperCase()}!`;
  prompt.classList.add('visible');
  setTimeout(() => prompt.classList.remove('visible'), 3000);

  if (!player.weapons[randomType]) {
    player.weapons[randomType] = {
      ammo: WEAPONS[randomType].maxAmmo,
      reserve: WEAPONS[randomType].maxReserve,
      reloading: false,
      reloadTimer: 0
    };
    player.inventory.push(randomType);
    updateInventoryHUD();
  } else {
    player.weapons[randomType].reserve += WEAPONS[randomType].maxAmmo * 2;
  }
  switchWeapon(player.inventory.indexOf(randomType));
  playSound('reload', 0.4);
}
