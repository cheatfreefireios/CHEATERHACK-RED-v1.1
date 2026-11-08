(() => {
  const $ = id => document.getElementById(id);
  const views = ['authView','getKeyView','menuView'];
  const show = id => views.forEach(v => $(v).classList.toggle('hidden',v!==id));
  const api = (path, body) => fetch(`${window.APP_CONFIG.API_BASE}${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  }).then(async r => { const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||'Máy chủ đang bận.'); return data; });
  const deviceId = (() => {
    let id=localStorage.getItem('hr_device_id');
    if(!id){id=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`);localStorage.setItem('hr_device_id',id)}
    return id;
  })();
  const setStatus=(id,msg)=>$(id).textContent=msg;

  $('getKeyBtn').onclick=()=>{show('getKeyView');setStatus('getKeyStatus','');$('newKeyBox').classList.add('hidden')};
  $('backBtn').onclick=()=>show('authView');
  $('createKeyBtn').onclick=async()=>{
    const btn=$('createKeyBtn');btn.disabled=true;setStatus('getKeyStatus','ĐANG KIỂM TRA THIẾT BỊ VÀ CẤP KEY...');
    try{
      const data=await api('/api/getkey',{deviceId});
      $('newKeyText').textContent=data.key;
      $('keyExpiry').textContent=`Hết hạn: ${new Date(data.expiresAt).toLocaleString('vi-VN')}`;
      $('newKeyBox').classList.remove('hidden');setStatus('getKeyStatus',`ĐÃ CẤP KEY. Hôm nay còn ${data.remaining} lượt GETKEY.`);
      $('keyInput').value=data.key;
    }catch(e){setStatus('getKeyStatus',e.message)}finally{btn.disabled=false}
  };
  $('copyKeyBtn').onclick=async()=>{try{await navigator.clipboard.writeText($('newKeyText').textContent);setStatus('getKeyStatus','ĐÃ SAO CHÉP KEY')}catch{setStatus('getKeyStatus','Không thể sao chép tự động; hãy giữ để sao chép key.')}};
  $('loginBtn').onclick=async()=>{
    const key=$('keyInput').value.trim();if(!key){setStatus('authStatus','[ VUI LÒNG NHẬP KEY ]');return}
    const btn=$('loginBtn');btn.disabled=true;setStatus('authStatus','ĐANG XÁC THỰC KEY...');
    try{await api('/api/verify',{deviceId,key});setStatus('authStatus','[ ACCESS GRANTED ]');show('menuView')}
    catch(e){setStatus('authStatus',e.message)}finally{btn.disabled=false}
  };
  $('logoutBtn').onclick=()=>{show('authView');setStatus('authStatus','[ ĐÃ ĐĂNG XUẤT ]')};
  [['fov','fovValue'],['smooth','smoothValue']].forEach(([a,b])=>$(a).oninput=()=>$(b).value=$(a).value);

  // Hiệu ứng tuyết nhẹ
  const c=$('snowCanvas'),ctx=c.getContext('2d');let flakes=[];
  function resize(){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);flakes=Array.from({length:55},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+0.5,s:Math.random()*0.8+0.25}))}
  function snow(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.fillStyle='rgba(255,90,90,.55)';flakes.forEach(f=>{ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();f.y+=f.s;f.x+=Math.sin(f.y/35)*.25;if(f.y>innerHeight){f.y=-4;f.x=Math.random()*innerWidth}});requestAnimationFrame(snow)}
  addEventListener('resize',resize);resize();snow();
})();
