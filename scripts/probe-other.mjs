import { PDFDocument, PDFName, PDFRef, PDFRawStream, PDFArray } from 'pdf-lib';
import fs from 'node:fs';
import zlib from 'node:zlib';

const paths = [
  'public/documents/contract-agreement.pdf',
  'public/documents/Credit_Card_Authorization_Form.pdf',
];

for (const path of paths) {
  if (!fs.existsSync(path)) { console.log(path, '— missing'); continue; }
  const doc = await PDFDocument.load(fs.readFileSync(path));
  const page0 = doc.getPages()[0];
  const c = page0.node.get(PDFName.of('Contents'));
  const refs = [];
  if (c instanceof PDFRef) refs.push(c);
  else if (c instanceof PDFArray) for (let i=0;i<c.size();i++){ const el=c.get(i); if(el instanceof PDFRef) refs.push(el); }
  for (const ref of refs) {
    const obj = doc.context.lookup(ref);
    if (!(obj instanceof PDFRawStream)) continue;
    const filter = obj.dict.get(PDFName.of('Filter'));
    let names = [];
    if (filter instanceof PDFArray) for (let i=0;i<filter.size();i++) names.push(filter.get(i).toString());
    else if (filter) names.push(filter.toString());
    console.log(path, '-> filters:', names);
  }
}
