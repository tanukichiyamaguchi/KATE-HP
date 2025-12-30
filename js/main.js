/**
 * KATE stage LASH - Main JavaScript
 * Premium Beauty Salon Website
 */

(function() {
    'use strict';

    // =====================================================
    // DOM Elements
    // =====================================================
    const elements = {
        loading: document.getElementById('loading'),
        header: document.getElementById('header'),
        hamburger: document.getElementById('hamburger'),
        mobileMenu: document.getElementById('mobile-menu'),
        nav: document.getElementById('nav'),
        fixedCta: document.querySelector('.fixed-cta'),
        faqItems: document.querySelectorAll('.faq-item'),
        aosElements: document.querySelectorAll('[data-aos]'),
        mobileNavLinks: document.querySelectorAll('.mobile-nav-link'),
        navLinks: document.querySelectorAll('.nav-link')
    };

    // =====================================================
    // Loading Screen
    // =====================================================
    function initLoading() {
        document.body.classList.add('loading');

        window.addEventListener('load', () => {
            setTimeout(() => {
                elements.loading.classList.add('hidden');
                document.body.classList.remove('loading');
                initAOS();
            }, 1800);
        });

        // Fallback: hide loading after 5 seconds
        setTimeout(() => {
            if (!elements.loading.classList.contains('hidden')) {
                elements.loading.classList.add('hidden');
                document.body.classList.remove('loading');
                initAOS();
            }
        }, 5000);
    }

    // =====================================================
    // Header Scroll Effect
    // =====================================================
    function initHeaderScroll() {
        let lastScroll = 0;
        const scrollThreshold = 100;

        function handleScroll() {
            const currentScroll = window.pageYOffset;

            // Add/remove scrolled class
            if (currentScroll > scrollThreshold) {
                elements.header.classList.add('scrolled');
            } else {
                elements.header.classList.remove('scrolled');
            }

            // Show/hide fixed CTA
            if (currentScroll > 600) {
                elements.fixedCta?.classList.add('visible');
            } else {
                elements.fixedCta?.classList.remove('visible');
            }

            lastScroll = currentScroll;
        }

        // Throttle scroll event
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Initial check
        handleScroll();
    }

    // =====================================================
    // Mobile Menu
    // =====================================================
    function initMobileMenu() {
        const { hamburger, mobileMenu, mobileNavLinks } = elements;

        if (!hamburger || !mobileMenu) return;

        function toggleMenu() {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        }

        function closeMenu() {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }

        hamburger.addEventListener('click', toggleMenu);

        // Close menu when clicking on nav links
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMenu();
            }
        });
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
    // Parallax Effect (Hero)
    // =====================================================
    function initParallax() {
        const hero = document.querySelector('.hero-bg');
        if (!hero) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;

            if (scrolled < window.innerHeight) {
                hero.style.transform = `translateY(${rate}px)`;
            }
        });
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
    // Hover Effects Enhancement
    // =====================================================
    function initHoverEffects() {
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
    // Initialize All
    // =====================================================
    function init() {
        initLoading();
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
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
