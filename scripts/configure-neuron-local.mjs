import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),'..');
process.chdir(decodeURIComponent(root));
const terminal=process.stdin.isTTY;if(terminal){process.stdin.setRawMode(true);process.stderr.write('Ready for local Neuron configuration (input is hidden).\n');}
const raw=await new Promise(resolve=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\u0003'))process.exit(130);if(value.includes('\n')||value.includes('\r')){process.stdin.removeAllListeners('data');process.stdin.pause();resolve(value);}});process.stdin.resume();});if(terminal)process.stdin.setRawMode(false);
const config=JSON.parse(raw);const allowed=['NEURON_SUPABASE_URL','NEURON_PUBLISHABLE_KEY','NEURON_PROXY_SECRET','NEURON_OWNER_EMAIL'];
if(Object.keys(config).some(k=>!allowed.includes(k)))throw new Error('Unexpected configuration field');
fs.writeFileSync('.env.local',Object.entries(config).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n');console.log('Local environment configured.');
