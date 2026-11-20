import { groups, featured, projects, designGroups, designSamples } from './works.mjs';

const byId = id => document.getElementById(id);
const home = byId('home-content');
const detail = byId('project-detail');
const catalog = await fetch('./catalog.json').then(response => {
  if (!response.ok) throw Error('无法读取作品目录');
  return response.json();
}).catch(() => ({}));
const media = path => './media/' + path.split('/').map(encodeURIComponent).join('/');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);
const libraryPage = document.body.classList.contains('works-page');
const worksLink = libraryPage ? '#all-works' : './works.html';
const projectHash = project => '#project/' + project.id;
const projectLink = project => (libraryPage ? '' : './works.html') + projectHash(project);
const image = (path, label) => '<img loading="lazy" decoding="async" src="' + media(path) + '" alt="' + escape(label) + '">';
const cover = project => catalog[project.id]?.poster ? './covers/' + project.id + '.jpg'
  : project.frames[0] ? media(project.frames[0]) : '';
const subtitle = project => project.description || groups[project.group] + (project.episodes.length > 1 ? ' · ' + project.episodes.length + ' 个成片' : ' · 原创作品');

function card(project, expanded = false, episode = 0, versionLabel = '') {
  const poster = catalog[project.id]?.episodes[episode]?.poster;
  const source = poster ? './covers/' + poster : cover(project);
  const link = projectLink(project) + (episode ? '/' + (episode + 1) : '');
  return '<a class="work-card" href="' + link + '"><div class="work-cover">' +
    (source ? '<img loading="lazy" decoding="async" src="' + source + '" alt="">' : '<span aria-hidden="true">观看成片</span>') +
    '</div><div class="work-meta">' + groups[project.group] + '</div><h3>' + escape(project.title + (versionLabel ? ' · ' + versionLabel : '')) + '</h3>' +
    (expanded ? '<p>' + escape(subtitle(project)) + '</p>' : '') + '</a>';
}

const orientations = [['landscape','横屏'], ['portrait','竖屏'], ['square','方形']];
function orientation(width, height) {
  return height > width ? 'portrait' : width > height ? 'landscape' : 'square';
}
function projectOrientation(project) {
  const info = catalog[project.id]?.episodes[0]?.videoInfo || {};
  return orientation(info.width, info.height);
}
const videoCards = projects.flatMap(project => {
  const first = projectOrientation(project);
  const versions = project.episodes.map((episode,index) => {
    const info = catalog[project.id]?.episodes[index]?.videoInfo || {};
    return {project,index,episode,format:orientation(info.width,info.height)};
  });
  const formats = new Set(versions.map(item => item.format));
  return formats.size > 1 ? versions.map(item => ({...item,label:item.episode.label}))
    : [{project,index:0,format:first}];
});

function grouped(entries, format, render, featuredGroup = false) {
  return orientations.map(([id,label]) => {
    const cards = entries.filter(({item}) => format(item) === id);
    if (!cards.length) return '';
    return '<section class="orientation-group" data-orientation="' + id + '"><h4>' + label +
      '</h4><div class="work-grid' + (featuredGroup ? ' featured-grid' : '') + '">' +
      cards.map(({item,index}) => render(item,index)).join('') + '</div></section>';
  }).join('');
}
const selected = featured.map(id => projects.find(project => project.id === id));
const featuredGrid = byId('featured-grid');
if (featuredGrid) featuredGrid.innerHTML = grouped(selected.map(item => ({item})), projectOrientation, project => card(project,true),true);
const videoPane = byId('video-works');
const designPane = byId('design-works');
const switches = [...document.querySelectorAll('[data-kind]')];

function showKind(kind) {
  videoPane.hidden = kind !== 'video';
  designPane.hidden = kind !== 'design';
  for (const button of switches) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
}
for (const button of switches) button.addEventListener('click', () => {
  showKind(button.dataset.kind);
  const url = new URL(location.href);
  if (button.dataset.kind === 'design') url.searchParams.set('type','design');
  else url.searchParams.delete('type');
  history.replaceState(history.state,'',url);
});
function kindFromUrl() {
  return new URLSearchParams(location.search).get('type') === 'design' ? 'design' : 'video';
}
if (libraryPage) {
  showKind(kindFromUrl());
  window.addEventListener('popstate', () => showKind(kindFromUrl()));
  for (const link of document.querySelectorAll('[data-cover-kind]')) link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = document.getElementById('all-works');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    showKind(link.dataset.coverKind);
    history.pushState(history.state,'',link.href);
    target.scrollIntoView({behavior:reducedMotion ? 'instant' : 'smooth'});
    target.querySelector('h2').setAttribute('tabindex','-1');
    target.querySelector('h2').focus({preventScroll:true});
  });
}

const preview = byId('design-preview');
preview.querySelector('button').addEventListener('click', () => preview.close());
preview.querySelector('a').addEventListener('click', () => preview.close());
preview.addEventListener('close', () => preview.querySelector('img').removeAttribute('src'));

function designCard([group, title, project, asset, kind], index) {
  return '<button class="work-card design-card" type="button" data-sample="' + index +
    '"><span class="work-cover">' + image(asset,'') + '</span><span class="work-meta">' + designGroups[group] + ' · ' + kind +
    '</span><strong>' + escape(title) + '</strong></button>';
}

byId('design-grid')?.addEventListener('click', event => {
  const button = event.target.closest('[data-sample]');
  if (!button) return;
  const [, title, project, asset, label] = designSamples[Number(button.dataset.sample)];
  showPreview(media(asset), title, label, '#project/' + project);
});
function showPreview(source, title, label, related) {
  byId('design-preview-title').textContent = title;
  const img = preview.querySelector('img');
  img.src = source;
  img.alt = title;
  preview.querySelector('p').textContent = label;
  const relatedLink = preview.querySelector('a');
  relatedLink.hidden = !related;
  if (related) relatedLink.href = related;
  preview.showModal();
}
document.addEventListener('click',event => {
  const asset = event.target.closest('.asset-thumb');
  if (asset) showPreview(asset.dataset.source,asset.dataset.label,'',null);
});

function installFilters(container, grid, count, labels, items, groupOf, render, emptyMessage, format) {
  if (!container) return;
  const buttons = ['全部', ...labels].map((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => select(index-1));
    container.append(button);
    return button;
  });
  function select(group) {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === group+1)));
    const matches = items.map((item,index) => ({item,index})).filter(({item}) => group < 0 || groupOf(item) === group);
    count.textContent = new Set(matches.map(({item}) => item.project?.id ?? item)).size + ' 项作品';
    grid.innerHTML = matches.length ? grouped(matches, format, render)
      : '<p class="empty-works">' + emptyMessage + '</p>';
  }
  select(-1);
}

installFilters(byId('filters'), byId('work-grid'), byId('work-count'), groups, videoCards,
  item => item.project.group, item => card(item.project,false,item.index,item.label),
  '暂未收录音乐影像作品。', item => item.format);
installFilters(byId('design-filters'), byId('design-grid'), byId('design-count'), designGroups, designSamples,
  sample => sample[0], designCard, '此分类暂未收录作品。', sample => sample[5]);

function strip(path) {
  return path.split('/').pop().replace(/\.[^.]+$/, '');
}
function assetFigure(source, label) {
  return '<figure><button class="asset-thumb" type="button" data-source="' + escape(source) +
    '" data-label="' + escape(label) + '" aria-label="放大查看 ' + escape(label) + '">' +
    '<img loading="lazy" decoding="async" src="' + escape(source) + '" alt=""></button><figcaption>' +
    escape(label) + '</figcaption></figure>';
}
function gallery(items) {
  return items.length ? '<div class="media-grid">' + items.map(path => assetFigure(media(path),strip(path))).join('') + '</div>' : '';
}
function formatTime(total) {
  if (!Number.isFinite(total)) return '';
  const seconds = Math.round(total);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
}

const journey = projects.find(project => project.id === 'journey');
const journeyAssets = catalog.journey?.episodes[0]?.images || [];
const processGallery = byId('process-gallery');
if (processGallery) processGallery.innerHTML = gallery(journeyAssets.slice(0,3));

let lastCard;
function renderEpisode(project, index) {
  const episode = project.episodes[index];
  const assets = catalog[project.id]?.episodes[index] || {};
  const source = cover(project);
  const buttonSet = detail.querySelector('.episodes');
  buttonSet?.querySelectorAll('button').forEach((button,i) => button.setAttribute('aria-pressed', String(i === index)));
  const vertical = project.frames.length > 0 || episode.video.includes('竖屏');
  const posterSource = assets.poster ? './covers/' + assets.poster : source;
  const poster = posterSource ? ' poster="' + posterSource + '"' : '';
  const player = detail.querySelector('.player');
  const originalSource = media(episode.video);
  const enhancedSource = assets.enhanced ? './enhanced/' + assets.enhanced.file : '';
  let enhanced = Boolean(enhancedSource);
  player.innerHTML = '<video controls playsinline preload="metadata" ' + (vertical ? 'class="vertical"' : '') + poster +
    ' src="' + (enhancedSource || originalSource) + '" aria-label="' + escape(project.title + ' ' + episode.label) + '"></video><p class="work-meta"></p>';
  const video = player.querySelector('video');
  const meta = player.querySelector('p');
  const stored = assets.videoInfo || {};
  const toggle = document.createElement('button');
  if (enhancedSource) {
    toggle.type = 'button';
    toggle.className = 'video-clarity text-link';
    toggle.textContent = '查看原版';
    player.append(toggle);
  }
  const suffix = episode.label.includes('无语言') ? '无语言' : episode.label.includes('中文') ? '中文' : project.language;
  function updateMeta() {
    meta.textContent = [groups[project.group], '原创', suffix, enhancedSource ? (enhanced ? '清晰增强版' : '原版') : null, formatTime(Number.isFinite(video.duration) ? video.duration : stored.duration), 
      (video.videoWidth || stored.width) ? (video.videoHeight || stored.height) > (video.videoWidth || stored.width) ? '竖屏' : '横屏' : null].filter(Boolean).join(' / ');
    video.classList.toggle('vertical', (video.videoHeight || stored.height) > (video.videoWidth || stored.width));
  }
  updateMeta();
  video.addEventListener('loadedmetadata', updateMeta);
  function loadVersion(useEnhanced) {
    const currentTime = video.currentTime;
    const playing = !video.paused;
    enhanced = useEnhanced;
    toggle.textContent = enhanced ? '查看原版' : '查看增强版';
    video.src = enhanced ? enhancedSource : originalSource;
    video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(currentTime)) video.currentTime = Math.min(currentTime,video.duration);
      if (playing) video.play().catch(() => {});
    },{once:true});
    updateMeta();
  }
  toggle.addEventListener('click', () => loadVersion(!enhanced));
  video.addEventListener('error', () => {
    if (enhancedSource && enhanced) loadVersion(false);
    else meta.textContent += ' / 暂时无法播放此视频';
  });
  const originalFrame = assets.frame ? './covers/' + assets.frame : posterSource;
  const frame = originalFrame ? '<div class="media-grid">' + assetFigure(originalFrame,'成片画面') + '</div>' : '';
  detail.querySelector('.episode-assets').innerHTML =
    ((project.frames.length || frame || assets.scripts?.length) ? '<section><h3>关键画面与分镜</h3>' +
      (project.frames.length ? gallery(project.frames) : frame) +
      (assets.scripts || []).map(script => '<details><summary>' + escape(script.title) + '</summary><pre>' + escape(script.text) + '</pre></details>').join('') +
      '</section>' : '') +
    (assets.images?.length ? '<section><h3>项目视觉资料</h3>' +
      '<p>对应项目的人物、场景与道具图。</p>' + gallery(assets.images) + '</section>' : '');
}

function renderDetail(project, initialEpisode) {
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  detail.innerHTML = '<div class="band"><a class="back text-link" href="' + worksLink + '">返回作品</a>' +
    '<p class="kicker">' + groups[project.group] + '</p><h2 class="project-title" tabindex="-1">' + escape(project.title) +
    '</h2><p class="description">' + escape(subtitle(project)) + '</p>' +
    (project.episodes.length > 1 ? '<div class="episodes" role="group" aria-label="选择集数或版本">' +
      project.episodes.map((episode,index) => '<button type="button" data-episode="' + index + '" aria-pressed="false">' + escape(episode.label) + '</button>').join('') + '</div>' : '') +
    '<section class="player" aria-label="成片"></section><div class="episode-assets"></div>' +
    '<div class="detail-nav"><a class="text-link" href="' + worksLink + '">返回作品</a><a class="text-link" href="' + projectLink(next) +
    '">下一个项目 · ' + escape(next.title) + '</a></div></div>';
  detail.querySelector('.episodes')?.addEventListener('click', event => {
    const button = event.target.closest('[data-episode]');
    if (button) renderEpisode(project, Number(button.dataset.episode));
  });
  renderEpisode(project, initialEpisode);
}
const originalTitle = document.title;
function route() {
  const hash = location.hash.slice(1);
  const isProject = hash.startsWith('project/');
  const [, projectId, episode] = hash.split('/');
  const project = isProject ? projects.find(item => item.id === projectId) : null;
  const index = Math.max(0, Math.min((project?.episodes.length || 1) - 1, (Number.parseInt(episode,10) || 1) - 1));
  const wasDetail = !detail.hidden;
  const previousVideo = detail.querySelector('video');
  previousVideo?.pause();
  home.hidden = isProject;
  detail.hidden = !isProject;
  document.body.classList.toggle('below', isProject || scrollY > 48);
  if (isProject) {
    if (project) renderDetail(project,index);
    else detail.innerHTML = '<div class="band"><h2 class="project-title" tabindex="-1">找不到这个项目</h2><a class="text-link" href="' + worksLink + '">返回作品</a></div>';
    document.title = (project?.title || '项目') + ' · 候宇';
    window.scrollTo(0,0);
    detail.querySelector('h2').focus({preventScroll:true});
  } else {
    document.title = originalTitle;
    detail.replaceChildren();
    if (wasDetail) {
      const target = (lastCard?.isConnected ? lastCard : null) || byId(hash) || byId('all-works') || byId('works');
      target.scrollIntoView();
      if (target === lastCard) target.focus({preventScroll:true});
    }
  }
}
document.addEventListener('click', event => {
  const card = event.target.closest('.work-card');
  if (card) lastCard = card;
});
window.addEventListener('hashchange', route);
window.addEventListener('scroll', () => {
  document.body.classList.toggle('below', !detail.hidden || scrollY > 48);
}, {passive:true});
route();



const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const covered = 'polygon(0 0,100% 0,100% 100%,0 100%)';
const beyondRight = 'polygon(127% 0,127% 0,100% 100%,100% 100%)';
const beyondLeft = 'polygon(0 0,0 0,-27% 100%,-27% 100%)';
const handoffKey = 'hou-yu-portfolio-handoff';

function playCurtain(from,to,duration,easing) {
  const curtain = document.createElement('div');
  curtain.className = 'portfolio-curtain';
  curtain.setAttribute('aria-hidden','true');
  document.body.append(curtain);
  const animation = curtain.animate([{clipPath:from},{clipPath:to}],{duration,easing,fill:'both'});
  return {curtain,animation};
}

if (libraryPage) {
  let arrived = false;
  try {
    const queued = Number(sessionStorage.getItem(handoffKey));
    sessionStorage.removeItem(handoffKey);
    arrived = queued > 0 && Date.now() - queued < 5000;
  } catch {}
  if (arrived && !motionPreference.matches && typeof Element.prototype.animate === 'function') {
    document.documentElement.dataset.portfolioArrived = 'true';
    const {curtain,animation} = playCurtain(covered,beyondLeft,640,'cubic-bezier(.22,1,.36,1)');
    animation.finished.finally(() => curtain.remove());
  }
} else {
  let leaving = false;
  window.addEventListener('pageshow',() => {leaving = false;document.querySelector('.portfolio-curtain')?.remove();});
  document.addEventListener('click',event => {
    const link = event.target.closest('a[href^="./works.html"]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target || link.hash.startsWith('#project/') || motionPreference.matches || typeof Element.prototype.animate !== 'function') return;
    if (leaving) { event.preventDefault(); return; }
    try { sessionStorage.setItem(handoffKey,String(Date.now())); } catch { return; }
    event.preventDefault();
    leaving = true;
    const {animation} = playCurtain(beyondRight,covered,360,'cubic-bezier(.65,0,.27,1)');
    animation.finished.then(() => window.location.assign(link.href),() => window.location.assign(link.href));
  });
}
