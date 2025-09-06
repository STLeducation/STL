// Apple-style STL About Page JavaScript
// Focused on smooth, natural interactions and performance

class STLAboutPage {
  constructor() {
    this.init();
    this.bindEvents();
    this.setupIntersectionObserver();
    this.initScrollEffects();
  }

  init() {
    // Preload and setup
    document.body.classList.add("loaded");
    this.setupNavigation();
    this.setupHeroParallax();
    this.setupTimelineAnimations();
  }

  bindEvents() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", this.handleSmoothScroll.bind(this));
    });

    // Navigation interactions
    document.querySelectorAll(".globalnav-link").forEach((link) => {
      link.addEventListener("click", this.handleNavigation.bind(this));
    });

    // Team card interactions
    document.querySelectorAll(".team-card").forEach((card) => {
      card.addEventListener("mouseenter", this.handleTeamCardHover.bind(this));
      card.addEventListener("mouseleave", this.handleTeamCardLeave.bind(this));
    });

    // Window events
    window.addEventListener("scroll", this.handleScroll.bind(this), {
      passive: true,
    });
    window.addEventListener("resize", this.handleResize.bind(this), {
      passive: true,
    });
  }

  setupNavigation() {
    const nav = document.querySelector(".globalnav");
    let lastScroll = 0;

    window.addEventListener(
      "scroll",
      () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
          nav.style.backgroundColor = "rgba(29, 29, 31, 0.95)";
        } else {
          nav.style.backgroundColor = "rgba(29, 29, 31, 0.72)";
        }

        lastScroll = currentScroll;
      },
      { passive: true }
    );
  }

  setupHeroParallax() {
    const hero = document.querySelector(".hero");
    const heroContent = document.querySelector(".hero-content");

    if (!hero || !heroContent) return;

    window.addEventListener(
      "scroll",
      () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        heroContent.style.transform = `translateY(${rate}px)`;
      },
      { passive: true }
    );
  }

  setupIntersectionObserver() {
    const options = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
        }
      });
    }, options);

    // Observe timeline items
    document.querySelectorAll(".timeline-item").forEach((item) => {
      observer.observe(item);
    });

    // Observe sections for fade-in effects
    document.querySelectorAll(".section").forEach((section) => {
      observer.observe(section);
    });
  }

  setupTimelineAnimations() {
    const timelineItems = document.querySelectorAll(".timeline-item");

    timelineItems.forEach((item, index) => {
      item.style.transitionDelay = `${index * 0.1}s`;

      // Add hover effects
      const content = item.querySelector(".timeline-content");
      if (content) {
        content.addEventListener("mouseenter", () => {
          this.animateTimelineHover(item, true);
        });

        content.addEventListener("mouseleave", () => {
          this.animateTimelineHover(item, false);
        });
      }
    });
  }

  initScrollEffects() {
    // Navbar background changes
    const navbar = document.querySelector(".globalnav");
    let ticking = false;

    const updateNavbar = () => {
      const scrollY = window.scrollY;

      if (scrollY > 50) {
        navbar.style.backgroundColor = "rgba(29, 29, 31, 0.95)";
        navbar.style.borderBottomColor = "rgba(255, 255, 255, 0.15)";
      } else {
        navbar.style.backgroundColor = "rgba(29, 29, 31, 0.72)";
        navbar.style.borderBottomColor = "rgba(255, 255, 255, 0.1)";
      }

      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(updateNavbar);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  handleSmoothScroll(e) {
    e.preventDefault();

    const targetId = e.currentTarget.getAttribute("href").substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 60; // Account for fixed navbar

      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  }

  handleNavigation(e) {
    const item = e.currentTarget.dataset.item;

    if (item === "dashboard") {
      // Animate out before navigation
      document.body.style.opacity = "0";
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    } else if (item === "configuracoes") {
      // Shake animation for not implemented
      e.currentTarget.style.animation = "shake 0.5s";
      setTimeout(() => {
        e.currentTarget.style.animation = "";
        alert("Página de configurações em desenvolvimento.");
      }, 500);
    }
  }

  handleTeamCardHover(e) {
    const card = e.currentTarget;
    const avatar = card.querySelector(".member-avatar");

    // Subtle scale and glow effect
    card.style.transform = "translateY(-12px) scale(1.03)";
    card.style.boxShadow =
      "0 25px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";

    if (avatar) {
      avatar.style.transform = "scale(1.1) rotateY(5deg)";
    }
  }

  handleTeamCardLeave(e) {
    const card = e.currentTarget;
    const avatar = card.querySelector(".member-avatar");

    card.style.transform = "";
    card.style.boxShadow = "";

    if (avatar) {
      avatar.style.transform = "";
    }
  }

  animateTimelineHover(item, isHovering) {
    const marker = item.querySelector(".timeline-marker");
    const content = item.querySelector(".timeline-content");

    if (isHovering) {
      marker.style.transform = "translateX(-50%) scale(1.3)";
      content.style.transform = "translateY(-8px)";
    } else {
      marker.style.transform = "translateX(-50%) scale(1)";
      content.style.transform = "translateY(0)";
    }
  }

  handleScroll() {
    // Throttled scroll handler for performance
    if (this.scrollTimeout) return;

    this.scrollTimeout = setTimeout(() => {
      this.updateScrollEffects();
      this.scrollTimeout = null;
    }, 16); // ~60fps
  }

  updateScrollEffects() {
    const scrollY = window.scrollY;

    // Parallax effect for hero elements
    const heroVisual = document.querySelector(".hero-visual-element");
    if (heroVisual) {
      heroVisual.style.transform = `rotate(${scrollY * 0.1}deg)`;
    }

    // Update progress indicator if needed
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    // You can add a progress bar here if needed
    document.documentElement.style.setProperty(
      "--scroll-progress",
      `${scrolled}%`
    );
  }

  handleResize() {
    // Throttled resize handler
    if (this.resizeTimeout) return;

    this.resizeTimeout = setTimeout(() => {
      this.updateLayout();
      this.resizeTimeout = null;
    }, 250);
  }

  updateLayout() {
    // Recalculate any layout-dependent animations
    const timelineItems = document.querySelectorAll(".timeline-item");
    timelineItems.forEach((item) => {
      // Reset and recalculate positions if needed
      item.style.transition = "none";
      setTimeout(() => {
        item.style.transition = "";
      }, 10);
    });
  }

  // Easter eggs and special interactions
  initEasterEggs() {
    let konamiCode = [];
    const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

    document.addEventListener("keydown", (e) => {
      konamiCode.push(e.keyCode);
      konamiCode = konamiCode.slice(-10);

      if (konamiCode.join("") === konamiSequence.join("")) {
        this.triggerFEBRACEAnimation();
      }
    });

    // Double-click on hero title
    const heroTitle = document.querySelector(".hero-headline-main");
    if (heroTitle) {
      let clickCount = 0;
      heroTitle.addEventListener("click", () => {
        clickCount++;
        if (clickCount === 2) {
          this.triggerTitleAnimation();
          clickCount = 0;
        }
        setTimeout(() => (clickCount = 0), 500);
      });
    }
  }

  triggerFEBRACEAnimation() {
    const febraceItem = document.querySelector(".timeline-featured");
    if (febraceItem) {
      febraceItem.style.animation = "pulse 1s ease-in-out 3";

      // Create confetti effect
      for (let i = 0; i < 30; i++) {
        this.createConfetti();
      }
    }
  }

  triggerTitleAnimation() {
    const title = document.querySelector(".hero-headline-main");
    if (title) {
      title.style.animation =
        "rotate 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
      setTimeout(() => {
        title.style.animation = "";
      }, 1000);
    }
  }

  createConfetti() {
    const colors = ["#007aff", "#af52de", "#ff2d92", "#ff9500", "#30d158"];
    const confetti = document.createElement("div");

    confetti.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: -10px;
      left: ${Math.random() * 100}%;
      z-index: 10000;
      border-radius: 50%;
      pointer-events: none;
    `;

    document.body.appendChild(confetti);

    const animation = confetti.animate(
      [
        { transform: "translateY(-10px) rotate(0deg)", opacity: 1 },
        {
          transform: `translateY(${window.innerHeight + 20}px) rotate(${
            360 * (Math.random() - 0.5)
          }deg)`,
          opacity: 0,
        },
      ],
      {
        duration: Math.random() * 3000 + 2000,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }
    );

    animation.addEventListener("finish", () => {
      confetti.remove();
    });
  }

  // Performance monitoring
  initPerformanceMonitoring() {
    // Monitor frame rate
    let frameCount = 0;
    let lastTime = Date.now();

    const checkFrameRate = () => {
      frameCount++;
      const currentTime = Date.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        // Adjust animations based on performance
        if (fps < 30) {
          document.body.classList.add("reduced-motion");
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(checkFrameRate);
    };

    requestAnimationFrame(checkFrameRate);
  }

  // Accessibility enhancements
  initAccessibility() {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (prefersReducedMotion.matches) {
      document.body.classList.add("reduced-motion");
    }

    // Keyboard navigation improvements
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        document.body.classList.add("keyboard-navigation");
      }
    });

    document.addEventListener("mousedown", () => {
      document.body.classList.remove("keyboard-navigation");
    });

    // Focus management for carousel
    const carousel = document.querySelector(".team-carousel");
    if (carousel) {
      carousel.addEventListener("focus", () => {
        carousel.style.animationPlayState = "paused";
      });

      carousel.addEventListener("blur", () => {
        carousel.style.animationPlayState = "running";
      });
    }
  }
}

// CSS animations for JavaScript effects
const additionalStyles = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .keyboard-navigation *:focus {
    outline: 2px solid #007aff;
    outline-offset: 2px;
  }

  body.loaded {
    opacity: 1;
  }

  .team-carousel:focus-within {
    animation-play-state: paused;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 122, 255, 0.5);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 122, 255, 0.8);
  }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Utility functions
const utils = {
  // Smooth easing functions
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Throttle function for performance
  throttle: (func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Debounce function for resize events
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Check if element is in viewport
  isInViewport: (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Get scroll progress
  getScrollProgress: () => {
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    return (winScroll / height) * 100;
  },
};

// Enhanced STL About Page with all Apple-style features
STLAboutPage.prototype.initAdvancedFeatures = function () {
  this.initEasterEggs();
  this.initPerformanceMonitoring();
  this.initAccessibility();
  this.setupAdvancedScrollEffects();
  this.initMagneticButtons();
};

STLAboutPage.prototype.setupAdvancedScrollEffects = function () {
  // Create a scroll progress indicator
  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 2px;
    background: linear-gradient(90deg, #007aff, #af52de);
    z-index: 10001;
    transition: width 0.1s ease-out;
  `;
  document.body.appendChild(progressBar);

  const updateProgress = utils.throttle(() => {
    const progress = utils.getScrollProgress();
    progressBar.style.width = `${progress}%`;
  }, 16);

  window.addEventListener("scroll", updateProgress, { passive: true });
};

STLAboutPage.prototype.initMagneticButtons = function () {
  const buttons = document.querySelectorAll(
    ".button-primary, .button-hero, .button-secondary"
  );

  buttons.forEach((button) => {
    button.addEventListener("mousemove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
    });
  });
};

// Page load sequence with Apple-style timing
STLAboutPage.prototype.initLoadSequence = function () {
  // Set initial state
  document.body.style.opacity = "0";

  // Fade in page
  setTimeout(() => {
    document.body.style.transition =
      "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    document.body.style.opacity = "1";
  }, 100);

  // Animate hero elements in sequence
  setTimeout(() => {
    const heroElements = [
      ".hero-headline-sub",
      ".hero-headline-main",
      ".hero-subhead",
      ".hero-cta",
    ];

    heroElements.forEach((selector, index) => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.opacity = "0";
        element.style.transform = "translateY(30px)";

        setTimeout(() => {
          element.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
          element.style.opacity = "1";
          element.style.transform = "translateY(0)";
        }, index * 200);
      }
    });
  }, 200);
};

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check for GSAP support and fallback gracefully
  const hasGSAP = typeof gsap !== "undefined";

  if (!hasGSAP) {
    console.log("🍎 STL About page loading with native animations...");
  }

  // Initialize the main application
  const app = new STLAboutPage();
  app.initAdvancedFeatures();
  app.initLoadSequence();

  // Make app globally available for debugging
  window.STLApp = app;
  window.STLUtils = utils;

  console.log("🚀 STL About page loaded with Apple-style interactions!");
});

// Handle page visibility changes
document.addEventListener("visibilitychange", () => {
  const carousel = document.querySelector(".team-carousel");
  if (carousel) {
    if (document.hidden) {
      carousel.style.animationPlayState = "paused";
    } else {
      carousel.style.animationPlayState = "running";
    }
  }
});

// Service worker registration for PWA-like experience (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}
