/* ============================================================
 * Murdoku 做题交互层（无求解）
 * 状态：放置 placements、草稿叉 marks、当前人物、工具模式、计时、阶段
 * ============================================================ */
(function () {
  'use strict';

  var CASES = window.MurdokuCases;
  var CASE = CASES[0];
  var N = CASE.size;

  // ---------- 状态 ----------
  var state = {
    placements: {},        // pid -> "r,c"
    marks: {},             // pid -> { "r,c": true }
    selected: 'C',
    tool: 'place',         // place | x
    seconds: 0,
    phase: 'solving',      // solving | solved
    errors: {},            // "r,c": true 错误格
    history: []
  };

  // ---------- 索引 ----------
  var regionAt = {}, objectAt = {};
  CASE.regions.forEach(function (reg) {
    reg.cells.forEach(function (c) { regionAt[c[0] + ',' + c[1]] = reg; });
  });
  CASE.objects.forEach(function (o) {
    objectAt[o.r + ',' + o.c] = o;
  });
  var peopleById = {};
  CASE.people.forEach(function (p) { peopleById[p.id] = p; });

  // 车：取每台车的起始格与跨度
  var carGroups = {};
  CASE.objects.forEach(function (o) {
    if (o.type === 'car') {
      if (!carGroups[o.car]) carGroups[o.car] = { color: o.car, r: o.r, c0: o.c, span: o.span, cols: [] };
      carGroups[o.car].cols.push(o.c);
    }
  });
  Object.keys(carGroups).forEach(function (k) {
    var g = carGroups[k];
    g.c0 = Math.min.apply(null, g.cols);
  });

  function key(r, c) { return r + ',' + c; }
  function personAt(k) {
    for (var pid in state.placements) if (state.placements[pid] === k) return pid;
    return null;
  }
  function ensureMarks(pid) { if (!state.marks[pid]) state.marks[pid] = {}; return state.marks[pid]; }

  // ---------- 计时 ----------
  var timer = null;
  function startTimer() {
    if (timer) return;
    timer = setInterval(function () {
      state.seconds++;
      document.getElementById('timer').textContent = fmtTime(state.seconds);
    }, 1000);
  }
  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  // ---------- 动作 ----------
  function pushHistory() {
    state.history.push({
      placements: JSON.parse(JSON.stringify(state.placements)),
      marks: JSON.parse(JSON.stringify(state.marks))
    });
    if (state.history.length > 200) state.history.shift();
  }

  function place(pid, k) {
    var occ = objectAt[k];
    if (occ && occ.occupiable === false) return;       // 不可站
    pushHistory();
    // 若目标格已有自己以外的人，先移除对方
    var existing = personAt(k);
    if (existing && existing !== pid) delete state.placements[existing];
    state.placements[pid] = k;
    startTimer();
    clearErrors();
    render();
  }

  function remove(pid) {
    pushHistory();
    delete state.placements[pid];
    state.selected = pid;
    clearErrors();
    render();
  }

  function toggleMark(pid, k) {
    var occ = objectAt[k];
    if (occ && occ.occupiable === false) return;
    if (personAt(k)) return;
    pushHistory();
    var m = ensureMarks(pid);
    if (m[k]) delete m[k]; else m[k] = true;
    startTimer();
    render();
  }

  function undo() {
    var prev = state.history.pop();
    if (!prev) return;
    state.placements = prev.placements;
    state.marks = prev.marks;
    clearErrors();
    render();
  }

  function clearAll() {
    pushHistory();
    state.placements = {};
    state.marks = {};
    state.phase = 'solving';
    clearErrors();
    render();
  }

  function clearErrors() { state.errors = {}; }

  // ---------- 检查：所有人位置全部正确即破案 ----------
  function check() {
    clearErrors();
    var allCorrect = true;
    CASE.people.forEach(function (p) {
      var want = CASE.answer[p.id];
      var got = state.placements[p.id];
      if (got !== want) {
        allCorrect = false;
        if (got) state.errors[got] = true;
      }
    });
    if (allCorrect && Object.keys(state.placements).length === CASE.people.length) {
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

  function blockedBySel(k) {
    if (state.tool !== 'place') return false;
    var p = k.split(',');
    for (var pid in state.placements) {
      var q = state.placements[pid].split(',');
      if (q[0] === p[0] || q[1] === p[1]) return true;
    }
    return false;
  }

  function renderBoard() {
    var board = document.getElementById('board');
    board.innerHTML = '';
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var k = key(r, c);
        var reg = regionAt[k];
        var occ = objectAt[k];
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.background = reg.color;

        // 区域墙：与上方/左方区域不同则沿该边画一道粗黑墙（bottom/right 由邻格绘制，保证每道墙只画一次）
        var wallShadows = [];
        if (r > 0 && regionAt[key(r - 1, c)].id !== reg.id) wallShadows.push('inset 0 4px 0 var(--line)');
        if (c > 0 && regionAt[key(r, c - 1)].id !== reg.id) wallShadows.push('inset 4px 0 0 var(--line)');
        if (wallShadows.length) cell.style.boxShadow = wallShadows.join(',');

        // 车的非起始格：不重复画整车
        var isCarPart = occ && occ.type === 'car';
        var carStart = false;
        if (isCarPart) {
          var g = carGroups[occ.car];
          carStart = (c === g.c0);
        }

        // 物件图层（车改成棋盘级图层，这里跳过）
        if (occ && !isCarPart) {
          if (occ.occupiable === false) cell.classList.add('blocked-cell');
          var icon = document.createElement('div');
          icon.className = 'obj';
          icon.innerHTML = objSvg(occ);
          cell.appendChild(icon);
        }

        // X 标记（当前选中人物的草稿）
        var marks = state.marks[state.selected] || {};
        if (marks[k]) {
          var xm = document.createElement('div');
          xm.className = 'xmark';
          xm.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19"/></svg>';
          cell.appendChild(xm);
        }

        // 封锁淡显
        var placedHere = personAt(k);
        if (!placedHere && blockedBySel(k)) cell.classList.add('locked');

        // 错误
        if (state.errors[k]) cell.classList.add('error');

        // 人物棋子
        if (placedHere) {
          var pp = peopleById[placedHere];
          var tok = document.createElement('div');
          tok.className = 'token' + (pp.victim ? ' victim' : '');
          tok.style.setProperty('--tc', pp.color);
          tok.innerHTML =
            '<svg viewBox="0 0 40 52"><path d="M20 6 C26 6 30 11 30 17 C30 23 26 26 25 27 C31 30 35 37 35 46 L5 46 C5 37 9 30 15 27 C14 26 10 23 10 17 C10 11 14 6 20 6 Z"/></svg>' +
            '<span class="token-letter">' + placedHere + '</span>';
          cell.appendChild(tok);
        }

        // 点击
        (function (kk, ph) {
          cell.addEventListener('click', function () {
            if (state.tool === 'x') { toggleMark(state.selected, kk); return; }
            if (ph === state.selected) remove(ph);
            else if (!ph) place(state.selected, kk);
          });
        })(k, placedHere);

        board.appendChild(cell);
      }
    }

    // 跨格车图层（棋盘级，不拦截点击）
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
  }

  function renderPeople() {
    var wrap = document.getElementById('people');
    wrap.innerHTML = '';
    CASE.people.forEach(function (p) {
      var card = document.createElement('div');
      var placed = !!state.placements[p.id];
      card.className = 'person-card' +
        (state.selected === p.id ? ' selected' : '') +
        (placed ? ' placed' : '') +
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
        render();
      });
      wrap.appendChild(card);
    });
  }

  function updateProgress() {
    var count = Object.keys(state.placements).length;
    document.getElementById('progress').textContent = count + ' / ' + CASE.people.length;
    document.getElementById('toolPlace').classList.toggle('active', state.tool === 'place');
    document.getElementById('toolX').classList.toggle('active', state.tool === 'x');
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
      chair: ICON.chair, oil: ICON.oil
    };
    return '<svg class="svg-obj" viewBox="0 0 40 40">' + (map[o.type] || '') + '</svg>';
  }

  var ICON = {
    table: '<rect x="4" y="12" width="32" height="9" rx="2" fill="#5a6178" stroke="#31384c" stroke-width="2"/><rect x="7" y="21" width="4" height="11" fill="#5a6178"/><rect x="29" y="21" width="4" height="11" fill="#5a6178"/>',
    tv: '<rect x="8" y="7" width="24" height="18" rx="2" fill="#dff1f4" stroke="#31384c" stroke-width="2"/><path d="M14 12 l5 4 -5 4" fill="none" stroke="#3aa6a0" stroke-width="2"/><rect x="15" y="25" width="10" height="4" fill="#5a6178"/><rect x="11" y="29" width="18" height="4" rx="1" fill="#5a6178"/>',
    shelf: '<rect x="7" y="6" width="26" height="28" rx="1" fill="#7f8aa8" stroke="#31384c" stroke-width="2"/><line x1="7" y1="15" x2="33" y2="15" stroke="#31384c" stroke-width="2"/><line x1="7" y1="24" x2="33" y2="24" stroke="#31384c" stroke-width="2"/><rect x="10" y="8" width="4" height="6" fill="#b8c2dd"/><rect x="16" y="8" width="4" height="6" fill="#9aa6c8"/><rect x="22" y="17" width="4" height="6" fill="#b8c2dd"/>',
    plant: '<path d="M20 34 V20" stroke="#3f7a46" stroke-width="2"/><path d="M20 22 C12 18 10 10 12 8 C18 10 20 16 20 20 Z" fill="#5aa862"/><path d="M20 22 C28 18 30 10 28 8 C22 10 20 16 20 20 Z" fill="#6fbb72"/><path d="M20 18 C20 10 24 6 26 6 C26 12 24 16 20 18 Z" fill="#7ccb82"/><path d="M14 34 h12 l-2 4 h-8 z" fill="#b07a52"/>',
    chair: '<rect x="12" y="9" width="16" height="14" rx="4" fill="#e7e3ee" stroke="#5a5470" stroke-width="2"/><rect x="9" y="11" width="4" height="12" rx="2" fill="#d4cee0" stroke="#5a5470" stroke-width="2"/><rect x="27" y="11" width="4" height="12" rx="2" fill="#d4cee0" stroke="#5a5470" stroke-width="2"/><rect x="13" y="23" width="14" height="4" fill="#e7e3ee" stroke="#5a5470" stroke-width="2"/>',
    oil: '<path d="M10 22 C10 14 18 10 20 10 C22 10 30 14 30 22 C30 29 25 32 20 32 C15 32 10 29 10 22 Z" fill="#3a3a3f"/><ellipse cx="17" cy="20" rx="3" ry="4" fill="#5c5c63"/>'
  };

  // ---------- 弹窗 ----------
  function showVictory() {
    var v = document.getElementById('victoryModal');
    var killer = peopleById[CASE.killer];
    document.getElementById('victoryName').textContent = killer.name;
    v.classList.add('show');
    clearInterval(timer);
  }

  var statusTimer = null;
  function flashStatus(text, ok) {
    var el = document.getElementById('statusMsg');
    el.textContent = text;
    el.className = 'show' + (ok ? ' ok' : '');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { el.className = ''; }, 2200);
  }

  // ---------- 工具栏事件 ----------
  document.getElementById('toolPlace').addEventListener('click', function () { state.tool = 'place'; render(); });
  document.getElementById('toolX').addEventListener('click', function () { state.tool = 'x'; render(); });
  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnCheck').addEventListener('click', check);
  document.getElementById('btnRules').addEventListener('click', function () {
    document.getElementById('rulesModal').classList.toggle('show');
  });
  document.getElementById('closeRules').addEventListener('click', function () {
    document.getElementById('rulesModal').classList.remove('show');
  });
  document.getElementById('btnAgain').addEventListener('click', function () {
    document.getElementById('victoryModal').classList.remove('show');
    state.seconds = 0; state.phase = 'solving'; timer = null;
    document.getElementById('timer').textContent = '00:00';
    clearAll();
  });

  // 案件标题
  document.getElementById('caseTitle').textContent = CASE.title;
  document.getElementById('caseTitleZh').textContent = CASE.titleZh;
  document.getElementById('caseDiff').textContent = CASE.difficulty;

  render();
})();
