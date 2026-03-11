import * as Colyseus from "colyseus.js";

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
    this._client = new Colyseus.Client(COLYSEUS_URL);

    try {
      this._room = await this._client.joinOrCreate("global_room", { username });
      this._myId = this._room.sessionId;
      console.log(`[MP] connected as ${username} (${this._myId})`);

      // Новый игрок появился
      this._room.state.players.onAdd((player, sessionId) => {
        if (sessionId === this._myId) return;
        console.log(`[MP] player joined: ${sessionId}`);
        this._spawnPeer(sessionId, player);
      });

      // Игрок ушёл
      this._room.state.players.onRemove((player, sessionId) => {
        console.log(`[MP] player left: ${sessionId}`);
        this._removePeer(sessionId);
      });

    } catch (e) {
      console.warn("[MP] connection failed:", e.message);
    }
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

  // Спавним меш другого игрока
  async _spawnPeer(sessionId, playerState) {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "", "assets/models/", "timmy5.glb", this._scene
    );

    const root = result.meshes[0];
    root.name  = `peer_${sessionId}`;
    root.position = new BABYLON.Vector3(
      playerState.x, playerState.y, playerState.z
    );
    root.scaling = new BABYLON.Vector3(1, 1, 1);

    // Цветовой оттенок чтобы отличать других игроков
    result.meshes.forEach(m => {
      if (m.material) {
        m.material = m.material.clone(`peer_mat_${sessionId}`);
        if (m.material.albedoColor) {
          m.material.albedoColor = new BABYLON.Color3(0.6, 0.8, 1.0); // голубоватый
        }
      }
    });

    // Тег с именем игрока
    const nameTag = this._createNameTag(playerState.username || sessionId.substring(0, 6));

    this._peers.set(sessionId, { root, nameTag, animGroups: result.animationGroups });

    // Слушаем изменения позиции
    playerState.onChange(() => {
      this._updatePeer(sessionId, playerState);
    });
  }

  _updatePeer(sessionId, state) {
    const peer = this._peers.get(sessionId);
    if (!peer) return;

    // Плавное движение через lerp
    const target = new BABYLON.Vector3(state.x, state.y, state.z);
    peer.root.position = BABYLON.Vector3.Lerp(peer.root.position, target, 0.3);

    // Поворот
    peer.root.rotation.y = state.yaw;

    // Двигаем тег имени
    if (peer.nameTag) {
      peer.nameTag.position = new BABYLON.Vector3(
        peer.root.position.x,
        peer.root.position.y + 2.2,
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
    const plane = BABYLON.MeshBuilder.CreatePlane(
      `tag_${username}`, { width: 1.5, height: 0.4 }, this._scene
    );

    const tex = new BABYLON.DynamicTexture(
      `tex_${username}`, { width: 256, height: 64 }, this._scene
    );
    tex.drawText(username, null, 44, "bold 28px Courier New", "#00ffcc", "transparent");

    const mat        = new BABYLON.StandardMaterial(`tagMat_${username}`, this._scene);
    mat.diffuseTexture  = tex;
    mat.emissiveColor   = new BABYLON.Color3(0, 1, 0.8);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    plane.material      = mat;
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