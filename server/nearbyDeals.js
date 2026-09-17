const { getActiveMeasurements } = require('./activeMeasurements');
const { getActiveRepairs } = require('./activeRepairs');

const DEFAULT_RADIUS_KM = 10; // close enough to combine into one trip

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

// Groups deals from both the measurements and repairs lists whose addresses
// are within `radiusKm` of each other, so a manager can combine visits into
// one trip instead of driving out twice.
async function getNearbyDealGroups(radiusKm = DEFAULT_RADIUS_KM) {
  const [measurements, repairs] = await Promise.all([getActiveMeasurements(), getActiveRepairs()]);

  const points = [
    ...measurements.map((d) => ({ ...d, kind: 'замер' })),
    ...repairs.map((d) => ({ ...d, kind: 'ремонт' })),
  ].filter((d) => d.address?.lat && d.address?.lon);

  const parents = points.map((_, i) => i);
  const pairDistances = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const km = haversineKm(points[i].address, points[j].address);
      if (km <= radiusKm) {
        union(parents, i, j);
        pairDistances.push({ i, j, km });
      }
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

module.exports = { getNearbyDealGroups, haversineKm, DEFAULT_RADIUS_KM };
