import * as THREE from 'three';

// --- TEXTURE SETUP ---
const textureLoader = new THREE.TextureLoader();

const grassTexture = textureLoader.load('textures/grass.jpg');
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(16, 16);

const gravelTexture = textureLoader.load('textures/gravel.jpg');
gravelTexture.wrapS = THREE.RepeatWrapping;
gravelTexture.wrapT = THREE.RepeatWrapping;
gravelTexture.repeat.set(2, 8);

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 800);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
sunLight.position.set(100, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

// Player physics
const player = {
    height: 1.8,
    radius: 0.5,
    speed: 0.15,
    sprintMultiplier: 1.8,
    turnSpeed: 0.002,
    jumpForce: 0.35,
    position: new THREE.Vector3(0, 20, 50),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: { x: 0, y: 0 },
    onGround: false,
    canJump: true
};

const gravity = -0.02;
const initialPosition = player.position.clone();

camera.position.copy(player.position);

// Input handling
const keys = {};
let isPointerLocked = false;

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && player.onGround && player.canJump) {
        player.velocity.y = player.jumpForce;
        player.onGround = false;
        player.canJump = false;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'Space') {
        player.canJump = true;
    }
});

document.addEventListener('click', () => {
    if (!isPointerLocked) document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === document.body;
});

document.addEventListener('mousemove', (e) => {
    if (isPointerLocked) {
        player.rotation.y -= e.movementX * player.turnSpeed;
        player.rotation.x -= e.movementY * player.turnSpeed;
        player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotation.x));
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    player.position.copy(initialPosition);
    player.velocity.set(0, 0, 0);
    player.rotation.x = 0;
    player.rotation.y = 0;
    player.onGround = false;
});

const collisionObjects = [];
const floorObjects = [];

// --- TERRAIN ---

// Hills
const fortressHillGeometry = new THREE.CylinderGeometry(80, 105, 12, 64);
const fortressHillMaterial = new THREE.MeshLambertMaterial({ map: grassTexture, flatShading: false });
const fortressHill = new THREE.Mesh(fortressHillGeometry, fortressHillMaterial);
fortressHill.position.set(0, -2, 0); 
fortressHill.receiveShadow = true; fortressHill.castShadow = true;
scene.add(fortressHill);

const secondaryHillGeometry = new THREE.CylinderGeometry(50, 65, 10, 32);
const secondaryHill1 = new THREE.Mesh(secondaryHillGeometry, fortressHillMaterial);
secondaryHill1.position.set(-80, -3, 20); secondaryHill1.receiveShadow = true;
scene.add(secondaryHill1);

const secondaryHill2 = new THREE.Mesh(secondaryHillGeometry, fortressHillMaterial);
secondaryHill2.position.set(80, -3, -10); secondaryHill2.receiveShadow = true;
scene.add(secondaryHill2);

// Ground
const groundGrassTexture = grassTexture.clone();
groundGrassTexture.repeat.set(64, 64);
const ground = new THREE.Mesh(new THREE.CircleGeometry(350, 64), new THREE.MeshLambertMaterial({ map: groundGrassTexture }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -6; ground.receiveShadow = true;
scene.add(ground);

// Mountains
const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x4a5f3a, flatShading: true });
for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const distance = 250 + Math.random() * 100;
    const h = 80 + Math.random() * 60;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(40 + Math.random() * 30, h, 8), mountainMaterial);
    mountain.position.set(Math.cos(angle) * distance, (h / 2) - 10, Math.sin(angle) * distance);
    scene.add(mountain);
}
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    const distance = 400 + Math.random() * 80;
    const h = 100 + Math.random() * 50;
    const farMountain = new THREE.Mesh(new THREE.ConeGeometry(50 + Math.random() * 25, h, 8), new THREE.MeshLambertMaterial({ color: 0x3a4f2a }));
    farMountain.position.set(Math.cos(angle) * distance, (h / 2) - 8, Math.sin(angle) * distance);
    scene.add(farMountain);
}

// --- BUILDER FUNCTIONS ---

function createWall(width, height, depth, x, y, z, rotation = 0, isOld = false, hasDoor = false) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (isOld) {
        ctx.fillStyle = '#6e6e6e'; ctx.fillRect(0, 0, 256, 256);
        for(let i=0; i<300; i++) { ctx.fillStyle = `rgba(40,40,40,${Math.random()})`; ctx.fillRect(Math.random()*256, Math.random()*256, 8, 8); }
        for(let i=0; i<50; i++) { ctx.fillStyle = `rgba(50,80,40,${Math.random()*0.5})`; ctx.fillRect(Math.random()*256, Math.random()*256, 20, 20); }
    } else {
        ctx.fillStyle = '#c9b897'; ctx.fillRect(0, 0, 256, 256);
        for(let i=0; i<150; i++) { ctx.fillStyle = `rgba(180,160,130,0.3)`; ctx.fillRect(Math.random()*256, Math.random()*256, 15, 15); }
        ctx.strokeStyle = 'rgba(160, 150, 130, 0.5)'; ctx.lineWidth = 2;
        for(let i=0; i<8; i++) { ctx.beginPath(); ctx.moveTo(0, i*32); ctx.lineTo(256, i*32); ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width/4, height/4);
    const wall = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture }));
    wall.position.set(x, y, z); wall.rotation.y = rotation;
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    if (!hasDoor) collisionObjects.push(wall);
    return wall;
}

function createWallWithDoor(width, height, depth, x, y, z, rotation = 0, isOld = false, doorWidth = 3, doorHeight = 4) {
    const sideWidth = (width - doorWidth) / 2;
    const cos = Math.cos(rotation); const sin = Math.sin(rotation);
    createWall(sideWidth, height, depth, x - (doorWidth/2 + sideWidth/2) * cos, y, z - (doorWidth/2 + sideWidth/2) * sin, rotation, isOld, false);
    createWall(sideWidth, height, depth, x + (doorWidth/2 + sideWidth/2) * cos, y, z + (doorWidth/2 + sideWidth/2) * sin, rotation, isOld, false);
    createWall(doorWidth, height - doorHeight, depth, x, y + doorHeight/2 + (height - doorHeight)/2, z, rotation, isOld, false);
}

function createArchedWindow(x, y, z, rotation) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
    windowMesh.position.set(x, y, z); windowMesh.rotation.y = rotation;
    scene.add(windowMesh);
}

// --- NEW FORTRESS ---
const newFortX = 40; const newFortZ = -20; const wallDepth = 1.2;
createWallWithDoor(32, 8, wallDepth, newFortX, 8, newFortZ + 5, 0, false, 3.5, 4.5);
createWall(wallDepth, 8, 22, newFortX + 16, 8, newFortZ - 6, 0, false);
createWall(32, 8, wallDepth, newFortX, 8, newFortZ - 17, 0, false);
createWall(wallDepth, 8, 22, newFortX - 16, 8, newFortZ - 6, 0, false);
const newFloor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 20), new THREE.MeshLambertMaterial({ color: 0x8b7355 }));
newFloor.position.set(newFortX, 4.1, newFortZ - 6);
scene.add(newFloor);
floorObjects.push({ mesh: newFloor, height: 4.1 });
for (let i = 0; i < 4; i++) createArchedWindow(newFortX - 12 + i * 8, 8, newFortZ + 5 + (wallDepth/2) + 0.1, 0);
const newRoof = new THREE.Mesh(new THREE.ConeGeometry(19, 5, 4), new THREE.MeshLambertMaterial({ color: 0xa94442 }));
newRoof.position.set(newFortX, 14, newFortZ - 6); newRoof.rotation.y = Math.PI / 4;
scene.add(newRoof);

// --- OLD FORTRESS (Ruined) ---
const oldFortX = -42; const oldFortZ = -15; const stoneDepth = 1.5;

// Walls
createWall(26, 6, stoneDepth, oldFortX, 7, oldFortZ - 12, 0, true);
createWall(stoneDepth, 5, 12, oldFortX - 13, 6.5, oldFortZ - 6, 0, true);
createWall(stoneDepth, 2, 6, oldFortX - 13, 5, oldFortZ + 5, 0, true);
createWall(stoneDepth, 6, 10, oldFortX + 13, 7, oldFortZ - 7, 0, true);
createWall(stoneDepth, 3, 5, oldFortX + 13, 5.5, oldFortZ + 5, 0, true);
createWall(10, 6, stoneDepth, oldFortX - 8, 7, oldFortZ + 8, 0, true);
createWall(6, 4, stoneDepth, oldFortX + 10, 6, oldFortZ + 8, 0, true);

// Ground Floor
const oldGroundFloor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.2, 22), new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
oldGroundFloor.position.set(oldFortX, 4.1, oldFortZ - 2);
scene.add(oldGroundFloor);
floorObjects.push({ mesh: oldGroundFloor, height: 4.1 });

// Second Story
const upperFloor1 = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x4a4a4a }));
upperFloor1.position.set(oldFortX, 9.5, oldFortZ - 10);
scene.add(upperFloor1);
floorObjects.push({ mesh: upperFloor1, height: 9.5 });

const upperFloor2 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 12), new THREE.MeshLambertMaterial({ color: 0x4a4a4a }));
upperFloor2.position.set(oldFortX - 10, 9.5, oldFortZ - 2);
scene.add(upperFloor2);
floorObjects.push({ mesh: upperFloor2, height: 9.5 });

createWall(15, 5, stoneDepth, oldFortX - 5, 12, oldFortZ - 12, 0, true);
createWall(stoneDepth, 4, 10, oldFortX - 13, 11.5, oldFortZ - 10, 0, true);
createWall(4, 3, stoneDepth, oldFortX - 11, 11, oldFortZ + 3, 0, true);

// --- RAMP LOGIC AND VISUALS ---

// Ramp Configuration
const rampConfig = {
    x: oldFortX + 5,
    width: 4.5,
    zBottom: oldFortZ + 6, // The z coordinate closest to player start
    zTop: oldFortZ - 6,    // The z coordinate deep in the fort
    yBottom: 4.1,
    yTop: 9.5
};

// Create Visual Ramp Mesh to match config
const rampLength = Math.abs(rampConfig.zBottom - rampConfig.zTop);
const rampHeight = rampConfig.yTop - rampConfig.yBottom;
const rampHypotenuse = Math.sqrt(rampLength**2 + rampHeight**2);
const rampAngle = Math.atan2(rampHeight, rampLength);

const visualRamp = new THREE.Mesh(
    new THREE.BoxGeometry(rampConfig.width, 0.5, rampHypotenuse),
    new THREE.MeshLambertMaterial({ color: 0x655545 })
);
// Position logic: Center of ramp
visualRamp.position.set(
    rampConfig.x, 
    rampConfig.yBottom + rampHeight/2, 
    (rampConfig.zBottom + rampConfig.zTop)/2
);
// FIX: Inverted angle logic to ensure it faces the correct way visually
visualRamp.rotation.x = rampAngle; 

visualRamp.castShadow = true; 
visualRamp.receiveShadow = true;
scene.add(visualRamp);

// --- CHURCH ---
const churchX = -10; const churchZ = -28;
createWallWithDoor(13, 7, 1, churchX, 7.5, churchZ + 5, 0, false, 2.8, 4.5);
createWall(1, 7, 12, churchX + 6.5, 7.5, churchZ - 1, 0, false);
createWall(13, 7, 1, churchX, 7.5, churchZ - 7, 0, false);
createWall(1, 7, 12, churchX - 6.5, 7.5, churchZ - 1, 0, false);
const churchFloor = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.2, 10), new THREE.MeshLambertMaterial({ color: 0x8b7355 }));
churchFloor.position.set(churchX, 4.1, churchZ - 1);
scene.add(churchFloor);
floorObjects.push({ mesh: churchFloor, height: 4.1 });
const dome = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xa94442 }));
dome.position.set(churchX, 11.5, churchZ - 1); scene.add(dome);
const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
crossV.position.set(churchX, 17, churchZ - 1); scene.add(crossV);
const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
crossH.position.set(churchX, 17.5, churchZ - 1); scene.add(crossH);

// --- ROADS & DECOR (RESTORED) ---
const roadMaterial = new THREE.MeshLambertMaterial({ map: gravelTexture });

// Parking Area
const parking = new THREE.Mesh(new THREE.CircleGeometry(18, 32), roadMaterial);
parking.rotation.x = -Math.PI / 2; 
parking.position.set(0, 4.15, 10); 
parking.receiveShadow = true; 
scene.add(parking);

// Main Road
const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(8, 50), roadMaterial);
mainRoad.rotation.x = -Math.PI / 2; 
mainRoad.position.set(0, 4.15, 35); 
mainRoad.receiveShadow = true; 
scene.add(mainRoad);

// Side Roads (Restored)
const rightRoad = new THREE.Mesh(new THREE.PlaneGeometry(6, 35), roadMaterial);
rightRoad.rotation.x = -Math.PI / 2; rightRoad.rotation.z = -Math.PI / 5;
rightRoad.position.set(22, 4.15, -5); rightRoad.receiveShadow = true;
scene.add(rightRoad);

const leftRoad = new THREE.Mesh(new THREE.PlaneGeometry(6, 35), roadMaterial);
leftRoad.rotation.x = -Math.PI / 2; leftRoad.rotation.z = Math.PI / 5;
leftRoad.position.set(-24, 4.15, -5); leftRoad.receiveShadow = true;
scene.add(leftRoad);

const churchRoad = new THREE.Mesh(new THREE.PlaneGeometry(5, 22), roadMaterial);
churchRoad.rotation.x = -Math.PI / 2;
churchRoad.position.set(-10, 4.15, -17); churchRoad.receiveShadow = true;
scene.add(churchRoad);

// --- SIGNS (RESTORED) ---
function createDirectionalSign(text, x, y, z, rotationY) {
    const signGroup = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.5), new THREE.MeshLambertMaterial({ color: 0x5d4e37 }));
    post.position.y = 1.25; signGroup.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: 0x8b7355 }));
    board.position.y = 2.5; signGroup.add(board);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8b7355'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 80);
    const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    textMesh.position.set(0, 2.5, 0.06); signGroup.add(textMesh);
    signGroup.position.set(x, y, z); signGroup.rotation.y = rotationY; scene.add(signGroup);
    collisionObjects.push(post);
}
createDirectionalSign('NEW FORT', 12, 4, 8, -Math.PI / 4);
createDirectionalSign('OLD FORT', -12, 4, 8, Math.PI / 4);
createDirectionalSign('CHURCH', -2, 4, -2, 0);

// --- CARS (RESTORED DETAILED VERSIONS) ---
function createCar(x, z, color, rotation = 0) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 4.5, z);
    carGroup.rotation.y = rotation;
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), new THREE.MeshLambertMaterial({ color: color }));
    body.position.y = 0.4; carGroup.add(body);
    
    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.5), new THREE.MeshLambertMaterial({ color: color }));
    roof.position.set(0, 1.15, -0.3); carGroup.add(roof);
    
    // Windshield/Windows
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    windowMesh.position.set(0, 1.15, 0.96); carGroup.add(windowMesh);
    
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheelRot = Math.PI / 2;
    [{x:-1.1,z:1.2}, {x:1.1,z:1.2}, {x:-1.1,z:-1.2}, {x:1.1,z:-1.2}].forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = wheelRot; wheel.position.set(pos.x, 0, pos.z); carGroup.add(wheel);
    });
    
    scene.add(carGroup);
    collisionObjects.push(body);
}

// Restore all 4 cars
createCar(-8, 12, 0x2c5aa0, Math.PI / 6);
createCar(5, 15, 0xc41e3a, -Math.PI / 8);
createCar(-3, 18, 0x1a1a1a, Math.PI / 12);
createCar(10, 10, 0xeeeeee, -Math.PI / 5);

// Trees
for (let i = 0; i < 50; i++) {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4.5), new THREE.MeshLambertMaterial({ color: 0x4a3c28 })));
    t.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshLambertMaterial({ color: i % 3 === 0 ? 0x2d5016 : 0x1e6b1e })).translateY(4.5));
    const a = Math.random() * 6.28, d = 110 + Math.random() * 60;
    t.position.set(Math.cos(a) * d, getTerrainHeight(Math.cos(a) * d, Math.sin(a) * d), Math.sin(a) * d);
    scene.add(t);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4.5), new THREE.MeshBasicMaterial({ visible: false }));
    c.position.copy(t.position); c.position.y += 2.25; collisionObjects.push(c);
}

// --- CORE LOGIC ---

// 1. Terrain Height (Hill Math)
function getTerrainHeight(x, z) {
    const d = Math.sqrt(x*x + z*z);
    if (d < 80) return 4;
    if (d < 105) return 4 - (10 * ((d - 80) / 25)); // Smooth slope
    
    // Secondary hills
    const d1 = Math.sqrt((x+80)**2 + (z-20)**2);
    if (d1 < 50) return 2; if (d1 < 65) return 2 - (8 * ((d1 - 50) / 15));
    
    const d2 = Math.sqrt((x-80)**2 + (z+10)**2);
    if (d2 < 50) return 2; if (d2 < 65) return 2 - (8 * ((d2 - 50) / 15));
    
    return -6;
}

// 2. Collision & Floors (Updated to fix "Walking Under" bug)
function checkGroundCollision(x, z, currentY) {
    let h = getTerrainHeight(x, z);
    
    // A. Check Ramp (Math-based smooth slope)
    if (Math.abs(x - rampConfig.x) < rampConfig.width / 2) {
        // Check Z bounds. NOTE: zTop (deep inside) is SMALLER than zBottom in this coordinate system (negative Z is forward)
        // so we check if z is BETWEEN them.
        if (z < rampConfig.zBottom && z > rampConfig.zTop) {
            const dist = rampConfig.zBottom - z;
            const len = rampConfig.zBottom - rampConfig.zTop;
            const progress = dist / len; // 0 at bottom, 1 at top
            const rampH = rampConfig.yBottom + (rampConfig.yTop - rampConfig.yBottom) * progress;
            h = Math.max(h, rampH);
        }
    }

    // B. Check Floors (Standard Rectangles)
    for (let floor of floorObjects) {
        // Bounding box check
        const b = new THREE.Box3().setFromObject(floor.mesh);
        if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
            
            // --- CRITICAL FIX ---
            // Only snap to this floor if the player's FEET are already close to it (or above it).
            // This prevents "teleporting" to the 2nd floor when walking underneath it on the 1st floor.
            // Tolerance: We allow stepping up about 2.5 units (ramp height handles the rest).
            
            if (currentY > floor.height - 2.5) {
                h = Math.max(h, floor.height);
            }
        }
    }
    return h;
}

function animate() {
    requestAnimationFrame(animate);
    
    player.velocity.y += gravity;
    const dir = new THREE.Vector3();
    const speed = player.speed * ((keys['ShiftLeft']||keys['ShiftRight']) ? player.sprintMultiplier : 1);
    
    if (keys['KeyW']) dir.z -= 1;
    if (keys['KeyS']) dir.z += 1;
    if (keys['KeyA']) dir.x -= 1;
    if (keys['KeyD']) dir.x += 1;
    
    if (dir.length() > 0) {
        dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
        const next = player.position.clone().addScaledVector(dir, speed);
        
        // Pass CURRENT Y to check validity of next move
        const nextH = checkGroundCollision(next.x, next.z, player.position.y);
        
        const pBox = new THREE.Box3(
            new THREE.Vector3(next.x-.5, nextH, next.z-.5), 
            new THREE.Vector3(next.x+.5, nextH + player.height, next.z+.5)
        );
        
        let hit = false;
        for (let obj of collisionObjects) {
            if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) {
                hit = true; break;
            }
        }
        
        if (!hit) {
            player.position.x = next.x;
            player.position.z = next.z;
        }
    }
    
    player.position.y += player.velocity.y;
    
    // Check ground at CURRENT position
    const gh = checkGroundCollision(player.position.x, player.position.z, player.position.y);
    
    if (player.position.y - player.height <= gh) {
        player.position.y = gh + player.height;
        player.velocity.y = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }
    
    if (player.position.y < -50) player.position.copy(initialPosition);
    
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.rotation.y;
    camera.rotation.x = player.rotation.x;
    camera.position.copy(player.position);
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();