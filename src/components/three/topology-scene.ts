import type { BufferGeometry, LineBasicMaterial } from "three";
import {
  AdditiveBlending,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { coverView, frameFor, type Frame } from "./frames";
import { SCENE_LABELS } from "./labels";
import { applyTheme, createMaterials } from "./materials";
import type { SceneQuality } from "./quality";
import { blendCamera, pointerOffset } from "./rig";

/**
 * The maquette (docs plan 3.8): a miniature of a real system, built from code with no model, HDR or
 * texture download. An ingress gateway, three service stacks that lift apart, a database, a queue, an
 * AI agent core with an ignitable ring, a human review gate and an egress, joined by orthogonal
 * conduits with a pulse travelling along them. The story clock drives the camera and the per-role scene
 * state. Static geometry is merged per material, the service slabs are one instanced mesh, and the pulse
 * is a handful of sprites, so a frame is about a dozen draw calls.
 */
export type SceneController = Readonly<{
  canvas: HTMLCanvasElement;
  /** Draw calls and triangles of the last frame. */
  info(): { calls: number; triangles: number };
  resize(width: number, height: number): void;
  setTheme(light: boolean): void;
  setPixelRatioCap(cap: number): void;
  /** Story time (0 to 2.7). */
  setStory(time: number): void;
  setPointer(x: number, y: number): void;
  /** Scroll speed, 0 (still) to 1 (fast): the pulse runs faster as you scroll faster (M23). */
  setVelocity(velocity: number): void;
  /** Draws one frame at `timeMs`. */
  render(timeMs: number): void;
  /** One deterministic frame for the poster: first role, pulse at a fixed place, no pointer, no labels. */
  renderStill(): void;
  dispose(): void;
}>;

export type SceneOptions = Readonly<{
  host: HTMLElement;
  quality: SceneQuality;
  /** The label elements, in `SCENE_LABELS` order; positioned and faded every frame. */
  labelElements: readonly HTMLElement[];
  light: boolean;
  /** Keep the drawing buffer so the poster script can read the canvas back. */
  preserveDrawingBuffer?: boolean;
}>;

const PULSE_ROUTE = [
  [-7, 0],
  [-4.2, 0],
  [-1.6, 0],
  [0.9, 0],
  [1.7, 0],
  [5.4, 0],
  [5.4, 1.2],
  [7.5, 1.2],
  [8.5, 1.2],
  [10.4, 1.2],
  [10.4, 0],
  [11.6, 0],
].map(([x, z]) => new Vector3(x, 0.45, z));

const CONDUITS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [-7, 0],
    [-4.2, 0],
  ],
  [
    [-4.2, 0],
    [-1.6, 0],
  ],
  [
    [-4.2, 0],
    [-4.2, -2.8],
    [-1.6, -2.8],
  ],
  [
    [-4.2, 0],
    [-4.2, 2.8],
    [-1.6, 2.8],
  ],
  [
    [0.9, 0],
    [1.7, 0],
  ],
  [
    [0.9, -2.8],
    [3.2, -2.8],
  ],
  [
    [0.9, 2.8],
    [1.9, 2.8],
    [1.9, 1.2],
    [5.1, 1.2],
  ],
  [
    [4.7, 0],
    [5.4, 0],
    [5.4, 1.2],
  ],
  [
    [7.5, 1.2],
    [8.5, 1.2],
  ],
  [
    [9.9, 1.2],
    [10.4, 1.2],
    [10.4, 0],
    [11, 0],
  ],
];

const STACK_Z = [-2.8, 0, 2.8] as const;
const SLAB = {
  width: 2.2,
  height: 0.32,
  depth: 1.6,
  radius: 0.06,
  x: -0.6,
  pitch: 0.4,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A white radial falloff (1 at the centre, 0.55 at a quarter radius, 0 at the edge); the sprite material tints it. */
function createGlowTexture(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4).fill(255);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = Math.min(
        1,
        Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2)
      );
      const alpha = t < 0.25 ? 1 - 1.8 * t : (0.55 * (1 - t)) / 0.75;
      data[(y * size + x) * 4 + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createTopologyScene(options: SceneOptions): SceneController {
  const { host, quality, labelElements } = options;

  const canvas = document.createElement("canvas");
  const renderer = new WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  let pixelRatioCap = quality.maxPixelRatio;
  const pixelRatio = () =>
    Math.min(window.devicePixelRatio || 1, pixelRatioCap);
  renderer.setPixelRatio(pixelRatio());

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = pmrem.fromScene(environmentScene, 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  environmentScene.dispose();
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 16 / 9, 0.1, 100);

  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(key.shadow.camera, {
    left: -14,
    right: 14,
    top: 12,
    bottom: -12,
    near: 1,
    far: 40,
  });
  key.shadow.bias = -0.0004;
  scene.add(key);
  scene.add(new HemisphereLight(0xffffff, 0x222222, 0.35));
  const rim = new DirectionalLight(0xffffff, 0.8);
  rim.position.set(8, 4, -8);
  scene.add(rim);

  const materials = createMaterials();

  const floor = new Mesh(new PlaneGeometry(60, 40), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new GridHelper(44, 44, 0xffffff, 0xffffff);
  const gridMaterial = grid.material as LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0;
  grid.position.y = 0.004;
  scene.add(grid);

  const group = new Group();
  scene.add(group);

  // Static blocks, one merged mesh
  const block = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    radius = 0.08
  ) => {
    const geometry = new RoundedBoxGeometry(w, h, d, quality.segments, radius);
    geometry.translate(x, h / 2, z);
    return geometry;
  };
  const bodyGeometry = mergeGeometries([
    block(-7, 0, 1.2, 1.2, 0.9), // ingress
    block(-4.2, 0, 1.6, 2.4, 1.4), // gateway
    block(3.2, -2.8, 1.5, 1.5, 1.9), // database
    block(3.2, 0, 3.0, 1.1, 0.7), // queue
    block(9.2, 1.2, 1.4, 2.0, 1.2), // review gate
    block(11.6, 0, 1.2, 1.2, 0.9), // egress
  ])!;
  const bodyMesh = new Mesh(bodyGeometry, materials.body);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // The agent core keeps its own material so it can glow as the pulse passes
  const coreMesh = new Mesh(block(6.3, 1.2, 2.3, 2.3, 1.6), materials.core);
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  group.add(coreMesh);

  // Three service stacks of three slabs: one instanced mesh the developer role lifts apart
  const slabCount = STACK_Z.length * 3;
  const slabs = new InstancedMesh(
    new RoundedBoxGeometry(
      SLAB.width,
      SLAB.height,
      SLAB.depth,
      quality.segments,
      SLAB.radius
    ),
    materials.body,
    slabCount
  );
  slabs.castShadow = true;
  slabs.receiveShadow = true;
  group.add(slabs);
  const matrix = new Matrix4();
  const placeSlabs = (explode: number) => {
    let index = 0;
    for (const z of STACK_Z) {
      for (let layer = 0; layer < 3; layer += 1) {
        matrix.makeTranslation(
          SLAB.x,
          SLAB.height / 2 + layer * SLAB.pitch + explode * layer * 0.55,
          z
        );
        slabs.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    slabs.instanceMatrix.needsUpdate = true;
  };
  placeSlabs(0);

  // Conduits: thin boxes at right angles, one merged mesh
  const conduitPieces: BufferGeometry[] = [];
  for (const path of CONDUITS) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const [ax, az] = path[index]!;
      const [bx, bz] = path[index + 1]!;
      if (Math.hypot(bx - ax, bz - az) < 0.01) continue;
      const piece = new BoxGeometry(
        Math.abs(bx - ax) || 0.1,
        0.12,
        Math.abs(bz - az) || 0.1
      );
      piece.translate((ax + bx) / 2, 0.07, (az + bz) / 2);
      conduitPieces.push(piece);
    }
  }
  const conduits = new Mesh(mergeGeometries(conduitPieces)!, materials.edge);
  conduits.castShadow = true;
  conduits.receiveShadow = true;
  group.add(conduits);
  conduitPieces.forEach((piece) => piece.dispose());

  // Packets: small lights that run along every conduit, so the system looks busy. One instanced mesh; each packet shrinks to nothing at the ends of its conduit.
  const packetLines = CONDUITS.map((path) => {
    const points = path.map(([x, z]) => new Vector3(x, 0.2, z));
    const cumulative = [0];
    for (let index = 1; index < points.length; index += 1) {
      cumulative.push(
        cumulative[index - 1]! + points[index]!.distanceTo(points[index - 1]!)
      );
    }
    return { points, cumulative, length: cumulative[cumulative.length - 1]! };
  });
  const packetMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const packets = new InstancedMesh(
    new SphereGeometry(0.075, 8, 6),
    packetMaterial,
    quality.packets
  );
  packets.frustumCulled = false;
  scene.add(packets);
  const packetState = Array.from({ length: quality.packets }, (_, index) => ({
    line: index % packetLines.length,
    phase: (index * 0.618) % 1,
    speed: 0.5 + ((index * 7) % 5) * 0.13,
  }));
  const packetAt = new Vector3();
  const placePackets = (clock: number) => {
    packetState.forEach((packet, index) => {
      const line = packetLines[packet.line]!;
      const t = (packet.phase + (clock * packet.speed) / line.length) % 1;
      const distance = t * line.length;
      let segment = 1;
      while (
        segment < line.cumulative.length - 1 &&
        line.cumulative[segment]! < distance
      ) {
        segment += 1;
      }
      const from = line.points[segment - 1]!;
      const to = line.points[segment]!;
      const span = line.cumulative[segment]! - line.cumulative[segment - 1]!;
      packetAt
        .copy(from)
        .lerp(
          to,
          (distance - line.cumulative[segment - 1]!) / Math.max(0.0001, span)
        );
      const size = Math.sqrt(Math.sin(Math.PI * t));
      matrix.makeScale(size, size, size).setPosition(packetAt);
      packets.setMatrixAt(index, matrix);
    });
    packets.instanceMatrix.needsUpdate = true;
  };
  placePackets(2.3);
  let packetClock = 2.3;

  // The pulse: a glow head, a dot and a short trail of fading sprites
  const glow: Texture = createGlowTexture();
  const pulse = new Group();
  const spriteMaterial = (opacity: number) =>
    new SpriteMaterial({
      map: glow,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity,
    });
  const head = new Sprite(spriteMaterial(1));
  head.scale.set(1.5, 1.5, 1);
  pulse.add(head);
  const dot = new Mesh(
    new SphereGeometry(0.13, 16, 12),
    new MeshBasicMaterial({ color: 0xffffff })
  );
  pulse.add(dot);
  const trail: Sprite[] = [];
  for (let index = 1; index <= quality.trail; index += 1) {
    const sprite = new Sprite(spriteMaterial(0.5 - index * 0.06));
    sprite.scale.setScalar(0.9 - index * 0.08);
    pulse.add(sprite);
    trail.push(sprite);
  }
  scene.add(pulse);

  const ring = new Mesh(
    new TorusGeometry(1.95, 0.03, 8, 72),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(6.3, 0.25, 1.2);
  scene.add(ring);

  const pulseSprites = [
    head.material,
    ...trail.map((sprite) => sprite.material),
  ];
  const themed = {
    materials,
    gridMaterial,
    pulseSprites,
    dot: dot.material as MeshBasicMaterial,
    packets: packetMaterial,
    ring: ring.material as MeshBasicMaterial,
    keyLight: key,
    scene,
  } as const;
  let light = options.light;
  applyTheme(themed, light);
  renderer.shadowMap.needsUpdate = true;

  // Pulse path length table
  const lengths = [0];
  for (let index = 1; index < PULSE_ROUTE.length; index += 1) {
    lengths.push(
      lengths[index - 1]! +
        PULSE_ROUTE[index]!.distanceTo(PULSE_ROUTE[index - 1]!)
    );
  }
  const routeLength = lengths[lengths.length - 1]!;
  const scratch = new Vector3();
  const pointAt = (t: number, out: Vector3) => {
    const distance = (((t % 1) + 1) % 1) * routeLength;
    let index = 1;
    while (index < lengths.length - 1 && lengths[index]! < distance) index += 1;
    const from = PULSE_ROUTE[index - 1]!;
    const to = PULSE_ROUTE[index]!;
    const k =
      (distance - lengths[index - 1]!) /
      Math.max(0.0001, lengths[index]! - lengths[index - 1]!);
    return out.copy(from).lerp(to, k);
  };

  host.appendChild(canvas);
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block";

  // State
  let width = 1;
  let height = 1;
  let frame: Frame = frameFor(1, 1);
  const cameraPosition = new Vector3();
  const cameraTarget = new Vector3();
  const targetSmooth = new Vector3();
  let primed = false;
  let story = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let velocity = 0;
  let pulseTime = 0.1;
  let lastTime = 0;
  let explodeShown = -1;
  let info = { calls: 0, triangles: 0 };

  const resize = (nextWidth: number, nextHeight: number) => {
    width = Math.max(1, Math.round(nextWidth));
    height = Math.max(1, Math.round(nextHeight));
    frame = frameFor(width, height);
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    camera.fov = frame.fov;
    camera.aspect = frame.aspect;
    const view = coverView(frame, width, height);
    camera.setViewOffset(
      view.fullWidth,
      view.fullHeight,
      view.x,
      view.y,
      view.width,
      view.height
    );
    camera.updateProjectionMatrix();
  };

  const draw = (timeMs: number, still: boolean) => {
    const dt = still ? 0 : Math.min(0.1, (timeMs - lastTime) / 1000 || 0.016);
    lastTime = timeMs;
    const time = still ? 0 : story;

    pointer.sx = lerp(pointer.sx, pointer.x, 0.06);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.06);

    const blend = blendCamera(frame, time);
    cameraPosition.set(...blend.position);
    cameraTarget.set(...blend.target);
    if (quality.pointerRig && !still) {
      const offset = pointerOffset(pointer.sx, pointer.sy);
      cameraPosition.x += offset.x;
      cameraPosition.y += offset.y;
    }
    if (!primed || still) {
      camera.position.copy(cameraPosition);
      targetSmooth.copy(cameraTarget);
      primed = true;
    } else {
      camera.position.lerp(cameraPosition, 0.12);
      targetSmooth.lerp(cameraTarget, 0.12);
    }
    camera.lookAt(targetSmooth);

    // Per-role scene state
    const [architect, developer, automation] = blend.weights as [
      number,
      number,
      number,
    ];
    gridMaterial.opacity = (light ? 0.22 : 0.34) * architect;
    materials.edge.emissiveIntensity = 0.22 * architect;
    if (Math.abs(developer - explodeShown) > 0.002) {
      placeSlabs(developer);
      explodeShown = developer;
      renderer.shadowMap.needsUpdate = true;
    }
    (ring.material as MeshBasicMaterial).opacity = 0.75 * automation;
    ring.scale.setScalar(1 + 0.04 * Math.sin(timeMs * 0.0024) * automation);

    packetClock += dt * (1 + velocity * 3 + automation * 0.8);
    placePackets(still ? 2.3 : packetClock);

    pulseTime += dt * (0.075 + velocity * 0.22 + automation * 0.09);
    const head3 = pointAt(still ? 0.1 : pulseTime, scratch);
    pulse.position.copy(head3);
    const origin = head3.clone();
    trail.forEach((sprite, index) => {
      sprite.position.copy(
        pointAt((still ? 0.1 : pulseTime) - (index + 1) * 0.012, scratch).sub(
          origin
        )
      );
    });
    const near = Math.max(0, 1 - coreMesh.position.distanceTo(origin) / 2.4);
    materials.core.emissiveIntensity = 0.03 + near * 0.3 + automation * 0.18;

    // DOM labels, projected from their anchors; hidden where they would sit on the copy
    const showLabels = !still && width >= 820;
    SCENE_LABELS.forEach((label, index) => {
      const element = labelElements[index];
      if (!element) return;
      if (!showLabels) {
        element.style.opacity = "0";
        return;
      }
      const lift = label.lifts ? developer * 1.1 : 0;
      scratch.set(label.x, label.height + lift + 0.3, label.z).project(camera);
      const x = (scratch.x * 0.5 + 0.5) * width;
      const y = (-scratch.y * 0.5 + 0.5) * height;
      const overCopy = x < width * 0.5 && y > height * 0.12 && y < height * 0.8;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -140%)`;
      element.style.opacity = overCopy
        ? "0"
        : [architect, developer, automation][label.role]!.toFixed(2);
    });

    renderer.render(scene, camera);
    info = {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
  };

  return {
    canvas,
    info: () => info,
    resize,
    setTheme(next) {
      light = next;
      applyTheme(themed, light);
      renderer.shadowMap.needsUpdate = true;
    },
    setPixelRatioCap(cap) {
      pixelRatioCap = cap;
      resize(width, height);
    },
    setStory(time) {
      story = time;
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    setVelocity(next) {
      velocity = Math.min(1, Math.max(0, next));
    },
    render: (timeMs) => draw(timeMs, false),
    renderStill() {
      labelElements.forEach((element) => (element.style.opacity = "0"));
      draw(0, true);
    },
    dispose() {
      scene.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      slabs.dispose();
      packets.dispose();
      glow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
