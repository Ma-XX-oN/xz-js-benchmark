import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function loadModule() {
  const factory = (await import('../prototype/liblzma-wasm/liblzma.cjs')).default;
  const wasmBinary = fs.readFileSync(new URL('../prototype/liblzma-wasm/liblzma.wasm', import.meta.url));
  return factory({ wasmBinary });
}

function readPointer(mod, address) {
  return mod.HEAPU32[address >>> 2];
}

test('upstream liblzma WASM streams one native-compatible XZ and decodes exact bytes', async () => {
  const mod = await loadModule();
  assert.equal(typeof mod._dc_xz_decode, 'function', 'decoder export must exist');
  assert.equal(typeof mod._dc_xz_buffer_free, 'function', 'decoder buffer free export must exist');
  const enc = mod._dc_xz_encoder_new(9);
  assert.ok(enc);
  const records = Array.from({length:10000},(_,i)=>JSON.stringify({timestamp:`2026-09-28T03:${String(i%60).padStart(2,'0')}:00-04:00`,seq:i,text:'repeated conversation payload '.repeat(8)})+'\n');
  const expected=Buffer.from(records.join(''));
  const parts=[];
  for (const record of records) {
    const input=Buffer.from(record);
    const p=mod._malloc(input.length); mod.HEAPU8.set(input,p);
    const outp=mod._malloc(4), outn=mod._malloc(4);
    assert.equal(mod._dc_xz_encoder_write(enc,p,input.length,outp,outn),1);
    const ptr=readPointer(mod,outp), len=readPointer(mod,outn);
    if(len) parts.push(Buffer.from(mod.HEAPU8.slice(ptr,ptr+len)));
    mod._free(p); mod._free(outp); mod._free(outn);
  }
  const outp=mod._malloc(4), outn=mod._malloc(4);
  assert.equal(mod._dc_xz_encoder_finish(enc,outp,outn),1);
  const ptr=readPointer(mod,outp), len=readPointer(mod,outn);
  if(len) parts.push(Buffer.from(mod.HEAPU8.slice(ptr,ptr+len)));
  mod._dc_xz_encoder_free(enc); mod._free(outp); mod._free(outn);
  const archive=Buffer.concat(parts);

  const root=fs.mkdtempSync(path.join(os.tmpdir(),'liblzma-wasm-'));
  const file=path.join(root,'stream.xz'); fs.writeFileSync(file,archive);
  assert.equal(childProcess.spawnSync('xz',['-t',file]).status,0);
  const nativeDecoded=childProcess.spawnSync('xz',['-dc',file],{maxBuffer:expected.length*2+1024});
  assert.equal(nativeDecoded.status,0,String(nativeDecoded.stderr));
  assert.deepEqual(nativeDecoded.stdout,expected);

  const archivePtr=mod._malloc(archive.length);
  mod.HEAPU8.set(archive,archivePtr);
  const decodedPtrPtr=mod._malloc(4), decodedLenPtr=mod._malloc(4);
  assert.equal(mod._dc_xz_decode(archivePtr,archive.length,decodedPtrPtr,decodedLenPtr),1);
  const decodedPtr=readPointer(mod,decodedPtrPtr), decodedLen=readPointer(mod,decodedLenPtr);
  const wasmDecoded=Buffer.from(mod.HEAPU8.slice(decodedPtr,decodedPtr+decodedLen));
  assert.deepEqual(wasmDecoded,expected);
  mod._dc_xz_buffer_free(decodedPtr);
  mod._free(archivePtr); mod._free(decodedPtrPtr); mod._free(decodedLenPtr);
  fs.rmSync(root,{recursive:true,force:true});
});
