import{createServer}from"http";import{readFileSync,existsSync}from"fs";import{join,extname}from"path";
const M={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".ico":"image/x-icon",".png":"image/png",".map":"application/json"};
const N="/home/z/my-project/.next";
const html=readFileSync(N+"/server/app/index.html","utf-8");
function tryServe(res,path,ct){
  try{if(existsSync(path)){res.writeHead(200,{"Content-Type":ct||M[extname(path)]||"application/octet-stream"});res.end(readFileSync(path));return true;}}catch{}
  return false;
}
const s=createServer((q,p)=>{
  try{
    const u=new URL(q.url||"/","http://x").pathname;
    // /_next/X -> .next/X (strip leading /_next)
    if(u.startsWith("/_next/")){
      const fp=N+u.substring(6);
      if(tryServe(p,fp))return;
    }
    // public
    if(tryServe(p,"/home/z/my-project/public"+u))return;
    // api
    if(u.startsWith("/api/")){
      p.writeHead(200,{"Content-Type":"application/json"});
      if(u.includes("ai-decision")){
        let b="";q.on("data",c=>b+=c);q.on("end",()=>{try{const d=JSON.parse(b);p.end(JSON.stringify({action:"pass",quote:"Ini politik la, "+(d?.coalitionName||"")+"... rakyat tahu!",reasoning:"Fallback"}));}catch{p.end('{"action":"pass","quote":"Politik!","reasoning":"FB"}');}});
      }else p.end('{"status":"ok"}');
      return;
    }
    // html
    p.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});p.end(html);
  }catch{try{p.writeHead(500);p.end("e")}catch{}}
});
process.on("uncaughtException",()=>{});
s.listen(3000,"0.0.0.0",()=>console.log("OK"));
