import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { BALL_CATALOG, BOOT_CATALOG, KIT_CATALOG, SHORTS_CATALOG, SOCKS_CATALOG } from '../game/catalog';
import {
  BALL_RADIUS,
  GOAL_DEPTH,
  GOAL_HALF_W,
  GOAL_HEIGHT,
  PITCH_HALF_L,
  PITCH_HALF_W,
  type MatchSimulation,
} from '../game/physics';
import type { UserProgress } from '../game/types';
import { buildChibiPlayerRig, type ChibiRig, updateChibiRigAnimation } from './chibiModel';
import {
  createAdBoardTexture,
  createBallTexture,
  createContactShadowTexture,
  createGrassBumpTexture,
  createPitchTexture,
} from './textures';

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 140;
const _mat4 = new THREE.Matrix4();
const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class StadiumRenderer {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private maxAniso = 1;
  private pmremEnvTex: THREE.Texture;
  private shadowTex: THREE.CanvasTexture;
  private sky!: Sky;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private groundMat!: THREE.MeshStandardMaterial;
  private apronMat!: THREE.MeshStandardMaterial;
  private pitchMat!: THREE.MeshStandardMaterial;
  private standMat!: THREE.MeshStandardMaterial;
  private trimMat!: THREE.MeshStandardMaterial;
  private lampEmissiveMat!: THREE.MeshStandardMaterial;
  private flagMat!: THREE.MeshStandardMaterial;
  private adBoardMaterials: THREE.MeshStandardMaterial[] = [];
  private parkPropsGroup = new THREE.Group();
  private metroBowlGroup = new THREE.Group();
  private coastalArenaGroup = new THREE.Group();
  private royalNightGroup = new THREE.Group();
  private legendDomeGroup = new THREE.Group();
  private currentStadiumId = 'stadium_park';
  private ballMesh: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private ballMat: THREE.MeshStandardMaterial;
  private playerRigs: ChibiRig[] = [];
  private crowdMesh: THREE.InstancedMesh;
  private crowdBaseMatrices: THREE.Matrix4[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleItem[] = [];
  private particleCursor = 0;
  private resizeObserver: ResizeObserver;
  private currentSignature = '';
  private camPos = new THREE.Vector3(0.5, 1.72, 4.45);
  private camTarget = new THREE.Vector3(0, 1.18, -3.5);
  private lastPhase: 'title' | 'playing' | 'paused' | 'gameover' | '' = '';
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9bd6ff);
    this.scene.fog = new THREE.FogExp2(0xa5d8ff, 0.0042);

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.5, 420);
    this.camera.position.copy(this.camPos);

    // Studio RoomEnvironment reflection on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.pmremEnvTex = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = this.pmremEnvTex;
    roomEnv.dispose();
    pmrem.dispose();

    // Daylight Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(400);
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 4;
    skyUniforms['rayleigh'].value = 1.6;
    skyUniforms['mieCoefficient'].value = 0.004;
    skyUniforms['mieDirectionalG'].value = 0.82;
    const sunVec = new THREE.Vector3(35, 48, 25).normalize();
    skyUniforms['sunPosition'].value.copy(sunVec);
    this.scene.add(this.sky);

    // Warm/Cool 3-point stadium lighting (<= 1 shadow caster)
    this.hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x1b4d2e, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4df, 1.85);
    this.sunLight.position.set(28, 46, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 46;
    this.sunLight.shadow.camera.bottom = -46;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    this.rimLight.position.set(-28, 22, -30);
    this.scene.add(this.rimLight);

    this.shadowTex = createContactShadowTexture();
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Build Stadium & Theme Prop Groups
    this.buildStadiumEnvironment(this.maxAniso);

    // Football Mesh + Contact Shadow
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 20, 16);
    const defaultBallTex = createBallTexture(BALL_CATALOG[0]);
    this.ballMat = new THREE.MeshStandardMaterial({
      map: defaultBallTex,
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.08,
    });
    this.ballMesh = new THREE.Mesh(ballGeo, this.ballMat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    const bShadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.15, 16);
    const bShadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.ballShadow = new THREE.Mesh(bShadowGeo, bShadowMat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.018;
    this.scene.add(this.ballShadow);

    // Instanced Stadium Crowd
    this.crowdMesh = this.buildCrowdInstanced();
    this.scene.add(this.crowdMesh);

    // Pooled InstancedMesh Particles (turf divots, rarity flair trails, goal confetti)
    const partGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.2,
    });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }

    // ResizeObserver for crisp layout (re-render immediately so buffer is never cleared black)
    this.resizeObserver = new ResizeObserver(() => {
      if (this.disposed) return;
      const rw = this.container.clientWidth || window.innerWidth;
      const rh = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = rw / rh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rw, rh);
      this.renderer.render(this.scene, this.camera);
    });
    this.resizeObserver.observe(container);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildStadiumEnvironment(maxAniso: number): void {
    // Extended outdoor meadow/ocean surrounding the stadium
    const groundGeo = new THREE.CircleGeometry(240, 48);
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0x2c6e49, roughness: 0.95, metalness: 0.0 });
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Stadium concrete apron (top face at -0.03, strictly below grass pitch y=0.0)
    const apronGeo = new THREE.BoxGeometry(PITCH_HALF_W * 2 + 12, 0.08, PITCH_HALF_L * 2 + 12);
    this.apronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 });
    const apron = new THREE.Mesh(apronGeo, this.apronMat);
    apron.position.y = -0.07;
    apron.receiveShadow = true;
    this.scene.add(apron);

    // Striped Turf Pitch (y = 0.0)
    const pitchTex = createPitchTexture(maxAniso);
    const bumpTex = createGrassBumpTexture(maxAniso);
    const pitchGeo = new THREE.PlaneGeometry(PITCH_HALF_W * 2 + 3, PITCH_HALF_L * 2 + 3, 1, 1);
    this.pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      bumpMap: bumpTex,
      bumpScale: 0.03,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.02,
    });
    const pitch = new THREE.Mesh(pitchGeo, this.pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.0;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Composite 3D Goals at +Z and -Z
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.45 });
    const netMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.7,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });

    [-1, 1].forEach((dir) => {
      const goalGroup = new THREE.Group();
      const gz = dir * PITCH_HALF_L;
      goalGroup.position.set(0, 0, gz);

      const postGeo = new THREE.CylinderGeometry(0.11, 0.11, GOAL_HEIGHT, 12);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-GOAL_HALF_W, GOAL_HEIGHT / 2, 0);
      leftPost.castShadow = true;
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(GOAL_HALF_W, GOAL_HEIGHT / 2, 0);
      rightPost.castShadow = true;

      const barGeo = new THREE.CylinderGeometry(0.11, 0.11, GOAL_HALF_W * 2 + 0.22, 12);
      const crossbar = new THREE.Mesh(barGeo, postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, GOAL_HEIGHT, 0);
      crossbar.castShadow = true;

      const backFrameGeo = new THREE.BoxGeometry(GOAL_HALF_W * 2, 0.08, 0.08);
      const backBottom = new THREE.Mesh(backFrameGeo, postMat);
      backBottom.position.set(0, 0.04, dir * GOAL_DEPTH);

      const stanchionGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_DEPTH, 8);
      [-GOAL_HALF_W, GOAL_HALF_W].forEach((sx) => {
        const st = new THREE.Mesh(stanchionGeo, postMat);
        st.rotation.x = Math.PI / 2;
        st.position.set(sx, 0.04, (dir * GOAL_DEPTH) / 2);
        goalGroup.add(st);
      });

      const netGeo = new THREE.BoxGeometry(GOAL_HALF_W * 2, GOAL_HEIGHT, GOAL_DEPTH, 12, 6, 4);
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(0, GOAL_HEIGHT / 2, (dir * GOAL_DEPTH) / 2);

      goalGroup.add(leftPost, rightPost, crossbar, backBottom, net);
      this.scene.add(goalGroup);
    });

    // Corner Flags (composite pole + fabric flag)
    this.flagMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.7, side: THREE.DoubleSide });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.3 });
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8);
    const clothGeo = new THREE.PlaneGeometry(0.5, 0.34);
    [
      [-PITCH_HALF_W, -PITCH_HALF_L],
      [PITCH_HALF_W, -PITCH_HALF_L],
      [-PITCH_HALF_W, PITCH_HALF_L],
      [PITCH_HALF_W, PITCH_HALF_L],
    ].forEach(([cx, cz]) => {
      const fg = new THREE.Group();
      fg.position.set(cx, 0, cz);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.65;
      const cloth = new THREE.Mesh(clothGeo, this.flagMat);
      cloth.position.set(0.25, 1.12, 0);
      fg.add(pole, cloth);
      this.scene.add(fg);
    });

    // Perimeter LED Ad Boards (stored materials so stadium themes update board copy & colors)
    const adGeo = new THREE.BoxGeometry(10.5, 1.05, 0.3);
    this.adBoardMaterials = [
      new THREE.MeshStandardMaterial({ map: createAdBoardTexture('EMERALD PARK', '#0F172A', '#10B981'), roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ map: createAdBoardTexture('MINI FOOTBALL', '#1E293B', '#FACC15'), roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ map: createAdBoardTexture('STRIKER PRO CUP', '#0F172A', '#38BDF8'), roughness: 0.45 }),
    ];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = -2; i <= 2; i++) {
        const board = new THREE.Mesh(adGeo, this.adBoardMaterials[(i + 3) % this.adBoardMaterials.length]);
        board.position.set(side * (PITCH_HALF_W + 3.2), 0.52, i * 12.2);
        board.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(board);
      }
    }

    // Tiered Stadium Grandstands on East/West & North/South
    this.standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78, metalness: 0.12 });
    this.trimMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.3 });
    for (let side = -1; side <= 1; side += 2) {
      for (let tier = 0; tier < 3; tier++) {
        const tierMesh = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 1.6 + tier * 1.4, PITCH_HALF_L * 2 + 6),
          this.standMat
        );
        tierMesh.position.set(side * (PITCH_HALF_W + 6.5 + tier * 3.1), (1.6 + tier * 1.4) / 2, 0);
        tierMesh.receiveShadow = true;
        this.scene.add(tierMesh);
      }
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(11.5, 0.5, PITCH_HALF_L * 2 + 8),
        this.trimMat
      );
      roof.position.set(side * (PITCH_HALF_W + 10.5), 9.6, 0);
      this.scene.add(roof);
    }
    for (let end = -1; end <= 1; end += 2) {
      for (let tier = 0; tier < 2; tier++) {
        const endStand = new THREE.Mesh(
          new THREE.BoxGeometry(PITCH_HALF_W * 2 + 4, 1.5 + tier * 1.3, 3.2),
          this.standMat
        );
        endStand.position.set(0, (1.5 + tier * 1.3) / 2, end * (PITCH_HALF_L + 6.5 + tier * 3.1));
        this.scene.add(endStand);
      }
    }

    // 4 Tall Stadium Floodlight Towers
    const towerMetal = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.75 });
    this.lampEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    [
      [-PITCH_HALF_W - 9, -PITCH_HALF_L - 8],
      [PITCH_HALF_W + 9, -PITCH_HALF_L - 8],
      [-PITCH_HALF_W - 9, PITCH_HALF_L + 8],
      [PITCH_HALF_W + 9, PITCH_HALF_L + 8],
    ].forEach(([tx, tz]) => {
      const tower = new THREE.Group();
      tower.position.set(tx, 0, tz);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.75, 22, 10), towerMetal);
      mast.position.y = 11;
      const head = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 0.9), towerMetal);
      head.position.y = 22.2;
      head.lookAt(0, 0, 0);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.7), this.lampEmissiveMat);
      panel.position.z = 0.48;
      head.add(panel);
      tower.add(mast, head);
      this.scene.add(tower);
    });

    // === 1. Park Props Group (Emerald Training Park) ===
    const treeTrunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.0, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const treeCrownGeo = new THREE.DodecahedronGeometry(2.4, 1);
    const treeCrownMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const treeCount = 32;
    const trunks = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(treeCrownGeo, treeCrownMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2;
      const rad = 58 + (i % 4) * 9;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * (rad + 10);
      const s = 0.85 + ((i * 7) % 10) * 0.03;
      _mat4.makeTranslation(x, 1.5 * s, z);
      _mat4.scale(_scaleVec.set(s, s, s));
      trunks.setMatrixAt(i, _mat4);
      _mat4.makeTranslation(x, 3.8 * s, z);
      _mat4.scale(_scaleVec.set(s, s * 1.1, s));
      crowns.setMatrixAt(i, _mat4);
      crowns.setColorAt(i, new THREE.Color().setHSL(0.36 + (i % 5) * 0.015, 0.65, 0.34 + (i % 3) * 0.04));
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    this.parkPropsGroup.add(trunks, crowns);
    this.scene.add(this.parkPropsGroup);

    // === 2. Metro Floodlight Bowl Props (Urban Twilight Skyline) ===
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 });
    const winEmissive = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    });
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const rad = 70 + (i % 3) * 14;
      const bh = 16 + ((i * 11) % 24);
      const bw = 6 + (i % 3) * 2.5;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), bldgMat);
      bldg.position.set(Math.cos(ang) * rad, bh / 2 - 1, Math.sin(ang) * (rad + 8));
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, 0.7, bw * 0.86), winEmissive);
      beacon.position.y = bh / 2 - 1.1;
      bldg.add(beacon);
      this.metroBowlGroup.add(bldg);
    }
    this.metroBowlGroup.visible = false;
    this.scene.add(this.metroBowlGroup);

    // === 3. Rio Coastal Arena Props (Golden Beach Ring + Tropical Palms) ===
    const sandRing = new THREE.Mesh(
      new THREE.RingGeometry(43, 66, 48),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.92 })
    );
    sandRing.rotation.x = -Math.PI / 2;
    sandRing.position.y = -0.05;
    this.coastalArenaGroup.add(sandRing);

    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75, side: THREE.DoubleSide });
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2;
      const rad = 54 + (i % 3) * 5;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * (rad + 8);
      const palm = new THREE.Group();
      palm.position.set(px, 0, pz);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 7.2, 7), palmTrunkMat);
      stem.position.y = 3.6;
      stem.rotation.z = ((i % 2 === 0 ? 1 : -1) * 0.08);
      palm.add(stem);
      for (let f = 0; f < 5; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 5), palmLeafMat);
        frond.position.set(0, 7.1, 0);
        frond.rotation.y = (f / 5) * Math.PI * 2;
        frond.rotation.x = Math.PI * 0.36;
        palm.add(frond);
      }
      this.coastalArenaGroup.add(palm);
    }
    this.coastalArenaGroup.visible = false;
    this.scene.add(this.coastalArenaGroup);

    // === 4. Royal Grandstand Night Cup Props (Golden Crown Upper Ring + Night Stars) ===
    const crownRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x92400e,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.7,
    });
    for (let side = -1; side <= 1; side += 2) {
      const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, PITCH_HALF_L * 2 + 8), crownRingMat);
      goldBand.position.set(side * (PITCH_HALF_W + 4.9), 9.4, 0);
      this.royalNightGroup.add(goldBand);
    }
    const starMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const starGeo = new THREE.SphereGeometry(0.28, 6, 6);
    for (let i = 0; i < 65; i++) {
      const ang = (i * 1.37) % (Math.PI * 2);
      const dist = 95 + (i % 7) * 14;
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos(ang) * dist, 36 + (i % 9) * 5, Math.sin(ang) * dist);
      this.royalNightGroup.add(star);
    }
    this.royalNightGroup.visible = false;
    this.scene.add(this.royalNightGroup);

    // === 5. World Legend Dome Props (Monumental Golden & Glass Arch Ribs) ===
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x78350f,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.85,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x581c87,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
    });
    for (let i = -2; i <= 2; i++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(37, 0.72, 10, 40, Math.PI), archMat);
      arch.position.set(0, 2, i * 16);
      this.legendDomeGroup.add(arch);
    }
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 76), canopyMat);
    ridgeBeam.position.set(0, 38.8, 0);
    this.legendDomeGroup.add(ridgeBeam);
    this.legendDomeGroup.visible = false;
    this.scene.add(this.legendDomeGroup);
  }

  public applyStadiumTheme(stadiumId: string): void {
    if (this.currentStadiumId === stadiumId) return;
    this.currentStadiumId = stadiumId;

    const skyUniforms = this.sky.material.uniforms;
    let stripeA = '#1C9A4C';
    let stripeB = '#22AA55';
    let centerRing: string | undefined;
    let adSpecs: Array<[string, string, string]> = [
      ['EMERALD PARK', '#0F172A', '#10B981'],
      ['MINI FOOTBALL', '#1E293B', '#FACC15'],
      ['STRIKER PRO CUP', '#0F172A', '#38BDF8'],
    ];

    this.parkPropsGroup.visible = false;
    this.metroBowlGroup.visible = false;
    this.coastalArenaGroup.visible = false;
    this.royalNightGroup.visible = false;
    this.legendDomeGroup.visible = false;

    if (stadiumId === 'stadium_metro') {
      this.sky.visible = true;
      skyUniforms['turbidity'].value = 11;
      skyUniforms['rayleigh'].value = 3.2;
      skyUniforms['sunPosition'].value.set(55, 8, -28).normalize();
      this.scene.background = new THREE.Color(0x283a5c);
      this.scene.fog = new THREE.FogExp2(0x334155, 0.0052);
      this.hemiLight.color.setHex(0x7dd3fc);
      this.hemiLight.groundColor.setHex(0x1e293b);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xffbe7b);
      this.sunLight.intensity = 1.65;
      this.sunLight.position.set(36, 22, -20);
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.95;
      this.groundMat.color.setHex(0x1e293b);
      this.apronMat.color.setHex(0x0f172a);
      this.standMat.color.setHex(0x1e293b);
      this.trimMat.color.setHex(0x06b6d4);
      this.flagMat.color.setHex(0x38bdf8);
      this.lampEmissiveMat.emissive.setHex(0xe0f2fe);
      this.lampEmissiveMat.emissiveIntensity = 3.2;
      stripeA = '#136F39';
      stripeB = '#198746';
      centerRing = '#38BDF8';
      adSpecs = [
        ['METRO BOWL', '#020617', '#38BDF8'],
        ['NIGHT SKYLINE', '#0F172A', '#22D3EE'],
        ['TIER 2 ARENA', '#1E293B', '#F8FAFC'],
      ];
      this.metroBowlGroup.visible = true;
    } else if (stadiumId === 'stadium_coastal') {
      this.sky.visible = true;
      skyUniforms['turbidity'].value = 2.6;
      skyUniforms['rayleigh'].value = 1.2;
      skyUniforms['sunPosition'].value.set(22, 62, -18).normalize();
      this.scene.background = new THREE.Color(0x5ad6ff);
      this.scene.fog = new THREE.FogExp2(0x8be4ff, 0.0036);
      this.hemiLight.color.setHex(0xfffbeb);
      this.hemiLight.groundColor.setHex(0x0d9488);
      this.hemiLight.intensity = 0.95;
      this.sunLight.color.setHex(0xfff8dc);
      this.sunLight.intensity = 2.05;
      this.sunLight.position.set(20, 52, 16);
      this.rimLight.color.setHex(0xfde047);
      this.rimLight.intensity = 0.65;
      this.groundMat.color.setHex(0x0ea5e9);
      this.apronMat.color.setHex(0xeab308);
      this.standMat.color.setHex(0x0d9488);
      this.trimMat.color.setHex(0xfacc15);
      this.flagMat.color.setHex(0xfacc15);
      this.lampEmissiveMat.emissive.setHex(0xfffbeb);
      this.lampEmissiveMat.emissiveIntensity = 1.5;
      stripeA = '#22B14C';
      stripeB = '#2EC95E';
      centerRing = '#FACC15';
      adSpecs = [
        ['RIO COASTAL', '#0F766E', '#FACC15'],
        ['CARNIVAL CUP', '#115E59', '#FFFFFF'],
        ['SUNSHINE ARENA', '#0F766E', '#5EEAD4'],
      ];
      this.coastalArenaGroup.visible = true;
    } else if (stadiumId === 'stadium_royal') {
      this.sky.visible = false;
      this.scene.background = new THREE.Color(0x070d24);
      this.scene.fog = new THREE.FogExp2(0x0b1536, 0.0048);
      this.hemiLight.color.setHex(0x93c5fd);
      this.hemiLight.groundColor.setHex(0x0b3b24);
      this.hemiLight.intensity = 0.95;
      this.sunLight.color.setHex(0xf8fafc);
      this.sunLight.intensity = 2.15;
      this.sunLight.position.set(24, 48, 18);
      this.rimLight.color.setHex(0xf59e0b);
      this.rimLight.intensity = 0.85;
      this.groundMat.color.setHex(0x090f1e);
      this.apronMat.color.setHex(0x1e293b);
      this.standMat.color.setHex(0x1e3a8a);
      this.trimMat.color.setHex(0xf59e0b);
      this.flagMat.color.setHex(0xf59e0b);
      this.lampEmissiveMat.emissive.setHex(0xffffff);
      this.lampEmissiveMat.emissiveIntensity = 3.8;
      stripeA = '#0E5C31';
      stripeB = '#157540';
      centerRing = '#F59E0B';
      adSpecs = [
        ['ROYAL GRANDSTAND', '#172554', '#F59E0B'],
        ['EUROPEAN NIGHTS', '#1E3A8A', '#FFFFFF'],
        ['ELITE CUP', '#172554', '#38BDF8'],
      ];
      this.royalNightGroup.visible = true;
    } else if (stadiumId === 'stadium_legend') {
      this.sky.visible = false;
      this.scene.background = new THREE.Color(0x1e1342);
      this.scene.fog = new THREE.FogExp2(0x2e1065, 0.0046);
      this.hemiLight.color.setHex(0xfde68a);
      this.hemiLight.groundColor.setHex(0x115e59);
      this.hemiLight.intensity = 1.0;
      this.sunLight.color.setHex(0xfef08a);
      this.sunLight.intensity = 2.1;
      this.sunLight.position.set(26, 46, 22);
      this.rimLight.color.setHex(0xc084fc);
      this.rimLight.intensity = 0.95;
      this.groundMat.color.setHex(0x111827);
      this.apronMat.color.setHex(0x450a0a);
      this.standMat.color.setHex(0x7f1d1d);
      this.trimMat.color.setHex(0xfacc15);
      this.flagMat.color.setHex(0xfacc15);
      this.lampEmissiveMat.emissive.setHex(0xfde047);
      this.lampEmissiveMat.emissiveIntensity = 3.6;
      stripeA = '#064E3B';
      stripeB = '#059669';
      centerRing = '#FACC15';
      adSpecs = [
        ['WORLD LEGEND DOME', '#450A0A', '#FACC15'],
        ['PRO FINALE', '#7F1D1D', '#FFFFFF'],
        ['CHAMPIONS', '#450A0A', '#FDE047'],
      ];
      this.legendDomeGroup.visible = true;
    } else {
      // Default: stadium_park (Emerald Training Park)
      this.sky.visible = true;
      skyUniforms['turbidity'].value = 4;
      skyUniforms['rayleigh'].value = 1.6;
      skyUniforms['sunPosition'].value.set(35, 48, 25).normalize();
      this.scene.background = new THREE.Color(0x9bd6ff);
      this.scene.fog = new THREE.FogExp2(0xa5d8ff, 0.0042);
      this.hemiLight.color.setHex(0xcbe8ff);
      this.hemiLight.groundColor.setHex(0x1b4d2e);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xfff4df);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(28, 46, 22);
      this.rimLight.color.setHex(0x93c5fd);
      this.rimLight.intensity = 0.55;
      this.groundMat.color.setHex(0x2c6e49);
      this.apronMat.color.setHex(0x1e293b);
      this.standMat.color.setHex(0x334155);
      this.trimMat.color.setHex(0x10b981);
      this.flagMat.color.setHex(0xf43f5e);
      this.lampEmissiveMat.emissive.setHex(0xfffbeb);
      this.lampEmissiveMat.emissiveIntensity = 1.8;
      this.parkPropsGroup.visible = true;
    }

    const oldPitchMap = this.pitchMat.map;
    this.pitchMat.map = createPitchTexture(this.maxAniso, stripeA, stripeB, centerRing);
    this.pitchMat.needsUpdate = true;
    oldPitchMap?.dispose();

    this.adBoardMaterials.forEach((mat, idx) => {
      const [label, bg, fg] = adSpecs[idx % adSpecs.length];
      const oldAdMap = mat.map;
      mat.map = createAdBoardTexture(label, bg, fg);
      mat.needsUpdate = true;
      oldAdMap?.dispose();
    });
  }

  private buildCrowdInstanced(): THREE.InstancedMesh {
    const geo = new THREE.CapsuleGeometry(0.28, 0.42, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
    const positions: Array<[number, number, number]> = [];

    for (let side = -1; side <= 1; side += 2) {
      for (let tier = 0; tier < 3; tier++) {
        for (let z = -PITCH_HALF_L; z <= PITCH_HALF_L; z += 3.2) {
          positions.push([side * (PITCH_HALF_W + 6.5 + tier * 3.1), 1.9 + tier * 1.4, z]);
        }
      }
    }
    for (let end = -1; end <= 1; end += 2) {
      for (let tier = 0; tier < 2; tier++) {
        for (let x = -PITCH_HALF_W + 2; x <= PITCH_HALF_W - 2; x += 3.2) {
          positions.push([x, 1.8 + tier * 1.3, end * (PITCH_HALF_L + 6.5 + tier * 3.1)]);
        }
      }
    }

    const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
    const palette = [0x10b981, 0xef4444, 0xfacc15, 0x38bdf8, 0xffffff, 0xf97316];
    positions.forEach(([x, y, z], idx) => {
      const m = new THREE.Matrix4().makeTranslation(x, y, z);
      this.crowdBaseMatrices.push(m.clone());
      mesh.setMatrixAt(idx, m);
      mesh.setColorAt(idx, new THREE.Color(palette[idx % palette.length]));
    });
    mesh.computeBoundingSphere();
    return mesh;
  }

  public syncRosterAndGear(sim: MatchSimulation, progress: UserProgress): void {
    const baseKit = KIT_CATALOG.find((k) => k.id === progress.kitId) ?? KIT_CATALOG[0];
    const customShorts = progress.shortsId ? SHORTS_CATALOG.find((s) => s.id === progress.shortsId) : undefined;
    const customSocks = progress.socksId ? SOCKS_CATALOG.find((s) => s.id === progress.socksId) : undefined;
    const kit = {
      ...baseKit,
      shorts: customShorts ? customShorts.primary : baseKit.shorts,
      socks: customSocks ? customSocks.primary : baseKit.socks,
    };
    const boot = BOOT_CATALOG.find((b) => b.id === progress.bootId) ?? BOOT_CATALOG[0];
    const ball = BALL_CATALOG.find((b) => b.id === progress.ballId) ?? BALL_CATALOG[0];

    const sig = `${progress.kitId}_${progress.shortsId ?? ''}_${progress.socksId ?? ''}_${progress.bootId}_${progress.ballId}_${progress.activeLineup.join(',')}_${sim.opponentName}`;
    if (sig === this.currentSignature && this.playerRigs.length === sim.players.length) return;
    this.currentSignature = sig;

    // Update ball texture
    const oldMap = this.ballMat.map;
    this.ballMat.map = createBallTexture(ball);
    this.ballMat.needsUpdate = true;
    oldMap?.dispose();

    // Rebuild player rigs cleanly
    for (const rig of this.playerRigs) {
      this.scene.remove(rig.root);
      rig.disposables.forEach((d) => d.dispose());
    }
    this.playerRigs = [];

    const awayKit = {
      primary: sim.opponentPrimary,
      secondary: sim.opponentSecondary,
      shorts: '#0F172A',
      socks: sim.opponentPrimary,
      pattern: 'sash' as const,
    };

    for (const p of sim.players) {
      const pKit = p.team === 'home' ? kit : awayKit;
      const pBoot = p.team === 'home' ? boot : BOOT_CATALOG[0];
      const rig = buildChibiPlayerRig(p.card, pKit, pBoot, this.shadowTex, p.role === 'GK');
      this.scene.add(rig.root);
      this.playerRigs.push(rig);
    }
  }

  public spawnParticles(x: number, y: number, z: number, colorHex: string | number, count: number, speed = 7): void {
    for (let i = 0; i < count; i++) {
      const item = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      item.active = true;
      item.x = x;
      item.y = y;
      item.z = z;
      const ang = Math.random() * Math.PI * 2;
      const sp = (0.35 + Math.random() * 0.85) * speed;
      item.vx = Math.cos(ang) * sp;
      item.vy = 2.5 + Math.random() * 6.5;
      item.vz = Math.sin(ang) * sp;
      item.maxLife = 0.45 + Math.random() * 0.55;
      item.life = item.maxLife;
      item.scale = 0.65 + Math.random() * 0.9;
      item.color.set(colorHex);
    }
  }

  public renderFrame(
    sim: MatchSimulation,
    phase: 'title' | 'playing' | 'paused' | 'gameover',
    dt: number,
    elapsed: number
  ): void {
    const heroIdx = sim.players[5] ? 5 : sim.activeHomeIndex;
    const hero = sim.players[heroIdx];
    const isTitle = phase === 'title';

    // Update players
    for (let i = 0; i < sim.players.length; i++) {
      const p = sim.players[i];
      const rig = this.playerRigs[i];
      if (!rig) continue;
      if (isTitle) {
        rig.root.visible = i === heroIdx;
        if (i === heroIdx) {
          const showcasePlayer = { ...p, x: 0, z: 0, vx: 0, vz: 0, facing: 0.22 };
          updateChibiRigAnimation(rig, showcasePlayer, false, false, sim.celebrationId, elapsed);
        }
      } else {
        rig.root.visible = true;
        const isControlled = phase === 'playing' && p.team === 'home' && p.slotIndex === sim.activeHomeIndex;
        const isCelebrating = sim.goalFreezeTimer > 0 && p.team === sim.goalScoredByTeam;
        updateChibiRigAnimation(rig, p, isControlled, isCelebrating, sim.celebrationId, elapsed);
      }
    }

    const showcaseBallX = isTitle ? -0.62 : sim.ball.x;
    const showcaseBallY = isTitle ? BALL_RADIUS : sim.ball.y;
    const showcaseBallZ = isTitle ? 0.42 : sim.ball.z;

    // Update ball
    this.ballMesh.position.set(showcaseBallX, showcaseBallY, showcaseBallZ);
    this.ballMesh.rotation.x += sim.ball.vz * dt * 1.4;
    this.ballMesh.rotation.z -= sim.ball.vx * dt * 1.4;
    this.ballShadow.position.set(showcaseBallX, 0.018, showcaseBallZ);
    const heightScale = Math.max(0.4, 1 - showcaseBallY * 0.12);
    this.ballShadow.scale.setScalar(heightScale);

    if (sim.ball.flairActive && Math.random() < 0.75) {
      this.spawnParticles(sim.ball.x, sim.ball.y, sim.ball.z, sim.ball.flairColor, 2, 3.2);
    }

    // Animate crowd bounce (extra hype during goal celebrations)
    const crowdJumpAmp = sim.goalFreezeTimer > 0 ? 0.55 : 0.12;
    const crowdFreq = sim.goalFreezeTimer > 0 ? 11 : 3.2;
    for (let i = 0; i < this.crowdBaseMatrices.length; i++) {
      _mat4.copy(this.crowdBaseMatrices[i]);
      const dy = Math.abs(Math.sin(elapsed * crowdFreq + i * 0.7)) * crowdJumpAmp;
      _mat4.elements[13] += dy;
      this.crowdMesh.setMatrixAt(i, _mat4);
    }
    this.crowdMesh.instanceMatrix.needsUpdate = true;

    // Update pooled particles
    let anyParticleUpdated = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      anyParticleUpdated = true;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      pt.vy -= 16 * dt;
      if (pt.y < 0.08) {
        pt.y = 0.08;
        pt.vy = Math.abs(pt.vy) * 0.4;
      }
      const s = pt.scale * (pt.life / pt.maxLife);
      _vec3.set(pt.x, pt.y, pt.z);
      _scaleVec.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, pt.color);
    }
    if (anyParticleUpdated) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    // Camera choreography with snap-on-phase-enter and exponential damping
    const phaseChanged = this.lastPhase !== phase;
    this.lastPhase = phase;
    const dampFactor = phaseChanged ? 1 : 1 - Math.exp(-5.5 * dt);

    if (isTitle && hero) {
      // Hero Main Menu Showcase: front-3/4 portrait view of captain & ball with stadium stands behind
      const isPortrait = this.camera.aspect < 1;
      const sway = Math.sin(elapsed * 0.45) * (isPortrait ? 0.16 : 0.32);
      const camZ = isPortrait ? 8.2 : 4.45;
      const camY = isPortrait ? 2.05 : 1.72;
      _vec3.set(0.45 + sway, camY, camZ);
      _lookTarget.set(0, 1.16, -3.2);
      this.camPos.lerp(_vec3, dampFactor);
      this.camTarget.lerp(_lookTarget, dampFactor);
    } else if (sim.goalFreezeTimer > 0) {
      // Goal celebration close-up
      const scorer = sim.players[sim.activeHomeIndex];
      _vec3.set(scorer.x - 6, 4.5, scorer.z - 8);
      _lookTarget.set(scorer.x, 1.3, scorer.z);
      this.camPos.lerp(_vec3, dampFactor);
      this.camTarget.lerp(_lookTarget, dampFactor);
    } else {
      // Crisp arcade broadcast follow camera (home -Z left -> away +Z right)
      const followX = THREE.MathUtils.clamp(sim.ball.x * 0.55, -12, 12);
      const followZ = THREE.MathUtils.clamp(sim.ball.z * 0.65, -18, 18);
      _vec3.set(followX - 26, 23, followZ - 2);
      _lookTarget.set(followX * 0.5, 0.5, followZ * 0.85);
      this.camPos.lerp(_vec3, dampFactor);
      this.camTarget.lerp(_lookTarget, dampFactor);
    }

    // Apply decaying trauma camera shake
    const shake = sim.cameraTrauma * sim.cameraTrauma * 0.65;
    this.camera.position.set(
      this.camPos.x + (Math.random() * 2 - 1) * shake,
      this.camPos.y + (Math.random() * 2 - 1) * shake,
      this.camPos.z + (Math.random() * 2 - 1) * shake
    );
    this.camera.lookAt(this.camTarget);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    for (const rig of this.playerRigs) {
      rig.disposables.forEach((d) => d.dispose());
    }
    this.pmremEnvTex.dispose();
    this.shadowTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
