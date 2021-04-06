class Stage {
    constructor(root, config, callback) {
        this.root = root;
        this.config = config;

        new THREE.FontLoader().load('fonts/opensans.json', ((font) => {
            this.font = font;
            this.scene = new THREE.Scene();

            this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            this.directionalLight.position.set(100, 100, 100);
            this.ambientLight = new THREE.AmbientLight(0x444444, 2);

            this.camera = new THREE.PerspectiveCamera(90, this.root.clientWidth / this.root.clientHeight, 0.1, 1000);
            this.camera.layers.enable(0);
            this.camera.layers.enable(1);
            this.camera.position.set(0, 45, 65);
            this.camera.add(this.directionalLight);
            this.camera.add(this.ambientLight);
            this.scene.add(this.camera);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);

            this.controls = new THREE.MapControls(this.camera, this.renderer.domElement);
            this.controls.minDistance = 0.1;
            this.controls.maxDistance = 500;
            this.controls.autoRotateSpeed = 1;
            this.controls.autoRotate = false;
            this.controls.enablePan = true;

            this.stats = new Stats();
            this.root.querySelector('#info').append(this.stats.dom);
            this.root.querySelector('#stage').append(this.renderer.domElement);

            this.update = this.update.bind(this);
            window.addEventListener('resize', this.update);

            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);

            callback(this);

        }).bind(this));
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.render();
    }

    update() {
        this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
        this.camera.aspect = this.root.clientWidth / this.root.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    render() {
        this.stats.begin();
        this.renderer.render(this.scene, this.camera);
        this.stats.end();
    }
}
