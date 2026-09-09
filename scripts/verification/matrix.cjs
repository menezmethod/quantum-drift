const {capture}=require('./capture.cjs');
(async()=>{
 const round=process.argv[2]||'r1';
 const cases=[
 ['foundry','tactical','dusk','arena','combat'],['canopy','tactical','day','arena','drift'],['glacier','tactical','night','arena','combat'],
 ['foundry','chase','dusk','view','drift'],['glacier','overview','day','view','damaged'],['canopy','isometric','night','health','damaged'],
 ['foundry','tactical','dusk','effects','combat'],['foundry','tactical','dusk','ui','recap'],['canopy','isometric','day','ui','lobby'],
 ['foundry','isometric','dusk','world','damaged'],
 ];
 for(const [map,camera,time,module,state]of cases) await capture({map,camera,time,module,state,out:`docs/gauntlet/evidence/${round}-${map}-${module}-${camera}-${state}`});
 await capture({map:'canopy',camera:'tactical',time:'day',module:'health',state:'damaged',width:390,height:844,out:`docs/gauntlet/evidence/${round}-mobile-health`});
})();
