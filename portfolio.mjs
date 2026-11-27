import { groups, projects, designGroups, designCollections, designCategoryNotes,
  projectHighlights, projectCredits, conicsBreakdown, teaBreakdown } from './works.mjs?v=poster-layout';
import { createImageViewer, closeOnBackdrop } from './image-viewer.mjs';

const byId = id => document.getElementById(id);
const home = byId('home-content');
const detail = byId('project-detail');
const library = byId('all-works');
const readData = name => fetch(name).then(response => response.ok ? response.json() : {}).catch(() => ({}));
const [catalog, stills] = library
  ? await Promise.all([readData('./catalog.json?v=film-posters'),readData('./stills.json')])
  : [{},{}];
const media = path => './media/' + path.split('/').map(encodeURIComponent).join('/');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);
const worksLink = './works.html#all-works';
const projectHash = project => '#project/' + project.id;
const projectLink = project => projectHash(project);
const designLink = collection => '#design/' + collection.id;
function episodeCover(project, index) {
  const assets = catalog[project.id]?.episodes[index];
  const file = assets?.poster || assets?.frame;
  return file ? './covers/' + file + '?v=series' : project.frames[0] ? media(project.frames[0]) : '';
}
const workType = project => project.format ? groups[project.group] + ' · ' + project.format : groups[project.group];
const subtitle = project => project.description || groups[project.group] + (project.episodes.length > 1 ? ' · ' + project.episodes.length + ' 个成片' : ' · 原创作品');

function card(project, episode = 0, versionLabel = '') {
  const presentation = catalog[project.id]?.episodes[episode];
  const source = episodeCover(project, episode);
  const link = projectLink(project) + (episode ? '/' + (episode + 1) : '');
  const title = project.title.replace(/^《(.*)》$/, '$1');
  const video = project.episodes.length > 1
    ? project.episodes.length + ' 个成片' : formatTime(presentation?.videoInfo?.duration);
  const label = versionLabel || [project.language,video].filter(Boolean).join(' · ');
  return '<a class="work-card screening-card" href="' + link + '" aria-label="' +
    escape('观看视频：' + title + (versionLabel ? ' · ' + versionLabel : '')) + '">' +
    '<div class="work-cover video-cover">' +
    (source ? '<img loading="lazy" decoding="async" src="' + escape(source) + '" alt="">' : '') +
    '</div><div class="catalog-caption"><div class="catalog-copy"><span class="catalog-category">' +
    escape(workType(project)) + '</span><h3 class="catalog-title">' + escape(title) + '</h3>' +
    (label ? '<span class="catalog-meta">' + escape(label) + '</span>' : '') +
    '</div><span class="catalog-action screening-play" aria-hidden="true"></span></div></a>';
}

const orientations = [['landscape','横屏'], ['portrait','竖屏'], ['square','方形']];
function orientation(width, height) {
  return height > width ? 'portrait' : width > height ? 'landscape' : 'square';
}
function projectOrientation(project) {
  const info = catalog[project.id]?.episodes[0]?.videoInfo || {};
  return orientation(info.width, info.height);
}
const videoCards = library ? projects.flatMap(project => {
  const first = projectOrientation(project);
  const versions = project.episodes.map((episode,index) => {
    const info = catalog[project.id]?.episodes[index]?.videoInfo || {};
    return {project,index,episode,format:orientation(info.width,info.height)};
  });
  const formats = new Set(versions.map(item => item.format));
  return formats.size > 1 ? versions.map(item => ({...item,label:item.episode.label}))
    : [{project,index:0,format:first}];
}) : [];

function grouped(entries, format, render) {
  return orientations.map(([id,label]) => {
    const cards = entries.filter(({item}) => format(item) === id);
    if (!cards.length) return '';
    return '<section class="orientation-group" data-orientation="' + id + '"><h4>' + label +
      '</h4><div class="work-grid">' +
      cards.map(({item,index}) => render(item,index)).join('') + '</div></section>';
  }).join('');
}
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
if (library) {
  showKind(kindFromUrl());
  window.addEventListener('popstate', () => showKind(kindFromUrl()));
  const heading = library.querySelector('h2');
  for (const link of document.querySelectorAll('[data-cover-kind]')) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showKind(link.dataset.coverKind);
      if (link.href !== location.href) history.pushState(history.state,'',link.href);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      library.scrollIntoView({behavior:reducedMotion ? 'instant' : 'smooth'});
      heading.focus({preventScroll:true});
    });
  }
}

const viewer = createImageViewer(byId('design-preview'));
const designDialog = byId('design-project');
const designContent = byId('design-project-content');
let designTrigger;

closeOnBackdrop(designDialog);
designDialog.querySelector('[data-design-close]').addEventListener('click', () => designDialog.close());
designDialog.addEventListener('close', () => {
  if (designDialog.open || !designContent.hasChildNodes() || !location.hash.startsWith('#design/')) return;
  if (history.state?.designPreview) {
    history.back();
  } else {
    history.replaceState(history.state,'','./works.html?type=design#all-works');
    showKind('design');
    route();
    library.scrollIntoView();
  }
});

byId('design-grid').addEventListener('click', event => {
  const card = event.target.closest('.design-card');
  if (!card || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  designTrigger = card;
  history.pushState({...history.state,designPreview:true},'',card.href);
  route();
});

const collectionImage = (entry, number, size) =>
  './design-gallery/' + entry.folder + '-' + number + '-' + size + '.webp';

const designPoster = collection => './covers/filmdesign' + collection.folder + '.jpg';

function designCard(collection) {
  return '<a class="work-card design-card" href="' + designLink(collection) +
    '" aria-haspopup="dialog"><span class="work-cover design-cover"><img src="' + designPoster(collection) +
    '" loading="lazy" decoding="async" width="1280" height="720" alt=""></span>' +
    '<span class="catalog-caption"><span class="catalog-copy">' +
    '<span class="catalog-category">' + escape(designGroups[collection.group]) + ' / ' + collection.count + ' 张</span>' +
    '<strong class="catalog-title">' + escape(collection.title) + '</strong>' +
    '<span class="catalog-meta">' + escape(collection.summary) + '</span></span>' +
    '<span class="catalog-action" aria-hidden="true">↗</span></span></a>';
}

function designStream(collection) {
  const notes = new Map((collection.selections || []).map(([index,title,note]) => [index,[title,note]]));
  const images = Array.from({length:collection.count},(_, index) => {
    const number = index + 1;
    const low = collectionImage(collection,number,'cover');
    const high = collectionImage(collection,number,'full');
    const [title,note] = notes.get(number) || [];
    return '<figure><div class="design-frame"><img loading="lazy" decoding="async" width="960" height="540" src="' + low +
      '" srcset="' + low + ' 960w, ' + high + ' 3840w" sizes="(max-width: 920px) 82vw, 966px" alt="' +
      escape(collection.title + ' · ' + (title || '第 ' + number + ' 张')) + '"></div>' +
      (note ? '<figcaption><strong>' + escape(title) + '</strong>　' + escape(note) + '</figcaption>' : '') + '</figure>';
  }).join('');
  return '<section class="design-story" data-design="' + collection.id + '"><header>' +
    '<p class="kicker">' + escape(designGroups[collection.group]) + ' / ' + collection.count + ' 张</p>' +
    '<h2 class="project-title" id="design-project-title" tabindex="-1">' + escape(collection.title) + '</h2>' +
    '<p>' + escape(collection.overview || collection.summary) + '</p></header>' +
    '<div class="design-stream">' + images + '</div></section>';
}
document.addEventListener('click',event => {
  const asset = event.target.closest('.asset-thumb, .cover-view');
  if (!asset) return;
  const gallery = asset.closest('.media-grid');
  const thumbs = gallery ? [...gallery.querySelectorAll('.asset-thumb')] : [asset];
  viewer.open(thumbs.map(thumb => ({src:thumb.dataset.source,title:thumb.dataset.label})),thumbs.indexOf(asset));
});

function installFilters(container, grid, count, labels, items, groupOf, render, emptyMessage, format, afterSelect) {
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
    grid.innerHTML = matches.length === 0 ? '<p class="empty-works">' + emptyMessage + '</p>'
      : format ? grouped(matches, format, render) : matches.map(({item,index}) => render(item,index)).join('');
    afterSelect?.(group);
  }
  select(-1);
}

installFilters(byId('filters'), byId('work-grid'), byId('work-count'), groups, videoCards,
  item => item.project.group, item => card(item.project,item.index,item.label),
  '暂未收录音乐影像作品。', item => item.format);
installFilters(byId('design-filters'), byId('design-grid'), byId('design-count'), designGroups, designCollections,
  collection => collection.group, designCard, '此分类暂未收录作品。', null, updateDesignCategoryNote);

function updateDesignCategoryNote(group) {
  const note = byId('design-category-note');
  note.hidden = group < 0;
  note.textContent = designCategoryNotes[group] || '';
}

function strip(path) {
  return path.split('/').pop().replace(/\.[^.]+$/, '');
}
function assetFigure(source, label, thumbnail = source) {
  return '<figure><button class="asset-thumb" type="button" data-source="' + escape(source) +
    '" data-label="' + escape(label) + '" aria-label="放大查看 ' + escape(label) + '">' +
    '<img loading="lazy" decoding="async" src="' + escape(thumbnail) + '" alt=""></button><figcaption>' +
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

function renderBreakdown(title, intro, entries) {
  const steps = entries.map(step =>
    '<div class="breakdown-step">' + assetFigure(step.source, step.title) +
    '<p>' + escape(step.note) + '</p><button type="button" class="text-link" data-seek="' +
    step.time + '">定位到 ' + formatTime(step.time) + '</button></div>'
  ).join('');
  return '<section class="motion-breakdown"><h3>' + escape(title) + '</h3>' +
    '<p>' + escape(intro) + '</p>' +
    '<div class="media-grid breakdown-grid">' + steps + '</div></section>';
}

function renderDesign(collection) {
  designContent.innerHTML = designStream(collection);
  if (!designDialog.open) designDialog.showModal();
  designDialog.scrollTop = 0;
  byId('design-project-title').focus({preventScroll:true});
}

function storyboard(project,index,fallback) {
  const frames = stills[project.id + '-' + (index + 1)] || [];
  if (!frames.length) return fallback;
  const {width,height} = catalog[project.id]?.episodes[index]?.videoInfo || {};
  return '<div class="media-grid storyboard-grid" data-orientation="' + orientation(width,height) + '">' + frames.map((frame,i) =>
    assetFigure('./stills/' + frame.file,'分镜 ' + (i + 1) + ' · ' + formatTime(frame.time))
  ).join('') + '</div>';
}

function foxConsistency(images) {
  const reference = images?.find(path => strip(path) === '成年女子-宫装-四宫格');
  if (!reference) return '';
  return '<section class="fox-consistency"><h3>角色设定与成片对照</h3>' +
    '<p>将项目中的宫装人物设定与出场镜头并排，便于查看发式、服装轮廓和面部特征在成片光线下的呈现。</p>' +
    '<div class="media-grid breakdown-grid">' +
    assetFigure(media(reference),'宫装人物视觉资料') +
    assetFigure('./stills/fox-1-1.webp','第一集出场镜头 · 0:12') + '</div></section>';
}

let lastCard;
function renderEpisode(project, index) {
  const episode = project.episodes[index];
  const assets = catalog[project.id]?.episodes[index] || {};
  const buttonSet = detail.querySelector('.episodes');
  buttonSet?.querySelectorAll('button').forEach((button,i) => button.setAttribute('aria-pressed', String(i === index)));
  const vertical = project.frames.length > 0 || episode.video.includes('竖屏');
  const posterSource = episodeCover(project, index);
  const poster = posterSource ? ' poster="' + posterSource + '"' : '';
  const player = detail.querySelector('.player');
  const originalSource = media(episode.video);
  const enhancedSource = assets.enhanced ? './enhanced/' + assets.enhanced.file : '';
  let enhanced = Boolean(enhancedSource);
  player.innerHTML = '<video controls playsinline preload="metadata" ' + (vertical ? 'class="vertical"' : '') + poster +
    ' src="' + (enhancedSource || originalSource) + '" aria-label="' + escape(project.title + ' ' + episode.label) + '"></video><p class="work-meta"></p>';
  const video = player.querySelector('video');
  if (posterSource) {
    const posterButton = document.createElement('button');
    posterButton.type = 'button';
    posterButton.className = 'cover-view text-link';
    posterButton.textContent = '放大观看封面';
    posterButton.dataset.source = posterSource;
    posterButton.dataset.label = project.title + ' · ' + episode.label + '封面';
    player.append(posterButton);
  }
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
    const width = video.videoWidth || stored.width;
    const height = video.videoHeight || stored.height;
    const frameLabel = width && height ? orientations.find(([key]) => key === orientation(width,height))[1] : '';
    const duration = Number.isFinite(video.duration) ? video.duration : stored.duration;
    meta.textContent = [groups[project.group], project.format, '原创', suffix,
      enhancedSource ? (enhanced ? '清晰增强版' : '原版') : null,
      formatTime(duration), frameLabel].filter(Boolean).join(' / ');
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
  const stillGallery = storyboard(project,index,project.frames.length ? gallery(project.frames) : frame);
  const breakdown = project.id === 'tea' ? renderBreakdown(
    '分镜拆解',
    '按成片顺序选出六个镜头，说明从茶园、冲泡到品饮的画面过渡，以及每一处值得核对的细节。',
    teaBreakdown.map((step,i) => ({...step,source:'./stills/tea-1-' + (i+1) + '.webp'}))
  ) : project.id === 'conics' ? renderBreakdown(
    'MG 动画拆解',
    '以深蓝底统一图解段落，用金色突出曲线与焦点，冷色区分辅助线。',
    conicsBreakdown.map(step => ({...step,source:'./covers/' + step.frame}))
  ) : '';
  detail.querySelector('.episode-assets').innerHTML =
    (project.id === 'fox' && index === 0 ? foxConsistency(assets.images) : '') +
    (project.id === 'tea' ? breakdown : (stillGallery ? '<section><h3>成片分镜</h3>' + stillGallery + '</section>' : '') + breakdown) +
    (assets.images?.length ? '<section><h3>项目视觉资料</h3>' +
      '<p>对应项目的人物、场景与道具图。</p>' + gallery(assets.images) + '</section>' : '');
}

function renderDetail(project, initialEpisode) {
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  const highlight = projectHighlights[project.id] || project.description;
  const credit = projectCredits[project.id];
  detail.innerHTML = '<div class="band"><a class="back text-link" href="' + worksLink + '">返回作品</a>' +
    '<p class="kicker">' + workType(project) + '</p><h2 class="project-title" tabindex="-1">' + escape(project.title) +
    '</h2><p class="description">' + escape(subtitle(project)) + '</p>' +
    '<section class="player" aria-label="成片"></section>' +
    (project.episodes.length > 1 ? '<div class="episodes poster-episodes" role="group" aria-label="选择集数或版本">' +
      project.episodes.map((episode,index) => {
        const {width,height} = catalog[project.id]?.episodes[index]?.videoInfo || {};
        return '<button type="button" data-episode="' + index + '" data-orientation="' + orientation(width,height) +
          '" aria-pressed="false"><img loading="lazy" decoding="async" src="' + escape(episodeCover(project,index)) +
          '" alt=""><span>' + escape(episode.label) + '</span></button>';
      }).join('') + '</div>' : '') +
    (credit ? '<section class="project-credit"><h3>个人职责</h3>' +
      (credit.type ? '<p class="work-meta">' + escape(credit.type) + '</p>' : '') +
      '<p>' + escape(credit.role) + '</p>' +
      (credit.delivery ? '<p><strong>交付内容</strong>　' + escape(credit.delivery) + '</p>' : '') + '</section>' : '') +
    (highlight && highlight !== project.description ? '<section class="project-focus"><h3>作品看点</h3><p>' +
      escape(highlight) + '</p></section>' : '') + '<div class="episode-assets"></div>' +
    '<div class="detail-nav"><a class="text-link" href="' + worksLink + '">返回作品</a><a class="text-link" href="' + projectLink(next) +
    '">下一个项目 · ' + escape(next.title) + '</a></div></div>';
  detail.querySelector('.episodes')?.addEventListener('click', event => {
    const button = event.target.closest('[data-episode]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;
    const index = Number(button.dataset.episode);
    const hash = projectLink(project) + (index ? '/' + (index + 1) : '');
    history.replaceState(history.state,'',hash);
    renderEpisode(project,index);
  });
  renderEpisode(project, initialEpisode);
}
detail.addEventListener('click', event => {
  const cue = event.target.closest('[data-seek]');
  if (!cue) return;
  const video = detail.querySelector('.player video');
  video.currentTime = Number(cue.dataset.seek);
  video.focus({preventScroll:true});
  video.scrollIntoView({block:'center',
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
});
const originalTitle = document.title;
function route() {
  const [type, id, episode] = location.hash.slice(1).split('/');
  const project = type === 'project' ? projects.find(item => item.id === id) : null;
  const collection = type === 'design' ? designCollections.find(item => item.id === id) : null;
  const isDetail = type === 'project' || (type === 'design' && !collection);
  const index = Math.max(0, Math.min((project?.episodes.length || 1) - 1, (Number.parseInt(episode,10) || 1) - 1));
  const wasDetail = !detail.hidden;
  const previousVideo = detail.querySelector('video');
  previousVideo?.pause();
  home.hidden = isDetail;
  detail.hidden = !isDetail;
  document.body.classList.toggle('below', isDetail || scrollY > 48);
  if (!collection && designContent.hasChildNodes()) {
    if (designDialog.open) designDialog.close();
    designContent.replaceChildren();
    if (!isDetail && designTrigger?.isConnected) designTrigger.focus({preventScroll:true});
  }
  if (collection) {
    showKind('design');
    if (wasDetail) detail.replaceChildren();
    document.title = collection.title + ' · 候宇';
    renderDesign(collection);
  } else if (isDetail) {
    if (project) renderDetail(project,index);
    else detail.innerHTML = '<div class="band"><h2 class="project-title" tabindex="-1">找不到这个项目</h2><a class="text-link" href="' + worksLink + '">返回作品</a></div>';
    document.title = (project?.title || collection?.title || '项目') + ' · 候宇';
    window.scrollTo(0,0);
    detail.querySelector('h2').focus({preventScroll:true});
  } else {
    document.title = originalTitle;
    detail.replaceChildren();
    if (wasDetail) {
      const target = (lastCard?.isConnected ? lastCard : null) || byId(type) || byId('all-works') || byId('hero');
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
if (library) {
  const legacyUrl = new URL(location.href);
  const legacyCase = designCollections.find(collection => collection.id === legacyUrl.searchParams.get('case'));
  if (legacyCase && !/^#(?:project|design)\//.test(legacyUrl.hash)) {
    legacyUrl.searchParams.delete('case');
    legacyUrl.hash = designLink(legacyCase);
    history.replaceState(history.state,'',legacyUrl);
  }
}
route();
