import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


window.addEventListener('DOMContentLoaded', () => {
    
// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(-1, 2, 12);
// camera.lookAt(-0.5, 2.5, 0); //no longer needed, focus logic handled in render loop

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
const container = document.getElementById('three-js-container');
container.appendChild(renderer.domElement);

// GLTF Loader
const loader = new GLTFLoader();

// Create group for carousel items
const carouselGroup = new THREE.Group();
scene.add(carouselGroup);


// Orbit Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.target.set(0, 0, 0);

// Ground plane
const planeGeometry = new THREE.PlaneGeometry(50, 20);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: '#000000',
});
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.position.y = -1;
scene.add(ground);

// Spotlight
const spotlight = new THREE.SpotLight(0xffffff, 2);
spotlight.position.set(-5, 10, 0); // left side, shining down
spotlight.angle = Math.PI / 4; // lower number, wider beam
spotlight.penumbra = 1; // edge softness
spotlight.decay = 0.8; // light falloff
spotlight.distance = 20; // light distance lol
spotlight.intensity = 15; // higher number, brighter light

spotlight.castShadow = true;
spotlight.shadow.mapSize.set(1024, 1024);

// Aim the light slightly left of center on the plane
spotlight.target.position.set(-5, 0, 0);
scene.add(spotlight);
scene.add(spotlight.target);


// Spotlight 2
const spotlight2 = new THREE.SpotLight(0xffffff, 2);
spotlight2.position.set(-5, 3, 10); // left side, shining down
spotlight2.angle = Math.PI / 4; // lower number, wider beam
spotlight2.penumbra = 1; // edge softness
spotlight2.decay = 0.8; // light falloff
spotlight2.distance = 20; // light distance lol
spotlight2.intensity = 15; // higher number, brighter light

spotlight2.castShadow = true;
spotlight2.shadow.mapSize.set(1024, 1024);

// Aim the light slightly left of center on the plane
spotlight2.target.position.set(-5, 3, 0);
scene.add(spotlight2);
scene.add(spotlight2.target);


// Optional: subtle ambient so plane isn't pitch black
const ambient = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambient);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load model and return the loaded scene (does not auto-add to main scene)
async function loadModel(url) {
  try {
    const gltf = await loader.loadAsync(url);
    return gltf.scene;
  } catch (error) {
    console.error('Failed to load model:', error);
    return null;
  }
}



// Carousel model URLs and container for instances
const modelUrls = [
  '/mebruh.glb',
  '/newKPstuff.glb',
  '/pomo_shelf.glb',
  '/newKPstuff.glb',
  '/pandamenu.glb',
  '/lhdlogo.glb'
];
const radius = 1; // Radius of the carousel circle
const objects = []; // store references to placed model instances
// Position the carousel group so the circular layout is centered near the spotlight target.
// We offset the group's position by -radius on X so that item index 0 (angle 0) sits under the spotlight target.
if (spotlight && spotlight.target) {
  carouselGroup.position.copy(spotlight.target.position.clone().add(new THREE.Vector3(-radius, 0, 0)));
}

// Load all models, then place them around the carousel (all items placed on the circle)
Promise.all(modelUrls.map(url => loadModel(url))).then(loadedScenes => {
  loadedScenes.forEach((modelScene, i) => {
    if (!modelScene) return;
    const angle = (i / loadedScenes.length) * Math.PI * 2;
    const instance = modelScene.clone(true);
    instance.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    instance.rotation.y = angle + Math.PI / 2; // orient towards center
    instance.userData.index = i;
    instance.scale.set(1,1,1);
    instance.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    carouselGroup.add(instance);
      // compute a stable center for focus using the object's bounding box in world space
      const box = new THREE.Box3().setFromObject(instance);
      const center = new THREE.Vector3();
      box.getCenter(center);
      instance.userData.center = center;

      // store home position (local to carouselGroup) and set visibility: only index 0 visible initially
      instance.userData.home = instance.position.clone();
      instance.visible = (i === 0);

      objects.push(instance);
  });
  // After placing all instances, snap them down so their bottoms sit on the ground plane
  (function snapToGround() {
    const groundY = ground.position.y; // ground is placed at this Y
    objects.forEach(obj => {
      if (!obj) return;
      // compute world-space bounding box
      const box = new THREE.Box3().setFromObject(obj);
      const minY = box.min.y;
      if (!isFinite(minY)) return;
      const delta = groundY - minY;
      if (Math.abs(delta) > 1e-4) {
        obj.position.y += delta;
        // also adjust stored home position so future restores remain grounded
        if (obj.userData && obj.userData.home) obj.userData.home.y += delta;
      }
    });
  })();

  // setup buttons to bring objects under the spotlight
  function setupButtons() {
    const ids = [
      'aboutme', 
      'gnp', 
      'daapw',
      'album',
      'menu',
      'lhd'
    ];
    ids.forEach((id, idx) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (!objects[idx]) return;
        // compute spotlight position in carousel local space
        const worldTarget = spotlight.target.getWorldPosition(new THREE.Vector3());
        const localTarget = worldTarget.clone();
        carouselGroup.worldToLocal(localTarget);

        // instantly move the chosen object to the spotlight (no animation)
        objects[idx].position.copy(localTarget);
        // snap this moved object to the ground so it doesn't float
        (function snapMovedToGround(obj) {
          const box = new THREE.Box3().setFromObject(obj);
          const minY = box.min.y;
          if (isFinite(minY)) {
            const groundY = ground.position.y;
            const delta = groundY - minY;
            if (Math.abs(delta) > 1e-4) obj.position.y += delta;
          }
        })(objects[idx]);
        objects[idx].visible = true;
        // update its stored home position (grounded)
        objects[idx].userData.home = objects[idx].position.clone();

        // hide other objects and restore to home
        objects.forEach((o, i) => {
          if (!o) return;
          if (i !== idx) {
            o.visible = false;
            if (o.userData.home) o.position.copy(o.userData.home);
          }
        });

        // Toggle HTML panels: panel1 is default visible state
        const panels = [
          'panel1', 
          'panel2', 
          'panel3',
          'panel4',
          'panel5',
          'panel6'
        ];
        panels.forEach((pid, pi) => {
          const el = document.getElementById(pid);
          if (!el) return;
          if (pi === idx) el.classList.add('active'); else el.classList.remove('active');
        });
      });
    });
  }

  setupButtons();

}).catch(err => console.error('Error loading models:', err));

// No hover: disable raycasting and use a fixed camera area
const defaultCameraPos = new THREE.Vector3(-1, 2, 12); // shifted left so scene sits away from `#content`
const clock = new THREE.Clock();
let isCursorLeftHalf = false;

window.addEventListener('mousemove', (e) => {
  isCursorLeftHalf = e.clientX < window.innerWidth / 2;
});

// Render loop
function animate() {
  requestAnimationFrame(animate);

  // slow auto-rotation for diagnostics (comment out if undesired)
  // carouselGroup.rotation.y += 0.002; // disabled to avoid group-origin rotation

  const delta = clock.getDelta();

  // Animate any objects that are moving toward the spotlight
  objects.forEach(obj => {
    if (!obj) return;
    // rotate in place slowly
    if (obj.visible) obj.rotation.y += 0.01;

    // no per-object move animation; objects are positioned instantly on button click
  });

  // Subtle camera focus when cursor enters left half of the screen
  const focusOffset = new THREE.Vector3(-1.25, -1.25, -2);
  const targetCamPos = isCursorLeftHalf ? defaultCameraPos.clone().add(focusOffset) : defaultCameraPos;
  camera.position.lerp(targetCamPos, 0.1);
  // camera.lookAt(spotlight.target.getWorldPosition(new THREE.Vector3()));

  renderer.render(scene, camera);
}

animate();
});