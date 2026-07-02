// Bratton PT — Mobile Adaptation (runs at end of body, DOM already built)
(function(){
  var w = window.innerWidth || document.documentElement.clientWidth;
  var ua = navigator.userAgent || "";
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || w <= 768;
  if (window.location.search.indexOf("mobile=1") !== -1) isMobile = true;
  if (!isMobile) return;

  var body = document.body;

  // Inject black menu bar at top of body
  var bar = document.createElement("div");
  bar.className = "uk-grid uk-grid-collapse uk-grid-width-1-3 g5-mobile-menu";
  bar.setAttribute("data-uk-sticky", "");
  bar.innerHTML = '<div><a href="#offcanvas-menu" data-uk-offcanvas> MENU <i class="uk-icon-bars  uk-icon-justify"></i></a></div>'+
    '<div class="uk-text-center"><a href="#" class="mobile-more-btn"><i class="uk-icon-chevron-down uk-icon-justify"></i> More</a></div>'+
    '<div class="uk-text-right"><a href="tel:9856415825" data-g5-phonelink><i class="uk-icon-phone uk-icon-justify"></i> Call Us</a></div>';
  body.insertBefore(bar, body.firstChild);

  // Inject quick-access panel after header
  var header = body.querySelector("header");
  if (header) {
    var qa = document.createElement("div");
    qa.className = "g5-padding-small-top g5-padding-small-bottom";
    qa.setAttribute("data-uk-observe", "");
    qa.innerHTML = '<div class="uk-container uk-container-center g5-quickaccess g5-padding-small-top g5-padding-small-bottom" style="display:none" data-uk-observe>'+
      '<ul class="uk-grid uk-grid-width-medium-1-2 uk-grid-small g5-quickaccess-buttons" data-uk-grid-margin="">'+
      '<li><a href="tel:9856415825" class="tm-skew g5-mobile-button g5-color-white g5-background-primary g5-hover-background-success" style="border-radius:35px" data-g5-phonelink><span><i class="uk-icon-phone"></i></span><span><div>Click To Call<br/>(985) 641-5825</div></span></a></li>'+
      '<li><a href="https://maps.google.com/maps?q=1346+Lindberg+Drive+Suite+3++Slidell+LA+70458" class="tm-skew g5-mobile-button g5-color-white g5-background-warning g5-hover-background-success" style="border-radius:35px"><span><i class="uk-icon-map"></i></span><span><div>Map Us</div></span></a></li>'+
      '<li><a href="/booking/" class="tm-skew g5-mobile-button g5-color-white g5-background-primary g5-hover-background-success" style="border-radius:35px"><span><i class="uk-icon-calendar"></i></span><span><div>Request an Appointment</div></span></a></li>'+
      '<li><a href="/review_new/" class="tm-skew g5-mobile-button g5-color-white g5-background-warning g5-hover-background-success" style="border-radius:35px"><span><i class="uk-icon-pencil-square-o"></i></span><span><div>Review Us</div></span></a></li>'+
      '<li><a href="/reviews/" class="tm-skew g5-mobile-button g5-color-white g5-background-primary g5-hover-background-success" style="border-radius:35px"><span><i class="uk-icon-star"></i></span><span><div>Our Reviews</div></span></a></li>'+
      '</ul></div>';
    header.parentNode.insertBefore(qa, header.nextSibling);
  }

  // Fix hero text z-index so it doesn't clip into menus
  var heroOverlay = document.querySelector(".uk-overlay-panel");
  if (heroOverlay) {
    heroOverlay.style.zIndex = "1";
  }

  // More button toggle (uses class, not ID — works on all pages)
  document.addEventListener("click", function(e){
    var btn = e.target.closest(".mobile-more-btn");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      var qaEl = document.querySelector(".g5-quickaccess");
      if (qaEl) {
        var cur = qaEl.style.display;
        qaEl.style.display = (cur === "none" || cur === "") ? "block" : "none";
      }
    }
  });

  // Re-init UIKit for injected offcanvas trigger
  if (window.jQuery) {
    try {
      window.jQuery(bar).find("[data-uk-offcanvas]").each(function(){
        window.jQuery.UIkit.offcanvas(window.jQuery(this));
      });
    } catch(e) {}
  }
})();
