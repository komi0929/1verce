const fs = require('fs');
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');
const profilesPart = content.split('export const MC_PROFILES: MCProfile[] = [')[1].split('export const INITIAL_BATTLES')[0];
const matches = [...profilesPart.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);

const battlesPart = content.split('export const INITIAL_BATTLES: Battle[] = ')[1];
const battles = JSON.parse(battlesPart.slice(0, battlesPart.lastIndexOf('];') + 1));

console.log('Total MC_PROFILES:', matches.length);
const under5 = [];
matches.forEach(name => {
  const count = battles.filter(b => b.mcA === name || b.mcB === name).length;
  if (count < 5) {
    under5.push({ name, count });
  } else {
    console.log(name, ':', count);
  }
});
console.log('=== UNDER 5 BATTLES IN MC_PROFILES ===');
console.log(JSON.stringify(under5, null, 2));
