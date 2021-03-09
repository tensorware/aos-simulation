class Stage {
    constructor(root, config, callback) {
        this.root = root;
        this.config = config;
        this._config = Object.assign({}, this.config);

        new THREE.FontLoader().load('fonts/opensans.json', (font) => {
            this.font = font;
            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(100, this.root.clientWidth / this.root.clientHeight, 1, 1000);
            this.camera.position.set(30, 30, 30);
            this.scene.add(this.camera);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(this.config.backgroundColor);

            this.controls = new THREE.MapControls(this.camera, this.renderer.domElement);
            this.controls.minDistance = 1;
            this.controls.maxDistance = 300;
            this.controls.autoRotateSpeed = 0.2;
            this.controls.autoRotate = false;
            this.controls.enablePan = true;

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(100, 100, 50);
            const ambientLight = new THREE.AmbientLight(0x444444, 2);
            this.camera.add(directionalLight);
            this.camera.add(ambientLight);

            this.root.appendChild(this.renderer.domElement);
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);

            window.addEventListener('resize', this.resize.bind(this), false);
            callback(this);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.render();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        const { clientHeight, clientWidth } = this.root.parentElement;
        this.camera.aspect = clientWidth / clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }
}
