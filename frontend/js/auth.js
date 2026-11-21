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
}));

async function submit(form,path){
  const data=Object.fromEntries(new FormData(form));
  const message=document.getElementById("authMessage");
  try{
    const result=await API.request(path,{method:"POST",body:JSON.stringify(data)});
    if(result.token){
      localStorage.setItem("eco_token",result.token);
      message.textContent="Berhasil masuk.";
      setTimeout(()=>location.href="booking.html",500);
      return;
    }
    document.querySelector('[data-auth-tab="login"]').click();
    document.querySelector('#loginForm [name="email"]').value=data.email;
    message.textContent=result.message||"Pendaftaran berhasil. Silakan masuk.";
  }catch(error){
    message.textContent=error.message;
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
