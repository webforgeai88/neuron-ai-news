import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://127.0.0.1:5173';let checks=0;
const eq=(actual,expected)=>{assert.equal(actual,expected);checks++;};const ok=value=>{assert.ok(value);checks++;};
async function request(path,method='GET',body,jar={}){const r=await fetch(base+'/api/'+path,{method,headers:{Origin:base,...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; ')},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});for(const c of r.headers.getSetCookie()){const [name,value]=c.split(';')[0].split('=');if(value)jar[name]=value;else delete jar[name];}return {status:r.status,data:await r.json()};}
const main=await request('posts');eq(main.status,200);eq(main.data.length,12);ok(main.data.every(p=>p.links.length>0&&p.slug));
eq((await request('posts?all=1')).status,401);eq((await request('users')).status,401);eq((await request('posts','POST',{})).status,401);
const a={},b={};eq((await request('demo','POST',{role:'admin'},a)).status,200);eq((await request('demo','POST',{role:'employee'},b)).status,200);
const state=await request('state','GET',undefined,a);eq(state.data.user.role,'admin');ok(state.data.demo);
const aPosts=(await request('posts?all=1','GET',undefined,a)).data;eq(aPosts.length,14);eq(aPosts.filter(p=>p.status==='draft').length,2);
const bPosts=(await request('posts?all=1','GET',undefined,b)).data;ok(aPosts[0].id!==bPosts[0].id);
eq((await request('users','GET',undefined,b)).status,403);
const employee={name:'Проверка сотрудника',login:'qa_'+crypto.randomUUID().slice(0,8),password:crypto.randomUUID()};
eq((await request('users','POST',employee,a)).status,200);eq((await request('users','POST',employee,a)).status,409);
const employeeId=(await request('users','GET',undefined,a)).data.find(u=>u.login===employee.login).id;
eq((await request('login','POST',employee,a)).status,200);const employeeJar={...a};eq((await request('state','GET',undefined,a)).data.user.role,'employee');
eq((await request('users','POST',{...employee,login:employee.login+'x'},a)).status,403);eq((await request('users/'+employeeId,'DELETE',{},a)).status,403);
const post={title:'QA '+crypto.randomUUID(),excerpt:'Тест изоляции',body:'## Проверка\n**Текст** и [источник](https://example.com).',category:'Модели',links:[{label:'Источник',url:'https://example.com'}],cover:'/covers/0.svg',status:'draft'};
const created=await request('posts','POST',post,a);eq(created.status,200);ok(!(await request('posts','GET',undefined,a)).data.some(p=>p.id===created.data.id));
eq((await request('posts','POST',{...post,id:created.data.id,status:'published'},a)).status,200);
const published=(await request('posts','GET',undefined,a)).data.find(p=>p.id===created.data.id);ok(published);eq((await request('posts/'+published.slug,'GET',undefined,a)).status,200);
eq((await request('posts/'+published.slug)).status,404);ok(!(await request('posts','GET',undefined,b)).data.some(p=>p.id===created.data.id));
eq((await request('posts','POST',{...post,id:bPosts[0].id},a)).status,404);
eq((await request('posts','POST',{...post,links:[{label:'bad',url:'javascript:alert(1)'}]},a)).status,400);
const form=new FormData();form.append('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2F9sAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'qa.png');const upload=await request('upload','POST',form,a);eq(upload.status,200);ok(upload.data.url.includes('/neuron-covers/demo/'));
eq((await request('demo/switch','POST',{role:'admin'},a)).status,200);eq((await request('users/'+employeeId,'DELETE',{},a)).status,200);eq((await request('posts','POST',post,employeeJar)).status,401);
eq((await request('demo/reset','POST',{},a)).status,200);eq((await request('posts?all=1','GET',undefined,a)).data.length,14);eq((await request('users','GET',undefined,a)).data.length,2);
eq((await request('demo/switch','POST',{role:'reader'},a)).status,200);eq((await request('state','GET',undefined,a)).data.user,null);eq((await request('posts','POST',post,a)).status,401);
eq((await request('demo/exit','POST',{},a)).status,200);eq((await request('state','GET',undefined,a)).data.demo,null);
// Verify direct Data API exposure without a privileged key.
const config=Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),JSON.parse(l.slice(i+1))];}));
const headers={apikey:config.NEURON_PUBLISHABLE_KEY};
const pub=await fetch(config.NEURON_SUPABASE_URL+'/rest/v1/neuron_posts?select=id,status',{headers});eq(pub.status,200);eq((await pub.json()).length,12);
const hidden=await fetch(config.NEURON_SUPABASE_URL+'/rest/v1/neuron_profiles?select=id',{headers});ok([401,403].includes(hidden.status));
const direct=await fetch(config.NEURON_SUPABASE_URL+'/functions/v1/neuron-api/state',{headers});eq(direct.status,403);
const write=await fetch(config.NEURON_SUPABASE_URL+'/rest/v1/neuron_posts',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({title:'forbidden'})});ok([401,403].includes(write.status));
// Real Supabase Auth lifecycle, only when the permanent editor is still empty.
const originalState=(await request('state')).data;
if(originalState.needsSetup){const admin={name:'Временная проверка',login:'qa_admin_'+crypto.randomUUID().slice(0,8),password:crypto.randomUUID()},jar={};eq((await request('setup','POST',admin,jar)).status,403);const sign=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});for(const c of sign.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar[k]=v;}
eq((await request('setup','POST',admin,jar)).status,200);eq((await request('login','POST',admin,jar)).status,200);const who=(await request('state','GET',undefined,jar)).data.user;eq(who.role,'admin');const staff={name:'Временный сотрудник',login:'qa_staff_'+crypto.randomUUID().slice(0,8),password:crypto.randomUUID()};eq((await request('users','POST',staff,jar)).status,200);const staffJar={};eq((await request('login','POST',staff,staffJar)).status,200);eq((await request('users','GET',undefined,staffJar)).status,403);const staffId=(await request('users','GET',undefined,jar)).data.find(u=>u.login===staff.login).id;eq((await request('users/'+staffId,'DELETE',{},jar)).status,200);eq((await request('posts','POST',post,staffJar)).status,401);const revoked={...jar};eq((await request('logout','POST',{},jar)).status,200);eq((await request('users','GET',undefined,revoked)).status,401);
fs.writeFileSync('.sites-runtime/qa-auth-cleanup.json',JSON.stringify({id:who.id,login:admin.login}));}
await request('demo/exit','POST',{},b);
console.log(`PASS: ${checks} checks — Supabase Auth, roles, workspace isolation, drafts, publication, upload, token revocation, RLS and direct API protection.`);
