/* ============================================================
 * 案件：The Beach（海滩）— 官方难度 EASY，7×7
 * 来源：murdoku.com 在线版 Alpha（puzzle-the-beach-easy）官方 JSON
 *       含房间、物件、人物、线索、官方解与凶手，全部按官方数据还原。
 * ============================================================ */
(function (root) {
  'use strict';

  root.MurdokuCaseRegistry.register({
    id: 'the-beach',
    order: 20,
    title: 'The Beach',
    titleZh: '海滩',
    difficulty: 'EASY',
    size: 7,

    // 房间分区 —— 严格按官方 room_code 矩阵：
    //   0=Beach 沙滩，1=Sea 海，2=Lifeguard's Tower 救生塔，3=Changing Room 更衣室
    regions: [
      {
        id: 'beach', name: 'Beach', nameZh: '沙滩',
        color: '#fef7a9', label: [0, 2],
        cells: [
          [0, 2], [0, 3],
          [1, 2], [1, 3],
          [2, 1], [2, 2], [2, 3], [2, 5], [2, 6],
          [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6],
          [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
          [5, 3], [5, 4], [5, 5], [5, 6]
        ]
      },
      {
        id: 'sea', name: 'Sea', nameZh: '海',
        color: '#6db9df', label: [6, 0],
        cells: [
          [2, 0],
          [3, 0],
          [4, 0], [4, 1],
          [5, 0], [5, 1], [5, 2],
          [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6]
        ]
      },
      {
        id: 'tower', name: "Lifeguard's Tower", nameZh: '救生塔',
        color: '#e1c894', label: [1, 1],
        cells: [
          [0, 0], [0, 1],
          [1, 0], [1, 1]
        ]
      },
      {
        id: 'changing', name: 'Changing Room', nameZh: '更衣室',
        color: '#f5ba8a', label: [2, 4],
        cells: [
          [0, 4], [0, 5], [0, 6],
          [1, 4], [1, 5], [1, 6],
          [2, 4]
        ]
      }
    ],

    // 物件。occupiable：能否站人
    objects: [
      // 不可站
      { r: 5, c: 0, type: 'boulder', occupiable: false },
      // 第一行 3 个卧榻（官方码 4，救生塔/更衣室内，不可站）
      { r: 0, c: 1, type: 'lounge', occupiable: false },
      { r: 0, c: 4, type: 'lounge', occupiable: false },
      { r: 0, c: 5, type: 'lounge', occupiable: false },

      // 椅子（可站）
      { r: 1, c: 0, type: 'chair', occupiable: true },
      { r: 1, c: 6, type: 'chair', occupiable: true },
      { r: 4, c: 2, type: 'chair', occupiable: true },

      // 沙滩巾 / 地毯（可站）
      { r: 2, c: 1, type: 'carpet', occupiable: true },
      { r: 3, c: 1, type: 'carpet', occupiable: true },
      { r: 4, c: 5, type: 'carpet', occupiable: true },
      { r: 4, c: 6, type: 'carpet', occupiable: true },
      { r: 5, c: 3, type: 'carpet', occupiable: true },
      { r: 5, c: 4, type: 'carpet', occupiable: true }
    ],

    // 人物
    people: [
      { id: 'A', name: 'Ashton', sex: 'male', color: '#c0613f' },
      { id: 'B', name: 'Brenda', sex: 'female', color: '#d98a4f' },
      { id: 'C', name: 'Carla', sex: 'female', color: '#84d2cc' },
      { id: 'D', name: 'Daryl', sex: 'female', color: '#b579b0' },
      { id: 'E', name: 'Earl', sex: 'male', color: '#7c9970' },
      { id: 'F', name: 'Fabian', sex: 'male', color: '#5a86b8' },
      { id: 'V', name: 'Valentino', sex: 'male', color: '#6d6a8f', victim: true }
    ],

    // 线索（官方原文 + 中文）
    // 线索。highlights：人工根据线索给出的相关事物列表（渲染时直接读取，不做文本解析）
    //   type: region 区域 / object 物品 / row 行 / col 列
    //   relationship: in 在…里 / on 在…上 / beside 在…旁
    //   authenticity: affirmative 肯定 / negative 否定
    clues: {
      A: {
        en: 'He was beside the boulder.', zh: '他在巨石旁。',
        highlights: [
          { type: 'object', id: 'boulder', relationship: 'beside', authenticity: 'affirmative' }
        ]
      },
      B: {
        en: 'She was on a carpet.', zh: '她在沙滩巾上。',
        highlights: [
          { type: 'object', id: 'carpet', relationship: 'on', authenticity: 'affirmative' }
        ]
      },
      C: {
        en: 'She was sitting in a chair. She was not on the Beach.', zh: '她坐在椅子上，不在沙滩上。',
        highlights: [
          { type: 'object', id: 'chair', relationship: 'on', authenticity: 'affirmative' },
          { type: 'region', id: 'beach', relationship: 'in', authenticity: 'negative' }
        ]
      },
      D: {
        en: 'She was on the Beach.', zh: '她在沙滩上。',
        highlights: [
          { type: 'region', id: 'beach', relationship: 'in', authenticity: 'affirmative' }
        ]
      },
      E: {
        en: 'He was beside a chair.', zh: '他在椅子旁。',
        highlights: [
          { type: 'object', id: 'chair', relationship: 'beside', authenticity: 'affirmative' }
        ]
      },
      F: {
        en: "He was alone in the Lifeguard's Tower.", zh: '他独自在救生塔里。',
        highlights: [
          { type: 'region', id: 'tower', relationship: 'in', authenticity: 'affirmative' }
        ]
      },
      V: {
        en: 'The Victim. He was alone with the murderer.', zh: '受害者，他与凶手独处。',
        highlights: []
      }
    },

    // 官方标准答案（坐标 "r,c"）
    answer: { A: '5,1', B: '4,5', C: '1,6', D: '2,3', E: '3,2', F: '0,0', V: '6,4' },
    killer: 'A'
  });
})(typeof self !== 'undefined' ? self : this);
