'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { roleIndex, roleName } = require('./http');
const {
  loadBuildings,
  loadStreets,
  loadStart,
  buildingInRadius,
  streetInRadius,
  normalizeAddress
} = require('./import-data');

const FALLBACK_START = { x: -6736606.72045857, z: 7713514.742933013 };
const START = loadStart(FALLBACK_START);
const PLACEHOLDER = fs.readFileSync(path.join(__dirname, '..', 'data', 'placeholder.bin'));

function nowIso() {
  return new Date().toISOString();
}

function dist(a, b) {
  const dx = (a.x || 0) - (b.x || 0);
  const dz = (a.z || 0) - (b.z || 0);
  return Math.hypot(dx, dz);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    phone: user.phone,
    schoolName: user.schoolName,
    role: user.role
  };
}

function buildingOut(building) {
  if (building.model) {
    return {
      id: building.id,
      model: building.model,
      address: building.address,
      height: building.height,
      polygons: building.polygons || [],
      position: building.position,
      rotation: building.rotation,
      scale: building.scale,
      modelMetadata: {
        position: building.position,
        rotation: building.rotation,
        scale: building.scale
      }
    };
  }
  return {
    id: building.id,
    height: building.height,
    address: building.address,
    nodes: building.nodes
  };
}

/** DTO здания-с-моделью (как ждёт фронт BuildingWithModel). */
function modelBuildingOut(model, hostBuilding) {
  const position =
    model.position ||
    (hostBuilding && hostBuilding.position) ||
    (hostBuilding ? [hostBuilding.cx, 0, hostBuilding.cz] : [0, 0, 0]);
  const rotation =
    model.rotation ||
    (hostBuilding && hostBuilding.rotation) ||
    [0, model.rotationY || 0, 0];
  const scale =
    model.scale != null
      ? model.scale
      : hostBuilding && hostBuilding.scale != null
        ? hostBuilding.scale
        : 1;
  return {
    id: (hostBuilding && hostBuilding.id) || model.buildingId || model.id,
    model: model.id,
    address:
      model.address != null
        ? model.address
        : hostBuilding
          ? hostBuilding.address
          : null,
    height: hostBuilding && hostBuilding.height != null ? hostBuilding.height : 10,
    polygons: model.polygons || (hostBuilding && hostBuilding.polygons) || [],
    position,
    rotation,
    scale,
    modelMetadata: { position, rotation, scale }
  };
}

/** Привязать модель к полигонам: хост-здание получает model, остальные только помечаются через model.polygons. */
function linkModelToPolygons(buildings, model) {
  const polygonIds = model.polygons || [];
  for (const b of buildings) {
    if (b.model === model.id) {
      delete b.model;
      delete b.polygons;
      delete b.position;
      delete b.rotation;
      delete b.scale;
    }
  }
  if (polygonIds.length === 0) return;
  const host =
    buildings.find((b) => b.id === model.buildingId) ||
    buildings.find((b) => b.id === polygonIds[0]);
  if (!host) return;
  model.buildingId = host.id;
  host.model = model.id;
  host.polygons = polygonIds.slice();
  host.position = model.position || [host.cx, 0, host.cz];
  host.rotation = model.rotation || [0, model.rotationY || 0, 0];
  host.scale = model.scale != null ? model.scale : 1;
  host.updatedAt = nowIso();
  if (model.address != null) host.address = model.address;
}

function streetOut(street) {
  return {
    id: street.id,
    way_id: street.way_id,
    name: street.name,
    highway: street.highway,
    width: street.width,
    nodes: street.nodes
  };
}

function pointOut(point) {
  return {
    id: point.id,
    name: point.name,
    lat: point.lat || 0,
    lng: point.lng || 0,
    type: point.type,
    position: point.position,
    rotation: point.rotation,
    targetPosition: point.targetPosition,
    rotationRestricted: Boolean(point.rotationRestricted),
    tiltRestricted: Boolean(point.tiltRestricted),
    movementRestricted: Boolean(point.movementRestricted),
    description: point.description || ''
  };
}

function createStore() {
  const users = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Admin',
      login: 'admin',
      password: 'password',
      phone: '+70000000001',
      schoolName: 'ITC',
      role: 2,
      roleName: 'Admin'
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Creator',
      login: 'creator',
      password: 'password',
      phone: '+70000000002',
      schoolName: 'ITC',
      role: 1,
      roleName: 'Creator'
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Uploader',
      login: 'uploader',
      password: 'password',
      phone: '+70000000003',
      schoolName: 'ITC',
      role: 3,
      roleName: 'Uploader'
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'User',
      login: 'user',
      password: 'password',
      phone: '+70000000004',
      schoolName: 'ITC',
      role: 0,
      roleName: 'User'
    }
  ];

  const modelId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const models = {
    [modelId]: {
      id: modelId,
      address: 'ул. Ленина, 1',
      position: [START.x + 20, 0, START.z + 10],
      rotation: [0, 0, 0],
      rotationY: 0,
      scale: 1,
      polygons: ['b-with-model'],
      buildingId: 'b-with-model',
      buffer: Buffer.from(PLACEHOLDER)
    }
  };

  const buildings = loadBuildings();
  const streets = loadStreets();
  const nearest = buildings.reduce((best, building) => {
    if (!best) return building;
    const d = dist({ x: building.cx, z: building.cz }, START);
    const bd = dist({ x: best.cx, z: best.cz }, START);
    return d < bd ? building : best;
  }, null);
  if (nearest) {
    nearest.model = modelId;
    nearest.polygons = [nearest.id];
    nearest.position = [nearest.cx, 0, nearest.cz];
    nearest.rotation = [0, 0, 0];
    nearest.scale = 1;
    nearest.updatedAt = nowIso();
    models[modelId].address = nearest.address;
    models[modelId].position = nearest.position;
    models[modelId].polygons = [nearest.id];
    models[modelId].buildingId = nearest.id;
  }

  const pointA = {
    id: 'p-start',
    name: 'Старт',
    type: 'start',
    lat: 56.838,
    lng: 60.597,
    position: [START.x, 1.8, START.z],
    rotation: [0, 0, 0],
    targetPosition: [START.x + 10, 1.8, START.z],
    rotationRestricted: false,
    tiltRestricted: false,
    movementRestricted: false,
    description: 'Начальная точка экскурсии'
  };
  const pointB = {
    id: 'p-mid',
    name: 'Площадь',
    type: 'checkpoint',
    lat: 56.839,
    lng: 60.6,
    position: [START.x + 40, 1.8, START.z + 20],
    rotation: [0, 0.5, 0],
    targetPosition: [START.x + 50, 1.8, START.z + 20],
    rotationRestricted: false,
    tiltRestricted: false,
    movementRestricted: false,
    description: 'Остановка у площади'
  };

  const tracks = [
    {
      id: 't-center',
      name: 'Центр города',
      points: [pointA, pointB]
    }
  ];

  const modelOffers = [
    {
      modelId: 'offer-0001',
      address: 'ул. 8 Марта, 8',
      description: 'Черновик модели для согласования',
      author: 'uploader',
      createdAt: nowIso(),
      buffer: Buffer.from(PLACEHOLDER)
    }
  ];

  const pendingUploads = {};

  return {
    start: START,
    users,
    buildings,
    streets,
    models,
    tracks,
    modelOffers,
    pendingUploads,

    getUserByLogin(login) {
      return users.find((u) => u.login === login) || null;
    },
    getUserById(id) {
      return users.find((u) => u.id === id) || null;
    },
    userOut: publicUser,

    createUser(body) {
      const role = roleIndex(body.role);
      const user = {
        id: crypto.randomUUID(),
        name: body.name || '',
        login: body.login || `user-${users.length + 1}`,
        password: body.password || 'password',
        phone: body.phone || '',
        schoolName: body.schoolName || '',
        role,
        roleName: roleName(role)
      };
      users.push(user);
      return user;
    },
    updateUser(user, body) {
      if (body.name != null) user.name = body.name;
      if (body.login != null) user.login = body.login;
      if (body.password != null) user.password = body.password;
      if (body.phone != null) user.phone = body.phone;
      if (body.schoolName != null) user.schoolName = body.schoolName;
      if (body.role != null) {
        user.role = roleIndex(body.role);
        user.roleName = roleName(user.role);
      }
      return user;
    },
    deleteUser(id) {
      const idx = users.findIndex((u) => u.id === id);
      if (idx < 0) return false;
      users.splice(idx, 1);
      return true;
    },

    buildingsAround(position, distance) {
      const center = position || START;
      const radius = Number(distance);
      const max = Number.isFinite(radius) ? radius : 300;

      // Полигоны, закрытые 3D-моделью — в ответ не отдаём (фронт рисует model вместо nodes).
      const replacedPolygonIds = new Set();
      for (const model of Object.values(models)) {
        for (const pid of model.polygons || []) {
          replacedPolygonIds.add(pid);
        }
      }
      for (const b of buildings) {
        if (!b.model) continue;
        for (const pid of b.polygons || []) {
          replacedPolygonIds.add(pid);
        }
      }

      const result = [];
      const emittedModelIds = new Set();

      for (const b of buildings) {
        if (!buildingInRadius(b, center.x, center.z, max)) continue;

        if (b.model) {
          if (emittedModelIds.has(b.model)) continue;
          emittedModelIds.add(b.model);
          const model = models[b.model];
          if (model) {
            result.push(
              modelBuildingOut(
                {
                  ...model,
                  polygons: model.polygons || b.polygons || []
                },
                b
              )
            );
          } else {
            result.push(buildingOut(b));
          }
          continue;
        }

        if (replacedPolygonIds.has(b.id)) continue;
        result.push(buildingOut(b));
      }

      // Модели, у которых полигоны в радиусе, но хост ещё не помечен building.model
      for (const model of Object.values(models)) {
        if (emittedModelIds.has(model.id)) continue;
        const polygonIds = model.polygons || [];
        if (polygonIds.length === 0) continue;
        const related = polygonIds
          .map((id) => buildings.find((b) => b.id === id))
          .filter(Boolean);
        const anyInArea = related.some((b) =>
          buildingInRadius(b, center.x, center.z, max)
        );
        if (!anyInArea) continue;
        result.push(modelBuildingOut(model, related[0] || null));
        emittedModelIds.add(model.id);
      }

      return result;
    },
    streetsAround(position, distance) {
      const center = position || START;
      const radius = Number(distance);
      const max = Number.isFinite(radius) ? radius : 300;
      return streets
        .filter((s) => streetInRadius(s, center.x, center.z, max))
        .map(streetOut);
    },
    buildingById(id) {
      return buildings.find((b) => b.id === id) || null;
    },
    buildingByAddress(address) {
      if (!address) return null;
      const q = normalizeAddress(address);
      if (!q) return null;
      return (
        buildings.find((b) => b.address && normalizeAddress(b.address).includes(q)) || null
      );
    },
    updateBuilding(building, body) {
      if (body.address != null) building.address = body.address;
      if (body.height != null) building.height = body.height;
      building.updatedAt = nowIso();
      const node = (building.nodes && building.nodes[0]) || {
        x: building.position ? building.position[0] : 0,
        z: building.position ? building.position[2] : 0
      };
      return {
        id: building.id,
        address: building.address,
        height: building.height,
        x: node.x,
        z: node.z,
        modelId: building.model || null,
        rotation: building.rotation || null,
        nodesJson: building.nodes ? JSON.stringify(building.nodes) : null,
        updatedAt: building.updatedAt
      };
    },
    buildingAddressResponse(building) {
      return {
        address: building.address,
        nodes: building.nodes || [],
        height: building.height || 0,
        position: building.nodes
          ? building.nodes[0]
          : { x: building.position[0], z: building.position[2] },
        modelUrl: building.model ? `/models/${building.model}` : null
      };
    },

    getModel(id) {
      return models[id] || null;
    },
    modelByAddress(address) {
      if (!address) return null;
      const q = String(address).toLowerCase();
      return Object.values(models).find((m) => (m.address || '').toLowerCase().includes(q)) || null;
    },
    putModel(id, body) {
      const existing = models[id] || {
        id,
        buffer: Buffer.from(PLACEHOLDER)
      };
      existing.position = body.position || existing.position || [START.x, 0, START.z];
      if (Array.isArray(body.rotation)) {
        existing.rotation = body.rotation;
        existing.rotationY = body.rotation[1] || 0;
      } else if (typeof body.rotation === 'number') {
        existing.rotationY = body.rotation;
        existing.rotation = [0, body.rotation, 0];
      } else {
        existing.rotation = existing.rotation || [0, 0, 0];
        existing.rotationY = existing.rotationY || 0;
      }
      existing.scale = body.scale != null ? body.scale : existing.scale || 1;
      existing.polygons = body.polygons || existing.polygons || [];
      existing.address = body.address != null ? body.address : existing.address;
      if (body.buildingId) existing.buildingId = body.buildingId;
      models[id] = existing;
      linkModelToPolygons(buildings, existing);
      return {
        id,
        position: existing.position,
        rotation: existing.rotation,
        scale: existing.scale,
        polygons: existing.polygons,
        address: existing.address
      };
    },
    patchModel(id, body) {
      const existing = models[id];
      if (!existing) return null;
      if (body.position) existing.position = body.position;
      if (Array.isArray(body.rotation)) {
        existing.rotation = body.rotation;
        existing.rotationY = body.rotation[1] || 0;
      } else if (body.rotation != null) {
        existing.rotationY = body.rotation;
        existing.rotation = [0, body.rotation, 0];
      }
      if (body.scale != null) existing.scale = body.scale;
      if (body.polygons) existing.polygons = body.polygons;
      if (body.address != null) existing.address = body.address;
      if (body.buildingId) existing.buildingId = body.buildingId;
      linkModelToPolygons(buildings, existing);
      return existing;
    },
    deleteModel(id) {
      if (!models[id]) return false;
      delete models[id];
      for (const b of buildings) {
        if (b.model === id) {
          delete b.model;
          delete b.polygons;
          delete b.position;
          delete b.rotation;
          delete b.scale;
        }
      }
      return true;
    },
    uploadModel(buffer, options = {}) {
      const id = crypto.randomUUID();
      let polygons = Array.isArray(options.polygons)
        ? options.polygons.map(String)
        : [];
      let address =
        options.address != null && String(options.address).trim()
          ? String(options.address).trim()
          : undefined;

      // По OpenAPI: можно указать address без polygons — привязываем к найденному зданию.
      if (polygons.length === 0 && address) {
        const q = normalizeAddress(address);
        const building = buildings.find(
          (b) => b.address && normalizeAddress(b.address).includes(q)
        );
        if (!building) return null;
        polygons = [building.id];
        address = building.address || address;
      }

      const host =
        polygons.length > 0
          ? buildings.find((b) => b.id === polygons[0])
          : null;

      const model = {
        id,
        position: host ? [host.cx, 0, host.cz] : [START.x, 0, START.z],
        rotation: [0, 0, 0],
        rotationY: 0,
        scale: 1,
        polygons,
        address,
        buffer: buffer && buffer.length ? buffer : Buffer.from(PLACEHOLDER)
      };
      models[id] = model;
      linkModelToPolygons(buildings, model);
      return id;
    },

    listOffers() {
      return modelOffers.map((o) => ({
        modelId: o.modelId,
        address: o.address,
        description: o.description,
        author: o.author,
        createdAt: o.createdAt
      }));
    },
    addOffer(body) {
      const offer = {
        modelId: body.modelId || crypto.randomUUID(),
        address: body.address,
        description: body.description,
        author: body.author || 'uploader',
        createdAt: nowIso(),
        buffer: pendingUploads[body.modelId] || Buffer.from(PLACEHOLDER)
      };
      modelOffers.push(offer);
      return offer;
    },
    uploadOffer(buffer) {
      const modelId = crypto.randomUUID();
      pendingUploads[modelId] = buffer || Buffer.from(PLACEHOLDER);
      return modelId;
    },
    approveOffer(modelId) {
      const idx = modelOffers.findIndex((o) => o.modelId === modelId);
      if (idx < 0) return null;
      const offer = modelOffers.splice(idx, 1)[0];
      models[offer.modelId] = {
        id: offer.modelId,
        address: offer.address,
        position: [START.x, 0, START.z],
        rotation: [0, 0, 0],
        rotationY: 0,
        scale: 1,
        polygons: [],
        buffer: offer.buffer || Buffer.from(PLACEHOLDER)
      };
      return offer;
    },

    listTracks() {
      return tracks.map((t) => ({ id: t.id, name: t.name }));
    },
    getTrack(id) {
      const track = tracks.find((t) => t.id === id);
      if (!track) return null;
      return {
        id: track.id,
        name: track.name,
        points: track.points.map(pointOut)
      };
    },
    createTrack(name) {
      const track = { id: crypto.randomUUID(), name: name || 'Новая экскурсия', points: [] };
      tracks.push(track);
      return { id: track.id, name: track.name };
    },
    deleteTrack(id) {
      const idx = tracks.findIndex((t) => t.id === id);
      if (idx < 0) return false;
      tracks.splice(idx, 1);
      return true;
    },
    addPoint(trackId, body) {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return null;
      const point = {
        id: crypto.randomUUID(),
        name: body.name || `Точка ${track.points.length + 1}`,
        type: body.type || 'checkpoint',
        lat: 0,
        lng: 0,
        position: body.position || [START.x, 1.8, START.z],
        rotation: body.rotation || [0, 0, 0],
        targetPosition: body.targetPosition || body.position || [START.x, 1.8, START.z],
        rotationRestricted: false,
        tiltRestricted: false,
        movementRestricted: false,
        description: body.description || ''
      };
      track.points.push(point);
      return { id: point.id };
    },
    updatePoint(trackId, pointId, body) {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return { track: false, point: false };
      const point = track.points.find((p) => p.id === pointId);
      if (!point) return { track: true, point: false };
      for (const key of ['name', 'type', 'position', 'rotation', 'targetPosition', 'description']) {
        if (body[key] != null) point[key] = body[key];
      }
      return { track: true, point: true, point };
    },
    deletePoint(trackId, pointId) {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return { track: false, point: false };
      const idx = track.points.findIndex((p) => p.id === pointId);
      if (idx < 0) return { track: true, point: false };
      track.points.splice(idx, 1);
      return { track: true, point: true };
    },
    pointsAround(position, distance) {
      const center = position || START;
      const radius = Number(distance);
      const max = Number.isFinite(radius) ? radius : 300;
      const out = [];
      for (const track of tracks) {
        for (const point of track.points) {
          const px = point.position ? point.position[0] : 0;
          const pz = point.position ? point.position[2] : 0;
          if (dist({ x: px, z: pz }, center) <= max) out.push(pointOut(point));
        }
      }
      return out;
    }
  };
}

module.exports = { createStore, START };
