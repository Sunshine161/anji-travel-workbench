/* Research references and user-entered planning quotes are kept separate. */
(() => {
  const TARGET = 2500;
  const filters = { scope: 'original', price: 'all', type: 'all', fun: false, fav: false };
  const labels = { total: '已核三晚列表价', estimate: '按单晚估算', unknown: '三晚待核' };
  const money = value => '¥' + Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const text = value => Array.isArray(value) ? value.join('；') : value == null || value === '' ? '待核实' : String(value);
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000;
  const records = () => Array.isArray(window.STAY_RESEARCH) ? window.STAY_RESEARCH : [];
  const find = id => records().find(item => item.id === id);
  const manualQuote = id => valid(state.stayQuotes?.[id]) ? state.stayQuotes[id] : null;
  const referenceQuote = item => item.priceType !== 'unknown' && valid(item.total) ? item.total : null;
  const quoteFor = item => manualQuote(item.id) ?? referenceQuote(item);
  const priceType = item => referenceQuote(item) === null ? 'unknown' : item.priceType === 'total' ? 'total' : 'estimate';
  const tripCost = quote => state.budget.reduce((sum, amount, index) => sum + (index === 1 ? quote : Number(amount)), 0);
  const gap = (amount, target) => amount > target ? '超出 ' + money(amount - target) : amount < target ? '还余 ' + money(target - amount) : '刚好达到目标';
  let host, dispatching = false;
  function persist() { dispatching = true; try { save(); } finally { dispatching = false; } }
  function matches(item) {
    const reference = referenceQuote(item);
    return (filters.scope === 'all' || item.original === true)
      && (filters.price === 'all' || (reference !== null && reference <= TARGET && (filters.price === 'estimate' || priceType(item) === 'total')))
      && (filters.type === 'all' || item.type === filters.type)
      && (!filters.fun || item.entertainmentVerified === true)
      && (!filters.fav || state.fav.includes(item.id));
  }
  function mount() {
    host = document.getElementById('stayCompare');
    if (!host) return false;
    if (host.dataset.swMounted) return true;
    host.dataset.swMounted = 'true';
    host.innerHTML = `<div class="sw-heading"><div><p class="sw-eyebrow">THREE NIGHTS, ONE HOME</p><h2>8家收藏民宿，逐套比较。</h2><p class="sw-sub">2026年10月27日入住 → 30日退房 · 5人 · 1套 · 共3晚</p></div><div class="sw-target">¥2,500 <small>住宿总目标 · 人均 ¥500 / 三晚</small></div></div>
      <p class="sw-boundary">价格分为三晚列表价、按单晚估算和待核。均不是下单终价；会员优惠、清洁费、五人登记及余房以最终房型订单为准。酒店公共娱乐不等于这套房私享。</p>
      <div class="sw-filters" aria-label="民宿筛选"><label>比较范围<select data-sw-filter="scope"><option value="original">截图中的8家</option><option value="all">全部11项（含替代房型）</option></select></label><label>三晚参考价<select data-sw-filter="price"><option value="all">全部价格状态</option><option value="total">预算内 · 已核总价</option><option value="estimate">预算内 · 含估算</option></select></label><label>空间类型<select data-sw-filter="type"><option value="all">全部空间类型</option><option value="整栋">只看整栋</option><option value="洋房整套">洋房整套</option><option value="楼内套房">楼内套房</option><option value="独享待核">独享待核</option></select></label><div class="sw-checks"><label><input type="checkbox" data-sw-filter="fun"> 房型有娱乐</label><label><input type="checkbox" data-sw-filter="fav"> 只看工作台收藏</label></div></div>
      <div class="sw-results-line"><p data-sw-count role="status"></p><button type="button" data-sw-reset>重置筛选</button></div><div data-sw-selection></div><div class="sw-grid" data-sw-grid></div>
      <p class="sw-footnote">核查快照：2026-10-22。预算筛选使用平台参考值；手填金额仅用于规划，不升级核实状态。截图收藏与本工作台收藏分别记录，收藏不会操作携程账号。数据与报价不会自动刷新。</p>`;
    host.addEventListener('input', onQuote);
    host.addEventListener('change', onChange);
    host.addEventListener('click', onAction);
    return true;
  }
  function selection() {
    const target = host.querySelector('[data-sw-selection]');
    const chosen = find(state.selectedStay) || (typeof hotels !== 'undefined' ? hotels.find(item => item.id === state.selectedStay) : null);
    if (!chosen) { target.innerHTML = ''; return; }
    const amount = find(chosen.id) ? quoteFor(chosen) : manualQuote(chosen.id);
    const amountText = amount === null ? '该候选当前没有可用试算金额。' : Number(state.budget[1]) === amount ? '当前住宿预算与该候选试算金额一致。' : '候选金额已变化或预算已另作调整，点击卡片上的试算按钮才会替换住宿预算。';
    target.innerHTML = `<div class="sw-selection" role="status"><div><strong>预算候选：${esc(chosen.name)}</strong><p>当前住宿预算 ${money(state.budget[1])} · ${esc(amountText)} 选择候选不表示已预订。</p></div><div class="sw-selection-actions">${Array.isArray(state.previousBudget) ? '<button type="button" data-sw-restore-budget>恢复上次预算</button>' : ''}<button type="button" data-sw-cancel>取消候选</button></div></div>`;
  }
  function priceSummary(item) {
    const kind = priceType(item), manual = manualQuote(item.id), amount = quoteFor(item);
    return `<span class="sw-price-tag sw-price-${kind}">${labels[kind]}</span>${manual !== null ? '<span class="sw-price-tag sw-price-manual">自行录入 · 规划试算</span>' : ''}<div class="sw-price-main"><strong>${amount === null ? '待核价' : money(amount)}</strong><span>${amount === null ? '五人一套三晚' : '一套三晚 · 人均 ' + money(amount / 5)}</span></div>${manual !== null ? `<p class="sw-reference">平台参考：${referenceQuote(item) === null ? '三晚金额待核' : money(referenceQuote(item)) + ' / 三晚'} · ${labels[kind]}</p>` : ''}<p class="sw-price-note">${esc(text(item.priceNote))}</p>${amount !== null ? `<p class="sw-gap${amount > TARGET ? ' sw-over' : ''}">住宿 ¥2,500 目标：${gap(amount, TARGET)}</p>` : ''}`;
  }
  function quoteResult(item) {
    const amount = quoteFor(item);
    if (amount === null) return '<p class="sw-empty">还没有三晚金额，可录入自己的含费总额再试算。</p>';
    return `<div><span>按此金额预计全程</span><b>${money(tripCost(amount))}</b></div><p class="sw-gap${tripCost(amount) > 6000 ? ' sw-over' : ''}">全程 ¥6,000 目标：${gap(tripCost(amount), 6000)}</p>`;
  }
  function card(item) {
    const id = esc(item.id), manual = manualQuote(item.id), amount = quoteFor(item);
    const score = typeof item.score === 'number' && Number.isFinite(item.score) && item.score > 0 ? item.score.toFixed(1) : null;
    const count = typeof item.reviews === 'number' ? item.reviews + '条评价' : '评价数待核';
    const capacity = typeof item.capacity === 'number' && item.capacity > 0 ? '房型标注可住' + item.capacity + '人' : '五位成人容量待核';
    return `<article class="sw-card${state.selectedStay === item.id ? ' sw-chosen' : ''}" data-sw-card="${id}">
      <div class="sw-card-top"><div class="sw-card-tags"><span class="sw-origin${item.original ? '' : ' sw-alternative'}">${item.original ? '原图收藏' : '替代房型'}</span><span class="sw-kind">${esc(text(item.type))}</span></div><button type="button" class="sw-fav" data-fav="${id}" aria-label="收藏${esc(item.name)}" aria-pressed="${state.fav.includes(item.id)}">${state.fav.includes(item.id) ? '♥ 已收藏' : '♡ 收藏'}</button></div>
      <h3>${esc(item.name)}</h3><p class="sw-room">${esc(text(item.room))}</p><p class="sw-area">${esc(text(item.area))}</p>
      <div class="sw-rating"><strong>${score === null ? '暂无评分' : score + '<small> / 5</small>'}</strong><span>${esc(count)}<small>${esc(text(item.scoreScope))}</small></span></div>${item.screenshotScore ? `<p class="sw-screenshot-score">截图口径：${esc(text(item.screenshotScore))}</p>` : ''}
      <div class="sw-pricing" data-sw-price>${priceSummary(item)}</div>
      ${item.recommend ? `<p class="sw-recommend">${esc(text(item.recommend))}</p>` : ''}
      <dl class="sw-facts"><div><dt>五人入住</dt><dd><span class="sw-badge${typeof item.capacity === 'number' && item.capacity >= 5 ? '' : ' sw-unconfirmed'}">${esc(capacity)}</span><small>查询人数筛选与正式房型容量分别核对。</small></dd></div><div><dt>房型与独享</dt><dd>${esc(text(item.type))} · ${esc(text(item.size))}<small>${esc(text(item.layout))}</small></dd></div><div><dt>娱乐设施</dt><dd>${item.entertainmentVerified ? '<span class="sw-badge">房型设施有记录</span>' : '<span class="sw-badge sw-unconfirmed">具体房型设施待核</span>'}<p>${esc(text(item.entertainment))}</p><small>${esc(text(item.entertainmentScope))}</small></dd></div><div><dt>附近景点</dt><dd>${esc(text(item.nearby))}</dd></div></dl>
      <details class="sw-detail"><summary>早餐、押金、取消及待核事项</summary><dl><div><dt>早餐</dt><dd>${esc(text(item.breakfast))}</dd></div><div><dt>押金</dt><dd>${esc(text(item.deposit))}</dd></div><div><dt>取消</dt><dd>${esc(text(item.cancellation))}</dd></div><div><dt>待核事项</dt><dd>${esc(text(item.limits))}</dd></div></dl></details>
      <div class="sw-source-links">${item.sourceUrl ? link(item.sourceUrl, item.sourceLabel || '查看平台来源') : '<span>准确房源链接待匹配</span>'}</div>
      <div class="sw-quote"><label for="sw-quote-${id}">自己的三晚总额 <span>仅用于规划，优先于参考价</span></label><div class="sw-input-wrap"><span aria-hidden="true">¥</span><input id="sw-quote-${id}" type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" placeholder="留空使用参考值" value="${manual === null ? '' : manual}" data-sw-quote="${id}" aria-describedby="sw-result-${id}" autocomplete="off"></div>
      <button type="button" class="sw-clear" data-sw-clear="${id}"${manual === null ? ' hidden' : ''}>清除自填金额，恢复平台参考</button><div id="sw-result-${id}" class="sw-result" aria-live="polite">${quoteResult(item)}</div><button type="button" class="sw-apply" data-sw-apply="${id}"${amount === null ? ' disabled' : ''}>用此金额试算预算</button><p class="sw-input-note">只替换住宿额度；不会预订，也不会确认房态。</p></div>
    </article>`;
  }
  function renderCards() {
    const list = records().filter(matches).slice().sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
    host.querySelector('[data-sw-count]').textContent = list.length + '项匹配 · ' + (filters.scope === 'original' ? '截图中的原始房源' : '原图与替代房型分别标记');
    host.querySelector('[data-sw-grid]').innerHTML = list.map(card).join('') || '<div class="sw-no-results"><strong>暂时没有符合条件的房型</strong><p>可将比较范围改为全部，或取消预算、娱乐和收藏筛选。未核实的报价不会进入已核预算筛选。</p></div>';
  }
  function render() {
    if (!mount() || dispatching) return;
    selection();
    // Autosave must not replace the amount field while the user is typing.
    if (host.contains(document.activeElement) && document.activeElement.dataset.swQuote) return;
    renderCards();
  }
  function updateQuoteCard(input, item) {
    const current = input.closest('[data-sw-card]');
    if (!current) return;
    current.querySelector('[data-sw-price]').innerHTML = priceSummary(item);
    current.querySelector('.sw-result').innerHTML = quoteResult(item);
    current.querySelector('[data-sw-apply]').disabled = quoteFor(item) === null;
    current.querySelector('[data-sw-clear]').hidden = manualQuote(item.id) === null;
    selection();
  }
  function onQuote(event) {
    const input = event.target.closest('[data-sw-quote]');
    const item = input && find(input.dataset.swQuote);
    if (!item) return;
    input.setCustomValidity('');
    const raw = input.value.trim(), amount = Number(raw);
    if (!input.validity.valid || (raw !== '' && (!valid(amount) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001))) {
      const current = input.closest('[data-sw-card]');
      current.querySelector('[data-sw-apply]').disabled = true;
      current.querySelector('.sw-result').innerHTML = '<p class="sw-empty sw-over">请输入0.01至1,000,000元，最多两位小数；已保存金额未修改。</p>';
      if (event.type === 'change') { input.setCustomValidity('请输入有效的三晚总额，最多保留两位小数。'); input.reportValidity(); }
      return;
    }
    state.stayQuotes = { ...(state.stayQuotes || {}) };
    if (raw === '') delete state.stayQuotes[item.id];
    else state.stayQuotes[item.id] = Math.round(amount * 100) / 100;
    persist(); updateQuoteCard(input, item);
  }
  function onChange(event) {
    const control = event.target.closest('[data-sw-filter]');
    if (control) { filters[control.dataset.swFilter] = control.type === 'checkbox' ? control.checked : control.value; renderCards(); return; }
    onQuote(event);
  }
  function onAction(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-sw-reset')) {
      Object.assign(filters, { scope: 'original', price: 'all', type: 'all', fun: false, fav: false });
      host.querySelectorAll('[data-sw-filter]').forEach(control => { if (control.type === 'checkbox') control.checked = filters[control.dataset.swFilter]; else control.value = filters[control.dataset.swFilter]; });
      renderCards(); return;
    }
    if (button.hasAttribute('data-sw-cancel')) { state.selectedStay = null; persist(); render(); return; }
    if (button.hasAttribute('data-sw-restore-budget') && Array.isArray(state.previousBudget)) {
      const previous = state.budget.slice(); state.budget = state.previousBudget.slice(); state.previousBudget = previous;
      persist(); budget(); render(); return;
    }
    const clearId = button.dataset.swClear;
    if (clearId && find(clearId)) {
      if (state.stayQuotes) delete state.stayQuotes[clearId];
      const input = button.closest('[data-sw-card]').querySelector('[data-sw-quote]');
      input.value = ''; input.setCustomValidity(''); persist(); updateQuoteCard(input, find(clearId)); return;
    }
    const item = find(button.dataset.swApply);
    if (!item) return;
    const amount = quoteFor(item);
    if (amount === null || button.disabled) return;
    if (Number(state.budget[1]) !== amount) { state.previousBudget = state.budget.slice(); state.budget[1] = amount; }
    state.selectedStay = item.id; persist(); budget();
    const restore = document.getElementById('restoreBudget');
    if (restore) restore.disabled = !Array.isArray(state.previousBudget);
    render();
  }
  window.renderStayWorkspace = render;
  document.addEventListener('travel:change', render);
  render();
})();
