const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runtimeToolEnvironment}=require('./runtime-tools.cjs');
test('per-app tool config validates paths and cannot inject unrelated environment',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tw-runtime-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 assert.deepEqual(runtimeToolEnvironment(dir,{PATH:'keep'}),{PATH:'keep'});
 const file=path.join(dir,'runtime-tools.json');const python=path.join(dir,'python3');fs.writeFileSync(python,'#!/bin/sh\nexit 0\n',{mode:0o755});
 fs.writeFileSync(file,JSON.stringify({LINKREADER_PYTHON:python,NODE_OPTIONS:'injected'}));
 assert.deepEqual(runtimeToolEnvironment(dir,{PATH:'keep'}),{PATH:'keep',LINKREADER_PYTHON:python});
 assert.equal(runtimeToolEnvironment(dir,{LINKREADER_PYTHON:'/explicit/override'}).LINKREADER_PYTHON,'/explicit/override');
 fs.writeFileSync(file,JSON.stringify({LINKREADER_PYTHON:'relative'}));assert.throws(()=>runtimeToolEnvironment(dir,{}),/完整路徑/);
 fs.writeFileSync(file,JSON.stringify({LINKREADER_BIN_DIR:dir}));assert.throws(()=>runtimeToolEnvironment(dir,{}));
 for(const n of ['ffmpeg','ffprobe'])fs.writeFileSync(path.join(dir,n),'#!/bin/sh\nexit 0\n',{mode:0o755});
 assert.equal(runtimeToolEnvironment(dir,{}).LINKREADER_BIN_DIR,dir);
 fs.writeFileSync(file,'[]');assert.throws(()=>runtimeToolEnvironment(dir,{}),/格式錯誤/);
});
