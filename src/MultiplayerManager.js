import { CHAR } from './config.js';
import { AnimationController } from './AnimationController.js';
import { Client, Callbacks } from "@colyseus/sdk";

const COLYSEUS_URL = "wss://3d-game-colyseus.fly.dev";
const SEND_INTERVAL = 50; // ms — отправка позиции 20 раз в секунду

export class MultiplayerManager {

  constructor(scene, shadowGen) {
    this._scene     = scene;
    this._shadowGen = shadowGen;
    this._client    = null;
    this._room      = null;
    this._myId      = null;
    this._peers     = new Map(); // sessionId → { mesh, animState }
    this._lastSend  = 0;
  }

  async connect(username) {

    this._client = new Client(COLYSEUS_URL);

    this._room = await this._client.joinOrCreate("global_room", { username });

    const callbacks = Callbacks.get(this._room);
    
    this._myId = this._room.sessionId;
    console.log(`[MP] connected as ${username} (${this._myId})`);
    
    callbacks.onAdd("players", (player, sessionId) => {

        if (sessionId === this._myId) return;
        console.log(`[MP] player joined: ${sessionId}`);
        this._spawnPeer(sessionId, player);

        callbacks.onChange(player, () => {
            this._updatePeer(sessionId, player);
        // some property changed inside `entity`
        });
    });

    callbacks.onRemove("players", (player, sessionId) => {

        console.log(`[MP] player left: ${sessionId}`);
        this._removePeer(sessionId);    
        // remove your player entity from the game world!
    });
    
  }

  onCrystalCollected(callback) {
    if (!this._room) return;
    const callbacks = Callbacks.get(this._room);

    callbacks.onAdd("crystals", (crystal, key) => {

      console.log(`[MP] crystal onAdd key=${key} collected=${crystal.collected}`);

      callbacks.onChange(crystal, () => {
        if (crystal.collected) callback(Number(key));
      });
      // Новый игрок — сразу скрываем уже собранные
      if (crystal.collected) callback(Number(key));
    });
  }

  notifyCrystalCollected(index) {
    if (!this._room) return;
    this._room.send("collectCrystal", { index });
  }

  // Отправляем свою позицию серверу
  sendPosition(position, yaw, animation, now) {
    if (!this._room) return;
    if (now - this._lastSend < SEND_INTERVAL) return;
    this._lastSend = now;

    this._room.send("move", {
      x:         position.x,
      y:         position.y,
      z:         position.z,
      yaw:       yaw,
      animation: animation,
    });
  }

 

async _spawnPeer(sessionId, playerState) {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "", "assets/models/", "timmy5.glb", this._scene
  );

  const root = result.meshes[0];
  root.name  = `peer_${sessionId}`;
  root.rotationQuaternion = null;
  root.position = new BABYLON.Vector3(
    playerState.x,
    (playerState.y - CHAR.capsuleHeight / 2),
    playerState.z
  );
  root.scaling = new BABYLON.Vector3(1, 1, 1);

  result.meshes.forEach(m => {
    if (m.material) {
      m.material = m.material.clone(`peer_mat_${sessionId}`);
      if (m.material.albedoColor) {
        m.material.albedoColor = new BABYLON.Color3(0.6, 0.8, 1.0);
      }
    }
  });
  
  console.log(`player name = ${playerState.username}`);
  const nameTag = this._createNameTag(playerState.username || sessionId.substring(0, 6));

  // Загружаем анимации для этого пира
  const skeleton = result.skeletons?.[0] ?? null;
  const animCtrl = new AnimationController();
  if (skeleton) await animCtrl.load(this._scene, skeleton, root);

  this._peers.set(sessionId, { root, nameTag, animCtrl });
}

_updatePeer(sessionId, state) {
  const peer = this._peers.get(sessionId);
  if (!peer) return;

  const target = new BABYLON.Vector3(
    state.x,
    (state.y - CHAR.capsuleHeight / 2),
    state.z
  );
  peer.root.position = BABYLON.Vector3.Lerp(peer.root.position, target, 0.3);
  peer.root.rotation.y = state.yaw;

  // Переключаем анимацию
  if (peer.animCtrl) {
    const animKey = state.animation ?? 'idle';
    if (peer.animCtrl.currentKey !== animKey) {
      peer.animCtrl.play(animKey);
    }
  }

  if (peer.nameTag) {
    peer.nameTag.position = new BABYLON.Vector3(
      peer.root.position.x,
      peer.root.position.y + 1.9,
      peer.root.position.z
    );
  }
}

  _removePeer(sessionId) {
    const peer = this._peers.get(sessionId);
    if (!peer) return;
    peer.root.dispose();
    if (peer.nameTag) peer.nameTag.dispose();
    this._peers.delete(sessionId);
  }


  _createNameTag(username) {
  const H = 48;
  const FONT = "500 36px 'Courier New'";
  const PADDING = 24; // отступ по бокам

  // Измеряем ширину текста через временный canvas
  const tmpCanvas = document.createElement('canvas');
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.font = FONT;
  const textWidth = tmpCtx.measureText(username).width;
  const W = Math.ceil(textWidth + PADDING * 2);

  // Размер плоскости пропорционален ширине текстуры
  const planeWidth = (W / 256) * 1.2;

  const plane = BABYLON.MeshBuilder.CreatePlane(
    `tag_${username}`, { width: planeWidth, height: 0.22 }, this._scene
  );

  const tex = new BABYLON.DynamicTexture(
    `tex_${username}`, { width: W, height: H }, this._scene
  );

  const ctx = tex.getContext();

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10, 12, 20, 0.6)";
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.quadraticCurveTo(W, 0, W, r);
  ctx.lineTo(W, H - r);
  ctx.quadraticCurveTo(W, H, W - r, H);
  ctx.lineTo(r, H);
  ctx.quadraticCurveTo(0, H, 0, H - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.font = FONT;
  ctx.fillStyle = "#00ffcc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 255, 204, 1.0)";
  ctx.shadowBlur = 3;
  ctx.fillText(username, W / 2, H / 2);

  tex.update();

  const mat = new BABYLON.StandardMaterial(`tagMat_${username}`, this._scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  tex.hasAlpha = true;

  plane.material = mat;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

  return plane;
}

  dispose() {
    this._peers.forEach((_, id) => this._removePeer(id));
    if (this._room) this._room.leave();
    this._room   = null;
    this._client = null;
  }
}



// try {
    //   console.log("123");
    //   this._room = await this._client.joinOrCreate('global_room', {/* */});
      
    //   console.log(`[MP] _room`);
      
    //   this._myId = this._room.sessionId;
      
    //   //console.log(`[MP] connected as ${username} (${this._myId})`);

    //   const $ = getStateCallbacks(this._room);  

    //   // Новый игрок появился
    //   $(this._room.state).players.onAdd((player, sessionId) => {
    //     if (sessionId === this._myId) return;
    //     console.log(`[MP] player joined: ${sessionId}`);
    //     this._spawnPeer(sessionId, player, $);
    //   });

    //   // Игрок ушёл
    //   $(this._room.state).players.onRemove((player, sessionId) => {
    //     console.log(`[MP] player left: ${sessionId}`);
    //     this._removePeer(sessionId);
    //   });

    // } catch (e) {
    //     console.warn("[MP] connection failed:", e.message);
    //     console.error("[MP] full error:", e);
    // }

     // Спавним меш другого игрока
//   async _spawnPeer(sessionId, playerState) {

//     const result = await BABYLON.SceneLoader.ImportMeshAsync(
//       "", "assets/models/", "timmy5.glb", this._scene
//     );

//     const root = result.meshes[0];
//     root.name  = `peer_${sessionId}`;

//     // Обнуляем quaternion — иначе rotation.y не работает
//     root.rotationQuaternion = null;


//     root.position = new BABYLON.Vector3(
//         playerState.x,
//         (playerState.y - CHAR.capsuleHeight / 2), // как в #syncModelToCapsule
//         playerState.z
//     );

//     root.scaling = new BABYLON.Vector3(1, 1, 1);

//     // Цветовой оттенок чтобы отличать других игроков
//     result.meshes.forEach(m => {
//       if (m.material) {
//         m.material = m.material.clone(`peer_mat_${sessionId}`);
//         if (m.material.albedoColor) {
//           m.material.albedoColor = new BABYLON.Color3(0.6, 0.8, 1.0); // голубоватый
//         }
//       }
//     });

//     // Тег с именем игрока
//     const nameTag = this._createNameTag(playerState.username || sessionId.substring(0, 6));
//     this._peers.set(sessionId, { root, nameTag, animGroups: result.animationGroups });    
//   }

//   _updatePeer(sessionId, state) {
//     const peer = this._peers.get(sessionId);
//     if (!peer) return;

//     // Плавное движение через lerp
//     //const target = new BABYLON.Vector3(state.x, state.y, state.z);
//     //peer.root.position = BABYLON.Vector3.Lerp(peer.root.position, target, 0.3);

//     const target = new BABYLON.Vector3(
//         state.x,
//         (state.y - CHAR.capsuleHeight / 2),
//         state.z
//     );
//     peer.root.position = BABYLON.Vector3.Lerp(peer.root.position, target, 0.3);

//     // Поворот
//     peer.root.rotation.y = state.yaw;
    

//     // Двигаем тег имени
//     if (peer.nameTag) {
//       peer.nameTag.position = new BABYLON.Vector3(
//         peer.root.position.x,
//         peer.root.position.y + 2.2,
//         peer.root.position.z
//       );
//     }
//   }