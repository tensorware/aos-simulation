class Slider {
    constructor(root) {
        this.root = root;

        this.images = root.querySelector('#images');
        this.image = root.querySelectorAll('.image');

        this.width = {
            captures: 0,
            images: 0,
            image: 0
        };

        this.scroll = {
            start: 0,
            next: 0,
            x: 0
        };

        this.touch = {
            start: 0,
            x: 0
        };

        this.root.addEventListener('wheel', this.scrollWheel.bind(this));
        this.root.addEventListener('touchstart', this.touchStart.bind(this));
        this.root.addEventListener('touchmove', this.touchMove.bind(this));
        this.root.addEventListener('touchend', this.touchEnd.bind(this));
        this.root.addEventListener('mousedown', this.touchStart.bind(this));
        this.root.addEventListener('mousemove', this.touchMove.bind(this));
        this.root.addEventListener('mouseleave', this.touchEnd.bind(this));
        this.root.addEventListener('mouseup', this.touchEnd.bind(this));

        // TODO stay on current items
        window.addEventListener('resize', this.update.bind(this));

        this.render = this.render.bind(this);
        requestAnimationFrame(this.render);
    }

    scrollWheel(e) {
        this.scroll.x -= e.deltaY * 5.0;
    }

    touchStart(e) {
        this.touch.start = e.clientX || e.touches && e.touches[0].clientX || this.touch.start;
        this.images.classList.add('dragging');
    }

    touchMove(e) {
        if (!this.images.classList.contains('dragging')) {
            return;
        }

        this.touch.x = e.clientX || e.touches && e.touches[0].clientX || this.touch.x;
        this.scroll.x += (this.touch.x - this.touch.start) * 2.5;
        this.touch.start = this.touch.x;
    }

    touchEnd() {
        this.images.classList.remove('dragging');
    }

    append(element) {
        this.images.appendChild(element);
    }

    clear() {
        this.images.textContent = '';
    }

    update() {
        this.image = document.querySelectorAll('.image');

        if (this.image.length) {

            this.width = {
                captures: this.root.clientWidth,
                images: this.image.length * this.width.image,
                image: this.image[0].clientWidth
            };

            gsap.set(this.image, {
                x: (i) => { return i * this.width.image + this.scroll.next; },
                modifiers: { x: (x) => { return gsap.utils.clamp(-this.width.captures, this.width.images, parseInt(x)) + 'px'; } }
            });
            this.image[this.image.length - 1].style.zIndex = 1;

            return true;
        }

        return false;
    }

    render() {
        this.scroll.x = Math.min(0, Math.max(-this.width.images + this.width.captures, this.scroll.x));
        this.scroll.next = interpolate(this.scroll.next, this.scroll.x, 0.1);

        if (this.update()) {
            const speed = this.scroll.next - this.scroll.start;

            this.scroll.start = this.scroll.next;

            gsap.to(this.image, {
                skewX: -speed * 0.2,
                rotate: speed * 0.01,
                scale: 1 - Math.min(100, Math.abs(speed)) * 0.003
            });
        }
        else {
            this.scroll = {
                start: 0,
                next: 0,
                x: 0
            };
        }

        requestAnimationFrame(this.render);
    }
}
