// Test the view segment against authoritative opaque cover, excluding ships and
// decoration. This prevents the visibility overlay from highlighting its own hull.
export function coverOccludes(camera, target, obstacles) {
  const d={x:target.x-camera.x,y:target.y-camera.y,z:target.z-camera.z};
  for(const o of obstacles){
    let lo=0,hi=1;
    const slab=(axis,min,max)=>{
      if(Math.abs(d[axis])<1e-9)return camera[axis]>=min&&camera[axis]<=max;
      let a=(min-camera[axis])/d[axis],b=(max-camera[axis])/d[axis];
      if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);return hi>=lo;
    };
    if(!slab('y',0,o.h))continue;
    if(o.type==='box'){
      if(slab('x',o.x-o.w/2,o.x+o.w/2)&&slab('z',o.z-o.d/2,o.z+o.d/2)&&lo<.999&&hi>0)return true;
    }else{
      const dx=d.x/o.r,dz=d.z/o.r,ox=(camera.x-o.x)/o.r,oz=(camera.z-o.z)/o.r;
      const dy=o.type==='sphere'?d.y/(o.h/2):0,oy=o.type==='sphere'?(camera.y-o.h/2)/(o.h/2):0;
      const a=dx*dx+dy*dy+dz*dz,b=2*(ox*dx+oy*dy+oz*dz),c=ox*ox+oy*oy+oz*oz-1;
      if(a<1e-12){if(c<=0&&hi>0&&lo<.999)return true;continue;}
      const discriminant=b*b-4*a*c;if(discriminant<0)continue;
      const root=Math.sqrt(discriminant);lo=Math.max(lo,(-b-root)/(2*a));hi=Math.min(hi,(-b+root)/(2*a));
      if(hi>=lo&&lo<.999&&hi>0)return true;
    }
  }
  return false;
}
