import db from '../../../DB/models/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getComponentSpecs(componentId) {
  const rows = await db.ComponentSpec.findAll({
    where: { component_id: componentId },
    include: [{ model: db.Spec, attributes: ['name'] }],
  });
  return Object.fromEntries(rows.map(r => [r.Spec.name, r.value]));
}

function parseNumber(val) {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function extractDDRType(speed) {
  const match = String(speed || '').match(/^(DDR\d)/i);
  return match ? match[1].toUpperCase() : null;
}

function extractMHz(speed) {
  const match = String(speed || '').match(/DDR\d-(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function norm(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeIssue(severity, rule, componentNames, message, fix) {
  return { severity, rule, components: componentNames, message, fix };
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
      const mb = byType['Motherboard'][0];
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
        const supported = String(cooler.specs['CPU Socket'] || '').split(/[,/+]/).map(s => norm(s));
        if (!supported.includes(norm(cpuSocket)))
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
      const pcCase = byType['Case'][0];
      const caseMaxLength = parseNumber(pcCase.specs['Maximum Video Card Length']);
      if (!caseMaxLength) return null;
      const issues = [];
      for (const gpu of byType['Video Card']) {
        const gpuLength = parseNumber(gpu.specs['Length']);
        if (!gpuLength) continue;
        if (gpuLength > caseMaxLength)
          issues.push(makeIssue('error', this.id, [gpu.name, pcCase.name],
            `GPU length (${gpuLength}mm) exceeds case maximum GPU clearance (${caseMaxLength}mm)`,
            `Choose a GPU shorter than ${caseMaxLength}mm, or a case with more GPU clearance`
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
      const supported = caseFF.split(/[/,]/).map(s => norm(s));
      if (!supported.includes(norm(mbFF)))
        return makeIssue('error', this.id, [mb.name, pcCase.name],
          `Motherboard form factor (${mbFF}) is not supported by this case (supports: ${caseFF})`,
          `Choose a case that supports ${mbFF}`
        );
      return null;
    },
  },
  {
    id: 'PSU_WATTAGE',
    needs: ['Power Supply'],
    check(byType) {
      const psu = byType['Power Supply'][0];
      const psuWatts = parseNumber(psu.specs['Wattage']);
      if (!psuWatts) return null;
      const cpuTDP = parseNumber(byType['CPU']?.[0]?.specs['TDP']) || 0;
      const gpuTDP = (byType['Video Card'] || []).reduce((sum, g) => sum + (parseNumber(g.specs['TDP']) || 0), 0);
      const systemOverhead = 100;
      const required    = cpuTDP + gpuTDP + systemOverhead;
      const recommended = Math.ceil(required / 50) * 50 + 50;
      if (psuWatts < required)
        return makeIssue('error', this.id, [psu.name],
          `PSU (${psuWatts}W) is insufficient. Estimated draw: ~${required}W (CPU: ${cpuTDP}W + GPU: ${gpuTDP}W + system: ${systemOverhead}W)`,
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
      const mb = byType['Motherboard'][0];
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
  const cpuTDP   = parseNumber(byType['CPU']?.[0]?.specs['TDP']) || 0;
  const gpuTDP   = (byType['Video Card'] || []).reduce((sum, g) => sum + (parseNumber(g.specs['TDP']) || 0), 0);

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
