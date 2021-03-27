class Slider {
    constructor(root, size) {
        this.root = root;
        this.size = size;

        this.images = root.querySelector('#images');
        this.previews = root.querySelector('#previews');

        this.image = this.images.querySelectorAll('.image');
        this.preview = this.previews.querySelector('.image');

        this.width = { slider: 0, images: 0, image: 0 };
        this.scroll = { start: 0, next: 0, x: 0 };
        this.touch = { start: 0, x: 0 };

        this.images.addEventListener('wheel', this.scrollWheel.bind(this));
        this.images.addEventListener('touchstart', this.touchStart.bind(this));
        this.images.addEventListener('touchmove', this.touchMove.bind(this));
        this.images.addEventListener('touchend', this.touchEnd.bind(this));
        this.images.addEventListener('mousedown', this.touchStart.bind(this));
        this.images.addEventListener('mousemove', this.touchMove.bind(this));
        this.images.addEventListener('mouseleave', this.touchEnd.bind(this));
        this.images.addEventListener('mouseup', this.touchEnd.bind(this));

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

    append(image) {
        // TEST
        if (this.count == 0) {
            this.previews.appendChild(image.cloneNode(true));
        }

        if (this.count >= this.size) {
            const image = this.image[0];
            image.classList.add('removed');
            setTimeout(() => { this.images.removeChild(image); }, 0);
        }
        this.images.appendChild(image);
    }

    clear() {
        this.images.textContent = '';
    }

    update() {
        this.image = this.images.querySelectorAll('.image:not(.removed)');
        this.count = this.image.length;

        if (this.count) {
            this.width = {
                slider: this.images.clientWidth,
                images: this.count * this.width.image,
                image: this.image[0].clientWidth
            };

            gsap.set(this.image, {
                x: (i) => { return i * this.width.image + this.scroll.next; },
                modifiers: { x: (x) => { return gsap.utils.clamp(-this.width.slider, this.width.images, parseInt(x)) + 'px'; } }
            });
            this.image[this.count - 1].style.zIndex = 1;

            return true;
        }

        return false;
    }

    render() {
        this.scroll.x = Math.min(0, Math.max(-this.width.images + this.width.slider, this.scroll.x));
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
