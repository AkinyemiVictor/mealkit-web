import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.join(process.cwd(), 'src', 'data', 'products.js');
const src = fs.readFileSync(dataPath, 'utf8');

function extractProducts(text){
  const marker = 'export const products';
  const idx = text.indexOf(marker);
  if(idx === -1) throw new Error('products export not found');
  let i = text.indexOf('{', idx);
  let depth=0, inStr=false, esc=false, end=-1;
  for(let j=i;j<text.length;j++){
    const ch=text[j];
    if(inStr){
      if(esc) esc=false; else if(ch==='\\\\') esc=true; else if(ch==='"') inStr=false;
      continue;
    }
    if(ch==='"'){ inStr=true; continue; }
    if(ch==='{') depth++;
    if(ch==='}') depth--;
    if(depth===0){ end=j; break; }
  }
  const jsonText = text.slice(i,end+1);
  // Try to coerce to JSON
  const relaxed = jsonText.replace(/,\s*([}\]])/g,'$1');
  // eslint-disable-next-line no-new-func
  return Function('return ('+relaxed+')')();
}

const products = extractProducts(src);

let total=0; let dupIds=[]; let issues=[];
for(const [cat, items] of Object.entries(products)){
  const ids=new Set();
  const names=new Set();
  for(const p of items){
    total++;
    if(ids.has(p.id)) dupIds.push({cat, id:p.id});
    ids.add(p.id);
    const nameKey=(p.name||'').toLowerCase();
    if(names.has(nameKey)) issues.push({type:'dup-name', cat, name:p.name});
    names.add(nameKey);
    if(Array.isArray(p.variations)){
      const seenVar = new Set();
      for(const v of p.variations){
        const key=(v.variationId||v.size||'').toLowerCase();
        if(seenVar.has(key)) issues.push({type:'dup-variation',cat,name:p.name,key});
        seenVar.add(key);
      }
    }
  }
}

console.log('Total products:', total);
console.log('Duplicate IDs:', dupIds.length);
if(dupIds.length){ console.log(dupIds.slice(0,10)); }
console.log('Other issues:', issues.length);
if(issues.length){ console.log(issues.slice(0,10)); }

