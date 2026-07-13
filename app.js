document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const viewport = document.getElementById('slider-viewport');
    const track = document.getElementById('slider-track');
    const arrowPrev = document.getElementById('arrow-prev');
    const arrowNext = document.getElementById('arrow-next');
    const dots = Array.from(document.querySelectorAll('.dot'));

    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxOrderBtn = document.getElementById('lightbox-order-btn');
    const lightboxWrapper = document.getElementById('lightbox-wrapper');

    // Slide Elements & State
    const slides = Array.from(track.querySelectorAll('.slide'));
    const totalSlides = slides.length;
    let currentSlide = 0;
    
    // Swipe/Drag State
    let isDragging = false;
    let isAnimating = false;
    let startX = 0;
    let dragDiff = 0;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    // Lightbox Zoom & Pan State
    let zoomScale = 1;
    let isDraggingImg = false;
    let imgStartX = 0, imgStartY = 0;
    let panX = 0, panY = 0;
    let lastPanX = 0, lastPanY = 0;

    /* ==========================================================================
       Card Stack Rendering
       ========================================================================== */
    function updateStack() {
        slides.forEach((slide, idx) => {
            // Clean inline transformations and class labels
            slide.style.transform = '';
            slide.style.opacity = '';
            slide.style.filter = '';
            slide.style.zIndex = '';
            slide.style.transition = '';
            
            slide.classList.remove('active', 'next-1', 'next-2', 'hidden-stack');

            // Compute index position relative to the active (top) card
            let diff = idx - currentSlide;
            if (diff < 0) {
                diff += totalSlides; // Looping circular queue behavior
            }

            if (diff === 0) {
                slide.classList.add('active');
            } else if (diff === 1) {
                slide.classList.add('next-1');
            } else if (diff === 2) {
                slide.classList.add('next-2');
            } else {
                slide.classList.add('hidden-stack');
            }
        });

        // Update Dots
        dots.forEach((dot, idx) => {
            if (idx === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    /* ==========================================================================
       Interactive Transitions (Next / Prev)
       ========================================================================== */
    function transitionNext() {
        if (isAnimating) return;
        isAnimating = true;

        const activeSlide = slides[currentSlide];
        const nextIndex = (currentSlide + 1) % totalSlides;
        const nextSlide = slides[nextIndex];

        // Clear active styles and run keyframe CSS deck shuffle animation
        activeSlide.style.transform = '';
        activeSlide.style.opacity = '';
        activeSlide.classList.add('tuck-next-anim');

        // Smooth transition for the next card moving to the front
        nextSlide.style.transition = 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), filter 0.55s ease';
        nextSlide.style.transform = 'translate3d(0, 0, 0) scale(1)';
        nextSlide.style.filter = 'none';

        setTimeout(() => {
            activeSlide.classList.remove('tuck-next-anim');
            currentSlide = nextIndex;
            isAnimating = false;
            updateStack();
        }, 550);
    }

    function transitionPrev() {
        if (isAnimating) return;
        isAnimating = true;

        const activeSlide = slides[currentSlide];
        const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
        const prevSlide = slides[prevIndex];

        // Clear styles and run keyframe shuffling back animation on the bottom card
        prevSlide.style.transform = '';
        prevSlide.style.opacity = '';
        prevSlide.classList.add('tuck-prev-anim');

        // Smooth transition for the active card scaling down behind it
        activeSlide.style.transition = 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), filter 0.55s ease';
        activeSlide.style.transform = 'translate3d(0, 15px, 0) scale(0.95)';
        activeSlide.style.filter = 'brightness(0.95)';

        setTimeout(() => {
            prevSlide.classList.remove('tuck-prev-anim');
            currentSlide = prevIndex;
            isAnimating = false;
            updateStack();
        }, 550);
    }

    function jumpToSlide(index) {
        if (isAnimating || index === currentSlide) return;
        
        // Loop visually using transitions if consecutive, otherwise render immediately
        if (index === (currentSlide + 1) % totalSlides) {
            transitionNext();
        } else if (index === (currentSlide - 1 + totalSlides) % totalSlides) {
            transitionPrev();
        } else {
            currentSlide = index;
            updateStack();
        }
    }

    /* ==========================================================================
       Touch & Mouse Drag Interaction (Tinder-style manual swipe)
       ========================================================================== */
    function getPositionX(event) {
        return event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
    }

    function dragStart(event) {
        if (isAnimating) return;
        
        // Ignore drag/tap tracking if clicking navigation controls, dots, or action buttons
        if (event.target.closest('.slide-order-btn') || 
            event.target.closest('.slide-view-btn') || 
            event.target.closest('.nav-arrow') || 
            event.target.closest('.slider-dots')) {
            return;
        }

        isDragging = true;
        startX = getPositionX(event);
        dragDiff = 0;

        // Record start values to distinguish taps from swipes/scrolls
        touchStartTime = Date.now();
        touchStartX = startX;
        touchStartY = event.type.includes('mouse') ? event.clientY : event.touches[0].clientY;

        const activeSlide = slides[currentSlide];
        const nextSlide = slides[(currentSlide + 1) % totalSlides];
        const prevSlide = slides[(currentSlide - 1 + totalSlides) % totalSlides];

        // Disable transitions on active and stack cards for real-time tracking
        activeSlide.style.transition = 'none';
        if (nextSlide) {
            nextSlide.style.transition = 'none';
        }
        if (prevSlide) {
            prevSlide.style.transition = 'none';
            prevSlide.style.zIndex = '12'; // sit prev on top in case they swipe right
        }
    }

    function dragMove(event) {
        if (!isDragging) return;

        const currentX = getPositionX(event);
        dragDiff = currentX - startX;
        const containerWidth = viewport.offsetWidth;

        const activeSlide = slides[currentSlide];
        const prevSlide = slides[(currentSlide - 1 + totalSlides) % totalSlides];

        // Swipe Left (Reveal next card underneath)
        if (dragDiff < 0) {
            // Drag active card left
            activeSlide.style.transform = `translate3d(${dragDiff}px, 0, 0) rotate(${dragDiff * 0.03}deg)`;
        } 
        // Swipe Right (Pull prev card back over the top)
        else if (dragDiff > 0) {
            const progress = Math.min(1, dragDiff / containerWidth);
            
            // Slide previous card in from left
            if (prevSlide) {
                prevSlide.style.transform = `translate3d(${-containerWidth + dragDiff}px, 0, 0) rotate(${-15 + progress * 15}deg)`;
                prevSlide.style.opacity = `${progress}`;
            }
        }
    }

    function dragEnd(event) {
        if (!isDragging) return;
        isDragging = false;

        const containerWidth = viewport.offsetWidth;
        const threshold = containerWidth * 0.22; // 22% swipe threshold

        const activeSlide = slides[currentSlide];
        const nextSlide = slides[(currentSlide + 1) % totalSlides];
        const prevSlide = slides[(currentSlide - 1 + totalSlides) % totalSlides];

        // Mobile/Desktop Tap detection
        const endX = event.type.includes('mouse') ? event.clientX : event.changedTouches[0].clientX;
        const endY = event.type.includes('mouse') ? event.clientY : event.changedTouches[0].clientY;
        const moveDistX = Math.abs(endX - touchStartX);
        const moveDistY = Math.abs(endY - touchStartY);
        const touchDuration = Date.now() - touchStartTime;

        if (touchDuration < 250 && moveDistX < 8 && moveDistY < 8) {
            // Clean quick tap detected
            isAnimating = false;
            updateStack();

            // If user clicked the WhatsApp order button, let the link navigate
            if (event.target.closest('.slide-order-btn')) {
                return;
            }

            openLightbox(activeSlide);
            return;
        }

        isAnimating = true;

        // Passed left swipe threshold -> run shuffle animation
        if (dragDiff < -threshold) {
            activeSlide.style.transform = '';
            activeSlide.style.opacity = '';
            activeSlide.classList.add('tuck-next-anim');

            if (nextSlide) {
                nextSlide.style.transition = 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), filter 0.55s ease';
                nextSlide.style.transform = 'translate3d(0, 0, 0) scale(1)';
                nextSlide.style.filter = 'none';
            }

            setTimeout(() => {
                activeSlide.classList.remove('tuck-next-anim');
                currentSlide = (currentSlide + 1) % totalSlides;
                isAnimating = false;
                updateStack();
            }, 550);
        }
        // Passed right swipe threshold -> shuffle prev card back in from bottom
        else if (dragDiff > threshold) {
            if (prevSlide) {
                prevSlide.style.transform = '';
                prevSlide.style.opacity = '';
                prevSlide.classList.add('tuck-prev-anim');
            }

            activeSlide.style.transition = 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), filter 0.55s ease';
            activeSlide.style.transform = 'translate3d(0, 0, 0) scale(1)';

            setTimeout(() => {
                if (prevSlide) {
                    prevSlide.classList.remove('tuck-prev-anim');
                }
                currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
                isAnimating = false;
                updateStack();
            }, 550);
        }
        // Swipe threshold not met -> cancel gesture and snap back to origin
        else {
            activeSlide.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease';
            activeSlide.style.transform = 'translate3d(0, 0, 0) scale(1)';
            activeSlide.style.opacity = '1';

            if (prevSlide) {
                prevSlide.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease';
                prevSlide.style.transform = `translate3d(-${containerWidth}px, 0, 0) rotate(-15deg)`;
                prevSlide.style.opacity = '0';
            }

            setTimeout(() => {
                isAnimating = false;
                updateStack();
            }, 300);
        }
    }

    /* ==========================================================================
       Lightbox & Image Zoom System
       ========================================================================== */
    function openLightbox(slideElement) {
        const img = slideElement.querySelector('img');
        const slideIndex = parseInt(slideElement.getAttribute('data-index'), 10);
        const title = slideElement.getAttribute('data-title') || `Poster ${slideIndex + 1}`;
        const description = slideElement.querySelector('.slide-overlay p')?.innerText || "Royal Gifts Zones Collection";
        const orderUrl = slideElement.querySelector('.slide-order-btn')?.getAttribute('href') || "https://wa.me/918610298162";

        // Bind image and caption
        lightboxImg.src = img.src;
        lightboxCaption.innerHTML = `<strong>${title}</strong><br><small>${description}</small>`;
        lightboxOrderBtn.href = orderUrl;

        resetZoomState();

        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            lightboxImg.src = '';
        }, 300);
    }

    function resetZoomState() {
        zoomScale = 1;
        panX = 0;
        panY = 0;
        lastPanX = 0;
        lastPanY = 0;
        applyZoomTransform();
    }

    function applyZoomTransform() {
        lightboxImg.style.transform = `scale(${zoomScale}) translate(${panX / zoomScale}px, ${panY / zoomScale}px)`;
    }

    function adjustZoom(amount) {
        zoomScale = Math.max(1, Math.min(zoomScale + amount, 4));
        if (zoomScale === 1) {
            panX = 0;
            panY = 0;
            lastPanX = 0;
            lastPanY = 0;
        }
        applyZoomTransform();
    }

    // Lightbox Panning & Image Drag
    function startImgDrag(e) {
        if (zoomScale <= 1) return;
        isDraggingImg = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        imgStartX = clientX - lastPanX;
        imgStartY = clientY - lastPanY;
        lightboxWrapper.style.cursor = 'grabbing';
    }

    function dragImg(e) {
        if (!isDraggingImg || zoomScale <= 1) return;
        e.preventDefault();
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        if (clientX === undefined || clientY === undefined) return;

        panX = clientX - imgStartX;
        panY = clientY - imgStartY;

        applyZoomTransform();
    }

    function stopImgDrag() {
        if (!isDraggingImg) return;
        isDraggingImg = false;
        lastPanX = panX;
        lastPanY = panY;
        lightboxWrapper.style.cursor = 'grab';
    }

    function toggleDblClickZoom() {
        if (zoomScale > 1) {
            resetZoomState();
        } else {
            zoomScale = 2;
            applyZoomTransform();
        }
    }

    /* ==========================================================================
       Event Listeners Bindings
       ========================================================================== */
    slides.forEach(slide => {
        // Open Zoom lightbox on slide card clicks (ignore if tapping order btn)
        slide.onclick = (e) => {
            if (e.target.closest('.slide-order-btn')) return;
            openLightbox(slide);
        };

        // Explicit listener for Tap to View button
        const viewBtn = slide.querySelector('.slide-view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(slide);
            });
        }
    });

    // Arrow Navs
    arrowNext.addEventListener('click', transitionNext);
    arrowPrev.addEventListener('click', transitionPrev);

    // Dots Navs
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.getAttribute('data-slide'), 10);
            jumpToSlide(index);
        });
    });

    // Touch Swipe Drag listeners (Mobile)
    viewport.addEventListener('touchstart', dragStart, { passive: true });
    viewport.addEventListener('touchmove', dragMove, { passive: true });
    viewport.addEventListener('touchend', dragEnd);

    // Mouse Drag listeners (Desktop)
    viewport.addEventListener('mousedown', dragStart);
    viewport.addEventListener('mousemove', dragMove);
    viewport.addEventListener('mouseup', dragEnd);
    viewport.addEventListener('mouseleave', dragEnd);

    // Lightbox Modal Controls
    lightboxClose.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxWrapper) {
            closeLightbox();
        }
    });

    // Lightbox Pan Gestures
    lightboxWrapper.addEventListener('mousedown', startImgDrag);
    window.addEventListener('mousemove', dragImg);
    window.addEventListener('mouseup', stopImgDrag);

    lightboxWrapper.addEventListener('touchstart', startImgDrag, { passive: true });
    window.addEventListener('touchmove', dragImg, { passive: false });
    window.addEventListener('touchend', stopImgDrag);

    lightboxImg.addEventListener('dblclick', toggleDblClickZoom);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === '=' || e.key === '+') adjustZoom(0.3);
            if (e.key === '-') adjustZoom(-0.3);
            if (e.key === '0') resetZoomState();
        } else {
            if (e.key === 'ArrowRight') transitionNext();
            if (e.key === 'ArrowLeft') transitionPrev();
        }
    });

    // Initialize Card Stack
    updateStack();
});
