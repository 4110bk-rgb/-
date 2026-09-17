const { getActiveMeasurements } = require('./activeMeasurements');
const { getActiveRepairs } = require('./activeRepairs');

const RADII_KM = [10, 30];

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Union-Find so a chain of nearby points (A-B close, B-C close) ends up in
// one group even if A and C themselves are a bit further apart than the
// radius — that's still one reasonable route.
function union(parents, a, b) {
  const findRoot = (x) => (parents[x] === x ? x : (parents[x] = findRoot(parents[x])));
  const rootA = findRoot(a);
  const rootB = findRoot(b);
  if (rootA !== rootB) parents[rootA] = rootB;
}

async function getGeolocatedDeals() {
  const [measurements, repairs] = await Promise.all([getActiveMeasurements(), getActiveRepairs()]);
  return [
    ...measurements.map((d) => ({ ...d, kind: 'замер' })),
    ...repairs.map((d) => ({ ...d, kind: 'ремонт' })),
  ].filter((d) => d.address?.lat && d.address?.lon);
}

// Clusters `points` (deals with a resolved address) into groups whose
// members are all within `radiusKm` of at least one other member — so a
// manager can combine them into one trip instead of driving out twice.
function clusterByRadius(points, radiusKm) {
  const parents = points.map((_, i) => i);

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (haversineKm(points[i].address, points[j].address) <= radiusKm) union(parents, i, j);
    }
  }

  const findRoot = (x) => (parents[x] === x ? x : (parents[x] = findRoot(parents[x])));
  const groups = new Map();
  for (let i = 0; i < points.length; i++) {
    const root = findRoot(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(points[i]);
  }

  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((deals) => {
      let maxSpreadKm = 0;
      for (let i = 0; i < deals.length; i++) {
        for (let j = i + 1; j < deals.length; j++) {
          maxSpreadKm = Math.max(maxSpreadKm, haversineKm(deals[i].address, deals[j].address));
        }
      }
      return {
        maxSpreadKm: Math.round(maxSpreadKm * 10) / 10,
        deals: deals.map(({ dealId, title, kind, url, manager, address, waitingDays }) => ({
          dealId, title, kind, url, manager, address, waitingDays,
        })),
      };
    })
    .sort((a, b) => b.deals.length - a.deals.length);
}

// Groups deals from both the measurements and repairs lists at one radius.
async function getNearbyDealGroups(radiusKm = RADII_KM[0]) {
  const points = await getGeolocatedDeals();
  return clusterByRadius(points, radiusKm);
}

// Same, but at every radius in `radii` at once (default [10, 30]) — a
// wider radius naturally produces bigger/more groups, so callers usually
// want to show the tight (10km) groups as "definitely combine" and the
// wider (30km) ones as "worth considering", not just one cutoff.
async function getNearbyDealGroupsByRadius(radii = RADII_KM) {
  const points = await getGeolocatedDeals();
  return radii.map((radiusKm) => ({ radiusKm, groups: clusterByRadius(points, radiusKm) }));
}

module.exports = { getNearbyDealGroups, getNearbyDealGroupsByRadius, haversineKm, RADII_KM };
