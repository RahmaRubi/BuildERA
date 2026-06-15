import db from '../../../DB/models/index.js';

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseMm(val) {
  if (!val || String(val) === 'nan') return null;
  const m = String(val).match(/([\d.]+)\s*mm/i);
  return m ? parseFloat(m[1]) : null;
}

function parseWatts(val) {
  if (!val || String(val) === 'nan') return null;
  const m = String(val).match(/([\d.]+)\s*W/i);
  return m ? parseFloat(m[1]) : null;
}

function parseNumber(val) {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

// Handles both "DDR5-6000" and mobo cells like "DDR5-4800 | DDR5-8400 |" → max value
function extractMHz(speed) {
  const hits = [...String(speed || '').matchAll(/DDR\d[-\s](\d+)/gi)].map(m => parseInt(m[1]));
  return hits.length ? Math.max(...hits) : null;
}

function extractDDRType(speed) {
  const m = String(speed || '').match(/^(DDR\d)/i);
  return m ? m[1].toUpperCase() : null;
}

function norm(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Handles both "|"-separated and "</li>"-separated multi-value cells
function splitTags(cell) {
  if (!cell || String(cell) === 'nan') return [];
  const str = String(cell);
  const parts = str.includes('|') ? str.split('|') : str.split('</li>');
  return parts
    .map(p => p.replace(/<\/?li>/gi, '').trim())
    .filter(Boolean);
}

function makeIssue(severity, rule, componentNames, message, fix) {
  return { severity, rule, components: componentNames, message, fix };
}

// ── PSU connector helpers ─────────────────────────────────────────────────────

/**
 * Parse a GPU "External Power" spec into [{pinType, count}] entries.
 * e.g. "2 x PCIe 8-pin + 1 x PCIe 6-pin" → [['8-pin', 2], ['6-pin', 1]]
 */
function parseGpuConnectors(externalPower) {
  const val = String(externalPower || '').trim();
  if (!val || norm(val) === 'none' || norm(val) === 'nan') return [];

  return val.split(/\s*\+\s*/).flatMap(segment => {
    const m = segment.match(/(\d+)\s*x\s*pcie\s*(.+)/i);
    if (!m) return [];
    return [[m[2].trim().toLowerCase(), parseInt(m[1])]];
  });
}

/**
 * Count how many of a connector type a PSU has by matching a column name substring.
 */
function psuConnectorCount(psuSpecs, colSubstring) {
  const key = Object.keys(psuSpecs).find(k => k.toLowerCase().includes(colSubstring.toLowerCase()));
  if (!key) return 0;
  const n = parseInt(parseFloat(String(psuSpecs[key])));
  return isNaN(n) ? 0 : n;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getComponentSpecs(componentId) {
  const rows = await db.ComponentSpec.findAll({
    where: { component_id: componentId },
    include: [{ model: db.Spec, attributes: ['name'] }],
  });
  return Object.fromEntries(rows.map(r => [r.Spec.name, r.value]));
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const RULES = [
  {
    id: 'CPU_MOTHERBOARD_SOCKET',
    needs: ['CPU', 'Motherboard'],
    check(byType) {
      const cpu = byType['CPU'][0];
      const mb  = byType['Motherboard'][0];
      const cpuSocket = cpu.specs['Socket'];
      const mbSocket  = mb.specs['Socket / CPU'];
      if (!cpuSocket || !mbSocket) return null;
      if (norm(cpuSocket) !== norm(mbSocket))
        return makeIssue('error', this.id, [cpu.name, mb.name],
          `CPU socket (${cpuSocket}) does not match Motherboard socket (${mbSocket})`,
          `Use a motherboard with ${cpuSocket} socket, or choose a CPU that fits ${mbSocket}`
        );
      return null;
    },
  },
  {
    id: 'MEMORY_MOTHERBOARD_TYPE',
    needs: ['Memory', 'Motherboard'],
    check(byType) {
      const mb     = byType['Motherboard'][0];
      const mbType = mb.specs['Memory Type'];
      const issues = [];
      for (const ram of byType['Memory']) {
        const ramType = extractDDRType(ram.specs['Speed']);
        if (!ramType || !mbType) continue;
        if (norm(ramType) !== norm(mbType))
          issues.push(makeIssue('error', this.id, [ram.name, mb.name],
            `RAM type (${ramType}) is incompatible with motherboard memory type (${mbType})`,
            `Use ${mbType} memory modules, or choose a motherboard that supports ${ramType}`
          ));
      }
      return issues.length ? issues : null;
    },
  },
  {
    id: 'COOLER_CPU_SOCKET',
    needs: ['CPU Cooler', 'CPU'],
    check(byType) {
      const cpu       = byType['CPU'][0];
      const cpuSocket = cpu.specs['Socket'];
      if (!cpuSocket) return null;
      const issues = [];
      for (const cooler of byType['CPU Cooler']) {
        // Split on pipe, comma, slash, or plus (matches Python's re.split(r"[|,/+]", raw))
        const supported = String(cooler.specs['CPU Socket'] || '').split(/[|,/+]/).map(s => norm(s)).filter(Boolean);
        if (supported.length && !supported.includes(norm(cpuSocket)))
          issues.push(makeIssue('error', this.id, [cooler.name, cpu.name],
            `CPU Cooler does not support ${cpuSocket} socket (supports: ${cooler.specs['CPU Socket']})`,
            `Choose a cooler that lists ${cpuSocket} socket support`
          ));
      }
      return issues.length ? issues : null;
    },
  },
  {
    id: 'GPU_CASE_LENGTH',
    needs: ['Video Card', 'Case'],
    check(byType) {
      const pcCase      = byType['Case'][0];
      const caseMaxLen  = parseMm(pcCase.specs['Maximum Video Card Length']);
      if (!caseMaxLen) return null;
      const issues = [];
      for (const gpu of byType['Video Card']) {
        const gpuLen = parseMm(gpu.specs['Length']);
        if (!gpuLen) continue;
        if (gpuLen > caseMaxLen)
          issues.push(makeIssue('error', this.id, [gpu.name, pcCase.name],
            `GPU length (${gpuLen}mm) exceeds case maximum GPU clearance (${caseMaxLen}mm)`,
            `Choose a GPU shorter than ${caseMaxLen}mm, or a case with more GPU clearance`
          ));
      }
      return issues.length ? issues : null;
    },
  },
  {
    id: 'MOTHERBOARD_CASE_FORM_FACTOR',
    needs: ['Motherboard', 'Case'],
    check(byType) {
      const mb     = byType['Motherboard'][0];
      const pcCase = byType['Case'][0];
      const mbFF   = mb.specs['Form Factor'];
      const caseFF = pcCase.specs['Motherboard Form Factor'];
      if (!mbFF || !caseFF) return null;
      // Use splitTags to handle both "|" and "</li>" delimiters from CSV data
      let supported = splitTags(caseFF).map(s => norm(s));
      if (!supported.length) supported = caseFF.split(/[/,]/).map(s => norm(s)).filter(Boolean);
      if (supported.length && !supported.includes(norm(mbFF)))
        return makeIssue('error', this.id, [mb.name, pcCase.name],
          `Motherboard form factor (${mbFF}) is not supported by this case (supports: ${caseFF.trim()})`,
          `Choose a case that supports ${mbFF}`
        );
      return null;
    },
  },
  {
    id: 'PSU_WATTAGE',
    needs: ['Power Supply'],
    check(byType) {
      const psu      = byType['Power Supply'][0];
      const psuWatts = parseWatts(psu.specs['Wattage']);
      if (!psuWatts) return null;
      const cpuTDP       = parseWatts(byType['CPU']?.[0]?.specs['TDP']) || 0;
      const gpuTDP       = (byType['Video Card'] || []).reduce((s, g) => s + (parseWatts(g.specs['TDP']) || 0), 0);
      const overhead     = 100;
      const required     = cpuTDP + gpuTDP + overhead;
      const recommended  = (Math.ceil(required / 50) + 1) * 50;
      if (psuWatts < required)
        return makeIssue('error', this.id, [psu.name],
          `PSU (${psuWatts}W) is insufficient. Estimated draw: ~${required}W (CPU: ${cpuTDP}W + GPU: ${gpuTDP}W + system: ${overhead}W)`,
          `Upgrade to at least a ${recommended}W PSU`
        );
      if (psuWatts < required * 1.2)
        return makeIssue('warning', this.id, [psu.name],
          `PSU (${psuWatts}W) has less than 20% headroom above estimated draw (~${required}W)`,
          `A ${recommended}W PSU would give better headroom`
        );
      return null;
    },
  },
  {
    id: 'RAM_SPEED_MISMATCH',
    needs: ['Memory', 'Motherboard'],
    check(byType) {
      const mb       = byType['Motherboard'][0];
      const mbMaxMHz = extractMHz(mb.specs['Memory Speed']);
      if (!mbMaxMHz) return null;
      const issues = [];
      for (const ram of byType['Memory']) {
        const ramMHz = extractMHz(ram.specs['Speed']);
        if (!ramMHz || ramMHz <= mbMaxMHz) continue;
        issues.push(makeIssue('warning', this.id, [ram.name, mb.name],
          `RAM speed (${ram.specs['Speed']}) exceeds motherboard maximum (${mb.specs['Memory Speed']}). RAM will run at ${mbMaxMHz}MHz`,
          `Use ${extractDDRType(ram.specs['Speed'])}-${mbMaxMHz} RAM for best value`
        ));
      }
      return issues.length ? issues : null;
    },
  },
  {
    id: 'SINGLE_CHANNEL_RAM',
    needs: ['Memory'],
    check(byType) {
      if (byType['Memory'].length !== 1) return null;
      const ram     = byType['Memory'][0];
      const modules = String(ram.specs['Modules'] || '');
      if (modules.startsWith('1 x'))
        return makeIssue('warning', this.id, [ram.name],
          `Single-channel RAM detected (${modules}). This halves memory bandwidth`,
          `Add a matching stick to enable dual-channel mode`
        );
      return null;
    },
  },
  {
    id: 'PSU_GPU_CONNECTORS',
    needs: ['Power Supply', 'Video Card'],
    check(byType) {
      const psu     = byType['Power Supply'][0];
      const specs   = psu.specs;

      // PSU connector inventory
      const psu16vhpwr = psuConnectorCount(specs, 'PCIe 16-pin 12VHPWR');
      const psu12pin   = psuConnectorCount(specs, 'PCIe 12-pin Connectors');
      const psu8pin    = psuConnectorCount(specs, 'PCIe 8-pin Connectors');
      const psu6plus2  = psuConnectorCount(specs, 'PCIe 6+2-pin Connectors');
      const psu6pin    = psuConnectorCount(specs, 'PCIe 6-pin Connectors');

      // 6+2-pin cables satisfy either 8-pin or 6-pin GPU connectors
      const avail16 = psu16vhpwr;
      const avail12 = psu12pin;
      // shared pool — 6+2-pin consumed for 8-pin first, remainder covers 6-pin
      let pool6plus2 = psu6plus2;

      const issues = [];

      for (const gpu of byType['Video Card']) {
        const extPower = gpu.specs['External Power'] || '';
        if (!extPower || norm(extPower) === 'none' || norm(extPower) === 'nan') continue;

        const connectors = parseGpuConnectors(extPower);
        if (!connectors.length) continue;

        // Work with a per-GPU copy of the shared pool
        let remaining6plus2 = pool6plus2;
        const gpuIssues = [];

        for (const [pinType, count] of connectors) {
          if (pinType.includes('16')) {
            if (avail16 < count)
              gpuIssues.push(`${count}x PCIe 16-pin 12VHPWR (PSU has ${avail16})`);

          } else if (pinType.includes('12')) {
            if (avail12 < count)
              gpuIssues.push(`${count}x PCIe 12-pin (PSU has ${avail12})`);

          } else if (pinType.includes('8')) {
            const avail8 = psu8pin + remaining6plus2;
            if (avail8 < count) {
              gpuIssues.push(
                `${count}x PCIe 8-pin (PSU has ${psu8pin} dedicated + ${psu6plus2} 6+2-pin; short by ${count - avail8})`
              );
            } else {
              // Consume 6+2-pin connectors first to satisfy 8-pin, reducing what's left for 6-pin
              const use6p2 = Math.min(remaining6plus2, count);
              remaining6plus2 -= use6p2;
            }

          } else if (pinType.includes('6')) {
            const avail6 = psu6pin + remaining6plus2;
            if (avail6 < count)
              gpuIssues.push(
                `${count}x PCIe 6-pin (PSU has ${psu6pin} dedicated + ${remaining6plus2} remaining 6+2-pin; short by ${count - avail6})`
              );
          }
        }

        if (gpuIssues.length)
          issues.push(makeIssue('error', this.id, [gpu.name, psu.name],
            `PSU lacks required GPU power connectors for ${gpu.name}: needs ${gpuIssues.join(', ')}`,
            'Choose a PSU with the required PCIe power connectors, or use a connector adapter (check GPU manufacturer support)'
          ));
      }

      return issues.length ? issues : null;
    },
  },
];

// ── Exported functions ────────────────────────────────────────────────────────

export async function checkComponentList(components) {
  if (components.length === 0)
    return { isCompatible: true, errors: [], warnings: [], summary: { totalComponents: 0, estimatedWattage: 0, errorCount: 0, warningCount: 0 } };

  const byType = {};
  for (const comp of components) {
    if (!comp.specs) comp.specs = await getComponentSpecs(comp.id);
    if (!byType[comp.type]) byType[comp.type] = [];
    byType[comp.type].push(comp);
  }

  const allIssues = [];
  for (const rule of RULES) {
    if (!rule.needs.every(t => byType[t]?.length > 0)) continue;
    const result = rule.check(byType);
    if (result) allIssues.push(...(Array.isArray(result) ? result : [result]));
  }

  const errors   = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const cpuTDP   = parseWatts(byType['CPU']?.[0]?.specs['TDP']) || 0;
  const gpuTDP   = (byType['Video Card'] || []).reduce((s, g) => s + (parseWatts(g.specs['TDP']) || 0), 0);

  return {
    isCompatible: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalComponents: components.length,
      estimatedWattage: cpuTDP + gpuTDP + 100,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

export const checkCompatibility = async (req, res, next) => {
  const build = await db.Build.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!build) return next(new Error('Build not found', { cause: 404 }));

  const bcRows = await db.BuildComponent.findAll({
    where: { build_id: build.id },
    include: [{ model: db.Component, attributes: ['id', 'name', 'type'] }],
  });
  const components = bcRows.map(bc => bc.Component.get({ plain: true }));
  const compatibility = await checkComponentList(components);

  return res.status(200).json({ success: true, data: compatibility });
};
