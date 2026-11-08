const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const dayKey=()=>new Date().toISOString().slice(0,10);
const randomKey=()=>`HR-${Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}`;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export default {
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{headers:cors});
  const url=new URL(request.url);if(request.method!=='POST')return json({error:'Method not allowed'},405);
  let body;try{body=await request.json()}catch{return json({error:'Dữ liệu không hợp lệ.'},400)}
  const deviceId=String(body.deviceId||'');if(deviceId.length<8||deviceId.length>200)return json({error:'Không xác định được thiết bị.'},400);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const deviceHash=await hash(deviceId);const ipHash=await hash(ip);const today=dayKey();
  if(url.pathname==='/api/getkey'){
    const countKey=`count:${today}:${deviceHash}`;const count=Number(await env.KEYS.get(countKey)||0);
    if(count>=4)return json({error:'Đã hết 4 lượt GETKEY hôm nay. Hãy quay lại ngày mai.'},429);
    // Giới hạn bổ sung theo IP nhằm hạn chế tạo nhiều device ID trên cùng mạng.
    const ipCountKey=`ipcount:${today}:${ipHash}`;const ipCount=Number(await env.KEYS.get(ipCountKey)||0);
    if(ipCount>=20)return json({error:'IP này đã đạt giới hạn cấp key trong ngày.'},429);
    const key=randomKey();const now=Date.now();const expiresAt=now+12*60*60*1000;
    await env.KEYS.put(`key:${await hash(key)}`,JSON.stringify({deviceHash,ipHash,createdAt:now,expiresAt}),{expirationTtl:13*60*60});
    await env.KEYS.put(countKey,String(count+1),{expirationTtl:48*60*60});
    await env.KEYS.put(ipCountKey,String(ipCount+1),{expirationTtl:48*60*60});
    return json({key,expiresAt,remaining:3-count});
  }
  if(url.pathname==='/api/verify'){
    const key=String(body.key||'').trim();if(!key)return json({error:'[ VUI LÒNG NHẬP KEY ]'},400);
    const record=await env.KEYS.get(`key:${await hash(key)}`);if(!record)return json({error:'[ KEY KHÔNG TỒN TẠI ]'},404);
    const info=JSON.parse(record);if(Date.now()>info.expiresAt)return json({error:'[ KEY ĐÃ HẾT HẠN ]'},403);
    if(info.deviceHash!==deviceHash)return json({error:'[ KEY KHÔNG THUỘC THIẾT BỊ NÀY ]'},403);
    if(info.ipHash!==ipHash)return json({error:'[ ĐỊA CHỈ IP KHÔNG KHỚP ]'},403);
    return json({ok:true,expiresAt:info.expiresAt});
  }
  return json({error:'Not found'},404);
 }
};
