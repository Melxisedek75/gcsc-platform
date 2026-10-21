import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../apps/mobile/lib/payments.ts', import.meta.url), 'utf8');
const req = {mode:'charge',amount:'50.0000 XPR',recipient:'gcsctoken111',memo:'gcsc:lead-token',endpoint:'/api/payment/lead-token'};
const hash = 'a'.repeat(64);
function fixture({verify, sign, storageFail=false, values=new Map(), challenge, hang, payment=req}={}) {
 let token='jwt',user={id:'u',wallet:{account:'alice',permission:'active',verified:true}}, calls=0, signed=0, cleared=0, expireNetwork;
 const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{if(storageFail)throw Error('disk');values.set(k,v)},removeItem:async k=>values.delete(k)};
 const signing=async(args)=>{signed++;return sign?sign(args):{ok:true,txHash:hash,broadcastAttempted:true}};
 const context={exports:{},crypto:{getRandomValues:bytes=>bytes.fill(7)},require:n=>n.includes('async-storage')?storage:n==='./webauth'?{signTransfer:signing}:n==='./api'?{getToken:()=>token,getCurrentUser:()=>user,clearSession:async()=>{cleared++;token=null}}:{getApiUrl:x=>x},setTimeout:(cb,delay)=>{if(hang&&delay===15000){expireNetwork=cb;return -1;}return setTimeout(cb,delay)},clearTimeout,AbortController,fetch:async(_url,opts)=>{calls++;if(hang===(opts.headers['X-Payment-Tx']?'verify':'challenge'))return new Promise(()=>{});return !opts.headers['X-Payment-Tx']?(challenge?challenge():{status:402,ok:false,headers:{get:()=>`Payment recipient="${payment.recipient}" amount="${payment.amount}" memo="${payment.memo}"`}}):verify?verify():{status:200,ok:true,json:async()=>({pending:false,lead_status:'active',tx_hash:hash})}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,context);
 return {pay:context.exports.requestPayment,counts:()=>({calls,signed,cleared}),setToken:x=>token=x,setUser:x=>user=x,values,expireNetwork:()=>{assert.ok(expireNetwork);expireNetwork();}};
}
test('pending 200 is not confirmation and retry only verifies original transaction',async()=>{const f=fixture({verify:()=>({status:200,ok:true,json:async()=>({pending:true,tx_hash:hash})})});const r=await f.pay(req,()=>{});assert.equal(r.ok,false);assert.equal(r.txHash,hash);assert.equal(r.pending,true);await f.pay(req,()=>{});assert.equal(f.counts().signed,1)});
test('verification network loss retains hash and retry never signs twice',async()=>{const f=fixture({verify:()=>{throw Error('offline')}});assert.equal((await f.pay(req,()=>{})).txHash,hash);await f.pay(req,()=>{});assert.equal(f.counts().signed,1)});
test('uncertain broadcast blocks next signing',async()=>{const f=fixture({sign:()=>({ok:false,error:'timeout',broadcastAttempted:true})});await f.pay(req,()=>{});await f.pay(req,()=>{});assert.equal(f.counts().signed,1)});
test('explicit pre-broadcast rejection permits another attempt',async()=>{const f=fixture({sign:()=>({ok:false,error:'wrong identity',broadcastAttempted:false})});await f.pay(req,()=>{});await f.pay(req,()=>{});assert.equal(f.counts().signed,2)});
test('missing endpoint cannot synthesize payment',async()=>{const f=fixture();const r=await f.pay({...req,endpoint:undefined},()=>{});assert.equal(r.ok,false);assert.equal(f.counts().signed,0)});
test('unverified wallet cannot request payment',async()=>{const f=fixture();f.setUser({id:'u',wallet:{account:'alice',permission:'active',verified:false}});assert.equal((await f.pay(req,()=>{})).ok,false);assert.equal(f.counts().calls,0)});
test('durable journal failure prevents broadcast',async()=>{const f=fixture({storageFail:true});assert.equal((await f.pay(req,()=>{})).ok,false);assert.equal(f.counts().signed,0)});
test('403 does not erase application login',async()=>{const f=fixture({verify:()=>({status:403,ok:false,json:async()=>({})})});await f.pay(req,()=>{});assert.equal(f.counts().cleared,0)});
test('confirmed receipt requires matching hash and explicit pending false',async()=>{const f=fixture();assert.equal((await f.pay(req,()=>{})).ok,true);assert.equal(f.values.size,0)});

test('project-specific receipt confirms once and clears its journal',async()=>{
 const payment={mode:'charge',amount:'50.0000 XPR',recipient:'gcsctoken111',memo:'gcsc:project:41',endpoint:'/api/payment/project-access/41',confirmation:{kind:'project-access',projectId:41}};
 const f=fixture({payment,verify:()=>({status:200,ok:true,json:async()=>({project_id:41,access_status:'paid',pending:false,tx_hash:hash})})});
 assert.equal((await f.pay(payment,()=>{})).ok,true);assert.equal(f.values.size,0);assert.equal(f.counts().signed,1);
});
test('wrong project receipt is unresolved and retry does not transfer twice',async()=>{
 const payment={mode:'charge',amount:'50.0000 XPR',recipient:'gcsctoken111',memo:'gcsc:project:41',endpoint:'/api/payment/project-access/41',confirmation:{kind:'project-access',projectId:41}};
 const f=fixture({payment,verify:()=>({status:200,ok:true,json:async()=>({project_id:42,access_status:'paid',pending:false,tx_hash:hash})})});
 assert.equal((await f.pay(payment,()=>{})).pending,true);await f.pay(payment,()=>{});
 assert.equal(f.counts().signed,1);assert.equal(f.values.size,1);
});
test('project quote lost before signing resumes the reserved attempt after restart',async()=>{
 const payment={mode:'charge',amount:'50.0000 XPR',recipient:'gcsctoken111',memo:'gcsc:project:41',endpoint:'/api/payment/project-access/41',confirmation:{kind:'project-access',projectId:41}};
 const values=new Map();const first=fixture({payment,values,hang:'challenge'});
 const waiting=first.pay(payment,()=>{});await new Promise(r=>setTimeout(r,0));first.expireNetwork();
 const lost=await waiting;assert.equal(lost.ok,false);assert.equal(lost.pending,false);
 assert.equal(first.counts().signed,0);
 const second=fixture({payment,values,verify:()=>({status:200,ok:true,json:async()=>({project_id:41,access_status:'paid',pending:false,tx_hash:hash})})});
 assert.equal((await second.pay(payment,()=>{})).ok,true);
 assert.equal(second.counts().signed,1);assert.equal(values.size,0);
});

test('known hash survives process restart and is verification-only',async()=>{
 const values=new Map();const a=fixture({values,verify:()=>{throw Error('offline')}});await a.pay(req,()=>{});
 const b=fixture({values});assert.equal((await b.pay(req,()=>{})).ok,true);assert.equal(b.counts().signed,0);
});
test('unknown attempt survives process restart and blocks broadcasting',async()=>{
 const values=new Map();const a=fixture({values,sign:()=>({ok:false,broadcastAttempted:true})});await a.pay(req,()=>{});
 const b=fixture({values});assert.equal((await b.pay(req,()=>{})).ok,false);assert.equal(b.counts().signed,0);assert.equal(b.counts().calls,0);
});
test('concurrent callers cannot open two signing requests',async()=>{
 let release;const gate=new Promise(r=>release=r);const f=fixture({sign:async()=>{await gate;return {ok:true,txHash:hash,broadcastAttempted:true}}});
 const first=f.pay(req,()=>{});await new Promise(r=>setTimeout(r,0));const second=f.pay(req,()=>{});await new Promise(r=>setTimeout(r,0));release();await Promise.all([first,second]);assert.equal(f.counts().signed,1);
});
test('session change during challenge cannot sign or erase new login',async()=>{
 let f;f=fixture({challenge:()=>{f.setToken('newjwt');return {status:401,headers:{get:()=>null}}}});
 assert.equal((await f.pay(req,()=>{})).ok,false);assert.equal(f.counts().signed,0);assert.equal(f.counts().cleared,0);
});
test('revoked receipt cannot be presented as successful payment',async()=>{
 const f=fixture({verify:()=>({ok:true,status:200,json:async()=>({pending:false,lead_status:'revoked',tx_hash:hash})})});
 assert.equal((await f.pay(req,()=>{})).ok,false);assert.equal(f.values.size,1);
});
test('UI progress callback failure cannot lose bookkeeping',async()=>{
 const f=fixture();assert.equal((await f.pay(req,()=>{throw Error('unmounted')})).ok,true);assert.equal(f.values.size,0);
});

test('payment supplies a live app-session guard to the native pre-broadcast boundary',async()=>{
 let f;f=fixture({sign:args=>{
  assert.equal(typeof args.isSessionCurrent,'function');
  assert.equal(args.isSessionCurrent(),true);f.setToken('replacement-login');
  assert.equal(args.isSessionCurrent(),false);return {ok:false,broadcastAttempted:false,error:'session changed'};
 }});
 const result=await f.pay(req,()=>{});assert.equal(result.ok,false);assert.equal(f.values.size,0);
});

for(const stage of ['challenge','verify'])test(`hung ${stage} request is bounded without a second transfer`,async()=>{
 const f=fixture({hang:stage});const pending=f.pay(req,()=>{});await new Promise(r=>setTimeout(r,0));f.expireNetwork();
 const result=await pending;assert.equal(result.ok,false);assert.equal(result.pending,stage==='verify');
 assert.equal(f.counts().signed,stage==='verify'?1:0);if(stage==='verify')assert.equal(result.txHash,hash);
});
