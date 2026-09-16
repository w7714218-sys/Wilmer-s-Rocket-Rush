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

let speed = 0.35;
let distance = 0;
let playerX = 0;

const keys = {
    left: false,
    right: false
};

const clock = new THREE.Clock();

// ========================================
// NAVE SIMPLE
// ========================================

const ship = new THREE.Group();

const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.4, 5),
    new THREE.MeshStandardMaterial({
        color: 0xf4f4f4,
        metalness: 0.2,
        roughness: 0.7
    })
);

body.rotation.x = -Math.PI / 2;
ship.add(body);

const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 12),
    new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        metalness: 0.5,
        roughness: 0.3
    })
);

cockpit.scale.set(1, 0.7, 1.3);
cockpit.position.z = 0.3;
ship.add(cockpit);

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

function checkCollisions() {
    shipBox.setFromObject(ship);

    for (const segment of segments) {
        for (const object of segment.children) {
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

    document.getElementById('final-distance').textContent =
        Math.floor(distance);

    document.getElementById('game-over').classList.remove('hidden');
}

document.getElementById('restart').addEventListener('click', () => {
    location.reload();
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
    const movement = speed * 60 * delta;

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
        }
    }

    distance += movement * 0.1;

    document.getElementById('speed').textContent =
        Math.floor(speed * 100);

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

    updateGame(delta);
    updateCamera();

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