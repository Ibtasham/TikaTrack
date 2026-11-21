import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import type { ColdChainPartId, ThermalMode } from './coldChainData';

export interface ColdChainSceneCallbacks {
  onSelectPart: (partId: ColdChainPartId | null) => void;
  onHoverPart: (partId: ColdChainPartId | null) => void;
  onFallback: (reason: 'no-webgl' | 'context-lost') => void;
}

export interface ColdChainSceneOptions {
  theme: 'light' | 'dark';
  callbacks: ColdChainSceneCallbacks;
}

function isSoftwareWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /SwiftShader|llvmpipe|Software Rasterizer|Microsoft Basic Render/i.test(renderer);
  } catch {
    return false;
  }
}

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0.04,
): THREE.ExtrudeGeometry {
  const hw = width / 2 - radius;
  const hd = depth / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd - radius);
  shape.lineTo(hw, -hd - radius);
  shape.quadraticCurveTo(hw + radius, -hd - radius, hw + radius, -hd);
  shape.lineTo(hw + radius, hd);
  shape.quadraticCurveTo(hw + radius, hd + radius, hw, hd + radius);
  shape.lineTo(-hw, hd + radius);
  shape.quadraticCurveTo(-hw - radius, hd + radius, -hw - radius, hd);
  shape.lineTo(-hw - radius, -hd);
  shape.quadraticCurveTo(-hw - radius, -hd - radius, -hw, -hd - radius);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  return geo;
}

function drawLcdCanvas(
  canvas: HTMLCanvasElement,
  mode: ThermalMode,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isExcursion = mode === 'excursion';
  ctx.fillStyle = isExcursion ? '#2d1208' : '#08221b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle LCD grid bevel border
  ctx.strokeStyle = isExcursion ? '#f97316' : '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = isExcursion ? '#fdba74' : '#6ee7b7';
  ctx.font = 'bold 24px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(isExcursion ? 'ALERT · > +8.0°C' : 'WHO PQS · SAFE', 28, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 88px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(isExcursion ? '+11.6°C' : '+4.2°C', 28, 152);

  ctx.fillStyle = isExcursion ? '#fca5a5' : '#a7f3d0';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(isExcursion ? 'CHECK ICE PACKS & VVM' : 'MIN +3.4°C  ·  MAX +5.1°C', 28, 206);
}

function drawVialLabelCanvas(
  canvas: HTMLCanvasElement,
  code: string,
  subtitle: string,
  accentHex: string,
  mode: ThermalMode,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top color band
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, canvas.width, 36);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(code, 22, 96);

  ctx.fillStyle = '#475569';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(subtitle, 22, 134);

  // WHO VVM square-in-circle indicator on right side
  const cx = canvas.width - 66;
  const cy = 104;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#581c87';
  ctx.fill();

  ctx.fillStyle = mode === 'excursion' ? '#581c87' : '#ffffff';
  ctx.fillRect(cx - 16, cy - 16, 32, 32);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px ui-monospace, monospace';
  ctx.fillText(mode === 'excursion' ? 'VVM FAIL' : 'VVM OK', cx - 32, cy + 52);
}

function drawCarrierPlacardCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, 18, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('EPI COLD CHAIN · E004', 40, 62);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px ui-monospace, monospace';
  ctx.fillText('HOLD TIME 42H · +2°C TO +8°C', 40, 104);
}

function tagPartRecursive(obj: THREE.Object3D, partId: ColdChainPartId): void {
  obj.userData.partId = partId;
  for (const child of obj.children) {
    tagPartRecursive(child, partId);
  }
}

export class ColdChainScene {
  private container: HTMLElement;
  private callbacks: ColdChainSceneCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private pmremGenerator!: THREE.PMREMGenerator;
  private envRT!: THREE.WebGLRenderTarget;
  private resizeObserver!: ResizeObserver;

  private rootGroup = new THREE.Group();
  private carrierGroup = new THREE.Group();
  private lidPivot = new THREE.Group();
  private icePackGroup = new THREE.Group();
  private icePackMeshes: Array<{ mesh: THREE.Object3D; dir: THREE.Vector3 }> = [];
  private trayGroup = new THREE.Group();
  private telemetryGroup = new THREE.Group();
  private vialGroups: Array<{
    group: THREE.Group;
    partId: ColdChainPartId;
    basePos: THREE.Vector3;
    explodedPos: THREE.Vector3;
    labelTex: THREE.CanvasTexture;
    labelCanvas: HTMLCanvasElement;
    code: string;
    subtitle: string;
    accentHex: string;
  }> = [];

  private lcdCanvas!: HTMLCanvasElement;
  private lcdTex!: THREE.CanvasTexture;
  private probeLedMat!: THREE.MeshStandardMaterial;
  private gridHelper!: THREE.GridHelper;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private interactableMeshes: THREE.Object3D[] = [];
  private disposables: Array<{ dispose: () => void }> = [];

  private explodedTarget = 0;
  private explodedCurrent = 0;
  private autoRotate = true;
  private thermalMode: ThermalMode = 'nominal';
  private theme: 'light' | 'dark';
  private activePartId: ColdChainPartId | null = null;
  private hoveredPartId: ColdChainPartId | null = null;

  private rafId: number | null = null;
  private lastTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  private disposed = false;
  private pointerDownPos = { x: 0, y: 0 };
  private readonly _tmpTargetScale = new THREE.Vector3();

  constructor(container: HTMLElement, options: ColdChainSceneOptions) {
    this.container = container;
    this.callbacks = options.callbacks;
    this.theme = options.theme;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      this.callbacks.onFallback('no-webgl');
      return;
    }

    const softwareGl = isSoftwareWebGL(gl);
    const width = Math.max(container.clientWidth || 800, 300);
    const height = Math.max(container.clientHeight || 560, 320);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !softwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      this.callbacks.onFallback('no-webgl');
      return;
    }

    this.renderer.setPixelRatio(softwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !softwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    this.camera.position.set(3.2, 2.55, 3.6);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.72;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.52, 0);
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 8.5;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 0.65;

    this.buildLighting(softwareGl);
    this.buildColdChainAssembly(softwareGl);
    this.applyTheme(this.theme);

    this.attachEvents(canvas);
    this.animate();
  }

  private buildLighting(softwareGl: boolean) {
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x334155, 0.5);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
    key.position.set(4.2, 6.4, 3.8);
    if (!softwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 16;
      key.shadow.camera.left = -3.2;
      key.shadow.camera.right = 3.2;
      key.shadow.camera.top = 3.2;
      key.shadow.camera.bottom = -3.2;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xdbeafe, 0.75);
    fill.position.set(-4.5, 3.2, -3.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x99f6e4, 0.45);
    rim.position.set(-2.0, 2.2, 4.5);
    this.scene.add(rim);

    const groundGeo = new THREE.PlaneGeometry(18, 18);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.16 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables.push(groundGeo, groundMat);

    this.gridHelper = new THREE.GridHelper(9, 18, 0x94a3b8, 0xcbd5e1);
    this.gridHelper.position.y = -0.015;
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.28;
    this.scene.add(this.gridHelper);
  }

  private buildColdChainAssembly(softwareGl: boolean) {
    this.rootGroup.position.set(0, 0.02, 0);
    this.scene.add(this.rootGroup);

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Insulated Carrier Base & Hinged Lid
    const outerShellMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.36,
      metalness: 0.06,
    });
    const trimTealMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.34,
      metalness: 0.12,
    });
    const innerLinerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const gasketMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.05,
    });
    const metalLatchMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.88,
    });
    this.disposables.push(outerShellMat, trimTealMat, innerLinerMat, gasketMat, metalLatchMat);

    // Outer walls built around hollow interior so internal ice packs & tray are visible
    const floorGeo = createRoundedBoxGeometry(1.75, 0.14, 1.35, 0.12, 0.03);
    const floorMesh = new THREE.Mesh(floorGeo, outerShellMat);
    floorMesh.position.y = 0.08;
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    this.carrierGroup.add(floorMesh);

    const wallConfigs: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
      { pos: [0, 0.56, -0.6], size: [1.74, 0.88, 0.14] },
      { pos: [0, 0.56, 0.6], size: [1.74, 0.88, 0.14] },
      { pos: [-0.8, 0.56, 0], size: [0.14, 0.88, 1.08] },
      { pos: [0.8, 0.56, 0], size: [0.14, 0.88, 1.08] },
    ];
    for (const wc of wallConfigs) {
      const geo = new THREE.BoxGeometry(wc.size[0], wc.size[1], wc.size[2]);
      const wall = new THREE.Mesh(geo, outerShellMat);
      wall.position.set(...wc.pos);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.carrierGroup.add(wall);
      this.disposables.push(geo);
    }

    // Inner recessed chamber floor & gasket rim
    const innerFloorGeo = new THREE.BoxGeometry(1.44, 0.04, 1.04);
    const innerFloor = new THREE.Mesh(innerFloorGeo, innerLinerMat);
    innerFloor.position.y = 0.17;
    innerFloor.receiveShadow = true;
    this.carrierGroup.add(innerFloor);

    const rimTopGeo = new THREE.BoxGeometry(1.78, 0.05, 1.38);
    const rimTop = new THREE.Mesh(rimTopGeo, gasketMat);
    rimTop.position.y = 1.01;
    // Carve visual inner hole feel using four thin rim bars
    rimTop.visible = false;
    const gasketBars: Array<[number, number, number, number, number, number]> = [
      [0, 1.01, -0.6, 1.76, 0.045, 0.16],
      [0, 1.01, 0.6, 1.76, 0.045, 0.16],
      [-0.8, 1.01, 0, 0.16, 0.045, 1.06],
      [0.8, 1.01, 0, 0.16, 0.045, 1.06],
    ];
    for (const [x, y, z, w, h, d] of gasketBars) {
      const gGeo = new THREE.BoxGeometry(w, h, d);
      const gMesh = new THREE.Mesh(gGeo, gasketMat);
      gMesh.position.set(x, y, z);
      this.carrierGroup.add(gMesh);
      this.disposables.push(gGeo);
    }

    // Dual front aluminum latch clasps
    const latchGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
    for (const lx of [-0.46, 0.46]) {
      const latch = new THREE.Mesh(latchGeo, metalLatchMat);
      latch.position.set(lx, 0.92, 0.68);
      latch.castShadow = true;
      this.carrierGroup.add(latch);
    }

    // WHO PQS front placard (procedural CanvasTexture)
    const placardCanvas = document.createElement('canvas');
    placardCanvas.width = 512;
    placardCanvas.height = 140;
    drawCarrierPlacardCanvas(placardCanvas);
    const placardTex = new THREE.CanvasTexture(placardCanvas);
    placardTex.colorSpace = THREE.SRGBColorSpace;
    placardTex.anisotropy = maxAnisotropy;
    const placardGeo = new THREE.PlaneGeometry(0.92, 0.25);
    const placardMat = new THREE.MeshStandardMaterial({
      map: placardTex,
      roughness: 0.3,
      metalness: 0.1,
    });
    const placard = new THREE.Mesh(placardGeo, placardMat);
    placard.position.set(0, 0.56, 0.675);
    this.carrierGroup.add(placard);

    // Hinged Lid Pivot (rotates open on back hinge in exploded view)
    this.lidPivot.position.set(0, 1.04, -0.66);
    const lidCapGeo = createRoundedBoxGeometry(1.8, 0.14, 1.4, 0.12, 0.03);
    const lidCap = new THREE.Mesh(lidCapGeo, trimTealMat);
    lidCap.position.set(0, 0.08, 0.66);
    lidCap.castShadow = true;
    lidCap.receiveShadow = true;
    this.lidPivot.add(lidCap);

    // Carrying Handle Arch mounted on lid
    const handlePostGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.18, 14);
    for (const hx of [-0.44, 0.44]) {
      const post = new THREE.Mesh(handlePostGeo, metalLatchMat);
      post.position.set(hx, 0.22, 0.66);
      post.castShadow = true;
      this.lidPivot.add(post);
    }
    const handleGripGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.96, 18);
    handleGripGeo.rotateZ(Math.PI / 2);
    const handleGrip = new THREE.Mesh(handleGripGeo, gasketMat);
    handleGrip.position.set(0, 0.31, 0.66);
    handleGrip.castShadow = true;
    this.lidPivot.add(handleGrip);

    this.carrierGroup.add(this.lidPivot);
    tagPartRecursive(this.carrierGroup, 'carrier');
    this.rootGroup.add(this.carrierGroup);
    this.disposables.push(
      floorGeo,
      innerFloorGeo,
      rimTopGeo,
      latchGeo,
      placardTex,
      placardGeo,
      placardMat,
      lidCapGeo,
      handlePostGeo,
      handleGripGeo,
    );

    // 2. Frozen Coolant Ice-Pack Array (4 perimeter packs)
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.24,
      metalness: 0.02,
      transmission: softwareGl ? 0 : 0.42,
      thickness: 0.18,
      transparent: true,
      opacity: 0.9,
      ior: 1.38,
    });
    const capPlugMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.08,
    });
    const packBodyGeo = createRoundedBoxGeometry(0.11, 0.68, 0.84, 0.035, 0.015);
    const sidePackGeo = createRoundedBoxGeometry(1.16, 0.68, 0.11, 0.035, 0.015);
    const plugGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14);

    const packLayouts: Array<{
      pos: [number, number, number];
      dir: THREE.Vector3;
      geo: THREE.BufferGeometry;
    }> = [
      { pos: [-0.64, 0.56, 0], dir: new THREE.Vector3(-0.9, 0.45, 0), geo: packBodyGeo },
      { pos: [0.64, 0.56, 0], dir: new THREE.Vector3(0.9, 0.45, 0), geo: packBodyGeo },
      { pos: [0, 0.56, -0.44], dir: new THREE.Vector3(0, 0.45, -0.85), geo: sidePackGeo },
      { pos: [0, 0.56, 0.44], dir: new THREE.Vector3(0, 0.45, 0.85), geo: sidePackGeo },
    ];

    for (const layout of packLayouts) {
      const pGroup = new THREE.Group();
      const body = new THREE.Mesh(layout.geo, iceMat);
      body.castShadow = true;
      pGroup.add(body);

      const plug = new THREE.Mesh(plugGeo, capPlugMat);
      plug.position.y = 0.37;
      pGroup.add(plug);

      pGroup.position.set(...layout.pos);
      pGroup.userData.basePos = new THREE.Vector3(...layout.pos);
      this.icePackGroup.add(pGroup);
      this.icePackMeshes.push({ mesh: pGroup, dir: layout.dir });
    }
    tagPartRecursive(this.icePackGroup, 'icepacks');
    this.rootGroup.add(this.icePackGroup);
    this.disposables.push(iceMat, capPlugMat, packBodyGeo, sidePackGeo, plugGeo);

    // 3. Anodized Vial Divider Tray
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.28,
      metalness: 0.78,
    });
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.82,
      metalness: 0.02,
    });
    const trayPlateGeo = createRoundedBoxGeometry(0.98, 0.06, 0.58, 0.05, 0.015);
    const trayPlate = new THREE.Mesh(trayPlateGeo, trayMat);
    trayPlate.castShadow = true;
    trayPlate.receiveShadow = true;
    this.trayGroup.add(trayPlate);

    const foamPadGeo = createRoundedBoxGeometry(0.9, 0.05, 0.5, 0.04, 0.01);
    const foamPad = new THREE.Mesh(foamPadGeo, foamMat);
    foamPad.position.y = 0.05;
    this.trayGroup.add(foamPad);

    const collarGeo = new THREE.TorusGeometry(0.088, 0.014, 12, 24);
    collarGeo.rotateX(Math.PI / 2);
    for (const vx of [-0.3, -0.1, 0.1, 0.3]) {
      const collar = new THREE.Mesh(collarGeo, trayMat);
      collar.position.set(vx, 0.085, 0);
      this.trayGroup.add(collar);
    }

    this.trayGroup.position.set(0, 0.42, 0);
    tagPartRecursive(this.trayGroup, 'tray');
    this.rootGroup.add(this.trayGroup);
    this.disposables.push(trayMat, foamMat, trayPlateGeo, foamPadGeo, collarGeo);

    // 4. Multi-Part Borosilicate Vaccine Vials (LatheGeometry + meniscus + crimp collar + cap + VVM label)
    const vialDefs: Array<{
      partId: ColdChainPartId;
      code: string;
      subtitle: string;
      capHex: number;
      accentHex: string;
      liquidHex: number;
      x: number;
    }> = [
      {
        partId: 'vial-bcg',
        code: 'BCG',
        subtitle: '0.05mL · EPI',
        capHex: 0x10b981,
        accentHex: '#059669',
        liquidHex: 0xecfdf5,
        x: -0.3,
      },
      {
        partId: 'vial-penta',
        code: 'PENTA',
        subtitle: 'DTP-HepB-Hib',
        capHex: 0x0284c7,
        accentHex: '#0284c7',
        liquidHex: 0xe0f2fe,
        x: -0.1,
      },
      {
        partId: 'vial-pcv',
        code: 'PCV-10',
        subtitle: 'Pneumo 0.5mL',
        capHex: 0x6366f1,
        accentHex: '#4f46e5',
        liquidHex: 0xeef2ff,
        x: 0.1,
      },
      {
        partId: 'vial-mr',
        code: 'MR',
        subtitle: 'Measles-Rubella',
        capHex: 0xf59e0b,
        accentHex: '#d97706',
        liquidHex: 0xfef3c7,
        x: 0.3,
      },
    ];

    const lathePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.068, 0.0),
      new THREE.Vector2(0.072, 0.025),
      new THREE.Vector2(0.072, 0.21),
      new THREE.Vector2(0.044, 0.245),
      new THREE.Vector2(0.044, 0.29),
      new THREE.Vector2(0.054, 0.305),
      new THREE.Vector2(0.04, 0.305),
    ];
    const glassGeo = new THREE.LatheGeometry(lathePoints, softwareGl ? 20 : 32);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.0,
      transmission: softwareGl ? 0 : 0.85,
      thickness: 0.06,
      ior: 1.5,
      transparent: true,
      opacity: softwareGl ? 0.65 : 1.0,
    });
    const liquidGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.12, 18);
    const crimpGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.036, 20);
    const capGeo = new THREE.CylinderGeometry(0.054, 0.054, 0.024, 20);
    const labelGeo = new THREE.CylinderGeometry(0.0735, 0.0735, 0.13, 24, 1, true);
    this.disposables.push(glassGeo, glassMat, liquidGeo, crimpGeo, capGeo, labelGeo);

    for (const def of vialDefs) {
      const vGroup = new THREE.Group();

      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.castShadow = true;
      vGroup.add(glassMesh);

      const liqMat = new THREE.MeshStandardMaterial({
        color: def.liquidHex,
        roughness: 0.2,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
      });
      const liquid = new THREE.Mesh(liquidGeo, liqMat);
      liquid.position.y = 0.07;
      vGroup.add(liquid);

      const crimp = new THREE.Mesh(crimpGeo, metalLatchMat);
      crimp.position.y = 0.295;
      vGroup.add(crimp);

      const capMat = new THREE.MeshStandardMaterial({
        color: def.capHex,
        roughness: 0.34,
        metalness: 0.08,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.322;
      cap.castShadow = true;
      vGroup.add(cap);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512;
      labelCanvas.height = 192;
      drawVialLabelCanvas(labelCanvas, def.code, def.subtitle, def.accentHex, this.thermalMode);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      labelTex.anisotropy = maxAnisotropy;

      const labelMat = new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.45,
        metalness: 0.02,
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.y = 0.125;
      labelMesh.rotation.y = -Math.PI * 0.5;
      vGroup.add(labelMesh);

      const basePos = new THREE.Vector3(def.x, 0.51, 0);
      const explodedPos = new THREE.Vector3(def.x * 1.45, 1.38, 0.16);
      vGroup.position.copy(basePos);

      tagPartRecursive(vGroup, def.partId);
      this.rootGroup.add(vGroup);
      this.disposables.push(liqMat, capMat, labelTex, labelMat);

      this.vialGroups.push({
        group: vGroup,
        partId: def.partId,
        basePos,
        explodedPos,
        labelTex,
        labelCanvas,
        code: def.code,
        subtitle: def.subtitle,
        accentHex: def.accentHex,
      });
    }

    // 5. Digital Telemetry Probe & LCD Display
    const probeHousingGeo = createRoundedBoxGeometry(0.46, 0.26, 0.08, 0.03, 0.01);
    const probeHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.32,
      metalness: 0.35,
    });
    const probeHousing = new THREE.Mesh(probeHousingGeo, probeHousingMat);
    probeHousing.castShadow = true;
    this.telemetryGroup.add(probeHousing);

    this.lcdCanvas = document.createElement('canvas');
    this.lcdCanvas.width = 512;
    this.lcdCanvas.height = 256;
    drawLcdCanvas(this.lcdCanvas, this.thermalMode);
    this.lcdTex = new THREE.CanvasTexture(this.lcdCanvas);
    this.lcdTex.colorSpace = THREE.SRGBColorSpace;
    this.lcdTex.anisotropy = maxAnisotropy;

    const lcdGeo = new THREE.PlaneGeometry(0.39, 0.19);
    const lcdMat = new THREE.MeshBasicMaterial({ map: this.lcdTex });
    const lcdScreen = new THREE.Mesh(lcdGeo, lcdMat);
    lcdScreen.position.z = 0.048;
    this.telemetryGroup.add(lcdScreen);

    this.probeLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const ledGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const led = new THREE.Mesh(ledGeo, this.probeLedMat);
    led.position.set(0.18, 0.09, 0.045);
    this.telemetryGroup.add(led);

    const probeStemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12);
    const probeStem = new THREE.Mesh(probeStemGeo, metalLatchMat);
    probeStem.position.set(0, -0.26, -0.02);
    this.telemetryGroup.add(probeStem);

    this.telemetryGroup.position.set(0.42, 1.06, 0.34);
    this.telemetryGroup.rotation.x = -0.28;
    tagPartRecursive(this.telemetryGroup, 'probe');
    this.rootGroup.add(this.telemetryGroup);
    this.disposables.push(
      probeHousingGeo,
      probeHousingMat,
      this.lcdTex,
      lcdGeo,
      lcdMat,
      this.probeLedMat,
      ledGeo,
      probeStemGeo,
    );

    this.interactableMeshes = [
      this.carrierGroup,
      this.icePackGroup,
      this.trayGroup,
      this.telemetryGroup,
      ...this.vialGroups.map((v) => v.group),
    ];
  }

  public setExploded(exploded: boolean) {
    this.explodedTarget = exploded ? 1 : 0;
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    if (this.controls) {
      this.controls.autoRotate = enabled;
    }
  }

  public setThermalMode(mode: ThermalMode) {
    if (this.thermalMode === mode) return;
    this.thermalMode = mode;

    if (this.lcdCanvas && this.lcdTex) {
      drawLcdCanvas(this.lcdCanvas, mode);
      this.lcdTex.needsUpdate = true;
    }

    if (this.probeLedMat) {
      const hex = mode === 'excursion' ? 0xf97316 : 0x10b981;
      this.probeLedMat.color.setHex(hex);
      this.probeLedMat.emissive.setHex(hex);
    }

    for (const v of this.vialGroups) {
      drawVialLabelCanvas(v.labelCanvas, v.code, v.subtitle, v.accentHex, mode);
      v.labelTex.needsUpdate = true;
    }
  }

  public applyTheme(theme: 'light' | 'dark') {
    this.theme = theme;
    if (!this.scene) return;
    const bgHex = theme === 'dark' ? 0x0b1613 : 0xeef5f2;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, 0.068);
  }

  public focusPart(partId: ColdChainPartId | null) {
    this.activePartId = partId;
    if (partId === 'icepacks' || partId === 'tray' || partId?.startsWith('vial-')) {
      this.explodedTarget = 1;
    }
  }

  public resetView() {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(3.2, 2.55, 3.6);
    this.controls.target.set(0, 0.52, 0);
    this.controls.update();
  }

  private resolvePartIdFromObject(obj: THREE.Object3D | null): ColdChainPartId | null {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      if (typeof curr.userData?.partId === 'string') {
        return curr.userData.partId as ColdChainPartId;
      }
      curr = curr.parent;
    }
    return null;
  }

  private attachEvents(canvas: HTMLCanvasElement) {
    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactableMeshes, true);
      const partId = hits.length > 0 ? this.resolvePartIdFromObject(hits[0].object) : null;
      if (partId !== this.hoveredPartId) {
        this.hoveredPartId = partId;
        canvas.style.cursor = partId ? 'pointer' : 'grab';
        this.callbacks.onHoverPart(partId);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return; // drag orbit, not click
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactableMeshes, true);
      const partId = hits.length > 0 ? this.resolvePartIdFromObject(hits[0].object) : null;
      this.activePartId = partId;
      this.callbacks.onSelectPart(partId);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.callbacks.onFallback('context-lost');
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('webglcontextlost', onContextLost);

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || this.disposed) return;
      const w = Math.max(entry.contentRect.width, 280);
      const h = Math.max(entry.contentRect.height, 280);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(this.container);

    this.disposables.push({
      dispose: () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        this.resizeObserver.disconnect();
        if (canvas.parentElement === this.container) {
          this.container.removeChild(canvas);
        }
      },
    });
  }

  private animate = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min((nowMs - this.lastTimeMs) / 1000, 0.05);
    this.lastTimeMs = nowMs;
    const alpha = 1 - Math.exp(-6.5 * dt);
    this.explodedCurrent += (this.explodedTarget - this.explodedCurrent) * alpha;
    const t = this.explodedCurrent;

    // Hinged lid opens backward & lifts smoothly
    this.lidPivot.rotation.x = -t * 1.48;
    this.lidPivot.position.y = 1.04 + t * 0.42;

    // Ice packs slide radially outward
    for (const item of this.icePackMeshes) {
      const base = item.mesh.userData.basePos as THREE.Vector3;
      item.mesh.position.set(
        base.x + item.dir.x * t,
        base.y + item.dir.y * t,
        base.z + item.dir.z * t,
      );
    }

    // Vial tray rises out of chamber
    this.trayGroup.position.y = 0.42 + t * 0.56;

    // Vials fan slightly into showcase elevation
    for (const vial of this.vialGroups) {
      vial.group.position.lerpVectors(vial.basePos, vial.explodedPos, t);
      const isSelected = this.activePartId === vial.partId;
      const targetScale = isSelected ? 1.14 : 1.0;
      this._tmpTargetScale.setScalar(targetScale);
      vial.group.scale.lerp(this._tmpTargetScale, alpha);
    }

    // Probe elevates cleanly
    this.telemetryGroup.position.set(0.42 + t * 0.45, 1.06 + t * 0.58, 0.34 + t * 0.2);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const item of this.disposables) {
      try {
        item.dispose();
      } catch {
        /* ignore cleanup errors */
      }
    }
    this.disposables = [];
    this.controls?.dispose();
    this.envRT?.dispose();
    this.pmremGenerator?.dispose();
    this.renderer?.dispose();
  }
}
