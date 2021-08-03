class Stage {
    constructor(root, config) {
        this.root = root;
        this.config = config;

        this.loaded = new Promise(function (resolve) {
            new THREE.FontLoader().load('font/opensans.json', ((font) => {
                this.fov = 60
                this.font = font;
                this.scene = new THREE.Scene();

                // light
                this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
                this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                this.directionalLight.position.set(100, 100, 100);
                this.directionalLight.layers.set(1);

                // camera 
                this.camera = new THREE.PerspectiveCamera(this.fov, this.root.clientWidth / this.root.clientHeight, 0.1, 1000);
                this.camera.layers.enable(0);
                this.camera.layers.enable(1);
                this.camera.add(this.directionalLight);
                this.camera.add(this.ambientLight);
                this.scene.add(this.camera);

                // renderer
                this.renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true, preserveDrawingBuffer: true, antialias: true });
                this.renderer.setPixelRatio(window.devicePixelRatio);

                // controls
                this.controls = new THREE.MapControls(this.camera, this.renderer.domElement);
                this.controls.minDistance = 0.1;
                this.controls.maxDistance = 500;
                this.controls.autoRotateSpeed = 1;
                this.controls.autoRotate = false;
                this.controls.enablePan = true;

                // user interface
                this.stats = new Stats();
                this.root.querySelector('#info').append(this.stats.dom);
                this.root.querySelector('#stage').append(this.renderer.domElement);

                // reset stage
                this.reset();

                // events
                this.update = this.update.bind(this);
                window.addEventListener('resize', this.update);

                // animations
                this.animate = this.animate.bind(this);
                requestAnimationFrame(this.animate);

                resolve(this);
            }).bind(this));
        }.bind(this));
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

    update() {
        this.renderer.setSize(this.root.clientWidth, this.root.clientHeight);
        this.camera.aspect = this.root.clientWidth / this.root.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    export(zip) {
        const stage = zip.folder('stage');

        // navigator
        const navigator = {};
        for (let key in window.navigator) {
            if (['string', 'array', 'number'].includes(getType(window.navigator[key]))) {
                navigator[key] = window.navigator[key];
            }
        }

        // client
        const client = {
            stage: {
                clientWidth: this.root.clientWidth,
                clientHeight: this.root.clientHeight
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight,
                devicePixelRatio: window.devicePixelRatio
            },
            intl: {
                dateTimeFormat: Intl.DateTimeFormat().resolvedOptions(),
                numberFormat: Intl.NumberFormat().resolvedOptions()
            },
            location: window.location,
            navigator: navigator
        };

        // export config
        stage.file('client.json', JSON.stringify(client, null, 4));

        // export image
        const image = canvasImage(this.renderer.domElement);
        stage.file('image.png', image, { base64: true });
    }

    reset() {
        const size = this.config.forest.ground;
        const coverage = 2 * this.config.drone.height * Math.tan(radian(this.config.drone.camera.view / 2));
        const height = (size + 2 * coverage) / (2 * Math.tan(radian(this.fov / 2)));

        // reset camera position
        this.camera.position.set(0.0, height * 1.1, 0.0);
        this.camera.position.set(0.0, 10.0, 10.0); // TEMP
        this.controls.target.set(0.0, 0.0, 0.0);
        this.controls.update();
        this.update();
        this.render();
    }
};
