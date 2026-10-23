const SUPABASE_URL = "https://odykudoibkiwdycptxik.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =sb_publishable_3zuZicde5nwIuvTftxC3Kg_T_7kaoci;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const storageKey = "skillup-demo-v1";
const seedPosts = [
 {id:"p1",name:"Ama Mensah",handle:"ama.designs",avatar:"A",avatarClass:"avatar-purple",time:"12 min ago",verified:true,skill:"Design",text:"Day 4 of learning UI design ✨ Finally understanding how spacing and contrast make a screen feel easier to use. Made this tiny concept today — feedback welcome! #DesignJourney #LearnInPublic",visual:"design",likes:24,comments:[{name:"Kwame",text:"The colors work so well together!"},{name:"Nana",text:"Keep going, this is inspiring."}],following:true},
 {id:"p2",name:"Kojo Builds",handle:"kojobuilds",avatar:"K",avatarClass:"avatar-blue",time:"38 min ago",verified:false,skill:"Coding",text:"My first little HTML card is working! It's not much yet, but every builder starts somewhere. Today's reminder: progress beats perfection. 💻 #Coding #BuildInPublic",visual:"code",likes:18,comments:[{name:"Ama Mensah",text:"This is how it starts. Nice work!"}],following:true},
 {id:"p3",name:"Nana's Next Step",handle:"nana.next",avatar:"N",avatarClass:"avatar-orange",time:"1 hr ago",verified:false,skill:"Business",text:"A business idea doesn't have to be huge to be useful. Start with one person, one problem, and one small experiment. What problem would you love to solve? #Entrepreneurship",visual:"business",likes:31,comments:[{name:"Kojo Builds",text:"Helping local shops get online!"}],following:false}
];
const people = [
 {name:"Ama Mensah",handle:"ama.designs",avatar:"A",avatarClass:"avatar-purple",skill:"UI design"},
 {name:"Kojo Builds",handle:"kojobuilds",avatar:"K",avatarClass:"avatar-blue",skill:"Web development"},
 {name:"Nana Owusu",handle:"nana.next",avatar:"N",avatarClass:"avatar-orange",skill:"Business ideas"}
];
let state = loadState();
let activeFilter = "all";
let activeView = "home";
let searchTerm = "";
let toastTimer;

function loadState(){
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||"{}");
  return {posts:Array.isArray(saved.posts)?saved.posts:seedPosts.map(p=>({...p,comments:p.comments.map(c=>({...c}))})),liked:saved.liked||{},following:saved.following||{},xp:Number(saved.xp)||180,challengeDone:!!saved.challengeDone,streak:Number(saved.streak)||1,skillsDone:Number(saved.skillsDone)||3};
 }catch(e){return {posts:seedPosts,liked:{},following:{},xp:180,challengeDone:false,streak:1,skillsDone:3};}
}
function saveState(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch(e){showToast("Browser storage is full; some demo changes may not save.");}}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showToast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
function info(title,message){$("#infoTitle").textContent=title;$("#infoText").textContent=message;$("#infoDialog").showModal();}
function visualMarkup(type){
 if(type==="code")return '<div class="post-visual visual-code"><div class="code-window"><span class="purple">const</span> dream = <span class="green">"build something"</span>;<br><span class="purple">function</span> keepGoing() {<br>&nbsp;&nbsp;return learn + practice;<br>}</div></div>';
 if(type==="design")return '<div class="post-visual visual-design"><div class="design-shape"></div></div>';
 if(type==="business")return '<div class="post-visual visual-business"><div class="business-card"><b>IDEA → IMPACT</b><span>Start small. Learn fast.</span></div></div>';
 return "";
}
function renderPost(post){
 const liked=!!state.liked[post.id];
 const following=post.following||!!state.following[post.handle];
 const matches=!searchTerm||[post.name,post.handle,post.text,post.skill].join(" ").toLowerCase().includes(searchTerm);
 if(!matches||(activeFilter==="following"&&!following))return "";
 const comments=post.comments||[];
 return `<article class="panel post-card" data-post-id="${escapeHTML(post.id)}">
  <div class="post-header"><div class="avatar ${escapeHTML(post.avatarClass||"")}">${escapeHTML(post.avatar||"?")}</div><div class="post-user"><strong>${escapeHTML(post.name)} ${post.verified?'<span class="verified">✦</span>':""}</strong><small>@${escapeHTML(post.handle)} · ${escapeHTML(post.time||"just now")} · ${escapeHTML(post.skill||"Learning")}</small></div><button class="post-menu" aria-label="Post options" data-post-menu="${escapeHTML(post.id)}">···</button></div>
  <p class="post-text">${escapeHTML(post.text).replace(/#([\w]+)/g,'<span class="hashtag">#$1</span>')}</p>${visualMarkup(post.visual)}
  <div class="post-stats"><span>${post.likes+(liked?1:0)} appreciations</span><span>${comments.length} comments</span><span>✦ ${escapeHTML(post.skill||"Skill")}</span></div>
  <div class="post-actions"><button class="post-action ${liked?"liked":""}" data-like="${escapeHTML(post.id)}"><span class="action-icon">${liked?"♥":"♡"}</span> Like</button><button class="post-action" data-comments="${escapeHTML(post.id)}"><span class="action-icon">▱</span> Comment</button><button class="post-action" data-share="${escapeHTML(post.id)}"><span class="action-icon">↗</span> Share</button></div>
  <div class="comments-box hidden" id="comments-${escapeHTML(post.id)}"><div class="comment-list">${comments.map(c=>`<div class="comment"><strong>${escapeHTML(c.name)}</strong>${escapeHTML(c.text)}</div>`).join("")}</div><form class="comment-form" data-comment-form="${escapeHTML(post.id)}"><input name="comment" maxlength="250" placeholder="Write a kind, useful comment..." aria-label="Write a comment" required><button type="submit">Send</button></form></div>
 </article>`;
}
function renderFeed(){const html=state.posts.slice().reverse().map(renderPost).join("");$("#feedList").innerHTML=html;$("#emptyState").classList.toggle("hidden",!!html);renderProgress();}
function renderPeople(){ $("#suggestedPeople").innerHTML=people.map(p=>{const following=!!state.following[p.handle];return `<div class="person-row"><div class="avatar ${p.avatarClass}">${p.avatar}</div><div class="person-info"><strong>${p.name}</strong><small>${p.skill}</small></div><button class="follow-button ${following?"following":""}" data-follow="${p.handle}">${following?"Following":"+ Follow"}</button></div>`}).join("");}
function renderProgress(){ $("#xpCount").textContent=state.xp.toLocaleString();$("#xpProgress").style.width=Math.min(100,state.xp/10)+"%";$("#xpPercent").textContent=Math.min(100,Math.round(state.xp/10))+"%";$("#streakCount").textContent=state.streak+" day"+(state.streak===1?"":"s");$("#streakStat").textContent=state.streak;$("#skillsDone").textContent=state.skillsDone;}
function switchView(view){activeView=view;$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));if(view==="learn"){info("Explore learning","Choose a skill from the Explore skills panel, then take the daily five-minute challenge. More lessons will be added as the app grows.");}else if(view==="creators"){info("Creator corner","Share what you make with the post composer. Creator profiles, video uploads, and livestreams are planned features, not live yet.");}else if(view==="friends"){info("Community","Use the suggested people panel to try following demo creators. Real friend requests and private messaging need a secure backend and are not enabled in this prototype.");}else{window.scrollTo({top:0,behavior:"smooth"});}}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
$$("[data-filter]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderFeed();}));
$("#searchInput").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLowerCase();renderFeed();});
$("#publishPost").addEventListener("click",()=>{
 const input=$("#postText"),text=input.value.trim();if(!text){showToast("Write something before sharing.");input.focus();return;}
 const post={id:"local-"+Date.now(),name:"You",handle:"your-profile",avatar:"Y",avatarClass:"",time:"just now",verified:false,skill:"Learning",text,visual:"",likes:0,comments:[],following:true};
 state.posts.push(post);saveState();input.value="";activeFilter="all";$$("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));renderFeed();showToast("Post added to this browser's demo feed.");});
$("#creatorPostButton").addEventListener("click",()=>{$("#postText").focus();$("#postText").scrollIntoView({behavior:"smooth",block:"center"});showToast("Share a project, idea, or learning update.");});
$("#feedList").addEventListener("click",async e=>{
 const like=e.target.closest("[data-like]");if(like){const id=like.dataset.like;state.liked[id]=!state.liked[id];if(!state.liked[id])delete state.liked[id];saveState();renderFeed();return;}
 const comments=e.target.closest("[data-comments]");if(comments){const box=$("#comments-"+comments.dataset.comments);box.classList.toggle("hidden");if(!box.classList.contains("hidden"))$("input",box).focus();return;}
 const share=e.target.closest("[data-share]");if(share){const post=state.posts.find(p=>p.id===share.dataset.share);const text=post?`SkillUp: ${post.text}`:"Check out SkillUp";if(navigator.share){navigator.share({title:"SkillUp",text}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>showToast("Post text copied.")).catch(()=>showToast(text));}else showToast(text);return;}
 const menu=e.target.closest("[data-post-menu]");if(menu){info("Post options","This is a demo. In the live app, this menu will include report, block, and moderation actions.");}
});
$("#feedList").addEventListener("submit",e=>{const form=e.target.closest("[data-comment-form]");if(!form)return;e.preventDefault();const id=form.dataset.commentForm,input=$('input[name="comment"]',form),text=input.value.trim();if(!text)return;const post=state.posts.find(p=>p.id===id);if(post){post.comments=post.comments||[];post.comments.push({name:"You",text});saveState();renderFeed();const box=$("#comments-"+id);if(box)box.classList.remove("hidden");showToast("Comment added to the demo post.");}});
$("#suggestedPeople").addEventListener("click",e=>{const b=e.target.closest("[data-follow]");if(!b)return;const id=b.dataset.follow;state.following[id]=!state.following[id];if(!state.following[id])delete state.following[id];saveState();renderPeople();showToast(state.following[id]?"Following this demo creator.":"Unfollowed demo creator.");});
$$("[data-skill]").forEach(b=>b.addEventListener("click",()=>{const skill=b.dataset.skill;$("#postText").value=`I'm exploring ${skill} on SkillUp. What should I learn first?`;$("#postText").focus();$("#postText").scrollIntoView({behavior:"smooth",block:"center"});showToast(`${skill} selected — share your learning goal.`);}));
$("#startChallenge").addEventListener("click",()=>{$("#quizFeedback").textContent="";$("#finishChallenge").classList.add("hidden");$$(".quiz-option").forEach(b=>b.classList.remove("correct","wrong"));$("#challengeDialog").showModal();});
$$(".quiz-option").forEach(b=>b.addEventListener("click",()=>{const correct=b.dataset.answer==="correct";$$(".quiz-option").forEach(x=>x.classList.remove("correct","wrong"));b.classList.add(correct?"correct":"wrong");$("#quizFeedback").textContent=correct?"That's right! HTML gives a webpage its structure.":"Not quite — try again. HTML structures content; CSS styles it.";$("#finishChallenge").classList.toggle("hidden",!correct);}));
$("#finishChallenge").addEventListener("click",()=>{if(!state.challengeDone){state.xp+=100;state.challengeDone=true;state.skillsDone+=1;state.streak=Math.max(1,state.streak);saveState();renderProgress();showToast("Challenge complete! +100 demo XP ✦");}else showToast("You've already collected today's demo XP.");$("#challengeDialog").close();});
$("#notifyButton").addEventListener("click",()=>info("Notifications","Friend requests, new messages, and creator alerts will be connected when we build the real backend."));
$("#closeInfo").addEventListener("click",()=>$("#infoDialog").close());
$("#aboutLink").addEventListener("click",e=>{e.preventDefault();info("About SkillUp","SkillUp is a prototype concept for a global social learning and creator platform. This preview uses sample posts and local browser storage; it is not yet a live social network.");});
$("#safetyLink").addEventListener("click",e=>{e.preventDefault();info("Community safety","This prototype does not have real accounts, reporting queues, or moderation. Before inviting real users, we must implement secure authentication, access rules, reporting, blocking, moderation, and privacy controls.");});
renderFeed();renderPeople();
