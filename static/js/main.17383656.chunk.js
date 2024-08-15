(this["webpackJsonpfrontier-beat"]=this["webpackJsonpfrontier-beat"]||[]).push([[0],{17:function(e,t,a){e.exports=a.p+"static/media/light-logo.6ae19916.png"},18:function(e,t,a){e.exports=a.p+"static/media/dark-logo.37d86adb.png"},27:function(e,t,a){e.exports=a(45)},34:function(e,t,a){},38:function(e,t,a){},45:function(e,t,a){"use strict";a.r(t);var r=a(1),n=a.n(r),l=a(15),c=a.n(l),s=(a(34),a(62)),o=a(16),i=a(61),m=a(9),d=a(5),u=(a(37),a(38),a(17)),p=a.n(u),g=a(18),E=a.n(g);const h=e=>{if("string"!==typeof e)return e;return e.split(/(\$[^$\n]+?\$)/).map((e,t)=>{if(e.startsWith("$")&&e.endsWith("$")){const a=e.slice(1,-1).replace(/\\_/g,"_");return n.a.createElement("span",{key:t,className:"katex-inline"},n.a.createElement(m.InlineMath,null,a))}return e.replace(/\\\\/g,"\\")})},f=e=>{document.body.classList.toggle("dark-mode",e),document.body.classList.toggle("light-mode",!e)},b=e=>{let{repo:t}=e;const a=t.hourly_rate.toFixed(2),r="0.00"!==a,l={p:e=>{let{children:t}=e;return n.a.createElement("p",null,n.a.Children.map(t,e=>"string"===typeof e?h(e):e))},li:e=>{let{children:t}=e;return n.a.createElement("li",null,n.a.Children.map(t,e=>"string"===typeof e?h(e):e))},ul:e=>{let{children:t}=e;return n.a.createElement("ul",null,t)},code:e=>{let{node:t,inline:a,className:r,children:l,...c}=e;const s=/language-(\w+)/.exec(r||"");return!a&&s?n.a.createElement("pre",Object.assign({className:r},c),n.a.createElement("code",{className:r},l)):n.a.createElement("code",Object.assign({className:r},c),l)}};return n.a.createElement("div",{className:"repo-card"},n.a.createElement("div",{className:"repo-card-content"},n.a.createElement("h2",null,n.a.createElement("a",{href:t.html_link,target:"_blank",rel:"noopener noreferrer"},(c=t.title,h(c)))),n.a.createElement("div",{className:"paper-summary"},t.paper_summary.replace(/\$(.*?)\$/g,(e,t)=>"$"+t.replace(/_/g,"\\_")+"$").split(/(\$\$[\s\S]*?\$\$)/).map((e,t)=>e.startsWith("$$")&&e.endsWith("$$")?n.a.createElement("div",{key:t,className:"katex-display"},n.a.createElement(m.BlockMath,null,e.slice(2,-2).replace(/\\_/g,"_"))):n.a.createElement(i.a,{key:t,components:l},e))),n.a.createElement("div",{className:"repo-stats"},n.a.createElement(d.a,null),n.a.createElement("a",{href:t.html_url,target:"_blank",rel:"noopener noreferrer"},t.full_name)),n.a.createElement("div",{className:"repo-stats"},n.a.createElement(d.e,null),t.star_count,r&&` (+${a}/hour)`)));var c},k=()=>n.a.createElement("div",{className:"footer"},n.a.createElement(d.b,{size:10})," Freshly brewed with ",n.a.createElement(d.c,{size:8})," at the ",n.a.createElement("a",{href:"https://www.recurse.com/",target:"_blank",rel:"noopener noreferrer"},"Recurse Center")," in New York \xa9 ",(new Date).getFullYear()," ",n.a.createElement("a",{href:"https://eric-bolton.github.io/",target:"_blank",rel:"noopener noreferrer"},"Eric Bolton"),". All rights reserved."),w=e=>{let{isDarkMode:t}=e;return n.a.createElement("div",{className:"logo-card",onClick:()=>window.location.reload()},n.a.createElement("img",{src:t?E.a:p.a,alt:"Frontier Beat Logo",className:"App-logo"}))},v=()=>n.a.createElement("div",{className:"welcome-message"},n.a.createElement("h2",null,"Today's Trending Open-Source Machine Learning Papers"));var y=function(){const[e,t]=Object(r.useState)([]),[a,l]=Object(r.useState)(1),[c,i]=Object(r.useState)(!0),[m,u]=Object(r.useState)(()=>{const e=localStorage.getItem("theme");return e?"dark"===e:window.matchMedia("(prefers-color-scheme: dark)").matches}),p=Object(r.useRef)(!1);Object(r.useEffect)(()=>{const e=window.matchMedia("(prefers-color-scheme: dark)"),t=e=>{u(e.matches)};return e.addListener(t),()=>e.removeListener(t)},[]),Object(r.useEffect)(()=>{f(m),p.current||(g(1),p.current=!0)},[]),Object(r.useEffect)(()=>{localStorage.setItem("theme",m?"dark":"light"),f(m)},[m]);const g=async e=>{try{const a=(await s.a.get(`https://api.frontier-beat.site/top_papers?page=${e}&per_page=10`)).data.repos;t(e=>[...e,...a]),l(e+1),a.length<10&&i(!1)}catch(a){console.error("Error fetching repos:",a)}},E=Object(r.useRef)(null);return Object(r.useEffect)(()=>{const e=()=>{const e=window.pageYOffset;if(E.current){const t=-.005*e%50;E.current.style.transform=`translate3d(0, ${t}%, 0)`}};return window.addEventListener("scroll",e),()=>{window.removeEventListener("scroll",e)}},[]),n.a.createElement(n.a.Fragment,null,n.a.createElement("div",{className:"background",ref:E}),n.a.createElement("div",{className:"App"},n.a.createElement("div",{className:"theme-toggle",onClick:()=>{u(e=>!e)}},m?n.a.createElement(d.f,null):n.a.createElement(d.d,null)),n.a.createElement(o.a,{dataLength:e.length,next:()=>g(a),hasMore:c,loader:n.a.createElement("div",{className:"loading"},"Loading trending papers..."),endMessage:n.a.createElement("p",{style:{textAlign:"center"}},n.a.createElement("b",null,"You've reached the end of our trending ML papers list!"))},e.map((e,t)=>n.a.createElement(n.a.Fragment,{key:e.id},0===t&&n.a.createElement(n.a.Fragment,null,n.a.createElement(w,{isDarkMode:m}),n.a.createElement(v,null)),n.a.createElement(b,{repo:e}))))),n.a.createElement(k,null))};var N=e=>{e&&e instanceof Function&&a.e(3).then(a.bind(null,63)).then(t=>{let{getCLS:a,getFID:r,getFCP:n,getLCP:l,getTTFB:c}=t;a(e),r(e),n(e),l(e),c(e)})};c.a.createRoot(document.getElementById("root")).render(n.a.createElement(n.a.StrictMode,null,n.a.createElement(y,null))),N()}},[[27,1,2]]]);
//# sourceMappingURL=main.17383656.chunk.js.map