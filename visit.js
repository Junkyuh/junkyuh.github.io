// Visitor counting for sub00k.com - private namespace, bot-filtered.
const ABACUS="https://abacus.jasoncameron.dev";
const NS=atob("c3ViMDBrLXMyYWszcA==");
function isBot(){return /bot|crawl|spider|slurp|headless/i.test(navigator.userAgent);}
function send(){
  if(sessionStorage.getItem("sub00k-counted"))return; // one count per tab session
  sessionStorage.setItem("sub00k-counted","1");
  const now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,"0"),d=String(now.getDate()).padStart(2,"0");
  ["total","d-"+y+m+d,"m-"+y+m].forEach(function(k){
    try{fetch(ABACUS+"/hit/"+NS+"/"+k,{mode:"cors",keepalive:true}).catch(function(){});
      // iOS Safari fallback if fetch blocked by ITP: pixel beacon
      var i=new Image();i.src=ABACUS+"/hit/"+NS+"/"+k+"?t="+Date.now();i.style.display="none";document.body.appendChild(i);
    }catch(e){}
  });
}
if(!isBot()&&!location.pathname.match(/admin/)){
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",send);}
  else{send();}
  window.addEventListener("pageshow",function(ev){if(ev.persisted){sessionStorage.removeItem("sub00k-counted");}});
}
