import * as THREE from 'three';
import { Cell, ScriptData, TextureData, ModelData } from '../types';

interface EngineConfig {
  canvas: HTMLCanvasElement;
  models: ModelData[];
  map: Cell[][];
  textures: TextureData[];
  scripts: ScriptData[];
  globalFloorTexture?: string;
  globalCeilTexture?: string;
}

interface Entity {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  scriptId?: string;
  health: number;
}

export class CloverEngine {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pointerLocked: boolean = false;
  private config: EngineConfig;

  // World Data
  private map: Cell[][] = [];
  private textures: Map<string, THREE.Texture> = new Map();
  private modelGroupCache: Map<string, THREE.Group> = new Map();
  private voxelGeo = new THREE.BoxGeometry(0.125, 0.125, 0.125);
  private scripts: Map<string, Function> = new Map();
  private entities: Entity[] = [];

  // Infinite map properties
  private chunks: Map<string, { group: THREE.Group, cells: Cell[][] }> = new Map();
  private chunkSize = 20;
  private worldGroup: THREE.Group = new THREE.Group();
  private lightPool: THREE.PointLight[] = [];

  // Physics / Player State
  public player = {
    position: new THREE.Vector3(0, 1, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, -1),
    onGround: false,
  };

  public time: number = 0;

  // Input State
  private keys: Record<string, boolean> = {};
  private mouseSensitivity = 0.002;
  private pitch = 0;
  private yaw = 0;

  // Animation Frame
  private animationFrameId: number = 0;
  private clock: THREE.Clock;
  
  // Camera Bobbing & Momentum
  private bobTimer = 0;
  private breathTimer = 0;
  private currentRoll = 0;
  private targetRoll = 0;
  private currentPitchOffset = 0;
  private targetPitchOffset = 0;
  private wasOnGround = true;

  constructor(config: EngineConfig) {
    this.config = config;
    this.canvas = config.canvas;
    this.map = config.map;
    this.clock = new THREE.Clock();

    // Init ThreeJS Core
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a14); // Dark ceiling void
    // Add simple fog to simulate draw distance and fluorescent falloff
    this.scene.fog = new THREE.Fog(0x1a1a14, 5, 45);

    this.scene.add(this.worldGroup);

    // Very dim ambient — dark zones should feel oppressively dark
    this.scene.add(new THREE.AmbientLight(0xfff5cc, 0.05));

    // Setup light pool — strong point lights with long reach
    for (let i = 0; i < 48; i++) {
        const light = new THREE.PointLight(0xfffae6, 2.2, 18, 1.5);
        light.visible = false;
        // Only the 4 closest lights cast shadows to avoid WebGL limits
        if (i < 4) {
            light.castShadow = true;
            light.shadow.bias = -0.002;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 20;
        }
        light.userData = { baseIntensity: 2.2, isFlickering: false };
        this.scene.add(light);
        this.lightPool.push(light);
    }

    this.camera = new THREE.PerspectiveCamera(
      100, // Extremely wide FOV for the found footage/GoPro look
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Keep it somewhat pixelated
    
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Wait for buildWorld to add lights


    // Initialize Resources
    this.loadTextures(config.textures);
    this.compileScripts(config.scripts);
    this.buildWorld();

    // Event Listeners
    this.bindEvents();
    
    // Start Loop
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private loadTextures(textureData: TextureData[]) {
    const loader = new THREE.TextureLoader();
    textureData.forEach((t) => {
      loader.load(t.dataUrl, (texture) => {
        texture.magFilter = THREE.NearestFilter; // Retro pixelated look
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        this.textures.set(t.id, texture);

        if (this.config.globalFloorTexture === t.id) {
          const tClone = texture.clone();
          tClone.repeat.set(1, 1);
          this.floorMat.map = tClone;
          this.floorMat.needsUpdate = true;
        }
        if (this.config.globalCeilTexture === t.id) {
          const tClone = texture.clone();
          tClone.repeat.set(1, 1);
          this.ceilMat.map = tClone;
          this.ceilMat.needsUpdate = true;
        }

        // Floor and ceiling materials are updated in-place above,
        // so no world rebuild is needed — wall textures are set at chunk-generation time.
      });
    });
  }

  private buildModelGroups() {
    if (!this.config.models) return;
    for (const model of this.config.models) {
      const group = new THREE.Group();
      // Use simple instancing pattern conceptually, but since models are small, we can just Group meshes.
      // Shared geometry, unique material per color.
      for (const voxel of model.voxels) {
        const mat = new THREE.MeshStandardMaterial({ color: voxel.color, roughness: 0.9 });
        const mesh = new THREE.Mesh(this.voxelGeo, mat);
        // Pivot around center X/Z (3.5), rest on floor Y=0
        mesh.position.set((voxel.x - 3.5) * 0.125, voxel.y * 0.125 + 0.0625, (voxel.z - 3.5) * 0.125);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      this.modelGroupCache.set(model.id, group);
    }
  }

  private compileScripts(scriptsData: ScriptData[]) {
    scriptsData.forEach((s) => {
      try {
        // CloverScript Wrapper
        // We provide 'entity', 'player', 'engine', and 'deltaTime' implicitly
        const compiled = new Function('entity', 'player', 'engine', 'deltaTime', s.code);
        this.scripts.set(s.id, compiled);
      } catch (e) {
        console.error(`Syntax error in CloverScript '${s.name}':`, e);
      }
    });
  }

  private floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7f65, roughness: 1.0 });
  private ceilMat = new THREE.MeshStandardMaterial({ color: 0xddddca, roughness: 0.9 });
  private lightCeilMat = new THREE.MeshStandardMaterial({ color: 0xfffef0, emissive: 0xfffae6, emissiveIntensity: 3.0 });
  
  // Shared Geometries to prevent memory allocations and GC freezing
  private sharedFloorGeo = new THREE.PlaneGeometry(1, 1);
  private sharedCeilGeo = new THREE.PlaneGeometry(1, 1);
  private sharedWallGeo = new THREE.BoxGeometry(1, 1, 1);
  private sharedThinWallZGeo = new THREE.BoxGeometry(0.15, 1, 1.0);
  private sharedThinWallXGeo = new THREE.BoxGeometry(1.0, 1, 0.15);
  
  // Cache for wall materials so we don't clone textures for every single wall
  private wallMatCache = new Map<string, THREE.MeshStandardMaterial>();
  private defaultWallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0 });

  private infiniteSeed: number = Math.floor(Math.random() * 1000000);

  private buildWorld() {
    this.entities = []; // clear entities
    this.buildModelGroups(); // pre-build voxel groups
    // Set initial player pos for infinite map
    this.player.position.set(3, 0.9, 3);
  }

  private getChunkKey(cx: number, cz: number) {
    return `${cx},${cz}`;
  }

  private generateChunk(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    if (this.chunks.has(key)) return;

    const group = new THREE.Group();
    const cells: Cell[][] = [];

    // Procedural Infinite Generation
    const seedBase = this.infiniteSeed + Math.abs(cx * 10000 + cz * 100) + (cx < 0 ? 1 : 0) + (cz < 0 ? 2 : 0);
    const random = (offset: number) => {
       let x = Math.sin(seedBase + offset) * 10000;
       return x - Math.floor(x);
    };
        
        for (let y = 0; y < this.chunkSize; y++) {
          cells[y] = [];
          for (let x = 0; x < this.chunkSize; x++) {
             cells[y][x] = {
               x: cx * this.chunkSize + x,
               y: cz * this.chunkSize + y,
               type: 'wall',
               height: 3.5,
               floorHeight: 0,
               ceilHeight: 3.5,
               textureId: 'backrooms-wall',
               isLight: false,
               isThinWall: false,
               wallDirection: 'x'
             };
          }
        }

        const carve = (x: number, y: number, fH: number, cH: number) => {
           if (x >= 0 && x < this.chunkSize && y >= 0 && y < this.chunkSize) {
              cells[y][x].type = 'empty';
              cells[y][x].floorHeight = fH;
              cells[y][x].ceilHeight = cH;
           }
        };

        // Standard connection corridors
        for(let x=0; x<this.chunkSize; x++) {
           carve(x, 10, 0, 3.5);
           carve(x, 11, 0, 3.5);
        }
        for(let y=0; y<this.chunkSize; y++) {
           carve(10, y, 0, 3.5);
           carve(11, y, 0, 3.5);
        }

        // Random rooms
        const numRooms = Math.floor(random(5) * 5) + 3;
        for(let i=0; i<numRooms; i++) {
           const rw = Math.floor(random(10+i) * 6) + 4;
           const rh = Math.floor(random(20+i) * 6) + 4;
           const rx = Math.floor(random(30+i) * (this.chunkSize - rw));
           const ry = Math.floor(random(40+i) * (this.chunkSize - rh));
           
           for(let cy = ry; cy < ry+rh; cy++) {
               for(let px = rx; px < rx+rw; px++) {
                   carve(px, cy, 0, 3.5);
               }
           }
        }

        // Spawn clear area so player doesn't start inside a wall
        if (cx === 0 && cz === 0) {
           for (let y = 0; y <= 6; y++) {
             for (let x = 0; x <= 6; x++) {
                carve(x, y, 0, 3.5);
             }
           }
        }

        // Place ceiling lights on a sparse grid — every 6 units, only in open space
        for (let y = 1; y < this.chunkSize - 1; y++) {
           for (let x = 1; x < this.chunkSize - 1; x++) {
               const worldX = cx * this.chunkSize + x;
               const worldZ = cz * this.chunkSize + y;
               if (cells[y][x].type === 'empty' && Math.abs(worldX) % 6 === 3 && Math.abs(worldZ) % 6 === 3) {
                   // Only place if all 8 neighbours are also open (avoids lights clipping into walls)
                   let open = true;
                   for (let dy = -1; dy <= 1; dy++) {
                       for (let dx = -1; dx <= 1; dx++) {
                           if (cells[y+dy][x+dx].type === 'wall') { open = false; break; }
                       }
                       if (!open) break;
                   }
                   if (open) cells[y][x].isLight = true;
               }
           }
        }


    // Render local chunk
    for (let y = 0; y < cells.length; y++) {
      for (let x = 0; x < cells[y].length; x++) {
        const cell = cells[y][x];
        const floorH = cell.floorHeight ?? 0;
        const ceilH  = cell.ceilHeight  ?? 3.5;
        const worldX = cell.x;
        const worldZ = cell.y; // map 'y' == world Z

        // ── Floor & Ceiling ──────────────────────────────────────────
        // Render for every open (non-wall) cell, including thin walls
        if (cell.type !== 'wall' || cell.isThinWall) {
            // Floor
            const fMesh = new THREE.Mesh(this.sharedFloorGeo, this.floorMat);
            fMesh.rotation.x = -Math.PI / 2;
            fMesh.position.set(worldX, floorH, worldZ);
            fMesh.receiveShadow = true;
            group.add(fMesh);

            // Ceiling (or glowing light panel)
            const cMesh = new THREE.Mesh(this.sharedCeilGeo, cell.isLight ? this.lightCeilMat : this.ceilMat);
            cMesh.rotation.x = Math.PI / 2;
            cMesh.position.set(worldX, ceilH, worldZ);
            cMesh.receiveShadow = true;
            group.add(cMesh);
        }

        // ── Walls ────────────────────────────────────────────────────
        if (cell.type === 'wall') {
          const wHeight = (cell.height != null && cell.height > 0) ? cell.height : (ceilH - floorH);

          let geoW: THREE.BoxGeometry;
          if (cell.isThinWall) {
            geoW = cell.wallDirection === 'z' ? this.sharedThinWallZGeo : this.sharedThinWallXGeo;
          } else {
            geoW = this.sharedWallGeo;
          }

          let mat = this.defaultWallMat;
          if (cell.textureId && this.textures.has(cell.textureId)) {
            const cacheKey = `${cell.textureId}_${wHeight}`;
            if (!this.wallMatCache.has(cacheKey)) {
                const tex = this.textures.get(cell.textureId)!.clone();
                tex.repeat.set(1, wHeight);
                this.wallMatCache.set(cacheKey, new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0 }));
            }
            mat = this.wallMatCache.get(cacheKey)!;
          }

          const mesh = new THREE.Mesh(geoW, mat);
          mesh.scale.set(1, wHeight, 1); // Scale unit geometry to height
          mesh.position.set(worldX, floorH + wHeight / 2, worldZ);
          mesh.castShadow  = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }

        // ── 3D Models ──────────────────────────────────────────────────
        if (cell.type === 'empty' && !cell.isLight && this.config.models && this.config.models.length > 0) {
            // 2% chance to spawn a model object (e.g. chair) in an empty corner
            if (random(cell.x * 3.14 + cell.y * 2.71) < 0.02) {
                const modelIdx = Math.floor(random(cell.x + cell.y) * this.config.models.length);
                const mData = this.config.models[modelIdx];
                const cachedGroup = this.modelGroupCache.get(mData.id);
                if (cachedGroup) {
                    const modelInstance = cachedGroup.clone();
                    modelInstance.position.set(worldX, floorH, worldZ);
                    // Add slight random offset and rotation so they look scattered
                    modelInstance.position.x += (random(cell.x) - 0.5) * 0.5;
                    modelInstance.position.z += (random(cell.y) - 0.5) * 0.5;
                    modelInstance.rotation.y = random(cell.x * cell.y) * Math.PI * 2;
                    group.add(modelInstance);
                }
            }
        }
      }
    }

    this.chunks.set(key, { group, cells });
    this.worldGroup.add(group);
  }

  private getCellAt(worldX: number, worldZ: number): Cell | null {
    // Infinite map handling
    const wx = Math.floor(worldX + 0.5);
    const wz = Math.floor(worldZ + 0.5);
    const cx = Math.floor(wx / this.chunkSize);
    const cz = Math.floor(wz / this.chunkSize);
    const key = this.getChunkKey(cx, cz);
    
    if (!this.chunks.has(key)) {
        this.generateChunk(cx, cz);
    }
    const chunk = this.chunks.get(key);
    
    const lx = ((wx % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const lz = ((wz % this.chunkSize) + this.chunkSize) % this.chunkSize;
    
    return chunk?.cells[lz][lx] || null;
  }

  private updateChunks() {
    const pcx = Math.floor(this.player.position.x / this.chunkSize);
    const pcz = Math.floor(this.player.position.z / this.chunkSize);
    
    const RENDER_RADIUS = 1; // 3x3 chunks around player for better performance
    const activeKeys = new Set<string>();

    for (let z = pcz - RENDER_RADIUS; z <= pcz + RENDER_RADIUS; z++) {
      for (let x = pcx - RENDER_RADIUS; x <= pcx + RENDER_RADIUS; x++) {
        const key = this.getChunkKey(x, z);
        activeKeys.add(key);
        this.generateChunk(x, z);
      }
    }

    // Collect stale keys first — never delete from a Map while iterating it
    const staleKeys: string[] = [];
    for (const key of this.chunks.keys()) {
      if (!activeKeys.has(key)) {
        staleKeys.push(key);
      }
    }
    staleKeys.forEach(key => this.disposeChunk(key));
  }

  private disposeChunk(key: string) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    chunk.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Geometries are shared, so we do NOT dispose them here.
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          // NEVER dispose shared materials
          if (m === this.floorMat || m === this.ceilMat || m === this.lightCeilMat || m === this.defaultWallMat) return;
          // Wall materials are now cached and shared across all chunks, so we don't dispose them here!
          // They will live for the lifetime of the engine.
        });
      }
    });
    this.worldGroup.remove(chunk.group);
    this.chunks.delete(key);
  }

  private lastLightUpdatePos = new THREE.Vector3(999, 999, 999);

  private updateLights() {
     // Only update lights if player moved more than roughly 2 units
     if (this.player.position.distanceToSquared(this.lastLightUpdatePos) < 4.0) {
         return;
     }

     this.lastLightUpdatePos.copy(this.player.position);

     const allLights: {x: number, y: number, cell: Cell}[] = [];
     for (const chunk of this.chunks.values()) {
         for (const row of chunk.cells) {
             for (const cell of row) {
                 if (cell.isLight) allLights.push({x: cell.x, y: cell.y, cell});
             }
         }
     }
     
     allLights.sort((a,b) => {
         const da = Math.abs(a.x - this.player.position.x) + Math.abs(a.y - this.player.position.z);
         const db = Math.abs(b.x - this.player.position.x) + Math.abs(b.y - this.player.position.z);
         return da - db;
     });
     
     for (let i=0; i<this.lightPool.length; i++) {
         if (i < allLights.length) {
             const l = allLights[i];
             // Lower the light slightly further from the ceiling so the ceiling receives better angular illumination
             this.lightPool[i].position.set(l.x, (l.cell.ceilHeight || 3.5) - 0.5, l.y);
             this.lightPool[i].visible = true;
             
             // Pseudo-randomly assign flickering based on position
             const isFlickering = Math.sin(l.x * 12.9898 + l.y * 78.233) > 0.8;
             this.lightPool[i].userData.isFlickering = isFlickering;
         } else {
             this.lightPool[i].visible = false;
         }
     }
  }

  private bindEvents() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    
    // Request pointer lock on click if we are playing
    this.canvas.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('resize', this.onResize);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationFrameId);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    document.exitPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked) return;

    this.yaw -= e.movementX * this.mouseSensitivity;
    this.pitch -= e.movementY * this.mouseSensitivity;

    // Clamp pitch to look almost straight up/down
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private checkCollision(pos: THREE.Vector3): { collided: boolean, floorY: number, ceilY: number } {
    const radius = 0.25; // Player radius to prevent getting too close

    // Check all 4 corners of the bounding box
    const corners = [
      { x: pos.x - radius, z: pos.z - radius },
      { x: pos.x + radius, z: pos.z - radius },
      { x: pos.x - radius, z: pos.z + radius },
      { x: pos.x + radius, z: pos.z + radius }
    ];

    let maxFloorY: number = -Infinity;
    let minCeilY: number = Infinity;
    let wallCollided: boolean = false;

    for (const corner of corners) {
      const cell = this.getCellAt(corner.x, corner.z);
      
      if (!cell) {
        wallCollided = true;
        continue;
      }

      const fH = cell.floorHeight || 0;
      const cH = cell.ceilHeight || 3.5;

      maxFloorY = Math.max(maxFloorY, fH);
      minCeilY = Math.min(minCeilY, cH);

      if (cell.type === 'wall') {
        wallCollided = true;
      }
    }
    
    return { collided: wallCollided, floorY: maxFloorY, ceilY: minCeilY };
  }

  private updatePhysics(deltaTime: number) {
    this.updateChunks();
    this.updateLights();

    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const SPEED = isSprinting ? 5.5 : 2.5;
    const JUMP_FORCE = 8.0;
    const GRAVITY = 20.0;

    // Calculate movement vector direction based on yaw
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    // Forward vector (flattened to XZ plane)
    direction.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW']) { moveX -= direction.x; moveZ -= direction.z; }
    if (this.keys['KeyS']) { moveX += direction.x; moveZ += direction.z; }
    if (this.keys['KeyA']) { moveX += right.x; moveZ += right.z; }
    if (this.keys['KeyD']) { moveX -= right.x; moveZ -= right.z; }

    // Normalize diagonal movement
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    // Apply horizontal velocity
    this.player.velocity.x = moveX * SPEED;
    this.player.velocity.z = moveZ * SPEED;

    // Gravity
    this.player.velocity.y -= GRAVITY * deltaTime;

    // Jump
    if (this.keys['Space'] && this.player.onGround) {
      this.player.velocity.y = JUMP_FORCE;
      this.player.onGround = false;
    }

    // --- APPLY VELOCITY & COLLISIONS ---
    const nextPos = this.player.position.clone();

    // Max step height player can step up automatically
    const MAX_STEP = 0.6;
    const playerFeetY = this.player.position.y - 0.9; // Lowered feet for taller player

    // Check X axis
    nextPos.x += this.player.velocity.x * deltaTime;
    let colX = this.checkCollision(nextPos);
    
    // Only revert if moving made us collide, AND we are actually moving into it
    if (colX.collided || colX.floorY > playerFeetY + MAX_STEP) {
      nextPos.x = this.player.position.x; // Revert
      this.player.velocity.x = 0;
    }

    // Check Z axis
    nextPos.z += this.player.velocity.z * deltaTime;
    let colZ = this.checkCollision(nextPos);
    if (colZ.collided || colZ.floorY > playerFeetY + MAX_STEP) {
      nextPos.z = this.player.position.z; // Revert
      this.player.velocity.z = 0;
    }

    // Check Y axis
    nextPos.y += this.player.velocity.y * deltaTime;
    let colY = this.checkCollision(nextPos);
    
    // Ceiling collision
    if (nextPos.y + 0.9 > colY.ceilY) {
      // Hit ceiling
      this.player.velocity.y = Math.min(0, this.player.velocity.y); // Stop upward movement
      nextPos.y = colY.ceilY - 0.9;
    }

    // Floor collision
    if (nextPos.y - 0.9 < colY.floorY) {
      if (this.player.velocity.y < 0) {
        this.player.onGround = true;
      }
      this.player.velocity.y = 0;
      nextPos.y = colY.floorY + 0.9; 
    } else {
      this.player.onGround = false;
    }

    // Fall abyss clamped
    if (nextPos.y < -50) {
      nextPos.y = colY.floorY + 0.9;
      this.player.velocity.y = 0;
    }

    this.player.position.copy(nextPos);

    // Breathing and bobbing timers
    this.breathTimer += deltaTime * 1.5;
    if (this.player.onGround && length > 0) {
      this.bobTimer += deltaTime * (isSprinting ? 14.0 : 10.0);
    } else {
      // Smoothly settle bobbing when stopped
      const targetBob = Math.round(this.bobTimer / Math.PI) * Math.PI;
      this.bobTimer += (targetBob - this.bobTimer) * deltaTime * 8.0;
    }

    // Heavy landing dip
    if (!this.wasOnGround && this.player.onGround) {
        // We just hit the ground, dip the camera down
        this.currentPitchOffset = -0.15;
    }
    this.wasOnGround = this.player.onGround;

    // Calculate targets for leaning based on movement input (not just velocity, to feel responsive)
    this.targetRoll = moveX * -0.06; // Lean left when moving right
    this.targetPitchOffset = (moveZ > 0 ? 0.03 : moveZ < 0 ? -0.03 : 0); 
    
    // Smoothly interpolate camera momentum
    this.currentRoll += (this.targetRoll - this.currentRoll) * deltaTime * 6.0;
    this.currentPitchOffset += (this.targetPitchOffset - this.currentPitchOffset) * deltaTime * 4.0;

    // Update Camera
    this.camera.position.copy(this.player.position);
    
    // Calculate vertical offset (head bob + breathing)
    // Very aggressive bobbing when sprinting
    const bobAmp = isSprinting ? 0.12 : 0.06;
    const bobOffset = Math.sin(this.bobTimer) * bobAmp;
    const breathOffset = Math.sin(this.breathTimer) * 0.015;
    
    // Add eye height offset (0.7 above center) -> total height 1.6 from feet (+0.9 to center)
    this.camera.position.y += 0.7 + Math.abs(bobOffset) + breathOffset; 
    
    // Apply pitch and yaw to camera
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch + this.currentPitchOffset;
    euler.y = this.yaw;
    
    // Found Footage / Realistic Handheld effect
    // 1. Walking sway (roll) + Sideways Lean
    euler.z = Math.sin(this.bobTimer * 0.5) * (isSprinting ? 0.03 : 0.015) + this.currentRoll;
    
    // 2. Micro jitter / hand shake (more intense when sprinting)
    const jitter = isSprinting ? 0.003 : 0.001;
    euler.x += (Math.random() - 0.5) * jitter;
    euler.y += (Math.random() - 0.5) * jitter;

    this.camera.quaternion.setFromEuler(euler);
  }

  private executeScripts(deltaTime: number) {
    this.entities.forEach((entity) => {
      if (entity.scriptId && this.scripts.has(entity.scriptId)) {
        const scriptFunc = this.scripts.get(entity.scriptId)!;
        try {
          // Execute CloverScript!
          scriptFunc(entity, this.player, this, deltaTime);
          
          // Apply script-modified position to the mesh
          entity.mesh.position.copy(entity.position);
        } catch (e) {
          console.warn(`Execution error in script ${entity.scriptId}:`, e);
        }
      }
    });
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    this.time += deltaTime;

    if (this.pointerLocked) {
      this.updatePhysics(deltaTime);
      this.executeScripts(deltaTime);
    }

    // Handle flickering lights
    for (let i = 0; i < this.lightPool.length; i++) {
        const light = this.lightPool[i];
        if (light.visible && light.userData.isFlickering) {
            // Flicker logic: 5% chance to drop intensity significantly
            const flickerScale = Math.random() < 0.05 ? 0.1 : 1.0;
            light.intensity = light.userData.baseIntensity * flickerScale;
        } else if (light.visible) {
            light.intensity = light.userData.baseIntensity;
        }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
