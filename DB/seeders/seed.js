import db from '../models/index.js';

async function seedComponent({ name, type, brand, price, imageUrl = null, specs }) {
  const component = await db.Component.create({ name, type, brand, price, imageUrl });

  for (const [specName, specValue] of Object.entries(specs)) {
    const spec = await db.Spec.create({ name: specName, component_id: component.id });
    await db.ComponentSpec.create({ component_id: component.id, spec_id: spec.id, value: String(specValue) });
  }

  return component;
}

const components = [
  // ── CPUs ──────────────────────────────────────────────────────────────────
  {
    name: 'Intel Core i9-14900K', type: 'CPU', brand: 'Intel', price: 589,
    specs: { Socket: 'LGA1700', 'Core Count': '24', 'Performance Core Clock': '3.2 GHz', 'Boost Clock': '6.0 GHz', TDP: '125W' },
  },
  {
    name: 'Intel Core i7-14700K', type: 'CPU', brand: 'Intel', price: 409,
    specs: { Socket: 'LGA1700', 'Core Count': '20', 'Performance Core Clock': '3.4 GHz', 'Boost Clock': '5.6 GHz', TDP: '125W' },
  },
  {
    name: 'Intel Core i5-14600K', type: 'CPU', brand: 'Intel', price: 319,
    specs: { Socket: 'LGA1700', 'Core Count': '14', 'Performance Core Clock': '3.5 GHz', 'Boost Clock': '5.3 GHz', TDP: '125W' },
  },
  {
    name: 'AMD Ryzen 9 7950X', type: 'CPU', brand: 'AMD', price: 699,
    specs: { Socket: 'AM5', 'Core Count': '16', 'Performance Core Clock': '4.5 GHz', 'Boost Clock': '5.7 GHz', TDP: '170W' },
  },
  {
    name: 'AMD Ryzen 7 7700X', type: 'CPU', brand: 'AMD', price: 299,
    specs: { Socket: 'AM5', 'Core Count': '8', 'Performance Core Clock': '4.5 GHz', 'Boost Clock': '5.4 GHz', TDP: '105W' },
  },
  {
    name: 'AMD Ryzen 5 7600X', type: 'CPU', brand: 'AMD', price: 249,
    specs: { Socket: 'AM5', 'Core Count': '6', 'Performance Core Clock': '4.7 GHz', 'Boost Clock': '5.3 GHz', TDP: '105W' },
  },

  // ── Motherboards ──────────────────────────────────────────────────────────
  {
    name: 'ASUS ROG Maximus Z790 Hero', type: 'Motherboard', brand: 'ASUS', price: 629,
    specs: { 'Socket / CPU': 'LGA1700', 'Memory Type': 'DDR5', 'Form Factor': 'ATX', 'Memory Speed': 'DDR5-7600', 'Memory Slots': '4' },
  },
  {
    name: 'MSI MPG Z790 Carbon WiFi', type: 'Motherboard', brand: 'MSI', price: 399,
    specs: { 'Socket / CPU': 'LGA1700', 'Memory Type': 'DDR5', 'Form Factor': 'ATX', 'Memory Speed': 'DDR5-7200', 'Memory Slots': '4' },
  },
  {
    name: 'Gigabyte B760M DS3H DDR4', type: 'Motherboard', brand: 'Gigabyte', price: 119,
    specs: { 'Socket / CPU': 'LGA1700', 'Memory Type': 'DDR4', 'Form Factor': 'Micro ATX', 'Memory Speed': 'DDR4-5333', 'Memory Slots': '2' },
  },
  {
    name: 'ASUS ROG Crosshair X670E Extreme', type: 'Motherboard', brand: 'ASUS', price: 799,
    specs: { 'Socket / CPU': 'AM5', 'Memory Type': 'DDR5', 'Form Factor': 'ATX', 'Memory Speed': 'DDR5-6400', 'Memory Slots': '4' },
  },
  {
    name: 'MSI MAG X670E Tomahawk WiFi', type: 'Motherboard', brand: 'MSI', price: 299,
    specs: { 'Socket / CPU': 'AM5', 'Memory Type': 'DDR5', 'Form Factor': 'ATX', 'Memory Speed': 'DDR5-6400', 'Memory Slots': '4' },
  },
  {
    name: 'ASRock B650M Pro RS', type: 'Motherboard', brand: 'ASRock', price: 169,
    specs: { 'Socket / CPU': 'AM5', 'Memory Type': 'DDR5', 'Form Factor': 'Micro ATX', 'Memory Speed': 'DDR5-6400', 'Memory Slots': '4' },
  },

  // ── Memory ────────────────────────────────────────────────────────────────
  {
    name: 'Corsair Vengeance DDR5-6000 32GB', type: 'Memory', brand: 'Corsair', price: 129,
    specs: { Speed: 'DDR5-6000', Modules: '2 x 16GB', 'CAS Latency': '36', Voltage: '1.35V' },
  },
  {
    name: 'G.Skill Trident Z5 DDR5-7200 32GB', type: 'Memory', brand: 'G.Skill', price: 189,
    specs: { Speed: 'DDR5-7200', Modules: '2 x 16GB', 'CAS Latency': '34', Voltage: '1.4V' },
  },
  {
    name: 'Kingston Fury Beast DDR4-3200 16GB', type: 'Memory', brand: 'Kingston', price: 44,
    specs: { Speed: 'DDR4-3200', Modules: '2 x 8GB', 'CAS Latency': '16', Voltage: '1.35V' },
  },
  {
    name: 'Corsair Vengeance DDR4-3600 32GB', type: 'Memory', brand: 'Corsair', price: 79,
    specs: { Speed: 'DDR4-3600', Modules: '2 x 16GB', 'CAS Latency': '18', Voltage: '1.35V' },
  },
  {
    name: 'G.Skill Ripjaws V DDR4-3200 8GB', type: 'Memory', brand: 'G.Skill', price: 22,
    specs: { Speed: 'DDR4-3200', Modules: '1 x 8GB', 'CAS Latency': '16', Voltage: '1.35V' },
  },

  // ── Video Cards (GPU) ─────────────────────────────────────────────────────
  {
    name: 'NVIDIA GeForce RTX 4090', type: 'Video Card', brand: 'NVIDIA', price: 1599,
    specs: { Chipset: 'NVIDIA GeForce RTX 4090', Memory: '24GB', Length: '336mm', TDP: '450W', 'Memory Type': 'GDDR6X' },
  },
  {
    name: 'NVIDIA GeForce RTX 4080 Super', type: 'Video Card', brand: 'NVIDIA', price: 999,
    specs: { Chipset: 'NVIDIA GeForce RTX 4080 Super', Memory: '16GB', Length: '348mm', TDP: '320W', 'Memory Type': 'GDDR6X' },
  },
  {
    name: 'NVIDIA GeForce RTX 4070 Ti Super', type: 'Video Card', brand: 'NVIDIA', price: 799,
    specs: { Chipset: 'NVIDIA GeForce RTX 4070 Ti Super', Memory: '16GB', Length: '285mm', TDP: '285W', 'Memory Type': 'GDDR6X' },
  },
  {
    name: 'NVIDIA GeForce RTX 4070', type: 'Video Card', brand: 'NVIDIA', price: 599,
    specs: { Chipset: 'NVIDIA GeForce RTX 4070', Memory: '12GB', Length: '240mm', TDP: '200W', 'Memory Type': 'GDDR6X' },
  },
  {
    name: 'AMD Radeon RX 7900 XTX', type: 'Video Card', brand: 'AMD', price: 949,
    specs: { Chipset: 'AMD Radeon RX 7900 XTX', Memory: '24GB', Length: '287mm', TDP: '355W', 'Memory Type': 'GDDR6' },
  },
  {
    name: 'AMD Radeon RX 7800 XT', type: 'Video Card', brand: 'AMD', price: 499,
    specs: { Chipset: 'AMD Radeon RX 7800 XT', Memory: '16GB', Length: '267mm', TDP: '263W', 'Memory Type': 'GDDR6' },
  },
  {
    name: 'AMD Radeon RX 7600', type: 'Video Card', brand: 'AMD', price: 269,
    specs: { Chipset: 'AMD Radeon RX 7600', Memory: '8GB', Length: '215mm', TDP: '165W', 'Memory Type': 'GDDR6' },
  },

  // ── Cases ─────────────────────────────────────────────────────────────────
  {
    name: 'Fractal Design Torrent', type: 'Case', brand: 'Fractal Design', price: 189,
    specs: { 'Maximum Video Card Length': '467mm', 'Motherboard Form Factor': 'ATX/Micro ATX/Mini ITX', 'Drive Bays': '2x 3.5", 4x 2.5"', 'Side Panel': 'Tempered Glass' },
  },
  {
    name: 'Lian Li PC-O11 Dynamic EVO', type: 'Case', brand: 'Lian Li', price: 169,
    specs: { 'Maximum Video Card Length': '420mm', 'Motherboard Form Factor': 'ATX/Micro ATX/Mini ITX', 'Drive Bays': '2x 3.5", 4x 2.5"', 'Side Panel': 'Tempered Glass' },
  },
  {
    name: 'NZXT H7 Flow', type: 'Case', brand: 'NZXT', price: 149,
    specs: { 'Maximum Video Card Length': '400mm', 'Motherboard Form Factor': 'ATX/Micro ATX/Mini ITX', 'Drive Bays': '2x 3.5", 4x 2.5"', 'Side Panel': 'Tempered Glass' },
  },
  {
    name: 'Fractal Design Pop Mini Air', type: 'Case', brand: 'Fractal Design', price: 89,
    specs: { 'Maximum Video Card Length': '360mm', 'Motherboard Form Factor': 'Micro ATX/Mini ITX', 'Drive Bays': '2x 3.5", 2x 2.5"', 'Side Panel': 'Tempered Glass' },
  },

  // ── Power Supplies ────────────────────────────────────────────────────────
  {
    name: 'Corsair RM1000x', type: 'Power Supply', brand: 'Corsair', price: 189,
    specs: { Wattage: '1000W', Modular: 'Full', Efficiency: '80+ Gold', 'Fan Size': '135mm' },
  },
  {
    name: 'Seasonic Focus GX-850', type: 'Power Supply', brand: 'Seasonic', price: 149,
    specs: { Wattage: '850W', Modular: 'Full', Efficiency: '80+ Gold', 'Fan Size': '120mm' },
  },
  {
    name: 'Seasonic Focus GX-750', type: 'Power Supply', brand: 'Seasonic', price: 129,
    specs: { Wattage: '750W', Modular: 'Full', Efficiency: '80+ Gold', 'Fan Size': '120mm' },
  },
  {
    name: 'be quiet! Straight Power 11 650W', type: 'Power Supply', brand: 'be quiet!', price: 109,
    specs: { Wattage: '650W', Modular: 'Full', Efficiency: '80+ Gold', 'Fan Size': '135mm' },
  },
  {
    name: 'EVGA SuperNOVA 550 G6', type: 'Power Supply', brand: 'EVGA', price: 89,
    specs: { Wattage: '550W', Modular: 'Full', Efficiency: '80+ Gold', 'Fan Size': '130mm' },
  },

  // ── CPU Coolers ───────────────────────────────────────────────────────────
  {
    name: 'Noctua NH-D15', type: 'CPU Cooler', brand: 'Noctua', price: 99,
    specs: { 'CPU Socket': 'LGA1700, LGA1200, LGA1151, AM5, AM4', 'Fan RPM': '1500 RPM', 'Noise Level': '24.6 dB', Height: '165mm' },
  },
  {
    name: 'be quiet! Dark Rock Pro 4', type: 'CPU Cooler', brand: 'be quiet!', price: 89,
    specs: { 'CPU Socket': 'LGA1700, LGA1200, LGA1151, AM5, AM4', 'Fan RPM': '1500 RPM', 'Noise Level': '24.3 dB', Height: '163mm' },
  },
  {
    name: 'Corsair iCUE H150i Elite Capellix', type: 'CPU Cooler', brand: 'Corsair', price: 179,
    specs: { 'CPU Socket': 'LGA1700, LGA1200, LGA1151, AM5, AM4', 'Fan RPM': '2400 RPM', 'Noise Level': '37 dB', Height: '27mm' },
  },
  {
    name: 'AMD Wraith Prism Cooler', type: 'CPU Cooler', brand: 'AMD', price: 35,
    specs: { 'CPU Socket': 'AM5, AM4', 'Fan RPM': '2800 RPM', 'Noise Level': '39 dB', Height: '74mm' },
  },
  {
    name: 'DeepCool AK620', type: 'CPU Cooler', brand: 'DeepCool', price: 64,
    specs: { 'CPU Socket': 'LGA1700, LGA1200, LGA1151, AM5, AM4', 'Fan RPM': '1850 RPM', 'Noise Level': '28 dB', Height: '160mm' },
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    name: 'Samsung 990 Pro 1TB NVMe SSD', type: 'Storage', brand: 'Samsung', price: 109,
    specs: { Capacity: '1TB', Interface: 'M.2 PCIe 4.0', 'Read Speed': '7450 MB/s', 'Write Speed': '6900 MB/s', Form: 'M.2-2280' },
  },
  {
    name: 'WD Black SN850X 2TB NVMe SSD', type: 'Storage', brand: 'Western Digital', price: 179,
    specs: { Capacity: '2TB', Interface: 'M.2 PCIe 4.0', 'Read Speed': '7300 MB/s', 'Write Speed': '6600 MB/s', Form: 'M.2-2280' },
  },
  {
    name: 'Seagate Barracuda 2TB HDD', type: 'Storage', brand: 'Seagate', price: 49,
    specs: { Capacity: '2TB', Interface: 'SATA 6 Gb/s', 'RPM': '7200', 'Cache': '256MB', Form: '3.5"' },
  },
];

async function seed() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected.');

    for (const data of components) {
      await seedComponent(data);
      console.log(`  ✓ ${data.name}`);
    }

    console.log(`\nSeeded ${components.length} components successfully.`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await db.sequelize.close();
  }
}

seed();
