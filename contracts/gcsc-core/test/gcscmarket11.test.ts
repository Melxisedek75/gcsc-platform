export {};
const fs=require("fs"), path=require("path");
const {COMPILER_TIMEOUT_MS,createScratchDirectory,runProtonAsc}=require("./harness.cjs");
const {expect}=require("chai");
const {Asset}=require("@greymass/eosio");
const {Blockchain,protonAssert}=require("@proton/vert");
const CORE_DIR=path.resolve(__dirname,"..");
const GEN=createScratchDirectory(CORE_DIR,"gcscmarket11");
function find(root,name){for(const e of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isFile()&&e.name===name)return p;if(e.isDirectory()){const x=find(p,name);if(x)return x;}}return "";}
describe("gcscmarket11 lead marketplace MVP",function(){
 this.timeout(3*COMPILER_TIMEOUT_MS+30000);
 it("source compiles to ABI and WASM",function(){
   const d=path.join(GEN,"market");fs.mkdirSync(d,{recursive:true});
   fs.copyFileSync(path.join(CORE_DIR,"gcscmarket11.contract.ts"),path.join(d,"gcscmarket11.contract.ts"));
   runProtonAsc(path.join(d,"gcscmarket11.contract.ts"));
   expect(find(path.join(d,"target"),"gcscmarket11.contract.abi")).to.not.equal("");
   expect(find(path.join(d,"target"),"gcscmarket11.contract.wasm")).to.not.equal("");
 });
 it("declares fixed-price, auction, partial-refund and relist actions",function(){
   const s=fs.readFileSync(path.join(CORE_DIR,"gcscmarket11.contract.ts"),"utf8");
   for(const a of ['@action("listlead")','@action("claimfixed")','@action("bid")','@action("finalize")','@action("confirmclose")','@action("expireclaim")'])
     expect(s).to.include(a);
   expect(s).to.include("refund_bps:u32=5000");
   expect(s).to.include("lead partial refund");
   expect(s).to.include("l.status=LEAD_LISTED");
 });
 it("keeps homeowner/project private data out of on-chain schema",function(){
   const s=fs.readFileSync(path.join(CORE_DIR,"gcscmarket11.contract.ts"),"utf8");
   expect(s).to.include("ref_hash:string");
   expect(s).to.not.include("phone:");
   expect(s).to.not.include("email:");
   expect(s).to.not.include("address:");
 });
});