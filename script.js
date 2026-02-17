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
        ctx.fillStyle = '#9a8566'; ctx.fillRect(0, 0, 256, 256);
        // Realistic stone texture
        for(let i=0; i<200; i++) { 
            ctx.fillStyle = `rgba(${120 + Math.random()*40},${100 + Math.random()*30},${80 + Math.random()*20},0.4)`; 
            ctx.fillRect(Math.random()*256, Math.random()*256, 12, 12); 
        }
        // Stone blocks pattern
        ctx.strokeStyle = 'rgba(70, 60, 50, 0.6)'; ctx.lineWidth = 2;
        for(let i=0; i<8; i++) { 
            ctx.beginPath(); 
            ctx.moveTo(0, i*32); 
            ctx.lineTo(256, i*32); 
            ctx.stroke(); 
        }
        for(let i=0; i<8; i++) { 
            ctx.beginPath(); 
            ctx.moveTo(i*32 + (Math.floor(i/2)%2)*16, 0); 
            ctx.lineTo(i*32 + (Math.floor(i/2)%2)*16, 256); 
            ctx.stroke(); 
        }
        // Weathering and cracks
        for(let i=0; i<30; i++) { 
            ctx.fillStyle = `rgba(60,50,40,${Math.random()*0.3})`; 
            ctx.fillRect(Math.random()*256, Math.random()*256, 20, 3); 
        }
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

function createRectangularWindow(x, y, z, rotation, width = 1.2, height = 2) {
    const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.15), 
        new THREE.MeshBasicMaterial({ color: 0x2a2a2a })
    );
    windowFrame.position.set(x, y, z); 
    windowFrame.rotation.y = rotation;
    scene.add(windowFrame);
    
    // Glass panes
    const glass = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, height * 0.9, 0.05), 
        new THREE.MeshPhongMaterial({ 
            color: 0x88ccff, 
            transparent: true, 
            opacity: 0.3,
            shininess: 100
        })
    );
    glass.position.set(x, y, z); 
    glass.rotation.y = rotation;
    scene.add(glass);
}

function createInfoSign(title, description, x, y, z, rotationY) {
    const signGroup = new THREE.Group();
    
    // Post
    const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2), 
        new THREE.MeshLambertMaterial({ color: 0x3d2817 })
    );
    post.position.y = 1;
    signGroup.add(post);
    
    // Board
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2, 0.1), 
        new THREE.MeshLambertMaterial({ color: 0x5d4e37 })
    );
    board.position.y = 2.5;
    signGroup.add(board);
    
    // Text canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 342;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#5d4e37';
    ctx.fillRect(0, 0, 512, 342);
    
    // Border
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 334);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 60);
    
    // Underline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 75);
    ctx.lineTo(432, 75);
    ctx.stroke();
    
    // Description (wrapped text)
    ctx.font = '24px Arial';
    ctx.fillStyle = '#f0f0f0';
    const words = description.split(' ');
    let line = '';
    let yPos = 120;
    const maxWidth = 450;
    const lineHeight = 32;
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, 256, yPos);
            line = words[i] + ' ';
            yPos += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, 256, yPos);
    
    // Apply texture to mesh
    const textMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.9, 1.9),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
    );
    textMesh.position.set(0, 2.5, 0.06);
    signGroup.add(textMesh);
    
    signGroup.position.set(x, y, z);
    signGroup.rotation.y = rotationY;
    scene.add(signGroup);
    
    collisionObjects.push(post);
}

// --- NEW FORTRESS ---
const newFortX = 40; const newFortZ = -20; const wallDepth = 1.2;

// Front wall with door
createWallWithDoor(32, 8, wallDepth, newFortX, 8, newFortZ + 5, 0, false, 3.5, 4.5);

// Right wall with subtle damage
createWall(wallDepth, 7.5, 22, newFortX + 16, 7.75, newFortZ - 6, 0, false);

// Back wall - slightly shorter to show age
createWall(32, 7.8, wallDepth, newFortX, 7.9, newFortZ - 17, 0, false);

// Left wall
createWall(wallDepth, 8, 22, newFortX - 16, 8, newFortZ - 6, 0, false);

const newFloor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 20), new THREE.MeshLambertMaterial({ color: 0x8b7355 }));
newFloor.position.set(newFortX, 4.1, newFortZ - 6);
scene.add(newFloor);
floorObjects.push({ mesh: newFloor, height: 4.1 });

// Fixed windows on front wall
createRectangularWindow(newFortX - 10, 8, newFortZ + 5 + (wallDepth/2) + 0.15, 0);
createRectangularWindow(newFortX - 3, 8, newFortZ + 5 + (wallDepth/2) + 0.15, 0);
createRectangularWindow(newFortX + 4, 8, newFortZ + 5 + (wallDepth/2) + 0.15, 0);
createRectangularWindow(newFortX + 11, 8, newFortZ + 5 + (wallDepth/2) + 0.15, 0);

// Windows on side walls
createRectangularWindow(newFortX + 16 + (wallDepth/2) + 0.15, 8, newFortZ - 10, Math.PI/2);
createRectangularWindow(newFortX + 16 + (wallDepth/2) + 0.15, 8, newFortZ - 2, Math.PI/2);

createRectangularWindow(newFortX - 16 - (wallDepth/2) - 0.15, 8, newFortZ - 10, -Math.PI/2);
createRectangularWindow(newFortX - 16 - (wallDepth/2) - 0.15, 8, newFortZ - 2, -Math.PI/2);

// --- INTERNAL DESIGN ---

// Central pillar/column
const pillarGeometry = new THREE.CylinderGeometry(0.8, 0.8, 7, 8);
const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x7a6a54 });
const centralPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
centralPillar.position.set(newFortX, 7.6, newFortZ - 6);
centralPillar.castShadow = true;
centralPillar.receiveShadow = true;
scene.add(centralPillar);
collisionObjects.push(centralPillar);

// Wooden beams/supports
const beamMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4e37 });

// Horizontal beams
const beam1 = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 0.4), beamMaterial);
beam1.position.set(newFortX, 10.5, newFortZ - 6);
beam1.castShadow = true;
scene.add(beam1);

const beam2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 18), beamMaterial);
beam2.position.set(newFortX, 10.5, newFortZ - 6);
beam2.castShadow = true;
scene.add(beam2);

// Furniture - Long wooden table in center
const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.3, 2.5),
    new THREE.MeshLambertMaterial({ color: 0x6b5638 })
);
tableTop.position.set(newFortX, 5.5, newFortZ - 6);
tableTop.castShadow = true;
tableTop.receiveShadow = true;
scene.add(tableTop);

// Table legs
const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2);
const legMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4e37 });
const tableLegPositions = [
    {x: newFortX - 3.5, z: newFortZ - 5},
    {x: newFortX + 3.5, z: newFortZ - 5},
    {x: newFortX - 3.5, z: newFortZ - 7},
    {x: newFortX + 3.5, z: newFortZ - 7}
];
tableLegPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos.x, 4.7, pos.z);
    leg.castShadow = true;
    scene.add(leg);
});

// Benches on both sides of table
const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x6b5638 });

// Bench 1 (left side)
const bench1 = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.8), benchMaterial);
bench1.position.set(newFortX, 4.8, newFortZ - 3.5);
bench1.castShadow = true;
bench1.receiveShadow = true;
scene.add(bench1);

const bench1Leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6), legMaterial);
bench1Leg1.position.set(newFortX - 3, 4.5, newFortZ - 3.5);
scene.add(bench1Leg1);

const bench1Leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6), legMaterial);
bench1Leg2.position.set(newFortX + 3, 4.5, newFortZ - 3.5);
scene.add(bench1Leg2);

// Bench 2 (right side)
const bench2 = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.8), benchMaterial);
bench2.position.set(newFortX, 4.8, newFortZ - 8.5);
bench2.castShadow = true;
bench2.receiveShadow = true;
scene.add(bench2);

const bench2Leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6), legMaterial);
bench2Leg1.position.set(newFortX - 3, 4.5, newFortZ - 8.5);
scene.add(bench2Leg1);

const bench2Leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6), legMaterial);
bench2Leg2.position.set(newFortX + 3, 4.5, newFortZ - 8.5);
scene.add(bench2Leg2);

// Weapon rack on back wall
const rackBase = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x5d4e37 })
);
rackBase.position.set(newFortX, 6, newFortZ - 16.5);
rackBase.castShadow = true;
scene.add(rackBase);

// Vertical supports for weapon rack
const rackSupport1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x5d4e37 })
);
rackSupport1.position.set(newFortX - 1.8, 5, newFortZ - 16.3);
scene.add(rackSupport1);

const rackSupport2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x5d4e37 })
);
rackSupport2.position.set(newFortX + 1.8, 5, newFortZ - 16.3);
scene.add(rackSupport2);

// Decorative swords on rack
const swordMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
for (let i = 0; i < 3; i++) {
    const sword = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2, 0.05),
        swordMaterial
    );
    sword.position.set(newFortX - 1.2 + i * 1.2, 6, newFortZ - 16.2);
    sword.rotation.z = Math.PI / 6;
    scene.add(sword);
}

// Fireplace on left wall
const fireplaceMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
const fireplaceBase = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.5, 1),
    fireplaceMaterial
);
fireplaceBase.position.set(newFortX - 15, 5.4, newFortZ - 6);
fireplaceBase.castShadow = true;
scene.add(fireplaceBase);
collisionObjects.push(fireplaceBase);

// Fire glow (using emissive material)
const fireGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff6600 })
);
fireGlow.position.set(newFortX - 15, 4.8, newFortZ - 6);
scene.add(fireGlow);

// Chimney
const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.8),
    fireplaceMaterial
);
chimney.position.set(newFortX - 15, 8.5, newFortZ - 6);
scene.add(chimney);

// Wall torches
const torchMaterial = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });

// Torch 1 (right wall)
const torch1Holder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), torchMaterial);
torch1Holder.position.set(newFortX + 15, 7, newFortZ - 10);
torch1Holder.rotation.z = Math.PI / 2;
scene.add(torch1Holder);

const torch1Flame = new THREE.Mesh(new THREE.SphereGeometry(0.2), flameMaterial);
torch1Flame.position.set(newFortX + 14.5, 7, newFortZ - 10);
scene.add(torch1Flame);

// Torch 2 (right wall)
const torch2Holder = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), torchMaterial);
torch2Holder.position.set(newFortX + 15, 7, newFortZ - 2);
torch2Holder.rotation.z = Math.PI / 2;
scene.add(torch2Holder);

const torch2Flame = new THREE.Mesh(new THREE.SphereGeometry(0.2), flameMaterial);
torch2Flame.position.set(newFortX + 14.5, 7, newFortZ - 2);
scene.add(torch2Flame);

// Storage chest near corner
const chestMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
const chest = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1, 1),
    chestMaterial
);
chest.position.set(newFortX + 12, 4.6, newFortZ - 14);
chest.castShadow = true;
chest.receiveShadow = true;
scene.add(chest);
collisionObjects.push(chest);

// Chest lid
const chestLid = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.15, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x7a5028 })
);
chestLid.position.set(newFortX + 12, 5.15, newFortZ - 14);
chestLid.castShadow = true;
scene.add(chestLid);

// Barrels in corner
const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4e37 });
const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), barrelMaterial);
barrel1.position.set(newFortX - 12, 4.7, newFortZ - 14);
barrel1.castShadow = true;
scene.add(barrel1);
collisionObjects.push(barrel1);

const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), barrelMaterial);
barrel2.position.set(newFortX - 13, 4.7, newFortZ - 14.5);
barrel2.castShadow = true;
scene.add(barrel2);
collisionObjects.push(barrel2);

// Load roof tile texture
const roofTileTexture = textureLoader.load('textures/tiles.jpg');
roofTileTexture.wrapS = THREE.RepeatWrapping;
roofTileTexture.wrapT = THREE.RepeatWrapping;
roofTileTexture.repeat.set(4, 4);

// FIXED ROOF - Now sits on top of walls properly with tile texture
const newRoof = new THREE.Mesh(
    new THREE.ConeGeometry(25, 5, 4), 
    new THREE.MeshLambertMaterial({ map: roofTileTexture })
);
newRoof.position.set(newFortX, 14.3, newFortZ - 7); 
newRoof.rotation.y = Math.PI / 4;
scene.add(newRoof);

// Info sign for New Fortress
createInfoSign(
    'NEW FORTRESS',
    'Tetovo Fortress was restored in 2008 by stabilizing its medieval walls and rebuilding damaged sections using traditional materials, helping preserve the site and promote local cultural heritage.',
    newFortX + -18, 4, newFortZ + 10, -Math.PI / 4
);

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

// Info sign for Old Fortress
createInfoSign(
    'OLD FORTRESS',
    'Tetovo Fortress was built in 1820 by Abdurrahman Pasha as a defensive fortress to protect the city and control the surrounding Polog region.',
    oldFortX - -13, 4, oldFortZ + 12, Math.PI / 3
);

// --- RAMP LOGIC AND VISUALS ---

// Ramp Configuration
const rampConfig = {
    x: oldFortX + 5,
    width: 4.5,
    zBottom: oldFortZ + 6,
    zTop: oldFortZ - 6,
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
visualRamp.position.set(
    rampConfig.x, 
    rampConfig.yBottom + rampHeight/2, 
    (rampConfig.zBottom + rampConfig.zTop)/2
);
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

// Church windows
createRectangularWindow(churchX - 4, 7.5, churchZ + 5 + 0.6, 0, 1, 2.5);
createRectangularWindow(churchX + 4, 7.5, churchZ + 5 + 0.6, 0, 1, 2.5);

createRectangularWindow(churchX + 6.5 + 0.6, 7.5, churchZ + 2, Math.PI/2, 1, 2.5);
createRectangularWindow(churchX + 6.5 + 0.6, 7.5, churchZ - 4, Math.PI/2, 1, 2.5);

createRectangularWindow(churchX - 6.5 - 0.6, 7.5, churchZ + 2, -Math.PI/2, 1, 2.5);
createRectangularWindow(churchX - 6.5 - 0.6, 7.5, churchZ - 4, -Math.PI/2, 1, 2.5);

// Load church roof tile texture
const churchRoofTexture = textureLoader.load('textures/church-tiles.jpg');
churchRoofTexture.wrapS = THREE.RepeatWrapping;
churchRoofTexture.wrapT = THREE.RepeatWrapping;
churchRoofTexture.repeat.set(3, 3);

// FIXED DOME - Now sits on top of walls properly with texture
const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), 
    new THREE.MeshLambertMaterial({ 
        map: churchRoofTexture,
        side: THREE.DoubleSide
    })
);
dome.position.set(churchX, 11, churchZ - 1);
scene.add(dome);

const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
crossV.position.set(churchX, 12, churchZ + 5.5);
scene.add(crossV);
const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd700 }));
crossH.position.set(churchX, 12.5, churchZ + 5.5);
scene.add(crossH);

// Info sign for Church
createInfoSign(
    'SACRED CHAPEL',
    'Church of St. Athanasius was restored in the early 21st century through structural repairs and conservation of its frescoes to preserve its historical and religious value.',
    churchX - 5, 4, churchZ - -10, Math.PI / 8
);

// --- ROADS & DECOR ---
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

// Side Roads
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

// --- CARS ---
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

function getTerrainHeight(x, z) {
    const d = Math.sqrt(x*x + z*z);
    if (d < 80) return 4;
    if (d < 105) return 4 - (10 * ((d - 80) / 25));
    
    const d1 = Math.sqrt((x+80)**2 + (z-20)**2);
    if (d1 < 50) return 2; if (d1 < 65) return 2 - (8 * ((d1 - 50) / 15));
    
    const d2 = Math.sqrt((x-80)**2 + (z+10)**2);
    if (d2 < 50) return 2; if (d2 < 65) return 2 - (8 * ((d2 - 50) / 15));
    
    return -6;
}

function checkGroundCollision(x, z, currentY) {
    let h = getTerrainHeight(x, z);
    
    if (Math.abs(x - rampConfig.x) < rampConfig.width / 2) {
        if (z < rampConfig.zBottom && z > rampConfig.zTop) {
            const dist = rampConfig.zBottom - z;
            const len = rampConfig.zBottom - rampConfig.zTop;
            const progress = dist / len;
            const rampH = rampConfig.yBottom + (rampConfig.yTop - rampConfig.yBottom) * progress;
            h = Math.max(h, rampH);
        }
    }

    for (let floor of floorObjects) {
        const b = new THREE.Box3().setFromObject(floor.mesh);
        if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
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