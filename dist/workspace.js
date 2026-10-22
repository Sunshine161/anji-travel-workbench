/* Local trip overview. No booking or account integrations. */
const tripChecks=[
 {id:'outbound',title:'去程高铁',hint:'10/27 下午 · 上海虹桥 → 安吉',field:'车次、时刻与集合点',tab:'drive'},
 {id:'stay',title:'五人整套民宿',hint:'两／三卧 · 三晚总目标 ¥2,500',field:'房型、五人登记、含税总价与独享范围',tab:'stay'},
 {id:'car',title:'安吉当地取还车',hint:'一嗨卡罗拉 · 网点、库存、接驳待核',field:'门店、取还时刻与总费用',tab:'drive'},
 {id:'return',title:'返程高铁',hint:'10/30 下午／傍晚待选 · 安吉 → 虹桥',field:'车次、时刻与还车缓冲',tab:'drive'},
 {id:'museum',title:'博物院预约',hint:'周三常设展 · 查官方最新规则',field:'预约日期与入馆时段',tab:'plan'},
 {id:'weather',title:'出发前刷新天气',hint:'建议10/26再看 · 目前是10/22快照',field:'最近查看时间与雨天取舍',tab:'plan'},
 {id:'luggage',title:'五人行李装载',hint:'五座含驾驶员 · 五只大箱不能默认放下',field:'每人的箱包与门店确认结果',tab:'drive'}
];
function normalizeWorkspaceState(data={}){
 const result={tripChecks:{},stayQuotes:{},selectedStay:null,dayExtras:{},dayCompact:data.dayCompact===true};
 const own=data&&typeof data==='object'?data:{};
 for(const c of tripChecks){const old=own.tripChecks?.[c.id];if(old&&typeof old==='object')result.tripChecks[c.id]={status:['pending','checking','confirmed'].includes(old.status)?old.status:'pending',note:typeof old.note==='string'?old.note.slice(0,500):''};}
 for(const id of ['h8','h9','h10',...(window.STAY_RESEARCH||[]).map(s=>s.id)]){const q=own.stayQuotes?.[id];if(typeof q==='number'&&Number.isFinite(q)&&q>0&&q<=1000000)result.stayQuotes[id]=q;}
 if(['h8','h9','h10',...(window.STAY_RESEARCH||[]).map(s=>s.id)].includes(own.selectedStay))result.selectedStay=own.selectedStay;
 if(window.normalizeDayExtras)result.dayExtras=window.normalizeDayExtras(own.dayExtras);
 return result;
}
window.normalizeWorkspaceState=normalizeWorkspaceState;
Object.assign(state,normalizeWorkspaceState(state));
const money=v=>'¥'+Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
function showTab(id){const b=document.querySelector('.nav [data-tab="'+id+'"]');if(b)b.click();}
function updateOverview(){
 const total=state.budget.reduce((a,b)=>a+Number(b),0),stay=Number(state.budget[1]);
 $('#quickTotal').textContent=money(total);$('#quickGap').textContent=total>6000?'较 ¥6,000 目标 +'+money(total-6000):'距 ¥6,000 目标还余 '+money(6000-total);
 $('#stayMetric').textContent=money(stay);$('#stayMetricDetail').textContent='人均 '+money(stay/5)+' · 三晚合计';$('#totalMetric').textContent=money(total);$('#totalMetricDetail').textContent='人均 '+money(total/5)+' · '+(total>6000?'超目标 '+money(total-6000):'剩余 '+money(6000-total));
 const done=tripChecks.filter(c=>state.tripChecks?.[c.id]?.status==='confirmed').length;$('#pendingCount').textContent=tripChecks.length-done;$('#checkProgress').textContent=done+' / '+tripChecks.length;
 const selected=(window.STAY_RESEARCH||[]).find(h=>h.id===state.selectedStay)||hotels.find(h=>h.id===state.selectedStay);$('#chosenStayTitle').textContent=selected?'暂选：'+selected.name.split('｜')[0]:'8家收藏民宿，已有价格可比较';$('#chosenStayDetail').textContent=selected?'当前住宿预算 '+money(stay)+'，人均三晚 '+money(stay/5)+'。这是规划选择，未预订；费用明细、余房和各套未核事项见住宿对比。':'亲墅庭院三卧 ¥1,954；山景棋牌三卧 ¥2,119；逸竹 ¥2,433。均为10/27–30三晚列表快照；云起川另列估算价。';
 const titles=state.tripStyle==='comfort'?['高铁抵达，在安吉取车','小杭坑，留半天给湖畔',state.route==='forest'?'金钱松，量力走一段':'竹海之后，去余村散步','还车进站，坐高铁回上海']:['高铁抵达，在安吉取车','博物院常设展，下午慢下来','去余村散步，回民宿休息','还车进站，坐高铁回上海'];
 $('#dayOverview').innerHTML=titles.map((title,i)=>{const extras=state.dayExtras?.[i]?.length||0;return `<button class="day-preview" data-open-day="${i}"><div class="day-date">${27+i}<small>OCT / ${['周二','周三','周四','周五'][i]}</small></div><div><h3>${esc(title)}</h3><p>${i===0?'虹桥 → 安吉站 → 民宿':i===3?'退房 → 安吉还车 → 虹桥':state.tripStyle==='comfort'?'主线与雨天备选都在这里':'免费公共区域为主 · 少跨区折返'}${extras?' · 自添 '+extras+' 项':''}</p></div><div class="day-weather">${weather[i][0]}<small>${weather[i][1]}</small></div></button>`}).join('');
}
window.updateOverview=updateOverview;
function renderChecks(){
 $('#bookingChecklist').innerHTML=tripChecks.map((c,i)=>{const entry=state.tripChecks[c.id]||{status:'pending',note:''};return `<details class="check-item ${entry.status==='confirmed'?'confirmed':''}" data-check-item="${c.id}"><summary><span class="check-icon">${entry.status==='confirmed'?'✓':String(i+1).padStart(2,'0')}</span><span class="check-text"><b>${c.title}</b><small>${c.hint}</small></span><span class="check-badge">${{pending:'待安排',checking:'待核实',confirmed:'已自行确认'}[entry.status]}</span></summary><div class="check-edit"><label>当前进度<select data-check-status="${c.id}" aria-label="${c.title}进度"><option value="pending" ${entry.status==='pending'?'selected':''}>待安排</option><option value="checking" ${entry.status==='checking'?'selected':''}>待核实</option><option value="confirmed" ${entry.status==='confirmed'?'selected':''}>已自行确认</option></select></label><label>${c.field}<input data-check-note="${c.id}" aria-label="${c.title}备注" value="${esc(entry.note)}" maxlength="500" placeholder="记录核对结果，勿填证件或支付资料"></label><button data-tab="${c.tab}">去相关页面 ↗</button></div></details>`}).join('');
}
document.addEventListener('change',e=>{
 const id=e.target.dataset.checkStatus;if(!id)return;const note=state.tripChecks[id]?.note||'';state.tripChecks[id]={status:e.target.value,note};const row=e.target.closest('.check-item');row.classList.toggle('confirmed',e.target.value==='confirmed');row.querySelector('.check-badge').textContent={pending:'待安排',checking:'待核实',confirmed:'已自行确认'}[e.target.value];row.querySelector('.check-icon').textContent=e.target.value==='confirmed'?'✓':String(tripChecks.findIndex(x=>x.id===id)+1).padStart(2,'0');save();
});
document.addEventListener('input',e=>{const id=e.target.dataset.checkNote;if(!id)return;state.tripChecks[id]={status:state.tripChecks[id]?.status||'pending',note:e.target.value};save();});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.openDay!==undefined){day=Number(b.dataset.openDay);renderDay();showTab('plan');}});
document.addEventListener('travel:change',updateOverview);
$('#pendingJump').onclick=()=>{$('#bookingChecklist').scrollIntoView({behavior:'smooth',block:'center'});$('#bookingChecklist details').open=true;};
$('#printTrip').onclick=()=>window.print();
$('#overviewWeather').innerHTML=weather.map((w,i)=>`<div class="weather-mini"><small>10.${27+i}</small><strong>${w[0]}</strong><span>${w[1]}</span><small>${i>1?'8–15天趋势':'短期预报'}</small></div>`).join('');
window.refreshWorkspace=()=>{Object.assign(state,normalizeWorkspaceState(state));renderChecks();window.renderStayWorkspace?.();window.refreshDayWorkspace?.();updateOverview();};
renderChecks();updateOverview();window.renderStayWorkspace?.();
