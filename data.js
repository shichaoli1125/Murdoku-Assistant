(function(root){
 const palette=['#e7d9c3','#d9e1c9','#ddd2c8','#d5ded8','#e2d4b9','#d2dae0'];
 function demo(){
  const rooms=[['hall','门厅'],['garden','花园'],['library','书房'],['glass','玻璃花房'],['kitchen','厨房'],['terrace','露台']].map(([id,name],i)=>({id,name,color:palette[i]}));
  const cells=Array.from({length:64},(_,i)=>{const r=i>>3,c=i%8;return {room:r<3?(c<4?'hall':'garden'):(c<3?(r<6?'library':'terrace'):(c>5&&r<6?'kitchen':'glass')),blocked:false};});
  const sol=[1,13,19,30,34,44,48,63];
  const objects=[[0,'plant',true],[4,'tree',true],[6,'tree',true],[7,'flower',true],[8,'table',true],[10,'rug',false],[14,'bush',true],[17,'table',true],[21,'tree',true],[23,'flower',true],[24,'shelf',true],[26,'shelf',true],[27,'plant',true],[28,'table',true],[31,'table',true],[32,'shelf',true],[36,'plant',true],[38,'table',true],[40,'shelf',true],[41,'shelf',true],[46,'barrel',true],[49,'flower',true],[50,'flower',true],[52,'plant',true],[54,'table',true],[56,'tree',true],[58,'bush',true],[60,'plant',true],[62,'flower',true]];
  objects.forEach(([i,object,blocked])=>Object.assign(cells[i],{object,blocked}));
  sol.forEach((i,k)=>{cells[i].object=k===7?'rug':k===1||k===6?'bench':'chair';});
  cells[1].edges={top:'door'};cells[19].edges={right:'window'};cells[30].edges={right:'window'};
  const names=['艾达','本杰明','克莱尔','丹尼尔','艾琳','费利克斯','格蕾丝','维克多'];
  const colors=['#af5e54','#6a819c','#937d9d','#638474','#bd8c50','#6f8190','#a87586','#9b6656'];
  const people=names.map((name,i)=>({id:i===7?'V':String.fromCharCode(65+i),symbol:i===7?'V':String.fromCharCode(65+i),name,color:colors[i],victim:i===7,gender:i%2?'m':'f'}));
  const clues=people.map((x,k)=>({id:'clue-'+x.id,person:x.id,text:x.name+'在'+rooms.find(r=>r.id===cells[sol[k]].room).name+'的第 '+(k+1)+' 行，'+(k===7?'站在地毯上。':k===1||k===6?'坐在长凳上。':'坐在椅子上。'),refs:[{label:rooms.find(r=>r.id===cells[sol[k]].room).name,type:'room',value:cells[sol[k]].room},{label:'第 '+(k+1)+' 行',type:'row',value:k},{label:k===7?'地毯':k===1||k===6?'长凳':'椅子',type:'object',value:cells[sol[k]].object}]}));
  clues.push({id:'general',text:'受害者与凶手独处于同一个区域。每一行、每一列恰好有一个人。'});
  const constraints=people.flatMap((x,k)=>[{type:'row',person:x.id,value:k,message:x.name+' 应在第 '+(k+1)+' 行'},{type:'room',person:x.id,value:cells[sol[k]].room,message:x.name+' 所在区域不符'},{type:'object',person:x.id,value:cells[sol[k]].object,message:x.name+' 应在指定家具上'}]);
  return {version:1,id:'glasshouse-demo-v1',title:'玻璃花房的访客',subtitle:'The Glasshouse Affair',description:'一场晚宴，八位来客，一份未完成的证词。根据线索还原每个人的位置，找出与维克多独处的人。',kind:'demo',difficulty:'入门',size:8,rooms,cells,people,clues,constraints,rules:{rowUnique:true,colUnique:true,murder:true},solution:Object.fromEntries(people.map((x,k)=>[x.id,sol[k]])),hints:['先看艾达：第 1 行的门厅里，只有一把可坐的椅子。','人物落位后，其同行同列的其他格可以排除。','找齐人物后，检查玻璃花房里谁与维克多独处。'],source:'本站原创演示题，仅用于熟悉操作，不是官方比赛题。'};
 }
 function large(){
  const rooms=Array.from({length:16},(_,i)=>({id:'sector'+i,name:'练习区 '+(i+1),color:palette[i%palette.length]}));
  return {version:1,id:'contest-workbench-24-v1',title:'寻宝赛 · 24×24 工作台',subtitle:'The Treasure Hunt · Practice Board',description:'用于练习大棋盘操作的空白模板。区域和人物均为占位，正式 PDF 提供后将整体替换。',kind:'template',difficulty:'24×24',size:24,rooms,cells:Array.from({length:576},(_,i)=>({room:'sector'+(Math.floor(Math.floor(i/24)/6)*4+Math.floor(i%24/6)),blocked:false})),people:Array.from({length:24},(_,i)=>({id:String.fromCharCode(65+i),symbol:String.fromCharCode(65+i),name:'人物 '+String.fromCharCode(65+i),color:['#a26455','#728790','#829175','#96809e'][i%4]})),clues:[{id:'pending',text:'正式棋盘、物品、人物和线索等待比赛 PDF。此模板没有可验证答案。'}],rules:{rowUnique:true,colUnique:true,murder:false},constraints:[],hints:[],source:'大棋盘操作模板；不是官方题目或真实地图。'};
 }
 root.MURDOKU_PUZZLES=[demo(),large()];
})(typeof window!=='undefined'?window:globalThis);
