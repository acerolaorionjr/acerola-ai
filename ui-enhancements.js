/* Acerola UI enhancements: Markdown rendering + lightweight performance polish. */
(function(){'use strict';
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  function inline(s){
    let x=esc(s);
    x=x.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    x=x.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
    x=x.replace(/__([^_\n]+)__/g,'<strong>$1</strong>');
    x=x.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
    x=x.replace(/(?<!_)_([^_\n]+)_(?!_)/g,'<em>$1</em>');
    x=x.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return x;
  }
  function md(src){
    const lines=String(src??'').replace(/\r/g,'').split('\n'),out=[]; let list=null,code=false,buf=[];
    const flush=()=>{if(!list)return;out.push('<ul>'+list.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>');list=null};
    for(const line of lines){
      if(/^```/.test(line)){if(code){out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');code=false;buf=[]}else{flush();code=true}continue}
      if(code){buf.push(line);continue}
      if(/^\s*[-*]\s+/.test(line)){if(!list)list=[];list.push(line.replace(/^\s*[-*]\s+/,''));continue}
      flush();
      if(!line.trim()){out.push('<div class="md-gap"></div>');continue}
      let m=line.match(/^###\s+(.+)/);if(m){out.push('<h4>'+inline(m[1])+'</h4>');continue}
      m=line.match(/^##\s+(.+)/);if(m){out.push('<h3>'+inline(m[1])+'</h3>');continue}
      m=line.match(/^#\s+(.+)/);if(m){out.push('<h2>'+inline(m[1])+'</h2>');continue}
      m=line.match(/^\s*\d+\.\s+(.+)/);if(m){out.push('<div class="md-ol">'+inline(m[1])+'</div>');continue}
      out.push('<div>'+inline(line)+'</div>');
    }
    if(code)out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');flush();return out.join('');
  }
  function render(){
    document.querySelectorAll('.row.assistant .bubble').forEach(b=>{
      if(b.dataset.mdDone==='1')return;
      const name=b.querySelector('.name'); if(!name)return;
      const text=[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();
      if(!text)return;
      b.dataset.mdDone='1';b.innerHTML='<div class="name">Acerola</div><div class="md-body">'+md(text)+'</div>';
    });
  }
  const style=document.createElement('style');style.textContent='.md-body{line-height:1.65}.md-body strong{font-weight:750}.md-body em{font-style:italic}.md-body h2,.md-body h3,.md-body h4{margin:10px 0 5px;color:#f3f8ff}.md-body ul{margin:5px 0 8px;padding-left:20px}.md-body li{margin:3px 0}.md-body .md-ol{margin:3px 0}.md-body code{padding:2px 5px;border-radius:5px;background:#111b30;border:1px solid #223653;font-family:ui-monospace,SFMono-Regular,monospace;font-size:.92em}.md-body pre{margin:8px 0;padding:10px;overflow:auto;border-radius:10px;background:#050a14;border:1px solid #1d2b49}.md-body pre code{padding:0;border:0;background:transparent}.md-body a{color:#00eaff;text-decoration:underline}.md-gap{height:5px}';document.head.appendChild(style);
  const obs=new MutationObserver(render);obs.observe(document.body,{subtree:true,childList:true});setTimeout(render,100);setTimeout(render,600);setTimeout(render,1500);
})();
