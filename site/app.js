const input=document.querySelector('#number'), results=document.querySelector('#results'), feedback=document.querySelector('#feedback');
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const fmt=v=>v==null?'Unavailable':money.format(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids=[...new Set(records.map(r=>String(r.number)))].sort((a,b)=>+a-+b);
document.querySelector('#buildings').innerHTML=ids.map(id=>'<option value="'+esc(id)+'">'+esc(records.find(r=>String(r.number)===id).name)+'</option>').join('');
function metric(label,value,caption,isCount=false){return '<div class="metric"><label>'+label+'</label><div class="value '+(value==null?'pending':'')+'">'+(value==null?'Unverified':(isCount?String(value):fmt(value)))+'</div><small>'+esc(caption)+'</small></div>'}
function panel(r){return '<article class="panel"><div class="heading"><div><div class="eyebrow">BUILDING '+esc(r.number)+'</div><h2>'+esc(r.name)+'</h2><div class="muted">BIN '+esc(r.bin||'unavailable')+' · BBL '+esc(r.bbl)+' · FY 2027</div></div></div><div class="metrics">'+metric('Amount due January 4, 2027',r.due,'Total due on Q3 bill')+metric('Pied-à-terre tax',r.pat,'Surcharge included in the Q3 bill')+metric('Units subject to tax',r.count,'Units subject to pied-à-terre tax',true)+'</div><dl class="details">'+[['Market value',r.market],['Actual assessed value',r.actual],['Taxable assessed value',r.taxable]].map(([k,v])=>'<div><dt>'+k.toUpperCase()+'</dt><dd>'+fmt(v)+'</dd></div>').join('')+'</dl><p class="note">'+esc(r.note)+'</p><div class="links">'+(r.bill?'<a target="_blank" rel="noopener" href="'+esc(r.bill)+'">'+(r.bill.includes('acc_hist_det')?'View charge history':r.bill.includes('acc_hist_summ')?'View charge summary':'View tax bill')+' ↗</a>':'')+(r.ledger&&r.ledger!==r.bill?'<a target="_blank" rel="noopener" href="'+esc(r.ledger)+'">View charge history ↗</a>':'')+(r.source?'<a target="_blank" rel="noopener" href="'+esc(r.source)+'">Verify on DOF ↗</a>':'')+'</div>'+unitDetails(r)+'</article>'}
function show(){let query=input.value.trim(), hits=records.filter(r=>String(r.number)===query);feedback.textContent=hits.length?hits.length+' portfolio '+(hits.length===1?'entry':'entries')+' for building '+query:'No match for building '+query+'. Check the internal building number.';results.innerHTML=hits.map(panel).join('')}
document.querySelector('#lookup').addEventListener('submit',e=>{e.preventDefault();show()});input.value=ids.includes('1000')?'1000':ids[0];show();

function unitDetails(r){
 if(!r.units.length)return '';
 const rows=r.units.map(k=>{
  const a=unitAmounts[k]||[null,null,null,null];
  const href='https://a836-edms.nyc.gov/dctm-rest/repositories/dofedmspts/StatementSearch?stmtType=SOA&amp;stmtDate=20261114&amp;v=2&amp;bbl='+encodeURIComponent(k);
  return '<tr><td><a href="'+href+'" target="_blank" rel="noopener">'+esc(k)+' ↗</a></td>'+a.map((v,i)=>'<td>'+(i===2?(v??'Unavailable'):fmt(v))+'</td>').join('')+'</tr>';
 });
 return '<details><summary>Individual condo tax accounts ('+r.units.length+')</summary><div class="unit-scroll"><table><thead><tr><th>Tax lot (BBL)</th><th>January 4 amount due</th><th>Pied-à-terre</th><th>Units subject</th><th>Annual tax without surcharge</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details>'
}
