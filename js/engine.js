/* ============================================================
 * Murdoku Core Engine
 * 谋杀数独：逻辑建模 + 线索谓词 + 回溯求解 / 唯一性校验
 * UMD：Node (module.exports) 与 浏览器 (window.MurdokuEngine) 通用
 *
 * 坐标系：行 r 从上到下 0..n-1；列 c 从左到右 0..n-1
 * 位置一律用 "r,c" 字符串表示
 * ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MurdokuEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- 可站 / 不可站物件分类 ----
  // 可占据：人可以站在该物件上；空地板(无物件)默认可站
  var OCCUPIABLE = {
    chair: true, bed: true, carpet: true, car: true, boat: true,
    path: true, puddle: true, bonsai: true
  };
  // 不可占据：桌子、电视、架子、箱子、灌木等
  var BLOCKED = {
    table: true, tv: true, shelf: true, box: true, shrub: true,
    plant: true, flowers: true, tree: true, rock: true, register: true,
    trashcan: true, lilypad: true
  };

  var key = function (r, c) { return r + ',' + c; };
  var parse = function (k) {
    var p = k.split(',');
    return { r: +p[0], c: +p[1] };
  };

  /* 构建棋盘上下文 */
  function buildBoard(caseData) {
    var n = caseData.size;
    var regionAt = {};        // "r,c" -> regionId
    var objectAt = {};        // "r,c" -> objectType
    var cellsByRegion = {};   // regionId -> [key...]
    var cellsWithObject = {}; // objectType -> [key...]
    var regionIds = [];

    (caseData.regions || []).forEach(function (reg) {
      regionIds.push(reg.id);
      cellsByRegion[reg.id] = [];
      reg.cells.forEach(function (cell) {
        var k = cell.length === 2 ? key(cell[0], cell[1]) : cell;
        regionAt[k] = reg.id;
        cellsByRegion[reg.id].push(k);
      });
    });

    (caseData.objects || []).forEach(function (o) {
      var k = key(o.r, o.c);
      objectAt[k] = o.type;
      if (!cellsWithObject[o.type]) cellsWithObject[o.type] = [];
      cellsWithObject[o.type].push(k);
    });

    // 所有格子
    var allCells = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) allCells.push(key(r, c));
    }

    return {
      n: n,
      regionAt: regionAt,
      objectAt: objectAt,
      cellsByRegion: cellsByRegion,
      cellsWithObject: cellsWithObject,
      regionIds: regionIds,
      allCells: allCells
    };
  }

  function isOccupiable(board, k) {
    var t = board.objectAt[k];
    if (!t) return true;                 // 空地板
    return !!OCCUPIABLE[t];
  }

  function sameRegion(board, a, b) {
    return board.regionAt[a] === board.regionAt[b];
  }

  // 四邻（上/下/左/右）
  function neighbors4(board, k) {
    var p = parse(k), out = [];
    var deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    deltas.forEach(function (d) {
      var r = p.r + d[0], c = p.c + d[1];
      if (r >= 0 && r < board.n && c >= 0 && c < board.n) out.push(key(r, c));
    });
    return out;
  }

  /* ============================================================
   * 线索谓词
   * pred: { type, ...参数 }
   * ctx: { board, loc(personId->key), person }
   * 返回 boolean
   * ============================================================ */

  // 方向工具：判断 a 是否相对 b 处于某方位
  var DIR = {
    north: function (a, b) { return a.r < b.r; },
    south: function (a, b) { return a.r > b.r; },
    west: function (a, b) { return a.c < b.c; },
    east: function (a, b) { return a.c > b.c; },
    northeast: function (a, b) { return a.r < b.r && a.c > b.c; },
    northwest: function (a, b) { return a.r < b.r && a.c < b.c; },
    southeast: function (a, b) { return a.r > b.r && a.c > b.c; },
    southwest: function (a, b) { return a.r > b.r && a.c < b.c; }
  };

  function evalPredicate(pred, ctx) {
    var board = ctx.board, loc = ctx.loc, self = ctx.person;
    var myKey = loc[self];
    var me = parse(myKey);

    switch (pred.type) {
      /* ---- 区域 ---- */
      case 'region':
        return board.regionAt[myKey] === pred.region;

      /* ---- 物件（本人站在某类物件上） ---- */
      case 'onObject':
        return board.objectAt[myKey] === pred.object;

      /* ---- 本人所在区域内存在 / 不存在某物件 ---- */
      case 'areaHasObject': {
        var cells = board.cellsByRegion[board.regionAt[myKey]];
        var has = cells.some(function (k) { return board.objectAt[k] === pred.object; });
        return pred.negate ? !has : has;
      }

      /* ---- 邻接物件：beside / not beside，且同一区域 ---- */
      case 'besideObject': {
        var adj = neighbors4(board, myKey).filter(function (k) {
          return sameRegion(board, myKey, k) && board.objectAt[k] === pred.object;
        });
        return pred.negate ? adj.length === 0 : adj.length > 0;
      }

      /* ---- 邻接某人 ---- */
      case 'besidePerson': {
        var other = loc[pred.person];
        if (other == null) return false;
        var touch = neighbors4(board, myKey).indexOf(other) !== -1 &&
                    sameRegion(board, myKey, other);
        return pred.negate ? !touch : touch;
      }

      /* ---- 方位关系（相对另一人） ---- */
      case 'dirOf': {
        var o = loc[pred.person];
        if (o == null) return false;
        var res = DIR[pred.dir](me, parse(o));
        if (pred.sameRegion && !sameRegion(board, myKey, o)) return false;
        return pred.negate ? !res : res;
      }

      /* ---- 精确行/列偏移 ---- */
      case 'exactOffset': {
        var oo = loc[pred.person];
        if (oo == null) return false;
        var op = parse(oo);
        var ok;
        if (pred.axis === 'row') ok = (me.r - op.r === pred.delta);
        else ok = (me.c - op.c === pred.delta);
        return ok;
      }

      /* ---- 对角线 ---- */
      case 'sameDiagonal': {
        var od = loc[pred.person];
        if (od == null) return false;
        var odp = parse(od);
        return Math.abs(me.r - odp.r) === Math.abs(me.c - odp.c);
      }

      /* ---- 行 / 列位置 ---- */
      case 'rowIs':
        return me.r === pred.value;
      case 'colIs':
        return me.c === pred.value;
      case 'topRow':
        return me.r === 0;
      case 'bottomRow':
        return me.r === board.n - 1;
      case 'firstCol':
        return me.c === 0;
      case 'lastCol':
        return me.c === board.n - 1;

      /* ---- 奇偶 ---- */
      case 'rowParity':
        return pred.parity === 'even' ? (me.r % 2 === 0) : (me.r % 2 === 1);
      case 'colParity':
        return pred.parity === 'even' ? (me.c % 2 === 0) : (me.c % 2 === 1);

      /* ---- 边 / 角 ---- */
      case 'edge': {
        var e = me.r === 0 || me.r === board.n - 1 || me.c === 0 || me.c === board.n - 1;
        return pred.negate ? !e : e;
      }
      case 'corner': {
        var cn = (me.r === 0 || me.r === board.n - 1) && (me.c === 0 || me.c === board.n - 1);
        return pred.negate ? !cn : cn;
      }

      /* ---- 全局：区域人数 ---- */
      case 'regionCount': {
        var regionCells = board.cellsByRegion[pred.region];
        var cnt = regionCells.filter(function (k) {
          return Object.keys(loc).some(function (p) { return loc[p] === k; });
        }).length;
        if (pred.exactly != null) return cnt === pred.exactly;
        if (pred.min != null) return cnt >= pred.min;
        if (pred.max != null) return cnt <= pred.max;
        return false;
      }

      /* ---- 全局：只有某人站在某物件上 ---- */
      case 'onlyOnObject': {
        var rightPerson = board.objectAt[loc[pred.person]] === pred.object;
        var others = Object.keys(loc).filter(function (p) { return p !== pred.person; });
        var noOther = others.every(function (p) { return board.objectAt[loc[p]] !== pred.object; });
        return rightPerson && noOther;
      }

      /* ---- 全局：两人在某区域独处 ---- */
      case 'aloneTogether': {
        var regCells = board.cellsByRegion[pred.region];
        var peopleInside = Object.keys(loc).filter(function (p) {
          return regCells.indexOf(loc[p]) !== -1;
        });
        if (peopleInside.length !== 2) return false;
        return peopleInside.indexOf(pred.a) !== -1 && peopleInside.indexOf(pred.b) !== -1;
      }

      default:
        /* 未知谓词默认成立（避免阻断），但会告警 */
        if (typeof console !== 'undefined') console.warn('Unknown predicate:', pred.type);
        return true;
    }
  }

  // 判断谓词依赖哪些人（用于增量求值：所依赖者都已放置才可判定）
  function predicateDeps(pred) {
    var deps = [];
    if (pred.person) deps.push(pred.person);
    if (pred.a) deps.push(pred.a);
    if (pred.b) deps.push(pred.b);
    return deps;
  }

  // 该谓词是否为全局谓词（需所有人放好才有意义）
  var GLOBAL_TYPES = {
    regionCount: true, onlyOnObject: true, aloneTogether: true
  };

  /* ============================================================
   * 求解器：回溯 + 行列唯一 + 谓词约束
   * 收集至多 limit 个解（用于唯一性校验）
   * ============================================================ */
  function solve(caseData, limit) {
    var board = buildBoard(caseData);
    limit = limit || 2;

    var people = caseData.people.map(function (p) { return p.id; });

    // 每个人的候选格 = 可占据格
    var domains = {};
    people.forEach(function (pid) {
      domains[pid] = board.allCells.filter(function (k) { return isOccupiable(board, k); });
    });

    // 线索分组
    var personPreds = {};   // pid -> [pred]
    var globalPreds = [];
    people.forEach(function (pid) { personPreds[pid] = []; });

    (caseData.clues || []).forEach(function (clue) {
      if (clue.who) {
        personPreds[clue.who].push(clue.pred);
      } else {
        globalPreds.push(clue.pred);
      }
    });

    var solutions = [];
    var loc = {};
    var usedRows = {}, usedCols = {};

    // 判定某个人已绑定的谓词（其依赖者均已放置，且非全局）
    function checkPersonPreds(pid) {
      var preds = personPreds[pid];
      for (var i = 0; i < preds.length; i++) {
        var pred = preds[i];
        if (GLOBAL_TYPES[pred.type]) continue; // 全局类留到叶子
        var deps = predicateDeps(pred).filter(function (d) { return d !== pid; });
        var ready = deps.every(function (d) { return loc[d] != null; });
        if (!ready) continue;
        var ok = evalPredicate(pred, { board: board, loc: loc, person: pid });
        if (!ok) return false;
      }
      return true;
    }

    // 叶子：检查所有人的全局类谓词 + 全局谓词
    function checkAllGlobal() {
      var i, pid, pred;
      for (pid in personPreds) {
        var preds = personPreds[pid];
        for (i = 0; i < preds.length; i++) {
          pred = preds[i];
          if (!GLOBAL_TYPES[pred.type]) continue;
          if (!evalPredicate(pred, { board: board, loc: loc, person: pid })) return false;
        }
      }
      for (i = 0; i < globalPreds.length; i++) {
        pred = globalPreds[i];
        // 全局谓词无固定 person，挂在第一人上下文求值（谓词内部不依赖 self）
        if (!evalPredicate(pred, { board: board, loc: loc, person: people[0] })) return false;
      }
      return true;
    }

    // 选 MRV（候选最少）的未放置者
    function pickPerson() {
      var best = null, bestCount = Infinity;
      for (var i = 0; i < people.length; i++) {
        var pid = people[i];
        if (loc[pid] != null) continue;
        var cnt = 0;
        var dom = domains[pid];
        for (var j = 0; j < dom.length; j++) {
          var p = parse(dom[j]);
          if (!usedRows[p.r] && !usedCols[p.c]) cnt++;
        }
        if (cnt < bestCount) { bestCount = cnt; best = pid; }
      }
      return best;
    }

    function backtrack() {
      if (solutions.length >= limit) return;
      if (Object.keys(loc).length === people.length) {
        if (checkAllGlobal()) solutions.push(JSON.parse(JSON.stringify(loc)));
        return;
      }
      var pid = pickPerson();
      if (pid == null) return;
      var dom = domains[pid];
      for (var i = 0; i < dom.length; i++) {
        var k = dom[i];
        var p = parse(k);
        if (usedRows[p.r] || usedCols[p.c]) continue;

        loc[pid] = k;
        usedRows[p.r] = true;
        usedCols[p.c] = true;

        if (checkPersonPreds(pid)) {
          // 新人的放置也可能让“依赖于他人”的旧谓词变得可判定
          var stillValid = true;
          for (var other in loc) {
            if (other === pid) continue;
            if (!checkPersonPreds(other)) { stillValid = false; break; }
          }
          if (stillValid) backtrack();
        }

        delete loc[pid];
        delete usedRows[p.r];
        delete usedCols[p.c];

        if (solutions.length >= limit) return;
      }
    }

    backtrack();
    return solutions;
  }

  // 校验案件是否唯一解；返回 { unique, solutions }
  function verifyUnique(caseData) {
    var sols = solve(caseData, 2);
    return { unique: sols.length === 1, solutions: sols };
  }

  /* 根据解计算凶手：与受害者同区域、且该区域只有他们两人 */
  function getKiller(caseData, solution) {
    var board = buildBoard(caseData);
    var victimId = caseData.people.filter(function (p) { return p.victim; })[0].id;
    var vk = solution[victimId];
    var reg = board.regionAt[vk];
    var inside = Object.keys(solution).filter(function (pid) {
      return board.regionAt[solution[pid]] === reg;
    });
    if (inside.length !== 2) return null;
    var other = inside.filter(function (pid) { return pid !== victimId; })[0];
    return other;
  }

  return {
    buildBoard: buildBoard,
    isOccupiable: isOccupiable,
    neighbors4: neighbors4,
    evalPredicate: evalPredicate,
    solve: solve,
    verifyUnique: verifyUnique,
    getKiller: getKiller,
    key: key,
    parse: parse,
    OCCUPIABLE: OCCUPIABLE,
    BLOCKED: BLOCKED
  };
});
