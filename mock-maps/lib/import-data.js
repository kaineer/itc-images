'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function normalizeAddress(address) {
  if (!address) return '';
  return String(address)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,.]/g, '')
    .replace(/\bкорпус\b/g, 'корп')
    .replace(/\bстроение\b/g, 'стр')
    .replace(/\bдом\b/g, 'д')
    .replace(/\bулица\b/g, 'ул')
    .replace(/\bпроспект\b/g, 'пр')
    .replace(/\bпр-т\b/g, 'пр')
    .replace(/\bбульвар\b/g, 'б-р')
    .replace(/\bпереулок\b/g, 'пер')
    .replace(/[^\w\sа-яё\-/]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hydrateBuilding(raw) {
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map((n) => ({ x: Number(n.x), z: Number(n.z) }))
    : [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let sx = 0;
  let sz = 0;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minZ = Math.min(minZ, node.z);
    maxZ = Math.max(maxZ, node.z);
    sx += node.x;
    sz += node.z;
  }
  const count = nodes.length || 1;
  return {
    id: String(raw.id),
    address: raw.address || null,
    height: Number(raw.height) || 0,
    nodes,
    minX: Number.isFinite(minX) ? minX : 0,
    maxX: Number.isFinite(maxX) ? maxX : 0,
    minZ: Number.isFinite(minZ) ? minZ : 0,
    maxZ: Number.isFinite(maxZ) ? maxZ : 0,
    cx: sx / count,
    cz: sz / count
  };
}

function loadBuildings() {
  const filePath = path.join(DATA_DIR, 'buildings.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const list = Array.isArray(data.buildings) ? data.buildings : [];
  return list
    .filter((b) => b && Array.isArray(b.nodes) && b.nodes.length)
    .map(hydrateBuilding);
}

function loadStart(fallback) {
  const filePath = path.join(DATA_DIR, 'itc.json');
  if (!fs.existsSync(filePath)) return fallback;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const center = data.center || data;
  if (center && Number.isFinite(Number(center.x)) && Number.isFinite(Number(center.z))) {
    return { x: Number(center.x), z: Number(center.z) };
  }
  return fallback;
}

function aabbHitsCircle(building, x, z, radius) {
  const nx = Math.max(building.minX, Math.min(x, building.maxX));
  const nz = Math.max(building.minZ, Math.min(z, building.maxZ));
  return Math.hypot(x - nx, z - nz) <= radius;
}

function buildingInRadius(building, x, z, radius) {
  if (!aabbHitsCircle(building, x, z, radius)) return false;
  return building.nodes.some((node) => Math.hypot(node.x - x, node.z - z) <= radius);
}

module.exports = {
  DATA_DIR,
  normalizeAddress,
  loadBuildings,
  loadStart,
  buildingInRadius
};
