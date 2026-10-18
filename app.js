(function(){
'use strict';
var KEY='gongzuotai.v1',UIKEY='gongzuotai.ui',PREV='gongzuotai.prev';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function uid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4)}
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function fmtT(t){var d=new Date(t);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
var toastT;function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200)}
var TN={doc:'文档',board:'看板',table:'表格'};
var IC={doc:'<svg class="ti" viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5M9.5 16h5"/></svg>',board:'<svg class="ti" viewBox="0 0 24 24"><rect x="3.5" y="4" width="5" height="16"/><rect x="10" y="4" width="5" height="10"/><rect x="16.5" y="4" width="4" height="13"/></svg>',table:'<svg class="ti" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14"/><path d="M3.5 10h17M9 5v14"/></svg>'};

/* ================= 数据 ================= */
var DB,UI={active:null,open:{},mode:null},saveT=null,lastSaved='';
function blankPage(type,sid,pid,title){
 var p={id:uid(),sid:sid,pid:pid||null,type:type,title:title||('未命名'+TN[type]),created:Date.now(),updated:Date.now()};
 if(type==='doc')p.md='';
 if(type==='board')p.cols=[{id:uid(),title:'待办',cards:[]},{id:uid(),title:'进行中',cards:[]},{id:uid(),title:'已完成',cards:[]}];
 if(type==='table'){p.cols=[{id:uid(),name:'名称',type:'text'},{id:uid(),name:'数量',type:'number'},{id:uid(),name:'日期',type:'date'},{id:uid(),name:'状态',type:'select',options:['待处理','进行中','完成']}];p.rows=[];p.sort=null;p.filter=null}
 return p;
}
function sample(){
 var sid=uid(),sp={id:sid,name:'我的项目'},pages=[];
 var d=blankPage('doc',sid,null,'开始使用');
 d.md='# 欢迎来到工作台\n\n这是一个**完全在你浏览器里运行**的 Notion 式工作台：没有账号、没有服务器，数据只保存在这台设备的浏览器里。\n\n## 能做什么\n\n- 文档：用 Markdown 写作，右侧实时预览\n- 看板：拖拽卡片和列，设置截止日期\n- 表格：文本 / 数字 / 日期 / 选择，可排序筛选\n- 左侧是页面树，`Ctrl K` 全局搜索\n\n## 待办示例\n\n- [x] 打开工作台\n- [ ] 新建一个自己的项目空间\n- [ ] 点左下角「备份导出」，把数据存成 JSON 文件\n\n> 重要：清除浏览器数据或换设备会丢失内容。请定期备份导出，并用「导入备份」恢复。\n\n```js\nconsole.log("代码块也支持");\n```\n\n| 功能 | 状态 |\n| --- | --- |\n| 文档 | 可用 |\n| 看板 | 可用 |\n| 表格 | 可用 |\n';
 var b=blankPage('board',sid,null,'本周任务');
 var dd=function(n){var x=new Date();x.setDate(x.getDate()+n);return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2)};
 b.cols[0].cards=[{id:uid(),title:'整理需求清单',desc:'把零散想法归到一处',due:dd(2),done:false},{id:uid(),title:'约用户访谈',desc:'',due:dd(5),done:false}];
 b.cols[1].cards=[{id:uid(),title:'写 PRD 初稿',desc:'',due:dd(0),done:false}];
 b.cols[2].cards=[{id:uid(),title:'搭好工作台',desc:'',due:'',done:true}];
 var t=blankPage('table',sid,null,'阅读清单');
 var c=t.cols;t.rows=[['启示录',320,dd(-3),'完成'],['用户故事地图',280,dd(6),'进行中'],['精益创业',240,'','待处理']].map(function(r){var o={id:uid(),cells:{}};c.forEach(function(cc,i){o.cells[cc.id]=r[i]});return o});
 return {v:1,spaces:[sp],pages:[d,b,t]};
}
function load(){
 var raw=null;try{raw=localStorage.getItem(KEY)}catch(e){}
 if(raw){try{var o=JSON.parse(raw);var v=validate(o);if(v.ok){DB=v.db;lastSaved=raw;return}}catch(e){}
  try{localStorage.setItem(KEY+'.corrupt',raw)}catch(e){}toast('本地数据损坏，已另存为 gongzuotai.v1.corrupt 并重置')}
 DB=sample();
}
try{UI=Object.assign(UI,JSON.parse(localStorage.getItem(UIKEY)||'{}'))}catch(e){}
var storageOK=true;
function persist(){
 try{var s=JSON.stringify(DB);if(s===lastSaved)return;localStorage.setItem(KEY,s);lastSaved=s;storageOK=true;var b=$('#banner');if(b&&b.dataset.k==='quota'){b.hidden=true}}
 catch(e){storageOK=false;banner('quota','浏览器本地存储已满或被禁用，最近的修改没有保存！请立即「备份导出」。',[])}
 renderNote();
}
function save(){clearTimeout(saveT);saveT=setTimeout(persist,250)}
function touch(p){p.updated=Date.now();DB.edits=(DB.edits||0)+1;if(!DB.lastBackup&&DB.edits===25)banner('bk','你已经做了不少修改，但还没有备份过。数据只存在这个浏览器里，建议现在备份导出。',[['备份导出',function(){exportDialog()}]]);save()}
function saveUI(){try{localStorage.setItem(UIKEY,JSON.stringify(UI))}catch(e){}}
window.addEventListener('beforeunload',function(){clearTimeout(saveT);persist()});
window.addEventListener('pagehide',function(){clearTimeout(saveT);persist()});
window.addEventListener('storage',function(e){if(e.key===KEY&&e.newValue&&e.newValue!==lastSaved){banner('sync','另一个标签页修改了数据。',[['刷新到最新',function(){location.reload()}]])}});
function banner(k,msg,btns){var b=$('#banner');b.dataset.k=k;b.hidden=false;b.innerHTML='<span>'+h(msg)+'</span>';btns.forEach(function(x){var e=document.createElement('button');e.textContent=x[0];e.onclick=x[1];b.appendChild(e)});if(k!=='quota'&&k!=='sync'){var c=document.createElement('button');c.textContent='知道了';c.onclick=function(){b.hidden=true};b.appendChild(c)}}
function renderNote(){
 var n=0;try{n=(localStorage.getItem(KEY)||'').length*2}catch(e){}
 var lb=DB.lastBackup,d=lb?Math.floor((Date.now()-lb)/864e5):null;
 $('#s-note').innerHTML='数据只存在此浏览器 · 已用约 '+(n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB')+'（上限约 5 MB）<br>'+(lb?'上次备份：'+(d===0?'今天':d+' 天前'):'<b style="color:#e8c77a">尚未备份</b>，请备份导出');
}
function page(id){return DB.pages.find(function(p){return p.id===id})}
function kids(sid,pid){return DB.pages.filter(function(p){return p.sid===sid&&(p.pid||null)===(pid||null)})}
function descendants(id){var out=[],st=[id];while(st.length){var x=st.pop();DB.pages.forEach(function(p){if(p.pid===x){out.push(p.id);st.push(p.id)}})}return out}
function path(p){var a=[],x=p;while(x){a.unshift(x);x=x.pid?page(x.pid):null}return a}
function spaceOf(p){return DB.spaces.find(function(s){return s.id===p.sid})}

/* ---------- 校验（导入与读取共用） ---------- */
function str(x,d,max){return typeof x==='string'?x.slice(0,max||20000):(d||'')}
function validate(o){
 if(!o||typeof o!=='object'||!Array.isArray(o.spaces)||!Array.isArray(o.pages))return {ok:false,err:'不是工作台备份文件（缺少 spaces / pages）'};
 var db={v:1,spaces:[],pages:[],lastBackup:typeof o.lastBackup==='number'?o.lastBackup:null,edits:+o.edits||0},sids={},pids={},skipped=0;
 o.spaces.forEach(function(s){if(s&&typeof s.id==='string'&&!sids[s.id]){sids[s.id]=1;db.spaces.push({id:s.id,name:str(s.name,'未命名空间',100)})}});
 o.pages.forEach(function(p){
  if(!p||typeof p.id!=='string'||pids[p.id]||!TN[p.type]||!sids[p.sid]){skipped++;return}
  var q={id:p.id,sid:p.sid,pid:typeof p.pid==='string'?p.pid:null,type:p.type,title:str(p.title,'未命名',200),created:+p.created||Date.now(),updated:+p.updated||Date.now()};
  if(p.type==='doc')q.md=str(p.md,'',2000000);
  else if(p.type==='board'){q.cols=(Array.isArray(p.cols)?p.cols:[]).filter(function(c){return c&&typeof c.id==='string'}).map(function(c){return {id:c.id,title:str(c.title,'',100),cards:(Array.isArray(c.cards)?c.cards:[]).filter(function(k){return k&&typeof k.id==='string'}).map(function(k){return {id:k.id,title:str(k.title,'',500),desc:str(k.desc,'',5000),due:/^\d{4}-\d{2}-\d{2}$/.test(k.due||'')?k.due:'',done:!!k.done}})}})}
  else{var seen={};q.cols=(Array.isArray(p.cols)?p.cols:[]).filter(function(c){return c&&typeof c.id==='string'&&!seen[c.id]&&(seen[c.id]=1)}).map(function(c){var t=['text','number','date','select'].indexOf(c.type)>=0?c.type:'text';var o2={id:c.id,name:str(c.name,'列',100),type:t};if(t==='select')o2.options=(Array.isArray(c.options)?c.options:[]).map(function(x){return str(x,'',100)}).filter(Boolean);return o2});
   q.rows=(Array.isArray(p.rows)?p.rows:[]).filter(function(r){return r&&typeof r.id==='string'}).map(function(r){var cells={};q.cols.forEach(function(c){var v=r.cells&&r.cells[c.id];cells[c.id]=c.type==='number'?(typeof v==='number'&&isFinite(v)?v:(v===''||v==null?'':(isFinite(parseFloat(v))?parseFloat(v):''))):str(v==null?'':String(v),'',2000)});return {id:r.id,cells:cells}});
   q.sort=p.sort&&seen[p.sort.col]?{col:p.sort.col,dir:p.sort.dir==='desc'?'desc':'asc'}:null;q.filter=p.filter&&seen[p.filter.col]?{col:p.filter.col,op:str(p.filter.op,'contains',20),val:str(p.filter.val,'',200)}:null}
  pids[p.id]=1;db.pages.push(q)});
 db.pages.forEach(function(p){if(p.pid&&(!pids[p.pid]||p.pid===p.id))p.pid=null});
 // 检测环
 db.pages.forEach(function(p){var seen={},x=p;while(x&&x.pid){if(seen[x.id]){p.pid=null;break}seen[x.id]=1;x=db.pages.find(function(y){return y.id===x.pid})}});
 if(!db.spaces.length)return {ok:false,err:'备份中没有项目空间'};
 return {ok:true,db:db,skipped:skipped};
}

/* ================= Markdown ================= */
function inl(s){
 var codes=[];s=s.replace(/`([^`]+)`/g,function(_,c){codes.push(c);return '\u0001'+(codes.length-1)+'\u0001'});
 s=h(s);
 s=s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,function(m,t,u){u=u.replace(/&amp;/g,'&');return /^(https?:\/\/|mailto:|#)/i.test(u)?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer">'+t+'</a>':m});
 s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>').replace(/~~([^~]+)~~/g,'<del>$1</del>');
 s=s.replace(/\u0001(\d+)\u0001/g,function(_,i){return '<code>'+h(codes[+i])+'</code>'});
 return s;
}
var LI=/^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/;
function mdRender(src){
 var L=src.replace(/\r\n?/g,'\n').split('\n'),out=[],i=0;
 function blockStart(l){return /^\s*```/.test(l)||/^#{1,6}\s/.test(l)||/^\s*>/.test(l)||LI.test(l)||/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)}
 while(i<L.length){
  var l=L[i],m;
  if(!l.trim()){i++;continue}
  if(/^\s*```/.test(l)){var buf=[];i++;while(i<L.length&&!/^\s*```/.test(L[i])){buf.push(L[i]);i++}i++;out.push('<pre><code>'+h(buf.join('\n'))+'</code></pre>');continue}
  if((m=/^(#{1,6})\s+(.*)$/.exec(l))){out.push('<h'+m[1].length+'>'+inl(m[2])+'</h'+m[1].length+'>');i++;continue}
  if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){out.push('<hr>');i++;continue}
  if(/^\s*>/.test(l)){var q=[];while(i<L.length&&/^\s*>/.test(L[i])){q.push(L[i].replace(/^\s*>\s?/,''));i++}out.push('<blockquote>'+mdRender(q.join('\n')).replace(/data-line="\d+"/g,'disabled')+'</blockquote>');continue}
  if(l.indexOf('|')>=0&&i+1<L.length&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(L[i+1])&&L[i+1].indexOf('|')>=0){
   var cells=function(r){r=r.trim().replace(/^\|/,'').replace(/\|$/,'');return r.split(/(?<!\\)\|/).map(function(x){return x.trim().replace(/\\\|/g,'|')})};
   var hd=cells(l),al=cells(L[i+1]).map(function(a){return /^:-+:$/.test(a)?'center':/-:$/.test(a)?'right':''});i+=2;var rows=[];
   while(i<L.length&&L[i].trim()&&L[i].indexOf('|')>=0){rows.push(cells(L[i]));i++}
   var st=function(k){return al[k]?' style="text-align:'+al[k]+'"':''};
   out.push('<table><thead><tr>'+hd.map(function(c,k){return '<th'+st(k)+'>'+inl(c)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+hd.map(function(_,k){return '<td'+st(k)+'>'+inl(r[k]||'')+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table>');continue}
  if(LI.test(l)){
   var stack=[],html='';
   while(i<L.length&&LI.test(L[i])){
    var mm=LI.exec(L[i]),ind=mm[1].replace(/\t/g,'  ').length,ord=/\d/.test(mm[2]),tag=ord?'ol':'ul',task=mm[3]?(/[xX]/.test(mm[3])?2:1):0;
    while(stack.length&&ind<stack[stack.length-1].ind){html+='</li></'+stack.pop().tag+'>'}
    if(!stack.length||ind>stack[stack.length-1].ind){stack.push({ind:ind,tag:tag});html+='<'+tag+(task?' class="tl"':'')+'>'}else html+='</li>';
    if(task)html+='<li class="task'+(task===2?' done':'')+'"><input type="checkbox" data-line="'+i+'"'+(task===2?' checked':'')+'><div>'+inl(mm[4])+'</div>';
    else html+='<li>'+inl(mm[4]);
    i++}
   while(stack.length)html+='</li></'+stack.pop().tag+'>';
   out.push(html);continue}
  var para=[];while(i<L.length&&L[i].trim()&&!(para.length&&blockStart(L[i]))){para.push(L[i]);i++}
  out.push('<p>'+para.map(inl).join('<br>')+'</p>');
 }
 return out.join('\n');
}
window.__mdRender=mdRender;

/* ================= 通用：弹窗 / 菜单 ================= */
var mroot=$('#modal-root');
function closeModal(){mroot.innerHTML='';document.removeEventListener('keydown',escH)}
function escH(e){if(e.key==='Escape'){closeMenu();if(mroot.firstChild)closeModal()}}
function modal(title,bodyHtml,buttons,opt){
 opt=opt||{};closeModal();
 var ov=document.createElement('div');ov.className='ov';
 ov.innerHTML='<div class="md-box'+(opt.wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+h(title)+'"><div class="md-h"><span>'+h(title)+'</span><button type="button" data-x aria-label="关闭">×</button></div><div class="md-b">'+bodyHtml+'</div><div class="md-f"></div></div>';
 var f=$('.md-f',ov);
 (buttons||[]).forEach(function(b){var e=document.createElement('button');e.type='button';e.className='btn '+(b.cls||'');e.textContent=b.text;e.onclick=function(){var r=b.fn?b.fn(ov):undefined;if(r!==false)closeModal()};f.appendChild(e)});
 ov.addEventListener('mousedown',function(e){if(e.target===ov&&!opt.sticky)closeModal()});
 $('[data-x]',ov).onclick=closeModal;
 mroot.appendChild(ov);document.addEventListener('keydown',escH);
 var first=$('input,textarea,select',ov);if(first&&!opt.nofocus){first.focus();if(first.select&&first.type==='text')first.select()}
 return ov;
}
function ask(title,msg,okText,danger){return new Promise(function(res){modal(title,'<p style="margin:0;white-space:pre-line">'+h(msg)+'</p>',[{text:'取消',fn:function(){res(false)}},{text:okText||'确定',cls:danger?'dng':'pri',fn:function(){res(true)}}],{nofocus:true})})}
function promptText(title,label,val,okText){return new Promise(function(res){
 var ov=modal(title,'<label class="f">'+h(label)+'<input class="fi" type="text" maxlength="100" value="'+h(val||'')+'"></label>',[{text:'取消',fn:function(){res(null)}},{text:okText||'确定',cls:'pri',fn:function(o){res($('input',o).value.trim());}}]);
 $('input',ov).addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('.btn.pri',ov).click()}});
})}
var menuEl=null;
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null}document.removeEventListener('mousedown',menuOut,true)}
function menuOut(e){if(menuEl&&!menuEl.contains(e.target))closeMenu()}
function menu(anchor,items){
 closeMenu();var m=document.createElement('div');m.className='menu';
 items.forEach(function(it){if(it==='-'){m.appendChild(document.createElement('hr'));return}
  if(it.label){var l=document.createElement('div');l.className='lbl';l.textContent=it.label;m.appendChild(l);return}
  var b=document.createElement('button');b.type='button';b.textContent=it.text;if(it.cls)b.className=it.cls;if(it.off)b.disabled=true;b.onclick=function(){closeMenu();it.fn()};m.appendChild(b)});
 document.body.appendChild(m);menuEl=m;
 var r=anchor.getBoundingClientRect(),mw=m.offsetWidth,mh=m.offsetHeight,x=Math.min(r.left,innerWidth-mw-8),y=r.bottom+4;if(y+mh>innerHeight-8)y=Math.max(8,r.top-mh-4);
 m.style.left=Math.max(8,x)+'px';m.style.top=y+'px';
 setTimeout(function(){document.addEventListener('mousedown',menuOut,true)},0);
}
function typeMenu(anchor,fn){menu(anchor,[{label:'新建'},{text:'文档',fn:function(){fn('doc')}},{text:'任务看板',fn:function(){fn('board')}},{text:'表格',fn:function(){fn('table')}}])}

/* ================= 页面树 ================= */
function renderTree(){
 var t=$('#tree'),html='';
 DB.spaces.forEach(function(s){
  html+='<div class="sp-h" data-sid="'+s.id+'"><span class="nm" title="'+h(s.name)+'">'+h(s.name)+'</span><button type="button" data-a="space-add" aria-label="在「'+h(s.name)+'」新建页面" title="新建页面">＋</button><button type="button" data-a="space-menu" aria-label="空间菜单" title="更多">⋯</button></div>';
  var rec=function(pid,depth){kids(s.id,pid).forEach(function(p){
   var ks=kids(s.id,p.id),open=UI.open[p.id];
   html+='<div class="node'+(p.id===UI.active?' on':'')+'" data-id="'+p.id+'" style="padding-left:'+(depth*14)+'px"><button type="button" class="tg'+(ks.length?'':' empty')+'" data-a="tg" aria-label="'+(open?'折叠':'展开')+'">'+(open?'▾':'▸')+'</button><button type="button" class="lk" data-a="go">'+IC[p.type]+'<span class="t">'+h(p.title||'未命名')+'</span></button><button type="button" class="tb" data-a="pmenu" aria-label="页面菜单" title="更多">⋯</button></div>';
   if(open&&ks.length)rec(p.id,depth+1)})};
  rec(null,0);
  if(!kids(s.id,null).length)html+='<div style="padding:4px 12px 8px;font-size:12px;color:#7f95a1">还没有页面，点右上 ＋ 新建</div>';
 });
 t.innerHTML=html;
}
function createPage(type,sid,pid){
 var p=blankPage(type,sid,pid);DB.pages.push(p);if(pid)UI.open[pid]=true;touch(p);openPage(p.id,true);
 setTimeout(function(){var i=$('.title-in');if(i){i.focus();i.select()}},30);
}
function movePage(p,dir){ // 同级内上移/下移
 var sib=kids(p.sid,p.pid),i=sib.indexOf(p),j=i+dir;if(j<0||j>=sib.length)return;
 var a=DB.pages.indexOf(p),b=DB.pages.indexOf(sib[j]);DB.pages[a]=sib[j];DB.pages[b]=p;touch(p);renderTree();
}
function indent(p){var sib=kids(p.sid,p.pid),i=sib.indexOf(p);if(i<1)return;p.pid=sib[i-1].id;UI.open[p.pid]=true;saveUI();touch(p);renderTree()}
function outdent(p){if(!p.pid)return;var par=page(p.pid);p.pid=par.pid||null;touch(p);renderTree()}
function moveToSpace(p){
 var opts=DB.spaces.filter(function(s){return s.id!==p.sid});if(!opts.length){toast('只有一个项目空间');return}
 var ov=modal('移动「'+p.title+'」到…','<label class="f">目标项目空间<select class="fi">'+opts.map(function(s){return '<option value="'+s.id+'">'+h(s.name)+'</option>'}).join('')+'</select></label><p class="hint">子页面会一起移动。</p>',[{text:'取消'},{text:'移动',cls:'pri',fn:function(o){var sid=$('select',o).value,ids=[p.id].concat(descendants(p.id));ids.forEach(function(i){page(i).sid=sid});p.pid=null;touch(p);renderTree();toast('已移动')}}]);
}
async function delPage(p){
 var ds=descendants(p.id);
 if(!(await ask('删除页面','确定删除「'+p.title+'」'+(ds.length?'及其 '+ds.length+' 个子页面':'')+'？\n此操作无法撤销（建议先备份导出）。','删除',true)))return;
 var all=[p.id].concat(ds);DB.pages=DB.pages.filter(function(x){return all.indexOf(x.id)<0});DB.edits=(DB.edits||0)+1;save();
 if(all.indexOf(UI.active)>=0){UI.active=null;firstPage()}else renderTree();
}
function pageMenu(anchor,p){
 menu(anchor,[{text:'重命名',fn:function(){promptText('重命名','页面标题',p.title).then(function(v){if(v){p.title=v;touch(p);renderTree();if(UI.active===p.id)renderHead()}})}},
  {text:'添加子页面…',fn:function(){setTimeout(function(){typeMenu(anchor,function(t){createPage(t,p.sid,p.id)})},0)}},'-',
  {text:'上移',fn:function(){movePage(p,-1)}},{text:'下移',fn:function(){movePage(p,1)}},{text:'缩进（成为上一页的子页）',fn:function(){indent(p)}},{text:'取消缩进',off:!p.pid,fn:function(){outdent(p)}},{text:'移到其他项目空间…',fn:function(){moveToSpace(p)}},'-',
  {text:'导出此页 Markdown',fn:function(){exportPageMd(p)}},{text:'删除',cls:'dng',fn:function(){delPage(p)}}]);
}
function spaceMenu(anchor,s){
 menu(anchor,[{text:'重命名空间',fn:function(){promptText('重命名项目空间','空间名称',s.name).then(function(v){if(v){s.name=v;DB.edits++;save();renderTree()}})}},
  {text:'导出此空间（ZIP）',fn:function(){exportZip(s.id)}},'-',
  {text:'删除空间',cls:'dng',fn:async function(){var n=DB.pages.filter(function(p){return p.sid===s.id}).length;
   if(DB.spaces.length<2){toast('至少保留一个项目空间');return}
   if(!(await ask('删除项目空间','确定删除「'+s.name+'」及其 '+n+' 个页面？\n此操作无法撤销（建议先备份导出）。','删除',true)))return;
   DB.spaces=DB.spaces.filter(function(x){return x.id!==s.id});DB.pages=DB.pages.filter(function(p){return p.sid!==s.id});DB.edits++;save();
   var a=UI.active&&page(UI.active);if(!a){UI.active=null;firstPage()}else renderTree()}}]);
}
$('#tree').addEventListener('click',function(e){
 var b=e.target.closest('button[data-a]');if(!b)return;var a=b.dataset.a,sp=b.closest('.sp-h'),nd=b.closest('.node');
 if(a==='space-add'){var s=DB.spaces.find(function(x){return x.id===sp.dataset.sid});typeMenu(b,function(t){createPage(t,s.id,null)})}
 else if(a==='space-menu'){spaceMenu(b,DB.spaces.find(function(x){return x.id===sp.dataset.sid}))}
 else if(a==='tg'){UI.open[nd.dataset.id]=!UI.open[nd.dataset.id];saveUI();renderTree()}
 else if(a==='go'){openPage(nd.dataset.id);closeSide()}
 else if(a==='pmenu')pageMenu(b,page(nd.dataset.id));
});
function openSide(){$('#app').classList.add('open')}function closeSide(){$('#app').classList.remove('open')}
$('#m-menu').onclick=openSide;$('#scrim').onclick=closeSide;$('#s-close').onclick=closeSide;
$('#b-new-space').onclick=function(){promptText('新建项目空间','空间名称（例如：产品、读书、家庭）','','创建').then(function(v){if(!v)return;var s={id:uid(),name:v};DB.spaces.push(s);DB.edits++;save();createPage('doc',s.id,null)})};

/* ================= 页面渲染 ================= */
function firstPage(){var p=DB.pages[0];if(p)openPage(p.id,true);else{UI.active=null;renderTree();renderHead();renderBody()}}
function openPage(id,noScroll){
 var p=page(id);if(!p)return firstPage();
 UI.active=id;path(p).forEach(function(x){if(x.id!==id)UI.open[x.id]=true});saveUI();
 renderTree();renderHead();renderBody();$('#m-title').textContent=p.title||'工作台';
 try{history.replaceState(null,'','#'+id)}catch(e){}
}
function renderHead(){
 var p=page(UI.active),hd=$('#head');
 if(!p){hd.innerHTML='<p class="eyebrow">WORKSPACE</p><div class="title-in" style="font:400 36px var(--serif)">工作台</div>';return}
 var sp=spaceOf(p),crumb=path(p).slice(0,-1).map(function(x){return h(x.title)}).join(' / ');
 hd.innerHTML='<p class="eyebrow">'+TN[p.type]+' · '+h(sp?sp.name:'')+(crumb?' · '+crumb:'')+'</p><input class="title-in" id="title" maxlength="200" value="'+h(p.title)+'" aria-label="页面标题" placeholder="未命名">'+
  '<div class="meta"><span>更新于 '+fmtT(p.updated)+'</span><span class="sp"></span><button class="btn dk sm" id="pg-exp" type="button">导出此页</button><button class="btn dk sm" id="pg-del" type="button">删除</button></div>';
 $('#title').addEventListener('input',function(){p.title=this.value;touch(p);var n=$('.node.on .t');if(n)n.textContent=p.title||'未命名';$('#m-title').textContent=p.title||'工作台'});
 $('#pg-exp').onclick=function(){menu(this,[{text:'导出为 Markdown（.md）',fn:function(){exportPageMd(p)}},{text:'导出为 JSON（.json）',fn:function(){exportPageJson(p)}}])};
 $('#pg-del').onclick=function(){delPage(p)};
}
function renderBody(){
 var p=page(UI.active),b=$('#body');
 if(!p){b.innerHTML='<div class="welcome"><h2>还没有页面</h2><p class="hint">在左侧项目空间里点 ＋ 新建，或导入备份。</p><button class="btn pri" id="w-new" type="button">新建文档</button></div>';$('#w-new').onclick=function(){createPage('doc',DB.spaces[0].id,null)};return}
 if(p.type==='doc')renderDoc(p,b);else if(p.type==='board')renderBoard(p,b);else renderTable(p,b);
}

/* ================= 文档 ================= */
function defMode(){return innerWidth>=1000?'split':'edit'}
function renderDoc(p,b){
 var mode=UI.mode||defMode();
 b.innerHTML='<div class="tools"><div class="seg" id="d-mode" role="group" aria-label="视图"><button type="button" data-m="edit">编辑</button><button type="button" data-m="split">分栏</button><button type="button" data-m="view">预览</button></div><span class="sp"></span><span class="hint" id="d-count"></span></div>'+
  '<div class="fmtbar" id="fmt"><button type="button" data-f="h1" title="一级标题">H1</button><button type="button" data-f="h2" title="二级标题">H2</button><button type="button" data-f="h3" title="三级标题">H3</button><i></i><button type="button" data-f="b" title="粗体"><b>B</b></button><button type="button" data-f="i" title="斜体"><em>I</em></button><button type="button" data-f="s" title="删除线"><s>S</s></button><button type="button" data-f="code" title="行内代码">&lt;/&gt;</button><button type="button" data-f="link" title="链接">链接</button><i></i><button type="button" data-f="ul" title="无序列表">• 列表</button><button type="button" data-f="ol" title="有序列表">1. 列表</button><button type="button" data-f="task" title="待办">☑ 待办</button><button type="button" data-f="quote" title="引用">❝ 引用</button><button type="button" data-f="pre" title="代码块">代码块</button><button type="button" data-f="table" title="表格">表格</button><button type="button" data-f="hr" title="分隔线">—</button></div>'+
  '<div class="doc" id="doc"><div class="ed"><textarea class="md" id="md" spellcheck="false" aria-label="Markdown 正文" placeholder="用 Markdown 写作：# 标题，- 列表，- [ ] 待办，> 引用，``` 代码，| 表格 |"></textarea></div><div class="pv" id="pv"></div></div>';
 var ta=$('#md'),pv=$('#pv'),doc=$('#doc'),pt=null;ta.value=p.md||'';
 function setMode(m){mode=m;UI.mode=m;saveUI();$$('#d-mode button').forEach(function(x){x.classList.toggle('on',x.dataset.m===m)});
  doc.className='doc'+(m==='split'?' m-split':'');$('.ed',doc).hidden=m==='view';pv.hidden=m==='edit';$('#fmt').hidden=m==='view';if(m!=='edit')drawPv()}
 function drawPv(){pv.innerHTML=p.md&&p.md.trim()?mdRender(p.md):'<p class="empty">（空文档。切换到「编辑」开始写，或点上方工具栏插入标题、列表、待办、代码、表格、引用。）</p>'}
 function stat(){var t=(p.md||'').replace(/\s/g,'');$('#d-count').textContent=t.length+' 字'}
 ta.addEventListener('input',function(){p.md=ta.value;touch(p);stat();if(mode!=='edit'){clearTimeout(pt);pt=setTimeout(drawPv,120)}});
 $$('#d-mode button').forEach(function(x){x.onclick=function(){setMode(x.dataset.m)}});
 pv.addEventListener('change',function(e){var c=e.target;if(!c.matches('input[type=checkbox][data-line]'))return;
  var L=p.md.replace(/\r\n?/g,'\n').split('\n'),n=+c.dataset.line;L[n]=L[n].replace(/\[( |x|X)\]/,c.checked?'[x]':'[ ]');p.md=L.join('\n');ta.value=p.md;touch(p);drawPv()});
 // 工具栏
 function sel(){return {s:ta.selectionStart,e:ta.selectionEnd,v:ta.value}}
 function put(v,s,e){ta.value=v;ta.focus();ta.setSelectionRange(s,e);ta.dispatchEvent(new Event('input',{bubbles:true}))}
 function wrap(a,z,ph){var o=sel(),t=o.v.slice(o.s,o.e)||ph;put(o.v.slice(0,o.s)+a+t+z+o.v.slice(o.e),o.s+a.length,o.s+a.length+t.length)}
 function lines(fn){var o=sel(),v=o.v,a=v.lastIndexOf('\n',o.s-1)+1,e=v.indexOf('\n',o.e);if(e<0)e=v.length;if(o.e>o.s&&v[o.e-1]==='\n')e=o.e-1;
  var seg=v.slice(a,e).split('\n'),out=fn(seg).join('\n');put(v.slice(0,a)+out+v.slice(e),a,a+out.length)}
 function prefix(rx,pf){lines(function(seg){var all=seg.every(function(l){return rx.test(l)});return seg.map(function(l,i){return all?l.replace(rx,''):pf(i)+l.replace(/^(#{1,6}\s+|\s*[-*+]\s+(\[[ xX]\]\s+)?|\s*\d+[.)]\s+|>\s?)/,'')})})}
 function block(txt){var o=sel(),pre=o.s>0&&o.v[o.s-1]!=='\n'?'\n\n':(o.s>0&&o.v[o.s-2]!=='\n'?'\n':''),post=o.v[o.e]==='\n'?'':'\n';put(o.v.slice(0,o.s)+pre+txt+post+o.v.slice(o.e),o.s+pre.length+txt.length,o.s+pre.length+txt.length)}
 var F={h1:function(){prefix(/^# /,function(){return '# '})},h2:function(){prefix(/^## /,function(){return '## '})},h3:function(){prefix(/^### /,function(){return '### '})},
  b:function(){wrap('**','**','粗体')},i:function(){wrap('*','*','斜体')},s:function(){wrap('~~','~~','删除线')},code:function(){wrap('`','`','代码')},
  link:function(){var o=sel(),t=o.v.slice(o.s,o.e)||'链接文字',u='https://';put(o.v.slice(0,o.s)+'['+t+']('+u+')'+o.v.slice(o.e),o.s+t.length+3,o.s+t.length+3+u.length)},
  ul:function(){prefix(/^\s*[-*+]\s+(?!\[)/,function(){return '- '})},ol:function(){prefix(/^\s*\d+[.)]\s+/,function(i){return (i+1)+'. '})},task:function(){prefix(/^\s*[-*+]\s+\[[ xX]\]\s+/,function(){return '- [ ] '})},quote:function(){prefix(/^>\s?/,function(){return '> '})},
  pre:function(){var o=sel(),t=o.v.slice(o.s,o.e);if(t){put(o.v.slice(0,o.s)+'```\n'+t+'\n```'+o.v.slice(o.e),o.s+4,o.s+4+t.length)}else{block('```\n代码\n```');var v=ta.value,i=v.lastIndexOf('代码\n```');ta.setSelectionRange(i,i+2)}},
  table:function(){block('| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |')},hr:function(){block('---')}};
 $('#fmt').addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
 $('#fmt').addEventListener('click',function(e){var x=e.target.closest('button[data-f]');if(x)F[x.dataset.f]()});
 // 回车延续列表
 ta.addEventListener('keydown',function(e){
  if(e.key!=='Enter'||e.shiftKey||e.isComposing||ta.selectionStart!==ta.selectionEnd)return;
  var v=ta.value,pos=ta.selectionStart,a=v.lastIndexOf('\n',pos-1)+1,line=v.slice(a,pos),m=/^(\s*)([-*+]|\d+)([.)]?)\s+(\[[ xX]\]\s+)?(.*)$/.exec(line);if(!m)return;
  var isNum=/\d/.test(m[2]);if(!isNum&&m[3])return;e.preventDefault();
  if(!m[5]){put(v.slice(0,a)+v.slice(pos),a,a);return}
  var pf=m[1]+(isNum?(+m[2]+1)+m[3]:m[2])+' '+(m[4]?'[ ] ':''),ins='\n'+pf;put(v.slice(0,pos)+ins+v.slice(pos),pos+ins.length,pos+ins.length)});
 setMode(mode);stat();
}

/* ================= 看板 ================= */
function dueCls(c){if(!c.due||c.done)return '';var t=today();return c.due<t?' over':c.due===t?' today':''}
function dueTxt(c){if(!c.due)return '';var t=today();return (c.due<t&&!c.done?'已逾期 · ':c.due===t&&!c.done?'今天 · ':'')+c.due.slice(5).replace('-','月')+'日'}
function renderBoard(p,b){
 var html='<div class="tools"><span class="hint">拖动卡片 / 列标题左侧的 ⋮⋮ 调整位置；点卡片标题编辑。手机上也可在卡片详情里选择所在列。</span></div><div class="board" id="board">';
 p.cols.forEach(function(c){
  html+='<div class="col" data-col="'+c.id+'"><div class="col-h"><span class="grip cgrip" title="拖动列">⋮⋮</span><input value="'+h(c.title)+'" aria-label="列名" data-a="ctitle" maxlength="100"><span class="cnt">'+c.cards.length+'</span><button class="tb" type="button" data-a="cmenu" aria-label="列菜单">⋯</button></div><div class="cards">';
  c.cards.forEach(function(k){html+=cardHtml(k)});
  html+='</div><form class="add-card" data-a="addcard"><input class="fi" placeholder="＋ 添加卡片，回车确认" maxlength="500" aria-label="新卡片标题"></form></div>';
 });
 html+='<form class="add-col" data-a="addcol"><input class="fi" placeholder="＋ 新建列" maxlength="100" aria-label="新列名"></form></div>';
 b.innerHTML=html;bindBoard(p,b);
}
function cardHtml(k){return '<div class="kc'+(k.done?' done':'')+'" data-card="'+k.id+'"><input type="checkbox" class="ck" aria-label="完成"'+(k.done?' checked':'')+'><div class="bd"><div class="tt" data-a="edit" tabindex="0" role="button">'+h(k.title||'（无标题）')+'</div>'+(k.desc?'<div class="ds">'+h(k.desc)+'</div>':'')+(k.due?'<span class="due'+dueCls(k)+'">'+dueTxt(k)+'</span>':'')+'</div><span class="grip" title="拖动">⋮⋮</span></div>'}
function findCard(p,id){for(var i=0;i<p.cols.length;i++){var j=p.cols[i].cards.findIndex(function(k){return k.id===id});if(j>=0)return {col:p.cols[i],i:j,card:p.cols[i].cards[j]}}return null}
function bindBoard(p,b){
 var bd=$('#board');
 bd.addEventListener('change',function(e){
  if(e.target.matches('.ck')){var f=findCard(p,e.target.closest('.kc').dataset.card);f.card.done=e.target.checked;touch(p);renderBoard(p,b)}
  else if(e.target.matches('[data-a=ctitle]')){var c=p.cols.find(function(x){return x.id===e.target.closest('.col').dataset.col});c.title=e.target.value.trim()||'未命名列';e.target.value=c.title;touch(p)}});
 bd.addEventListener('submit',function(e){e.preventDefault();var f=e.target,v=$('input',f).value.trim();if(!v)return;
  if(f.dataset.a==='addcard'){var c=p.cols.find(function(x){return x.id===f.closest('.col').dataset.col});c.cards.push({id:uid(),title:v,desc:'',due:'',done:false});touch(p);var keep=c.id;renderBoard(p,b);var i=$('.col[data-col="'+keep+'"] .add-card input');if(i)i.focus()}
  else{p.cols.push({id:uid(),title:v,cards:[]});touch(p);renderBoard(p,b);bd=$('#board');bd.scrollLeft=bd.scrollWidth}});
 bd.addEventListener('click',function(e){
  var t=e.target.closest('[data-a=edit]');if(t){cardDialog(p,t.closest('.kc').dataset.card,b);return}
  var m=e.target.closest('[data-a=cmenu]');if(m){var col=p.cols.find(function(x){return x.id===m.closest('.col').dataset.col}),ci=p.cols.indexOf(col);
   menu(m,[{text:'左移',off:ci===0,fn:function(){p.cols.splice(ci,1);p.cols.splice(ci-1,0,col);touch(p);renderBoard(p,b)}},{text:'右移',off:ci===p.cols.length-1,fn:function(){p.cols.splice(ci,1);p.cols.splice(ci+1,0,col);touch(p);renderBoard(p,b)}},{text:'清除已完成卡片',fn:function(){var n=col.cards.filter(function(k){return k.done}).length;if(!n){toast('这一列没有已完成卡片');return}col.cards=col.cards.filter(function(k){return !k.done});touch(p);renderBoard(p,b);toast('已清除 '+n+' 张')}},'-',
    {text:'删除列',cls:'dng',fn:async function(){if(col.cards.length&&!(await ask('删除列','「'+col.title+'」里有 '+col.cards.length+' 张卡片，将一并删除。继续？','删除',true)))return;p.cols.splice(ci,1);touch(p);renderBoard(p,b)}}])}});
 bd.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches('[data-a=edit]')){cardDialog(p,e.target.closest('.kc').dataset.card,b)}});
 // 拖拽（鼠标可拖整张卡片；触屏仅 ⋮⋮ 手柄）
 bd.addEventListener('pointerdown',function(e){
  if(e.button>0)return;var grip=e.target.closest('.grip'),card=e.target.closest('.kc'),colH=e.target.closest('.cgrip');
  var kind=colH?'col':card&&(grip||(e.pointerType==='mouse'&&!e.target.closest('input,button')))?'card':null;if(!kind)return;
  var src=kind==='col'?colH.closest('.col'):card,sx=e.clientX,sy=e.clientY,started=false,ghost,mark,off;
  if(grip)e.preventDefault();
  function start(){started=true;var r=src.getBoundingClientRect();off=[sx-r.left,sy-r.top];ghost=src.cloneNode(true);ghost.classList.add('ghost');ghost.style.width=r.width+'px';document.body.appendChild(ghost);
   mark=document.createElement('div');mark.className='dropmark'+(kind==='col'?' col':'');if(kind==='card')mark.style.height=r.height+'px';src.classList.add('drag-src');src.after(mark);document.body.style.userSelect='none'}
  function mv(ev){
   if(!started){if(Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)<7)return;start()}
   ev.preventDefault();ghost.style.left=(ev.clientX-off[0])+'px';ghost.style.top=(ev.clientY-off[1])+'px';
   var bb=bd.getBoundingClientRect();if(ev.clientX>bb.right-50)bd.scrollLeft+=16;else if(ev.clientX<bb.left+50)bd.scrollLeft-=16;
   var el=document.elementFromPoint(ev.clientX,ev.clientY);if(!el)return;
   if(kind==='col'){var oc=el.closest('.col:not(.ghost):not(.dropmark)');if(oc&&oc!==src){var r=oc.getBoundingClientRect();if(ev.clientX<r.left+r.width/2)oc.before(mark);else oc.after(mark)}}
   else{var ocards=el.closest('.cards'),ok=el.closest('.kc:not(.ghost)');
    if(ok&&ok!==src&&ok.closest('.cards')){var r2=ok.getBoundingClientRect();if(ev.clientY<r2.top+r2.height/2)ok.before(mark);else ok.after(mark)}
    else if(ocards&&!ok){ocards.appendChild(mark)}
    else{var oc2=el.closest('.col:not(.ghost)');if(oc2&&oc2.querySelector('.cards'))oc2.querySelector('.cards').appendChild(mark)}
    var cr=ocards||(el.closest('.col')&&el.closest('.col').querySelector('.cards'));if(cr){var rr=cr.getBoundingClientRect();if(ev.clientY>rr.bottom-30)cr.scrollTop+=10;else if(ev.clientY<rr.top+30)cr.scrollTop-=10}}
  }
  function up(ev){
   window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);document.body.style.userSelect='';
   if(!started)return;ghost.remove();var sup=function(ce){ce.stopPropagation();ce.preventDefault()};window.addEventListener('click',sup,true);setTimeout(function(){window.removeEventListener('click',sup,true)},0);
   if(ev.type==='pointercancel'||!mark.parentNode){mark&&mark.remove();src.classList.remove('drag-src');return}
   if(kind==='col'){var ids=[];[].forEach.call(bd.children,function(n){if(n===mark)ids.push(src.dataset.col);else if(n!==src&&n.dataset&&n.dataset.col)ids.push(n.dataset.col)});
    var map={};p.cols.forEach(function(c){map[c.id]=c});p.cols=ids.map(function(i){return map[i]}).filter(Boolean)}
   else{var id=src.dataset.card,f=findCard(p,id),tcol=mark.closest('.col');if(!tcol||!f){mark.remove();src.classList.remove('drag-src');return}
    var before=[].filter.call(mark.parentNode.children,function(n){return n.classList.contains('kc')&&n!==src&&n!==ghost});
    var idx=0;for(var n=mark.previousElementSibling;n;n=n.previousElementSibling){if(n.classList.contains('kc')&&n!==src)idx++}
    var dest=p.cols.find(function(c){return c.id===tcol.dataset.col});f.col.cards.splice(f.i,1);dest.cards.splice(idx,0,f.card)}
   touch(p);renderBoard(p,b);
  }
  window.addEventListener('pointermove',mv,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
 });
}
function cardDialog(p,id,b){
 var f=findCard(p,id);if(!f)return;var k=f.card;
 var ov=modal('卡片详情','<label class="f">标题<input class="fi" id="k-t" maxlength="500" value="'+h(k.title)+'"></label><label class="f">备注<textarea class="fi" id="k-d" maxlength="5000">'+h(k.desc)+'</textarea></label><div class="f2"><label class="f">截止日期<input class="fi" id="k-due" type="date" value="'+h(k.due)+'"></label><label class="f">所在列<select class="fi" id="k-c">'+p.cols.map(function(c){return '<option value="'+c.id+'"'+(c.id===f.col.id?' selected':'')+'>'+h(c.title)+'</option>'}).join('')+'</select></label></div><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="k-done"'+(k.done?' checked':'')+'> 已完成</label>',
  [{text:'删除卡片',cls:'dng',fn:function(){f.col.cards.splice(f.i,1);touch(p);renderBoard(p,b)}},{text:'取消'},{text:'保存',cls:'pri',fn:function(o){
   k.title=$('#k-t',o).value.trim()||'（无标题）';k.desc=$('#k-d',o).value;k.due=$('#k-due',o).value;k.done=$('#k-done',o).checked;
   var nc=p.cols.find(function(c){return c.id===$('#k-c',o).value});if(nc&&nc!==f.col){f.col.cards.splice(f.i,1);nc.cards.push(k)}touch(p);renderBoard(p,b)}}]);
}

/* ================= 表格 ================= */
var TYN={text:'文本',number:'数字',date:'日期',select:'选择'};
var OPS={text:[['contains','包含'],['eq','等于'],['empty','为空'],['notempty','不为空']],number:[['eq','='],['gt','>'],['gte','≥'],['lt','<'],['lte','≤'],['empty','为空'],['notempty','不为空']],date:[['eq','是'],['before','早于'],['after','晚于'],['empty','为空'],['notempty','不为空']],select:[['eq','是'],['neq','不是'],['empty','为空'],['notempty','不为空']]};
function isEmpty(v){return v===''||v==null}
function passFilter(f,col,v){
 if(!f||!col)return true;var o=f.op,x=f.val;
 if(o==='empty')return isEmpty(v);if(o==='notempty')return !isEmpty(v);
 if(x===''&&o!=='eq'&&o!=='neq')return true;if(x===''&&(o==='eq'||o==='neq')&&col.type!=='select')return true;
 if(col.type==='text'){v=String(v||'').toLowerCase();x=x.toLowerCase();return o==='eq'?v===x:v.indexOf(x)>=0}
 if(col.type==='number'){if(isEmpty(v))return false;var n=parseFloat(x);if(!isFinite(n))return true;return o==='eq'?v===n:o==='gt'?v>n:o==='gte'?v>=n:o==='lt'?v<n:v<=n}
 if(col.type==='date'){if(isEmpty(v))return false;return o==='eq'?v===x:o==='before'?v<x:v>x}
 return o==='neq'?v!==x:v===x;
}
function tableRows(p,q){
 var cols={};p.cols.forEach(function(c){cols[c.id]=c});
 var rows=p.rows.filter(function(r){
  if(p.filter&&!passFilter(p.filter,cols[p.filter.col],r.cells[p.filter.col]))return false;
  if(q){q=q.toLowerCase();return p.cols.some(function(c){return String(r.cells[c.id]==null?'':r.cells[c.id]).toLowerCase().indexOf(q)>=0})}return true});
 if(p.sort&&cols[p.sort.col]){var c=cols[p.sort.col],d=p.sort.dir==='desc'?-1:1;
  rows=rows.map(function(r,i){return [r,i]}).sort(function(A,B){var a=A[0].cells[c.id],b=B[0].cells[c.id],ea=isEmpty(a),eb=isEmpty(b);if(ea||eb)return ea&&eb?A[1]-B[1]:ea?1:-1;
   var r=c.type==='number'?a-b:c.type==='text'?String(a).localeCompare(String(b),'zh'):a<b?-1:a>b?1:0;return r*d||A[1]-B[1]}).map(function(x){return x[0]})}
 return rows;
}
function fmtNum(n){return (Math.round(n*1e6)/1e6).toLocaleString('zh-CN',{maximumFractionDigits:6})}
function renderTable(p,b){
 var q='';
 b.innerHTML='<div class="tools" id="t-tools"></div><div class="tbl-wrap"><table class="dt" id="dt"></table></div><div class="tools" style="margin-top:12px"><button class="btn" id="t-addrow" type="button">＋ 添加行</button><button class="btn" id="t-addcol" type="button">＋ 添加列</button><span class="sp"></span><span class="hint">排序与筛选只改变显示，不会改动数据顺序。</span></div>';
 function toolbar(){
  var colOpts=function(sel){return p.cols.map(function(c){return '<option value="'+c.id+'"'+(sel===c.id?' selected':'')+'>'+h(c.name)+'</option>'}).join('')};
  var f=p.filter,fc=f&&p.cols.find(function(c){return c.id===f.col});
  var s='<input class="fi" id="t-q" placeholder="搜索本表…" value="'+h(q)+'" aria-label="搜索本表" style="width:150px">';
  s+='<span class="hint">排序</span><select class="fi" id="t-sc"><option value="">（不排序）</option>'+colOpts(p.sort&&p.sort.col)+'</select>'+(p.sort?'<button class="btn sm" id="t-sd" type="button">'+(p.sort.dir==='desc'?'降序 ↓':'升序 ↑')+'</button>':'');
  s+='<span class="hint" style="margin-left:6px">筛选</span><select class="fi" id="t-fc"><option value="">（不筛选）</option>'+colOpts(f&&f.col)+'</select>';
  if(fc){s+='<select class="fi" id="t-fo">'+OPS[fc.type].map(function(o){return '<option value="'+o[0]+'"'+(f.op===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>';
   if(f.op!=='empty'&&f.op!=='notempty')s+=fc.type==='select'?'<select class="fi" id="t-fv"><option value="">（选择）</option>'+(fc.options||[]).map(function(o){return '<option'+(f.val===o?' selected':'')+'>'+h(o)+'</option>'}).join('')+'</select>':'<input class="fi" id="t-fv" type="'+(fc.type==='date'?'date':fc.type==='number'?'number':'text')+'" step="any" value="'+h(f.val)+'" style="width:130px" aria-label="筛选值">'}
  $('#t-tools').innerHTML=s;
 }
 function head(){return '<thead><tr><th class="rn">#</th>'+p.cols.map(function(c){var mk=p.sort&&p.sort.col===c.id?(p.sort.dir==='desc'?' ↓':' ↑'):'';return '<th><button type="button" data-col="'+c.id+'" title="点击编辑列">'+h(c.name)+mk+'<span class="ty">'+TYN[c.type]+'</span></button></th>'}).join('')+'<th class="rn"></th></tr></thead>'}
 function cell(c,v,rid){
  var a=' data-r="'+rid+'" data-c="'+c.id+'" aria-label="'+h(c.name)+'"';
  if(c.type==='select')return '<select'+a+'><option value=""></option>'+(c.options||[]).concat(v&&(c.options||[]).indexOf(v)<0?[v]:[]).map(function(o){return '<option'+(o===v?' selected':'')+'>'+h(o)+'</option>'}).join('')+'</select>';
  if(c.type==='number')return '<input class="num" type="number" step="any"'+a+' value="'+h(v)+'">';
  if(c.type==='date')return '<input type="date"'+a+' value="'+h(v)+'">';
  return '<input type="text"'+a+' value="'+h(v)+'">';
 }
 function body(){
  var rows=tableRows(p,q),dt=$('#dt');
  var html=head()+'<tbody>'+rows.map(function(r,i){return '<tr data-rid="'+r.id+'"><td class="rn">'+(i+1)+'</td>'+p.cols.map(function(c){return '<td>'+cell(c,r.cells[c.id],r.id)+'</td>'}).join('')+'<td class="act"><button type="button" data-del="'+r.id+'" aria-label="删除此行" title="删除此行">×</button></td></tr>'}).join('')+'</tbody>';
  html+='<tfoot><tr><td class="rn"></td>'+p.cols.map(function(c,i){
   if(c.type==='number'){var vs=rows.map(function(r){return r.cells[c.id]}).filter(function(v){return typeof v==='number'}),sum=vs.reduce(function(a,x){return a+x},0);return '<td class="n">'+(vs.length?'合计 '+fmtNum(sum)+' · 均值 '+fmtNum(sum/vs.length):'—')+'</td>'}
   return '<td>'+(i===0?'共 '+p.rows.length+' 行'+(rows.length!==p.rows.length?'，显示 '+rows.length+' 行':''):'')+'</td>'}).join('')+'<td></td></tr></tfoot>';
  dt.innerHTML=html;
  if(!p.cols.length)dt.innerHTML='<tbody><tr><td><div class="empty-state">还没有列，点下方「添加列」</div></td></tr></tbody>';
  else if(!rows.length){var tb=$('tbody',dt);tb.innerHTML='<tr><td colspan="'+(p.cols.length+2)+'"><div class="empty-state">'+(p.rows.length?'没有符合当前筛选/搜索的行':'还没有数据，点「添加行」')+'</div></td></tr>'}
 }
 function full(){toolbar();body()}
 function sums(){ // 只刷新页脚（编辑数字时不重绘整表，避免丢失焦点）
  var rows=tableRows(p,q),tds=$$('#dt tfoot td');p.cols.forEach(function(c,i){if(c.type==='number'){var vs=rows.map(function(r){return r.cells[c.id]}).filter(function(v){return typeof v==='number'}),sum=vs.reduce(function(a,x){return a+x},0);tds[i+1].textContent=vs.length?'合计 '+fmtNum(sum)+' · 均值 '+fmtNum(sum/vs.length):'—'}})}
 var tools=$('#t-tools');
 tools.addEventListener('input',function(e){if(e.target.id==='t-q'){q=e.target.value;body()}else if(e.target.id==='t-fv'&&e.target.tagName==='INPUT'){p.filter.val=e.target.value;touch(p);body()}});
 tools.addEventListener('change',function(e){var id=e.target.id,v=e.target.value;
  if(id==='t-sc'){p.sort=v?{col:v,dir:'asc'}:null;touch(p);full()}
  else if(id==='t-fc'){p.filter=v?{col:v,op:OPS[p.cols.find(function(c){return c.id===v}).type][0][0],val:''}:null;touch(p);full()}
  else if(id==='t-fo'){p.filter.op=v;touch(p);full()}
  else if(id==='t-fv'&&e.target.tagName==='SELECT'){p.filter.val=v;touch(p);body()}});
 tools.addEventListener('click',function(e){if(e.target.id==='t-sd'){p.sort.dir=p.sort.dir==='desc'?'asc':'desc';touch(p);full()}});
 var dt=$('#dt');
 dt.addEventListener('input',function(e){var t=e.target;if(!t.dataset.r||t.tagName==='SELECT')return;setCell(t)});
 dt.addEventListener('change',function(e){var t=e.target;if(!t.dataset.r)return;setCell(t);if(t.tagName==='SELECT'||t.type==='date'||(p.sort&&p.sort.col===t.dataset.c)||p.filter||q){if(t.tagName==='SELECT'||t.type==='date'||(p.sort&&p.sort.col===t.dataset.c)||(p.filter&&p.filter.col===t.dataset.c))body()}});
 function setCell(t){var r=p.rows.find(function(x){return x.id===t.dataset.r}),c=p.cols.find(function(x){return x.id===t.dataset.c});if(!r||!c)return;
  var v=t.value;if(c.type==='number'){var n=parseFloat(v);v=v!==''&&isFinite(n)?n:''}r.cells[c.id]=v;touch(p);if(c.type==='number')sums()}
 dt.addEventListener('click',async function(e){
  var d=e.target.closest('[data-del]');if(d){var r=p.rows.find(function(x){return x.id===d.dataset.del});var has=p.cols.some(function(c){return !isEmpty(r.cells[c.id])});
   if(has&&!(await ask('删除行','确定删除这一行？','删除',true)))return;p.rows=p.rows.filter(function(x){return x!==r});touch(p);body();return}
  var c=e.target.closest('[data-col]');if(c)colDialog(p.cols.find(function(x){return x.id===c.dataset.col}))});
 $('#t-addrow').onclick=function(){if(!p.cols.length){toast('请先添加列');return}var cells={};p.cols.forEach(function(c){cells[c.id]=''});var r={id:uid(),cells:cells};p.rows.push(r);touch(p);q='';p.filter=null;toolbar();body();var w=$('.tbl-wrap');w.scrollTop=w.scrollHeight;var i=$('tr[data-rid="'+r.id+'"] input');if(i)i.focus()};
 $('#t-addcol').onclick=function(){colDialog(null)};
 function colDialog(c){
  var isNew=!c,cur=c||{id:uid(),name:'新列',type:'text'};
  var ov=modal(isNew?'添加列':'编辑列','<label class="f">列名<input class="fi" id="c-n" maxlength="100" value="'+h(cur.name)+'"></label><label class="f">类型<select class="fi" id="c-t">'+Object.keys(TYN).map(function(t){return '<option value="'+t+'"'+(cur.type===t?' selected':'')+'>'+TYN[t]+'</option>'}).join('')+'</select></label><label class="f" id="c-ow"'+(cur.type==='select'?'':' hidden')+'>选项（用逗号或换行分隔）<textarea class="fi" id="c-o" placeholder="例如：待处理, 进行中, 完成">'+h((cur.options||[]).join(', '))+'</textarea></label><p class="hint" id="c-w"></p>',
   (isNew?[]:[{text:'删除列',cls:'dng',fn:async function(){if(!(await ask('删除列','删除列「'+cur.name+'」会同时删除这一列的所有数据。继续？','删除',true)))return;p.cols=p.cols.filter(function(x){return x!==cur});p.rows.forEach(function(r){delete r.cells[cur.id]});if(p.sort&&p.sort.col===cur.id)p.sort=null;if(p.filter&&p.filter.col===cur.id)p.filter=null;touch(p);full()}}]).concat([{text:'取消'},{text:'保存',cls:'pri',fn:function(o){
    var name=$('#c-n',o).value.trim()||'未命名列',type=$('#c-t',o).value,opts=$('#c-o',o).value.split(/[,，\n]/).map(function(x){return x.trim()}).filter(function(x,i,a){return x&&a.indexOf(x)===i});
    if(isNew){var nc={id:cur.id,name:name,type:type};if(type==='select')nc.options=opts;p.cols.push(nc);p.rows.forEach(function(r){r.cells[nc.id]=''})}
    else{if(type!==cur.type)convert(cur,type,opts);cur.name=name;cur.type=type;if(type==='select'){cur.options=opts.slice();p.rows.forEach(function(r){var v=r.cells[cur.id];if(v&&cur.options.indexOf(v)<0)cur.options.push(v)})}else delete cur.options}
    touch(p);full()}}]));
  function warn(){var t=$('#c-t',ov).value;$('#c-ow',ov).hidden=t!=='select';var w=$('#c-w',ov);w.textContent='';if(!isNew&&t!==cur.type){var lost=0;p.rows.forEach(function(r){var v=r.cells[cur.id];if(isEmpty(v))return;if(t==='number'&&!isFinite(parseFloat(v)))lost++;if(t==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))lost++});w.textContent=lost?'注意：转换为「'+TYN[t]+'」后，有 '+lost+' 个单元格无法转换，将被清空。':'转换类型不会丢失数据。'}}
  $('#c-t',ov).onchange=warn;warn();
 }
 function convert(c,t){p.rows.forEach(function(r){var v=r.cells[c.id];if(isEmpty(v)){r.cells[c.id]='';return}
  if(t==='number'){var n=parseFloat(v);r.cells[c.id]=isFinite(n)?n:''}else if(t==='date'){r.cells[c.id]=/^\d{4}-\d{2}-\d{2}$/.test(String(v))?v:''}else r.cells[c.id]=String(v)})}
 full();
}

/* ================= 搜索 ================= */
function pageText(p){
 if(p.type==='doc')return p.md||'';
 if(p.type==='board')return p.cols.map(function(c){return c.title+'\n'+c.cards.map(function(k){return k.title+' '+(k.desc||'')+' '+(k.due||'')}).join('\n')}).join('\n');
 return p.cols.map(function(c){return c.name}).join(' ')+'\n'+p.rows.map(function(r){return p.cols.map(function(c){return r.cells[c.id]==null?'':r.cells[c.id]}).join(' ')}).join('\n');
}
function hl(text,q){var lo=text.toLowerCase(),ql=q.toLowerCase(),out='',i=0,k;while((k=lo.indexOf(ql,i))>=0){out+=h(text.slice(i,k))+'<mark>'+h(text.slice(k,k+q.length))+'</mark>';i=k+q.length}return out+h(text.slice(i))}
function search(q){
 q=q.trim();if(!q)return [];var ql=q.toLowerCase(),res=[];
 DB.pages.forEach(function(p){
  var tm=(p.title||'').toLowerCase().indexOf(ql)>=0,tx=pageText(p).replace(/\s+/g,' '),k=tx.toLowerCase().indexOf(ql);
  if(!tm&&k<0)return;
  var sn=k>=0?(k>30?'…':'')+tx.slice(Math.max(0,k-30),k+q.length+70)+(k+q.length+70<tx.length?'…':''):tx.slice(0,90);
  res.push({p:p,score:(tm?10:0)+(k>=0?1:0),sn:sn,hit:k>=0})});
 return res.sort(function(a,b){return b.score-a.score}).slice(0,40);
}
function openSearch(){
 closeModal();closeMenu();var ov=document.createElement('div');ov.className='ov';
 ov.innerHTML='<div class="sr-box" role="dialog" aria-modal="true" aria-label="全局搜索"><div class="sr-in"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="sr-q" type="search" placeholder="搜索标题和内容…" autocomplete="off" aria-label="搜索"><button class="icon-btn" type="button" data-x aria-label="关闭" style="color:#fff">×</button></div><div class="sr-l" id="sr-l"><div class="sr-e">输入关键词，搜索所有项目空间的文档、看板卡片和表格内容</div></div></div>';
 mroot.appendChild(ov);document.addEventListener('keydown',escH);
 var inp=$('#sr-q',ov),list=$('#sr-l',ov),res=[],cur=0;
 ov.addEventListener('mousedown',function(e){if(e.target===ov)closeModal()});$('[data-x]',ov).onclick=closeModal;
 function draw(){var q=inp.value.trim();res=search(q);cur=0;
  if(!q){list.innerHTML='<div class="sr-e">输入关键词，搜索所有项目空间的文档、看板卡片和表格内容</div>';return}
  if(!res.length){list.innerHTML='<div class="sr-e">没有找到「'+h(q)+'」</div>';return}
  list.innerHTML=res.map(function(r,i){var sp=spaceOf(r.p);return '<button type="button" class="sr-i'+(i===0?' on':'')+'" data-i="'+i+'"><b>'+IC[r.p.type]+hl(r.p.title||'未命名',q)+'<small>'+TN[r.p.type]+' · '+h(sp?sp.name:'')+'</small></b><p>'+hl(r.sn,q)+'</p></button>'}).join('')}
 function go(i){var r=res[i];if(!r)return;closeModal();openPage(r.p.id);closeSide()}
 inp.addEventListener('input',draw);
 inp.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var its=$$('.sr-i',list);if(!its.length)return;its[cur].classList.remove('on');cur=(cur+(e.key==='ArrowDown'?1:-1)+its.length)%its.length;its[cur].classList.add('on');its[cur].scrollIntoView({block:'nearest'})}else if(e.key==='Enter'){e.preventDefault();go(cur)}});
 list.addEventListener('click',function(e){var b=e.target.closest('.sr-i');if(b)go(+b.dataset.i)});
 inp.focus();
}
$('#s-search').onclick=openSearch;$('#m-search').onclick=openSearch;
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});

/* ================= 导出 / 导入 ================= */
function download(data,name,type){var blob=data instanceof Blob?data:new Blob([data],{type:type||'text/plain;charset=utf-8'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000)}
function safeName(s){return (s||'未命名').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/^\.+/,'').trim().slice(0,60)||'未命名'}
function cellMd(v){return String(v==null?'':v).replace(/\|/g,'\\|').replace(/\n/g,' ')}
function pageToMd(p){
 var t='# '+p.title+'\n\n';
 if(p.type==='doc')return /^#\s/.test(p.md||'')?p.md:t+(p.md||'');
 if(p.type==='board')return t+p.cols.map(function(c){return '## '+c.title+'\n\n'+(c.cards.length?c.cards.map(function(k){return '- ['+(k.done?'x':' ')+'] '+k.title+(k.due?'（截止 '+k.due+'）':'')+(k.desc?'\n'+k.desc.split('\n').map(function(l){return '  '+l}).join('\n'):'')}).join('\n'):'（空）')+'\n'}).join('\n');
 if(!p.cols.length)return t+'（空表格）\n';
 return t+'| '+p.cols.map(function(c){return cellMd(c.name)}).join(' | ')+' |\n| '+p.cols.map(function(){return '---'}).join(' | ')+' |\n'+p.rows.map(function(r){return '| '+p.cols.map(function(c){return cellMd(r.cells[c.id])}).join(' | ')+' |'}).join('\n')+'\n';
}
function exportPageMd(p){download(pageToMd(p),safeName(p.title)+'.md','text/markdown;charset=utf-8')}
function bundle(spaceIds,pages){return {app:'gongzuotai',version:1,exportedAt:new Date().toISOString(),spaces:DB.spaces.filter(function(s){return spaceIds.indexOf(s.id)>=0}),pages:pages}}
function exportPageJson(p){var ids=[p.id].concat(descendants(p.id));var pp=DB.pages.filter(function(x){return ids.indexOf(x.id)>=0}).map(function(x){return x.id===p.id?Object.assign({},x,{pid:null}):x});
 download(JSON.stringify(bundle([p.sid],pp),null,1),safeName(p.title)+'.gongzuotai.json','application/json')}
function stamp(){return today().replace(/-/g,'')}
function exportJson(){
 DB.lastBackup=Date.now();persist();
 var o=Object.assign({app:'gongzuotai',version:1,exportedAt:new Date().toISOString()},{spaces:DB.spaces,pages:DB.pages,lastBackup:DB.lastBackup});
 download(JSON.stringify(o,null,1),'工作台备份-'+stamp()+'.json','application/json');renderNote();toast('已导出完整备份（JSON）')
}
async function exportZip(onlySid){
 var zip=new JSZip(),used={};
 function uniq(path){var k=path.toLowerCase(),n=used[k]||0;used[k]=n+1;return n?path.replace(/(\.md)?$/,'-'+(n+1)+'$1'):path}
 DB.spaces.filter(function(s){return !onlySid||s.id===onlySid}).forEach(function(s){
  DB.pages.filter(function(p){return p.sid===s.id}).forEach(function(p){
   var dirs=path(p).slice(0,-1).map(function(x){return safeName(x.title)}).join('/');
   zip.file(uniq(safeName(s.name)+'/'+(dirs?dirs+'/':'')+safeName(p.title)+'.md'),pageToMd(p))})});
 var blob=await zip.generateAsync({type:'blob'});download(blob,(onlySid?safeName(DB.spaces.find(function(s){return s.id===onlySid}).name):'工作台全部')+'-Markdown-'+stamp()+'.zip','application/zip');toast('已导出 Markdown ZIP')
}
function exportDialog(){
 var n=DB.pages.length;
 modal('备份导出','<p style="margin:0">共 '+DB.spaces.length+' 个项目空间、'+n+' 个页面。</p><button class="btn pri" type="button" id="x-json" style="align-self:flex-start">下载完整备份（JSON，推荐）</button><p class="hint" style="margin-top:-6px">包含全部空间与页面结构，可用「导入备份」原样恢复。</p><button class="btn" type="button" id="x-zip" style="align-self:flex-start">下载全部 Markdown（ZIP）</button><p class="hint" style="margin-top:-6px">每页一个 .md 文件，便于在其他笔记软件打开；看板和表格会转成列表/表格文本，无法再导回为看板。</p>',[{text:'关闭'}],{nofocus:true});
 $('#x-json').onclick=function(){exportJson();closeModal()};$('#x-zip').onclick=function(){exportZip();closeModal()};
}
function importFile(f){
 var r=new FileReader();r.onerror=function(){toast('读取文件失败')};
 r.onload=function(){
  var txt=String(r.result);
  if(/\.(md|markdown|txt)$/i.test(f.name)){var sid=(page(UI.active)||{sid:DB.spaces[0].id}).sid,p=blankPage('doc',sid,null,f.name.replace(/\.[^.]+$/,''));p.md=txt;DB.pages.push(p);touch(p);openPage(p.id);toast('已导入为新文档');return}
  var o;try{o=JSON.parse(txt)}catch(e){toast('不是有效的 JSON 文件');return}
  var v=validate(o);if(!v.ok){toast('导入失败：'+v.err);return}
  var np=v.db.pages.length,ns=v.db.spaces.length;
  modal('导入备份','<p style="margin:0">文件「'+h(f.name)+'」包含 '+ns+' 个项目空间、'+np+' 个页面'+(v.skipped?'（有 '+v.skipped+' 个无效页面已跳过）':'')+'。</p><div class="seg" id="i-mode" style="align-self:flex-start"><button type="button" class="on" data-m="merge">合并到现有数据</button><button type="button" data-m="replace">覆盖现有数据</button></div><p class="hint" id="i-h">合并：导入内容作为新的项目空间追加，不改动已有页面。</p>',
   [{text:'取消'},{text:'导入',cls:'pri',fn:function(o2){
    var mode=$('#i-mode .on',o2).dataset.m;
    if(mode==='replace'){try{localStorage.setItem(PREV,JSON.stringify(DB))}catch(e){}DB=v.db;DB.edits=0;UI.active=null;UI.open={};persist();saveUI();firstPage();toast('已覆盖导入（可在「更多」里撤销）')}
    else{var sm={},pm={};v.db.spaces.forEach(function(s){sm[s.id]=uid();DB.spaces.push({id:sm[s.id],name:s.name})});v.db.pages.forEach(function(p){pm[p.id]=uid()});
     v.db.pages.forEach(function(p){var q=JSON.parse(JSON.stringify(p));q.id=pm[p.id];q.sid=sm[p.sid];q.pid=p.pid?pm[p.pid]:null;DB.pages.push(q)});DB.edits=(DB.edits||0)+1;persist();renderTree();toast('已合并导入 '+np+' 个页面');if(!page(UI.active))firstPage()}
   }}],{nofocus:true});
  $$('#i-mode button').forEach(function(b){b.onclick=function(){$$('#i-mode button').forEach(function(x){x.classList.toggle('on',x===b)});$('#i-h').textContent=b.dataset.m==='merge'?'合并：导入内容作为新的项目空间追加，不改动已有页面。':'覆盖：先把当前全部数据保存一份快照（可撤销），再用备份文件替换。'}});
 };
 r.readAsText(f);
}
$('#b-import').onclick=function(){$('#f-import').click()};
$('#f-import').onchange=function(){var f=this.files[0];this.value='';if(f)importFile(f)};
$('#b-export').onclick=exportDialog;
window.addEventListener('dragover',function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],'Files')>=0)e.preventDefault()});
window.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&/\.(json|md|markdown|txt)$/i.test(f.name)){e.preventDefault();importFile(f)}});
$('#b-more').onclick=function(){
 var hasPrev=false;try{hasPrev=!!localStorage.getItem(PREV)}catch(e){}
 menu(this,[{text:'导出全部 Markdown（ZIP）',fn:function(){exportZip()}},{text:'撤销上次覆盖导入',off:!hasPrev,fn:async function(){if(!(await ask('撤销覆盖导入','用覆盖导入之前的快照替换当前数据？当前数据将丢失。','撤销导入',true)))return;var v=validate(JSON.parse(localStorage.getItem(PREV)));if(!v.ok){toast('快照已损坏');return}DB=v.db;localStorage.removeItem(PREV);UI.active=null;persist();firstPage();toast('已恢复')}},'-',
  {text:'清空全部数据并重置…',cls:'dng',fn:async function(){if(!(await ask('清空全部数据','这会删除本浏览器里工作台的所有空间和页面，并恢复示例内容。\n建议先备份导出。','清空并重置',true)))return;DB=sample();DB.edits=0;UI.active=null;UI.open={};persist();firstPage();toast('已重置')}},'-',
  {text:'关于与隐私',fn:function(){modal('关于','<p style="margin:0">工作台是纯前端网页：没有服务器、没有账号、不含任何统计或上传请求。所有内容保存在本浏览器的 localStorage 中（约 5 MB 上限，足够数万字文本）。</p><p style="margin:0"><b>请注意：</b>清除浏览器数据、使用隐私模式、换浏览器或设备都会让内容消失——请定期「备份导出」。不同设备之间没有同步，用备份文件迁移。</p><p style="margin:0" class="hint">完全免费，没有任何功能限制。仅含文本数据，不支持图片、附件和多人协作。</p>',[{text:'好的',cls:'pri'}],{nofocus:true})}}]);
};

/* ================= 启动 ================= */
load();
if(!UI.open)UI.open={};
renderNote();
var hid=(location.hash||'').slice(1),start=hid&&page(hid)?hid:(UI.active&&page(UI.active)?UI.active:(DB.pages[0]&&DB.pages[0].id));
if(start)openPage(start);else firstPage();
persist();
window.addEventListener('hashchange',function(){var i=(location.hash||'').slice(1);if(i&&i!==UI.active&&page(i))openPage(i)});
window.__gz={get db(){return DB},validate:validate,mdRender:mdRender,search:search};
})();
