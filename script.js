const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const defaultTemplates = [
  {id:"starter-cyan", name:"Astral Cyan", type:"PPTX", icon:"✦", desc:"Mẫu thử nghiệm phong cách ma thuật xanh."},
  {id:"starter-green", name:"Witch Garden", type:"PDF", icon:"☘", desc:"Mẫu thử nghiệm xanh lá neon."},
  {id:"starter-fire", name:"Arcane Fire", type:"IMAGE", icon:"🔥", desc:"Mẫu hình ảnh lấy cảm hứng từ lò luyện phép."}
];

let templates = JSON.parse(localStorage.getItem("kitam_templates") || "null") || defaultTemplates;
let projects = JSON.parse(localStorage.getItem("kitam_projects") || "[]");

function save() {
  localStorage.setItem("kitam_templates", JSON.stringify(templates));
  localStorage.setItem("kitam_projects", JSON.stringify(projects));
}

function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2600);
}

function showPage(id){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===id));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="templates") renderTemplates();
  if(id==="projects") renderProjects();
}
$$("[data-page]").forEach(el=>el.addEventListener("click",()=>showPage(el.dataset.page)));

function renderTemplates(){
  const q=$("#templateSearch").value.toLowerCase();
  const filter=document.querySelector(".chip.active")?.dataset.filter || "all";
  const list=templates.filter(t=>
    (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)) &&
    (filter==="all" || t.type.toLowerCase()===filter)
  );
  const grid=$("#templateGrid");
  grid.innerHTML=list.length ? list.map(t=>`
    <article class="template-card">
      <div class="template-thumb">${t.icon || "📄"}</div>
      <div class="template-body">
        <strong>${escapeHtml(t.name)}</strong>
        <small>${escapeHtml(t.type)} • ${escapeHtml(t.desc)}</small>
        <button class="ghost-btn" data-use-template="${t.id}">Chọn mẫu</button>
      </div>
    </article>`).join("") : `<div class="empty">Không tìm thấy template phù hợp.</div>`;
  $$("[data-use-template]").forEach(b=>b.addEventListener("click",()=>{
    toast("✦ Đã chọn template. KitaM sẽ dùng nó ở bước tạo slide.");
    showPage("create");
  }));
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
$("#templateSearch").addEventListener("input",renderTemplates);
$$(".chip").forEach(c=>c.addEventListener("click",()=>{
  $$(".chip").forEach(x=>x.classList.remove("active")); c.classList.add("active"); renderTemplates();
}));

$("#templateInput").addEventListener("change", async e=>{
  const files=[...e.target.files];
  for(const f of files){
    const ext=f.name.split(".").pop().toUpperCase();
    let type=["PPT","PPTX"].includes(ext)?"PPTX":["PDF"].includes(ext)?"PDF":["DOC","DOCX"].includes(ext)?"DOCX":"IMAGE";
    templates.push({
      id:crypto.randomUUID(), name:f.name.replace(/\.[^.]+$/,""), type,
      icon:type==="PPTX"?"▣":type==="PDF"?"📕":type==="DOCX"?"📘":"🖼",
      desc:`Template cục bộ • ${Math.round(f.size/1024)} KB`
    });
  }
  save(); renderTemplates(); toast(`✦ Đã thêm ${files.length} template vào kho cục bộ.`);
  e.target.value="";
});

$("#folderBtn").addEventListener("click",async()=>{
  if(!window.showDirectoryPicker){
    toast("Trình duyệt này chưa hỗ trợ chọn thư mục trực tiếp. Hãy dùng nút Tải template.");
    return;
  }
  try{
    const dir=await window.showDirectoryPicker({mode:"read"});
    toast(`✦ Đã cấp quyền đọc thư mục: ${dir.name}`);
  }catch(e){ toast("Đã hủy chọn thư mục."); }
});

function renderProjects(){
  const grid=$("#projectGrid");
  grid.innerHTML=projects.length ? projects.map(p=>`
    <article class="project-card">
      <div class="eyebrow">${new Date(p.created).toLocaleDateString("vi-VN")}</div>
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.author || "Chưa có người trình bày")} • ${p.slides} slide • ${escapeHtml(p.style)}</p>
      <button class="ghost-btn" data-open-project="${p.id}">Mở dự án</button>
    </article>`).join("") : `<div class="empty">📜 Chưa có dự án nào. Hãy niệm phép tạo bài đầu tiên!</div>`;
  $$("[data-open-project]").forEach(b=>b.addEventListener("click",()=>toast("✦ Editor đầy đủ sẽ được mở ở phiên bản B3.")));
}

$("#createForm").addEventListener("input",e=>{
  const f=new FormData($("#createForm"));
  $("#previewTitle").textContent=f.get("title") || "Tên bài của bạn";
  $("#previewAuthor").textContent=f.get("author") || "Người trình bày";
});
$("#createForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const p={
    id:crypto.randomUUID(), title:f.get("title"), author:f.get("author"),
    organization:f.get("organization"), slides:Number(f.get("slides")), style:f.get("style"),
    content:f.get("content"), research:f.get("research")==="on",
    images:f.get("images")==="on", sources:f.get("sources")==="on", created:Date.now()
  };
  projects.unshift(p); save(); renderProjects(); toast("✨ Cấu trúc dự án đã được lưu cục bộ!");
  showPage("projects");
});

$("#clearBtn").addEventListener("click",()=>{
  if(confirm("Xóa toàn bộ template và dự án cục bộ của KitaM?")){
    localStorage.removeItem("kitam_templates"); localStorage.removeItem("kitam_projects");
    templates=[...defaultTemplates]; projects=[]; save(); renderTemplates(); renderProjects();
    toast("Đã xóa dữ liệu cục bộ.");
  }
});
$("#updateBtn").addEventListener("click",async()=>{
  if("serviceWorker" in navigator){
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r=>r.update()));
    toast("🔄 Đã kiểm tra phiên bản mới.");
  } else toast("Trình duyệt không hỗ trợ Service Worker.");
});

if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    try{
      const reg=await navigator.serviceWorker.register("sw.js");
      $("#updateStatus").textContent="AUTO UPDATE";
      reg.addEventListener("updatefound",()=>toast("✨ KitaM đang nhận bản cập nhật mới..."));
    }catch(e){$("#updateStatus").textContent="NO SW";}
  });
}

renderTemplates(); renderProjects();
