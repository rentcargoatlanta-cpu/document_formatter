import { PDFDocument, PDFName, PDFRef, PDFRawStream, PDFArray } from 'pdf-lib';
import fs from 'node:fs';
import zlib from 'node:zlib';

const bytes = fs.readFileSync('public/documents/Credit_Card_Authorization_Form.pdf');
const doc = await PDFDocument.load(bytes);
const pages = doc.getPages();
console.log('num pages:', pages.length);

function applyFilters(data, filter) {
  if (!filter) return data;
  const names = [];
  if (filter instanceof PDFArray) {
    for (let i = 0; i < filter.size(); i++) names.push(filter.get(i).toString());
  } else {
    names.push(filter.toString());
  }
  console.log('  filters:', names);
  for (const n of names) {
    if (n === '/FlateDecode') data = zlib.inflateSync(data);
    else if (n === '/ASCII85Decode') {
      // strip whitespace, trim ~> terminator
      let s = new TextDecoder('latin1').decode(data).replace(/\s+/g, '');
      if (s.endsWith('~>')) s = s.slice(0, -2);
      const out = [];
      let i = 0;
      while (i < s.length) {
        if (s[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
        const chunk = s.slice(i, i + 5);
        i += 5;
        const pad = 5 - chunk.length;
        const padded = chunk + 'uuuuu'.slice(0, pad);
        let num = 0;
        for (let k = 0; k < 5; k++) num = num * 85 + (padded.charCodeAt(k) - 33);
        const b = [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff];
        for (let k = 0; k < 4 - pad; k++) out.push(b[k]);
      }
      data = new Uint8Array(out);
    } else if (n === '/ASCIIHexDecode') {
      let s = new TextDecoder('latin1').decode(data).replace(/\s+/g, '');
      if (s.endsWith('>')) s = s.slice(0, -1);
      if (s.length % 2) s += '0';
      const out = new Uint8Array(s.length / 2);
      for (let k = 0; k < out.length; k++) out[k] = parseInt(s.substr(k*2, 2), 16);
      data = out;
    } else {
      console.log('  unknown filter:', n);
    }
  }
  return data;
}

for (let p = 0; p < pages.length; p++) {
  const page = pages[p];
  const contentsEntry = page.node.get(PDFName.of('Contents'));
  if (!contentsEntry) { console.log('page', p, 'no contents'); continue; }

  const refs = [];
  if (contentsEntry instanceof PDFRef) refs.push(contentsEntry);
  else if (contentsEntry instanceof PDFArray) {
    for (let i = 0; i < contentsEntry.size(); i++) {
      const el = contentsEntry.get(i);
      if (el instanceof PDFRef) refs.push(el);
    }
  }

  let all = '';
  for (const ref of refs) {
    const obj = doc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;
    const filter = obj.dict.get(PDFName.of('Filter'));
    let data = applyFilters(obj.contents, filter);
    all += new TextDecoder('latin1').decode(data);
  }

  console.log('page', p, 'decoded stream length:', all.length);

  const direct = [...all.matchAll(/\[\[(\w+)\]\]/g)].map(m => m[1]);
  console.log('direct [[key]] matches:', direct);

  const stringRe = /\(((?:\\.|[^\\)])*)\)/g;
  const pieces = [...all.matchAll(stringRe)].map(m => m[1]);
  const joined = pieces.join('');
  const fuzzy = [...joined.matchAll(/\[\[(\w+)\]\]/g)].map(m => m[1]);
  console.log('fuzzy joined-text matches:', fuzzy);

  console.log('--- first 1200 chars of decoded content ---');
  console.log(all.slice(0, 1200));
}

const form = doc.getForm();
const fields = form.getFields();
console.log('AcroForm fields:', fields.map(f => ({ name: f.getName(), type: f.constructor.name })));
