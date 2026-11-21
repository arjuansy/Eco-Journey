(function(){
  const state={step:1,route:null,vehicle:null,driver:null,seat:null,booking:null,payment:null,statusTimer:null};
  const draftKey="eco_booking_selection";
  const maxProofSize=4*1024*1024;
  const format=value=>"Rp "+Number(value).toLocaleString("id-ID");
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const todayJakarta=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  let routes=[],vehicles=[],drivers=[];
  let seatRequestId=0;

  async function loadCatalog(){
    const results=await Promise.all([API.request("/routes"),API.request("/vehicles"),API.request("/drivers")]);
    routes=results[0];
    vehicles=results[1];
    drivers=results[2];
  }

  function showMessage(message){
    const element=document.getElementById("bookingMessage");
    if(!element)return;
    element.textContent=message;
    element.hidden=!message;
  }

  function saveDraft(){
    sessionStorage.setItem(draftKey,JSON.stringify({
      routeId:state.route?.id,
      vehicleId:state.vehicle?.id,
      driverId:state.driver?.id,
      seat:state.seat,
      date:document.getElementById("departureDate")?.value
    }));
  }

  function restoreDraft(){
    const raw=sessionStorage.getItem(draftKey);
    if(!raw)return false;
    let draft;
    try{
      draft=JSON.parse(raw);
    }catch{
      sessionStorage.removeItem(draftKey);
      return false;
    }
    state.route=routes.find(route=>String(route.id)===String(draft.routeId))||null;
    state.vehicle=vehicles.find(vehicle=>String(vehicle.id)===String(draft.vehicleId))||null;
    state.driver=drivers.find(driver=>String(driver.id)===String(draft.driverId))||null;
    state.seat=draft.seat?String(draft.seat):null;
    if(draft.date&&draft.date>=todayJakarta())document.getElementById("departureDate").value=draft.date;
    return Boolean(state.route||state.vehicle||state.driver);
  }

  function requestLogin(){
    saveDraft();
    location.href=`auth.html?next=${encodeURIComponent("booking.html?resume=1")}`;
  }

  function renderRoutes(){
    const list=document.getElementById("routeList");
    if(!list)return;
    const query=(document.getElementById("routeFilter")?.value||"").toLowerCase();
    const date=document.getElementById("departureDate").value;
    const filtered=routes.filter(route=>route.departure_date===date&&`${route.origin_city} ${route.destination_city}`.toLowerCase().includes(query));
    if(!filtered.length){list.innerHTML='<p class="card">Tidak ada jadwal mendatang pada tanggal dan pencarian ini. Pilih tanggal lain atau ubah kata pencarian.</p>';return}
    list.innerHTML=filtered.map(route=>`<button class="route-option ${state.route?.id===route.id?"selected":""}" data-route="${route.id}" style="text-align:left;width:100%"><strong>${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}</strong><div style="display:flex;justify-content:space-between;color:var(--color-text-muted);font-size:13px"><span>${escapeHtml(route.departure_date)} · ${escapeHtml(route.departure_time)}–${escapeHtml(route.arrival_time)}</span><b style="color:var(--color-primary)">${format(route.base_price)}</b></div></button>`).join("");
    list.querySelectorAll("[data-route]").forEach(button=>button.addEventListener("click",()=>{
      state.route=routes.find(route=>String(route.id)===button.dataset.route);
      state.seat=null;
      state.booking=null;
      saveDraft();
      renderRoutes();
      renderSeats();
      renderSummary();
    }));
  }

  function renderVehicles(){
    const list=document.getElementById("vehicleList");
    if(!list)return;
    if(!vehicles.length){list.innerHTML='<p class="card">Armada belum tersedia di database.</p>';return}
    list.innerHTML=vehicles.map(vehicle=>`<button type="button" class="vehicle-card ${state.vehicle?.id===vehicle.id?"selected":""}" data-vehicle="${vehicle.id}" aria-pressed="${state.vehicle?.id===vehicle.id}"><img src="${escapeHtml(vehicle.image_url)}" alt=""><span><strong>${escapeHtml(vehicle.vehicle_name)}</strong><span>${escapeHtml(vehicle.vehicle_type)} • ${vehicle.total_seats} kursi</span><span class="facility-list">${(vehicle.amenities||[]).map(item=>`<span>${escapeHtml(item)}</span>`).join("")}</span></span></button>`).join("");
    list.querySelectorAll("[data-vehicle]").forEach(card=>card.addEventListener("click",()=>{
      state.vehicle=vehicles.find(vehicle=>String(vehicle.id)===card.dataset.vehicle);
      state.seat=null;
      state.booking=null;
      saveDraft();
      renderVehicles();
      renderSeats();
      renderSummary();
    }));
  }

  function renderDrivers(){
    const list=document.getElementById("driverList");
    if(!list)return;
    if(!drivers.length){list.innerHTML='<p class="card">Driver belum tersedia di database.</p>';return}
    list.innerHTML=drivers.map(driver=>`<button type="button" class="driver-card ${driver.remaining_trip_quota===0?"disabled":""} ${state.driver?.id===driver.id?"selected":""}" data-driver="${driver.id}" aria-pressed="${state.driver?.id===driver.id}" ${driver.remaining_trip_quota===0?"disabled":""}><img src="${escapeHtml(driver.photo_url)}" alt=""><span><strong>${escapeHtml(driver.driver_name)}</strong><span>⭐ ${driver.rating} • Driver pilihan</span><span class="badge">${driver.remaining_trip_quota>0?`Sisa Kuota: ${driver.remaining_trip_quota} Trip Hari Ini`:"Kuota Habis"}</span></span></button>`).join("");
    list.querySelectorAll("[data-driver]").forEach(card=>card.addEventListener("click",()=>{
      const driver=drivers.find(item=>String(item.id)===card.dataset.driver);
      if(driver.remaining_trip_quota>0){state.driver=driver;saveDraft();renderDrivers();renderSummary()}
    }));
  }

  async function renderSeats(){
    const grid=document.getElementById("seatGrid");
    if(!grid)return;
    const requestId=++seatRequestId;
    const total=state.vehicle?.total_seats||0;
    if(!state.route||!state.vehicle){grid.innerHTML='<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">Pilih rute dan armada untuk melihat kursi.</p>';return}
    const routeId=state.route.id;
    const vehicleId=state.vehicle.id;
    grid.innerHTML='<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">Memuat ketersediaan kursi…</p>';
    try{
      const result=await API.request(`/seats?schedule_id=${encodeURIComponent(routeId)}&vehicle_id=${encodeURIComponent(vehicleId)}`);
      if(requestId!==seatRequestId||state.route?.id!==routeId||state.vehicle?.id!==vehicleId)return;
      const booked=new Set(result.booked.map(String));
      if(state.seat&&booked.has(state.seat)){
        state.seat=null;
        saveDraft();
        showMessage("Kursi pilihan baru saja terisi. Silakan pilih kursi lain.");
      }
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
        button.addEventListener("click",()=>{state.seat=seatNumber;saveDraft();renderSeats();renderSummary()});
        grid.appendChild(button);
      }
    }catch(error){
      if(requestId!==seatRequestId)return;
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
      if(index===step-1)item.setAttribute("aria-current","step");
      else item.removeAttribute("aria-current");
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
    if(state.step===5){
      const file=document.getElementById("proofFile").files[0];
      if(!file)return"Unggah bukti pembayaran terlebih dahulu.";
      if(file.size>maxProofSize)return"Ukuran bukti pembayaran maksimal 4 MB.";
    }
    return true;
  }

  function renderTicket(ticket,booking){
    const area=document.getElementById("ticketArea");
    if(!area)return;
    const route=booking.routes_schedules||{};
    const vehicle=booking.vehicles||{};
    const driver=booking.drivers||{};
    area.innerHTML=`<article class="ticket"><div class="ticket-main"><span class="badge">LUNAS / TERVALIDASI</span><h2 style="font:800 28px var(--font-heading);margin:10px 0">${escapeHtml(route.origin_city)} → ${escapeHtml(route.destination_city)}</h2><div class="summary-list"><div><span>Kode Booking</span><strong>${escapeHtml(booking.booking_code)}</strong></div><div><span>Tanggal &amp; Jam</span><strong>${escapeHtml(route.departure_date)} · ${escapeHtml(route.departure_time)}</strong></div><div><span>Armada</span><strong>${escapeHtml(vehicle.vehicle_name)}</strong></div><div><span>Driver</span><strong>${escapeHtml(driver.driver_name)}</strong></div><div><span>Nomor Kursi</span><strong>${escapeHtml(booking.seat_number)}</strong></div><div><span>Penumpang</span><strong>${escapeHtml(booking.passenger_name)}</strong></div><div><span>Total</span><strong>${format(booking.total_amount)}</strong></div></div></div><aside class="ticket-side"><strong>${escapeHtml(ticket.ticket_number)}</strong><img class="qr" src="${escapeHtml(ticket.qr_code)}" alt="QR E-Ticket ${escapeHtml(ticket.ticket_number)}"><p>Eco-Journey Ticket</p></aside></article>`;
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
      seat_number:state.seat
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
    sessionStorage.removeItem(draftKey);
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
    if(validation!==true&&validation!==undefined){if(validation)showMessage(validation);return}
    showMessage("");
    if(state.step===3&&!localStorage.getItem("eco_token")){
      requestLogin();
      return;
    }
    if(state.step===5){
      const button=document.getElementById("nextStep");
      button.disabled=true;
      try{await submitPayment()}catch(error){showMessage(error.message)}
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
    const dateInput=document.getElementById("departureDate");
    const today=todayJakarta();
    const search=new URLSearchParams(location.search);
    dateInput.min=today;
    dateInput.value=search.get("date")&&search.get("date")>=today?search.get("date"):today;
    try{
      await loadCatalog();
      const resumed=search.get("resume")==="1"&&restoreDraft();
      const scheduleId=search.get("schedule_id");
      const vehicleId=search.get("vehicle_id");
      if(scheduleId){
        state.route=routes.find(route=>String(route.id)===scheduleId)||null;
        if(state.route)dateInput.value=state.route.departure_date;
      }
      if(vehicleId)state.vehicle=vehicles.find(vehicle=>String(vehicle.id)===vehicleId)||null;
      renderRoutes();
      renderVehicles();
      renderDrivers();
      renderSeats();
      renderSummary();
      if(resumed)showStep(4);
      else if(state.route)showStep(2);
    }catch(error){
      document.getElementById("routeList").innerHTML=`<p class="card" style="color:var(--color-danger)">${escapeHtml(error.message)}</p>`;
      document.getElementById("vehicleList").innerHTML="";
      document.getElementById("driverList").innerHTML="";
      showMessage("Jadwal belum berhasil dimuat. Periksa koneksi lalu muat ulang halaman.");
    }
    document.getElementById("routeFilter")?.addEventListener("input",renderRoutes);
    dateInput.addEventListener("change",()=>{
      if(state.route?.departure_date!==dateInput.value){
        state.route=null;
        state.seat=null;
        state.booking=null;
      }
      saveDraft();
      renderRoutes();
      renderSeats();
      renderSummary();
      showMessage("");
    });
    document.getElementById("nextStep").addEventListener("click",next);
    document.getElementById("prevStep").addEventListener("click",()=>{
      showMessage("");
      showStep(Math.max(1,state.step-1));
    });
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
