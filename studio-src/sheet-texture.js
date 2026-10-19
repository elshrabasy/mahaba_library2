export function orientSheetTexture(texture,data){
  if(data?.source==='mahabat-engine')texture.flipY=false;
  return texture;
}
