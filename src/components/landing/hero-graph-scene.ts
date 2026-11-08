import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const COLS = 9;
const ROWS = 3;
/** Share of a bar per tier, bottom to top. */
const TIERS = [0.46, 0.32, 0.22];
const PITCH = 1;
const TIER_GAP = 0.05;
const LINE_SAMPLES = 48;
const BASE_YAW = 0.52;
const BASE_PITCH = 0;
/** Columns from here on carry the violet cap: the years the curve really takes off. */
const ACCENT_FROM = 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** Height of a bar: the wealth curve, each row further back a bit taller, breathing like a live chart. */
function barHeight(col: number, row: number, t: number, waves: boolean) {
  const curve = 0.8 + Math.pow(col / (COLS - 1), 1.6) * 5.6;
  const depth = [0.62, 0.82, 1][row];
  const wave = waves ? 1 + 0.05 * Math.sin(t * 0.8 + col * 0.7 + row * 1.3) + 0.025 * Math.sin(t * 1.9 + col * 2.1) : 1;
  return curve * depth * wave;
}

export type HeroGraphOptions = {
  /** Where the end of the line is on screen, in pixels of the container. */
  onPeak: (x: number, y: number, visible: boolean) => void;
  onReady: () => void;
};

/**
 * The hero object: a stacked 3D bar chart in a spotlight with a live line along
 * its front row. It grows in once, keeps breathing, sways slowly, follows the
 * pointer and can be dragged. Stops while off screen. Returns the cleanup.
 */
export function mountHeroGraph(container: HTMLElement, { onPeak, onReady }: HeroGraphOptions): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  const spot = new THREE.SpotLight(0xffffff, 700, 0, 0.5, 0.9, 2);
  spot.position.set(7, 13, 14);
  spot.target.position.set(0, 1.5, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0006;
  spot.shadow.radius = 6;
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x8b7df2, 2.6);
  rim.position.set(-9, 6, -7);
  scene.add(rim);

  const matBlack = new THREE.MeshPhysicalMaterial({ color: 0x2a2a32, metalness: 0.35, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const matGraphite = new THREE.MeshPhysicalMaterial({ color: 0x44444f, metalness: 0.35, roughness: 0.4, clearcoat: 0.5 });
  const matSilver = new THREE.MeshPhysicalMaterial({ color: 0x6a6a76, metalness: 0.6, roughness: 0.36, clearcoat: 0.5 });
  const matViolet = new THREE.MeshPhysicalMaterial({
    color: 0x6c5ce7,
    metalness: 0.3,
    roughness: 0.28,
    clearcoat: 0.8,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.3,
  });
  const materials = [matBlack, matGraphite, matSilver, matViolet];

  const box = new RoundedBoxGeometry(0.9, 1, 0.9, 4, 0.05);
  const graph = new THREE.Group();
  graph.position.set(-0.5, -3, 0);
  scene.add(graph);

  const bars: THREE.Mesh[][][] = [];
  for (let col = 0; col < COLS; col++) {
    bars[col] = [];
    for (let row = 0; row < ROWS; row++) {
      bars[col][row] = TIERS.map((_, tier) => {
        const material = tier < 2 ? materials[tier] : col >= ACCENT_FROM ? matViolet : matSilver;
        const mesh = new THREE.Mesh(box, material);
        mesh.position.set((col - (COLS - 1) / 2) * PITCH, 0, ((ROWS - 1) / 2 - row) * PITCH);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        graph.add(mesh);
        return mesh;
      });
    }
  }

  // The chart line above the front row, drawn in place so nothing is reallocated per frame.
  const lineZ = ((ROWS - 1) / 2) * PITCH + 0.46;
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(new Array(LINE_SAMPLES * 3).fill(0));
  const lineMaterial = new LineMaterial({ color: 0xc6bffb, linewidth: 3, toneMapped: false, transparent: true });
  const line = new Line2(lineGeometry, lineMaterial);
  line.frustumCulled = false;
  graph.add(line);
  const lineBuffer = (lineGeometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute).data;
  const curvePoints = Array.from({ length: COLS }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(curvePoints, false, "centripetal");
  const sample = new THREE.Vector3();

  const dotGeometry = new THREE.SphereGeometry(0.11, 24, 16);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  graph.add(dot);
  const dotLight = new THREE.PointLight(0xa99ff7, 5, 5, 2);
  dot.add(dotLight);

  /* ------------------------------------------------------------ frame */

  let time = reduced ? 100 : 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let width = 1;
  let height = 1;
  let announced = false;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let pointerX = 0;
  let pointerY = 0;
  let yaw = BASE_YAW;
  let pitch = BASE_PITCH;
  const projected = new THREE.Vector3();

  const layout = (t: number) => {
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const grow = easeOut((t - col * 0.07 - row * 0.05) / 1.3);
        const h = Math.max(0.02, barHeight(col, row, t, !reduced) * grow);
        let y = 0;
        bars[col][row].forEach((mesh, tier) => {
          const part = Math.max(0.01, h * TIERS[tier] - TIER_GAP);
          mesh.scale.y = part;
          mesh.position.y = y + part / 2;
          y += part + TIER_GAP;
        });
      }
      const front = barHeight(col, 0, t, !reduced) * easeOut((t - col * 0.07) / 1.3);
      curvePoints[col].set((col - (COLS - 1) / 2) * PITCH, front + 0.42, lineZ);
    }

    const array = lineBuffer.array as Float32Array;
    for (let i = 0; i < LINE_SAMPLES - 1; i++) {
      curve.getPoint(i / (LINE_SAMPLES - 1), sample);
      array.set([sample.x, sample.y, sample.z], i * 6);
      curve.getPoint((i + 1) / (LINE_SAMPLES - 1), sample);
      array.set([sample.x, sample.y, sample.z], i * 6 + 3);
    }
    lineBuffer.needsUpdate = true;
    dot.position.copy(curvePoints[COLS - 1]);
    lineMaterial.opacity = easeOut((t - 0.9) / 0.8);
    dot.visible = lineMaterial.opacity > 0.05;
  };

  const render = () => {
    graph.rotation.y = yaw;
    graph.rotation.x = pitch;
    renderer.render(scene, camera);
    dot.getWorldPosition(projected).project(camera);
    onPeak(((projected.x + 1) / 2) * width, ((1 - projected.y) / 2) * height, time > 1.5);
    if (!announced) {
      announced = true;
      onReady();
    }
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    time += dt;
    layout(time);
    const sway = Math.sin(time * 0.22) * 0.2;
    const ease = 1 - Math.pow(0.002, dt);
    yaw += (BASE_YAW + sway + dragYaw + (dragging ? 0 : pointerX * 0.14) - yaw) * ease;
    pitch += (BASE_PITCH + dragPitch + (dragging ? 0 : pointerY * 0.05) - pitch) * ease;
    render();
  };

  const start = () => {
    if (reduced || raf || !onScreen || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Wide enough for the whole chart in any box, closer on a tall one.
    camera.position.set(0, 3.2, 21 / Math.min(1, camera.aspect));
    camera.lookAt(0, 0.2, 0);
    camera.updateProjectionMatrix();
    if (reduced) {
      layout(time);
      render();
    }
  };

  /* ---------------------------------------------------------- pointer */

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      dragYaw = clamp(dragYaw + (e.clientX - lastX) * 0.006, -1.1, 1.3);
      dragPitch = clamp(dragPitch + (e.clientY - lastY) * 0.003, -0.12, 0.25);
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (e.pointerType === "mouse") {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    }
  };
  const onUp = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const viewObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) start();
    else stop();
  });
  viewObserver.observe(container);

  resize();
  start();

  return () => {
    stop();
    resizeObserver.disconnect();
    viewObserver.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", onVisibility);
    box.dispose();
    dotGeometry.dispose();
    lineGeometry.dispose();
    lineMaterial.dispose();
    dotMaterial.dispose();
    materials.forEach((m) => m.dispose());
    spot.shadow.map?.dispose();
    envMap.dispose();
    pmrem.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
