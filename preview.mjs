import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = process.env.PORTFOLIO_DIST || here;
const library = process.env.PORTFOLIO_LIBRARY || path.join(here,'media');
const port = Number(process.env.PORTFOLIO_PORT || 4173);
const contentTypes = {
 pdf:'application/pdf', html:'text/html; charset=utf-8', css:'text/css; charset=utf-8', mjs:'text/javascript; charset=utf-8',
 json:'application/json; charset=utf-8', mp4:'video/mp4', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
 webp:'image/webp', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
const publicFiles = new Set(['index.html','works.html','portfolio.css','portfolio.mjs','works.mjs','catalog.json','showreel.mp4']);
const allow = new Set(JSON.parse(fs.readFileSync(path.join(dist,'media-allowlist.json'),'utf8')));
const resume = '候宇_AIGC动画设计师简历（修订版）.docx';

function route(rawUrl) {
 const pathname = decodeURIComponent(new URL(rawUrl,'http://localhost').pathname);
 if (pathname === '/') return path.join(dist,'index.html');
 if (/^\/enhanced\/[a-z]+-[1-9][0-9]*\.mp4$/.test(pathname)) return path.join(dist,pathname.slice(1));
 if (/^\/pdf-design\/(?:visual-creative\/)?(?:source\.pdf|(?:page|thumb)-[0-9]{2}\.jpg)$/.test(pathname)) return path.join(dist,pathname.slice(1));
 if (pathname === '/resume' || pathname === '/resume.docx') return path.join(dist,'resume.docx');
 if (publicFiles.has(pathname.slice(1)) || /^\/covers\/[a-z]+(?:-\d+)?\.jpg$/.test(pathname)) return path.join(dist,pathname.slice(1));
 if (pathname.startsWith('/media/') && allow.has(pathname.slice(7))) return path.join(library,pathname.slice(7));
 return null;
}
const server = http.createServer(async (req,res) => {
 if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{Allow:'GET, HEAD'}).end(); return; }
 let file, size;
 try {
   file = route(req.url);
   if (!file) {res.writeHead(404).end(); return;}
   const stats = await fs.promises.stat(file);
   if (!stats.isFile()) {res.writeHead(404).end(); return;}
   size = stats.size;
 } catch {
   res.writeHead(404).end(); return;
 }
 const headers = {
   'Content-Type':contentTypes[path.extname(file).slice(1).toLowerCase()] || 'application/octet-stream',
   'X-Content-Type-Options':'nosniff',
   'Cache-Control':'no-cache',
   'Accept-Ranges':'bytes'
 };
 if (file.endsWith('resume.docx')) headers['Content-Disposition'] = "attachment; filename*=UTF-8''" + encodeURIComponent(resume);
 const range = req.headers.range;
 let start = 0, end = size-1;
 if (range) {
   const match = /^bytes=(\d*)-(\d*)$/.exec(range);
   if (match?.[1]) {
     start = Number(match[1]);
     if (match[2]) end = Math.min(end,Number(match[2]));
   } else if (match?.[2]) {
     start = Math.max(0,size-Number(match[2]));
   } else start = size;
   if (start >= size || end < start) {
     res.writeHead(416,{'Content-Range':'bytes */'+size}).end(); return;
   }
   headers['Content-Range'] = 'bytes '+start+'-'+end+'/'+size;
 }
 headers['Content-Length'] = end-start+1;
 res.writeHead(range?206:200,headers);
 if (req.method === 'HEAD' || !size) {res.end(); return;}
 const stream = fs.createReadStream(file,{start,end});
 res.on('close',()=>stream.destroy());
 stream.on('error',()=>res.destroy());
 stream.pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port+'/'));



