
// Temporary script to analyze heapsnapshot for JSArrayBufferData leaks.
// Parses Chrome .heapsnapshot JSON: finds JSArrayBufferData nodes, aggregates
// retained sizes by retainer (edges pointing to those nodes), outputs top retainers.

const fs = require('fs');
const path = require('path');

const NODE_FIELDS = ['type', 'name', 'id', 'self_size', 'edge_count', 'detachedness'];
const NODE_STRIDE = NODE_FIELDS.length;
const EDGE_STRIDE = 3; // type, name_or_index, to_node

function getString(strings, idx) {
  if (idx == null || idx < 0 || idx >= strings.length) return undefined;
  return strings[idx];
}

function analyze(snapshotPath) {
  console.error('Loading', snapshotPath, '...');
  const raw = fs.readFileSync(snapshotPath, 'utf8');
  console.error('Parsing JSON...');
  const data = JSON.parse(raw);

  const meta = data.snapshot?.meta;
  const strings = data.strings || [];
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const nodeCount = meta?.node_count ?? Math.floor(nodes.length / NODE_STRIDE);
  const edgeCount = meta?.edge_count ?? Math.floor(edges.length / EDGE_STRIDE);

  // Prefer "system / JSArrayBufferData" or "JSArrayBufferData", then "ArrayBuffer"
  const sysIdx = strings.indexOf('system / JSArrayBufferData');
  const nameIdx = sysIdx >= 0 ? sysIdx : strings.indexOf('JSArrayBufferData');
  const subIdx = nameIdx >= 0 ? nameIdx : strings.findIndex(s => typeof s === 'string' && s.includes('JSArrayBufferData'));
  const abIdx = strings.findIndex(s => typeof s === 'string' && s === 'ArrayBuffer');
  const targetNameIdx = nameIdx >= 0 ? nameIdx : (subIdx >= 0 ? subIdx : abIdx);
  const targetLabel = (nameIdx >= 0 || subIdx >= 0) ? (strings[targetNameIdx] || 'JSArrayBufferData') : 'ArrayBuffer';
  if (targetNameIdx === -1) {
    console.error('No JSArrayBufferData or ArrayBuffer in strings. Sample:', strings.filter(s => /buffer|array|Buffer/i.test(String(s))).slice(0, 20));
    process.exit(1);
  }
  console.error('Target name string:', JSON.stringify(targetLabel), 'at index', targetNameIdx);

  // 1) Find all JSArrayBufferData node indices and their self_size
  const abNodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const name = nodes[i * NODE_STRIDE + 1];
    if (name !== targetNameIdx) continue;
    const selfSize = nodes[i * NODE_STRIDE + 3] | 0;
    abNodes.push({ nodeIndex: i, selfSize });
  }

  const totalABSize = abNodes.reduce((s, n) => s + n.selfSize, 0);
  console.error('JSArrayBufferData nodes:', abNodes.length, 'total self_size:', (totalABSize / 1024 / 1024).toFixed(2), 'MB');

  const setAB = new Set(abNodes.map(n => n.nodeIndex));

  // 2) Build edge start per node (edges are stored as: all edges from node 0, then node 1, ...)
  const edgeStart = [];
  let acc = 0;
  for (let i = 0; i < nodeCount; i++) {
    edgeStart.push(acc);
    acc += nodes[i * NODE_STRIDE + 4] | 0; // edge_count
  }

  // 3) For each edge: if to_node is a JSArrayBufferData, the from_node is a retainer.
  //    from_node is inferred by which node's edge range we're in.
  const byRetainer = new Map(); // retainerKey -> { name, type, count, totalSize }

  let edgeOffset = 0;
  for (let fromNode = 0; fromNode < nodeCount; fromNode++) {
    const nEdges = nodes[fromNode * NODE_STRIDE + 4] | 0;
    for (let k = 0; k < nEdges; k++) {
      const toNode = edges[edgeOffset * EDGE_STRIDE + 2] | 0;
      if (setAB.has(toNode)) {
        const ab = abNodes.find(n => n.nodeIndex === toNode);
        const size = ab ? ab.selfSize : 0;
        const rName = getString(strings, nodes[fromNode * NODE_STRIDE + 1]);
        const rType = (meta?.node_types?.[0] || [])[nodes[fromNode * NODE_STRIDE + 0]];
        const key = `${rType || '?'}\t${rName ?? '(no name)'}`;
        let r = byRetainer.get(key);
        if (!r) {
          r = { name: rName, type: rType, count: 0, totalSize: 0 };
          byRetainer.set(key, r);
        }
        r.count += 1;
        r.totalSize += size;
      }
      edgeOffset += 1;
    }
  }

  // 4) Sort by totalSize desc, take top 30
  const sorted = [...byRetainer.entries()]
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.totalSize - a.totalSize)
    .slice(0, 30);

  console.log('\n--- Top retainers of ' + targetLabel + ' (by retained self_size) ---\n');
  sorted.forEach((r, i) => {
    const mb = (r.totalSize / 1024 / 1024).toFixed(2);
    console.log(`${i + 1}. [${r.type}] ${r.name ?? '(no name)'}\tcount=${r.count}\tsize=${mb} MB`);
  });
  console.log('\n--- Total ' + targetLabel + ' self_size:', (totalABSize / 1024 / 1024).toFixed(2), 'MB ---');

  // Extra: top nodes by self_size with buffer/array/typed/image in name (likely leak candidates)
  const bufLike = /ArrayBuffer|JSArrayBuffer|Uint8|Uint16|Uint32|Int8|Float32|Float64|ImageData|blob|pixel|canvas|OffscreenCanvas|bitmap/i;
  const bySize = [];
  for (let i = 0; i < nodeCount; i++) {
    const name = getString(strings, nodes[i * NODE_STRIDE + 1]);
    const selfSize = nodes[i * NODE_STRIDE + 3] | 0;
    if (selfSize > 0 && name && bufLike.test(String(name))) bySize.push({ name, selfSize, type: (meta?.node_types?.[0] || [])[nodes[i * NODE_STRIDE + 0]] });
  }
  bySize.sort((a, b) => b.selfSize - a.selfSize);
  console.log('\n--- Top buffer/typedarray/image-like nodes by self_size ---\n');
  bySize.slice(0, 25).forEach((n, i) => {
    const mb = (n.selfSize / 1024 / 1024).toFixed(2);
    console.log(`${i + 1}. [${n.type}] ${n.name}\tself_size=${mb} MB`);
  });

  return { abNodes: abNodes.length, totalABSize, byRetainer: sorted };
}

const p = process.argv[2] || path.join(__dirname, '..', 'heapsnapshots', 'Heap-20260124T173433.heapsnapshot');
if (!fs.existsSync(p)) {
  console.error('File not found:', p);
  process.exit(1);
}
analyze(p);

// run with: node --max-old-space-size=4096 scripts/analyze_heapsnapshot_arraybuffer.js heapsnapshots/Heap-20260124T173433.heapsnapshot