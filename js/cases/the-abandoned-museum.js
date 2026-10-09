/* ============================================================
 * 案件：The Abandoned Museum（废弃博物馆）— 官方难度 HARD，9×9
 * 来源：murdoku.com 在线版（puzzle-the-abandoned-museum-hard）官方 JSON
 *       房间、物件、人物、线索、官方解与凶手，全部按官方数据还原。
 * ============================================================ */
(function (root) {
  'use strict';

  root.MurdokuCaseRegistry.register({
    id: 'the-abandoned-museum',
    order: 30,
    title: 'The Abandoned Museum',
    titleZh: '废弃博物馆',
    difficulty: 'HARD',
    size: 9,

    // 全局限制条件（本题无；部分案件会有，如“恰好有一个空房间”）
    globalClues: [],

    regions: [
      {
        id: 'lobby', name: 'Lobby', nameZh: '大厅',
        color: '#e4e8fd', label: [4, 2],
        cells: [
          [4, 2], [4, 3], [4, 4], [5, 2], [5, 3], [5, 4], [6, 2], [6, 3], [6, 4],
          [7, 2], [7, 3], [7, 4], [8, 2], [8, 3], [8, 4]
        ]
      },
      {
        id: 'vault', name: 'Vault', nameZh: '保险库',
        color: '#e6d9c7', label: [5, 0],
        cells: [
          [5, 0], [5, 1], [6, 0], [6, 1], [7, 0], [7, 1], [8, 0], [8, 1]
        ]
      },
      {
        id: 'exposition', name: 'Exposition', nameZh: '展区',
        color: '#b5afcf', label: [0, 0],
        cells: [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
          [2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [3, 4]
        ]
      },
      {
        id: 'security', name: 'Security', nameZh: '安保室',
        color: '#acc9cd', label: [7, 5],
        cells: [
          [7, 5], [7, 6], [7, 7], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8]
        ]
      },
      {
        id: 'cafe', name: 'Cafe', nameZh: '咖啡馆',
        color: '#b3c3fb', label: [4, 5],
        cells: [
          [4, 5], [4, 6], [4, 7], [4, 8], [5, 5], [5, 6], [5, 7], [5, 8],
          [6, 5], [6, 6], [6, 7], [6, 8]
        ]
      },
      {
        id: 'restroom', name: 'Restroom', nameZh: '洗手间',
        color: '#e3e3e3', label: [2, 0],
        cells: [
          [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [4, 1]
        ]
      },
      {
        id: 'main-gallery', name: 'Main Gallery', nameZh: '主展厅',
        color: '#9fb5c6', label: [0, 5],
        cells: [
          [0, 5], [0, 6], [0, 7], [0, 8], [1, 5], [1, 6], [1, 7], [1, 8],
          [2, 5], [2, 6], [2, 7], [2, 8], [3, 5], [3, 6], [3, 7], [3, 8]
        ]
      }
    ],

    objects: [
      { r: 0, c: 1, type: 'rubble', occupiable: false },
      { r: 0, c: 2, type: 'rubble', occupiable: false },
      { r: 0, c: 3, type: 'rubble', occupiable: false },
      { r: 0, c: 4, type: 'table', occupiable: false },
      { r: 0, c: 5, type: 'statue', occupiable: false },
      { r: 0, c: 6, type: 'rubble', occupiable: false },
      { r: 0, c: 8, type: 'statue', occupiable: false },
      { r: 2, c: 1, type: 'table', occupiable: false },
      { r: 2, c: 3, type: 'rubble', occupiable: false },
      { r: 2, c: 8, type: 'table', occupiable: false },
      { r: 3, c: 0, type: 'rubble', occupiable: false },
      { r: 3, c: 1, type: 'chair', occupiable: true },
      { r: 3, c: 3, type: 'rubble', occupiable: false },
      { r: 3, c: 4, type: 'rubble', occupiable: false },
      { r: 3, c: 5, type: 'statue', occupiable: false },
      { r: 3, c: 6, type: 'statue', occupiable: false },
      { r: 4, c: 7, type: 'chair', occupiable: true },
      { r: 4, c: 8, type: 'table', occupiable: false },
      { r: 5, c: 1, type: 'display', occupiable: false },
      { r: 5, c: 2, type: 'statue', occupiable: false },
      { r: 5, c: 8, type: 'display', occupiable: false },
      { r: 6, c: 2, type: 'chair', occupiable: true },
      { r: 6, c: 4, type: 'statue', occupiable: false },
      { r: 6, c: 5, type: 'chair', occupiable: true },
      { r: 6, c: 6, type: 'table', occupiable: false },
      { r: 6, c: 7, type: 'chair', occupiable: true },
      { r: 7, c: 0, type: 'display', occupiable: false },
      { r: 7, c: 1, type: 'statue', occupiable: false },
      { r: 7, c: 2, type: 'chair', occupiable: true },
      { r: 7, c: 4, type: 'rubble', occupiable: false },
      { r: 7, c: 7, type: 'stanchion', occupiable: false },
      { r: 7, c: 8, type: 'stanchion', occupiable: false },
      { r: 8, c: 4, type: 'rubble', occupiable: false },
      { r: 8, c: 5, type: 'table', occupiable: false },
      { r: 8, c: 7, type: 'chair', occupiable: true },
      { r: 8, c: 8, type: 'table', occupiable: false }
    ],

    people: [
      { id: 'A', name: 'Alysson', sex: 'female', color: '#c0613f' },
      { id: 'B', name: 'Brenda', sex: 'female', color: '#d98a4f' },
      { id: 'C', name: 'Cynthia', sex: 'female', color: '#5a9b8f' },
      { id: 'D', name: 'Dylan', sex: 'male', color: '#3f7a9b' },
      { id: 'E', name: 'Elsa', sex: 'female', color: '#b07a52' },
      { id: 'F', name: 'Freya', sex: 'female', color: '#9b6db0' },
      { id: 'G', name: 'George', sex: 'male', color: '#4f8a6b' },
      { id: 'H', name: 'Hugh', sex: 'male', color: '#7a6f9b' },
      { id: 'V', name: 'Vicky', sex: 'female', color: '#6d6a8f', victim: true }
    ],

    // 线索。highlights：人工根据线索给出的相关事物（运行时直接读取，不做文本解析）
    clues: {
      A: {
        en: 'She was exactly one column west of George.',
        zh: '她恰好在乔治西边一列。',
        highlights: [
          { type: 'character', id: 'G', relationship: 'west-of', authenticity: 'affirmative' }
        ]
      },
      B: {
        en: 'She was sitting on a chair. She was alone with a man.',
        zh: '她坐在椅子上，和一名男子独处一室。',
        highlights: [
          { type: 'object', id: 'chair', relationship: 'on', authenticity: 'affirmative' }
        ]
      },
      C: {
        en: 'She was in the first column. She was south of Alysson.',
        zh: '她在第一列，在艾莉森南边。',
        highlights: [
          { type: 'col', id: 0, relationship: 'in', authenticity: 'affirmative' },
          { type: 'character', id: 'A', relationship: 'south-of', authenticity: 'affirmative' }
        ]
      },
      D: {
        en: 'He was beside a table.',
        zh: '他在一张桌子旁。',
        highlights: [
          { type: 'object', id: 'table', relationship: 'beside', authenticity: 'affirmative' }
        ]
      },
      E: {
        en: 'There was a man sitting on a chair in her area.',
        zh: '她所在的区域里有一名男子坐在椅子上。',
        highlights: [
          { type: 'object', id: 'chair', relationship: 'on', authenticity: 'affirmative' }
        ]
      },
      F: {
        en: 'She was beside a statue.',
        zh: '她在一座雕像旁。',
        highlights: [
          { type: 'object', id: 'statue', relationship: 'beside', authenticity: 'affirmative' }
        ]
      },
      G: {
        en: 'He was either beside a statue or some rubble.',
        zh: '他要么在一座雕像旁，要么在一片瓦砾旁。',
        highlights: [
          { type: 'object', id: 'statue', relationship: 'beside', authenticity: 'affirmative' },
          { type: 'object', id: 'rubble', relationship: 'beside', authenticity: 'affirmative' }
        ]
      },
      H: {
        en: 'He was beside some rubble. He was not in the Lobby.',
        zh: '他在一片瓦砾旁，不在大厅里。',
        highlights: [
          { type: 'object', id: 'rubble', relationship: 'beside', authenticity: 'affirmative' },
          { type: 'region', id: 'lobby', relationship: 'in', authenticity: 'negative' }
        ]
      },
      V: {
        en: 'The Victim. She was alone with the murderer.',
        zh: '受害者，她与凶手独处一室。',
        highlights: []
      }
    },

    answer: {
      A: '1,3', B: '7,2', C: '2,0', D: '6,5', E: '4,6',
      F: '8,1', G: '5,4', H: '0,7', V: '3,8'
    },
    killer: 'H'
  });
})(typeof self !== 'undefined' ? self : this);
