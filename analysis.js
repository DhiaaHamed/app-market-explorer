/* Pure analysis functions shared by the interface and Node tests. */
(function(root){
  'use strict';
  const label = value => value.toLowerCase().split('_').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');
  function filterApps(apps, f={}) { const query=(f.search||'').trim().toLocaleLowerCase(); return apps.filter(a=>(!query||a.name.toLocaleLowerCase().includes(query))&&(!f.category||a.category===f.category)&&(!f.type||a.type===f.type)&&a.reviews>=Number(f.reviews||0)); }
  function summarize(apps) { const ratings=apps.filter(a=>Number.isFinite(a.rating)); const paid=apps.filter(a=>a.type==='Paid').map(a=>a.price).sort((a,b)=>a-b); const free=apps.filter(a=>a.type==='Free').length; const mid=Math.floor(paid.length/2);return {count:apps.length,rated:ratings.length,mean:ratings.length?ratings.reduce((s,a)=>s+a.rating,0)/ratings.length:null,free,paid:paid.length,median:paid.length?(paid.length%2?paid[mid]:(paid[mid-1]+paid[mid])/2):null}; }
  function categoryCounts(apps) { const counts=new Map();apps.forEach(a=>counts.set(a.category,(counts.get(a.category)||0)+1));return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
  function ratingBins(apps) { const bins=[0,0,0,0,0]; apps.forEach(a=>{if(Number.isFinite(a.rating))bins[Math.min(4,Math.max(0,Math.floor(a.rating)-1))]++;});return bins; }
  function sortApps(apps, key='reviews') {return [...apps].sort((a,b)=>{let d=key==='name'?a.name.localeCompare(b.name):key==='rating'?(b.rating??-1)-(a.rating??-1):key==='price'?b.price-a.price:b.reviews-a.reviews;return d||a.name.localeCompare(b.name)||a.id-b.id;});}
  const api={label,filterApps,summarize,categoryCounts,ratingBins,sortApps}; if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Market=api;
})(typeof window==='undefined'?globalThis:window);
