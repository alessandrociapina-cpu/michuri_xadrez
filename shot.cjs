const puppeteer=require('puppeteer');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
 const p=await b.newPage();
 // viewport de celular
 await p.setViewport({width:390,height:844,deviceScaleFactor:2});
 await p.goto('http://localhost:4399/michuri_xadrez/',{waitUntil:'networkidle2'});
 await sleep(2000);
 await p.screenshot({path:'/tmp/mobile_full.png'});
 // recorte do cabeçalho (Michuri) e do tabuleiro (coordenadas)
 const head=await p.$('.app-top'); if(head) await head.screenshot({path:'/tmp/header.png'});
 const board=await p.$('.board-stage'); if(board) await board.screenshot({path:'/tmp/board.png'});
 // captura olho fechado: espera a piscada
 await sleep(6000);
 await p.screenshot({path:'/tmp/mobile_blink.png',clip:{x:0,y:0,width:390,height:200}});
 await b.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
