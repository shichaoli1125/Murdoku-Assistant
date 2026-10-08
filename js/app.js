/* ============================================================
 * Murdoku 做题交互层（无求解，案件与逻辑解耦）
 * 交互（对齐官网）：
 *   点嫌疑人卡片 = 选中
 *   快速点格子    = 写入/取消该嫌疑人彩色首字母草稿（每格最多 9 个，3x3）
 *   长按格子      = 正式放置嫌疑人；长按已放置格 = 收回
 *   X 工具        = 点格子打叉/取消
 *   橡皮擦长按    = 清空全盘
 *   UNDO          = 逐步撤销
 * ============================================================ */
(function () {
  'use strict';

  var Registry = window.MurdokuCaseRegistry;

  var HOLD_MS = 550;   // 长按判定阈值（ms）
  var MOVE_TOL = 10;   // 长按期间允许的手指移动（px）

  // ---------- 当前案件与派生索引（loadCase 时重建） ----------
  var CASE = null;
  var N = 0;
  var regionAt = {}, objectAt = {}, peopleById = {}, carGroups = {};

  // ---------- 状态 ----------
  var state = null;

  function key(r, c) { return r + ',' + c; }

  function blankCells() {
    var cells = {};
    for (var r = 0; r < N; r++)
      for (var c = 0; c < N; c++)
        cells[key(r, c)] = { placed: null, notes: [], x: false };
    return cells;
  }

  function freshState() {
    return {
      cells: blankCells(),
      selected: null,
      tool: 'notes',       // notes | x
      seconds: 0,
      phase: 'solving',    // solving | solved
      errors: {},
      history: []
    };
  }

  function cell(k) { return state.cells[k]; }

  function pidAt(k) { var p = cell(k).placed; return p || null; }

  function isBlocked(k) {
    var o = objectAt[k];
    return !!(o && o.occupiable === false);
  }

  // 该行/列是否已有正式放置的人
  function rowColUsed(r, c) {
    for (var k in state.cells) {
      var p = state.cells[k].placed;
      if (!p) continue;
      var q = k.split(',');
      if (q[0] === String(r) || q[1] === String(c)) return true;
    }
    return false;
  }

  // ---------- 加载案件 ----------
  function loadCase(id) {
    var c = Registry.get(id);
    if (!c) throw new Error('案件不存在: ' + id);
    CASE = c;
    N = c.size;
    regionAt = {}; objectAt = {}; peopleById = {}; carGroups = {};

    c.regions.forEach(function (reg) {
      reg.cells.forEach(function (cc) { regionAt[cc[0] + ',' + cc[1]] = reg; });
    });
    c.objects.forEach(function (o) { objectAt[o.r + ',' + o.c] = o; });
    c.people.forEach(function (p) { peopleById[p.id] = p; });

    // 车：聚合同名车各格，取最左起点与跨度
    c.objects.forEach(function (o) {
      if (o.type === 'car') {
        if (!carGroups[o.car]) carGroups[o.car] = { color: o.car, r: o.r, c0: o.c, span: o.span, cols: [] };
        carGroups[o.car].cols.push(o.c);
      }
    });
    Object.keys(carGroups).forEach(function (k) {
      carGroups[k].c0 = Math.min.apply(null, carGroups[k].cols);
    });

    state = freshState();
    state.selected = c.people[0].id;

    resetTimer();
    hideAllModals();
    updateCaseHeader();
    render();
  }

  function updateCaseHeader() {
    document.getElementById('caseTitle').textContent = CASE.title;
    document.getElementById('caseTitleZh').textContent = CASE.titleZh;
    document.getElementById('caseDiff').textContent = CASE.difficulty;
    document.getElementById('timer').textContent = '00:00';
  }

  // ---------- 计时 ----------
  var timer = null;
  function startTimer() {
    if (timer) return;
    timer = setInterval(function () {
      state.seconds++;
      document.getElementById('timer').textContent = fmtTime(state.seconds);
    }, 1000);
  }
  function resetTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    state.seconds = 0;
    document.getElementById('timer').textContent = '00:00';
  }
  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  // ---------- 历史（整盘快照） ----------
  function snapshot() {
    var o = {};
    for (var k in state.cells) {
      o[k] = { placed: state.cells[k].placed, notes: state.cells[k].notes.slice(), x: state.cells[k].x };
    }
    return o;
  }
  function restore(o) {
    var n = {};
    for (var k in o) n[k] = { placed: o[k].placed, notes: o[k].notes.slice(), x: o[k].x };
    state.cells = n;
  }
  function pushHistory() {
    state.history.push(snapshot());
    if (state.history.length > 200) state.history.shift();
  }

  // ---------- 动作 ----------
  function toggleNote(k, pid) {
    var cc = cell(k), i = cc.notes.indexOf(pid);
    pushHistory();
    if (i >= 0) cc.notes.splice(i, 1);
    else if (cc.notes.length < 9) cc.notes.push(pid);
    startTimer();
    clearErrors();
    render();
  }

  function place(pid, k) {
    pushHistory();
    var cc = cell(k);
    cc.placed = pid;
    var i = cc.notes.indexOf(pid);
    if (i >= 0) cc.notes.splice(i, 1);
    startTimer();
    clearErrors();
    render();
  }

  function unplace(pid) {
    pushHistory();
    for (var k in state.cells) if (state.cells[k].placed === pid) state.cells[k].placed = null;
    clearErrors();
    render();
  }

  function toggleX(k) {
    pushHistory();
    var cc = cell(k);
    cc.x = !cc.x;
    cc.notes = [];        // 填入 X 时清除格子内所有标记
    startTimer();
    clearErrors();
    render();
  }

  function undo() {
    var prev = state.history.pop();
    if (!prev) return;
    restore(prev);
    clearErrors();
    render();
  }

  function clearAll() {
    pushHistory();
    state.cells = blankCells();
    state.phase = 'solving';
    clearErrors();
    render();
  }

  function clearErrors() { state.errors = {}; }

  // ---------- 检查：所有人位置全部正确即破案 ----------
  function placementsMap() {
    var m = {};
    for (var k in state.cells) { var p = state.cells[k].placed; if (p) m[p] = k; }
    return m;
  }

  function check() {
    clearErrors();
    var placed = placementsMap();
    var allCorrect = true;
    CASE.people.forEach(function (p) {
      var want = CASE.answer[p.id], got = placed[p.id];
      if (got !== want) {
        allCorrect = false;
        if (got) state.errors[got] = true;
      }
    });
    if (allCorrect && Object.keys(placed).length === CASE.people.length) {
      state.phase = 'solved';
      render();
      showVictory();
    } else {
      render();
      flashStatus('还有位置不对，错误处已标红', false);
    }
  }

  // ---------- 渲染 ----------
  function render() {
    renderBoard();
    renderPeople();
    updateProgress();
  }

  function renderBoard() {
    var board = document.getElementById('board');
    board.innerHTML = '';
    board.style.setProperty('--grid-size', N);

    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var k = key(r, c);
        var reg = regionAt[k];
        var occ = objectAt[k];
        var cc = cell(k);
        var el = document.createElement('div');
        el.className = 'cell';
        el.style.background = reg.color;

        // 区域墙：与上/左邻不同区域则沿该边画粗黑墙（每道只画一次）
        var walls = [];
        if (r > 0 && regionAt[key(r - 1, c)].id !== reg.id) walls.push('inset 0 4px 0 var(--line)');
        if (c > 0 && regionAt[key(r, c - 1)].id !== reg.id) walls.push('inset 4px 0 0 var(--line)');
        if (walls.length) el.style.boxShadow = walls.join(',');

        var isCarPart = occ && occ.type === 'car';
        if (occ && !isCarPart) {
          if (occ.occupiable === false) el.classList.add('blocked-cell');
          var icon = document.createElement('div');
          icon.className = 'obj';
          icon.innerHTML = objSvg(occ);
          el.appendChild(icon);
        }

        // 彩色首字母草稿（3x3，最多 9）
        if (cc.notes.length) {
          var notes = document.createElement('div');
          notes.className = 'notes';
          cc.notes.forEach(function (pid) {
            var s = document.createElement('span');
            s.className = 'note-letter';
            s.textContent = pid;
            s.style.color = peopleById[pid].color;
            notes.appendChild(s);
          });
          el.appendChild(notes);
        }

        // X 标记
        if (cc.x) {
          var xm = document.createElement('div');
          xm.className = 'xmark';
          xm.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19"/></svg>';
          el.appendChild(xm);
        }

        var placedPid = cc.placed;
        if (!placedPid && state.tool === 'notes' && rowColUsed(r, c)) el.classList.add('locked');
        if (state.errors[k]) el.classList.add('error');

        if (placedPid) {
          var pp = peopleById[placedPid];
          var tok = document.createElement('div');
          tok.className = 'token' + (pp.victim ? ' victim' : '');
          tok.style.setProperty('--tc', pp.color);
          tok.innerHTML =
            '<svg viewBox="0 0 40 52"><path d="M20 6 C26 6 30 11 30 17 C30 23 26 26 25 27 C31 30 35 37 35 46 L5 46 C5 37 9 30 15 27 C14 26 10 23 10 17 C10 11 14 6 20 6 Z"/></svg>' +
            '<span class="token-letter">' + placedPid + '</span>';
          el.appendChild(tok);
        }

        bindCell(el, r, c);
        board.appendChild(el);
      }
    }

    // 跨格车图层
    Object.keys(carGroups).forEach(function (k) {
      var g = carGroups[k];
      var layer = document.createElement('div');
      layer.className = 'car-layer';
      layer.style.top = (g.r / N * 100) + '%';
      layer.style.height = (1 / N * 100) + '%';
      layer.style.left = (g.c0 / N * 100) + '%';
      layer.style.width = (g.span / N * 100) + '%';
      layer.innerHTML = objSvg({ type: 'car', car: k });
      board.appendChild(layer);
    });

    // 区域名铭牌
    CASE.regions.forEach(function (reg) {
      if (!reg.label) return;
      var lab = document.createElement('div');
      lab.className = 'region-label';
      lab.style.top = (reg.label[0] / N * 100) + '%';
      lab.style.left = (reg.label[1] / N * 100) + '%';
      lab.innerHTML = '<b>' + reg.nameZh + '</b><span>' + reg.name + '</span>';
      board.appendChild(lab);
    });

    // 铭牌自动收进棋盘，避免边缘被裁切
    Array.prototype.forEach.call(board.querySelectorAll('.region-label'), function (lab) {
      var br = board.getBoundingClientRect();
      var lr = lab.getBoundingClientRect();
      var dx = 0, dy = 0, pad = 2;
      if (lr.left < br.left + pad) dx = br.left + pad - lr.left;
      if (lr.right > br.right - pad) dx = br.right - pad - lr.right;
      if (lr.top < br.top + pad) dy = br.top + pad - lr.top;
      if (lr.bottom > br.bottom - pad) dy = br.bottom - pad - lr.bottom;
      if (dx || dy) lab.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
  }

  // ---------- 单元格 tap / 长按 判定 ----------
  function bindCell(el, r, c) {
    var k = key(r, c), timerId = null, fired = false, sx = 0, sy = 0;

    function clearHold() {
      if (timerId) { clearTimeout(timerId); timerId = null; }
      el.classList.remove('holding');
    }

    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired = false; sx = e.clientX; sy = e.clientY;
      el.classList.add('holding');
      timerId = setTimeout(function () {
        fired = true; timerId = null;
        el.classList.remove('holding');
        el.classList.add('holdfire');
        setTimeout(function () { el.classList.remove('holdfire'); }, 220);
        onHold(k, r, c);
      }, HOLD_MS);
    });

    el.addEventListener('pointermove', function (e) {
      if (timerId && Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE_TOL) clearHold();
    });

    el.addEventListener('pointerup', function () {
      clearHold();
      if (!fired) onTap(k, r, c);
    });

    el.addEventListener('pointercancel', clearHold);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function onTap(k, r, c) {
    if (state.tool === 'x') { toggleX(k); return; }
    var cc = cell(k);
    if (cc.placed) return;                       // 已放置：短按无反应
    if (isBlocked(k) || rowColUsed(r, c)) return;
    toggleNote(k, state.selected);
  }

  function onHold(k, r, c) {
    if (state.tool === 'x') { toggleX(k); return; }
    var cc = cell(k);
    if (cc.placed) { unplace(cc.placed); return; }   // 长按已放置格 = 收回
    if (isBlocked(k) || rowColUsed(r, c)) return;
    place(state.selected, k);
  }

  function renderPeople() {
    var wrap = document.getElementById('people');
    wrap.innerHTML = '';
    var placed = placementsMap();
    CASE.people.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'person-card' +
        (state.selected === p.id ? ' selected' : '') +
        (placed[p.id] ? ' placed' : '') +
        (p.victim ? ' is-victim' : '');
      card.innerHTML =
        '<div class="avatar" style="--tc:' + p.color + '">' +
        '<svg viewBox="0 0 40 52"><path d="M20 6 C26 6 30 11 30 17 C30 23 26 26 25 27 C31 30 35 37 35 46 L5 46 C5 37 9 30 15 27 C14 26 10 23 10 17 C10 11 14 6 20 6 Z"/></svg>' +
        '<b>' + p.id + '</b></div>' +
        '<div class="p-name">' + p.name + (p.victim ? ' <em>受害者</em>' : '') + '</div>' +
        '<div class="clue">' + CASE.clues[p.id].zh +
        '<span class="clue-en">' + CASE.clues[p.id].en + '</span></div>';
      card.addEventListener('click', function () {
        state.selected = p.id;
        if (state.tool === 'x') state.tool = 'notes';
        render();
      });
      wrap.appendChild(card);
    });
  }

  function updateProgress() {
    var count = Object.keys(placementsMap()).length;
    document.getElementById('progress').textContent = count + ' / ' + CASE.people.length;
    document.getElementById('btnX').classList.toggle('active', state.tool === 'x');
    document.getElementById('btnCheck').disabled = count !== CASE.people.length;
  }

  // ---------- SVG 物件 ----------
  function objSvg(o) {
    if (o.type === 'car') {
      var fill = o.car === 'blue' ? '#8fb0e8' : '#e7e0cf';
      var W = carGroups[o.car].span * 40;
      return '<svg class="svg-car" viewBox="0 0 ' + W + ' 40" preserveAspectRatio="none">' +
        '<rect x="3" y="11" width="' + (W - 6) + '" height="18" rx="6" fill="' + fill + '" stroke="#33405c" stroke-width="2"/>' +
        '<rect x="' + (W * 0.30) + '" y="5" width="' + (W * 0.40) + '" height="12" rx="4" fill="' + fill + '" stroke="#33405c" stroke-width="2"/>' +
        '<circle cx="12" cy="30" r="6" fill="#2b3350"/><circle cx="' + (W - 12) + '" cy="30" r="6" fill="#2b3350"/></svg>';
    }
    var map = {
      table: ICON.table, tv: ICON.tv, shelf: ICON.shelf, plant: ICON.plant,
      chair: ICON.chair, oil: ICON.oil, boulder: ICON.boulder,
      lounge: ICON.lounge, carpet: ICON.carpet
    };
    return '<svg class="svg-obj" viewBox="0 0 40 40">' + (map[o.type] || '') + '</svg>';
  }

  var ICON = {
    table: '<rect x="4" y="12" width="32" height="9" rx="2" fill="#5a6178" stroke="#31384c" stroke-width="2"/><rect x="7" y="21" width="4" height="11" fill="#5a6178"/><rect x="29" y="21" width="4" height="11" fill="#5a6178"/>',
    tv: '<rect x="8" y="7" width="24" height="18" rx="2" fill="#dff1f4" stroke="#31384c" stroke-width="2"/><path d="M14 12 l5 4 -5 4" fill="none" stroke="#3aa6a0" stroke-width="2"/><rect x="15" y="25" width="10" height="4" fill="#5a6178"/><rect x="11" y="29" width="18" height="4" rx="1" fill="#5a6178"/>',
    shelf: '<rect x="7" y="6" width="26" height="28" rx="1" fill="#7f8aa8" stroke="#31384c" stroke-width="2"/><line x1="7" y1="15" x2="33" y2="15" stroke="#31384c" stroke-width="2"/><line x1="7" y1="24" x2="33" y2="24" stroke="#31384c" stroke-width="2"/><rect x="10" y="8" width="4" height="6" fill="#b8c2dd"/><rect x="16" y="8" width="4" height="6" fill="#9aa6c8"/><rect x="22" y="17" width="4" height="6" fill="#b8c2dd"/>',
    plant: '<path d="M20 34 V20" stroke="#3f7a46" stroke-width="2"/><path d="M20 22 C12 18 10 10 12 8 C18 10 20 16 20 20 Z" fill="#5aa862"/><path d="M20 22 C28 18 30 10 28 8 C22 10 20 16 20 20 Z" fill="#6fbb72"/><path d="M20 18 C20 10 24 6 26 6 C26 12 24 16 20 18 Z" fill="#7ccb82"/><path d="M14 34 h12 l-2 4 h-8 z" fill="#b07a52"/>',
    chair: '<rect x="12" y="9" width="16" height="14" rx="4" fill="#e7e3ee" stroke="#5a5470" stroke-width="2"/><rect x="9" y="11" width="4" height="12" rx="2" fill="#d4cee0" stroke="#5a5470" stroke-width="2"/><rect x="27" y="11" width="4" height="12" rx="2" fill="#d4cee0" stroke="#5a5470" stroke-width="2"/><rect x="13" y="23" width="14" height="4" fill="#e7e3ee" stroke="#5a5470" stroke-width="2"/>',
    oil: '<path d="M10 22 C10 14 18 10 20 10 C22 10 30 14 30 22 C30 29 25 32 20 32 C15 32 10 29 10 22 Z" fill="#3a3a3f"/><ellipse cx="17" cy="20" rx="3" ry="4" fill="#5c5c63"/>',
    boulder: '<path d="M10 30 C6 24 9 14 16 11 C24 7 33 13 32 21 C32 27 27 31 21 31 Z" fill="#9b9b96" stroke="#6c6c67" stroke-width="2"/><path d="M14 22 C16 18 20 16 24 16" fill="none" stroke="#c4c4bf" stroke-width="2"/>',
    lounge: '<rect x="7" y="14" width="26" height="8" rx="3" fill="#f3e3c2" stroke="#9a7b4e" stroke-width="2"/><rect x="7" y="22" width="26" height="5" rx="2" fill="#e6cf9f" stroke="#9a7b4e" stroke-width="2"/><rect x="26" y="12" width="6" height="16" rx="3" fill="#f0dcb4" stroke="#9a7b4e" stroke-width="2"/><line x1="11" y1="18" x2="24" y2="18" stroke="#c9ad77" stroke-width="1.5"/>',
    carpet: '<rect x="6" y="8" width="28" height="24" rx="2" fill="#f27d72" stroke="#b54b42" stroke-width="2"/><rect x="10" y="12" width="20" height="16" rx="1" fill="none" stroke="#ffd0c8" stroke-width="1.6"/><line x1="20" y1="12" x2="20" y2="28" stroke="#ffd0c8" stroke-width="1.4"/>'
  };

  // ---------- 弹窗 ----------
  function showVictory() {
    var killer = peopleById[CASE.killer];
    document.getElementById('victoryName').textContent = killer.name;
    document.getElementById('victoryModal').classList.add('show');
    if (timer) { clearInterval(timer); timer = null; }
  }

  function hideAllModals() {
    var el = document.getElementById('victoryModal');
    if (el) el.classList.remove('show');
  }

  var statusTimer = null;
  function flashStatus(text, ok) {
    var el = document.getElementById('statusMsg');
    el.textContent = text;
    el.className = 'show' + (ok ? ' ok' : '');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { el.className = ''; }, 2200);
  }

  // ---------- 案件切换器 ----------
  function sortedCases() {
    return Registry.all().sort(function (a, b) {
      var oa = (a.order == null ? 999 : a.order), ob = (b.order == null ? 999 : b.order);
      return oa - ob;
    });
  }

  function buildSwitcher() {
    var sel = document.getElementById('caseSelect');
    sel.innerHTML = '';
    sortedCases().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.titleZh || c.title) + ' · ' + (c.difficulty || '') + ' · ' + c.size + '×' + c.size;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () { loadCase(sel.value); });
  }

  // ---------- 工具：X / 橡皮擦（长按清空）/ UNDO / 检查 ----------
  document.getElementById('btnX').addEventListener('click', function () {
    state.tool = state.tool === 'x' ? 'notes' : 'x';
    render();
  });

  (function bindEraser() {
    var er = document.getElementById('btnErase'), t = null, fired = false;
    function cancel() {
      if (t) { clearTimeout(t); t = null; }
      er.classList.remove('holding');
      try { er.releasePointerCapture && er._pid != null && er.releasePointerCapture(er._pid); } catch (e) {}
    }
    er.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      fired = false;
      try { er._pid = e.pointerId; er.setPointerCapture(e.pointerId); } catch (err) {}
      er.classList.add('holding');
      t = setTimeout(function () {
        fired = true; t = null; er.classList.remove('holding'); clearAll();
      }, 600);
    });
    er.addEventListener('pointerup', function () {
      cancel();
      if (!fired) flashStatus('长按橡皮擦可清空全盘', true);
    });
    er.addEventListener('pointercancel', cancel);
    er.addEventListener('lostpointercapture', function () { if (t) { clearTimeout(t); t = null; } er.classList.remove('holding'); });
    er.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnCheck').addEventListener('click', check);
  document.getElementById('btnAgain').addEventListener('click', function () {
    document.getElementById('victoryModal').classList.remove('show');
    clearAll();
    resetTimer();
  });

  // ---------- 启动 ----------
  if (Registry.count() === 0) {
    document.getElementById('caseTitle').textContent = '暂无案件';
    return;
  }
  buildSwitcher();
  var firstId = sortedCases()[0].id;
  document.getElementById('caseSelect').value = firstId;
  loadCase(firstId);
})();
