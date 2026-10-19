import assert from 'node:assert/strict';
import fs from 'node:fs';
import {orientSheetTexture} from '../studio-src/sheet-texture.js';
import {generateMahabatNative} from '../engine/registry.js';

let checked=0;
for(const code of ['EVC11001','STE']){
  const data=generateMahabatNative(code),before=JSON.stringify(data);
  for(const side of ['outside','inside'])for(const kind of ['artwork','foil','uv']){
    const canvasTexture={flipY:true,channel:3,colorSpace:kind==='artwork'?'srgb':'linear'};
    assert.equal(orientSheetTexture(canvasTexture,data),canvasTexture);
    assert.equal(canvasTexture.flipY,false,'Top-down native sheet coordinates must not vertically invert canvas textures');
    const matrix=data.materials[side].values.sheetTexMatrix_Uni,width=data.drawings[0].objRectWidth,height=data.drawings[0].objRectHeight;
    for(const panel of data.mahabaGeometry[0].panels){
      for(const [pointX,pointY] of panel.poly){
        const textureU=matrix[0]*pointX+matrix[1]*pointY+matrix[3],textureV=matrix[4]*pointX+matrix[5]*pointY+matrix[7];
        const canvasX=textureU*width,canvasY=(canvasTexture.flipY?1-textureV:textureV)*height;
        assert.ok(Math.abs(canvasX-(side==='inside'?width-pointX:pointX))<1e-7);
        assert.ok(Math.abs(canvasY-pointY)<1e-7,'The 2D drawing and 3D material must address the same sheet row');checked++;
      }
    }
  }
  assert.equal(JSON.stringify(data),before,'Registration must never mutate geometry, native UV matrices, or project transforms');
}
for(const source of [undefined,'legacy-native']){
  const texture={flipY:true,channel:3};orientSheetTexture(texture,{source});assert.deepEqual(texture,{flipY:true,channel:3},'Keep the existing upload convention for non-Mahabat native assets');
}
const source=fs.readFileSync(new URL('../studio-src/mahabat-shared-studio.js',import.meta.url),'utf8');
assert.equal((source.match(/new THREE\.CanvasTexture\(/g)||[]).length,2);
assert.equal((source.match(/orientSheetTexture\(new THREE\.CanvasTexture\(/g)||[]).length,2,'Apply the same orientation to artwork, foil and UV textures');
console.log(JSON.stringify({ok:true,templates:2,sides:2,layers:3,checked,frozenGeometry:true,legacyPreserved:true}));
