/* Day planning stays local; map points remain the original regional sketches. */
(() => {
  const validSpotIds = new Set(spots.map(p => p.id));
  const pointById = new Map([...spots, ...hotels].map(p => [p.id, p]));
  const mappedPoints = [...spots, ...hotels].filter(p => p.pos);
  let mapScope = 'all';
  let activePointId = '';
  let todayIds = new Set();
  const aliases = {
    p1: ['小杭坑'], p2: ['余村'], p3: ['中国大竹海', '大竹海'],
    p4: ['浙江自然博物院', '安吉馆', '博物院'], p5: ['江南天池'],
    p6: ['孝丰锅贴', '干挑面'], p7: ['农家山里菜'],
    p8: ['中国金钱松森林公园', '金钱松森林公园', '金钱松步道'],
    p9: ['马吉村'], p10: ['竹乡味道'], p11: ['子妍面馆'], p12: ['蓝房子咖啡']
  };

  function normalizeDayExtras(value) {
    const result = {};
    for (let d = 0; d < 4; d++) {
      const rows = value && Array.isArray(value[d]) ? value[d] : [];
      const used = new Set();
      result[d] = rows.filter(row => row && validSpotIds.has(row.spotId)).slice(0, 12).map((row, i) => {
        let id = typeof row.id === 'string' ? row.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) : '';
        if (!id || used.has(id)) id = `day-${d}-${i}`;
        while (used.has(id)) id += 'x';
        used.add(id);
        return {id, spotId: row.spotId, time: typeof row.time === 'string' ? row.time.trim().slice(0, 32) : '', note: typeof row.note === 'string' ? row.note.trim().slice(0, 180) : ''};
      });
    }
    return result;
  }
  window.normalizeDayExtras = normalizeDayExtras;
  state.dayExtras = normalizeDayExtras(state.dayExtras);
  state.dayCompact = state.dayCompact === true;

  function ensureAreas() {
    if (!$('#dayTools')) {
      const tools = document.createElement('div');
      tools.id = 'dayTools';
      tools.className = 'day-tools';
      tools.innerHTML = '<div class="day-density" role="group" aria-label="行程显示方式"><button type="button" data-day-density="full">详细</button><button type="button" data-day-density="compact">紧凑</button></div><button type="button" data-print-day>打印当天</button>';
      $('#daytitle').after(tools);
    }
    if (!$('#dayExtra')) {
      const extra = document.createElement('div');
      extra.id = 'dayExtra';
      $('#timeline').after(extra);
    }
    if (!$('#dayMapTools')) {
      const controls = document.createElement('div');
      controls.id = 'dayMapTools';
      controls.innerHTML = '<div class="day-map-scope" role="group" aria-label="地图地点范围"><button type="button" data-map-scope="all">全部示意点</button><button type="button" data-map-scope="today">当天地点</button></div><p id="dayMapStatus" class="note" aria-live="polite"></p>';
      $('#map').before(controls);
    }
  }

  function idsForTitle(title) {
    return spots.filter(p => (aliases[p.id] || [p.name]).some(name => title.includes(name))).map(p => p.id);
  }

  function mapActions(ids) {
    return ids.map(id => {
      const p = pointById.get(id);
      return p.pos && map ? `<button type="button" data-day-focus="${esc(id)}" aria-label="在示意地图查看${esc(p.name)}">看地图 · ${esc(p.name)}</button>` : link(navlink(p.name), `${p.name} · 高德核对`);
    }).join('');
  }

  function decorateCards() {
    todayIds = new Set();
    document.querySelectorAll('#timeline > article').forEach(card => {
      const title = card.querySelector('h3')?.textContent || '';
      const ids = idsForTitle(title);
      card.dataset.pointIds = ids.join(' ');
      ids.forEach(id => todayIds.add(id));
      card.querySelector('.day-map-actions')?.remove();
      if (ids.length) {
        const actions = document.createElement('div');
        actions.className = 'day-map-actions';
        actions.innerHTML = mapActions(ids);
        card.append(actions);
        card.classList.add('day-linked-card');
      }
    });
    for (const row of state.dayExtras[day]) todayIds.add(row.spotId);
  }

  function renderExtra() {
    const list = state.dayExtras[day];
    const extra = $('#dayExtra');
    const wasOpen = extra.querySelector('details')?.open === true;
    extra.innerHTML = `<div class="day-extra-heading"><h3>我的补充行程</h3><span class="micro">${list.length} / 12 站</span></div><p class="note day-extra-help">只调整你添加的地点，原推荐行程保留。新增项目的门票、停车与车程需另核，不会自动计入预算。</p><div class="day-extra-list timeline">${list.map((row, i) => {
      const p = pointById.get(row.spotId);
      return `<article class="day-extra-card day-linked-card" data-extra-id="${esc(row.id)}" data-point-ids="${esc(row.spotId)}"><small>${esc(row.time || '时间待定')} · 自行添加</small><h3>${esc(p.name)}</h3>${row.note ? `<p class="day-extra-note">${esc(row.note)}</p>` : ''}<div class="day-map-actions">${mapActions([p.id])}</div><div class="day-extra-controls"><button type="button" data-extra-action="up" data-extra-id="${esc(row.id)}" ${i === 0 ? 'disabled' : ''} aria-label="上移${esc(p.name)}">↑ 上移</button><button type="button" data-extra-action="down" data-extra-id="${esc(row.id)}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="下移${esc(p.name)}">↓ 下移</button><button type="button" data-extra-action="remove" data-extra-id="${esc(row.id)}" aria-label="移除${esc(p.name)}">移除</button></div></article>`;
    }).join('') || '<p class="day-extra-empty note">还没有补充地点。可以从收藏和地点清单中挑一站，留出休息与转场时间。</p>'}</div><details class="day-extra-add" ${wasOpen ? 'open' : ''}><summary>＋ 从地点清单加一站</summary><form id="dayExtraForm"><label>地点<select name="spotId" required aria-label="添加地点">${spots.map(p => `<option value="${esc(p.id)}">${state.fav.includes(p.id) ? '♥ ' : ''}${esc(p.name)}${p.pos ? '' : ' · 无示意坐标'}</option>`).join('')}</select></label><label>时间安排<input name="time" maxlength="32" placeholder="如 15:00 或午饭后" autocomplete="off"></label><label class="day-note-field">自己的备注<input name="note" maxlength="180" placeholder="如下雨就取消；先查停车入口" autocomplete="off"></label><button type="submit" ${list.length >= 12 ? 'disabled' : ''}>加入 10.${27 + day}</button></form></details><p id="dayExtraStatus" class="note" role="status"></p>`;
  }

  function refreshMarkerStyles() {
    markers.forEach((marker, i) => {
      const p = mappedPoints[i];
      if (!p) return;
      const selected = p.id === activePointId;
      marker.setStyle({radius: selected ? 11 : p.id[0] === 'h' ? 9 : 7, color: selected ? '#172f29' : '#fff', weight: selected ? 3 : 2, fillColor: p.id[0] === 'h' ? '#b96937' : '#365e45', fillOpacity: selected ? 1 : .95});
    });
  }

  function highlightCards(id) {
    activePointId = id;
    let matched = false;
    document.querySelectorAll('#timeline > article, #dayExtra article').forEach(card => {
      const active = (card.dataset.pointIds || '').split(' ').includes(id);
      card.classList.toggle('day-map-selected', active);
      matched ||= active;
    });
    refreshMarkerStyles();
    const point = pointById.get(id);
    if (point) $('#dayMapStatus').textContent = `${point.name} · 区域示意，入口请用高德核对。${matched ? '已标出相关行程。' : '尚未安排在当天，可从地点清单添加。'}`;
    return matched;
  }

  function focusPoint(id) {
    const p = pointById.get(id);
    if (!p?.pos || !map) return;
    const marker = markers[mappedPoints.findIndex(p => p.id === id)];
    if (marker && !map.hasLayer(marker)) marker.addTo(map);
    map.invalidateSize();
    map.setView(p.pos, Math.max(10, Math.min(map.getZoom(), 12)));
    marker?.openPopup();
    highlightCards(id);
    if (window.matchMedia('(max-width: 850px)').matches) $('#dayMapTools').scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function renderMapScope(fit = false) {
    document.querySelectorAll('[data-map-scope]').forEach(button => {
      const active = button.dataset.mapScope === mapScope;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const selected = mapScope === 'today' ? mappedPoints.filter(p => todayIds.has(p.id)) : mappedPoints;
    if (map) {
      markers.forEach((marker, i) => {
        if (!mappedPoints[i]) return;
        const visible = mapScope === 'all' || todayIds.has(mappedPoints[i].id);
        if (visible && !map.hasLayer(marker)) marker.addTo(map);
        if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
      });
      if (fit && selected.length) map.fitBounds(selected.map(p => p.pos), {padding: [35, 35], maxZoom: 11});
    }
    const links = mapScope === 'today' ? [...todayIds].map(id => pointById.get(id)).filter(Boolean) : [{name: '安吉站'}, ...spots, ...hotels];
    $('#maplinks').innerHTML = links.map(p => link(navlink(p.name), p.name)).join('') || '<span class="note">当天以交通、入住或休息为主，暂无可匹配地点。安吉站与最终住宿请通过交通、住宿页核对。</span>';
    const withoutPosition = [...todayIds].filter(id => !pointById.get(id)?.pos).length;
    $('#dayMapStatus').textContent = mapScope === 'today' ? `当天 ${todayIds.size} 个地点，${selected.length} 个有区域示意点${withoutPosition ? `；${withoutPosition} 个仅提供高德搜索` : ''}。${map ? '点位连线与导航时间未计算。' : '底图不可用，可用下方高德入口。'}` : '点击行程定位示意点；点击地图点位可标出当天相关行程。没有示意坐标的地点保留高德入口。';
    refreshMarkerStyles();
  }

  function applyDensity() {
    $('#plan').classList.toggle('day-is-compact', state.dayCompact);
    document.querySelectorAll('[data-day-density]').forEach(button => {
      const active = (button.dataset.dayDensity === 'compact') === state.dayCompact;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function enhanceDay() {
    ensureAreas();
    state.dayExtras = normalizeDayExtras(state.dayExtras);
    activePointId = '';
    decorateCards();
    renderExtra();
    applyDensity();
    renderMapScope(mapScope === 'today');
  }

  function changed() {
    save();
    window.dispatchEvent(new CustomEvent('travel:change', {detail: {source: 'day-workspace'}}));
  }

  function printDay() {
    document.getElementById('dayPrintSheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'dayPrintSheet';
    const label = document.createElement('p');
    label.className = 'day-print-date';
    label.textContent = `2026年10月${27 + day}日 · ${['周二', '周三', '周四', '周五'][day]} · 安吉五人旅行`;
    sheet.append(label);
    const elements = [$('#daytitle'), $('#weather'), $('#timeline')];
    if (state.dayExtras[day].length) {
      const heading = document.createElement('h3');
      heading.textContent = '我的补充行程';
      elements.push(heading, $('#dayExtra .day-extra-list'));
    }
    for (const element of elements) {
      const copy = element.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      copy.querySelectorAll('button, form, input, select, .day-extra-controls, .day-map-actions').forEach(node => node.remove());
      sheet.append(copy);
    }
    document.body.append(sheet);
    document.body.classList.add('printing-day');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-day');
      sheet.remove();
    }, {once: true});
    window.print();
  }

  const originalRenderDay = renderDay;
  renderDay = function () { originalRenderDay(); enhanceDay(); };
  window.refreshDayWorkspace = () => { state.dayExtras = normalizeDayExtras(state.dayExtras); renderDay(); };
  // The original rain listener captured the old function before this module loaded.
  $('#rain').addEventListener('change', enhanceDay);

  markers.forEach((marker, i) => {
    const p = mappedPoints[i];
    if (p) marker.on('click', () => highlightCards(p.id));
  });

  document.addEventListener('submit', event => {
    if (event.target.id !== 'dayExtraForm') return;
    event.preventDefault();
    const form = event.target;
    const spotId = form.elements.spotId.value;
    if (!validSpotIds.has(spotId) || state.dayExtras[day].length >= 12) return;
    const name = pointById.get(spotId).name;
    state.dayExtras[day].push({id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, spotId, time: form.elements.time.value.trim().slice(0, 32), note: form.elements.note.value.trim().slice(0, 180)});
    changed();
    enhanceDay();
    $('#dayExtraStatus').textContent = `${name}已加入 10.${27 + day}，保存于当前浏览器。`;
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.dayDensity) {
      state.dayCompact = button.dataset.dayDensity === 'compact';
      applyDensity();
      changed();
    } else if (button?.hasAttribute('data-print-day')) {
      printDay();
    } else if (button?.dataset.mapScope) {
      mapScope = button.dataset.mapScope;
      renderMapScope(true);
    } else if (button?.dataset.dayFocus) {
      focusPoint(button.dataset.dayFocus);
    } else if (button?.dataset.extraAction) {
      const list = state.dayExtras[day];
      const index = list.findIndex(row => row.id === button.dataset.extraId);
      if (index < 0) return;
      if (button.dataset.extraAction === 'remove') list.splice(index, 1);
      else {
        const next = index + (button.dataset.extraAction === 'up' ? -1 : 1);
        if (next < 0 || next >= list.length) return;
        [list[index], list[next]] = [list[next], list[index]];
      }
      changed();
      enhanceDay();
    } else if (!event.target.closest('button, a, input, select, textarea, summary')) {
      const card = event.target.closest('#timeline > article, #dayExtra article');
      const id = card?.dataset.pointIds?.split(' ').find(id => pointById.get(id)?.pos);
      if (id) focusPoint(id);
    }
  });
  enhanceDay();
})();
