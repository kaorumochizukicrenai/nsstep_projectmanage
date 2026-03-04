const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const yen = (n) => new Intl.NumberFormat('ja-JP', { style:'currency', currency:'JPY', maximumFractionDigits:0 }).format(n);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
const now = new Date();

const state = {
  session: loadSession(),
  monthKey: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,
  route: location.hash || '',
  charts: {},
  sites: [
    { id:'S-001', name:'岡山市北区 某マンション屋上', client:'A不動産', status:'進行中', staffDays: 8, sales: 1280000, cost: 420000, notes:'防水層の劣化部補修＋トップコート。' },
    { id:'S-002', name:'倉敷市 戸建てベランダ', client:'個人', status:'完了', staffDays: 3, sales: 340000, cost: 120000, notes:'下地処理＋ウレタン防水。' },
    { id:'S-003', name:'総社市 工場 屋根', client:'B工業', status:'見積中', staffDays: 0, sales: 0, cost: 0, notes:'現調済、仕様検討中。' }
  ],
  fixedCosts: [
    { id:'F-01', name:'軽バン リース', category:'車両', amount: 52000, note:'月額（仮）' },
    { id:'F-02', name:'保険（労災/賠責）', category:'保険', amount: 38000, note:'月額按分（仮）' },
    { id:'F-03', name:'資材置場', category:'賃料', amount: 45000, note:'月額（仮）' }
  ],
  accounts: [
    { id:'U-01', name:'代表 佐藤', role:'代表', email:'owner@example.local', status:'有効' },
    { id:'U-02', name:'スタッフ 田中', role:'スタッフ', email:'tanaka@example.local', status:'有効' },
    { id:'U-03', name:'スタッフ 鈴木', role:'スタッフ', email:'suzuki@example.local', status:'有効' }
  ],
  schedule: []
};

seedSchedule();
boot();

function boot(){
  if(!location.hash){
    location.hash = state.session ? '#/home' : '#/login';
  }
  mountShell();
  window.addEventListener('hashchange', () => render(false));
  render(true);
}

function mountShell(){
  $('#app').innerHTML = `
    <div class="shell">
      <header class="appbar" id="appbar"></header>
      <main class="content">
        <div id="view" class="view"></div>
      </main>
      <nav class="tabbar" id="tabbar"></nav>
      <button class="fab" id="fab" aria-label="追加"><span class="material-symbols-rounded">add</span></button>
      <div class="toastwrap" id="toasts"></div>

      <dialog id="modal">
        <div class="modal-hd">
          <h3 id="modalTitle">操作</h3>
          <span class="material-symbols-rounded" id="modalClose" style="opacity:.85;cursor:pointer">close</span>
        </div>
        <div class="modal-bd" id="modalBody"></div>
        <div class="modal-ft" id="modalFoot"></div>
      </dialog>
    </div>
  `;

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => {
    const dlg = $('#modal');
    const r = dlg.getBoundingClientRect();
    const inBox = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if(!inBox) closeModal();
  });

  $('#fab').addEventListener('click', () => quickAdd());
}

function render(first){
  state.route = location.hash || '#/home';
  routeGuard();

  const view = $('#view');
  const update = () => {
    view.classList.remove('view');
    void view.offsetWidth;
    view.classList.add('view');

    const r = state.route;

    if(r.startsWith('#/site/')){
      const id = decodeURIComponent(r.split('/')[2] || '');
      view.innerHTML = ScreenSiteDetail(id);
      bindSiteDetail(id);
      setAppbar(appbarFor('現場詳細', { back:'#/sites', menu:true }));
      setTabs('sites');
      setFab(true);
      return;
    }

    switch(r){
      case '#/login':
        view.innerHTML = ScreenLogin();
        bindLogin();
        setAppbar(appbarFor('AquaLedger', { subtitle:'防水工事向け / 月次&現場', menu:false }));
        setTabs(null);
        setFab(false);
        break;

      case '#/home':
        view.innerHTML = ScreenHome();
        bindHome();
        setAppbar(appbarFor('月次まとめ', { subtitle: state.monthKey, menu:true }));
        setTabs('home');
        setFab(true);
        break;

      case '#/sites':
        view.innerHTML = ScreenSites();
        bindSites();
        setAppbar(appbarFor('現場', { subtitle:'現場単位の入力（ダミー）', menu:true }));
        setTabs('sites');
        setFab(true);
        break;

      case '#/schedule':
        view.innerHTML = ScreenSchedule();
        bindSchedule();
        setAppbar(appbarFor('スケジュール', { subtitle:'3名で共有（ダミー）', menu:true }));
        setTabs('schedule');
        setFab(true);
        break;

      case '#/fixed':
        view.innerHTML = ScreenFixed();
        bindFixed();
        setAppbar(appbarFor('固定費', { subtitle:'月の固定費（ダミー）', menu:true }));
        setTabs('fixed');
        setFab(true);
        break;

      case '#/more':
        view.innerHTML = ScreenMore();
        bindMore();
        setAppbar(appbarFor('その他', { subtitle: state.session ? `${state.session.name}（${state.session.role}）` : '', menu:false }));
        setTabs('more');
        setFab(false);
        break;

      case '#/accounts':
        view.innerHTML = ScreenAccounts();
        bindAccounts();
        setAppbar(appbarFor('アカウント', { back:'#/more', menu:false }));
        setTabs('more');
        setFab(false);
        break;

      case '#/print':
        view.innerHTML = ScreenPrint();
        bindPrint();
        setAppbar(appbarFor('印刷 / PDF', { back:'#/more', menu:false }));
        setTabs('more');
        setFab(false);
        break;

      default:
        location.hash = '#/home';
    }
  };

  if(document.startViewTransition){
    document.startViewTransition(() => update());
  }else{
    update();
  }

  if(!first) window.scrollTo({ top:0, behavior:'smooth' });
}

function routeGuard(){
  const r = location.hash || '#/home';
  const open = ['#/login'];
  if(!state.session && !open.includes(r)){
    location.hash = '#/login';
    return;
  }
}

function appbarFor(title, opt){
  const s = state.session;
  const left = opt.back
    ? `<button class="pill" data-back="${opt.back}"><span class="material-symbols-rounded">arrow_back</span></button>`
    : `<div class="logo" aria-hidden="true"></div>`;

  const menu = opt.menu
    ? `<button class="pill" id="btnMenu"><span class="material-symbols-rounded">more_horiz</span></button>`
    : '';

  const subtitle = opt.subtitle ? `<span>${escapeHtml(opt.subtitle)}</span>` : `<span>${s ? escapeHtml(s.role) : ''}</span>`;
  const name = opt.back ? `<b>${escapeHtml(title)}</b>` : `<b>${escapeHtml(title)}${s ? ` — ${escapeHtml(s.name)}` : ''}</b>`;

  return `
    <div class="row">
      ${left}
      <div class="brand">
        ${opt.back ? '' : ''}
        <div class="t">
          ${name}
          ${subtitle}
        </div>
      </div>
      ${menu}
    </div>
  `;
}

function setAppbar(html){
  $('#appbar').innerHTML = html;

  const back = $('[data-back]');
  if(back){
    back.addEventListener('click', () => location.hash = back.getAttribute('data-back'));
  }
  const btnMenu = $('#btnMenu');
  if(btnMenu){
    btnMenu.addEventListener('click', () => openMenu());
  }
}

function setTabs(active){
  const bar = $('#tabbar');
  if(!active){
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'block';

  const tabs = [
    { key:'home', to:'#/home', icon:'space_dashboard', label:'月次' },
    { key:'sites', to:'#/sites', icon:'apartment', label:'現場' },
    { key:'schedule', to:'#/schedule', icon:'calendar_month', label:'予定' },
    { key:'fixed', to:'#/fixed', icon:'receipt_long', label:'固定' },
    { key:'more', to:'#/more', icon:'widgets', label:'その他' },
  ];

  bar.innerHTML = `
    <div class="tabs">
      ${tabs.map(t => `
        <a class="tab ${t.key===active?'active':''}" href="${t.to}">
          <span class="material-symbols-rounded">${t.icon}</span>
          <small>${t.label}</small>
        </a>
      `).join('')}
    </div>
  `;
}

function setFab(show){
  const fab = $('#fab');
  fab.style.display = show ? 'flex' : 'none';
}

function openMenu(){
  openModal('メニュー', `
    <div class="list">
      <div class="item" data-m="month">
        <div class="left">
          <div class="ttl">対象月を変更</div>
          <div class="meta">ラベル切替（ダミー）</div>
        </div>
        <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
      </div>

      <div class="item" data-m="goal">
        <div class="left">
          <div class="ttl">目標を編集</div>
          <div class="meta">売上目標（ダミー）</div>
        </div>
        <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
      </div>

      <div class="item" data-m="logout">
        <div class="left">
          <div class="ttl">ログアウト</div>
          <div class="meta">ログイン画面に戻る</div>
        </div>
        <div class="right"><span class="material-symbols-rounded" style="opacity:.8">logout</span></div>
      </div>
    </div>
  `, `<button class="btn" id="mClose">閉じる</button>`);

  $('#mClose').addEventListener('click', closeModal);
  $$('#modal [data-m]').forEach(x => x.addEventListener('click', () => {
    const k = x.getAttribute('data-m');
    if(k==='month') return openMonth();
    if(k==='goal') return openGoal();
    if(k==='logout') return doLogout();
  }));
}

function openMonth(){
  closeModal();
  const y = now.getFullYear();
  const options = Array.from({length:12}, (_,i)=> `${y}-${String(i+1).padStart(2,'0')}`);

  openModal('対象月（ダミー）', `
    <div class="field">
      <label>対象月</label>
      <select class="input" id="selMonth">
        ${options.map(x => `<option value="${x}" ${x===state.monthKey?'selected':''}>${x}</option>`).join('')}
      </select>
    </div>
  `, `
    <button class="btn" id="mCancel">キャンセル</button>
    <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>適用</button>
  `);

  $('#mCancel').addEventListener('click', closeModal);
  $('#mOk').addEventListener('click', () => {
    state.monthKey = $('#selMonth').value;
    toast('更新', `対象月を ${state.monthKey} に変更しました。`, 'event');
    closeModal();
    render(true);
  });
}

function openGoal(){
  closeModal();
  openModal('目標（売上）を編集（ダミー）', `
    <div class="field">
      <label>月次売上目標</label>
      <input class="input" id="goal" inputmode="numeric" value="2000000" />
    </div>
    <div class="field">
      <label>メモ</label>
      <textarea class="input" id="gNote">例：今月はS-001完了＋新規2件（仮）</textarea>
    </div>
  `, `
    <button class="btn" id="mCancel">キャンセル</button>
    <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>保存</button>
  `);

  $('#mCancel').addEventListener('click', closeModal);
  $('#mOk').addEventListener('click', () => {
    toast('保存', '目標（ダミー）を保存しました。', 'target');
    closeModal();
  });
}

function quickAdd(){
  const r = location.hash || '#/home';

  const actions = [
    { id:'site', icon:'apartment', title:'現場を追加（ダミー）', desc:'新規現場のカードを追加' },
    { id:'fixed', icon:'receipt_long', title:'固定費を追加（ダミー）', desc:'固定費の行を追加' },
    { id:'event', icon:'event', title:'予定を追加（ダミー）', desc:'カレンダーに予定を追加' },
  ];

  openModal('追加（ダミー）', `
    <div class="list">
      ${actions.map(a => `
        <div class="item" data-add="${a.id}">
          <div class="left">
            <div class="ttl"><span class="material-symbols-rounded">${a.icon}</span> ${escapeHtml(a.title)}</div>
            <div class="meta">${escapeHtml(a.desc)}</div>
          </div>
          <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
        </div>
      `).join('')}
    </div>
  `, `<button class="btn" id="mClose">閉じる</button>`);

  $('#mClose').addEventListener('click', closeModal);
  $$('#modal [data-add]').forEach(x => x.addEventListener('click', () => {
    const k = x.getAttribute('data-add');
    if(k==='site'){
      state.sites.unshift({ id:`S-${String(Math.floor(Math.random()*900)+100)}`, name:'（新規）現場名ダミー', client:'取引先', status:'見積中', staffDays: 0, sales: 0, cost: 0, notes:'メモ' });
      toast('追加', '現場（ダミー）を追加しました。', 'add');
      closeModal();
      location.hash = '#/sites';
    }
    if(k==='fixed'){
      state.fixedCosts.unshift({ id:`F-${String(Math.floor(Math.random()*90)+10)}`, name:'（新規）固定費ダミー', category:'その他', amount: 12000, note:'仮' });
      toast('追加', '固定費（ダミー）を追加しました。', 'add');
      closeModal();
      location.hash = '#/fixed';
    }
    if(k==='event'){
      const d = clamp(Math.floor(Math.random()*28)+1, 1, 28);
      state.schedule.unshift({ id:uid(), date: new Date(now.getFullYear(), now.getMonth(), d), time:'09:00', title:'（新規）予定ダミー', cls:'good' });
      toast('追加', '予定（ダミー）を追加しました。', 'event');
      closeModal();
      location.hash = '#/schedule';
    }
  }));
}

function ScreenLogin(){
  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>ログイン（シミュレーション）</h2>
            <p>代表 / スタッフの権限差分をUIで確認できます（通信なし）。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">lock</span>Mock</span>
        </div>
        <div class="bd">
          <div class="list">
            <div class="item" data-login="owner">
              <div class="left">
                <div class="ttl">代表 佐藤</div>
                <div class="meta">代表権限 / アカウント管理: 可能</div>
              </div>
              <div class="right">
                <span class="badge"><span class="material-symbols-rounded">verified_user</span>代表</span>
                <span class="material-symbols-rounded" style="opacity:.8">chevron_right</span>
              </div>
            </div>

            <div class="item" data-login="staff1">
              <div class="left">
                <div class="ttl">スタッフ 田中</div>
                <div class="meta">スタッフ権限 / アカウント管理: 不可</div>
              </div>
              <div class="right">
                <span class="badge"><span class="material-symbols-rounded">person</span>スタッフ</span>
                <span class="material-symbols-rounded" style="opacity:.8">chevron_right</span>
              </div>
            </div>

            <div class="item" data-login="staff2">
              <div class="left">
                <div class="ttl">スタッフ 鈴木</div>
                <div class="meta">スタッフ権限 / アカウント管理: 不可</div>
              </div>
              <div class="right">
                <span class="badge"><span class="material-symbols-rounded">person</span>スタッフ</span>
                <span class="material-symbols-rounded" style="opacity:.8">chevron_right</span>
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <button class="btn ghost" id="btnSkip">
            <span class="material-symbols-rounded">bolt</span>
            前回のユーザーで入る（あれば）
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindLogin(){
  $$('#view [data-login]').forEach(it => it.addEventListener('click', () => {
    const k = it.getAttribute('data-login');
    if(k==='owner') state.session = { id:'owner', name:'代表 佐藤', role:'代表', canManageAccounts:true };
    if(k==='staff1') state.session = { id:'staff1', name:'スタッフ 田中', role:'スタッフ', canManageAccounts:false };
    if(k==='staff2') state.session = { id:'staff2', name:'スタッフ 鈴木', role:'スタッフ', canManageAccounts:false };
    saveSession(state.session);
    toast('ログイン', `${state.session.role}としてログインしました。`, 'login');
    location.hash = '#/home';
  }));

  $('#btnSkip').addEventListener('click', () => {
    const s = loadSession();
    if(!s){
      toast('未保存', '前回セッションがありません。', 'info');
      return;
    }
    state.session = s;
    toast('ログイン', `${s.role}としてログインしました。`, 'login');
    location.hash = '#/home';
  });
}

function ScreenHome(){
  const totalSales = state.sites.reduce((s,x)=>s+(x.sales||0),0);
  const totalCost = state.sites.reduce((s,x)=>s+(x.cost||0),0) + state.fixedCosts.reduce((s,x)=>s+(x.amount||0),0);
  const profit = totalSales - totalCost;
  const staffDays = state.sites.reduce((s,x)=>s+(x.staffDays||0),0);
  const goal = 2000000;
  const rate = clamp(Math.round((totalSales/goal)*100), 0, 999);
  const recent = [...state.sites].sort((a,b)=> (b.sales||0)-(a.sales||0)).slice(0,3);

  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>月次まとめ</h2>
            <p>稼働日数・現場数・売上・費用・利益（ダミー）。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">stars</span>達成率 ${rate}%</span>
        </div>
        <div class="bd">
          <div class="kpis">
            <div class="kpi">
              <div class="top">
                <div class="label">稼働日数</div>
                <span class="material-symbols-rounded" style="opacity:.8">person</span>
              </div>
              <div class="val">${staffDays} 日</div>
              <div class="sub">3名合計（仮）</div>
            </div>

            <div class="kpi">
              <div class="top">
                <div class="label">現場数</div>
                <span class="material-symbols-rounded" style="opacity:.8">apartment</span>
              </div>
              <div class="val">${state.sites.length} 件</div>
              <div class="sub">進行/見積/完了</div>
            </div>

            <div class="kpi">
              <div class="top">
                <div class="label">売上</div>
                <span class="material-symbols-rounded" style="opacity:.8">payments</span>
              </div>
              <div class="val">${yen(totalSales)}</div>
              <div class="sub">目標 ${yen(goal)}（仮）</div>
            </div>

            <div class="kpi">
              <div class="top">
                <div class="label">利益</div>
                <span class="material-symbols-rounded" style="opacity:.8">trending_up</span>
              </div>
              <div class="val">${yen(profit)}</div>
              <div class="sub">費用 ${yen(totalCost)}</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="card" style="margin:0;">
            <div class="hd">
              <div>
                <h3>売上・費用・利益（ダミー）</h3>
                <p>デザイン確認用グラフ</p>
              </div>
              <span class="badge"><span class="material-symbols-rounded">analytics</span>Chart</span>
            </div>
            <div class="bd">
              <div style="height:240px">
                <canvas id="chartMonth"></canvas>
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="card" style="margin:0;">
            <div class="hd">
              <div>
                <h3>売上上位の現場（ダミー）</h3>
                <p>タップで現場詳細</p>
              </div>
              <span class="badge"><span class="material-symbols-rounded">bolt</span>Hot</span>
            </div>
            <div class="bd">
              <div class="list">
                ${recent.map(s => `
                  <a class="item" href="#/site/${encodeURIComponent(s.id)}">
                    <div class="left">
                      <div class="ttl">${escapeHtml(s.name)}</div>
                      <div class="meta">${escapeHtml(s.id)} ・ ${escapeHtml(s.client)} ・ ${escapeHtml(s.status)}</div>
                    </div>
                    <div class="right">
                      <span class="money">${yen(s.sales||0)}</span>
                      <span class="material-symbols-rounded" style="opacity:.8">chevron_right</span>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function bindHome(){
  drawMonthChart();
}

function drawMonthChart(){
  const el = $('#chartMonth');
  if(!el || !window.Chart) return;

  const labels = ['1週','2週','3週','4週'];
  const sales = [520000, 410000, 680000, 390000];
  const cost = [210000, 180000, 260000, 190000];
  const profit = sales.map((v,i)=> v - cost[i] - (i===0?65000:0));

  if(state.charts.month) state.charts.month.destroy();

  const ctx = el.getContext('2d');
  state.charts.month = new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'売上', data:sales, borderWidth:0, backgroundColor:'rgba(110,231,255,.45)' },
        { label:'費用', data:cost, borderWidth:0, backgroundColor:'rgba(251,113,133,.35)' },
        { label:'利益', data:profit, borderWidth:0, backgroundColor:'rgba(46,230,167,.38)' }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:'rgba(255,255,255,.78)' } },
        tooltip:{ enabled:true }
      },
      scales:{
        x:{ ticks:{ color:'rgba(255,255,255,.70)' }, grid:{ color:'rgba(255,255,255,.06)' } },
        y:{ ticks:{ color:'rgba(255,255,255,.70)' }, grid:{ color:'rgba(255,255,255,.06)' } }
      }
    }
  });
}

function ScreenSites(){
  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>現場一覧</h2>
            <p>現場単位で売上・費用・稼働・関係者を入力する想定（ダミー）。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">database</span>Dummy</span>
        </div>
        <div class="bd">
          <div class="list">
            ${state.sites.map(s => {
              const p = (s.sales||0)-(s.cost||0);
              return `
                <a class="item" href="#/site/${encodeURIComponent(s.id)}">
                  <div class="left">
                    <div class="ttl">${escapeHtml(s.name)}</div>
                    <div class="meta">${escapeHtml(s.id)} ・ ${escapeHtml(s.client)} ・ 状態: ${escapeHtml(s.status)} ・ 稼働: ${s.staffDays}日</div>
                  </div>
                  <div class="right">
                    <span class="badge"><span class="material-symbols-rounded">payments</span>${yen(s.sales||0)}</span>
                    <span class="badge"><span class="material-symbols-rounded">receipt</span>${yen(s.cost||0)}</span>
                    <span class="badge"><span class="material-symbols-rounded">trending_up</span>${yen(p)}</span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
function bindSites(){}

function ScreenSiteDetail(id){
  const s = state.sites.find(x=>x.id===id) || state.sites[0];
  const profit = (s.sales||0)-(s.cost||0);

  const outsiders = [
    { name:'外注A（防水）', days: 2, cost: 120000 },
    { name:'下請B（足場）', days: 1, cost: 70000 }
  ];
  const materials = [
    { name:'ウレタン主材', qty:'2缶', cost: 58000 },
    { name:'プライマー', qty:'3本', cost: 12000 },
    { name:'トップコート', qty:'1缶', cost: 24000 }
  ];

  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>${escapeHtml(s.id)} 現場詳細</h2>
            <p>${escapeHtml(s.name)}（${escapeHtml(s.client)}）</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">assignment</span>Input</span>
        </div>
        <div class="bd">
          <div class="kpis">
            <div class="kpi">
              <div class="top"><div class="label">売上</div><span class="material-symbols-rounded" style="opacity:.8">payments</span></div>
              <div class="val">${yen(s.sales||0)}</div>
              <div class="sub">ダミー</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">費用</div><span class="material-symbols-rounded" style="opacity:.8">receipt</span></div>
              <div class="val">${yen(s.cost||0)}</div>
              <div class="sub">ダミー</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">利益</div><span class="material-symbols-rounded" style="opacity:.8">trending_up</span></div>
              <div class="val">${yen(profit)}</div>
              <div class="sub">ダミー</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">稼働日数</div><span class="material-symbols-rounded" style="opacity:.8">person</span></div>
              <div class="val">${s.staffDays} 日</div>
              <div class="sub">ダミー</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="field">
            <label>現場名</label>
            <input class="input" id="sdName" value="${escapeAttr(s.name)}" />
          </div>
          <div class="field">
            <label>取引先</label>
            <input class="input" id="sdClient" value="${escapeAttr(s.client)}" />
          </div>
          <div class="field">
            <label>状態</label>
            <select class="input" id="sdStatus">
              ${['見積中','進行中','完了'].map(v => `<option ${v===s.status?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>スタッフ稼働日数（合計）</label>
            <input class="input" id="sdDays" inputmode="numeric" value="${s.staffDays}" />
          </div>
          <div class="field">
            <label>売上</label>
            <input class="input" id="sdSales" inputmode="numeric" value="${s.sales}" />
          </div>
          <div class="field">
            <label>費用（外注/下請/材料など合算）</label>
            <input class="input" id="sdCost" inputmode="numeric" value="${s.cost}" />
          </div>
          <div class="field">
            <label>メモ</label>
            <textarea class="input" id="sdNotes">${escapeHtml(s.notes||'')}</textarea>
          </div>

          <div class="hr"></div>

          <div class="card" style="margin:0;">
            <div class="hd">
              <div>
                <h3>外注・下請 / 関係者（ダミー）</h3>
                <p>スタッフ以外の稼働・費用</p>
              </div>
              <button class="btn" id="btnAddOut"><span class="material-symbols-rounded">add</span>追加</button>
            </div>
            <div class="bd">
              <div class="list">
                ${outsiders.map(o => `
                  <div class="item">
                    <div class="left">
                      <div class="ttl">${escapeHtml(o.name)}</div>
                      <div class="meta">稼働 ${o.days}日（仮）</div>
                    </div>
                    <div class="right">
                      <span class="money">${yen(o.cost)}</span>
                      <button class="btn" data-del="1"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="card" style="margin:0;">
            <div class="hd">
              <div>
                <h3>材料（ダミー）</h3>
                <p>原価の見た目確認用</p>
              </div>
              <button class="btn" id="btnAddMat"><span class="material-symbols-rounded">add</span>追加</button>
            </div>
            <div class="bd">
              <div class="list">
                ${materials.map(m => `
                  <div class="item">
                    <div class="left">
                      <div class="ttl">${escapeHtml(m.name)}</div>
                      <div class="meta">数量: ${escapeHtml(m.qty)}</div>
                    </div>
                    <div class="right">
                      <span class="money">${yen(m.cost)}</span>
                      <button class="btn" data-del="1"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <button class="btn primary" id="btnSaveSite"><span class="material-symbols-rounded">done</span>保存（ダミー）</button>
        </div>
      </div>
    </div>
  `;
}

function bindSiteDetail(id){
  $('#btnSaveSite').addEventListener('click', () => {
    const s = state.sites.find(x=>x.id===id);
    if(s){
      s.name = $('#sdName').value;
      s.client = $('#sdClient').value;
      s.status = $('#sdStatus').value;
      s.staffDays = parseInt($('#sdDays').value||'0',10);
      s.sales = parseInt($('#sdSales').value||'0',10);
      s.cost = parseInt($('#sdCost').value||'0',10);
      s.notes = $('#sdNotes').value;
    }
    toast('保存', '現場詳細（ダミー）を保存しました。', 'done');
    render(true);
  });

  $('#btnAddOut').addEventListener('click', () => {
    openModal('外注・下請を追加（ダミー）', `
      <div class="field"><label>名称</label><input class="input" value="外注（新規）"></div>
      <div class="field"><label>稼働日数</label><input class="input" inputmode="numeric" value="1"></div>
      <div class="field"><label>費用</label><input class="input" inputmode="numeric" value="50000"></div>
    `, `
      <button class="btn" id="mCancel">キャンセル</button>
      <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>追加</button>
    `);
    $('#mCancel').addEventListener('click', closeModal);
    $('#mOk').addEventListener('click', () => {
      toast('追加', '外注/下請（ダミー）を追加しました。', 'add');
      closeModal();
      render(true);
    });
  });

  $('#btnAddMat').addEventListener('click', () => {
    openModal('材料を追加（ダミー）', `
      <div class="field"><label>名称</label><input class="input" value="材料（新規）"></div>
      <div class="field"><label>数量</label><input class="input" value="1式"></div>
      <div class="field"><label>費用</label><input class="input" inputmode="numeric" value="20000"></div>
    `, `
      <button class="btn" id="mCancel">キャンセル</button>
      <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>追加</button>
    `);
    $('#mCancel').addEventListener('click', closeModal);
    $('#mOk').addEventListener('click', () => {
      toast('追加', '材料（ダミー）を追加しました。', 'add');
      closeModal();
      render(true);
    });
  });

  $$('#view [data-del]').forEach(b => b.addEventListener('click', () => {
    toast('削除', '削除（ダミー）しました。', 'delete');
    b.closest('.item')?.remove();
  }));
}

function ScreenFixed(){
  const sum = state.fixedCosts.reduce((s,x)=>s+(x.amount||0),0);
  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>固定費</h2>
            <p>固定費の一覧・カテゴリ・月額（ダミー）。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">payments</span>合計 ${yen(sum)}</span>
        </div>
        <div class="bd">
          <div class="list">
            ${state.fixedCosts.map(f => `
              <div class="item">
                <div class="left">
                  <div class="ttl">${escapeHtml(f.name)}</div>
                  <div class="meta">${escapeHtml(f.category)} ・ ${escapeHtml(f.note||'')}</div>
                </div>
                <div class="right">
                  <span class="money">${yen(f.amount||0)}</span>
                  <button class="btn" data-del="${escapeAttr(f.id)}"><span class="material-symbols-rounded">delete</span></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
function bindFixed(){
  $$('#view [data-del]').forEach(b => b.addEventListener('click', () => {
    const id = b.getAttribute('data-del');
    state.fixedCosts = state.fixedCosts.filter(x => x.id !== id);
    toast('削除', '固定費（ダミー）を削除しました。', 'delete');
    render(true);
  }));
}

function ScreenSchedule(){
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDow = d.getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const cells = [];
  for(let i=0;i<startDow;i++) cells.push({ blank:true });
  for(let day=1; day<=daysInMonth; day++){
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const evs = state.schedule.filter(e => sameDate(e.date, date)).slice(0,2);
    cells.push({ blank:false, day, evs });
  }
  const dows = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')} 月</h2>
            <p>現場予定・社内予定が入っているように見せるダミー。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">group</span>3名共有</span>
        </div>
        <div class="bd">
          <div class="calendar" style="margin-bottom:10px;">
            ${dows.map(x => `<div class="dow">${x}</div>`).join('')}
          </div>
          <div class="calendar">
            ${cells.map(c => c.blank ? `<div></div>` : `
              <div class="day">
                <div class="n">
                  <span>${c.day}</span>
                  ${c.evs.length ? `<span class="dot"></span>` : `<span style="opacity:.25"> </span>`}
                </div>
                ${c.evs.map(e => `<div class="ev ${e.cls||''}">${escapeHtml(e.time)} ${escapeHtml(e.title)}</div>`).join('')}
              </div>
            `).join('')}
          </div>

          <div class="hr"></div>

          <div class="list" id="evList">
            ${[...state.schedule].sort((a,b)=> a.date - b.date).slice(0,6).map(e => `
              <div class="item" data-eid="${escapeAttr(e.id)}">
                <div class="left">
                  <div class="ttl">${escapeHtml(fmtDate(e.date))} ${escapeHtml(e.time)} — ${escapeHtml(e.title)}</div>
                  <div class="meta">共有メモ（仮） / 担当: 3名（仮）</div>
                </div>
                <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
              </div>
            `).join('')}
          </div>

        </div>
      </div>
    </div>
  `;
}

function bindSchedule(){
  $$('#evList .item').forEach(it => it.addEventListener('click', () => {
    const id = it.getAttribute('data-eid');
    const e = state.schedule.find(x => x.id === id);
    if(!e) return;
    openModal('予定の詳細（ダミー）', `
      <div class="field"><label>日時</label><div class="input">${escapeHtml(fmtDate(e.date))} ${escapeHtml(e.time)}</div></div>
      <div class="field"><label>タイトル</label><input class="input" value="${escapeAttr(e.title)}"></div>
      <div class="field"><label>共有メモ</label><textarea class="input">例：集合場所・注意事項・材料持参など（仮）</textarea></div>
    `, `
      <button class="btn" id="mClose">閉じる</button>
      <button class="btn" id="mDel"><span class="material-symbols-rounded">delete</span>削除（ダミー）</button>
    `);
    $('#mClose').addEventListener('click', closeModal);
    $('#mDel').addEventListener('click', () => {
      state.schedule = state.schedule.filter(x => x.id !== id);
      toast('削除', '予定（ダミー）を削除しました。', 'delete');
      closeModal();
      render(true);
    });
  }));
}

function ScreenMore(){
  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>その他</h2>
            <p>アカウント管理・印刷など。</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">info</span>Tools</span>
        </div>
        <div class="bd">
          <div class="list">
            <a class="item" href="#/accounts">
              <div class="left">
                <div class="ttl">スタッフアカウント</div>
                <div class="meta">追加/編集（代表のみ・ダミー）</div>
              </div>
              <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
            </a>

            <a class="item" href="#/print">
              <div class="left">
                <div class="ttl">印刷 / PDF</div>
                <div class="meta">印刷プレビュー用レポート</div>
              </div>
              <div class="right"><span class="material-symbols-rounded" style="opacity:.8">chevron_right</span></div>
            </a>

            <div class="item" id="btnLogout">
              <div class="left">
                <div class="ttl">ログアウト</div>
                <div class="meta">ログイン画面へ</div>
              </div>
              <div class="right"><span class="material-symbols-rounded" style="opacity:.8">logout</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function bindMore(){
  $('#btnLogout').addEventListener('click', () => doLogout());
}

function ScreenAccounts(){
  const locked = !state.session?.canManageAccounts;
  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>ユーザー一覧</h2>
            <p>${locked ? 'スタッフ権限は閲覧のみ（ダミー）。' : '代表のみ追加/編集可能（ダミー）。'}</p>
          </div>
          <span class="badge"><span class="material-symbols-rounded">lock</span>${locked ? '閲覧' : '編集可'}</span>
        </div>
        <div class="bd">
          <button class="btn primary" id="btnAddUser" ${locked?'disabled':''}>
            <span class="material-symbols-rounded">person_add</span>追加（ダミー）
          </button>

          <div class="hr"></div>

          <div class="list">
            ${state.accounts.map(a => `
              <div class="item">
                <div class="left">
                  <div class="ttl">${escapeHtml(a.name)}</div>
                  <div class="meta">${escapeHtml(a.role)} ・ ${escapeHtml(a.email)}</div>
                </div>
                <div class="right">
                  <span class="badge"><span class="material-symbols-rounded">verified</span>${escapeHtml(a.status)}</span>
                  <button class="btn" data-edit="${escapeAttr(a.id)}" ${locked?'disabled':''}><span class="material-symbols-rounded">edit</span></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindAccounts(){
  const locked = !state.session?.canManageAccounts;
  if(!locked){
    $('#btnAddUser').addEventListener('click', () => {
      openModal('アカウント追加（ダミー）', `
        <div class="field"><label>氏名</label><input class="input" id="uName" value="スタッフ（新規）"></div>
        <div class="field"><label>権限</label>
          <select class="input" id="uRole">
            <option selected>スタッフ</option>
            <option>代表</option>
          </select>
        </div>
        <div class="field"><label>メール</label><input class="input" id="uMail" value="new@example.local"></div>
      `, `
        <button class="btn" id="mCancel">キャンセル</button>
        <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>追加</button>
      `);
      $('#mCancel').addEventListener('click', closeModal);
      $('#mOk').addEventListener('click', () => {
        state.accounts.push({ id:`U-${String(Math.floor(Math.random()*90)+10)}`, name: $('#uName').value, role: $('#uRole').value, email: $('#uMail').value, status:'有効' });
        toast('追加', 'アカウント（ダミー）を追加しました。', 'person_add');
        closeModal();
        render(true);
      });
    });

    $$('#view [data-edit]').forEach(b => b.addEventListener('click', () => {
      openModal('アカウント編集（ダミー）', `
        <div class="field"><label>氏名</label><input class="input" value="編集ダミー"></div>
        <div class="field"><label>権限</label><select class="input"><option>スタッフ</option><option>代表</option></select></div>
      `, `
        <button class="btn" id="mCancel">閉じる</button>
        <button class="btn primary" id="mOk"><span class="material-symbols-rounded">done</span>保存</button>
      `);
      $('#mCancel').addEventListener('click', closeModal);
      $('#mOk').addEventListener('click', () => {
        toast('保存', 'アカウント（ダミー）を保存しました。', 'done');
        closeModal();
      });
    }));
  }
}

function ScreenPrint(){
  const totalSales = state.sites.reduce((s,x)=>s+(x.sales||0),0);
  const totalCostVar = state.sites.reduce((s,x)=>s+(x.cost||0),0);
  const totalFixed = state.fixedCosts.reduce((s,x)=>s+(x.amount||0),0);
  const profit = totalSales - (totalCostVar + totalFixed);

  return `
    <div class="section">
      <div class="card">
        <div class="hd">
          <div>
            <h2>月次レポート（${escapeHtml(state.monthKey)}）</h2>
            <p>提出用途ではなく、見える化重視（仮）。</p>
          </div>
          <button class="btn primary" id="btnPrint"><span class="material-symbols-rounded">print</span>印刷</button>
        </div>
        <div class="bd">
          <div class="kpis">
            <div class="kpi">
              <div class="top"><div class="label">売上</div><span class="material-symbols-rounded" style="opacity:.8">payments</span></div>
              <div class="val">${yen(totalSales)}</div>
              <div class="sub">現場売上合計（ダミー）</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">費用</div><span class="material-symbols-rounded" style="opacity:.8">receipt_long</span></div>
              <div class="val">${yen(totalCostVar + totalFixed)}</div>
              <div class="sub">変動＋固定（ダミー）</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">利益</div><span class="material-symbols-rounded" style="opacity:.8">trending_up</span></div>
              <div class="val">${yen(profit)}</div>
              <div class="sub">売上−費用</div>
            </div>
            <div class="kpi">
              <div class="top"><div class="label">現場数</div><span class="material-symbols-rounded" style="opacity:.8">apartment</span></div>
              <div class="val">${state.sites.length} 件</div>
              <div class="sub">ダミー</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="card" style="margin:0;">
            <div class="hd">
              <div>
                <h3>現場別（ダミー）</h3>
                <p>UI確認用</p>
              </div>
              <span class="badge"><span class="material-symbols-rounded">description</span>Report</span>
            </div>
            <div class="bd">
              <div class="list">
                ${state.sites.map(s => `
                  <div class="item">
                    <div class="left">
                      <div class="ttl">${escapeHtml(s.id)} ${escapeHtml(s.name)}</div>
                      <div class="meta">${escapeHtml(s.client)} ・ ${escapeHtml(s.status)} ・ 稼働 ${s.staffDays}日</div>
                    </div>
                    <div class="right">
                      <span class="badge"><span class="material-symbols-rounded">payments</span>${yen(s.sales||0)}</span>
                      <span class="badge"><span class="material-symbols-rounded">receipt</span>${yen(s.cost||0)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function bindPrint(){
  $('#btnPrint').addEventListener('click', () => window.print());
}

function openModal(title, bodyHtml, footHtml){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalFoot').innerHTML = footHtml || '';
  $('#modal').showModal();
}
function closeModal(){
  const dlg = $('#modal');
  if(dlg.open) dlg.close();
}

function toast(title, msg, icon='info'){
  const wrap = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <span class="material-symbols-rounded" style="opacity:.88">${escapeHtml(icon)}</span>
    <div>
      <p class="t">${escapeHtml(title)}</p>
      <p class="m">${escapeHtml(msg)}</p>
    </div>
    <span class="material-symbols-rounded x" title="閉じる">close</span>
  `;
  wrap.appendChild(el);
  $('.x', el).addEventListener('click', () => el.remove());
  setTimeout(()=> el.remove(), 3800);
}

function doLogout(){
  closeModal();
  state.session = null;
  saveSession(null);
  toast('ログアウト', 'ログイン画面に戻りました。', 'logout');
  location.hash = '#/login';
}

function seedSchedule(){
  const y = now.getFullYear();
  const m = now.getMonth();
  const pick = (d, t, title, cls) => ({ id:uid(), date: new Date(y,m,d), time:t, title, cls });
  state.schedule = [
    pick(2, '08:00', '現場 S-001 朝礼', 'good'),
    pick(4, '13:00', '現場 S-002 仕上げ', 'warn'),
    pick(7, '10:00', '材料受取（防水材）', 'good'),
    pick(9, '15:30', '見積打合せ S-003', 'warn'),
    pick(12,'09:00', '社内ミーティング（3名）', 'good'),
    pick(16,'08:30', '現場 S-001 中間検査', 'bad'),
    pick(19,'14:00', '請求書作成（仮）', 'good'),
    pick(22,'09:30', '現調（新規）', 'warn')
  ];
}

function sameDate(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function fmtDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

function loadSession(){
  try{
    const raw = localStorage.getItem('aqualedger_session');
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}
function saveSession(s){
  try{
    if(!s) localStorage.removeItem('aqualedger_session');
    else localStorage.setItem('aqualedger_session', JSON.stringify(s));
  }catch(e){}
}