import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:5173';
const signIn=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const platform=signIn.headers.get('set-cookie')?.split(';')[0]||'';
const account={name:'Тестовая редакция',login:'qa_admin',password:crypto.randomUUID()};
const r=await fetch(base+'/api/setup',{method:'POST',headers:{Origin:base,Cookie:platform,'Content-Type':'application/json'},body:JSON.stringify(account)});
if(!r.ok)throw new Error('Local UI bootstrap failed');
await writeFile('.sites-runtime/qa-ui.json',JSON.stringify(account));
console.log('Local-only temporary UI fixture prepared.');
