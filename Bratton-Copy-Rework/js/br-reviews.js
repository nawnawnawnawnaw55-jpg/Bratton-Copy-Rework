// Custom Google Reviews Popup
(function(){
  if(window.innerWidth < 769) return;
  
  var css = `.br-review-popup{position:fixed;bottom:20px;right:20px;z-index:99998;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.2);width:380px;max-width:90vw;overflow:hidden;font-family:Montserrat,sans-serif;display:none;animation:brSlideIn .4s ease}
.br-review-popup.show{display:block}@keyframes brSlideIn{from{transform:translateY(100px);opacity:0}to{transform:translateY(0);opacity:1}}
.br-review-header{background:#2257A6;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.br-review-header h3{margin:0;font-size:16px;color:#fff}
.br-review-close{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0;line-height:1}
.br-review-body{padding:0 20px 16px;max-height:160px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}
.br-review-body::-webkit-scrollbar{display:none}
.br-review-card{padding:12px 0;border-bottom:1px solid #eee;cursor:pointer;transition:background .2s}
.br-review-card:last-child{border-bottom:none}
.br-review-stars{color:#f86f26;font-size:14px;margin-bottom:4px}
.br-review-name{font-weight:700;font-size:13px;color:#333}
.br-review-text{font-size:12px;color:#666;margin-top:4px;line-height:1.5;max-height:36px;overflow:hidden;transition:max-height .4s}
.br-review-text.expanded{max-height:500px!important}
.br-review-time{font-size:10px;color:#999;margin-top:4px}
.br-read-more{font-size:11px;color:#2257A6;margin-top:2px;cursor:pointer;display:none}
.br-review-card.long .br-read-more{display:block}
.br-review-footer{text-align:center;padding:16px 20px;border-top:1px solid #eee}
.br-review-btn{display:inline-block;background:#f86f26;color:#fff!important;padding:10px 24px;border-radius:25px;text-decoration:none;font-size:14px;font-weight:600;transition:background .3s}
.br-review-btn:hover{background:#e05a15}
.br-review-loading{text-align:center;padding:20px;color:#999;font-size:13px}
`;
  
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Popup
  var popup = document.createElement('div');
  popup.className = 'br-review-popup';
  popup.innerHTML = '<div class="br-review-header"><h3>★★★★★ Our Reviews</h3><button class="br-review-close">&times;</button></div><div class="br-review-body"><div class="br-review-loading">Loading reviews...</div></div><div class="br-review-footer"><a href="/reviews/" class="br-review-btn">More Reviews</a></div>';
  document.body.appendChild(popup);
  
  var fallbackReviews = [
    {name:'Gary L.',time:'8 months ago',rating:5,text:'Just want to thank Jena and staff for a great job in rehabbing my right rotator cuff. I had two complete tears out of the four muscles of the cuff. Jena and staff rehabbed my shoulder without a need for surgery.'},
    {name:'John C.',time:'1 year ago',rating:5,text:'The experience has been outstanding! When I first came to Bratton Physical Therapy I had sore ankles, could not walk more than 50 feet, getting up from sitting was painful. Now I can easily walk hundreds of yards, I have no pain.'},
    {name:'Barbara K.',time:'1 year ago',rating:5,text:'My journey at Bratton PT began after I spent 3 days, about 6 hours a day working on a ladder moving shelving over my head remodeling my master closet. I developed pain in my neck and upper back. I chose Bratton PT because I used them in the past.'},
    {name:'Nina S.',time:'2 years ago',rating:5,text:'Before coming I struggled picking up my son, sitting comfortably, and sleeping due to severe shoulder pain and limited neck mobility. Jena knew what the issue was immediately. She created a plan that quickly diminished my pain.'},
    {name:'Stephen D.',time:'3 years ago',rating:5,text:'After major rotator cuff surgery, I was unable to move my arm away from my side. I was also experiencing considerable pain related to the surgery. For my physical therapy treatment, my Surgeon recommended Jena Bratton, PT.'},
    {name:'James S.',time:'3 years ago',rating:5,text:'My journey has been one of great pain and great rewards. Many years ago my knees began failing and I was not successful with gym workouts helping the problem. It took quite a while in obtaining surgical approval to have my knees replaced.'},
    {name:'Paul R.',time:'9 months ago',rating:5,text:'Undergoing PT for total hip replacement. The treatment is awesome. I get a custom PT plan focused on my needs and progress. I am so happy I came to Bratton.'},
    {name:'Jeannie R.',time:'10 months ago',rating:5,text:'You cannot go wrong having your pains disappear at Bratton PT! Individual attention, explanation of each procedure before it is executed! They make it fun!'},
    {name:'Nathan W.',time:'7 months ago',rating:5,text:'I came to seek relief from my Achilles tendon pain and very quickly they worked with me to make a targeted plan to reduce pain long term. Excellent experience.'},
    {name:'Susan B.',time:'6 months ago',rating:5,text:'I had trouble with my right knee. It felt stiff, sore and achy. I tried Bratton Therapy Centre and it was the best decision ever. They came up with a special exercise program just for me.'},
    {name:'Don N.',time:'6 months ago',rating:5,text:'When I came to Bratton for a very weak right shoulder, I was becoming one arm person. After 6 weeks of physical therapy I now have full extension and much less pain. My sleep at night has improved as well.'},
    {name:'Alfred J.',time:'5 months ago',rating:5,text:'The staff is very professional. All guide your routine with caution and care. I began recovery after my first visit. I know my recovery is in good hands. Give them a call!'},
    {name:'Duran H.',time:'4 months ago',rating:5,text:'Extremely friendly staff. They know what they are doing here. I would recommend this place to anyone. Already feeling results after a couple of weeks.'},
    {name:'Nicholas B.',time:'3 months ago',rating:5,text:'My back pain was making day-to-day life absolutely miserable, but coming to see Ms. Jena and her amazing staff has been a total game-changer. I have significantly less pain and more flexibility.'},
    {name:'Paul Rieder',time:'2 months ago',rating:5,text:'Undergoing PT for total hip replacement. The treatment is awesome. I get a custom PT plan focused on my needs and progress. I am so happy that I came to Bratton.'},
    {name:'Jeannie Rivers',time:'1 month ago',rating:5,text:'You cannot go wrong by having your pains disappear when going to Bratton Physical Therapy! Individual attention, explanation of each procedure before it is executed! They make it fun!'}
  ];
  
  var allReviews = [];
  var loaded = false;
  
  // Hide/show the inline HTML trigger button
  function hideBtn(){
    var b = document.querySelector('.br-trigger-btn');
    if(b) b.classList.add('br-hidden');
  }
  function showBtn(){
    var b = document.querySelector('.br-trigger-btn');
    if(b) b.classList.remove('br-hidden');
  }
  
  function openPopup(){
    popup.classList.add('show');
    hideBtn();
    loadReviews();
  }
  
  function closePopup(){
    popup.classList.remove('show');
    showBtn();
  }
  
  function renderReviews(reviews){
    allReviews = reviews;
    var body = popup.querySelector('.br-review-body');
    if(!reviews.length){
      body.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No reviews yet!</p>';
      return;
    }
    body.innerHTML = reviews.map(function(r, i){
      var isLong = r.text.length > 150;
      var displayText = isLong ? r.text.substring(0, 150) + '...' : r.text;
      var cls = isLong ? ' br-review-card long' : ' br-review-card';
      return '<div class="' + cls + '" data-idx="' + i + '">' +
        '<div class="br-review-stars">' + '★'.repeat(r.rating) + '</div>' +
        '<div class="br-review-name">' + r.name + '</div>' +
        '<div class="br-review-text" data-idx="' + i + '">' + displayText + '</div>' +
        '<div class="br-read-more" data-idx="' + i + '">Read more ▼</div>' +
        '<div class="br-review-time">' + r.time + '</div>' +
        '</div>';
    }).join('');
    
    body.querySelectorAll('.br-review-card').forEach(function(card){
      card.addEventListener('click', function(e){
        if(e.target.classList.contains('br-read-more')) return;
        var idx = parseInt(this.getAttribute('data-idx'));
        var textEl = this.querySelector('.br-review-text');
        var moreEl = this.querySelector('.br-read-more');
        toggleText(textEl, moreEl, idx);
      });
    });
    body.querySelectorAll('.br-read-more').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-idx'));
        var textEl = body.querySelector('.br-review-text[data-idx="' + idx + '"]');
        toggleText(textEl, this, idx);
      });
    });
  }
  
  function toggleText(textEl, moreEl, idx){
    var review = allReviews[idx];
    if(!review) return;
    if(textEl.classList.contains('expanded')){
      textEl.classList.remove('expanded');
      textEl.textContent = review.text.length > 150 ? review.text.substring(0, 150) + '...' : review.text;
      if(moreEl) moreEl.innerHTML = 'Read more ▼';
    } else {
      textEl.classList.add('expanded');
      textEl.textContent = review.text;
      if(moreEl) moreEl.innerHTML = 'Show less ▲';
    }
  }
  
  async function loadReviews(){
    if(loaded) return;
    loaded = true;
    try {
      var resp = await fetch('/api/reviews');
      var data = await resp.json();
      if(data.reviews && data.reviews.length){
        renderReviews(data.reviews);
        return;
      }
    } catch(e){}
    renderReviews(fallbackReviews);
  }
  
  // Close on outside click
  document.addEventListener('click', function(e){
    if(popup.classList.contains('show') && !popup.contains(e.target) && !e.target.closest('.br-trigger-btn')){
      closePopup();
    }
  });
  
  // Close button
  popup.querySelector('.br-review-close').addEventListener('click', function(e){
    e.stopPropagation();
    closePopup();
  });
  
  // Auto-open after 5 seconds
  setTimeout(function(){
    openPopup();
  }, 5000);
})();