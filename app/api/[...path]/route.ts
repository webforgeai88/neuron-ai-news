import {neuronConfig} from '@/lib/neuron-server';
export const dynamic='force-dynamic';
type Session={access:string;refresh:string};
function readCookie(req:Request,name:string){return req.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(name+'='))?.slice(name.length+1);}
function readSession(req:Request):Session|null{try{return JSON.parse(atob(readCookie(req,'neuron_auth')||''));}catch{return null;}}
function cookie(name:string,value:string,secure:boolean,age:number){return `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`;}
async function handle(req:Request){
 const c=neuronConfig();if(!c.url||!c.key||!c.proxy)return Response.json({error:'Подключение к редакции ещё настраивается.'},{status:503});
 const u=new URL(req.url),path=u.pathname.replace('/api/','');const secure=u.protocol==='https:';
 if(!['GET','POST','DELETE'].includes(req.method))return new Response(null,{status:405});
 if(req.method!=='GET'&&req.headers.get('origin')!==u.origin)return Response.json({error:'Недопустимый источник запроса'},{status:403});
 const incomingEmail=req.headers.get('oai-authenticated-user-email');
 const owner=!!incomingEmail&&(incomingEmail===c.owner||(process.env.NODE_ENV==='development'&&incomingEmail==='seedy@sites.test'));
 if(path==='setup'&&!owner)return Response.json({error:'Первичная настройка доступна владельцу после входа через ChatGPT'},{status:403});
 if(Number(req.headers.get('content-length')||0)>(path==='upload'?4000000:150000))return Response.json({error:'Слишком большой запрос'},{status:413});
 let session=readSession(req),demo=readCookie(req,'neuron_demo');const outputHeaders=new Headers({'Cache-Control':'no-store','Content-Type':'application/json'});
 const payload=req.method==='GET'?undefined:await req.arrayBuffer();if(payload&&payload.byteLength>(path==='upload'?4000000:150000))return Response.json({error:'Слишком большой запрос'},{status:413});
 async function call(route:string,method:string,body?:ArrayBuffer|string,access?:string,includeDemo=true){const headers:Record<string,string>={apikey:c.key!,'x-neuron-proxy':c.proxy!,'x-neuron-ip':req.headers.get('cf-connecting-ip')||'local'};if(owner)headers['x-neuron-owner']='verified';if(access)headers['x-neuron-access']=access;if(includeDemo&&demo)headers['x-neuron-demo']=demo;if(body)headers['Content-Type']=typeof body==='string'?'application/json':req.headers.get('content-type')||'application/json';return fetch(c.url+'/functions/v1/neuron-api/'+route,{method,headers,body,cache:'no-store',signal:AbortSignal.timeout(45000)});}
 let response=await call(path+u.search,req.method,payload,session?.access);
 if(response.status===401&&session?.refresh&&!demo&&!['login','refresh','setup'].includes(path)){const refresh=await call('refresh','POST',JSON.stringify({refresh:session.refresh}),undefined,false);const r:any=await refresh.json();if(refresh.ok&&r.session){session=r.session;outputHeaders.append('Set-Cookie',cookie('neuron_auth',btoa(JSON.stringify(session)),secure,604800));response=await call(path+u.search,req.method,payload,session?.access);}else outputHeaders.append('Set-Cookie',cookie('neuron_auth','',secure,0));}
 if(['state','bootstrap'].includes(path)&&response.status===401){if(demo){demo=undefined;outputHeaders.append('Set-Cookie',cookie('neuron_demo','',secure,0));}response=await call(path,'GET',undefined,undefined,false);}
 let data:any;try{data=await response.json();}catch{return Response.json({error:'Сервис временно недоступен. Повторите попытку.'},{status:502});}
 if(response.ok){if(data.session){outputHeaders.append('Set-Cookie',cookie('neuron_auth',btoa(JSON.stringify(data.session)),secure,604800));delete data.session;}if(data.demoToken){outputHeaders.append('Set-Cookie',cookie('neuron_demo',data.demoToken,secure,3600));delete data.demoToken;}if(data.clearSession)outputHeaders.append('Set-Cookie',cookie('neuron_auth','',secure,0));if(data.clearDemo)outputHeaders.append('Set-Cookie',cookie('neuron_demo','',secure,0));}
 return new Response(JSON.stringify(data),{status:response.status,headers:outputHeaders});
}
async function safe(req:Request){try{return await handle(req);}catch{console.error('Neuron proxy request failed');return Response.json({error:'Не удалось связаться с редакцией. Повторите попытку.'},{status:502});}}
export const GET=safe;export const POST=safe;export const DELETE=safe;
