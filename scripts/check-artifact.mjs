import fs from 'node:fs';
import path from 'node:path';
const line=fs.readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('NEURON_PROXY_SECRET='));
if(!line)throw new Error('Missing local configuration for secret scan');
const secret=JSON.parse(line.slice(line.indexOf('=')+1));
let files=0;function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else{files++;if(fs.readFileSync(file).includes(Buffer.from(secret)))throw new Error('Runtime secret was bundled: '+file);}}}
scan('dist');console.log(`PASS: ${files} build files scanned; proxy secret is absent from the deployment artifact.`);
