const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DB_NAME="kitam_b2",DB_VERSION=1,STORE="files";
const defaultTemplates=[
{id:"starter-cyan",name:"Astral Cyan",type:"PPTX",icon:"✦",desc:"Mẫu thử nghiệm phong cách ma thuật xanh.",builtin:true},
{id:"starter-green",name:"Witch Garden",type:"PDF",icon:"☘",desc:"Mẫu thử nghiệm xanh lá neon.",builtin:true},
{id:"starter-fire",name:"Arcane Fire",type:"IMAGE",icon:"🔥",desc:"Mẫu hình ảnh lấy cảm hứng từ lò luyện phép.",builtin:true}
];
function readJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){console.warn("KitaM storage reset:",key,e);return fallback;}}
let templates=readJSON("kitam_templates",null)||defaultTemplates;
let projects=readJSON("kitam_projects",[]);
let selectedTemplate=localStorage.getItem("kitam_selected_template")||"";
let researchSources=readJSON("kitam_research_sources",[]);
let researchSelected=new Set();
let researchQuery="";
let imageResults=readJSON("kitam_image_results",[]);
let imageSelected=new Set();
let editorProjectId="";
let editorSlideIndex=0;
let editorRenderToken=0;
let nativePptSession=null,nativePptView=null,nativePptSelection=null;

function saveMeta(){localStorage.setItem("kitam_templates",JSON.stringify(templates));localStorage.setItem("kitam_projects",JSON.stringify(projects));localStorage.setItem("kitam_research_sources",JSON.stringify(researchSources));}
function apiBase(){return (localStorage.getItem("kitam_api_base")||"").trim().replace(/\/$/,"");}
function sourceDomain(url){try{return new URL(url).hostname.replace(/^www\./,"")}catch(e){return "nguồn"}}
function demoSources(query,limit,types){const now=new Date().toISOString(),clean=query||"chủ đề mẫu";const pool=[{title:"Tổng quan khái niệm và bối cảnh",url:"https://example.com/kitam-demo/overview",sourceType:"web",snippet:"Nguồn demo để kiểm thử citation và gắn nguồn vào project."},{title:"Báo cáo / số liệu tham khảo",url:"https://example.com/kitam-demo/report",sourceType:"news",snippet:"Dữ liệu minh họa — không phải kết quả tìm kiếm web trực tiếp."},{title:"Thảo luận cộng đồng",url:"https://example.com/kitam-demo/community",sourceType:"social",snippet:"Mẫu nguồn social; chưa phải bài đăng thật."},{title:"Bài phân tích chuyên đề",url:"https://example.com/kitam-demo/analysis",sourceType:"web",snippet:"KitaM sẽ thay nguồn demo bằng kết quả backend khi API được cấu hình."},{title:"Tin tức liên quan",url:"https://example.com/kitam-demo/news",sourceType:"news",snippet:"Mẫu citation để kiểm tra cách nguồn hiển thị."},{title:"Nguồn tham khảo mở",url:"https://example.com/kitam-demo/reference",sourceType:"web",snippet:"Nguồn demo cho chủ đề: "+clean},{title:"Góc nhìn mạng xã hội",url:"https://example.com/kitam-demo/social",sourceType:"social",snippet:"Mẫu dữ liệu social; cần backend/provider để lấy dữ liệu thật."},{title:"Tổng hợp kiến thức",url:"https://example.com/kitam-demo/knowledge",sourceType:"web",snippet:"Nguồn minh họa cho bước B4."}];const wanted=types.split(",");return pool.filter(x=>wanted.includes(x.sourceType)).slice(0,limit).map((x,i)=>({...x,id:"demo_"+Date.now()+"_"+i,domain:sourceDomain(x.url),retrievedAt:now,citation:i+1,demo:true,query:clean}));}
function normalizeSources(items){return (Array.isArray(items)?items:[]).map((x,i)=>({id:String(x.id||"src_"+Date.now()+"_"+i),title:String(x.title||"Untitled source"),url:String(x.url||"#"),domain:String(x.domain||sourceDomain(x.url||"#")),snippet:String(x.snippet||""),sourceType:String(x.sourceType||"web"),retrievedAt:x.retrievedAt||new Date().toISOString(),citation:i+1,demo:false}));}
function imageDemo(query,limit,ratio){return Array.from({length:limit},(_,i)=>({id:"img_demo_"+Date.now()+"_"+i,title:"Minh họa "+(i+1)+" — "+(query||"demo"),url:"https://picsum.photos/1200/700?random="+(Date.now()+i),thumbnailUrl:"https://picsum.photos/400/240?random="+(Date.now()+i),alt:(query||"demo")+" illustration",source:"Demo Image Search",sourceUrl:"https://example.com/kitam-demo/image-"+i,query,ratio,demo:true,createdAt:new Date().toISOString()}));}
function normalizeImages(items){return (Array.isArray(items)?items:[]).map((x,i)=>({id:String(x.id||"img_"+Date.now()+"_"+i),title:String(x.title||"Illustration "+(i+1)),url:String(x.url||x.imageUrl||""),thumbnailUrl:String(x.thumbnailUrl||x.url||x.imageUrl||""),alt:String(x.alt||x.title||""),source:String(x.source||"web"),sourceUrl:String(x.sourceUrl||x.url||"#"),query:String(x.query||""),ratio:String(x.ratio||"landscape"),demo:false,createdAt:x.createdAt||new Date().toISOString()}));}
async function imageRequest(query,limit,ratio){const base=apiBase();if(!base)return {images:imageDemo(query,limit,ratio),demo:true};const res=await fetch(base+"/images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,limit,ratio})});if(!res.ok)throw new Error("Image API trả về HTTP "+res.status);return {images:normalizeImages((await res.json()).images),demo:false};}
function renderImages(){const list=$("#imageList");if(!list)return;$("#imageCount").textContent=imageResults.length+" ảnh";if(!imageResults.length){list.innerHTML='<div class="empty">Nhập từ khóa rồi niệm phép tìm ảnh.</div>';$("#imageAttachBtn").disabled=true;return}$("#imageAttachBtn").disabled=false;list.innerHTML=imageResults.map((im,i)=>'<article class="image-card '+(imageSelected.has(im.id)?"selected":"")+'"><label><input type="checkbox" data-image-check="'+escapeHtml(im.id)+'" '+(imageSelected.has(im.id)?"checked":"")+'></label><div class="image-thumb"><img src="'+escapeHtml(im.thumbnailUrl||im.url)+'" alt="'+escapeHtml(im.alt)+'" loading="lazy"></div><div class="image-info"><strong>['+(i+1)+'] '+escapeHtml(im.title)+'</strong><span>'+escapeHtml(im.source)+(im.demo?" · DEMO":"")+'</span><a href="'+escapeHtml(im.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Nguồn / bản gốc ↗</a></div></article>').join("");$$("[data-image-check]").forEach(c=>c.onchange=()=>{if(c.checked)imageSelected.add(c.dataset.imageCheck);else imageSelected.delete(c.dataset.imageCheck);c.closest(".image-card").classList.toggle("selected",c.checked);});}
async function researchRequest(query,limit,types){const base=apiBase();if(!base)return {sources:demoSources(query,limit,types),demo:true};const res=await fetch(base+"/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,limit,types:types.split(",")})});if(!res.ok)throw new Error("Research API trả về HTTP "+res.status);return {sources:normalizeSources((await res.json()).sources),demo:false};}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2800)}
function getEditorProject(){return projects.find(p=>p.id===editorProjectId)||projects[0]||null;}
function ensurePlan(p){if(!p)return[];if(!Array.isArray(p.plan)||!p.plan.length){p.plan=makePlan({get:k=>k==="title"?p.title:k==="slides"?p.slides:k==="content"?p.content:""});}return p.plan;}
function fillEditorProjects(){const sel=$("#editorProjectSelect");if(!sel)return;sel.innerHTML=projects.length?projects.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.title||"Untitled")+'</option>').join(""):'<option value="">Chưa có project</option>';if(editorProjectId&&projects.some(p=>p.id===editorProjectId))sel.value=editorProjectId;else if(projects[0]){editorProjectId=projects[0].id;sel.value=editorProjectId;}}
function editorImages(p){const saved=Array.isArray(p?.images)?p.images:[];const imgs=[...saved,...imageResults];const seen=new Set();return imgs.filter(x=>x&&!seen.has(x.id)&&seen.add(x.id));}
async function renderEditor(){const p=getEditorProject(),stage=$("#slideStage");if(!p){stage.innerHTML='<div class="empty">Chưa có project. Hãy tạo project trước.</div>';$("#editorPageInfo").textContent="Slide 0 / 0";return}const plan=ensurePlan(p);if(editorSlideIndex>=plan.length)editorSlideIndex=Math.max(0,plan.length-1);const s=plan[editorSlideIndex]||{title:"",body:"",layout:"COVER"};const token=++editorRenderToken;stage.innerHTML='<div class="pptx-render-loading">✦ ĐANG ÁP DỤNG TEMPLATE...</div>';let templateSvg="",templateSlideCount=0;try{const t=templates.find(x=>x.id===p.templateId);if(t&&!t.builtin&&t.type==="PPTX"){const rec=await getFile(t.id);if(rec){const info=await parsePptx(rec.blob);templateSlideCount=info.slides.length;const idx=templateSlideCount?editorSlideIndex%templateSlideCount:0;templateSvg=await renderPptxSlideSvg(rec.blob,idx);}}}catch(e){console.warn("KitaM template apply:",e);}if(token!==editorRenderToken)return;const layoutClass='layout-'+escapeHtml(String(s.layout).toLowerCase().replace(/\s/g,"-").replace("+","plus"));if(templateSvg){stage.innerHTML='<div class="slide-template-stage"><div class="slide-template-bg">'+templateSvg+'</div><div class="slide-template-content"><div class="slide-template-badge">KITAM · TEMPLATE '+String((editorSlideIndex%Math.max(1,templateSlideCount))+1).padStart(2,"0")+'</div><h2>'+escapeHtml(s.title||"Untitled")+'</h2><div class="slide-body">'+escapeHtml(s.body||"").replace(/\n/g,"<br>")+'</div>'+((s.imageUrl)?'<img class="slide-image" src="'+escapeHtml(s.imageUrl)+'" alt="">':"")+'<div class="slide-foot">KitaM · '+(editorSlideIndex+1)+' / '+plan.length+'</div></div></div>';}else{stage.innerHTML='<div class="slide-canvas '+layoutClass+'"><div class="slide-magic">KITAM · '+escapeHtml(p.style||"ARCANE")+'</div><h2>'+escapeHtml(s.title||"Untitled")+'</h2><div class="slide-body">'+escapeHtml(s.body||"").replace(/\n/g,"<br>")+'</div>'+((s.imageUrl)?'<img class="slide-image" src="'+escapeHtml(s.imageUrl)+'" alt="">':"")+'<div class="slide-foot">KitaM · '+(editorSlideIndex+1)+' / '+plan.length+'</div></div>';}$("#editorPageInfo").textContent="Slide "+(editorSlideIndex+1)+" / "+plan.length;$("#editTitle").value=s.title||"";$("#editBody").value=s.body||"";$("#editLayout").value=s.layout||"TITLE + CONTENT";const is=editorImages(p);$("#editImage").innerHTML='<option value="">Không dùng ảnh</option>'+is.map(x=>'<option value="'+escapeHtml(x.url)+'">'+escapeHtml(x.title||"Ảnh")+'</option>').join("");$("#editImage").value=s.imageUrl||"";const sources=p.sources||[];$("#editSources").innerHTML=sources.length?sources.map((x,i)=>'<div class="editor-source">['+(i+1)+'] '+escapeHtml(x.title||"Nguồn")+'</div>').join(""):'<div class="muted">Chưa gắn nguồn.</div>';}
async function closeNativePptEditor(){try{nativePptView?.destroy?.();nativePptSelection?.destroy?.();nativePptSession?.dispose?.();}catch(e){}nativePptView=null;nativePptSelection=null;nativePptSession=null;const panel=$("#nativePptxPanel");if(panel)panel.hidden=true;}
async function openNativePptEditor(){const p=getEditorProject();if(!p){toast("Hãy chọn project trước.");return}const t=templates.find(x=>x.id===p.templateId);if(!t||t.builtin||t.type!=="PPTX"){toast("Project này chưa dùng template PPTX thật.");return}const rec=await getFile(t.id);if(!rec){toast("Không tìm thấy file PPTX gốc.");return}await closeNativePptEditor();const panel=$("#nativePptxPanel"),canvas=$("#nativePptxCanvas"),pane=$("#nativePptxSelection");if(!panel||!canvas||!pane)return;panel.hidden=false;canvas.innerHTML='<div class="pptx-render-loading">✦ ĐANG MỞ EDITOR PPTX...</div>';pane.innerHTML="";try{const mod=await import("https://cdn.jsdelivr.net/npm/@web-ppt/editor@next/+esm");nativePptSession=await mod.openEditor(rec.blob);nativePptView=nativePptSession.mount(canvas,{mode:"edit",zoom:1,textMode:"auto",snapping:true});nativePptSelection=nativePptSession.mountSelectionPane(pane,{mode:"edit",slideId:nativePptView.slideId});toast("✦ Đã mở trình chỉnh sửa PPTX thật.");}catch(e){console.error("KitaM native PPTX editor:",e);canvas.innerHTML='<div class="empty">⚠ Không mở được editor PPTX. Hãy kiểm tra kết nối mạng/CDN rồi thử lại.</div>';toast("Không mở được editor PPTX.");}}
async function saveNativePptEditor(){if(!nativePptSession){toast("Chưa mở editor.");return}const p=getEditorProject(),t=p&&templates.find(x=>x.id===p.templateId);if(!p||!t)return;try{const bytes=await nativePptSession.editor.save();const file=new File([bytes],t.fileName||((t.name||"template")+".pptx"),{type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"});await putFile(t.id,file);t.size=file.size;t.fileName=file.name;t.desc="Đã chỉnh sửa trực tiếp • "+Math.round(file.size/1024)+" KB";saveMeta();await renderTemplates();toast("✦ Đã lưu thay đổi vào file PPTX gốc của template.");}catch(e){console.error("KitaM save PPTX:",e);toast("Không thể lưu PPTX: "+(e.message||e));}}
function saveEditorSlide(){const p=getEditorProject();if(!p)return;const s=ensurePlan(p)[editorSlideIndex];if(!s)return;s.title=$("#editTitle").value;s.body=$("#editBody").value;s.layout=$("#editLayout").value;s.imageUrl=$("#editImage").value;saveMeta();renderEditor();toast("✦ Đã lưu slide "+(editorSlideIndex+1));}
async function renderCreateTemplatePreview(){
    const host=$("#create .slide-preview");
    if(!host)return;
    const id=$("#templateSelect")?.value||selectedTemplate;
    const t=templates.find(x=>x.id===id);
    if(!t||t.builtin||t.type!=="PPTX"){
      host.innerHTML='<div class="slide-number">01</div><div class="preview-orb">✦</div><h3 id="previewTitle">Tên bài của bạn</h3><p id="previewAuthor">Người trình bày</p>';
      const form=$("#createForm");
      if(form){
        const f=new FormData(form);
        $("#previewTitle").textContent=f.get("title")||"Tên bài của bạn";
        $("#previewAuthor").textContent=f.get("author")||"Người trình bày";
      }
      return;
    }
    host.innerHTML='<div class="pptx-render-loading">✦ ĐANG ÁP DỤNG MẪU...</div>';
    try{
      const rec=await getFile(t.id);
      if(!rec)throw new Error("Không tìm thấy file template.");
      const svg=await renderPptxSlideSvg(rec.blob,0);
      host.innerHTML='<div class="create-template-render">'+(svg||'<span>Không render được template.</span>')+'</div><div class="slide-number">01</div><div class="create-template-overlay"><strong id="previewTitle"></strong><span id="previewAuthor"></span></div>';
      const f=new FormData($("#createForm"));
      $("#previewTitle").textContent=f.get("title")||"Tên bài của bạn";
      $("#previewAuthor").textContent=f.get("author")||"Người trình bày";
    }catch(e){
      console.warn("KitaM create template preview:",e);
      host.innerHTML='<div class="slide-number">01</div><div class="preview-orb">⚠</div><h3 id="previewTitle">Không render được mẫu</h3><p id="previewAuthor">File gốc vẫn được giữ nguyên.</p>';
    }
  }
function showPage(id){$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"});if(id==="templates")renderTemplates();if(id==="projects")renderProjects();if(id==="research")renderSources();if(id==="images")renderImages();if(id==="create"){fillTemplateSelect();renderCreateTemplatePreview();}if(id==="editor"){fillEditorProjects();renderEditor();}}
$$("[data-page]").forEach(el=>el.addEventListener("click",()=>showPage(el.dataset.page)));

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}
async function putFile(id,file){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({id,blob:file,name:file.name,size:file.size,type:file.type||"application/octet-stream",updated:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);})}
async function getFile(id){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);})}
async function deleteFile(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);})}
async function countFiles(){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).count();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}
async function clearFiles(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);})}

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function fillTemplateSelect(){const s=$("#templateSelect");if(!s)return;s.innerHTML='<option value="">— Chưa chọn template —</option>'+templates.map(t=>'<option value="'+escapeHtml(t.id)+'" '+(t.id===selectedTemplate?'selected':'')+'>'+escapeHtml(t.name)+' — '+escapeHtml(t.type)+'</option>').join("");}
function smartAnalyzeContent(raw){const lines=String(raw||"").replace(/\r/g,"").split(/\n+/).map(x=>x.trim()).filter(Boolean);const out=[];let current=null;const bulletRx=/^(?:[-•*▪◦‣]|\d+[.)]|[a-zA-Z][.)])\s+/;const headingRx=/^(?:\d+[.)]?)\s*[A-ZÀ-ỸĐ][^.!?]{2,90}(?::)?$/u;const isHeading=x=>headingRx.test(x)||/[:：]$/.test(x)&&x.length<100;const clean=x=>x.replace(bulletRx,"").trim();for(const line of lines){const bullet=bulletRx.test(line);if(isHeading(line)&&!bullet){if(current)out.push(current);current={title:line.replace(/[:：]$/,""),bullets:[],paras:[]};}else{if(!current)current={title:"Nội dung chính",bullets:[],paras:[]};if(bullet)current.bullets.push(clean(line));else current.paras.push(line);}}if(current)out.push(current);return out.flatMap(sec=>{const chunks=[];const all=[...sec.bullets,...sec.paras];if(!all.length)return[{title:sec.title,body:"",bullets:[],kind:"section"}];for(let i=0;i<all.length;i+=5)chunks.push({title:i===0?sec.title:sec.title+" (tiếp)",body:all.slice(i,i+5).join("\n"),bullets:sec.bullets.slice(i,i+5),kind:sec.bullets.length>=2?"bullets":"paragraph"});return chunks;});}
function inferSlideLayout(item,index){const text=(item.title+" "+item.body).toLowerCase();if(/timeline|lộ trình|giai đoạn|năm \d{4}|20\d{2}/.test(text))return"TIMELINE";if(/so sánh|vs\.?|khác nhau|ưu điểm|nhược điểm/.test(text))return"CARDS";if(/%|\b\d+[.,]?\d*\s*(?:%|triệu|tỷ|nghìn|người|đơn vị)\b/.test(text))return"IMAGE + TEXT";if(item.bullets?.length>=3)return"CARDS";return index%4===0?"TITLE + CONTENT":"IMAGE + TEXT";}
function makePlan(f){const total=Math.max(3,Math.min(50,Number(f.get("slides"))||10));const analyzed=smartAnalyzeContent(f.get("content"));const title=String(f.get("title")||"Bài thuyết trình"),author=String(f.get("author")||"Người trình bày"),org=String(f.get("organization")||"");const bodySlides=analyzed.slice(0,Math.max(1,total-2)).map((x,i)=>({title:x.title||"Nội dung",body:x.body,bullets:x.bullets||[],kind:x.kind,layout:inferSlideLayout(x,i)}));const plan=[{title,body:[author,org].filter(Boolean).join(" • ")||"Trang bìa",bullets:[],kind:"cover",layout:"COVER"}];plan.push(...bodySlides);plan.push({title:"Kết luận / Ghi nhớ",body:"Tóm tắt các ý chính và thông điệp cuối.",bullets:[],kind:"summary",layout:"SUMMARY"});while(plan.length<total){const src=bodySlides[(plan.length-1)%Math.max(1,bodySlides.length)]||{title:"Bổ sung nội dung",body:"Thêm ví dụ, số liệu hoặc hình minh họa.",bullets:[]};plan.splice(plan.length-1,0,{...src,title:src.title+" (bổ sung)",layout:inferSlideLayout(src,plan.length)});}return plan.slice(0,total).map((p,i)=>({...p,n:i+1}));}
function showPlan(plan){const status=$("#plannerStatus"),preview=$("#planPreview");if(status)status.textContent="✦ Đã tạo dàn ý "+plan.length+" slide.";if(preview)preview.innerHTML=plan.map(p=>'<article class="plan-card"><span>SLIDE '+String(p.n).padStart(2,"0")+' • '+escapeHtml(p.layout)+'</span><strong>'+escapeHtml(p.title)+'</strong><p>'+escapeHtml(p.body)+'</p></article>').join("");}
function renderSources(){const list=$("#sourceList");if(!list)return;$("#sourceCount").textContent=researchSources.length+" nguồn";if(!researchSources.length){list.innerHTML='<div class="empty">Nhập chủ đề rồi niệm phép tìm nguồn.</div>';$("#researchAttachBtn").disabled=true;return}$("#researchAttachBtn").disabled=false;list.innerHTML=researchSources.map((s,i)=>'<article class="source-card '+(researchSelected.has(s.id)?"selected":"")+'"><label class="source-check"><input type="checkbox" data-source-check="'+escapeHtml(s.id)+'" '+(researchSelected.has(s.id)?"checked":"")+'><span>['+(i+1)+']</span></label><div class="source-main"><div class="source-meta"><span>'+escapeHtml(String(s.sourceType).toUpperCase())+'</span><span>'+escapeHtml(s.domain)+'</span>'+(s.demo?'<em>DEMO</em>':"")+'</div><a href="'+escapeHtml(s.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(s.title)+'</a><p>'+escapeHtml(s.snippet)+'</p></div></article>').join("");$$("[data-source-check]").forEach(c=>c.onchange=()=>{if(c.checked)researchSelected.add(c.dataset.sourceCheck);else researchSelected.delete(c.dataset.sourceCheck);c.closest(".source-card").classList.toggle("selected",c.checked);});}
function renderProjects(){const grid=$("#projectGrid");if(!grid)return;grid.innerHTML=projects.length?projects.map(p=>`<article class="project-card"><div class="eyebrow">${new Date(p.created).toLocaleDateString("vi-VN")}</div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.author||"Chưa có người trình bày")} • ${p.slides} slide • ${escapeHtml(p.style)}</p><button class="ghost-btn" data-open-project="${escapeHtml(p.id)}">Mở dự án</button></article>`).join(""):`<div class="empty">📜 Chưa có dự án nào. Hãy niệm phép tạo bài đầu tiên!</div>`;$$("[data-open-project]").forEach(b=>b.onclick=()=>{editorProjectId=b.dataset.openProject;editorSlideIndex=0;showPage("editor");});}
function extOf(name){return (name.split(".").pop()||"").toLowerCase();}
function typeOf(name){const e=extOf(name);if(["ppt","pptx"].includes(e))return"PPTX";if(e==="pdf")return"PDF";if(["doc","docx"].includes(e))return"DOCX";return"IMAGE";}
function iconFor(type){return type==="PPTX"?"▣":type==="PDF"?"📕":type==="DOCX"?"📘":"🖼";}

async function renderTemplates(){
 const q=($("#templateSearch")?.value||"").toLowerCase(),filter=document.querySelector(".chip.active")?.dataset.filter||"all";
 const list=templates.filter(t=>(!q||String(t.name||"").toLowerCase().includes(q)||String(t.desc||"").toLowerCase().includes(q))&&(filter==="all"||t.type.toLowerCase()===filter));
 const grid=$("#templateGrid");
 grid.innerHTML=list.length?list.map(t=>`<article class="template-card" data-card="${t.id}"><div class="template-thumb" id="thumb-${t.id}">${t.icon||"📄"}<span class="thumb-loading">LOADING</span></div><div class="template-body"><strong>${escapeHtml(t.name)}</strong><small>${escapeHtml(t.type)} • ${escapeHtml(t.desc)}</small><div class="card-actions"><button class="ghost-btn" data-preview-template="${t.id}">Xem mẫu</button><button class="magic-btn mini" data-use-template="${t.id}">Dùng mẫu</button>${!t.builtin?'<button class="danger-btn mini" data-delete-template="'+t.id+'">Xóa</button>':""}</div></div></article>`).join(""):`<div class="empty">Không tìm thấy template phù hợp.</div>`;
 for(const t of list)await makeThumbnail(t);
 $$("[data-use-template]").forEach(b=>b.onclick=()=>{selectedTemplate=b.dataset.useTemplate;localStorage.setItem("kitam_selected_template",selectedTemplate);toast("✦ Đã chọn template cho bài mới.");showPage("create");});
 $$("[data-preview-template]").forEach(b=>b.onclick=()=>previewTemplate(b.dataset.previewTemplate));
 $$("[data-delete-template]").forEach(b=>b.onclick=async()=>{const id=b.dataset.deleteTemplate;const t=templates.find(x=>x.id===id);if(confirm(`Xóa template "${t?.name}" khỏi KitaM?`)){templates=templates.filter(x=>x.id!==id);await deleteFile(id);saveMeta();renderTemplates();updateStorageStatus();toast("Template đã được xóa.");}});
 updateStorageStatus();
}
async function makeThumbnail(t){
 const el=$("#thumb-"+CSS.escape(t.id));if(!el)return;
 if(t.builtin){el.classList.add("builtin-thumb");return}
 const rec=await getFile(t.id);if(!rec)return;
 try{
  if(t.type==="IMAGE"){const url=URL.createObjectURL(rec.blob);el.innerHTML=`<img src="${url}" alt="">`;return}
  if(t.type==="PDF"){el.innerHTML="";const canvas=document.createElement("canvas");canvas.className="pdf-thumb";el.append(canvas);await renderPdfPage(rec.blob,1,canvas);return}
  if(t.type==="PPTX"){el.innerHTML='<div class="pptx-render-loading">ĐANG RENDER SLIDE...</div>';const svg=await renderPptxSlideSvg(rec.blob,0);el.innerHTML=svg?'<div class="pptx-thumb-render">'+svg+'</div>':'<div class="doc-mini">⚠️<b>Không render được</b><small>File vẫn được giữ nguyên</small></div>';return}
  el.innerHTML=`<div class="doc-mini">📘<b>DOCX</b><small>File đã lưu</small></div>`;
 }catch(e){el.innerHTML=`<div class="doc-mini">⚠️<b>Không đọc được</b></div>`;}
}
async function renderPdfPage(blob,pageNo,canvas){
 if(!window.pdfjsLib){await new Promise(r=>setTimeout(r,250));}
 if(!window.pdfjsLib)throw Error("PDF.js chưa sẵn sàng");
 const pdf=await window.pdfjsLib.getDocument({data:await blob.arrayBuffer()}).promise,page=await pdf.getPage(pageNo);
 const base=page.getViewport({scale:1}),scale=Math.min(1.7,480/base.width),vp=page.getViewport({scale});
 canvas.width=vp.width;canvas.height=vp.height;await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
}
let kitamPptxEnginePromise=null;
async function getPptxEngine(){
 if(!kitamPptxEnginePromise){
  kitamPptxEnginePromise=import("https://cdn.jsdelivr.net/npm/@web-ppt/core@0.4.5/+esm").then(m=>{
   if(!m.parse||!m.renderSlideToSvg)throw new Error("PPTX renderer không đầy đủ.");
   return m;
  });
 }
 return kitamPptxEnginePromise;
}
async function renderPptxSlideSvg(blob,index=0){
 const engine=await getPptxEngine();
 const pres=await engine.parse(blob);
 const slide=pres.slides[index];
 if(!slide)return "";
 return engine.renderSlideToSvg(pres,slide);
}
async function parsePptx(blob){
 const zip=await JSZip.loadAsync(blob),names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
 const slides=[];for(const name of names){const xml=await zip.file(name).async("text"),doc=new DOMParser().parseFromString(xml,"application/xml");const texts=[...doc.getElementsByTagName("a:t")].map(x=>x.textContent.trim()).filter(Boolean);slides.push({name,texts,title:texts[0]||""});}return{slides};
}
async function previewTemplate(id){
 const t=templates.find(x=>x.id===id);if(!t)return;
 if(t.builtin){toast("✦ Đây là mẫu demo giao diện của B1.");return}
 const rec=await getFile(id);if(!rec)return;
 if(t.type==="PDF"){const pdf=await window.pdfjsLib.getDocument({data:await rec.blob.arrayBuffer()}).promise;const pages=Math.min(pdf.numPages,8);let html="";for(let i=1;i<=pages;i++)html+=`<div class="preview-page"><canvas id="modal-pdf-${i}"></canvas><span>Trang ${i}</span></div>`;showModal(`📕 ${t.name} — ${pdf.numPages} trang`,html);for(let i=1;i<=pages;i++)renderPdfPage(rec.blob,i,$("#modal-pdf-"+i));return}
 if(t.type==="PPTX"){const info=await parsePptx(rec.blob);const html='<div class="pptx-preview-list">'+info.slides.map((s,i)=>`<div class="pptx-preview-item"><div class="pptx-preview-label">SLIDE ${String(i+1).padStart(2,"0")}</div><div id="pptx-preview-${i}" class="pptx-preview-canvas"><span>ĐANG RENDER...</span></div></div>`).join("")+'</div>';showModal(`▣ ${t.name} — ${info.slides.length} slide`,html);for(let i=0;i<info.slides.length;i++){renderPptxSlideSvg(rec.blob,i).then(svg=>{const host=$(`#pptx-preview-${i}`);if(host)host.innerHTML=svg||'<span>Không render được slide này.</span>';}).catch(err=>{const host=$(`#pptx-preview-${i}`);if(host)host.innerHTML='<span>Không render được slide này.</span>';console.warn("KitaM PPTX preview:",err);});}return}
 if(t.type==="IMAGE"){showModal(`🖼 ${t.name}`,`<img class="full-image" src="${URL.createObjectURL(rec.blob)}" alt="">`);return}
 showModal(`📘 ${t.name}`,`<div class="slide-structure">DOCX đã được lưu an toàn. Phân tích nội dung DOCX sẽ được hoàn thiện ở bước B3.</div>`);
}
function showModal(title,body){document.querySelector(".modal")?.remove();const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="modal-box"><div class="modal-head"><strong>${escapeHtml(title)}</strong><button class="ghost-btn" data-close-modal>Đóng</button></div><div class="modal-body">${body}</div></div>`;document.body.append(m);m.onclick=e=>{if(e.target===m||e.target.matches("[data-close-modal]"))m.remove();};}
async function updateStorageStatus(){try{const n=await countFiles();$("#storageStatus").textContent=`${n} file thật đang được giữ trong IndexedDB của thiết bị này. File không được upload lên GitHub.`;}catch(e){$("#storageStatus").textContent="Thiết bị không hỗ trợ IndexedDB.";}}

function bind(sel,event,handler){
  const el=$(sel);
  if(!el){console.warn("KitaM: missing element",sel);return;}
  el.addEventListener(event,handler);
}
function bootKitaM(){
  $$("[data-page]").forEach(el=>el.addEventListener("click",()=>showPage(el.dataset.page)));

  bind("#templateSearch","input",renderTemplates);
  $$(".chip").forEach(c=>c.addEventListener("click",()=>{$$(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");renderTemplates();}));

  bind("#templateInput","change",async e=>{
    const files=[...e.target.files]; if(!files.length)return;
    let added=0;
    for(const f of files){
      const type=typeOf(f.name);
      if(type==="IMAGE"&&!/^image\//.test(f.type)){toast("File ảnh không hợp lệ: "+f.name);continue;}
      const id=(crypto.randomUUID?crypto.randomUUID():"kitam_"+Date.now()+"_"+Math.random().toString(36).slice(2));
      await putFile(id,f);
      templates.push({id,name:f.name.replace(/\.[^.]+$/,""),type,icon:iconFor(type),desc:`Template thật • ${Math.round(f.size/1024)} KB`,fileName:f.name,size:f.size,builtin:false});
      added++;
    }
    saveMeta(); await renderTemplates(); toast(`✦ Đã lưu ${added} template thật vào bộ nhớ máy.`); e.target.value="";
  });

  bind("#folderBtn","click",async()=>{
    if(!window.showDirectoryPicker){toast("Trình duyệt này chưa hỗ trợ chọn thư mục trực tiếp.");return;}
    try{
      const dir=await window.showDirectoryPicker({mode:"read"}); let added=0;
      for await(const [name,handle] of dir.entries()){
        if(handle.kind!=="file")continue;
        const type=typeOf(name); if(!["PPTX","PDF","DOCX","IMAGE"].includes(type))continue;
        const f=await handle.getFile();
        const id=(crypto.randomUUID?crypto.randomUUID():"kitam_"+Date.now()+"_"+Math.random().toString(36).slice(2));
        await putFile(id,f);
        templates.push({id,name:name.replace(/\.[^.]+$/,""),type,icon:iconFor(type),desc:`Từ thư mục • ${Math.round(f.size/1024)} KB`,fileName:name,size:f.size,builtin:false}); added++;
      }
      saveMeta(); await renderTemplates(); toast(`✦ Đã đọc ${added} file từ thư mục ${dir.name}.`);
    }catch(e){if(e.name!=="AbortError")toast("Không thể đọc thư mục.");}
  });

  bind("#templateSelect","change",e=>{selectedTemplate=e.target.value;localStorage.setItem("kitam_selected_template",selectedTemplate);renderCreateTemplatePreview();});

  bind("#createForm","input",e=>{
    const f=new FormData(e.currentTarget);
    const title=$("#previewTitle"),author=$("#previewAuthor");
    if(title)title.textContent=f.get("title")||"Tên bài của bạn";
    if(author)author.textContent=f.get("author")||"Người trình bày";
  });
  bind("#createForm","submit",e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget),plan=makePlan(f);
    showPlan(plan);
    const p={id:(crypto.randomUUID?crypto.randomUUID():"kitam_"+Date.now()),title:f.get("title"),author:f.get("author"),organization:f.get("organization"),slides:Number(f.get("slides")),style:f.get("style"),content:f.get("content"),research:f.get("research")==="on",imagesEnabled:f.get("images")==="on",sourcesEnabled:f.get("sources")==="on",images:[],templateId:f.get("template")||selectedTemplate,plan,sources:researchSources.filter(x=>researchSelected.has(x.id)),created:Date.now()};
    projects.unshift(p);saveMeta();renderProjects();editorProjectId=p.id;editorSlideIndex=0;const next=$("#planNextBtn");if(next)next.remove();const preview=$("#planPreview");if(preview){preview.insertAdjacentHTML("beforeend",'<button id="planNextBtn" class="magic-btn wide plan-next">✦ Bắt đầu chỉnh slide trong Editor →</button>');const btn=$("#planNextBtn");if(btn)btn.onclick=()=>showPage("editor");}toast("✨ Đã tạo dàn ý! Xem lại rồi bấm Bắt đầu chỉnh slide.");
  });

  bind("#clearBtn","click",async()=>{
    if(!confirm("Xóa toàn bộ template và dự án cục bộ của KitaM?"))return;
    localStorage.removeItem("kitam_templates");localStorage.removeItem("kitam_projects");localStorage.removeItem("kitam_selected_template");localStorage.removeItem("kitam_research_sources");localStorage.removeItem("kitam_image_results");
    templates=[...defaultTemplates];projects=[];researchSources=[];researchSelected.clear();imageResults=[];imageSelected.clear();
    await clearFiles();saveMeta();fillTemplateSelect();renderTemplates();renderProjects();renderSources();renderImages();fillEditorProjects();renderEditor();updateStorageStatus();toast("Đã xóa dữ liệu cục bộ.");
  });

  bind("#editorProjectSelect","change",e=>{editorProjectId=e.target.value;editorSlideIndex=0;renderEditor();});
  bind("#editorPrev","click",()=>{if(editorSlideIndex>0){editorSlideIndex--;renderEditor();}});
  bind("#editorNext","click",()=>{const p=getEditorProject();if(p&&editorSlideIndex<ensurePlan(p).length-1){editorSlideIndex++;renderEditor();}});
  bind("#editorSave","click",saveEditorSlide);
  bind("#editorNativeBtn","click",openNativePptEditor);
  bind("#editorNativeClose","click",closeNativePptEditor);
  bind("#editorNativeSave","click",saveNativePptEditor);

  bind("#imageSearchBtn","click",async()=>{
    const query=$("#imageQuery")?.value.trim(); if(!query){toast("Hãy nhập từ khóa ảnh.");return;}
    const limit=Number($("#imageLimit")?.value)||6,ratio=$("#imageRatio")?.value||"landscape";
    const btn=$("#imageSearchBtn"),status=$("#imageStatus"); status.textContent="✦ KitaM đang tìm ảnh...";btn.disabled=true;
    try{const result=await imageRequest(query,limit,ratio);imageResults=result.images;imageSelected=new Set(result.images.map(x=>x.id));localStorage.setItem("kitam_image_results",JSON.stringify(imageResults));renderImages();status.textContent=result.demo?"✦ DEMO IMAGE SEARCH — ảnh giả lập để kiểm thử giao diện.":"✦ Đã nhận "+result.images.length+" ảnh từ Image API.";toast(result.demo?"🧪 Đã tạo ảnh demo.":"🖼 Đã tìm ảnh.");}
    catch(err){status.textContent="⚠️ Không gọi được Image API: "+err.message;toast("Image API lỗi hoặc CORS.");}
    finally{btn.disabled=false;}
  });

  bind("#imageAttachBtn","click",()=>{
    const chosen=imageResults.filter(x=>imageSelected.has(x.id));if(!chosen.length){toast("Chọn ít nhất một ảnh.");return}
    const last=projects[0];if(!last){toast("Hãy tạo project trước, rồi quay lại gắn ảnh.");return}
    last.images=[...(last.images||[]),...chosen.filter(x=>!(last.images||[]).some(y=>y.id===x.id))];saveMeta();toast("🖼 Đã gắn ảnh vào project gần nhất.");
  });

  bind("#researchBtn","click",async()=>{
    const query=$("#researchQuery")?.value.trim();if(!query){toast("Hãy nhập chủ đề nghiên cứu trước.");return}
    const limit=Number($("#researchLimit")?.value)||8,types=$("#researchTypes")?.value||"web,news,social",btn=$("#researchBtn"),status=$("#researchStatus");
    status.textContent="✦ KitaM đang gọi Research...";btn.disabled=true;
    try{const result=await researchRequest(query,limit,types);researchQuery=query;researchSources=result.sources;researchSelected=new Set(result.sources.map(x=>x.id));localStorage.setItem("kitam_research_sources",JSON.stringify(researchSources));renderSources();status.textContent=result.demo?"✦ DEMO RESEARCH — nguồn giả lập để kiểm thử citation.":"✦ Đã nhận "+result.sources.length+" nguồn từ Research API.";toast(result.demo?"🧪 Đã tạo nguồn demo.":"🌐 Đã tìm được nguồn thật.");}
    catch(err){status.textContent="⚠️ Không gọi được Research API: "+err.message;toast("Research API lỗi hoặc chưa cho phép CORS.");}
    finally{btn.disabled=false;}
  });

  bind("#researchAttachBtn","click",()=>{
    const chosen=researchSources.filter(x=>researchSelected.has(x.id));if(!chosen.length){toast("Chọn ít nhất một nguồn.");return}
    const last=projects[0];if(!last){toast("Hãy tạo project trước, rồi quay lại gắn nguồn.");return}
    last.sources=[...(last.sources||[]),...chosen.filter(x=>!(last.sources||[]).some(y=>y.id===x.id))];saveMeta();toast("📚 Đã gắn nguồn vào project gần nhất.");
  });

  bind("#apiBaseInput","input",()=>{});
  const apiInput=$("#apiBaseInput"),apiStatus=$("#apiStatus");
  if(apiInput){apiInput.value=apiBase();}
  bind("#saveApiBtn","click",()=>{
    const apiEl=$("#apiBaseInput"); const v=apiEl ? apiEl.value.trim().replace(/\/$/,"") : "";
    if(v){try{new URL(v)}catch(e){toast("URL API không hợp lệ.");return}}
    localStorage.setItem("kitam_api_base",v);if(apiStatus)apiStatus.textContent=v?"Đã cấu hình backend: "+v:"Chưa cấu hình — đang dùng Demo Research.";toast(v?"🔮 Đã lưu Research API.":"Đã chuyển về Demo Research.");
  });

  bind("#updateBtn","click",async()=>{
    if("serviceWorker"in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update()));toast("🔄 Đã kiểm tra phiên bản mới.");}
    else toast("Trình duyệt không hỗ trợ Service Worker.");
  });

  renderTemplates();renderProjects();updateStorageStatus();
  fillTemplateSelect();
  renderCreateTemplatePreview();
}
function safeBootKitaM(){
  try{
    bootKitaM();
    const st=$("#updateStatus"); if(st) st.textContent="READY";
  }catch(e){
    console.error("KitaM boot failed",e);
    const box=$("#runtimeError"),text=$("#runtimeErrorText");
    if(box&&text){box.hidden=false;text.textContent="Boot lỗi: "+(e?.message||e);}
    const st=$("#updateStatus"); if(st) st.textContent="BOOT ERROR";
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",safeBootKitaM,{once:true});else safeBootKitaM();
if("serviceWorker"in navigator)window.addEventListener("load",async()=>{
  try{
    const reg=await navigator.serviceWorker.register("sw.js");
    const updateStatus=$("#updateStatus"); if(updateStatus) updateStatus.textContent="AUTO UPDATE";
    reg.addEventListener("updatefound",()=>toast("✨ KitaM đang nhận bản cập nhật mới..."));
  }catch(e){const st=$("#updateStatus");if(st)st.textContent="NO SW";}
});