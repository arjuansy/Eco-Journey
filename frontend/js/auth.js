document.querySelectorAll("[data-auth-tab]").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll("[data-auth-tab]").forEach(item=>{
    item.classList.remove("active");
    item.setAttribute("aria-selected","false");
  });
  tab.classList.add("active");
  tab.setAttribute("aria-selected","true");
  const signup=tab.dataset.authTab==="signup";
  document.getElementById("loginForm").hidden=signup;
  document.getElementById("signupForm").hidden=!signup;
  document.getElementById("authMessage").textContent="";
  document.getElementById("authMessage").dataset.state="";
}));

function getReturnLocation(){
  const requested=new URLSearchParams(location.search).get("next");
  if(!requested)return"booking.html";
  const target=new URL(requested,location.href);
  if(target.origin!==location.origin||!target.pathname.startsWith("/frontend/"))return"booking.html";
  return`${target.pathname}${target.search}${target.hash}`;
}

async function submit(form,path){
  const data=Object.fromEntries(new FormData(form));
  const message=document.getElementById("authMessage");
  const submitButton=form.querySelector('button[type="submit"]');
  const originalLabel=submitButton.textContent;
  submitButton.disabled=true;
  submitButton.textContent="Memproses...";
  try{
    const result=await API.request(path,{method:"POST",body:JSON.stringify(data)});
    if(result.token){
      localStorage.setItem("eco_token",result.token);
      message.textContent="Berhasil masuk.";
      message.dataset.state="success";
      setTimeout(()=>location.href=getReturnLocation(),300);
      return;
    }
    document.querySelector('[data-auth-tab="login"]').click();
    document.querySelector('#loginForm [name="email"]').value=data.email;
    message.textContent=result.message||"Pendaftaran berhasil. Silakan masuk.";
    message.dataset.state="success";
  }catch(error){
    message.textContent=error.message;
    message.dataset.state="error";
  }finally{
    submitButton.disabled=false;
    submitButton.textContent=originalLabel;
  }
}

document.getElementById("loginForm").addEventListener("submit",event=>{
  event.preventDefault();
  submit(event.currentTarget,"/auth/login");
});
document.getElementById("signupForm").addEventListener("submit",event=>{
  event.preventDefault();
  submit(event.currentTarget,"/auth/signup");
});
