(async function(){
  const carousel=document.getElementById("routeCarousel");
  let routes=[];
  let vehicles=[];
  let activeCatalog="routes";
  let activeCity="Semua";
  let searchTerm="";
  let routesError="";
  let vehiclesError="";
  const heroSlides=[
    {src:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=88",alt:"Pemandangan alam hijau di sepanjang perjalanan",caption:"Pagi tenang di antara perbukitan"},
    {src:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=88",alt:"Danau di tengah pemandangan pegunungan",caption:"Berhenti sejenak, nikmati pemandangan"},
    {src:"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=88",alt:"Jalan berkelok menuju destinasi alam",caption:"Jalan kecil menuju cerita besar"},
    {src:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88",alt:"Lanskap perbukitan hijau",caption:"Jelajah alam dengan cara yang nyaman"}
  ];
  const format=value=>"Rp "+Number(value).toLocaleString("id-ID");
  const [routeResult,vehicleResult]=await Promise.allSettled([API.request("/routes"),API.request("/vehicles")]);
  if(routeResult.status==="fulfilled")routes=routeResult.value;
  else routesError=routeResult.reason.message;
  if(vehicleResult.status==="fulfilled")vehicles=vehicleResult.value;
  else vehiclesError=vehicleResult.reason.message;
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function renderCards(){
    if(activeCatalog==="vehicles"){
      if(!vehicles.length){carousel.innerHTML=`<p class="empty-routes">${escapeHtml(vehiclesError||"Belum ada armada yang tersedia.")}</p>`;return}
      carousel.innerHTML=vehicles.map(vehicle=>`<article class="route-card"><img src="${escapeHtml(vehicle.image_url)}" alt="${escapeHtml(vehicle.vehicle_name)}"><div class="route-card-body"><h3>${escapeHtml(vehicle.vehicle_name)}</h3><div class="route-meta"><span>${vehicle.total_seats} kursi</span><span class="badge">${escapeHtml(vehicle.vehicle_type)}</span></div><a class="btn btn-primary" style="width:100%;padding:9px" href="booking.html?vehicle_id=${encodeURIComponent(vehicle.id)}">Pilih Armada</a></div></article>`).join("");
      return;
    }
    if(!routes.length){carousel.innerHTML=`<p class="empty-routes">${escapeHtml(routesError||"Belum ada jadwal perjalanan mendatang.")}</p>`;return}
    const filtered=routes.filter(route=>{
      const cities=`${route.origin_city} ${route.destination_city}`.toLowerCase();
      const matchesCity=activeCity==="Semua"||route.origin_city===activeCity||route.destination_city===activeCity;
      return matchesCity&&cities.includes(searchTerm);
    });
    carousel.innerHTML=filtered.length?filtered.map(route=>`<article class="route-card"><img src="${escapeHtml(route.image_url)}" alt="${escapeHtml(route.origin_city)} ke ${escapeHtml(route.destination_city)}"><div class="route-card-body"><h3>${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}</h3><div class="route-meta"><span>${format(route.base_price)}</span><span class="badge">Jadwal tersedia</span></div><a class="btn btn-primary" style="width:100%;padding:9px" href="booking.html?schedule_id=${encodeURIComponent(route.id)}">Pilih Rute</a></div></article>`).join(""):'<p class="empty-routes">Tidak ada jadwal yang cocok. Coba kata pencarian atau kota lain.</p>';
  }
  function setSlide(index){
    const current=(index+heroSlides.length)%heroSlides.length;
    const slide=heroSlides[current];
    document.getElementById("heroImage").src=slide.src;
    document.getElementById("heroImage").alt=slide.alt;
    document.getElementById("heroCaption").textContent=slide.caption;
    document.getElementById("slideNumber").textContent=String(current+1).padStart(2,"0");
    document.querySelectorAll("#heroDots button").forEach((dot,i)=>dot.classList.toggle("active",i===current));
    document.querySelectorAll("#heroDots button").forEach((dot,i)=>dot.setAttribute("aria-pressed",String(i===current)));
    window.activeHeroSlide=current;
  }
  const dots=document.getElementById("heroDots");
  dots.innerHTML=heroSlides.map((slide,index)=>`<button type="button" aria-label="Tampilkan foto ${index+1}" aria-pressed="${index===0}" class="${index===0?"active":""}"></button>`).join("");
  dots.querySelectorAll("button").forEach((dot,index)=>dot.addEventListener("click",()=>setSlide(index)));
  document.getElementById("heroPrev").addEventListener("click",()=>setSlide((window.activeHeroSlide||0)-1));
  document.getElementById("heroNext").addEventListener("click",()=>setSlide((window.activeHeroSlide||0)+1));
  setSlide(0);
  renderCards();
  document.querySelectorAll(".chip[data-city]").forEach(chip=>chip.addEventListener("click",()=>{
    document.querySelectorAll(".chip[data-city]").forEach(item=>item.classList.remove("active"));
    chip.classList.add("active");
    activeCity=chip.dataset.city;
    searchTerm="";
    document.querySelector("#quickSearch input").value="";
    renderCards();
  }));
  document.querySelectorAll(".segmented button").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll(".segmented button").forEach(item=>item.classList.remove("active"));
    button.classList.add("active");
    activeCatalog=button.dataset.catalog;
    renderCards();
  }));
  document.getElementById("routePrev").addEventListener("click",()=>carousel.scrollBy({left:-carousel.clientWidth*.8,behavior:"smooth"}));
  document.getElementById("routeNext").addEventListener("click",()=>carousel.scrollBy({left:carousel.clientWidth*.8,behavior:"smooth"}));
  document.getElementById("quickSearch").addEventListener("submit",event=>{
    event.preventDefault();
    const input=event.currentTarget.querySelector("input");
    searchTerm=input.value.trim().toLowerCase();
    activeCity="Semua";
    document.querySelectorAll(".chip[data-city]").forEach(chip=>chip.classList.toggle("active",chip.dataset.city==="Semua"));
    renderCards();
    document.getElementById("rute").scrollIntoView({behavior:"smooth"});
  });
  const menuToggle=document.getElementById("menuToggle");
  const navMenu=document.getElementById("primaryNav");
  menuToggle.addEventListener("click",()=>{
    const isOpen=navMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded",String(isOpen));
    menuToggle.setAttribute("aria-label",isOpen?"Tutup navigasi":"Buka navigasi");
  });
  navMenu.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded","false");
  }));
})();
