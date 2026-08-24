// Abacus visitor counter for sub00k.com admin dashboard (private NS).
const ABACUS="https://abacus.jasoncameron.dev";
const NS=atob("c3ViMDBrLXMyYWszcA==");
function send(){
  if(sessionStorage.getItem("sub00k-counted"))return;
  sessionStorage.setItem("sub00k-counted","1");
  const now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,"0"),d=String(now.getDate()).padStart(2,"0");
  ["total","d-"+y+m+d,"m-"+y+m].forEach(function(k){
    try{fetch(ABACUS+"/hit/"+NS+"/"+k,{mode:"cors",keepalive:true}).catch(function(){});}catch(e){}
  });
}
if(!/bot|crawl|spider|slurp|headless/i.test(navigator.userAgent)&&!location.pathname.match(/admin/)){
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",send);}
  else{send();}
}
