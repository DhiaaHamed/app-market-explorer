'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./analysis.js'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/data.js','utf8'),sandbox);const apps=JSON.parse(JSON.stringify(sandbox.window.APP_DATA));
assert.equal(apps.length,9659);assert.equal(new Set(apps.map(a=>a.name)).size,9659);assert.equal(new Set(apps.map(a=>a.category)).size,33);
const summary=M.summarize(apps);assert.equal(summary.rated,8196);assert.equal(summary.free,8903);assert.equal(summary.paid,756);assert.equal(summary.median,2.99);assert.ok(Math.abs(summary.mean-4.17324)<0.0001);
assert.equal(M.categoryCounts(apps).reduce((s,x)=>s+x[1],0),9659);assert.equal(M.ratingBins(apps).reduce((a,b)=>a+b,0),8196);
assert.equal(M.filterApps(apps,{type:'Paid'}).length,756);assert.ok(M.filterApps(apps,{category:'FAMILY',reviews:10000,type:'Free'}).every(a=>a.category==='FAMILY'&&a.reviews>=10000&&a.type==='Free'));
assert.deepEqual(M.summarize([]),{count:0,rated:0,mean:null,free:0,paid:0,median:null});assert.equal(M.filterApps(apps,{search:'__no_matching_app_7b8e__'}).length,0);
const sample=[{id:0,name:'Alpha',category:'A',rating:null,reviews:0,price:0,type:'Free'},{id:1,name:'Beta',category:'B',rating:5,reviews:20,price:2,type:'Paid'},{id:2,name:'alpha two',category:'A',rating:4,reviews:10,price:4,type:'Paid'}];
assert.equal(M.filterApps(sample,{search:' ALPHA '}).length,2);assert.equal(M.summarize(sample).median,3);assert.equal(M.summarize(sample).mean,4.5);assert.deepEqual(M.ratingBins(sample),[0,0,0,1,1]);assert.equal(M.sortApps(sample,'rating')[2].name,'Alpha');assert.equal(M.sortApps(sample,'price')[0].name,'alpha two');assert.equal(sample[0].name,'Alpha');
assert.deepEqual(M.ratingBins([1,1.9,2,2.9,3,3.9,4,4.9,5].map(rating=>({rating}))),[2,2,2,2,1]);
for(const a of apps){assert.ok(a.rating===null||a.rating>=1&&a.rating<=5);assert.ok(Number.isFinite(a.price)&&a.price>=0);assert.ok(Number.isInteger(a.reviews)&&a.reviews>=0);assert.ok(['Free','Paid'].includes(a.type));}
for(const file of ['index.html','styles.css','app.js','analysis.js','data.js'])assert.ok(fs.statSync(__dirname+'/'+file).size>0);
console.log('PASS: source totals, numeric validity, combined filters, case-insensitive search, empty selections, missing ratings, median, rating boundaries, sorting and non-mutation.');
