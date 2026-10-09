/* ============================================================
 * 案件：The Treasure Hunt（寻宝大赛）— 官方 24×24，EXPERT
 * 来源：murdoku.com/contest  The Treasure Hunt（首场 24×24 大赛）
 *       官方于 2026-10-09 18:00 ET（北京 10-10 06:00）公布题目。
 *       比赛开始前仅公布地图，故本题线索/答案暂缺（mapOnly 占位）。
 *       地图：17 个区域 + 船只/木屋/酒馆等，按官方预览图逐格还原。
 * ============================================================ */
(function (root) {
  'use strict';

  root.MurdokuCaseRegistry.register({
    id: 'the-treasure-hunt',
    order: 30,
    title: 'The Treasure Hunt',
    titleZh: '寻宝大赛',
    difficulty: 'EXPERT',
    size: 24,
    mapOnly: true,
    noticeZh: '官方题目将于 10 月 10 日早 6:00（北京时间）公布，目前仅开放地图预览。',
    noticeEn: 'Clues release Oct 9, 6:00 PM ET. Map preview only.',

    regions: [
    {
      id: "woods", name: "Woods", nameZh: "树林",
      color: "#87c892", label: [6,4],
      cells: [[0,0],[0,1],[0,2],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[0,15],[0,16],[1,0],[1,1],[1,2],[1,6],[1,7],[1,8],[1,9],[1,10],[1,11],[1,12],[1,13],[1,14],[1,15],[1,16],[2,0],[2,1],[2,2],[2,6],[2,7],[2,8],[2,9],[2,10],[2,11],[2,12],[2,13],[2,14],[2,15],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],[3,11],[3,12],[3,13],[3,14],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[6,2],[6,3],[6,4],[6,5],[6,6]]
    },
    {
      id: "cavern", name: "Cavern", nameZh: "洞穴",
      color: "#9dabb6", label: [5,22],
      cells: [[0,17],[0,18],[0,19],[0,20],[0,21],[0,22],[0,23],[1,17],[1,18],[1,19],[1,20],[1,21],[1,22],[1,23],[2,16],[2,17],[2,18],[2,19],[2,20],[2,21],[2,22],[2,23],[3,15],[3,16],[3,17],[3,18],[3,19],[3,20],[3,21],[3,22],[3,23],[4,18],[4,19],[4,20],[4,21],[4,22],[4,23],[5,22],[5,23]]
    },
    {
      id: "beach", name: "Beach", nameZh: "海滩",
      color: "#e2d3a2", label: [10,1],
      cells: [[4,10],[4,11],[4,12],[4,13],[4,14],[4,15],[4,16],[4,17],[5,0],[5,8],[5,9],[5,10],[5,11],[5,12],[6,0],[6,1],[6,7],[6,8],[6,9],[6,10],[6,11],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],[7,9],[7,10],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8],[9,0],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[10,0],[10,1],[10,2],[10,3],[10,4],[12,16],[12,17],[13,13],[13,14],[13,15],[13,16],[13,17],[14,12],[14,13],[14,14],[14,15],[14,16],[15,14],[15,15],[15,16],[15,19],[15,20],[15,21],[16,18],[16,19],[16,20],[16,21],[16,22],[16,23],[17,12],[17,13],[17,22],[17,23]]
    },
    {
      id: "water", name: "Water", nameZh: "水域",
      color: "#bcd8ee", label: [23,4],
      cells: [[5,13],[5,14],[5,15],[5,16],[5,17],[5,18],[5,19],[5,20],[5,21],[6,12],[6,13],[6,14],[6,15],[6,16],[6,17],[6,18],[6,19],[6,20],[6,21],[6,22],[6,23],[7,11],[7,12],[7,13],[7,14],[7,15],[7,16],[7,17],[7,18],[7,19],[7,20],[7,21],[7,22],[7,23],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[8,15],[8,18],[8,19],[8,20],[8,21],[8,22],[8,23],[9,7],[9,8],[9,9],[9,10],[9,11],[9,12],[9,18],[9,19],[9,20],[9,21],[9,22],[9,23],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,22],[10,23],[11,0],[11,1],[11,2],[11,6],[11,7],[11,8],[11,9],[11,10],[11,11],[11,23],[12,0],[12,1],[12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[12,8],[13,0],[13,3],[13,4],[13,5],[13,6],[14,0],[14,1],[14,2],[14,3],[14,4],[14,5],[14,6],[14,7],[14,8],[15,0],[15,1],[15,2],[15,3],[16,0],[16,1],[16,2],[16,3],[17,0],[17,1],[17,2],[17,3],[18,0],[18,1],[18,2],[18,3],[18,4],[19,0],[19,1],[19,2],[19,3],[19,4],[20,0],[20,1],[20,2],[20,3],[20,4],[21,1],[21,2],[21,3],[21,4],[22,3],[22,4],[23,3],[23,4],[23,5]]
    },
    {
      id: "cliff", name: "Cliff", nameZh: "悬崖",
      color: "#a0aabc", label: [22,5],
      cells: [[19,7],[20,5],[20,6],[20,7],[21,0],[21,5],[21,6],[21,7],[22,5],[22,6],[23,6]]
    },
    {
      id: "tavern", name: "Tavern", nameZh: "酒馆",
      color: "#cac490", label: [19,17],
      cells: [[17,14],[17,15],[17,16],[17,17],[17,18],[17,19],[17,20],[17,21],[18,10],[18,11],[18,12],[18,13],[18,14],[18,15],[18,16],[18,17],[18,18],[18,19],[18,20],[18,21],[18,22],[18,23],[19,10],[19,11],[19,12],[19,13],[19,14],[19,15],[19,16],[19,17],[19,18],[19,19],[19,20],[19,21],[19,22],[19,23],[20,16],[20,17],[20,18],[20,19],[20,20],[20,21],[20,22],[20,23],[21,16],[21,17],[21,18],[21,19],[21,20],[21,21]]
    },
    {
      id: "cabin-a", name: "Cabin A", nameZh: "小木屋A",
      color: "#b5ae8a", label: [2,4],
      cells: [[0,3],[0,4],[0,5],[1,3],[1,4],[1,5],[2,3],[2,4],[2,5]]
    },
    {
      id: "cabin-b", name: "Cabin B", nameZh: "小木屋B",
      color: "#bdc68e", label: [17,12],
      cells: [[15,12],[15,13],[15,22],[15,23],[16,10],[16,11],[16,12],[16,13],[16,14],[16,15],[16,16],[16,17],[17,7],[17,10],[17,11]]
    },
    {
      id: "cabin-c", name: "Cabin C", nameZh: "小木屋C",
      color: "#cac7a0", label: [22,13],
      cells: [[20,12],[20,13],[20,14],[20,15],[21,12],[21,13],[21,14],[21,15],[22,12],[22,13],[22,14]]
    },
    {
      id: "sloop-a", name: "Sloop A", nameZh: "单桅帆船A",
      color: "#cbd5c8", label: [12,4],
      cells: [[11,3],[11,4],[11,5]]
    },
    {
      id: "sloop-b", name: "Sloop B", nameZh: "单桅帆船B",
      color: "#c7b0a4", label: [14,1],
      cells: [[13,1],[13,2]]
    },
    {
      id: "sloop-c", name: "Sloop C", nameZh: "单桅帆船C",
      color: "#cabbaf", label: [14,7],
      cells: [[13,7],[13,8]]
    },
    {
      id: "frigate-a", name: "Frigate A", nameZh: "护卫舰A",
      color: "#b7d2b0", label: [9,14],
      cells: [[8,16],[8,17],[9,13],[9,14],[9,15],[9,16],[9,17]]
    },
    {
      id: "frigate-b", name: "Frigate B", nameZh: "护卫舰B",
      color: "#eedfc0", label: [23,1],
      cells: [[22,0],[22,1],[22,2],[23,0],[23,1],[23,2]]
    },
    {
      id: "galleon", name: "Galleon", nameZh: "大帆船",
      color: "#c7b29a", label: [17,16],
      cells: [[15,4],[15,5],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[16,4],[16,5],[16,6],[16,7],[16,8],[16,9],[17,4],[17,5],[17,6],[17,8],[17,9]]
    },
    {
      id: "dock", name: "Dock", nameZh: "码头",
      color: "#af9b87", label: [19,6],
      cells: [[12,9],[12,10],[13,9],[13,10],[13,11],[14,9],[14,10],[18,5],[18,6],[18,7],[18,8],[18,9],[19,5],[19,6],[19,8],[19,9]]
    },
    {
      id: "clearing", name: "Clearing", nameZh: "林间空地",
      color: "#9cd186", label: [23,14],
      cells: [[10,12],[10,13],[10,14],[10,15],[10,16],[10,17],[10,18],[10,19],[10,20],[10,21],[11,12],[11,13],[11,14],[11,15],[11,16],[11,17],[11,18],[11,19],[11,20],[11,21],[11,22],[12,11],[12,12],[12,13],[12,14],[12,15],[12,18],[12,19],[12,20],[12,21],[12,22],[12,23],[13,12],[13,18],[13,19],[13,20],[13,21],[13,22],[13,23],[14,11],[14,17],[14,18],[14,19],[14,20],[14,21],[14,22],[14,23],[15,17],[15,18],[20,8],[20,9],[20,10],[20,11],[21,8],[21,9],[21,10],[21,11],[21,22],[21,23],[22,7],[22,8],[22,9],[22,10],[22,11],[22,15],[22,16],[22,17],[22,18],[22,19],[22,20],[22,21],[22,22],[22,23],[23,7],[23,8],[23,9],[23,10],[23,11],[23,12],[23,13],[23,14],[23,15],[23,16],[23,17],[23,18],[23,19],[23,20],[23,21],[23,22],[23,23]]
    }
  ],

    objects: [
      { r:0, c:3, type:"bed", occupiable:false },
      { r:0, c:4, type:"bed", occupiable:false },
      { r:0, c:5, type:"bookshelf", occupiable:false },
      { r:2, c:3, type:"chair", occupiable:true },
      { r:0, c:19, type:"sack", occupiable:true },
      { r:0, c:20, type:"crate", occupiable:false },
      { r:1, c:18, type:"crate", occupiable:false },
      { r:1, c:19, type:"rock", occupiable:true },
      { r:2, c:20, type:"campfire", occupiable:false },
      { r:3, c:18, type:"rock", occupiable:true },
      { r:3, c:21, type:"rock", occupiable:true },
      { r:0, c:0, type:"shrub", occupiable:true },
      { r:0, c:6, type:"shrub", occupiable:true },
      { r:1, c:13, type:"gravestone", occupiable:false },
      { r:6, c:8, type:"barrel", occupiable:true },
      { r:7, c:6, type:"sack", occupiable:true },
      { r:8, c:1, type:"rock", occupiable:true },
      { r:8, c:9, type:"barrel", occupiable:true },
      { r:15, c:5, type:"pig", occupiable:true },
      { r:15, c:8, type:"rope", occupiable:true },
      { r:15, c:9, type:"crate", occupiable:false },
      { r:17, c:4, type:"crate", occupiable:false },
      { r:17, c:7, type:"rope", occupiable:true },
      { r:17, c:9, type:"crate", occupiable:false },
      { r:8, c:15, type:"crate", occupiable:false },
      { r:9, c:15, type:"rope", occupiable:true },
      { r:12, c:9, type:"crate", occupiable:false },
      { r:13, c:9, type:"sack", occupiable:true },
      { r:14, c:9, type:"sack", occupiable:true },
      { r:19, c:8, type:"crate", occupiable:false },
      { r:19, c:9, type:"barrel", occupiable:true },
      { r:15, c:12, type:"crate", occupiable:false },
      { r:15, c:14, type:"table", occupiable:false },
      { r:16, c:12, type:"bookshelf", occupiable:false },
      { r:16, c:13, type:"bed", occupiable:false },
      { r:17, c:14, type:"barrel", occupiable:true },
      { r:16, c:17, type:"chair", occupiable:true },
      { r:15, c:19, type:"barrel", occupiable:true },
      { r:15, c:21, type:"sack", occupiable:true },
      { r:15, c:22, type:"bookshelf", occupiable:false },
      { r:15, c:23, type:"barrel", occupiable:true },
      { r:16, c:21, type:"chair", occupiable:true },
      { r:17, c:22, type:"table", occupiable:false },
      { r:17, c:23, type:"sack", occupiable:true },
      { r:18, c:20, type:"chair", occupiable:true },
      { r:18, c:21, type:"chair", occupiable:true },
      { r:19, c:20, type:"crate", occupiable:false },
      { r:20, c:19, type:"bookshelf", occupiable:false },
      { r:20, c:23, type:"chair", occupiable:true },
      { r:23, c:6, type:"rock", occupiable:true },
      { r:20, c:15, type:"chair", occupiable:true },
      { r:21, c:12, type:"table", occupiable:false },
      { r:21, c:13, type:"bed", occupiable:false }
    ],

    people: [
      { id:"A", name:"Amos", sex:"male", color:"#c0613f" },
      { id:"B", name:"Barnaby", sex:"male", color:"#d98a4f" },
      { id:"C", name:"Cordelia", sex:"female", color:"#84d2cc" },
      { id:"D", name:"Django", sex:"male", color:"#b579b0" },
      { id:"E", name:"Esme", sex:"female", color:"#7c9970" },
      { id:"F", name:"Finn", sex:"male", color:"#5a86b8" },
      { id:"G", name:"Gretel", sex:"female", color:"#c98a8f" },
      { id:"H", name:"Hawkins", sex:"male", color:"#a07a4f" },
      { id:"V", name:"Vane", sex:"male", color:"#6d6a8f", victim: true }
    ],

    clues: {
      A: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      B: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      C: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      D: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      E: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      F: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      G: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      H: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] },
      V: { en:"Clues to be revealed", zh:"题目待公布", highlights: [] }
    },

    answer: {"A": null,"B": null,"C": null,"D": null,"E": null,"F": null,"G": null,"H": null,"V": null},
    killer: null
  });
})(typeof self !== 'undefined' ? self : this);
