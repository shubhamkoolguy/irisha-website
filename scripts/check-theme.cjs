const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('dist/theme.js','utf8');
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
for(const [fg,bg] of [['#65536f','#ffffff'],['#65536f','#faf8fc'],['#b9a9c5','#160e24'],['#ffffff','#ad2468'],['#ffffff','#7424b8'],['#922066','#faf8fc'],['#51425e','#d1cbdc']]){let a=luminance(fg),b=luminance(bg);let r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(r>=4.5,`${fg} / ${bg}: ${r}`);console.log(`Contrast ${fg} / ${bg}: ${r.toFixed(2)}:1`)}
console.log('PASS: theme defaults, saved choice, blocked storage, system changes, cross-tab changes, toggle labels and selected text contrast pairs.');
// Light-mode regressions include dark photographic islands and interactive edges.
const contrast=(fg,bg)=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
// Replace or add your new light-mode pairs inside the contrast check loop:
for(const [name,fg,bg,min] of [
  ['legal dialog copy', '#1F2937', '#FAF9F6', 4.5], // Updated with Deep Charcoal on Soft Cream
  ['secondary text contrast', '#6B7280', '#FAF9F6', 4.5], // Muted Grey on Soft Cream background
  ['accent and icon contrast', '#B08D57', '#FAF9F6', 3], // Champagne Gold accents on Soft Cream
  ['brand accent contrast', '#4B2E83', '#FAF9F6', 4.5], // Deep Purple on Soft Cream
  ['hero eyebrow over worst-case white image beneath 72% dark scrim','#f0c5e1','#4f4c56',4.5],
  ['hero supporting copy','#eee2f1','#4f4c56',4.5],
  ['form focus on white','#922066','#ffffff',3],
  ['focus on light surface','#922066','#faf8fc',3],
  ['hero focus','#f0c5e1','#4f4c56',3],
  ['interactive card edge','#8a729a','#ffffff',3],
  ['interactive card edge against page','#8a729a','#faf8fc',3],
  ['legal link','#4B2E83','#FAF9F6',4.5] // Deep Purple link on Soft Cream
]){const ratio=contrast(fg,bg);assert(ratio>=min,`${name}: ${ratio}`);console.log(`PASS: ${name}: ${ratio.toFixed(2)}:1`)}ratio}`);console.log(`PASS: ${name}: ${ratio.toFixed(2)}:1`)}
