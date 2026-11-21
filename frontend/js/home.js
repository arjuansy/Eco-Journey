(async function(){
  const carousel=document.getElementById("routeCarousel");
  let routes=[];
  let vehicles=[];
  let activeCatalog="routes";
  let activeCity="Semua";
  const fallbackRoutes=[
    {origin_city:"Malang",destination_city:"Surabaya",base_price:85000,image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80"},
    {origin_city:"Malang",destination_city:"Batu",base_price:65000,image:"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=700&q=80"},
    {origin_city:"Surabaya",destination_city:"Yogyakarta",base_price:220000,image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=80"},
    {origin_city:"Banyuwangi",destination_city:"Malang",base_price:180000,image:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80"}
  ];
  const fallbackVehicles=[
    {vehicle_name:"Executive HiAce",vehicle_type:"Executive Van",total_seats:12,amenities:["AC","USB Charger"],image_url:"https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80"},
    {vehicle_name:"Luxury Minivan",vehicle_type:"Luxury Van",total_seats:8,amenities:["Wi-Fi","Reclining Seat"],image_url:"https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=700&q=80"},
    {vehicle_name:"Eco Shuttle",vehicle_type:"Shuttle",total_seats:20,amenities:["AC","Bagasi Luas"],image_url:"https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=700&q=80"}
  ];
  const heroSlides=[
    {src:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=88",alt:"Pemandangan alam hijau di sepanjang perjalanan",caption:"Pagi tenang di antara perbukitan"},
    {src:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=88",alt:"Danau di tengah pemandangan pegunungan",caption:"Berhenti sejenak, nikmati pemandangan"},
    {src:"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=88",alt:"Jalan berkelok menuju destinasi alam",caption:"Jalan kecil menuju cerita besar"},
    {src:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=88",alt:"Lanskap perbukitan hijau",caption:"Jelajah alam dengan cara yang nyaman"}
  ];
  const format=value=>"Rp "+Number(value).toLocaleString("id-ID");
  try{
    const result=await Promise.all([API.request("/routes"),API.request("/vehicles")]);
    routes=result[0];
    vehicles=result[1];
  }catch(error){
    routes=[];
    vehicles=[];
  }
  function renderCards(){
    if(activeCatalog==="vehicles"){
      const items=vehicles.length?vehicles:fallbackVehicles;
      carousel.innerHTML=items.map(vehicle=>`<article class="route-card"><img src="${vehicle.image_url}" alt="${vehicle.vehicle_name}"><div class="route-card-body"><h3>${vehicle.vehicle_name}</h3><div class="route-meta"><span>${vehicle.total_seats} kursi</span><span class="badge">${vehicle.vehicle_type}</span></div><a class="btn btn-primary" style="width:100%;padding:9px" href="booking.html">Pilih Armada</a></div></article>`).join("");
      return;
    }
    const items=routes.length?routes:fallbackRoutes;
    const filtered=activeCity==="Semua"?items:items.filter(route=>route.origin_city===activeCity||route.destination_city===activeCity);
    carousel.innerHTML=filtered.length?filtered.map(route=>`<article class="route-card"><img src="${route.image_url||route.image||fallbackRoutes[0].image}" alt="${route.origin_city} ke ${route.destination_city}"><div class="route-card-body"><h3>${route.origin_city} → ${route.destination_city}</h3><div class="route-meta"><span>${format(route.base_price)}</span><span class="badge">Kuota tersedia</span></div><a class="btn btn-primary" style="width:100%;padding:9px" href="booking.html">Pilih Rute</a></div></article>`).join(""):'<p class="empty-routes">Belum ada jadwal untuk kota ini. Coba pilih kota lain.</p>';
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
    const match=[...document.querySelectorAll(".chip[data-city]")].find(chip=>chip.dataset.city.toLowerCase()===input.value.trim().toLowerCase());
    if(match){match.click()}
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
