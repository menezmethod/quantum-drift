// Package only the runnable application, never local data, credentials or node_modules.
// Run build/tests and obtain feature acceptance before tagging/publishing this output.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit the accepted release before packaging.');
const pkg=require('../package.json');
if(!/^\d+\.\d+\.\d+$/.test(pkg.version))throw Error('Expected a numeric release version.');
if(!fs.existsSync(path.join(root,'dist/index.html')))throw Error('Run npm run build first.');
const name=`quantum-drift-v${pkg.version}`,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qd-release-')),stage=path.join(tmp,name),out=path.join(root,'release-artifacts');
fs.mkdirSync(stage);fs.mkdirSync(out,{recursive:true});
try{
 for(const f of ['dist','shared','server/server.js','server/rankings','package.json','package-lock.json','README.md','CHANGELOG.md','docs/ROADMAP.md','docs/HOSTING.md']){
  const dest=path.join(stage,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,f),dest,{recursive:true});
 }
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 fs.writeFileSync(path.join(stage,'BUILD_INFO.json'),JSON.stringify({version:pkg.version,commit,packagedAt:new Date().toISOString()},null,2)+'\n');
 const archive=path.join(out,name+'.tar.gz');execFileSync('tar',['-czf',archive,'-C',tmp,name]);
 const hash=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
 fs.writeFileSync(path.join(out,'SHA256SUMS'),`${hash}  ${name}.tar.gz\n`);
 console.log(JSON.stringify({version:pkg.version,commit,archive,sha256:hash}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
