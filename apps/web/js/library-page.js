import { loadCatalogBooks } from './book-catalog.js';

const fallbackBooks = [
  { slug:'meditations', title:'沉思录', author:'马可·奥勒留', summary:'关于自我、命运与理性的永恒对话。', category:{slug:'philosophy',name:'哲学思想'}, tags:['斯多葛主义','人生哲学'], status:'published', updatedAt:'2026-09-18T14:23:00Z', createdAt:'2026-08-02T09:20:00Z', wordCount:68400, coverUrl:'assets/categories/philosophy.png' },
  { slug:'antifragile', title:'反脆弱', author:'纳西姆·塔勒布', summary:'在不确定性中受益，拥抱波动，建立更强大的系统。', category:{slug:'thinking',name:'思维认知'}, tags:['风险','决策','不确定性'], status:'published', updatedAt:'2026-09-16T20:17:00Z', createdAt:'2026-08-08T11:30:00Z', wordCount:92100, coverUrl:'assets/scenes/forgotten-archive.png' },
  { slug:'thinking-fast-and-slow', title:'思考，快与慢', author:'丹尼尔·卡尼曼', summary:'两种思维系统如何影响判断、选择与生活。', category:{slug:'psychology',name:'心理学'}, tags:['认知偏差','行为经济学'], status:'published', updatedAt:'2026-09-14T11:05:00Z', createdAt:'2026-08-15T16:40:00Z', wordCount:106800, coverUrl:'assets/categories/inner-growth.png' },
  { slug:'the-conquest-of-happiness', title:'幸福之路', author:'伯特兰·罗素', summary:'在复杂世界中理解幸福的本质并学习如何生活。', category:{slug:'philosophy',name:'哲学思想'}, tags:['幸福','人生'], status:'draft', updatedAt:'2026-09-10T18:12:00Z', createdAt:'2026-09-01T10:18:00Z', wordCount:28400, coverUrl:'assets/categories/literature.png' },
];

const categoryDescriptions = {
  philosophy:'探讨存在、伦理与个人修养的思想文本。',
  thinking:'帮助建立判断框架与决策能力。',
  psychology:'理解认知、情绪和行为模式。',
  guides:'项目指南与使用说明。',
  other:'尚未归入固定领域的内容。',
};

const state = {
  activeTab:'books', query:{books:'',categories:'',tags:''}, status:'all', sort:{books:'updated-desc',categories:'updated-desc',tags:'usage-desc'},
  view:'list', selected:null, books:[], categories:[], tags:[], loaded:false, modal:null,
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slugify = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^-|-$/g,'');
const formatDate = value => value ? new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)) : '—';
const formatCount = value => Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '—';

function normalizeBook(book,index){
  const date=book.updatedAt||book.publishedAt||new Date(Date.now()-index*86400000).toISOString();
  return {...book,slug:book.slug||`book-${index+1}`,author:book.author||'佚名',summary:book.summary||'暂无简介',tags:Array.isArray(book.tags)?book.tags:[],status:book.status==='published'?'published':'draft',category:book.category||{slug:'other',name:'其他'},createdAt:book.createdAt||book.publishedAt||date,updatedAt:date,wordCount:book.wordCount||Math.max(1200,(book.summary||'').length*420)};
}

function rebuildTaxonomies(){
  const previousCategories=new Map(state.categories.map(item=>[item.slug,item]));
  const previousTags=new Map(state.tags.map(item=>[item.slug,item]));
  const categories=new Map(),tags=new Map();
  state.books.forEach(book=>{
    const category=book.category||{slug:'other',name:'其他'},existing=previousCategories.get(category.slug);
    if(!categories.has(category.slug))categories.set(category.slug,{slug:category.slug,name:category.name,description:existing?.description||categoryDescriptions[category.slug]||'用于整理相关主题书籍。',usage:0,createdAt:existing?.createdAt||book.createdAt,updatedAt:existing?.updatedAt||book.updatedAt});
    const record=categories.get(category.slug);record.usage++;if(book.updatedAt>record.updatedAt)record.updatedAt=book.updatedAt;
    book.tags.forEach(name=>{const slug=slugify(name)||`tag-${tags.size+1}`,existingTag=previousTags.get(slug);if(!tags.has(slug))tags.set(slug,{slug,name,description:existingTag?.description||'',usage:0,createdAt:existingTag?.createdAt||book.createdAt,updatedAt:existingTag?.updatedAt||book.updatedAt});const tag=tags.get(slug);tag.usage++;if(book.updatedAt>tag.updatedAt)tag.updatedAt=book.updatedAt});
  });
  previousCategories.forEach((value,key)=>{if(!categories.has(key))categories.set(key,value)});
  previousTags.forEach((value,key)=>{if(!tags.has(key))tags.set(key,value)});
  state.categories=[...categories.values()];state.tags=[...tags.values()];
}

function icon(name){const paths={search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',book:'<path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3z"/><path d="M4 5v17"/>',edit:'<path d="m4 20 4-1 11-11-3-3L5 16z"/>',trash:'<path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.book}</svg>`}

function header(){return `<header class="lm-header"><div><span>CONTENT MANAGEMENT</span><h1>内容管理</h1><p>统一管理书籍、分类与标签</p></div><nav class="lm-tabs" aria-label="内容管理模块">${[['books','书籍'],['categories','分类'],['tags','标签']].map(([id,label])=>`<button class="${state.activeTab===id?'active':''}" data-lm-tab="${id}">${label}<small>${id==='books'?state.books.length:id==='categories'?state.categories.length:state.tags.length}</small></button>`).join('')}</nav></header>`}

function toolbar(){
  const config={books:{placeholder:'搜索书名、作者、分类、标签',action:'新增书籍'},categories:{placeholder:'搜索分类名称或描述',action:'新建分类'},tags:{placeholder:'搜索标签',action:'新建标签'}}[state.activeTab];
  return `<div class="lm-toolbar"><label class="lm-search">${icon('search')}<input data-lm-search value="${esc(state.query[state.activeTab])}" placeholder="${config.placeholder}"></label><div class="lm-toolbar-filters">${state.activeTab==='books'?`<select data-lm-status><option value="all">全部状态</option><option value="published" ${state.status==='published'?'selected':''}>已发布</option><option value="draft" ${state.status==='draft'?'selected':''}>草稿</option></select>`:''}<select data-lm-sort>${state.activeTab==='tags'?'<option value="usage-desc">使用次数</option>':''}<option value="updated-desc">更新时间</option><option value="name-asc">名称</option></select>${state.activeTab==='books'?`<div class="lm-view-switch"><button class="${state.view==='list'?'active':''}" data-lm-view="list" aria-label="列表视图">${icon('list')}</button><button class="${state.view==='grid'?'active':''}" data-lm-view="grid" aria-label="网格视图">${icon('grid')}</button></div>`:''}</div><button class="lm-primary" data-lm-create>＋ ${config.action}</button></div>`;
}

function filteredBooks(){const query=state.query.books.toLowerCase();return state.books.filter(book=>(state.status==='all'||book.status===state.status)&&`${book.title}${book.author}${book.summary}${book.category?.name||''}${book.tags.join('')}`.toLowerCase().includes(query)).sort((a,b)=>state.sort.books==='name-asc'?a.title.localeCompare(b.title,'zh-CN'):String(b.updatedAt).localeCompare(String(a.updatedAt)))}
function bookCover(book,className=''){return `<div class="lm-cover ${className}" style="--lm-cover:url('${esc(book.coverUrl||'assets/cloud-realm-study-v2.png')}')"><span>${esc(book.title)}</span></div>`}
function bookActions(book){return `<div class="lm-row-actions"><button data-lm-edit="book:${esc(book.slug)}">编辑</button><button data-lm-delete="book:${esc(book.slug)}">删除</button><button class="icon" data-lm-more="book:${esc(book.slug)}" aria-label="更多">${icon('more')}</button></div>`}

function booksView(){const items=filteredBooks();if(!items.length)return '<div class="lm-empty">没有找到匹配的书籍</div>';if(state.view==='grid')return `<div class="lm-book-grid">${items.map(book=>`<article class="lm-book-card ${state.selected===`book:${book.slug}`?'selected':''}" data-lm-select="book:${esc(book.slug)}">${bookCover(book,'large')}<div><header><span class="lm-state ${book.status}">${book.status==='published'?'已发布':'草稿'}</span><small>${formatDate(book.updatedAt)}</small></header><h3>${esc(book.title)}</h3><p class="author">${esc(book.author)}</p><p>${esc(book.summary)}</p><div class="lm-chips"><b>${esc(book.category?.name||'其他')}</b>${book.tags.slice(0,2).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${bookActions(book)}</div></article>`).join('')}</div>`;
  return `<div class="lm-book-list"><div class="lm-list-head"><span>书籍信息</span><span>分类与标签</span><span>状态</span><span>更新时间</span><span>操作</span></div>${items.map(book=>`<article class="lm-book-row ${state.selected===`book:${book.slug}`?'selected':''}" data-lm-select="book:${esc(book.slug)}"><div class="lm-book-main">${bookCover(book)}<span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small><p>${esc(book.summary)}</p></span></div><div class="lm-chips"><b>${esc(book.category?.name||'其他')}</b>${book.tags.slice(0,3).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><span class="lm-state ${book.status}">${book.status==='published'?'已发布':'草稿'}</span><time>${formatDate(book.updatedAt)}</time>${bookActions(book)}</article>`).join('')}</div>`;
}

function sortedTaxonomy(type){const items=type==='category'?state.categories:state.tags,query=state.query[type==='category'?'categories':'tags'].toLowerCase(),sort=state.sort[type==='category'?'categories':'tags'];return items.filter(item=>`${item.name}${item.slug}${item.description}`.toLowerCase().includes(query)).sort((a,b)=>sort==='name-asc'?a.name.localeCompare(b.name,'zh-CN'):sort==='usage-desc'?b.usage-a.usage:String(b.updatedAt).localeCompare(String(a.updatedAt)))}
function taxonomyActions(type,item){return `<div class="lm-row-actions"><button data-lm-edit="${type}:${esc(item.slug)}">编辑</button><button data-lm-delete="${type}:${esc(item.slug)}">删除</button><button class="icon" data-lm-more="${type}:${esc(item.slug)}" aria-label="更多">${icon('more')}</button></div>`}
function categoriesView(){const items=sortedTaxonomy('category');return items.length?`<div class="lm-taxonomy-list"><div class="lm-taxonomy-head"><span>分类</span><span>说明</span><span>使用数量</span><span>更新时间</span><span>操作</span></div>${items.map(item=>`<article class="lm-taxonomy-row ${state.selected===`category:${item.slug}`?'selected':''}" data-lm-select="category:${esc(item.slug)}"><div><i>◇</i><span><strong>${esc(item.name)}</strong><small>${esc(item.slug)}</small></span></div><p>${esc(item.description||'暂无说明')}</p><b>${item.usage} 本书</b><time>${formatDate(item.updatedAt)}</time>${taxonomyActions('category',item)}</article>`).join('')}</div>`:'<div class="lm-empty">没有找到匹配的分类</div>'}
function tagsView(){const items=sortedTaxonomy('tag');return items.length?`<div class="lm-tag-grid">${items.map(item=>`<article class="lm-tag-card ${state.selected===`tag:${item.slug}`?'selected':''}" data-lm-select="tag:${esc(item.slug)}"><div><span>#</span><header><strong>${esc(item.name)}</strong><small>${esc(item.slug)}</small></header><b>${item.usage} 本书</b></div><p>${esc(item.description||'轻量标签，用于跨分类聚合内容。')}</p><footer><time>更新于 ${formatDate(item.updatedAt)}</time>${taxonomyActions('tag',item)}</footer></article>`).join('')}</div>`:'<div class="lm-empty">没有找到匹配的标签</div>'}

function relatedBooks(type,item){return state.books.filter(book=>type==='category'?book.category?.slug===item.slug:book.tags.some(tag=>slugify(tag)===item.slug))}
function detail(){if(!state.selected)return '';const [type,slug]=state.selected.split(':');if(type==='book'){const book=state.books.find(item=>item.slug===slug);if(!book)return '';return `<aside class="lm-detail" aria-label="书籍详情"><header><span>书籍详情</span><button data-lm-close aria-label="关闭详情">${icon('close')}</button></header><div class="lm-detail-book">${bookCover(book,'detail')}<div><span class="lm-state ${book.status}">${book.status==='published'?'已发布':'草稿'}</span><h2>${esc(book.title)}</h2><p>${esc(book.author)}</p></div></div><p class="lm-detail-summary">${esc(book.summary)}</p><section><label>分类</label><div class="lm-editable-chips"><button data-lm-remove-category="${esc(book.slug)}">${esc(book.category?.name||'其他')}　×</button><button class="add" data-lm-edit="book:${esc(book.slug)}">＋ 修改</button></div></section><section><label>标签</label><div class="lm-editable-chips">${book.tags.map(tag=>`<button data-lm-remove-tag="${esc(book.slug)}:${esc(tag)}">${esc(tag)}　×</button>`).join('')}<button class="add" data-lm-add-tag="${esc(book.slug)}">＋ 添加</button></div></section><dl><div><dt>创建时间</dt><dd>${formatDate(book.createdAt)}</dd></div><div><dt>更新时间</dt><dd>${formatDate(book.updatedAt)}</dd></div><div><dt>字数</dt><dd>${formatCount(book.wordCount)}</dd></div></dl><footer><button data-lm-read="${esc(book.slug)}">阅读</button><button data-lm-edit="book:${esc(book.slug)}">编辑</button><button data-lm-more="book:${esc(book.slug)}">更多</button></footer></aside>`}
  const item=(type==='category'?state.categories:state.tags).find(entry=>entry.slug===slug);if(!item)return '';const related=relatedBooks(type,item),label=type==='category'?'分类':'标签';return `<aside class="lm-detail" aria-label="${label}详情"><header><span>${label}详情</span><button data-lm-close aria-label="关闭详情">${icon('close')}</button></header><div class="lm-taxonomy-title"><i>${type==='category'?'◇':'#'}</i><div><h2>${esc(item.name)}</h2><p>${esc(item.slug)}</p></div></div><p class="lm-detail-summary">${esc(item.description||'暂无说明')}</p><dl><div><dt>使用数量</dt><dd>${item.usage} 本书</dd></div><div><dt>创建时间</dt><dd>${formatDate(item.createdAt)}</dd></div><div><dt>更新时间</dt><dd>${formatDate(item.updatedAt)}</dd></div></dl><section><label>关联书籍</label><div class="lm-related">${related.length?related.slice(0,6).map(book=>`<button data-lm-select="book:${esc(book.slug)}"><span>${esc(book.title)}</span><small>${esc(book.author)}</small></button>`).join(''):'<p>暂时没有关联书籍</p>'}</div></section><footer><button data-lm-show-related="${type}:${esc(item.slug)}">查看书籍</button><button data-lm-edit="${type}:${esc(item.slug)}">编辑${label}</button><button data-lm-more="${type}:${esc(item.slug)}">更多</button></footer></aside>`}

function modal(){if(!state.modal)return '';const {mode,type,slug}=state.modal,item=type==='category'?state.categories.find(entry=>entry.slug===slug):state.tags.find(entry=>entry.slug===slug),label=type==='category'?'分类':'标签';return `<div class="lm-modal-backdrop"><form class="lm-modal" data-lm-modal-form><header><div><small>${mode==='create'?'CREATE':'EDIT'} ${label==='分类'?'CATEGORY':'TAG'}</small><h2>${mode==='create'?'新建':'编辑'}${label}</h2></div><button type="button" data-lm-modal-close>${icon('close')}</button></header><label><span>${label}名称</span><input name="name" value="${esc(item?.name||'')}" maxlength="80" required autofocus></label><label><span>Slug</span><input name="slug" value="${esc(item?.slug||'')}" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="lowercase-slug" required ${mode==='edit'?'readonly':''}></label><label><span>简短说明</span><textarea name="description" maxlength="240">${esc(item?.description||'')}</textarea></label><p>当前为前端管理适配层；保存后本页即时更新，持久化需要对应后端接口。</p><footer><button type="button" data-lm-modal-close>取消</button><button class="primary" type="submit">保存</button></footer></form></div>`}

function shell(){return `<section class="lm-page">${header()}<main class="lm-surface">${toolbar()}<div class="lm-workspace ${state.selected?'has-detail':''}"><section class="lm-results" aria-live="polite">${state.activeTab==='books'?booksView():state.activeTab==='categories'?categoriesView():tagsView()}</section>${detail()}</div></main>${modal()}</section>`}

export async function createLibraryPage(root,{showToast,navigateToStudio}){
  root.innerHTML='<div class="lm-loading">正在整理藏书目录…</div>';
  if(!state.loaded){const loaded=await loadCatalogBooks().catch(()=>[]);state.books=(loaded.length?loaded:fallbackBooks).map(normalizeBook);rebuildTaxonomies();state.loaded=true}
  const render=()=>{root.innerHTML=shell();bind()};
  const notifyMock=message=>showToast(`${message}；后端接口接入后可持久化`);
  const closeDetail=()=>{state.selected=null;render()};
  const editBook=book=>{if(!book)return;navigateToStudio?.(book)};
  const deleteItem=(type,slug)=>{if(type==='book'){const item=state.books.find(book=>book.slug===slug);if(!item||!confirm(`确定删除《${item.title}》吗？\n当前仅从前端管理视图移除，不会删除 Git 内容。`))return;state.books=state.books.filter(book=>book.slug!==slug);state.selected=null;rebuildTaxonomies();render();notifyMock('书籍已从当前列表移除');return}const collection=type==='category'?state.categories:state.tags,item=collection.find(entry=>entry.slug===slug);if(!item)return;const warning=item.usage?`\n此${type==='category'?'分类':'标签'}被 ${item.usage} 本书使用，删除后关联书籍将改为未分类/移除标签。`:'';if(!confirm(`确定删除${type==='category'?'分类':'标签'}“${item.name}”吗？${warning}`))return;if(type==='category')state.books.forEach(book=>{if(book.category?.slug===slug)book.category={slug:'other',name:'其他'}});else state.books.forEach(book=>{book.tags=book.tags.filter(tag=>slugify(tag)!==slug)});state.selected=null;rebuildTaxonomies();render();notifyMock(`${type==='category'?'分类':'标签'}已更新`)};
  const openModal=(type,slug)=>{state.modal={mode:slug?'edit':'create',type,slug};render()};
  const bind=()=>{
    root.querySelectorAll('[data-lm-tab]').forEach(button=>button.onclick=()=>{state.activeTab=button.dataset.lmTab;state.selected=null;render()});
    root.querySelector('[data-lm-search]')?.addEventListener('input',event=>{state.query[state.activeTab]=event.target.value;render()});
    root.querySelector('[data-lm-status]')?.addEventListener('change',event=>{state.status=event.target.value;render()});
    root.querySelector('[data-lm-sort]')?.addEventListener('change',event=>{state.sort[state.activeTab]=event.target.value;render()});
    root.querySelectorAll('[data-lm-view]').forEach(button=>button.onclick=()=>{state.view=button.dataset.lmView;render()});
    root.querySelector('[data-lm-create]')?.addEventListener('click',()=>state.activeTab==='books'?navigateToStudio?.():openModal(state.activeTab==='categories'?'category':'tag'));
    root.querySelectorAll('[data-lm-select]').forEach(item=>item.onclick=event=>{if(event.target.closest('button')&&!event.target.closest('[data-lm-select]'))return;state.selected=item.dataset.lmSelect;render()});
    root.querySelector('[data-lm-close]')?.addEventListener('click',closeDetail);
    root.querySelectorAll('[data-lm-edit]').forEach(button=>button.onclick=event=>{event.stopPropagation();const [type,slug]=button.dataset.lmEdit.split(':');type==='book'?editBook(state.books.find(book=>book.slug===slug)):openModal(type,slug)});
    root.querySelectorAll('[data-lm-delete]').forEach(button=>button.onclick=event=>{event.stopPropagation();const [type,slug]=button.dataset.lmDelete.split(':');deleteItem(type,slug)});
    root.querySelectorAll('[data-lm-more]').forEach(button=>button.onclick=event=>{event.stopPropagation();showToast('更多操作将在后端管理接口接入后开放')});
    root.querySelector('[data-lm-read]')?.addEventListener('click',event=>{const book=state.books.find(item=>item.slug===event.currentTarget.dataset.lmRead);if(book?.contentUrl)window.open(book.contentUrl,'_blank','noopener');else showToast('该书暂时没有可用阅读地址')});
    root.querySelector('[data-lm-remove-category]')?.addEventListener('click',event=>{const book=state.books.find(item=>item.slug===event.currentTarget.dataset.lmRemoveCategory);if(book){book.category={slug:'other',name:'其他'};rebuildTaxonomies();render();notifyMock('分类已移除')}});
    root.querySelectorAll('[data-lm-remove-tag]').forEach(button=>button.onclick=()=>{const [slug,tag]=button.dataset.lmRemoveTag.split(':');const book=state.books.find(item=>item.slug===slug);if(book){book.tags=book.tags.filter(item=>item!==tag);rebuildTaxonomies();render();notifyMock('标签已移除')}});
    root.querySelector('[data-lm-add-tag]')?.addEventListener('click',event=>{const book=state.books.find(item=>item.slug===event.currentTarget.dataset.lmAddTag),name=prompt('输入标签名称');if(book&&name?.trim()&&!book.tags.includes(name.trim())){book.tags.push(name.trim());rebuildTaxonomies();render();notifyMock('标签已添加')}});
    root.querySelector('[data-lm-show-related]')?.addEventListener('click',event=>{const [type,slug]=event.currentTarget.dataset.lmShowRelated.split(':'),item=(type==='category'?state.categories:state.tags).find(entry=>entry.slug===slug);state.activeTab='books';state.query.books=item?.name||'';state.selected=null;render()});
    root.querySelectorAll('[data-lm-modal-close]').forEach(button=>button.onclick=()=>{state.modal=null;render()});
    root.querySelector('[data-lm-modal-form]')?.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget),name=String(data.get('name')||'').trim(),slug=String(data.get('slug')||'').trim(),description=String(data.get('description')||'').trim(),collection=state.modal.type==='category'?state.categories:state.tags;if(state.modal.mode==='create'&&collection.some(item=>item.slug===slug)){showToast('Slug 已存在');return}if(state.modal.mode==='edit'){const item=collection.find(entry=>entry.slug===state.modal.slug);Object.assign(item,{name,description,updatedAt:new Date().toISOString()})}else collection.push({name,slug,description,usage:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});state.modal=null;render();notifyMock(`${state.activeTab==='categories'?'分类':'标签'}已保存`)});
  };
  render();
}
