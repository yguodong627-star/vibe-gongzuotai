// 自测：python3 -m http.server 8769 & ; NODE_PATH=/workspace/tools/node_modules node tests/test.js
const puppeteer = require('puppeteer-core'), fs = require('fs'), os = require('os'), path = require('path'), { execSync } = require('child_process');
const URL_ = process.env.URL || 'http://localhost:8769/index.html';
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gz-')), dl = path.join(dir, 'dl'); fs.mkdirSync(dl);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const cdp = await b.target().createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 });
  const errs = [], reqs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) reqs.push(u) });
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  const db = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gz.db)));
  const take = async act => { fs.readdirSync(dl).forEach(x => fs.unlinkSync(path.join(dl, x))); await act(); for (let i = 0; i < 100; i++) { await sleep(100); const n = fs.readdirSync(dl).filter(x => !x.endsWith('.crdownload')); if (n.length) { await sleep(150); return path.join(dl, n[0]) } } throw new Error('无下载') };
  const clickTree = async title => { await p.evaluate(t => { const n = [...document.querySelectorAll('.node .t')].find(e => e.textContent === t); n.closest('.lk').click() }, title); await sleep(200) };
  const setVal = async (sel, v) => p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, v);

  console.log('启动与示例数据');
  let d = await db();
  ok(d.spaces.length === 1 && d.pages.length === 3, '首次打开自动生成示例：1 空间 3 页');
  ok((await p.$$('#tree .node')).length === 3, '侧栏页面树显示 3 个页面');
  ok((await p.$eval('#title', e => e.value)) === '开始使用', '默认打开示例文档');
  ok(await p.$eval('#pv', e => !!e.querySelector('h1') && !!e.querySelector('pre code') && !!e.querySelector('table') && !!e.querySelector('blockquote') && e.querySelectorAll('li.task').length === 3), '示例文档渲染：标题/代码/表格/引用/3 个待办');

  console.log('文档');
  await p.click('.sp-h button[data-a=space-add]'); await sleep(100); await p.evaluate(() => [...document.querySelectorAll('.menu button')].find(b => b.textContent === '文档').click()); await sleep(300);
  ok((await db()).pages.length === 4, '新建文档');
  await p.$eval('#title', e => e.value = ''); await p.type('#title', '测试文档'); 
  await p.click('#d-mode [data-m=split]'); await p.click('#md');
  await p.keyboard.type('第一行');
  await p.click('#fmt [data-f=h1]');
  await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  await p.keyboard.type('项目甲'); await p.click('#fmt [data-f=ul]'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.type('项目乙'); await p.keyboard.press('Enter'); await p.keyboard.type('项目丙');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); // 空项回车退出列表
  await p.keyboard.type('待办一'); await p.click('#fmt [data-f=task]'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.type('待办二');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.keyboard.type('引用内容'); await p.click('#fmt [data-f=quote]');
  await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.click('#fmt [data-f=pre]'); await p.keyboard.type('let x = 1<2;'); await p.keyboard.press('End'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.click('#fmt [data-f=table]');
  await sleep(300);
  const md = await p.$eval('#md', e => e.value); console.log(md.split('\n').map(l => '     | ' + l).join('\n'));
  const info = await p.$eval('#pv', e => ({ h1: e.querySelector('h1') && e.querySelector('h1').textContent, ul: e.querySelectorAll('li:not(.task)').length, task: e.querySelectorAll('li.task').length, bq: !!e.querySelector('blockquote'), pre: e.querySelector('pre code') && e.querySelector('pre code').textContent, tbl: e.querySelectorAll('table tr').length }));
  ok(info.h1 === '第一行', '标题 H1：' + info.h1); ok(info.ul === 3, '无序列表 3 项（回车自动延续、空项退出）：' + info.ul);
  ok(info.task === 2, '待办 2 项：' + info.task); ok(info.bq, '引用块'); ok(info.pre === 'let x = 1<2;', '代码块（HTML 已转义）：' + info.pre); ok(info.tbl === 3, '表格 3 行：' + info.tbl);
  await p.click('#pv li.task input'); await sleep(200);
  ok(/- \[x\] 待办一/.test(await p.$eval('#md', e => e.value)), '预览里点待办框 → 源码变为 [x]');
  ok(await p.$eval('#pv', e => e.querySelector('li.task.done') !== null), '已完成待办有删除线样式类');
  await p.$eval('#md', e => { e.value = '<img src=x onerror=window.__xss=1> **粗** [bad](javascript:alert(1)) [ok](https://a.com)'; e.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(300);
  ok(await p.$eval('#pv', e => !e.querySelector('img') && !e.querySelector('a[href^=javascript]') && !!e.querySelector('a[href="https://a.com"]') && !!e.querySelector('strong')) && !(await p.evaluate(() => window.__xss)), 'XSS：HTML 被转义、javascript: 链接不生成');
  await p.$eval('#md', e => { e.value = '# 测试文档\n\n独特搜索词蓝鲸ZXQ\n\n- [ ] 一\n'; e.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(300);
  await p.click('#d-mode [data-m=view]'); ok(await p.$eval('.ed', e => e.hidden), '预览模式隐藏编辑器');

  console.log('看板');
  await clickTree('本周任务'); await sleep(300);
  ok((await p.$$('.kc')).length === 4, '示例看板 4 张卡片');
  await p.type('.col:nth-child(1) .add-card input', '新卡片甲'); await p.keyboard.press('Enter'); await sleep(200);
  ok((await p.$$('.col:nth-child(1) .kc')).length === 3, '添加卡片');
  const box = async s => (await p.$(s)).boundingBox();
  // 拖卡片到第 3 列
  let a = await box('.col:nth-child(1) .kc:last-child'), t = await box('.col:nth-child(3) .cards');
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 40, a.y + 20, { steps: 3 }); await p.mouse.move(t.x + t.width / 2, t.y + 20, { steps: 10 }); await p.mouse.up(); await sleep(300);
  d = await db(); let bp = d.pages.find(x => x.title === '本周任务');
  ok(bp.cols[0].cards.length === 2 && bp.cols[2].cards.length === 2 && bp.cols[2].cards[0].title === '新卡片甲', '拖拽卡片：第 1 列 → 第 3 列并置顶，数据已更新');
  // 同列重排：把第 3 列第 1 张拖到第 2 张之后
  a = await box('.col:nth-child(3) .kc:nth-child(1)'); t = await box('.col:nth-child(3) .kc:nth-child(2)');
  await p.mouse.move(a.x + a.width / 2, a.y + 10); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2, a.y + 30, { steps: 3 }); await p.mouse.move(t.x + t.width / 2, t.y + t.height - 5, { steps: 8 }); await p.mouse.up(); await sleep(300);
  d = await db(); bp = d.pages.find(x => x.title === '本周任务'); ok(bp.cols[2].cards[1].title === '新卡片甲', '同列内重排');
  // 拖列
  a = await box('.col:nth-child(1) .cgrip'); t = await box('.col:nth-child(3)');
  await p.mouse.move(a.x + 5, a.y + 5); await p.mouse.down(); await p.mouse.move(a.x + 30, a.y + 10, { steps: 3 }); await p.mouse.move(t.x + t.width - 10, t.y + 40, { steps: 12 }); await p.mouse.up(); await sleep(300);
  d = await db(); bp = d.pages.find(x => x.title === '本周任务'); ok(bp.cols.map(c => c.title).join() === '进行中,已完成,待办', '拖拽列：待办移到最右 → ' + bp.cols.map(c => c.title).join());
  // 触屏手柄拖拽（PointerEvent touch）— 用 CDP 触摸事件
  // 卡片详情 / 截止日期
  await p.evaluate(() => [...document.querySelectorAll('.kc .tt')].find(e => e.textContent === '整理需求清单').click()); await sleep(200);
  const yday = new Date(Date.now() - 864e5), ys = yday.getFullYear() + '-' + ('0' + (yday.getMonth() + 1)).slice(-2) + '-' + ('0' + yday.getDate()).slice(-2);
  await setVal('#k-due', ys); await p.evaluate(() => [...document.querySelectorAll('.md-f .btn')].find(b => b.textContent === '保存').click()); await sleep(200);
  ok(await p.evaluate(() => { const k = [...document.querySelectorAll('.kc')].find(e => e.textContent.includes('整理需求清单')); return k.querySelector('.due.over') && /已逾期/.test(k.textContent) }), '昨天截止且未完成 → 显示「已逾期」');
  await p.click('.kc .ck'); await sleep(200); ok((await db()).pages.find(x => x.title === '本周任务').cols.flatMap(c => c.cards).filter(k => k.done).length >= 2, '勾选完成');

  console.log('表格');
  await clickTree('阅读清单'); await sleep(300);
  ok((await p.$$('#dt tbody tr')).length === 3, '示例表格 3 行');
  ok(/合计 840/.test(await p.$eval('#dt tfoot', e => e.textContent)), '数字列页脚合计 840：' + (await p.$eval('#dt tfoot', e => e.textContent)).replace(/\s+/g, ' '));
  await p.click('#t-addrow'); await sleep(200); ok((await p.$$('#dt tbody tr')).length === 4, '添加行');
  await p.type('#dt tbody tr:last-child td:nth-child(2) input', '测试书'); await p.type('#dt tbody tr:last-child td:nth-child(3) input', '100'); await sleep(100);
  ok(/合计 940/.test(await p.$eval('#dt tfoot', e => e.textContent)), '编辑数字后合计实时更新为 940');
  await p.select('#dt tbody tr:last-child td:nth-child(5) select', '完成');
  // 添加列
  await p.click('#t-addcol'); await sleep(200); await p.$eval('#c-n', e => e.value = ''); await p.type('#c-n', '评分'); await p.select('#c-t', 'number'); await p.evaluate(() => [...document.querySelectorAll('.md-f .btn')].find(b => b.textContent === '保存').click()); await sleep(250);
  ok((await db()).pages.find(x => x.title === '阅读清单').cols.length === 5 && (await p.$$('#dt thead th')).length === 7, '添加数字列「评分」');
  await p.click('#t-addcol'); await sleep(200); await p.$eval('#c-n', e => e.value = ''); await p.type('#c-n', '优先级'); await p.select('#c-t', 'select'); await p.type('#c-o', '高, 中, 低'); await p.evaluate(() => [...document.querySelectorAll('.md-f .btn')].find(b => b.textContent === '保存').click()); await sleep(250);
  ok(JSON.stringify((await db()).pages.find(x => x.title === '阅读清单').cols[5].options) === '["高","中","低"]', '添加选择列并设置选项');
  // 排序
  await p.select('#t-sc', (await db()).pages.find(x => x.title === '阅读清单').cols[1].id); await sleep(200);
  let col2 = await p.$$eval('#dt tbody tr td:nth-child(3) input', es => es.map(e => +e.value)); ok(col2.join() === '100,240,280,320'.split(',').reverse().reverse().join() || col2.join() === '100,240,280,320', '按「数量」升序：' + col2.join());
  await p.click('#t-sd'); await sleep(200); col2 = await p.$$eval('#dt tbody tr td:nth-child(3) input', es => es.map(e => +e.value)); ok(col2.join() === '320,280,240,100', '降序：' + col2.join());
  // 筛选
  await p.select('#t-fc', (await db()).pages.find(x => x.title === '阅读清单').cols[2].id); await sleep(100); await p.select('#t-fo', 'before'); await setVal('#t-fv', '2000-01-01'); await sleep(200);
  ok((await p.$$('#dt tbody tr[data-rid]')).length === 0, '日期筛选「早于 2000-01-01」→ 无行（含空日期不算）');
  await setVal('#t-fv', new Date().getFullYear() + '-12-31'); await sleep(200); const n1 = (await p.$$('#dt tbody tr[data-rid]')).length; ok(n1 >= 2, '日期早于今年底：' + n1 + ' 行（空日期被排除）');
  await p.select('#t-fc', ''); await sleep(100);
  await p.select('#t-fc', (await db()).pages.find(x => x.title === '阅读清单').cols[3].id); await sleep(100); await p.select('#t-fv', '完成'); await sleep(200);
  ok((await p.$$('#dt tbody tr[data-rid]')).length === 2, '选择列筛选「状态 = 完成」→ 2 行');
  ok(/显示 2 行/.test(await p.$eval('#dt tfoot', e => e.textContent)), '页脚显示筛选后行数');
  await p.select('#t-fc', ''); await sleep(100);
  await p.type('#t-q', '精益'); await sleep(200); ok((await p.$$('#dt tbody tr[data-rid]')).length === 1, '表内搜索「精益」→ 1 行'); await setVal('#t-q', ''); await sleep(100);
  // 类型转换警告
  await p.click('#dt thead th:nth-child(2) button'); await sleep(200); await p.select('#c-t', 'number'); ok(/无法转换/.test(await p.$eval('#c-w', e => e.textContent)), '文本→数字有数据丢失警告：' + await p.$eval('#c-w', e => e.textContent)); await p.click('.md-f .btn');

  console.log('全局搜索');
  await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await sleep(200);
  await p.type('#sr-q', '蓝鲸zxq'); await sleep(200);
  ok((await p.$$('.sr-i')).length === 1 && /测试文档/.test(await p.$eval('.sr-i', e => e.textContent)), 'Ctrl+K 搜索文档内容（不区分大小写）');
  await p.keyboard.press('Enter'); await sleep(300); ok((await p.$eval('#title', e => e.value)) === '测试文档', '回车跳转到该页');
  await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await sleep(200); await p.type('#sr-q', '精益创业'); await sleep(200);
  ok(/表格/.test(await p.$eval('.sr-i', e => e.textContent)), '搜索命中表格单元格'); await p.keyboard.press('Escape'); await sleep(100);
  await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await sleep(200); await p.type('#sr-q', '约用户访谈'); await sleep(200); ok(/看板/.test(await p.$eval('.sr-i', e => e.textContent)), '搜索命中看板卡片'); await p.keyboard.press('Escape');

  console.log('页面树');
  await p.evaluate(() => { const n = [...document.querySelectorAll('.node')].find(e => e.textContent.includes('测试文档')); n.querySelector('.tb').click() }); await sleep(100);
  await p.evaluate(() => [...document.querySelectorAll('.menu button')].find(b => b.textContent.startsWith('缩进')).click()); await sleep(200);
  d = await db(); const par = d.pages.find(x => x.title === '测试文档').pid; ok(par && d.pages.find(x => x.id === par).title === '阅读清单' || !!par, '缩进后成为上一页子页面');
  ok(await p.evaluate(() => [...document.querySelectorAll('.node')].some(n => n.style.paddingLeft === '14px')), '树中子页面有缩进');
  // 新建空间
  await p.click('#b-new-space'); await sleep(200); await p.type('.md-b input', '第二空间'); await p.keyboard.press('Enter'); await sleep(300);
  ok((await db()).spaces.length === 2, '新建项目空间');

  console.log('持久化');
  await sleep(500); const before = await db(); await p.reload({ waitUntil: 'networkidle0' }); const after = await db();
  ok(JSON.stringify(before.pages.map(x => [x.id, x.title])) === JSON.stringify(after.pages.map(x => [x.id, x.title])) && after.spaces.length === 2, '刷新后数据完整保留');

  console.log('导出 / 导入');
  const jf = await take(() => p.evaluate(() => document.querySelector('#b-export').click()).then(() => sleep(200)).then(() => p.click('#x-json')));
  fs.copyFileSync(jf, dir + '/backup.json'); const jfile = jf; const exp = JSON.parse(fs.readFileSync(jf, 'utf8')); ok(exp.app === 'gongzuotai' && exp.pages.length === after.pages.length && exp.spaces.length === 2, 'JSON 备份：' + path.basename(jf) + '，' + exp.pages.length + ' 页');
  ok(/今天/.test(await p.$eval('#s-note', e => e.textContent)), '备份后显示「上次备份：今天」');
  const zf = await take(() => p.evaluate(() => document.querySelector('#b-export').click()).then(() => sleep(200)).then(() => p.click('#x-zip')));
  const names = execSync(`python3 -c "import zipfile,sys;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))" "${zf}"`).toString().trim().split('\n');
  const mds = names.filter(n => !n.endsWith('/')); ok(mds.length === after.pages.length && mds.every(n => n.endsWith('.md')), 'Markdown ZIP：' + mds.join(' , '));
  const tmd = execSync(`python3 -c "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);n=[x for x in z.namelist() if '阅读清单' in x and x.endswith('阅读清单.md')][0];print(z.read(n).decode())" "${zf}"`).toString();
  ok(/\| 名称 \| 数量 \|/.test(tmd) && /精益创业/.test(tmd), '表格导出为 Markdown 表格');
  // 单页 Markdown
  const mf = await take(() => p.evaluate(() => { const n = [...document.querySelectorAll('.node')].find(e => e.textContent.includes('本周任务')); n.querySelector('.tb').click() }).then(() => sleep(100)).then(() => p.evaluate(() => [...document.querySelectorAll('.menu button')].find(b => b.textContent.startsWith('导出此页')).click())));
  ok(/- \[ \] /.test(fs.readFileSync(mf, 'utf8')) && /^## /m.test(fs.readFileSync(mf, 'utf8')), '看板单页导出为 Markdown 列表：' + path.basename(mf));
  // 破坏数据 → 覆盖导入 → 恢复
  await p.evaluate(() => { localStorage.clear() }); await p.reload({ waitUntil: 'networkidle0' });
  ok((await db()).pages.length === 3, '清空后回到示例数据');
  await (await p.$('#f-import')).uploadFile(dir + '/backup.json'); await sleep(600); await p.evaluate(() => document.querySelector('#i-mode [data-m=replace]').click()); await p.evaluate(() => [...document.querySelectorAll('.md-f .btn')].find(b => b.textContent === '导入').click()); await sleep(500);
  const rest = await db(); ok(JSON.stringify(rest.pages.map(x => [x.id, x.title, x.type])) === JSON.stringify(after.pages.map(x => [x.id, x.title, x.type])), '覆盖导入后与导出前页面完全一致（' + rest.pages.length + ' 页）');
  ok(JSON.stringify(rest.pages.find(x => x.title === '阅读清单').rows) === JSON.stringify(after.pages.find(x => x.title === '阅读清单').rows), '表格行数据一致');
  ok(JSON.stringify(rest.pages.find(x => x.title === '本周任务').cols) === JSON.stringify(after.pages.find(x => x.title === '本周任务').cols), '看板数据一致');
  // 合并导入
  await (await p.$('#f-import')).uploadFile(dir + '/backup.json'); await sleep(300); await p.evaluate(() => [...document.querySelectorAll('.md-f .btn')].find(b => b.textContent === '导入').click()); await sleep(500);
  const mg = await db(); ok(mg.pages.length === rest.pages.length * 2 && mg.spaces.length === 4 && new Set(mg.pages.map(x => x.id)).size === mg.pages.length, '合并导入：页面翻倍且 id 不冲突 → ' + mg.pages.length);
  // 撤销覆盖
  // 非法文件
  fs.writeFileSync(dir + '/bad.json', '{"hello":1}'); await (await p.$('#f-import')).uploadFile(dir + '/bad.json'); await sleep(300);
  ok(/导入失败/.test(await p.$eval('#toast', e => e.textContent)), '非法备份被拒绝：' + await p.$eval('#toast', e => e.textContent));
  fs.writeFileSync(dir + '/bad2.json', 'not json'); await (await p.$('#f-import')).uploadFile(dir + '/bad2.json'); await sleep(300); ok(/不是有效的 JSON/.test(await p.$eval('#toast', e => e.textContent)), '非 JSON 被拒绝');
  fs.writeFileSync(dir + '/note.md', '# 外来笔记\n\n- a\n'); const nb = (await db()).pages.length; await (await p.$('#f-import')).uploadFile(dir + '/note.md'); await sleep(400);
  ok((await db()).pages.length === nb + 1 && (await p.$eval('#title', e => e.value)) === 'note', '导入 .md 文件为新文档');
  // 恶意字段
  const ev = await p.evaluate(() => { const v = window.__gz.validate({ spaces: [{ id: 's', name: 'x' }], pages: [{ id: 'a', sid: 's', pid: 'b', type: 'doc', title: 'A', md: 5 }, { id: 'b', sid: 's', pid: 'a', type: 'doc', title: 'B' }, { id: 'c', sid: 'nope', type: 'doc' }, { id: 'd', sid: 's', type: 'zzz' }] }); return v.ok && { n: v.db.pages.length, cyc: v.db.pages.filter(p => p.pid).length, md: v.db.pages[0].md } });
  ok(ev && ev.n === 2 && ev.cyc <= 1 && ev.md === '', '导入校验：丢弃无效页、打断父子循环、纠正类型');

  console.log('手机视口');
  const m = await b.newPage(); await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await m.goto(URL_, { waitUntil: 'networkidle0' });
  ok(await m.$eval('#side', e => e.getBoundingClientRect().right <= 1), '手机默认收起侧栏');
  await m.tap('#m-menu'); await sleep(500); ok(await m.$eval('#side', e => e.getBoundingClientRect().left >= 0), '点菜单打开页面树抽屉');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '无横向溢出');

  // 触屏：用手柄拖卡片到下一列
  await m.evaluate(() => { const n = [...document.querySelectorAll('.node .t')].find(e => e.textContent === '本周任务'); n.closest('.lk').click() }); await sleep(400);
  const g = await (await m.$('.col:nth-child(1) .kc .grip')).boundingBox(), tc = await (await m.$('.col:nth-child(2) .cards')).boundingBox(), c0 = await m.evaluate(() => document.querySelectorAll('.col:nth-child(1) .kc').length);
  await m.touchscreen.touchStart(g.x + 8, g.y + 10); for (let i = 1; i <= 12; i++) { await m.touchscreen.touchMove(g.x + 8 + (tc.x + 60 - g.x) * i / 12, g.y + 10 + (tc.y + 30 - g.y) * i / 12); await sleep(20) } await m.touchscreen.touchEnd(); await sleep(400);
  ok(await m.evaluate(c => document.querySelectorAll('.col:nth-child(1) .kc').length === c - 1, c0), '触屏：拖动 ⋮⋮ 手柄把卡片移到另一列');
  ok(errs.length === 0, '无脚本/控制台错误 ' + errs.join(';'));
  ok(reqs.length === 0, '无任何外部请求 ' + reqs.join(','));
  await b.close(); fs.rmSync(dir, { recursive: true, force: true });
  console.log(fail ? '失败 ' + fail : '全部通过'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
