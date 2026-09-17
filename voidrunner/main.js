// ========================================
// VOIDRUNNER - ENDLESS WORLD
// ========================================

import * as THREE from 'three';

// ========================================
// ESCENA
// ========================================

const canvas = document.getElementById('game-canvas');

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xd8d8d8);

scene.fog = new THREE.Fog(
    0xd8d8d8,
    80,
    300
);

// ========================================
// CÁMARA
// ========================================

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 5, 12);

// ========================================
// RENDERER
// ========================================

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

// ========================================
// LUCES
// ========================================

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    2.5
);

scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

sunLight.position.set(30, 60, 20);
scene.add(sunLight);

const hemisphereLight = new THREE.HemisphereLight(
    0xffffff,
    0xb0b0b0,
    2
);

scene.add(hemisphereLight);

// ========================================
// ESTADO
// ========================================

let gameRunning = true;
let gameState = 'menu'; // menu, playing, gameover

let speed = 0.35;
let distance = 0;
let coinsCollected = 0;
let totalCoins = Number.parseInt(localStorage.getItem('voidrunner-coins') || '0', 10);
let energy = 75;
let speedBoostTime = 0;
let playerX = 0;

const keys = {
    left: false,
    right: false
};

const clock = new THREE.Clock();

// ========================================
// COHETE REALISTA SIMPLE
// ========================================

const ship = new THREE.Group();

// Main rocket body - aerodynamic, wider torso
const bodyGeometry = new THREE.LatheGeometry(
    [
        new THREE.Vector2(0.00, -1.25), // Rear tip
        new THREE.Vector2(0.34, -1.20),
        new THREE.Vector2(0.48, -0.95),
        new THREE.Vector2(0.52, -0.55),
        new THREE.Vector2(0.56,  0.00), // Wider torso
        new THREE.Vector2(0.55,  0.45),
        new THREE.Vector2(0.54,  0.85),
        new THREE.Vector2(0.40,  1.15),
        new THREE.Vector2(0.00,  1.25)  // Front tip
    ],
    24
);

const body = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.35,
        roughness: 0.55
    })
);

// LatheGeometry is created along Y, so rotate it to point along Z
body.rotation.x = Math.PI / 2;

ship.add(body);

// ========================================
// PUNTA DEL COHETE
// ========================================

// La parte delantera apunta hacia -Z
const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.9, 24),
    new THREE.MeshStandardMaterial({
        color: 0xcc0000,
        metalness: 0.2,
        roughness: 0.8
    })
);

// El cono apunta hacia -Z
nose.rotation.x = -Math.PI / 2;
nose.position.z = -1.50;
ship.add(nose);




// ========================================
// VENTANA ARRIBA DEL COHETE
// ========================================

// Borde gris metálico
const windowFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.055, 12, 32),
    new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.25
    })
);

// La ventana queda mirando hacia arriba
windowFrame.rotation.x = Math.PI / 2;

// X = izquierda/derecha
// Y = arriba/abajo
// Z = delante/detrás
windowFrame.position.set(0, 0.53, 0.15);

ship.add(windowFrame);


// Cristal azul
const windowGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 28, 26),
    new THREE.MeshStandardMaterial({
        color: 0x008cff,
        metalness: 0.25,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
    })
);

windowGlass.scale.set(1, 0.25, 1.4);

windowGlass.position.set(
    0,
    0.50,
    0.15
);

ship.add(windowGlass);

// ========================================
// PARTE TRASERA DEL COHETE
// ========================================

// Turbina y escape - sistema original
const turbine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.5, 16),
    new THREE.MeshStandardMaterial({
        color: 0x33383d,
        metalness: 0.9,
        roughness: 0.25
    })
);

turbine.rotation.x = Math.PI / 2;
turbine.position.z = 1.18;
ship.add(turbine);

const turbineRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.07, 8, 20),
    new THREE.MeshStandardMaterial({
        color: 0x8c969b,
        metalness: 1,
        roughness: 0.2
    })
);

turbineRing.position.z = 1.37;
ship.add(turbineRing);

const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.5, 12),
    new THREE.MeshBasicMaterial({
        color: 0xff5a00,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

flameOuter.rotation.x = Math.PI / 2;
flameOuter.position.z = 2.08;
ship.add(flameOuter);

const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 1.05, 10),
    new THREE.MeshBasicMaterial({
        color: 0xffe7a1,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);

flameCore.rotation.x = Math.PI / 2;
flameCore.position.z = 1.82;
ship.add(flameCore);

const exhaustLight = new THREE.PointLight(0xff6a1a, 2.5, 7, 2);
exhaustLight.position.set(0, 0, 1.4);
ship.add(exhaustLight);

function updateExhaust(time) {
    const pulse = 0.92 + Math.sin(time * 32) * 0.08;

    flameOuter.scale.set(
        0.9 + Math.sin(time * 27) * 0.08,
        pulse,
        0.9 + Math.sin(time * 23 + 1) * 0.08
    );
    flameCore.scale.y = 0.92 + Math.sin(time * 38 + 0.5) * 0.12;
    exhaustLight.intensity = 2.2 + Math.sin(time * 24) * 0.45;
}

ship.position.set(0, 2, 5);
scene.add(ship);

// ========================================
// SUELO
// ========================================

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 1000),
    new THREE.MeshStandardMaterial({
        color: 0xbcbcbc,
        roughness: 1
    })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;

scene.add(floor);

// ========================================
// ZONA CENTRAL DE VUELO
// ========================================

const road = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 1000),
    new THREE.MeshStandardMaterial({
        color: 0xa8a8a8,
        roughness: 1
    })
);

road.rotation.x = -Math.PI / 2;
road.position.y = 0.01;

scene.add(road);

// ========================================
// MUNDO INFINITO
// ========================================

const segments = [];

const SEGMENT_LENGTH = 50;
const SEGMENT_COUNT = 12;

function createSegment(z) {
    const segment = new THREE.Group();

    segment.position.z = z;

    createBuildings(segment);
    createObstacles(segment);
    createCoins(segment);
    createStars(segment);

    scene.add(segment);
    segments.push(segment);
}

// ========================================
// EDIFICIOS
// ========================================

function createBuildings(segment) {
    const material = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.9
    });

    for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
            const width = 3 + Math.random() * 5;
            const height = 3 + Math.random() * 18;
            const depth = 3 + Math.random() * 8;

            const building = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, depth),
                material
            );

            building.position.x =
                side * (18 + Math.random() * 18);

            building.position.y = height / 2;

            building.position.z =
                (Math.random() - 0.5) * SEGMENT_LENGTH;

            segment.add(building);
        }
    }
}

// ========================================
// OBSTÁCULOS
// ========================================

function createObstacles(segment) {
    // Algunos segmentos no tienen obstáculos
    if (Math.random() < 0.3) return;

    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.8
    });

    const positions = [-6, -3, 0, 3, 6];

    const obstacleCount = Math.random() < 0.5 ? 1 : 2;
    const used = [];

    for (let i = 0; i < obstacleCount; i++) {
        let x;

        do {
            x = positions[
                Math.floor(Math.random() * positions.length)
            ];
        } while (used.includes(x));

        used.push(x);

        const width = 2;
        const height = 2 + Math.random() * 4;
        const depth = 2;

        const obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        obstacle.position.x = x;
        obstacle.position.y = height / 2;

        obstacle.position.z =
            (Math.random() - 0.5) * 30;

        obstacle.userData.isObstacle = true;

        segment.add(obstacle);
    }
}

// ========================================
// MONEDAS
// ========================================

const coinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdf00,
    emissive: 0xb88600,
    emissiveIntensity: 0.75,
    metalness: 0.7,
    roughness: 0.22
});

function createCoins(segment) {
    const coinCount = 1 + Math.floor(Math.random() * 3);
    const positions = [-6, -3, 0, 3, 6];

    for (let i = 0; i < coinCount; i++) {
        const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.23, 0.23, 0.035, 24),
            coinMaterial
        );

        coin.rotation.x = Math.PI / 2;
        coin.position.set(
            positions[Math.floor(Math.random() * positions.length)],
            2 + Math.random() * 0.7,
            (Math.random() - 0.5) * (SEGMENT_LENGTH - 8)
        );
        coin.userData.isCoin = true;
        segment.add(coin);
    }
}

const starMaterial = new THREE.MeshStandardMaterial({
    color: 0x39e66f,
    emissive: 0x0a8f3c,
    emissiveIntensity: 1.1,
    metalness: 0.35,
    roughness: 0.2
});

function createStarShape() {
    const shape = new THREE.Shape();
    const points = 10;
    const outerRadius = 0.34;
    const innerRadius = 0.15;

    for (let i = 0; i < points; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }

    shape.closePath();
    return shape;
}

function createStars(segment) {
    if (Math.random() > 0.14) return;

    const star = new THREE.Group();
    const starMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(createStarShape(), {
            depth: 0.14,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.025,
            bevelThickness: 0.025
        }),
        starMaterial
    );

    const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.43, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0x62ff91,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );

    star.add(halo);
    star.add(starMesh);

    star.position.set(
        [-6, -3, 0, 3, 6][Math.floor(Math.random() * 5)],
        2.2 + Math.random() * 0.5,
        (Math.random() - 0.5) * (SEGMENT_LENGTH - 8)
    );
    star.userData.isStar = true;
    segment.add(star);
}

// Crear segmentos iniciales
for (let i = 0; i < SEGMENT_COUNT; i++) {
    createSegment(-i * SEGMENT_LENGTH);
}

// ========================================
// CONTROLES
// ========================================

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === 'arrowleft' || key === 'a') {
        keys.left = true;
    }

    if (key === 'arrowright' || key === 'd') {
        keys.right = true;
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();

    if (key === 'arrowleft' || key === 'a') {
        keys.left = false;
    }

    if (key === 'arrowright' || key === 'd') {
        keys.right = false;
    }
});

// ========================================
// COLISIONES
// ========================================

const shipBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();
const coinBox = new THREE.Box3();
const starBox = new THREE.Box3();

function updateCoinCounter() {
    document.getElementById('coins').textContent = coinsCollected;
    document.getElementById('hangar-coins').textContent = totalCoins;
}

function bankCollectedCoins() {
    if (coinsCollected === 0) return;

    totalCoins += coinsCollected;
    coinsCollected = 0;
    localStorage.setItem('voidrunner-coins', totalCoins);
    updateCoinCounter();
}

function checkCollisions() {
    shipBox.setFromObject(ship);

    for (const segment of segments) {
        for (const object of segment.children) {
            if (object.userData.isCoin) {
                coinBox.setFromObject(object);

                if (shipBox.intersectsBox(coinBox)) {
                    segment.remove(object);
                    coinsCollected++;
                    updateCoinCounter();
                }

                continue;
            }

            if (object.userData.isStar) {
                starBox.setFromObject(object);

                if (shipBox.intersectsBox(starBox)) {
                    segment.remove(object);
                    energy = Math.min(100, energy + 35);
                    speedBoostTime = 5;
                }

                continue;
            }

            if (!object.userData.isObstacle) continue;

            obstacleBox.setFromObject(object);

            if (shipBox.intersectsBox(obstacleBox)) {
                endGame();
                return;
            }
        }
    }
}

// ========================================
// GAME OVER
// ========================================

function endGame() {
    if (!gameRunning) return;

    gameRunning = false;
    gameState = 'gameover';
    bankCollectedCoins();

    document.getElementById('final-distance').textContent =
        Math.floor(distance);

    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

document.getElementById('restart').addEventListener('click', () => {
    // Volver al menú principal
    gameState = 'menu';
    gameRunning = true;
    
    // Resetear posición del cohete
    ship.position.set(0, 2, 5);
    ship.rotation.set(0, 0, 0);
    playerX = 0;
    distance = 0;
    speed = 0.35;
    energy = 75;
    speedBoostTime = 0;
    updateCoinCounter();
    
    // Ocultar game over, mostrar menú
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
});

// Botón de play
document.getElementById('play-btn').addEventListener('click', () => {
    gameState = 'playing';
    
    // Resetear juego
    ship.position.set(0, 2, 5);
    ship.rotation.set(0, 0, 0);
    playerX = 0;
    distance = 0;
    coinsCollected = 0;
    speed = 0.35;
    energy = 75;
    speedBoostTime = 0;
    updateCoinCounter();
    
    // Ocultar menú, mostrar HUD
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
});

// ========================================
// ACTUALIZAR JUEGO
// ========================================

function updateGame(delta) {
    if (!gameRunning) return;

    // Movimiento lateral con flechas o A/D
    const lateralSpeed = 10 * delta;

    if (keys.left) {
        playerX -= lateralSpeed;
    }

    if (keys.right) {
        playerX += lateralSpeed;
    }

    playerX = THREE.MathUtils.clamp(playerX, -8, 8);
    ship.position.x = playerX;

    const targetRotation =
        keys.left ? 0.2 :
        keys.right ? -0.2 : 0;

    ship.rotation.z += (targetRotation - ship.rotation.z) * 0.12;

    // Mantener el avance del juego hacia delante
    speed = Math.min(speed + delta * 0.003, 1.2);
    energy = Math.max(0, energy - delta * 1.5);
    speedBoostTime = Math.max(0, speedBoostTime - delta);
    const boostMultiplier = speedBoostTime > 0 ? 1.65 : 1;
    const movement = speed * boostMultiplier * 60 * delta;

    for (const segment of segments) {
        segment.position.z += movement;
    }

    // Reciclar segmentos
    for (const segment of segments) {
        if (segment.position.z > 40) {
            const farthestZ = Math.min(
                ...segments.map(s => s.position.z)
            );

            segment.position.z =
                farthestZ - SEGMENT_LENGTH;

            // Vaciar el segmento
            while (segment.children.length > 0) {
                segment.remove(segment.children[0]);
            }

            // Crear contenido nuevo
            createBuildings(segment);
            createObstacles(segment);
            createCoins(segment);
            createStars(segment);
        }
    }

    distance += movement * 0.1;

    document.getElementById('speed').textContent =
        Math.floor(speed * boostMultiplier * 100);

    document.getElementById('distance').textContent =
        Math.floor(distance);

    checkCollisions();
}

// ========================================
// CÁMARA
// ========================================

function updateCamera() {
    const targetX = ship.position.x * 0.35;

    camera.position.x +=
        (targetX - camera.position.x) * 0.05;

    camera.position.y = 5;
    camera.position.z = 12;

    camera.lookAt(
        ship.position.x * 0.2,
        1.5,
        -25
    );
}

// ========================================
// ANIMACIÓN
// ========================================

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(
        clock.getDelta(),
        0.05
    );

    if (gameState === 'menu') {
        // En el hangar, el cohete gira
        ship.rotation.y += delta * 0.5;
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 2, 0);
        
        // Asegurar que el menú está visible
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
    } else if (gameState === 'playing') {
        updateGame(delta);
        updateCamera();
        updateExhaust(clock.elapsedTime);

        for (const segment of segments) {
            for (const object of segment.children) {
                if (object.userData.isCoin) {
                    object.rotation.z += delta * 4;
                    object.rotation.y += delta * 1.5;
                }
                if (object.userData.isStar) {
                    object.rotation.z += delta * 2.5;
                    object.rotation.y += delta * 1.5;
                }
            }
        }
        
        // Asegurar que el HUD está visible
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
    } else if (gameState === 'gameover') {
        // En game over, mantener la cámara estática
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over').classList.remove('hidden');
    }

    renderer.render(scene, camera);
}

animate();

// ========================================
// RESIZE
// ========================================

window.addEventListener('resize', () => {
    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});