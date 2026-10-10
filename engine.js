(function (root) {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const validId = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(s) && !['__proto__','constructor','prototype'].includes(s);
  function validate(p) {
    const fail = s => { throw new Error('题目格式错误：' + s); };
    if (!p || p.version !== 1 || !validId(p.id)) fail('需要 version: 1 和唯一的英文 id');
    if (!Number.isInteger(p.size) || p.size < 3 || p.size > 40) fail('size 应为 3–40');
    if (typeof p.title !== 'string' || p.title.length > 150) fail('缺少标题或标题过长');
    if (!Array.isArray(p.cells) || p.cells.length !== p.size * p.size) fail('cells 数量必须是 size²');
    if (!Array.isArray(p.people) || p.people.length < 1 || p.people.length > 40) fail('人物数量应为 1–40');
    const ids = p.people.map(x=>x.id);
    if (new Set(ids).size !== ids.length || ids.some(x=>!validId(x))) fail('人物 id 必须唯一且有效');
    p.people.forEach(x=>{if(typeof x.name!=='string'||typeof x.symbol!=='string'||x.symbol.length>3)fail('人物需要 name 和短 symbol');if(x.canOccupyBlocked&&!x.treasure)fail('只有宝藏可以埋在障碍物下');});
    if (!Array.isArray(p.rooms) || !p.rooms.length || p.rooms.some(x=>!validId(x.id)||typeof x.name!=='string')) fail('rooms 无效');
    const rooms = new Set(p.rooms.map(x=>x.id));
    if(rooms.size!==p.rooms.length)fail('房间 id 重复');
    p.cells.forEach(x=>{if(!x||!rooms.has(x.room)||typeof x.blocked!=='boolean')fail('每格需要有效 room 和 blocked'); if(x.walls&&!Array.isArray(x.walls))fail('walls 应为数组');});
    if (!Array.isArray(p.clues)) fail('clues 必须是数组');
    if(p.clues.some(x=>!validId(x.id)||typeof x.text!=='string'||(x.person&&!ids.includes(x.person)))||new Set(p.clues.map(x=>x.id)).size!==p.clues.length)fail('线索 id、text 或 person 无效');
    const inCell=x=>Number.isInteger(x)&&x>=0&&x<p.cells.length;
    if(p.solution){if(ids.some(id=>!inCell(p.solution[id])||(p.cells[p.solution[id]].blocked&&!p.people.find(x=>x.id===id).canOccupyBlocked))||new Set(Object.values(p.solution)).size!==ids.length)fail('solution 必须为每个人提供不同的可站立格');}
    if(p.targetSolution!=null&&!inCell(p.targetSolution))fail('targetSolution 超出棋盘');
    if(p.background&&!/^(data:image\/(png|jpeg|webp);base64,|\.\/assets\/)/.test(p.background))fail('底图必须为本地 assets 或图片 data URI');
    if(p.labelOverlay&&!/^\.\/assets\/[a-zA-Z0-9_-]+\.svg$/.test(p.labelOverlay))fail('区域标签图必须为本地 SVG');
    p.rules = {...{rowUnique:true,colUnique:true,murder:false},...p.rules};
    if(p.rules.murder&&p.people.filter(x=>x.victim).length!==1)fail('凶案模式需要恰好一个 victim');
    if(p.rules.treasure&&p.people.filter(x=>x.treasure).length!==1)fail('寻宝题需要恰好一个宝藏');
    const types=['row','col','room','object','cells','adjacentObject','relative','alone','with','aloneWith','corner','roomCompare','roomContains','rowWitness','adjacentColumnTrait'];
    (p.constraints||[]).forEach(c=>{if(!types.includes(c.type)||!ids.includes(c.person))fail('constraint 类型或人物无效'); if(['relative','with','aloneWith'].includes(c.type)&&!ids.includes(c.other))fail('constraint.other 无效'); if(['row','col'].includes(c.type)&&(!Number.isInteger(c.value)||c.value<0||c.value>=p.size))fail('constraint 行列超出范围'); if(c.type==='room'&&!rooms.has(c.value))fail('constraint 房间无效'); if(c.type==='cells'&&(!Array.isArray(c.cells)||c.cells.some(x=>!inCell(x))))fail('constraint.cells 无效'); if(c.type==='relative'&&!['north','south','east','west','northwest','northeast','southwest','southeast','diagonal','adjacent'].includes(c.direction))fail('constraint.direction 无效');});
    if(p.rules.roomParity&&p.rooms.some(r=>!Number.isInteger(r.number)||r.number<0))fail('奇偶区域规则需要 rooms.number');
    (p.constraints||[]).forEach(c=>{if(c.type==='roomCompare'&&(!ids.includes(c.other)||!['gt','notPrevious'].includes(c.comparison)))fail('roomCompare 需要 other 和 comparison');if(c.type==='roomContains'&&c.gender&&!['m','f'].includes(c.gender))fail('roomContains.gender 无效');});
    (p.constraints||[]).forEach(c=>{if(c.type==='rowWitness'&&(!Number.isInteger(c.offset)||Math.abs(c.offset)>=p.size||!Array.isArray(c.cells)||c.cells.some(i=>!inCell(i))))fail('rowWitness 行差或格子无效');if(c.type==='adjacentColumnTrait'&&!['hat','eyepatch'].includes(c.trait))fail('相邻列人物属性无效');if(c.minRows!=null&&(!Number.isInteger(c.minRows)||c.minRows<1))fail('minRows 应为正整数');});
    return copy(p);
  }
  function fresh(p) {return {version:1,placed:{},notes:{},cross:[],marks:{},done:[],eliminated:[],memo:'',cellMemo:{},target:null,elapsed:0,paused:false,solved:false,hints:0,checkpoints:[]};}
  function cleanState(p,s) {
    if (!s || typeof s!=='object') throw new Error('存档无效');
    const r=fresh(p), ids=new Set(p.people.map(x=>x.id)), cell=x=>Number.isInteger(+x)&&+x>=0&&+x<p.cells.length;
    for(const [id,i] of Object.entries(s.placed||{})) if(ids.has(id)&&cell(i)&&(!p.cells[+i].blocked||p.people.find(x=>x.id===id).canOccupyBlocked)&&!Object.values(r.placed).includes(+i))r.placed[id]=+i;
    for(const [i,a] of Object.entries(s.notes||{}))if(cell(i)&&Array.isArray(a))r.notes[i]=[...new Set(a.filter(x=>ids.has(x)))];
    r.cross=[...new Set((Array.isArray(s.cross)?s.cross:[]).filter(cell).map(Number))];
    for(const [i,v] of Object.entries(s.marks||{}))if(cell(i)&&['?','○','△','★'].includes(v))r.marks[i]=v;
    for(const [i,v] of Object.entries(s.cellMemo||{}))if(cell(i)&&typeof v==='string')r.cellMemo[i]=v.slice(0,1000);
    r.done=(Array.isArray(s.done)?s.done:[]).filter(id=>p.clues.some(c=>c.id===id));r.eliminated=(Array.isArray(s.eliminated)?s.eliminated:[]).filter(id=>ids.has(id)); r.memo=String(s.memo||'').slice(0,30000);
    r.elapsed=Math.max(0,Math.min(1e8,Number(s.elapsed)||0));r.paused=!!s.paused;r.solved=!!s.solved;r.hints=Math.max(0,+s.hints||0);r.target=s.target!=null&&cell(s.target)?+s.target:null;
    r.checkpoints=(Array.isArray(s.checkpoints)?s.checkpoints:[]).filter(x=>x&&typeof x.name==='string'&&x.state).slice(-8).map(x=>({name:x.name.slice(0,80),state:cleanState(p,{...x.state,checkpoints:[]})}));
    return r;
  }
  const occupant=(s,i)=>Object.keys(s.placed).find(id=>s.placed[id]===i);
  function autoExcluded(p,s,i) {const r=Math.floor(i/p.size),c=i%p.size;return !occupant(s,i)&&Object.values(s.placed).some(j=>(p.rules.rowUnique&&Math.floor(j/p.size)===r)||(p.rules.colUnique&&j%p.size===c));}
  function apply(p,s,action) {
    const n=copy(s),{type,index:i,person:id}=action;
    if(!Number.isInteger(i)||i<0||i>=p.cells.length)return n;
    const blocked=p.cells[i].blocked,occupiable=!blocked||p.people.find(x=>x.id===id)?.canOccupyBlocked;
    if(type==='erase'){const id=occupant(n,i);if(id)delete n.placed[id];delete n.notes[i];delete n.marks[i];delete n.cellMemo[i];n.cross=n.cross.filter(x=>x!==i);if(n.target===i)n.target=null;}
    if(type==='place'&&occupiable&&p.people.some(x=>x.id===id)){const other=occupant(n,i);if(other)delete n.placed[other];if(s.placed[id]===i)delete n.placed[id];else n.placed[id]=i;delete n.notes[i];n.cross=n.cross.filter(x=>x!==i);}
    if(type==='note'&&occupiable&&!occupant(n,i)&&p.people.some(x=>x.id===id)){let a=n.notes[i]||[];const add=action.add??!a.includes(id);n.notes[i]=add?[...new Set([...a,id])]:a.filter(x=>x!==id);n.cross=n.cross.filter(x=>x!==i);}
    if(type==='cross'&&(!blocked||action.allowBlocked)&&!occupant(n,i)){const add=action.add??!n.cross.includes(i);n.cross=add?[...new Set([...n.cross,i])]:n.cross.filter(x=>x!==i);if(add)delete n.notes[i];}
    if(type==='mark'&&!blocked){n.marks[i]=n.marks[i]===action.symbol?'':action.symbol;}
    if(type==='target')n.target=n.target===i?null:i;
    if(JSON.stringify(n)!==JSON.stringify(s))n.solved=false;
    return n;
  }
  function constraintOK(p,s,c) {
    const i=s.placed[c.person],j=s.placed[c.other],n=p.size;
    if(i==null)return null;
    const r=Math.floor(i/n),col=i%n,room=p.cells[i].room;
    if(c.type==='row')return r===c.value;if(c.type==='col')return col===c.value;
    if(c.type==='room')return room===c.value;if(c.type==='object')return p.cells[i].object===c.value;
    if(c.type==='cells')return c.cells.includes(i);
    if(c.type==='adjacentObject')return p.cells.some((x,k)=>x.object===c.value&&x.room===room&&Math.abs(Math.floor(k/n)-r)+Math.abs(k%n-col)===1);
    const neighbors=Object.entries(s.placed).filter(([id,k])=>id!==c.person&&p.cells[k].room===room);
    if(c.type==='alone')return neighbors.length===0?(Object.keys(s.placed).length===p.people.length?true:null):false;
    if(c.type==='corner'){const wall=(a,b)=>a<0||a>=n||b<0||b>=n||p.cells[a*n+b].room!==room;return (wall(r-1,col)||wall(r+1,col))&&(wall(r,col-1)||wall(r,col+1));}
    if(c.type==='roomContains')return neighbors.some(([id,k])=>(!c.gender||p.people.find(x=>x.id===id).gender===c.gender)&&(!c.trait||p.people.find(x=>x.id===id).traits?.includes(c.trait))&&(!c.object||p.cells[k].object===c.object))?true:Object.keys(s.placed).length===p.people.length?false:null;
    if(c.type==='rowWitness'){const targetRow=r+c.offset;if(targetRow<0||targetRow>=n)return false;const entry=Object.entries(s.placed).find(([id,k])=>Math.floor(k/n)===targetRow);if(!entry)return Object.keys(s.placed).length===p.people.length?false:null;return (!c.excludeTreasure||!p.people.find(x=>x.id===entry[0]).treasure)&&c.cells.includes(entry[1]);}
    if(c.type==='adjacentColumnTrait'){const matches=Object.entries(s.placed).some(([id,k])=>Math.abs(k%n-col)===1&&p.people.find(x=>x.id===id).traits?.includes(c.trait));return c.negate?!matches:matches;}
    if(j==null)return null;
    if(c.type==='roomCompare'){const a=p.rooms.find(x=>x.id===room)?.number,b=p.rooms.find(x=>x.id===p.cells[j].room)?.number;return c.comparison==='gt'?a>b:c.comparison==='notPrevious'?a!==b-1:null;}
    if(c.type==='with')return room===p.cells[j].room;
    if(c.type==='aloneWith')return room===p.cells[j].room&&neighbors.length===1?(Object.keys(s.placed).length===p.people.length?true:null):false;
    if(c.type==='relative'){const dr=r-Math.floor(j/n),dc=col-j%n,min=c.minRows||1;return {north:dr<=-min,south:dr>=min,east:dc>0,west:dc<0,northwest:dr<0&&dc<0,northeast:dr<0&&dc>0,southwest:dr>0&&dc<0,southeast:dr>0&&dc>0,diagonal:Math.abs(dr)===Math.abs(dc)&&dr!==0,adjacent:Math.abs(dr)+Math.abs(dc)===1&&room===p.cells[j].room}[c.direction];}
    return null;
  }
  function check(p,s,answer=false) {
    const errors=[],bad=new Set(),rows=new Map(),cols=new Map(),names=Object.fromEntries(p.people.map(x=>[x.id,x.name]));
    const add=(msg,indices=[])=>{errors.push(msg);indices.forEach(i=>bad.add(i));};
    for(const [id,i] of Object.entries(s.placed)){const r=Math.floor(i/p.size),c=i%p.size;if(p.cells[i].blocked&&!p.people.find(x=>x.id===id).canOccupyBlocked)add(names[id]+' 位于不可站立格',[i]);if(p.rules.rowUnique&&rows.has(r))add('第 '+(r+1)+' 行存在多个占位对象',[i,rows.get(r)]);if(p.rules.colUnique&&cols.has(c))add('第 '+(c+1)+' 列存在多个占位对象',[i,cols.get(c)]);rows.set(r,i);cols.set(c,i);}
    for(const c of p.constraints||[])if(constraintOK(p,s,c)===false)add(c.message||names[c.person]+' 的位置与线索冲突',[s.placed[c.person]]);
    const complete=Object.keys(s.placed).length===p.people.length;
    if(complete&&p.rules.roomParity)for(const room of p.rooms){const indices=Object.values(s.placed).filter(i=>p.cells[i].room===room.id);if(indices.length%2!==room.number%2)add(room.name+' 的人数奇偶性与球洞编号不符',indices);}
    let murderer=null;
    if(p.rules.murder){const v=p.people.find(x=>x.victim),i=s.placed[v.id];if(i!=null){const others=Object.keys(s.placed).filter(id=>id!==v.id&&p.cells[s.placed[id]].room===p.cells[i].room);if(others.length>1||complete&&others.length!==1)add('受害者必须与恰好一名凶手同处一个区域',[i]);else if(complete&&others.length===1)murderer=others[0];}}
    if(answer&&p.solution)for(const [id,i] of Object.entries(s.placed))if(p.solution[id]!==i)add(names[id]+' 的位置与已知答案不同',[i]);
    if(answer&&p.targetSolution!=null&&s.target!==p.targetSolution)add('目标位置与已知答案不同');
    const verified=!!(answer&&complete&&p.solution&&!errors.length&&(p.targetSolution==null||s.target===p.targetSolution));
    return {errors,bad:[...bad],complete,verified,murderer};
  }
  const api={copy,validate,fresh,cleanState,occupant,autoExcluded,apply,check,constraintOK};
  if(typeof module!=='undefined')module.exports=api;else root.MurdokuEngine=api;
})(typeof window!=='undefined'?window:globalThis);
