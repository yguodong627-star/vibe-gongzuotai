// 生成 screenshots/（示例数据为程序内置）：NODE_PATH=... node tests/shots.js
const puppeteer = require('puppeteer-core');
const URL_ = process.env.URL || 'http://localhost:8769/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--lang=zh-CN'] });
  for (const mobile of [false, true]) {
    const p = await b.newPage(); await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 });
    await p.goto(URL_, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
    const pre = mobile ? 'm-' : 'd-', S = n => p.screenshot({ path: `screenshots/${pre}${n}.png` });
    const go = async t => { if (mobile) { await p.tap('#m-menu'); await sleep(450) } await p.evaluate(t => { [...document.querySelectorAll('.node .t')].find(e => e.textContent === t).closest('.lk').click() }, t); await sleep(450) };
    await S('01-doc');
    if (mobile) { await p.tap('#m-menu'); await sleep(500); await S('02-tree'); await p.tap('#s-close'); await sleep(300) }
    await go('本周任务'); await S('03-board');
    await go('阅读清单'); await S('04-table');
    if (!mobile) { await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control'); await sleep(200); await p.type('#sr-q', '用户'); await sleep(300); await S('05-search') }
    else { await p.tap('#m-search'); await sleep(200); await p.type('#sr-q', '用户'); await sleep(300); await S('05-search') }
    await p.close();
  }
  await b.close();
})();
