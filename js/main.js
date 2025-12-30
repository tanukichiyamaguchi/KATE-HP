/**
 * KATE stage LASH - Main JavaScript
 * Premium Beauty Salon Website
 * Mobile-First Optimized
 */

(function() {
    'use strict';

    // =====================================================
    // Mobile Detection & Config
    // =====================================================
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // =====================================================
    // DOM Elements
    // =====================================================
    const elements = {
        loading: document.getElementById('loading'),
        header: document.getElementById('header'),
        hamburger: document.getElementById('hamburger'),
        mobileMenu: document.getElementById('mobile-menu'),
        nav: document.getElementById('nav'),
        hero: document.getElementById('hero'),
        fixedCta: document.querySelector('.fixed-cta'),
        faqItems: document.querySelectorAll('.faq-item'),
        aosElements: document.querySelectorAll('[data-aos]'),
        mobileNavLinks: document.querySelectorAll('.mobile-nav-link'),
        navLinks: document.querySelectorAll('.nav-link')
    };

    // =====================================================
    // Mobile Viewport Height Fix (100vh issue on mobile)
    // =====================================================
    function initMobileViewportFix() {
        function setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }

        setViewportHeight();

        // Update on resize and orientation change
        window.addEventListener('resize', debounce(setViewportHeight, 100));
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100);
        });
    }

    // =====================================================
    // Debounce Helper
    // =====================================================
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // =====================================================
    // Loading Screen
    // =====================================================
    function initLoading() {
        document.body.classList.add('loading');

        // Faster loading on mobile
        const loadingDelay = isMobile ? 1200 : 1800;

        window.addEventListener('load', () => {
            setTimeout(() => {
                elements.loading.classList.add('hidden');
                document.body.classList.remove('loading');
                initAOS();
            }, loadingDelay);
        });

        // Fallback: hide loading after 4 seconds (faster on mobile)
        const fallbackDelay = isMobile ? 3000 : 5000;
        setTimeout(() => {
            if (!elements.loading.classList.contains('hidden')) {
                elements.loading.classList.add('hidden');
                document.body.classList.remove('loading');
                initAOS();
            }
        }, fallbackDelay);
    }

    // =====================================================
    // Header Scroll Effect
    // =====================================================
    function initHeaderScroll() {
        let lastScroll = 0;
        const scrollThreshold = isMobile ? 50 : 100;
        const ctaShowThreshold = isMobile ? 400 : 600;

        function handleScroll() {
            const currentScroll = window.pageYOffset;

            // Add/remove scrolled class
            if (currentScroll > scrollThreshold) {
                elements.header.classList.add('scrolled');
            } else {
                elements.header.classList.remove('scrolled');
            }

            // Show/hide fixed CTA based on hero visibility
            if (elements.hero) {
                const heroRect = elements.hero.getBoundingClientRect();
                const heroVisible = heroRect.bottom > 100;

                if (heroVisible) {
                    document.body.classList.add('hero-visible');
                    elements.fixedCta?.classList.remove('visible');
                } else {
                    document.body.classList.remove('hero-visible');
                    elements.fixedCta?.classList.add('visible');
                }
            } else {
                // Fallback if no hero element
                if (currentScroll > ctaShowThreshold) {
                    elements.fixedCta?.classList.add('visible');
                } else {
                    elements.fixedCta?.classList.remove('visible');
                }
            }

            lastScroll = currentScroll;
        }

        // Use passive listener for better scroll performance on mobile
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        // Initial check
        handleScroll();
    }

    // =====================================================
    // Mobile Menu
    // =====================================================
    function initMobileMenu() {
        const { hamburger, mobileMenu, mobileNavLinks } = elements;

        if (!hamburger || !mobileMenu) return;

        let scrollPosition = 0;

        function lockScroll() {
            scrollPosition = window.pageYOffset;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollPosition}px`;
            document.body.style.width = '100%';
        }

        function unlockScroll() {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollPosition);
        }

        function toggleMenu() {
            const isOpening = !hamburger.classList.contains('active');

            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');

            if (isOpening) {
                lockScroll();
            } else {
                unlockScroll();
            }
        }

        function closeMenu() {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
            unlockScroll();
        }

        // Use touchend for faster response on mobile
        const clickEvent = isTouch ? 'touchend' : 'click';

        hamburger.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            toggleMenu();
        });

        // Also add click listener for accessibility
        if (isTouch) {
            hamburger.addEventListener('click', (e) => {
                e.preventDefault();
            });
        }

        // Close menu when clicking on nav links
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Small delay for visual feedback
                setTimeout(closeMenu, 150);
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // Prevent scroll on menu when open (for iOS)
        mobileMenu.addEventListener('touchmove', (e) => {
            if (mobileMenu.classList.contains('active')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // =====================================================
    // Smooth Scroll
    // =====================================================
    function initSmoothScroll() {
        const allNavLinks = [...elements.navLinks, ...elements.mobileNavLinks];

        allNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const headerHeight = elements.header.offsetHeight;
                        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });

        // Smooth scroll for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerHeight = elements.header.offsetHeight;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // =====================================================
    // FAQ Accordion
    // =====================================================
    function initFAQ() {
        const { faqItems } = elements;

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');

            if (!question || !answer) return;

            question.addEventListener('click', () => {
                const isExpanded = question.getAttribute('aria-expanded') === 'true';

                // Close all other items
                faqItems.forEach(otherItem => {
                    const otherQuestion = otherItem.querySelector('.faq-question');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherItem !== item) {
                        otherQuestion?.setAttribute('aria-expanded', 'false');
                        otherAnswer?.classList.remove('active');
                    }
                });

                // Toggle current item
                question.setAttribute('aria-expanded', !isExpanded);
                answer.classList.toggle('active');
            });
        });
    }

    // =====================================================
    // Animate on Scroll (Custom AOS)
    // =====================================================
    function initAOS() {
        const { aosElements } = elements;

        if (!aosElements.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.aosDelay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('aos-animate');
                    }, parseInt(delay));
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        aosElements.forEach(element => {
            observer.observe(element);
        });
    }

    // =====================================================
    // Hero Video Handler
    // =====================================================
    function initHeroVideo() {
        const video = document.querySelector('.hero-video');
        const fallback = document.querySelector('.hero-video-fallback');

        if (!video || !fallback) return;

        // Hide fallback when video can play
        video.addEventListener('canplay', () => {
            fallback.style.opacity = '0';
            fallback.style.visibility = 'hidden';
        });

        video.addEventListener('playing', () => {
            fallback.style.opacity = '0';
            fallback.style.visibility = 'hidden';
        });

        // Show fallback if video fails to load
        video.addEventListener('error', () => {
            fallback.style.opacity = '1';
            fallback.style.visibility = 'visible';
            video.style.display = 'none';
        });

        // If video is already ready (cached)
        if (video.readyState >= 3) {
            fallback.style.opacity = '0';
            fallback.style.visibility = 'hidden';
        }

        // Try to play video (handles autoplay restrictions)
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Autoplay was prevented, show fallback
                console.log('Video autoplay prevented');
            });
        }
    }

    // =====================================================
    // Parallax Effect (Hero) - Disabled on Mobile
    // =====================================================
    function initParallax() {
        // Skip parallax on mobile for better performance
        if (isMobile || isTouch) return;

        const hero = document.querySelector('.hero-bg');
        if (!hero) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;

            if (scrolled < window.innerHeight) {
                hero.style.transform = `translateY(${rate}px)`;
            }
        }, { passive: true });
    }

    // =====================================================
    // Active Navigation Highlight
    // =====================================================
    function initActiveNavHighlight() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -80% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // =====================================================
    // Image Lazy Loading
    // =====================================================
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    // =====================================================
    // Counter Animation
    // =====================================================
    function initCounterAnimation() {
        const counters = document.querySelectorAll('.hero-feature-number');

        const animateCounter = (element, target) => {
            const duration = 2000;
            const start = 0;
            const startTime = performance.now();

            const updateCounter = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-out)
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (target - start) * easeOut);

                element.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    element.textContent = target;
                }
            };

            requestAnimationFrame(updateCounter);
        };

        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const target = parseFloat(element.textContent);
                    if (!isNaN(target)) {
                        animateCounter(element, target);
                    }
                    observer.unobserve(element);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    // =====================================================
    // Form Validation (if form exists)
    // =====================================================
    function initFormValidation() {
        const forms = document.querySelectorAll('form[data-validate]');

        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const inputs = form.querySelectorAll('[required]');
                let isValid = true;

                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        isValid = false;
                        input.classList.add('error');
                    } else {
                        input.classList.remove('error');
                    }

                    // Email validation
                    if (input.type === 'email') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(input.value)) {
                            isValid = false;
                            input.classList.add('error');
                        }
                    }
                });

                if (!isValid) {
                    e.preventDefault();
                }
            });
        });
    }

    // =====================================================
    // Accessibility Improvements
    // =====================================================
    function initAccessibility() {
        // Focus visible polyfill
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // Skip to content
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                const main = document.querySelector('main') || document.querySelector('#hero');
                if (main) {
                    main.focus();
                    main.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }

    // =====================================================
    // Performance Optimization
    // =====================================================
    function initPerformanceOptimization() {
        // Prefetch pages on hover
        const links = document.querySelectorAll('a[href^="/"]:not([data-no-prefetch])');

        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                const href = link.getAttribute('href');
                if (href && !document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
                    const prefetchLink = document.createElement('link');
                    prefetchLink.rel = 'prefetch';
                    prefetchLink.href = href;
                    document.head.appendChild(prefetchLink);
                }
            });
        });
    }

    // =====================================================
    // Hover Effects Enhancement - Desktop Only
    // =====================================================
    function initHoverEffects() {
        // Skip hover effects on touch devices
        if (isTouch) return;

        // Feature cards magnetic effect
        const featureCards = document.querySelectorAll('.feature-card');

        featureCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }

    // =====================================================
    // Mobile-specific Touch Enhancements
    // =====================================================
    function initMobileTouchEnhancements() {
        if (!isTouch) return;

        // Add active state feedback for buttons
        const buttons = document.querySelectorAll('.btn-3d, .btn-line, .faq-question');

        buttons.forEach(btn => {
            btn.addEventListener('touchstart', () => {
                btn.classList.add('touch-active');
            }, { passive: true });

            btn.addEventListener('touchend', () => {
                setTimeout(() => {
                    btn.classList.remove('touch-active');
                }, 150);
            }, { passive: true });

            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('touch-active');
            }, { passive: true });
        });

        // Prevent zoom on double tap for specific elements
        const preventZoomElements = document.querySelectorAll('button, a, .btn-3d');
        let lastTouchEnd = 0;

        preventZoomElements.forEach(el => {
            el.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });
        });
    }

    // =====================================================
    // Initialize All
    // =====================================================
    function init() {
        // Mobile-first initializations
        initMobileViewportFix();
        initMobileTouchEnhancements();

        // Core functionality
        initLoading();
        initHeroVideo();
        initHeaderScroll();
        initMobileMenu();
        initSmoothScroll();
        initFAQ();
        initParallax();
        initActiveNavHighlight();
        initLazyLoading();
        initCounterAnimation();
        initFormValidation();
        initAccessibility();
        initPerformanceOptimization();
        initHoverEffects();

        // Add device class to body for CSS targeting
        if (isMobile) {
            document.body.classList.add('is-mobile');
        }
        if (isTouch) {
            document.body.classList.add('is-touch');
        }

        // Log device info for debugging (remove in production)
        console.log(`Device: ${isMobile ? 'Mobile' : 'Desktop'}, Touch: ${isTouch ? 'Yes' : 'No'}`);
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
