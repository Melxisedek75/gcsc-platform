import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../apps/mobile/components/PaymentSheet.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('PaymentSheet.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let close;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(file)==='close')close=n.initializer;ts.forEachChild(n,visit)}visit(file);
test('hiding a running payment is allowed without clearing its operation guard',()=>{
 let hidden=0;const inFlight={current:true};vm.runInNewContext(`(${close.getText(file)})()`,{inFlight,onClose:()=>hidden++});
 assert.equal(hidden,1);assert.equal(inFlight.current,true);
});
