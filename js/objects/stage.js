class Stage {
    constructor(root, config, callback) {
        this.root = root;
        this.config = config;

        new THREE.FontLoader().load('fonts/opensans.json', ((font) => {
            this.font = font;
            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(100, this.root.clientWidth / this.root.clientHeight, 1, 1000);
            this.camera.position.set(0, 30, 40);
            this.scene.add(this.camera);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(this.config.backgroundColor);

            this.controls = new THREE.MapControls(this.camera, this.renderer.domElement);
            this.controls.minDistance = 1;
            this.controls.maxDistance = 300;
            this.controls.autoRotateSpeed = 1;
            this.controls.autoRotate = false;
            this.controls.enablePan = true;

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(100, 100, 50);
            const ambientLight = new THREE.AmbientLight(0x444444, 2);
            this.camera.add(directionalLight);
            this.camera.add(ambientLight);

            this.stats = new Stats();
            this.root.querySelector('#info').appendChild(this.stats.dom);
            this.root.querySelector('#stage').appendChild(this.renderer.domElement);

            this.update = this.update.bind(this);
            window.addEventListener('resize', this.update);

            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);

            callback(this);

        }).bind(this));
    }

    update() {
        this.camera.aspect = this.root.clientWidth / this.root.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.render();
    }

    render() {
        this.stats.begin();
        this.renderer.render(this.scene, this.camera);
        this.stats.end();
    }
}
