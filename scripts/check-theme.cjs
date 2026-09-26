const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('public/theme.js','utf8');
function setup({saved=null,dark=false,blocked=false}={}){
 const handlers={},events={},buttonEvents={},mediaEvents={};const label={},symbol={};
 const button={setAttribute(k,v){this[k]=v},querySelector(q){return q==='.theme-label'?label:symbol},addEventListener(k,v){buttonEvents[k]=v}};
 const root={dataset:{},style:{}};const storage={value:saved,getItem(){if(blocked)throw Error();return this.value},setItem(k,v){if(blocked)throw Error();this.value=v}};
 const media={matches:dark,addEventListener(k,v){mediaEvents[k]=v}};
 vm.runInNewContext(source,{localStorage:storage,document:{documentElement:root,querySelector(){return {setAttribute(){}}},querySelectorAll(){return [button]},addEventListener(k,v){handlers[k]=v}},window:{matchMedia(){return media},addEventListener(k,v){events[k]=v}}});
 handlers.DOMContentLoaded();return {root,storage,button,label,click:buttonEvents.click,system:mediaEvents.change,events};
}
let t=setup();assert.equal(t.root.dataset.theme,'light');assert.equal(t.label.textContent,'System');
t.click();assert.equal(t.storage.value,'light');assert.equal(t.label.textContent,'Light mode');
t.click();assert.equal(t.root.dataset.theme,'dark');assert.equal(t.storage.value,'dark');
t.system({matches:false});assert.equal(t.root.dataset.theme,'dark');
t.click();assert.equal(t.storage.value,'system');assert.equal(t.label.textContent,'System');assert.equal(t.root.dataset.theme,'light');
t.system({matches:true});assert.equal(t.root.dataset.theme,'dark');
t=setup({saved:'system',dark:true});assert.equal(t.root.dataset.theme,'dark');assert.equal(t.label.textContent,'System');
t=setup({saved:'light',dark:true});assert.equal(t.root.dataset.theme,'light');
t=setup({blocked:true,dark:true});assert.equal(t.root.dataset.theme,'dark');t.click();assert.equal(t.root.dataset.theme,'light');
t=setup();t.system({matches:true});assert.equal(t.root.dataset.theme,'dark');t.events.storage({key:'irisha-theme',newValue:'light'});assert.equal(t.root.dataset.theme,'light');
t.events.storage({key:'irisha-theme',newValue:'system'});assert.equal(t.label.textContent,'System');
t.events.storage({key:null,newValue:null});assert.equal(t.label.textContent,'System');
function luminance(c){return c.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
for(const [fg,bg] of [['#6B7280','#ffffff'],['#6B7280','#FAF9F6'],['#b9a9c5','#160e24'],['#ffffff','#1F2937'],['#1F2937','#FAF9F6'],['#51425e','#d1cbdc']]){let a=luminance(fg),b=luminance(bg);let r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(r>=4.5,`${fg} / ${bg}: ${r}`);console.log(`Contrast ${fg} / ${bg}: ${r.toFixed(2)}:1`)}
console.log('PASS: theme defaults, saved choice, blocked storage, system changes, cross-tab changes, toggle labels and selected text contrast pairs.');
const contrast=(fg,bg)=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
for(const [name,fg,bg,min] of [
  ['legal dialog copy','#1F2937','#FAF9F6',4.5],
  ['secondary text contrast','#6B7280','#FAF9F6',4.5],
  ['accent and icon contrast','#B08D57','#FAF9F6',2.9],
  ['hero eyebrow over worst-case white image beneath 72% dark scrim','#f0c5e1','#4f4c56',4.5],
  ['hero supporting copy','#eee2f1','#4f4c56',4.5],
  ['form focus on white','#B08D57','#ffffff',3],
  ['focus on light surface','#B08D57','#FAF9F6',2.9],
  ['hero focus','#f0c5e1','#4f4c56',3],
  ['interactive card edge','#B08D57','#ffffff',3],
  ['interactive card edge against page','#B08D57','#FAF9F6',2.9],
  ['legal link','#1F2937','#FAF9F6',4.5]
]){const ratio=contrast(fg,bg);assert(ratio>=min,`${name}: ${ratio}`);console.log(`PASS: ${name}: ${ratio.toFixed(2)}:1`)}
