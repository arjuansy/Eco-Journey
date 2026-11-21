require("dotenv").config();

const express=require("express");
const cors=require("cors");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const multer=require("multer");
const path=require("path");
const {randomBytes,randomUUID}=require("crypto");
const {createClient}=require("@supabase/supabase-js");

const app=express();
const PORT=Number(process.env.PORT)||3000;
const JWT_SECRET=process.env.JWT_SECRET;
const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET=process.env.SUPABASE_STORAGE_BUCKET||"payment-proofs";
const supabase=SUPABASE_URL&&SUPABASE_SERVICE_ROLE_KEY
  ?createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  :null;

app.use(cors());
app.use(express.json());
app.use("/frontend",express.static(path.join(__dirname,"../frontend")));
app.use("/uploads",express.static(path.join(__dirname,"uploads")));

const upload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:5*1024*1024},
  fileFilter(req,file,callback){
    if(!["image/jpeg","image/png","image/webp"].includes(file.mimetype)){
      const error=new Error("Bukti pembayaran harus berupa JPG, PNG, atau WebP.");
      error.status=400;
      callback(error);
      return;
    }
    callback(null,true);
  }
});

function requireSupabase(req,res,next){
  if(!supabase){
    return res.status(503).json({message:"Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY pada file .env."});
  }
  next();
}

function requireJwtSecret(req,res,next){
  if(!JWT_SECRET){
    return res.status(503).json({message:"JWT_SECRET belum dikonfigurasi pada file .env."});
  }
  next();
}

function authenticate(req,res,next){
  const token=req.headers.authorization?.replace(/^Bearer\s+/i,"");
  if(!token)return res.status(401).json({message:"Silakan masuk terlebih dahulu."});
  try{
    req.user=jwt.verify(token,JWT_SECRET);
    next();
  }catch(error){
    res.status(401).json({message:"Sesi tidak valid atau sudah berakhir. Silakan masuk kembali."});
  }
}

function requireAdmin(req,res,next){
  if(req.user?.role!=="ADMIN")return res.status(403).json({message:"Akses khusus Admin."});
  next();
}

function assertSupabase(error){
  if(error)throw error;
}

function bookingCode(){
  return `EJT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

app.get("/api/health",async(req,res)=>{
  if(!supabase)return res.status(503).json({status:"not_configured",message:"Isi konfigurasi Supabase di .env."});
  const {error}=await supabase.from("routes_schedules").select("id").limit(1);
  if(error)return res.status(503).json({status:"database_error",message:error.message});
  res.json({status:"ok",database:"supabase"});
});

app.use("/api",requireSupabase);
app.use("/api",requireJwtSecret);

app.post("/api/auth/signup",async(req,res)=>{
  const {full_name,email,password,phone_number}=req.body;
  if(typeof full_name!=="string"||!full_name.trim()||typeof email!=="string"||typeof password!=="string"||password.length<6){
    return res.status(400).json({message:"Nama, email, dan password minimal 6 karakter wajib diisi."});
  }
  const password_hash=await bcrypt.hash(password,12);
  const {data,error}=await supabase.from("users")
    .insert({full_name:full_name.trim(),email:email.trim().toLowerCase(),password_hash,phone_number,role:"PASSENGER"})
    .select("id,full_name,email,role")
    .single();
  if(error?.code==="23505")return res.status(409).json({message:"Email sudah terdaftar."});
  assertSupabase(error);
  res.status(201).json({message:"Pendaftaran berhasil. Silakan masuk.",user:data});
});

app.post("/api/auth/login",async(req,res)=>{
  const email=typeof req.body.email==="string"?req.body.email.trim().toLowerCase():"";
  const {data:user,error}=await supabase.from("users")
    .select("id,full_name,email,password_hash,role")
    .eq("email",email)
    .maybeSingle();
  assertSupabase(error);
  if(!user||!await bcrypt.compare(req.body.password||"",user.password_hash)){
    return res.status(401).json({message:"Email atau password salah."});
  }
  const token=jwt.sign({id:user.id,role:user.role},JWT_SECRET,{expiresIn:"1d"});
  res.json({token,user:{id:user.id,full_name:user.full_name,email:user.email,role:user.role}});
});

app.get("/api/routes",async(req,res)=>{
  const {data,error}=await supabase.from("routes_schedules").select("*").order("departure_date").order("departure_time");
  assertSupabase(error);
  const city=typeof req.query.city==="string"?req.query.city.trim().toLowerCase():"";
  res.json(city?data.filter(route=>route.origin_city.toLowerCase()===city||route.destination_city.toLowerCase()===city):data);
});

app.get("/api/vehicles",async(req,res)=>{
  const {data,error}=await supabase.from("vehicles").select("*").order("id");
  assertSupabase(error);
  res.json(data);
});

app.get("/api/drivers",async(req,res)=>{
  const {data,error}=await supabase.from("drivers").select("*").order("driver_name");
  assertSupabase(error);
  res.json(data);
});

app.get("/api/seats",async(req,res)=>{
  const scheduleId=Number(req.query.schedule_id);
  const vehicleId=Number(req.query.vehicle_id);
  if(!Number.isInteger(scheduleId)||!Number.isInteger(vehicleId)){
    return res.status(400).json({message:"schedule_id dan vehicle_id wajib berupa angka."});
  }
  const cutoff=new Date(Date.now()-15*60*1000).toISOString();
  const {error:expireError}=await supabase.from("bookings")
    .update({booking_status:"PAYMENT_FAILED"})
    .eq("booking_status","PENDING_PAYMENT")
    .lt("created_at",cutoff);
  assertSupabase(expireError);
  const {data,error}=await supabase.from("bookings")
    .select("seat_number")
    .eq("schedule_id",scheduleId)
    .eq("vehicle_id",vehicleId)
    .in("booking_status",["PENDING_PAYMENT","WAITING_VALIDATION","CONFIRMED"]);
  assertSupabase(error);
  res.json({booked:data.map(row=>row.seat_number)});
});

app.post("/api/bookings",authenticate,async(req,res)=>{
  const {schedule_id,vehicle_id,driver_id,passenger_name,passenger_identity_number,passenger_phone,seat_number,total_amount}=req.body;
  if(!schedule_id||!vehicle_id||!driver_id||!passenger_name||!passenger_identity_number||!passenger_phone||!seat_number||!Number.isFinite(Number(total_amount))||Number(total_amount)<0){
    return res.status(400).json({message:"Data pemesanan belum lengkap atau tidak valid."});
  }
  const cutoff=new Date(Date.now()-15*60*1000).toISOString();
  const {error:expireError}=await supabase.from("bookings")
    .update({booking_status:"PAYMENT_FAILED"})
    .eq("booking_status","PENDING_PAYMENT")
    .lt("created_at",cutoff);
  assertSupabase(expireError);
  const {data,error}=await supabase.from("bookings").insert({
    booking_code:bookingCode(),
    user_id:req.user.id,
    schedule_id,
    vehicle_id,
    driver_id,
    passenger_name,
    passenger_identity_number,
    passenger_phone,
    seat_number:String(seat_number),
    total_amount:Number(total_amount),
    booking_status:"PENDING_PAYMENT"
  }).select("*").single();
  if(error?.code==="23505")return res.status(409).json({message:"Kursi tersebut baru saja dipesan. Silakan pilih kursi lain."});
  assertSupabase(error);
  res.status(201).json({booking:data});
});

app.post("/api/payments",authenticate,upload.single("proof"),async(req,res)=>{
  const bookingId=Number(req.body.booking_id);
  if(!Number.isInteger(bookingId))return res.status(400).json({message:"booking_id tidak valid."});
  if(!req.file)return res.status(400).json({message:"Unggah bukti pembayaran terlebih dahulu."});
  const {data:booking,error:bookingError}=await supabase.from("bookings")
    .select("id,user_id,booking_status")
    .eq("id",bookingId)
    .maybeSingle();
  assertSupabase(bookingError);
  if(!booking)return res.status(404).json({message:"Pemesanan tidak ditemukan."});
  if(booking.user_id!==req.user.id)return res.status(403).json({message:"Pemesanan bukan milik akun ini."});
  if(!["PENDING_PAYMENT","PAYMENT_FAILED"].includes(booking.booking_status)){
    return res.status(409).json({message:"Pemesanan ini tidak dapat menerima pembayaran baru."});
  }

  const extension=path.extname(req.file.originalname).toLowerCase();
  const storagePath=`${booking.id}/${randomUUID()}${extension}`;
  const {error:uploadError}=await supabase.storage.from(STORAGE_BUCKET).upload(storagePath,req.file.buffer,{
    contentType:req.file.mimetype,
    upsert:false
  });
  if(uploadError){
    const error=new Error(`Gagal mengunggah bukti pembayaran ke Storage: ${uploadError.message}`);
    error.status=502;
    throw error;
  }

  const {data:payment,error:paymentError}=await supabase.from("payments").insert({
    booking_id:booking.id,
    payment_method:req.body.payment_method||"Transfer Bank",
    proof_image_url:storagePath,
    payment_status:"PENDING"
  }).select("*").single();
  if(paymentError){
    const {error:cleanupError}=await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    if(cleanupError)console.error("Gagal membersihkan bukti pembayaran yatim:",cleanupError.message);
    assertSupabase(paymentError);
  }
  const {error:statusError}=await supabase.from("bookings").update({booking_status:"WAITING_VALIDATION"}).eq("id",booking.id);
  assertSupabase(statusError);
  res.status(201).json({payment});
});

app.get("/api/bookings/:id",authenticate,async(req,res)=>{
  const {data:booking,error}=await supabase.from("bookings")
    .select("*, routes_schedules(origin_city,destination_city,departure_date,departure_time,arrival_time), vehicles(vehicle_name), drivers(driver_name), payments(id,payment_status,admin_notes,payment_method,created_at)")
    .eq("id",req.params.id)
    .maybeSingle();
  assertSupabase(error);
  if(!booking)return res.status(404).json({message:"Pemesanan tidak ditemukan."});
  if(booking.user_id!==req.user.id&&req.user.role!=="ADMIN")return res.status(403).json({message:"Pemesanan bukan milik akun ini."});
  booking.payments.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  res.json(booking);
});

app.get("/api/bookings/:id/eticket",authenticate,async(req,res)=>{
  const {data:booking,error:bookingError}=await supabase.from("bookings")
    .select("id,user_id,booking_status")
    .eq("id",req.params.id)
    .maybeSingle();
  assertSupabase(bookingError);
  if(!booking)return res.status(404).json({message:"Pemesanan tidak ditemukan."});
  if(booking.user_id!==req.user.id&&req.user.role!=="ADMIN")return res.status(403).json({message:"Pemesanan bukan milik akun ini."});
  if(booking.booking_status!=="CONFIRMED")return res.status(409).json({message:"E-Ticket tersedia setelah pembayaran divalidasi."});
  const {data:ticket,error}=await supabase.from("e_tickets").select("*").eq("booking_id",booking.id).maybeSingle();
  assertSupabase(error);
  if(!ticket)return res.status(404).json({message:"E-Ticket belum diterbitkan."});
  res.json(ticket);
});

app.get("/api/admin/payments",authenticate,requireAdmin,async(req,res)=>{
  const {data,error}=await supabase.from("payments")
    .select("*, bookings(booking_code,passenger_name)")
    .order("created_at",{ascending:false});
  assertSupabase(error);
  const payments=await Promise.all(data.map(async payment=>{
    let proof_image_url=null;
    if(payment.proof_image_url){
      const {data:signed,error:signedError}=await supabase.storage.from(STORAGE_BUCKET)
        .createSignedUrl(payment.proof_image_url,600);
      assertSupabase(signedError);
      proof_image_url=signed.signedUrl;
    }
    return {...payment,booking_code:payment.bookings?.booking_code,passenger_name:payment.bookings?.passenger_name,proof_image_url};
  }));
  res.json(payments);
});

app.patch("/api/admin/payments/:id/validate",authenticate,requireAdmin,async(req,res)=>{
  if(typeof req.body.is_success!=="boolean")return res.status(400).json({message:"is_success wajib berupa boolean."});
  const {data,error}=await supabase.rpc("validate_payment",{
    p_payment_id:Number(req.params.id),
    p_is_success:req.body.is_success,
    p_notes:typeof req.body.notes==="string"?req.body.notes:null,
    p_admin_id:req.user.id
  });
  if(error){
    if(error.message==="Payment not found")return res.status(404).json({message:"Pembayaran tidak ditemukan."});
    if(error.message==="Payment has already been processed")return res.status(409).json({message:"Pembayaran sudah diproses."});
    if(error.message==="Driver trip quota is exhausted")return res.status(409).json({message:"Kuota perjalanan driver sudah habis."});
    assertSupabase(error);
  }
  res.json(data);
});

app.get("/",(req,res)=>res.redirect("/frontend/index.html"));
app.use((error,req,res,next)=>{
  console.error(error);
  const status=error.status||(error.code==="LIMIT_FILE_SIZE"?413:error.code?.startsWith("LIMIT_")?400:500);
  res.status(status).json({message:error.message||"Terjadi kesalahan pada server."});
});

app.listen(PORT,()=>{
  console.log(`Eco-Journey running at http://localhost:${PORT}`);
  if(!supabase)console.warn("Supabase belum dikonfigurasi. API akan merespons 503 sampai file .env diisi.");
  if(!JWT_SECRET)console.warn("JWT_SECRET belum dikonfigurasi. Endpoint API membutuhkan file .env.");
});
