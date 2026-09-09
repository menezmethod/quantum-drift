const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const mod=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../src/core/visibility.js'),'utf8')).toString('base64'));
test('cover silhouette activates only across opaque cover, including curved bounds and height',async()=>{
 const {coverOccludes}=await mod;
 const box={type:'box',x:0,z:0,w:8,d:8,h:4.5};
 assert.equal(coverOccludes({x:0,y:18,z:-13},{x:0,y:.9,z:5.3},[box]),true);
 assert.equal(coverOccludes({x:0,y:32,z:-14},{x:0,y:.9,z:-8},[box]),false);
 assert.equal(coverOccludes({x:0,y:50,z:5.3},{x:0,y:.9,z:5.3},[box]),false);
 for(const type of ['cylinder','sphere']){
  const curved={type,x:0,z:0,r:2,h:4};
  assert.equal(coverOccludes({x:0,y:2,z:-10},{x:0,y:2,z:10},[curved]),true);
  assert.equal(coverOccludes({x:2.1,y:2,z:-10},{x:2.1,y:2,z:10},[curved]),false);
 }
 assert.equal(coverOccludes({x:0,y:18,z:-13},{x:0,y:.9,z:5.3},[]),false);
});
