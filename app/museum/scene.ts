import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeModel, normalizeModel } from './models';

export type Destination = 'moon' | 'mars';
type World = Destination | 'earth';
type ModelStatus = 'loading' | 'ready' | 'error';
export type SceneStatus = Record<World, ModelStatus>;
export type SceneInput = { destination: Destination; moon: number; mars: number; dragging: boolean; resumeAt: number };

const worlds = ['moon', 'mars', 'earth'] as const;
const { lerp, smoothstep, damp } = THREE.MathUtils;

function createStars() {
  let seed = 114;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  for (let i = 0; i < 1100; i += 1) {
    positions.push((random() - 0.5) * 3600, (random() - 0.5) * 2400, -1100);
    const brightness = 0.14 + random() ** 3 * 0.65;
    colors.push(brightness * 0.86, brightness * 0.92, brightness);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 1.45, sizeAttenuation: false, vertexColors: true,
  }));
}

export function mountScene(
  host: HTMLDivElement,
  explore: HTMLElement,
  finale: HTMLElement,
  input: SceneInput,
  onStatus: (world: World, status: ModelStatus) => void,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#060608', 1550, 2140);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3500);
  camera.position.z = 1500;

  const stars = createStars();
  stars.material.fog = false;
  const key = new THREE.DirectionalLight('#fff7ec', 4.1);
  key.position.set(-7, 5, 3);
  const rim = new THREE.DirectionalLight('#aec8ff', 0.85);
  rim.position.set(6, 1, -2);
  const fill = new THREE.AmbientLight('#dde5fb', 0.14);
  scene.add(stars, key, rim, fill);

  const groups = { moon: new THREE.Group(), mars: new THREE.Group(), earth: new THREE.Group() };
  scene.add(...Object.values(groups));

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.007, 64, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec3 surfaceNormal;
        void main() {
          surfaceNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 surfaceNormal;
        void main() {
          vec3 n = normalize(surfaceNormal);
          float edge = pow(1.0 - clamp(n.z, 0.0, 1.0), 4.6);
          float light = smoothstep(-0.4, 0.85, dot(n, normalize(vec3(-0.55, 0.8, 0.1))));
          gl_FragColor = vec4(0.34, 0.53, 0.79, edge * light * 0.6);
        }
      `,
    }),
  );
  groups.earth.add(atmosphere);
  const models: Partial<Record<World, THREE.Group>> = {};
  const loading = new Set<World>();
  const loader = new GLTFLoader();
  const desktop = window.matchMedia('(min-width: 800px) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;

  async function load(world: World, quality: '1k' | '4k') {
    const { scene: asset } = await loader.loadAsync(`/models/${world}-${quality}.glb`);
    if (disposed) {
      disposeModel(asset);
      return;
    }

    if (world === 'earth') {
      asset.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        for (const material of [node.material].flat()) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.emissiveIntensity *= 0.28;
            material.color.multiplyScalar(3.3);
          }
        }
      });
    }

    const normalized = normalizeModel(asset);
    const previous = models[world];
    groups[world].add(normalized);
    models[world] = normalized;
    if (previous) {
      groups[world].remove(previous);
      disposeModel(previous);
    }
    onStatus(world, 'ready');
  }

  function ensure(world: World) {
    if (loading.has(world)) return;
    loading.add(world);
    void (async () => {
      try {
        await load(world, '1k');
      } catch {
        if (!disposed && !desktop.matches) onStatus(world, 'error');
      }
      if (disposed || !desktop.matches) return;

      try {
        await load(world, '4k');
      } catch {
        if (!disposed && !models[world]) onStatus(world, 'error');
      }
    })();
  }

  let width = 1;
  let height = 1;
  const resize = new ResizeObserver(() => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);

  let exploreTop = 0;
  let finaleTop = 0;
  function measureScroll() {
    exploreTop = explore.getBoundingClientRect().top;
    finaleTop = finale.getBoundingClientRect().top;
  }
  measureScroll();
  window.addEventListener('scroll', measureScroll, { passive: true });
  window.addEventListener('resize', measureScroll);

  let lastFrame = 0;
  let scroll = 1 - exploreTop / window.innerHeight;
  let ending = finaleTop / window.innerHeight;
  let displayed: Destination = 'moon';
  const handoff = { moon: 0, mars: 0 };
  ensure('moon');

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - lastFrame) / 1000);
    lastFrame = time;
    if (input.destination === 'mars' || exploreTop < height * 0.6) ensure('mars');
    if (finaleTop < height * 1.1) ensure('earth');

    const still = reduced.matches;
    const scrollTarget = 1 - exploreTop / height;
    const endingTarget = finaleTop / height;
    scroll = still ? scrollTarget : damp(scroll, scrollTarget, 11, dt);
    ending = still ? endingTarget : damp(ending, endingTarget, 11, dt);
    if (models[input.destination]) displayed = input.destination;

    const arrival = still ? Number(scroll >= 0.55) : smoothstep(scroll, 0.04, 1);
    // Leave room for the outgoing globe to recede before Earth's horizon enters.
    const departure = still ? Number(ending < 0.35) : 1 - smoothstep(ending, 0.33, 0.94);
    const earthArrival = still ? departure : 1 - smoothstep(ending, -0.04, 0.48);
    const radius = Math.min(width * 0.49, height * 0.48);
    const horizonRadius = Math.max(width * 0.66, height * 0.59);

    for (const world of ['moon', 'mars'] as const) {
      const active = displayed === world;
      handoff[world] = still ? Number(active) : damp(handoff[world], Number(active), 4.5, dt);
      const prominence = smoothstep(handoff[world], 0, 1);
      const group = groups[world];
      const risingRadius = lerp(horizonRadius, radius, arrival);
      group.visible = prominence > 0.001 && arrival > 0.001 && departure < 0.999 && (!still || departure === 0);
      group.scale.setScalar(risingRadius * lerp(0.53, 1, prominence) * lerp(1, 0.18, departure));
      group.position.set(
        width * (1 - prominence) * (active ? 0.75 : -0.29),
        -(risingRadius + height * 0.46) * (1 - arrival) + height * departure * 0.26,
        -850 * (1 - prominence) - 900 * departure,
      );
      if (active && group.visible && !still && !input.dragging && time >= input.resumeAt) {
        input[world] -= dt * 0.085;
      }
      group.rotation.y = input[world];
      group.rotation.x = 0.1;
    }

    const earth = groups.earth;
    earth.visible = earthArrival > 0.01 && Boolean(models.earth);
    const earthRadius = Math.max(width * 0.66, height * 0.68);
    earth.scale.setScalar(earthRadius);
    earth.position.set(0, -earthRadius - height * lerp(0.51, -0.05, earthArrival), lerp(-840, -90, earthArrival));
    earth.rotation.set(0.22, still ? 0.7 : 0.7 + 0.22 * earthArrival, -0.24);
    stars.position.y = still ? 0 : 95 * arrival + 140 * departure;
    stars.material.opacity = lerp(1, 0.48, earthArrival);
    stars.material.transparent = true;
    renderer.render(scene, camera);
  });

  return () => {
    disposed = true;
    window.removeEventListener('scroll', measureScroll);
    window.removeEventListener('resize', measureScroll);
    resize.disconnect();
    renderer.setAnimationLoop(null);
    for (const model of Object.values(models)) disposeModel(model);
    atmosphere.geometry.dispose();
    atmosphere.material.dispose();
    stars.geometry.dispose();
    stars.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
