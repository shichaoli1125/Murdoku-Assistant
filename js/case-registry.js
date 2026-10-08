/* ============================================================
 * 案件注册表（Case Registry）
 * 每个案件一个独立文件，加载后调用 register 自注册。
 * 新增案件：
 *   1) 在 js/cases/ 下新建 xxx.js，写入案件对象并调用
 *      MurdokuCaseRegistry.register({ ... })
 *   2) 在 index.html 里加一行 <script src="js/cases/xxx.js"></script>
 * ============================================================ */
(function (root) {
  'use strict';

  var list = [];
  var byId = {};

  // 轻量校验：只给警告，不阻断注册（方便开发期快速接入）
  function validate(c) {
    var warn = function (msg) {
      if (root.console && console.warn) console.warn('[case:' + (c.id || '?') + '] ' + msg);
    };
    var n = c.size;
    if (!n || n < 2) return warn('size 非法');

    // 区域需恰好覆盖全部格子
    var seen = {};
    (c.regions || []).forEach(function (reg) {
      (reg.cells || []).forEach(function (cell) {
        var k = cell[0] + ',' + cell[1];
        if (seen[k]) warn('区域格重复 ' + k);
        seen[k] = true;
      });
    });
    if (Object.keys(seen).length !== n * n) {
      warn('区域覆盖格数 ' + Object.keys(seen).length + '，应为 ' + (n * n));
    }

    // 人数应为 N，且含 1 名受害者
    var victimCount = (c.people || []).filter(function (p) { return p.victim; }).length;
    if ((c.people || []).length !== n) warn('人物数应为 ' + n);
    if (victimCount !== 1) warn('受害者数量应为 1，当前 ' + victimCount);

    // 答案：每行每列唯一，且不在不可站物件上
    var objAt = {};
    (c.objects || []).forEach(function (o) { objAt[o.r + ',' + o.c] = o; });
    var rows = {}, cols = {};
    Object.keys(c.answer || {}).forEach(function (pid) {
      var parts = c.answer[pid].split(','), r = parts[0], col = parts[1];
      if (rows[r]) warn('答案行重复 row ' + r);
      if (cols[col]) warn('答案列重复 col ' + col);
      rows[r] = 1; cols[col] = 1;
      var o = objAt[c.answer[pid]];
      if (o && o.occupiable === false) warn(pid + ' 的答案落在不可站物件 ' + c.answer[pid]);
    });
  }

  var Registry = {
    /** 注册一个案件；返回该案件 */
    register: function (c) {
      if (!c || typeof c !== 'object') throw new Error('案件必须是对象');
      if (!c.id) throw new Error('案件缺少 id');
      if (byId[c.id]) {
        if (root.console && console.warn) console.warn('[case:' + c.id + '] 已存在，忽略重复注册');
        return byId[c.id];
      }
      validate(c);
      list.push(c);
      byId[c.id] = c;
      return c;
    },
    /** 全部案件（注册顺序，可用案件的 order 字段控制） */
    all: function () { return list.slice(); },
    get: function (id) { return byId[id] || null; },
    count: function () { return list.length; }
  };

  root.MurdokuCaseRegistry = Registry;
})(typeof self !== 'undefined' ? self : this);
