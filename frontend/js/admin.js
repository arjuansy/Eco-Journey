(function(){
  const message=document.getElementById("adminMessage");
  const sidebar=document.querySelector(".admin-page .sidebar");
  const menuToggle=document.getElementById("adminMenuToggle");
  const menuLabel=document.getElementById("adminMenuLabel");
  if(menuToggle&&sidebar){
    menuToggle.addEventListener("click",()=>{
      const isOpen=sidebar.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded",String(isOpen));
      menuToggle.setAttribute("aria-label",isOpen?"Tutup menu navigasi":"Buka menu navigasi");
    });
    const navLinks=[...sidebar.querySelectorAll("nav a")];
    const initialActive=navLinks.find(link=>link.classList.contains("active"));
    if(initialActive&&menuLabel)menuLabel.textContent=getMenuName(initialActive);
    navLinks.forEach(link=>link.addEventListener("click",()=>{
      navLinks.forEach(item=>item.classList.toggle("active",item===link));
      if(menuLabel)menuLabel.textContent=getMenuName(link);
      sidebar.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded","false");
      menuToggle.setAttribute("aria-label","Buka menu navigasi");
    }));
  }

  function showError(error){
    message.textContent=error.message;
    message.style.color="var(--color-danger)";
  }

  async function load(){
    try{
      const payments=await API.request("/admin/payments");
      message.textContent="";
      document.getElementById("adminStats").hidden=false;
      document.getElementById("payments").hidden=false;
      document.getElementById("adminStats").innerHTML=`<div class="card"><span class="badge">Transaksi</span><h2>${payments.length}</h2></div><div class="card"><span class="badge">Menunggu</span><h2>${payments.filter(payment=>payment.payment_status==="PENDING").length}</h2></div><div class="card"><span class="badge">Terverifikasi</span><h2>${payments.filter(payment=>payment.payment_status==="SUCCESS").length}</h2></div>`;
      document.getElementById("pendingCount").textContent=`${payments.filter(payment=>payment.payment_status==="PENDING").length} menunggu`;
      const table=document.getElementById("paymentTable");
      table.innerHTML=payments.length?payments.map(payment=>`<tr><td>${escapeHtml(payment.booking_code)}</td><td>${escapeHtml(payment.passenger_name)}</td><td>${escapeHtml(payment.payment_method)}</td><td><span class="badge">${escapeHtml(payment.payment_status)}</span></td><td><button class="btn" data-preview="${payment.id}" style="padding:7px 12px;border:1px solid var(--color-border)">Lihat</button></td><td>${payment.payment_status==="PENDING"?`<button class="btn btn-primary" data-action="approve" data-id="${payment.id}" style="padding:7px 12px">Terima</button> <button class="btn" data-action="reject" data-id="${payment.id}" style="padding:7px 12px;border:1px solid var(--color-danger);color:var(--color-danger)">Tolak</button>`:"—"}</td></tr>`).join(""):'<tr><td colspan="6">Belum ada pembayaran.</td></tr>';
      table.querySelectorAll("[data-preview]").forEach((button,index)=>button.addEventListener("click",()=>{
        const proof=payments[index].proof_image_url;
        const preview=document.getElementById("proofPreview");
        preview.replaceChildren();
        if(proof){
          const image=document.createElement("img");
          image.src=proof;
          image.alt="Bukti pembayaran";
          image.style.cssText="max-width:min(100%,560px);max-height:70vh;object-fit:contain";
          preview.appendChild(image);
        }else preview.textContent="Bukti pembayaran tidak tersedia.";
        document.getElementById("proofModal").showModal();
      }));
      table.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",async()=>{
        const approve=button.dataset.action==="approve";
        const notes=approve?"":prompt("Alasan penolakan:","Bukti pembayaran tidak terbaca");
        if(!approve&&notes===null)return;
        button.disabled=true;
        try{
          await API.request(`/admin/payments/${button.dataset.id}/validate`,{method:"PATCH",body:JSON.stringify({is_success:approve,notes})});
          await load();
        }catch(error){showError(error);button.disabled=false}
      }));
    }catch(error){
      showError(error);
      if(error.message.toLowerCase().includes("masuk")||error.message.toLowerCase().includes("admin")){
        const link=document.createElement("a");
        link.className="btn btn-primary";
        link.href="auth.html";
        link.textContent="Masuk sebagai Admin";
        message.append(" ",link);
      }
    }
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function getMenuName(link){
    const copy=link.cloneNode(true);
    copy.querySelectorAll("[aria-hidden='true']").forEach(icon=>icon.remove());
    return copy.textContent.trim();
  }

  load();
})();
