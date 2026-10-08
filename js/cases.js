/* ============================================================
 * 官方案件数据（做题用，不含求解逻辑）
 * 案件：Car Repair（汽车修理店）— 官方难度 very easy，6×6
 * 来源：murdoku.com 免费可打印谜题 + 官方答案页
 *
 * 答案坐标 "r,c"（行从上到下 0-5，列从左到右 0-5）
 * ============================================================ */
(function (root) {
  'use strict';

  var CASES = [
    {
      id: 'car-repair',
      title: 'Car Repair',
      titleZh: '汽车修理店',
      difficulty: 'VERY EASY',
      size: 6,

      // 房间分区
      regions: [
        {
          id: 'reception', name: 'Reception Hall', nameZh: '接待厅',
          color: '#aebfd2', wallTo: ['waiting', 'garage'], label: [2, 1],
          cells: [
            [0, 0], [0, 1], [0, 2],
            [1, 0], [1, 1], [1, 2],
            [2, 0], [2, 1], [2, 2],
            [3, 0]
          ]
        },
        {
          id: 'waiting', name: 'Waiting Area', nameZh: '等候区',
          color: '#9fc0dd', label: [1, 3],
          cells: [
            [0, 3],
            [1, 3], [1, 4],
            [2, 3], [2, 4], [2, 5]
          ]
        },
        {
          id: 'storage', name: 'Storage', nameZh: '储藏室',
          color: '#b7a3cc', label: [1, 5],
          cells: [
            [0, 4], [0, 5],
            [1, 5]
          ]
        },
        {
          id: 'garage', name: 'Garage', nameZh: '车库',
          color: '#dde8da', label: [5, 2],
          cells: [
            [3, 1], [3, 2], [3, 3], [3, 4], [3, 5],
            [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5],
            [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
          ]
        }
      ],

      // 物件。occupiable: 能否站人
      objects: [
        // 不可站
        { r: 0, c: 0, type: 'table', occupiable: false },
        { r: 0, c: 2, type: 'table', occupiable: false },
        { r: 1, c: 1, type: 'table', occupiable: false },
        { r: 1, c: 2, type: 'table', occupiable: false },
        { r: 0, c: 3, type: 'tv', occupiable: false },
        { r: 0, c: 5, type: 'shelf', occupiable: false },
        { r: 2, c: 2, type: 'shelf', occupiable: false },
        { r: 3, c: 3, type: 'shelf', occupiable: false },
        { r: 3, c: 4, type: 'shelf', occupiable: false },
        { r: 1, c: 4, type: 'plant', occupiable: false },

        // 可站
        { r: 0, c: 1, type: 'chair', occupiable: true },
        { r: 2, c: 3, type: 'chair', occupiable: true },
        { r: 2, c: 4, type: 'chair', occupiable: true },
        { r: 4, c: 3, type: 'oil', occupiable: true },
        { r: 5, c: 1, type: 'oil', occupiable: true },

        // 蓝色轿车（横跨两格）
        { r: 4, c: 1, type: 'car', car: 'blue', span: 2, occupiable: true },
        { r: 4, c: 2, type: 'car', car: 'blue', span: 2, occupiable: true },
        // 米色轿车（横跨两格）
        { r: 5, c: 3, type: 'car', car: 'beige', span: 2, occupiable: true },
        { r: 5, c: 4, type: 'car', car: 'beige', span: 2, occupiable: true }
      ],

      // 人物（tokenColor 参照官方答案页棋子颜色）
      people: [
        { id: 'A', name: 'Anthony', color: '#c0613f' },
        { id: 'B', name: 'Brock', color: '#3f9b46' },
        { id: 'C', name: 'Crystal', color: '#3aa6a0' },
        { id: 'D', name: 'Diane', color: '#7f93c4' },
        { id: 'E', name: 'Emilio', color: '#7d5aa0' },
        { id: 'V', name: 'Vaughn', color: '#3f4d8f', victim: true }
      ],

      // 线索（官方原文 + 中文）
      clues: {
        A: { en: 'He was in a car.', zh: '他在一辆车里。' },
        B: { en: 'He was on an oil slick.', zh: '他在一块油渍上。' },
        C: { en: 'She was sitting in a chair.', zh: '她坐在一把椅子上。' },
        D: { en: 'She was alone in the Waiting Area.', zh: '她独自在等候区。' },
        E: { en: 'He was beside a shelf.', zh: '他在一个置物架旁。' },
        V: { en: 'The victim. He was alone with the murderer.', zh: '受害者，他与凶手独处一室。' }
      },

      // 官方标准答案
      answer: { A: '5,4', B: '4,3', C: '0,1', D: '2,5', E: '3,2', V: '1,0' },
      killer: 'C'
    }
  ];

  root.MurdokuCases = CASES;
})(typeof self !== 'undefined' ? self : this);
