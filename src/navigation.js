/** Collision against the exported Blender geometry. Player has a 24 cm radius. */
export function pointBlocked(x,z,boxes,radius=.24) {
  if(Math.abs(x)>45||Math.abs(z)>40)return true;
  return boxes.some(b=>b.min.y<1.78&&b.max.y>.25&&x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius);
}
