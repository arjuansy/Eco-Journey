(function(){
  const state={step:1,route:null,vehicle:null,driver:null,seat:null,booking:null,payment:null,statusTimer:null};
  const format=value=>"Rp "+Number(value).toLocaleString("id-ID");
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  let routes=[],vehicles=[],drivers=[];

  async function loadCatalog(){
    const results=await Promise.all([API.request("/routes"),API.request("/vehicles"),API.request("/drivers")]);
    routes=results[0];
    vehicles=results[1];
    drivers=results[2];
  }

  function renderRoutes(){
    const list=document.getElementById("routeList");
    if(!list)return;
    const query=(document.getElementById("routeFilter")?.value||"").toLowerCase();
    const filtered=routes.filter(route=>`${route.origin_city} ${route.destination_city}`.toLowerCase().includes(query));
    if(!filtered.length){list.innerHTML='<p class="card">Rute belum tersedia. Periksa kembali koneksi Supabase atau kata pencarian.</p>';return}
    list.innerHTML=filtered.map(route=>`<button class="route-option ${state.route?.id===route.id?"selected":""}" data-route="${route.id}" style="text-align:left;width:100%"><strong>${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}</strong><div style="display:flex;justify-content:space-between;color:var(--color-text-muted);font-size:13px"><span>${escapeHtml(route.departure_date)} · ${escapeHtml(route.departure_time)}–${escapeHtml(route.arrival_time)}</span><b style="color:var(--color-primary)">${format(route.base_price)}</b></div></button>`).join("");
    list.querySelectorAll("[data-route]").forEach(button=>button.addEventListener("click",()=>{
      state.route=routes.find(route=>String(route.id)===button.dataset.route);
      renderRoutes();
      renderSeats();
      renderSummary();
    }));
  }

  function renderVehicles(){
    const list=document.getElementById("vehicleList");
    if(!list)return;
    if(!vehicles.length){list.innerHTML='<p class="card">Armada belum tersedia di database.</p>';return}
    list.innerHTML=vehicles.map(vehicle=>`<article class="vehicle-card ${state.vehicle?.id===vehicle.id?"selected":""}" data-vehicle="${vehicle.id}"><img src="${escapeHtml(vehicle.image_url)}" alt="${escapeHtml(vehicle.vehicle_name)}"><div><h3>${escapeHtml(vehicle.vehicle_name)}</h3><p>${escapeHtml(vehicle.vehicle_type)} • ${vehicle.total_seats} kursi</p><div class="facility-list">${(vehicle.amenities||[]).map(item=>`<span>${escapeHtml(item)}</span>`).join("")}</div></div></article>`).join("");
    list.querySelectorAll("[data-vehicle]").forEach(card=>card.addEventListener("click",()=>{
      state.vehicle=vehicles.find(vehicle=>String(vehicle.id)===card.dataset.vehicle);
      renderVehicles();
      renderSeats();
      renderSummary();
    }));
  }

  function renderDrivers(){
    const list=document.getElementById("driverList");
    if(!list)return;
    if(!drivers.length){list.innerHTML='<p class="card">Driver belum tersedia di database.</p>';return}
    list.innerHTML=drivers.map(driver=>`<article class="driver-card ${driver.remaining_trip_quota===0?"disabled":""} ${state.driver?.id===driver.id?"selected":""}" data-driver="${driver.id}"><img src="${escapeHtml(driver.photo_url)}" alt="${escapeHtml(driver.driver_name)}"><div><h3>${escapeHtml(driver.driver_name)}</h3><p>⭐ ${driver.rating} • Driver pilihan</p><span class="badge">${driver.remaining_trip_quota>0?`Sisa Kuota: ${driver.remaining_trip_quota} Trip Hari Ini`:"Kuota Habis"}</span></div></article>`).join("");
    list.querySelectorAll("[data-driver]").forEach(card=>card.addEventListener("click",()=>{
      const driver=drivers.find(item=>String(item.id)===card.dataset.driver);
      if(driver.remaining_trip_quota>0){state.driver=driver;renderDrivers();renderSummary()}
    }));
  }

  async function renderSeats(){
    const grid=document.getElementById("seatGrid");
    if(!grid)return;
    const total=state.vehicle?.total_seats||0;
    if(!state.route||!state.vehicle){grid.innerHTML='<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">Pilih rute dan armada untuk melihat kursi.</p>';return}
    grid.innerHTML='<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">Memuat ketersediaan kursi…</p>';
    try{
      const result=await API.request(`/seats?schedule_id=${encodeURIComponent(state.route.id)}&vehicle_id=${encodeURIComponent(state.vehicle.id)}`);
      const booked=new Set(result.booked.map(String));
      grid.innerHTML='<div class="seat-driver" aria-label="Posisi driver">▣</div>';
      for(let number=1;number<=total;number++){
        const seatNumber=String(number);
        const isBooked=booked.has(seatNumber);
        const button=document.createElement("button");
        button.type="button";
        button.className=`seat ${isBooked?"booked":""} ${state.seat===seatNumber?"selected":""}`;
        button.textContent=seatNumber;
        button.disabled=isBooked;
        button.setAttribute("aria-label",`Kursi ${seatNumber}${isBooked?", sudah terisi":", tersedia"}`);
        button.addEventListener("click",()=>{state.seat=seatNumber;renderSeats();renderSummary()});
        grid.appendChild(button);
      }
    }catch(error){
      grid.innerHTML=`<p style="grid-column:1/-1;text-align:center;color:var(--color-danger)">${escapeHtml(error.message)}</p>`;
    }
  }

  function renderSummary(){
    const summary=document.getElementById("bookingSummary");
    if(!summary)return;
    const route=state.route,vehicle=state.vehicle,driver=state.driver;
    const amount=(Number(route?.base_price)||0)+(Number(vehicle?.price_modifier)||0);
    summary.innerHTML=`<div><span>Rute</span><strong>${route?`${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}`:"Pilih rute"}</strong></div><div><span>Armada</span><strong>${escapeHtml(vehicle?.vehicle_name||"Pilih armada")}</strong></div><div><span>Driver</span><strong>${escapeHtml(driver?.driver_name||"Pilih driver")}</strong></div><div><span>Kursi</span><strong>${escapeHtml(state.seat||"Pilih kursi")}</strong></div>`;
    document.getElementById("paymentTotal").textContent=format(amount);
  }

  function showStep(step){
    state.step=step;
    document.querySelectorAll(".booking-step").forEach(section=>section.classList.toggle("active",Number(section.dataset.step)===step));
    document.querySelectorAll(".step").forEach((item,index)=>{
      item.classList.toggle("active",index===step-1);
      item.classList.toggle("done",index<step-1);
    });
    const previous=document.getElementById("prevStep");
    const next=document.getElementById("nextStep");
    if(previous)previous.style.visibility=step===1?"hidden":"visible";
    if(next)next.textContent=step===5?"Kirim Pembayaran":step===6?(state.booking?.booking_status==="CONFIRMED"?"Cetak E-Ticket":"Periksa Status"):"Lanjutkan";
  }

  function validateStep(){
    if(state.step===1&&!state.route)return"Silakan pilih rute.";
    if(state.step===2&&!state.vehicle)return"Silakan pilih armada.";
    if(state.step===3&&!state.driver)return"Silakan pilih driver dengan kuota tersedia.";
    if(state.step===4){
      const form=document.getElementById("passengerForm");
      if(!form.reportValidity())return false;
      if(!state.seat)return"Silakan pilih kursi.";
    }
    if(state.step===5&&!document.getElementById("proofFile").files.length)return"Unggah bukti pembayaran terlebih dahulu.";
    return true;
  }

  function renderTicket(ticket,booking){
    const area=document.getElementById("ticketArea");
    if(!area)return;
    const route=booking.routes_schedules||{};
    const vehicle=booking.vehicles||{};
    const driver=booking.drivers||{};
    area.innerHTML=`<article class="ticket"><div class="ticket-main"><span class="badge">LUNAS / TERVALIDASI</span><h2 style="font:800 28px var(--font-heading);margin:10px 0">${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}</h2><div class="summary-list"><div><span>Kode Booking</span><strong>${escapeHtml(booking.booking_code)}</strong></div><div><span>Tanggal &amp; Jam</span><strong>${escapeHtml(route.departure_date)} · ${escapeHtml(route.departure_time)}</strong></div><div><span>Armada</span><strong>${escapeHtml(vehicle.vehicle_name)}</strong></div><div><span>Driver</span><strong>${escapeHtml(driver.driver_name)}</strong></div><div><span>Nomor Kursi</span><strong>${escapeHtml(booking.seat_number)}</strong></div><div><span>Penumpang</span><strong>${escapeHtml(booking.passenger_name)}</strong></div><div><span>Total</span><strong>${format(booking.total_amount)}</strong></div></div></div><aside class="ticket-side"><strong>${escapeHtml(ticket.ticket_number)}</strong><div class="qr" aria-label="Kode QR tiket">▦</div><p>Eco-Journey Ticket</p></aside></article>`;
  }

  async function createBooking(){
    const passenger=new FormData(document.getElementById("passengerForm"));
    const result=await API.request("/bookings",{method:"POST",body:JSON.stringify({
      schedule_id:state.route.id,
      vehicle_id:state.vehicle.id,
      driver_id:state.driver.id,
      passenger_name:passenger.get("name"),
      passenger_identity_number:passenger.get("identity"),
      passenger_phone:passenger.get("phone"),
      seat_number:state.seat,
      total_amount:Number(state.route.base_price)+Number(state.vehicle.price_modifier||0)
    })});
    state.booking=result.booking;
  }

  async function submitPayment(){
    if(!localStorage.getItem("eco_token"))throw new Error("Silakan masuk terlebih dahulu untuk melanjutkan pemesanan.");
    if(!state.booking)await createBooking();
    const file=document.getElementById("proofFile").files[0];
    const paymentMethod=document.querySelector('input[name="payment"]:checked')?.value;
    const formData=new FormData();
    formData.append("booking_id",String(state.booking.id));
    formData.append("payment_method",paymentMethod||"Transfer Bank");
    formData.append("proof",file);
    const result=await API.request("/payments",{method:"POST",body:formData});
    state.payment=result.payment;
    state.booking.booking_status="WAITING_VALIDATION";
    const status=document.getElementById("paymentStatus");
    status.innerHTML="<strong>Menunggu validasi admin</strong><br><span>Pembayaran telah dikirim dan sedang diperiksa.</span>";
    showStep(6);
    checkBookingStatus();
  }

  async function checkBookingStatus(){
    if(!state.booking)return;
    try{
      const booking=await API.request(`/bookings/${encodeURIComponent(state.booking.id)}`);
      state.booking=booking;
      if(booking.booking_status==="CONFIRMED"){
        const ticket=await API.request(`/bookings/${encodeURIComponent(booking.id)}/eticket`);
        renderTicket(ticket,booking);
        document.getElementById("paymentStatus").innerHTML="<strong>Pembayaran tervalidasi</strong><br><span>E-Ticket sudah terbit. Anda dapat mencetak atau menyimpannya.</span>";
        showStep(6);
        return;
      }
      if(booking.booking_status==="PAYMENT_FAILED"){
        const latestPayment=booking.payments?.[0];
        const status=document.getElementById("paymentStatus");
        status.innerHTML=`<strong>Pembayaran ditolak</strong><br><span>${escapeHtml(latestPayment?.admin_notes||"Silakan periksa bukti dan kirim ulang pembayaran.")}</span>`;
        showStep(5);
        return;
      }
      if(state.step===6){
        window.clearTimeout(state.statusTimer);
        state.statusTimer=window.setTimeout(checkBookingStatus,7000);
      }
    }catch(error){
      document.getElementById("paymentStatus").textContent=error.message;
    }
  }

  async function next(){
    const validation=validateStep();
    if(validation!==true&&validation!==undefined){if(validation)alert(validation);return}
    if(state.step===5){
      const button=document.getElementById("nextStep");
      button.disabled=true;
      try{await submitPayment()}catch(error){alert(error.message)}
      finally{button.disabled=false}
      return;
    }
    if(state.step===6){
      if(state.booking?.booking_status==="CONFIRMED")window.print();
      else await checkBookingStatus();
      return;
    }
    showStep(state.step+1);
  }

  async function loadStandaloneTicket(){
    const area=document.getElementById("ticketArea");
    const bookingId=new URLSearchParams(location.search).get("booking_id");
    if(!bookingId){area.textContent="Kode pemesanan tidak ditemukan.";return}
    area.textContent="Memuat E-Ticket…";
    try{
      const [ticket,booking]=await Promise.all([API.request(`/bookings/${encodeURIComponent(bookingId)}/eticket`),API.request(`/bookings/${encodeURIComponent(bookingId)}`)]);
      renderTicket(ticket,booking);
    }catch(error){area.textContent=error.message}
  }

  async function initializeBooking(){
    try{
      await loadCatalog();
      renderRoutes();
      renderVehicles();
      renderDrivers();
      renderSeats();
      renderSummary();
    }catch(error){
      document.getElementById("routeList").innerHTML=`<p class="card" style="color:var(--color-danger)">${escapeHtml(error.message)}</p>`;
      document.getElementById("vehicleList").innerHTML="";
      document.getElementById("driverList").innerHTML="";
    }
    document.getElementById("routeFilter")?.addEventListener("input",renderRoutes);
    document.getElementById("nextStep").addEventListener("click",next);
    document.getElementById("prevStep").addEventListener("click",()=>showStep(Math.max(1,state.step-1)));
    document.querySelectorAll(".payment-option").forEach(option=>option.addEventListener("click",()=>{
      document.querySelectorAll(".payment-option").forEach(item=>item.classList.remove("selected"));
      option.classList.add("selected");
      option.querySelector("input").checked=true;
    }));
    showStep(1);
  }

  if(document.body.classList.contains("booking-page"))initializeBooking();
  else if(document.getElementById("ticketArea"))loadStandaloneTicket();
})();
