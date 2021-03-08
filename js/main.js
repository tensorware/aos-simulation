const CONFIG = {
    droneSpeed: 4,
    droneHeight: 35.,
    droneEastWest: .0,
    droneNorthSouth: .0,
    cameraView: 50,
    cameraSampling: 1,
    cameraResolution: 512,
    processingSpeed: 0.5,
    trees: 50,
    segments: 6,
    levels: 5,
    vMultiplier: 2.36,
    twigScale: 0.39,
    initalBranchLength: 0.49,
    lengthFalloffFactor: 0.85,
    lengthFalloffPower: 0.99,
    clumpMax: 0.454,
    clumpMin: 0.404,
    branchFactor: 2.45,
    dropAmount: -0.1,
    growAmount: 0.235,
    sweepAmount: 0.01,
    maxRadius: 0.139,
    climbRate: 0.5,
    trunkKink: 0.09,
    treeSteps: 8,
    taperRate: 0.947,
    radiusFalloffRate: 0.73,
    twistRate: 3.02,
    trunkLength: 2.4,
    treeColor: 0x613615,
    twigColor: 0x418c45,
    groundColor: 0x595959,
    backgroundColor: 0x8fbde8
};

const ROOT = document.querySelector('#root');


class Stage {
    constructor(root, config) {
        this.root = root;
        this.config = config;

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
        this.controls.autoRotate = true;
        this.controls.enablePan = true;

        const light = new THREE.DirectionalLight(0xFFFFFF, 1);
        light.position.set(100, 100, 50);
        this.camera.add(light);
        this.camera.add(new THREE.AmbientLight(0x444444, 2));

        this.root.appendChild(this.renderer.domElement);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        window.addEventListener('resize', this.resize.bind(this), false);
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


class Forest {
    constructor(stage) {
        this.root = stage.root;
        this.config = stage.config;
        this.scene = stage.scene;
        this.stage = stage;

        this.trees = [];
        this.grounds = [];
        this.positions = [];
        this.groundSize = 32.6 * 2;

        this.groundMaterial = new THREE.MeshStandardMaterial({
            color: this.config.groundColor,
            side: THREE.DoubleSide,
            roughness: 1.0,
            metalness: 0.3
        });

        this.treeMaterial = new THREE.MeshStandardMaterial({
            color: this.config.treeColor,
            roughness: 1.0,
            metalness: 0.3
        });

        this.twigMaterial = new THREE.MeshStandardMaterial({
            map: new THREE.TextureLoader().load('../img/leaf.png'),
            color: this.config.twigColor,
            roughness: 1.0,
            metalness: 0.3,
            alphaTest: 0.8
        });

        this.update();

        this.addGround();
        this.addTrees();
    }

    addGround() {
        const geometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
        geometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        const plane = new THREE.Mesh(geometry, this.groundMaterial);

        this.grounds.push(plane);
        this.scene.add(plane);
    }

    addTree(index) {
        const tree = new Tree({ ...this.config, seed: randomInt(0, 1000) });

        const treeGeometry = new THREE.BufferGeometry();
        treeGeometry.setAttribute('position', createFloatAttribute(tree.verts, 3));
        treeGeometry.setAttribute('normal', normalizeAttribute(createFloatAttribute(tree.normals, 3)));
        treeGeometry.setAttribute('uv', createFloatAttribute(tree.UV, 2));
        treeGeometry.setIndex(createIntAttribute(tree.faces, 1));

        const twigGeometry = new THREE.BufferGeometry();
        twigGeometry.setAttribute('position', createFloatAttribute(tree.vertsTwig, 3));
        twigGeometry.setAttribute('normal', normalizeAttribute(createFloatAttribute(tree.normalsTwig, 3)));
        twigGeometry.setAttribute('uv', createFloatAttribute(tree.uvsTwig, 2));
        twigGeometry.setIndex(createIntAttribute(tree.facesTwig, 1));

        const treeGroup = new THREE.Group();
        treeGroup.add(new THREE.Mesh(treeGeometry, this.treeMaterial));
        treeGroup.add(new THREE.Mesh(twigGeometry, this.twigMaterial));

        treeGroup.position.x = this.positions[index].x;
        treeGroup.position.z = this.positions[index].y;

        this.trees.push(treeGroup);
        this.scene.add(treeGroup);
    }

    addTrees() {
        this.clear();
        for (let i = 0; i < this.config.trees; i++) {
            this.addTree(i);
        }
    }

    update() {
        this.positions = [];
        for (let i = 0; i < 1000; i++) {
            this.positions.push({
                x: randomInt(-this.groundSize / 2, this.groundSize / 2),
                y: randomInt(-this.groundSize / 2, this.groundSize / 2)
            });
        }
    }

    clear() {
        this.trees.forEach((tree) => {
            this.scene.remove(tree);
        });
    }

    reset() {
        Object.assign(this.config, CONFIG);
        this.treeMaterial.color.setHex(this.config.treeColor);
        this.twigMaterial.color.setHex(this.config.twigColor);
        this.groundMaterial.color.setHex(this.config.groundColor);
        this.update();
        this.addTrees();
    }
}


class Drone {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        this.drone = {};
        this.camera = {};
        this.cpu = {};
        this.image = {};
        this.goal = { x: 0, y: 0 };

        this.captures = [];

        const cameraGeometry = new THREE.ConeGeometry();
        const cameraMaterial = new THREE.MeshStandardMaterial({ color: 0x98be1f });
        this.camera.cone = new THREE.Mesh(cameraGeometry, cameraMaterial);

        this.lines = [];
        for (let i = 0; i < 4; i++) {
            this.lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, this.camera.height, 0),
                new THREE.Vector3(0, 0, 0)
            ]), new THREE.LineBasicMaterial({ color: 0x990000 })));
        }

        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        planeGeometry.rotateX(-Math.PI / 2).translate(0, 0.05, 0);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0x98be1f,
            opacity: 0.2,
            transparent: true,
            side: THREE.DoubleSide
        });

        const rectangle = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane = {
            rectangle: rectangle,
            border: new THREE.BoxHelper(rectangle, 0x990000)
        };

        this.setSpeed(this.config.droneSpeed);
        this.setHeight(this.config.droneHeight);
        this.setView(this.config.cameraView);
        this.setProcessing(this.config.processingSpeed);

        this.addCamera();
        this.addPlane();

        this.move = this.move.bind(this);
        window.addEventListener('dblclick', this.click.bind(this), false);
    }

    move(currentTime) {
        if (!currentTime) {
            requestAnimationFrame(this.move);
            this.startTime = 0;
            this.lastCapture = 0;
            return;
        }
        else if (!this.startTime) {
            this.startTime = currentTime;
        }

        const start = new THREE.Vector3(this.config.droneEastWest, this.config.droneHeight, this.config.droneNorthSouth);
        const end = new THREE.Vector3(this.goal.x, this.config.droneHeight, this.goal.z);

        const moveDuration = start.distanceTo(end) / this.drone.speed * 1000;
        const deltaTime = currentTime - this.startTime;
        const t = deltaTime / moveDuration;

        const currentDistance = deltaTime * this.drone.speed / 1000;
        const deltaDistance = currentDistance - this.lastCapture;

        // log('debug', moveDuration, deltaTime, start.distanceTo(end), currentDistance);

        if (deltaTime <= moveDuration) {
            const current = new THREE.Vector3();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(t, current);

            this.setEastWest(current.x);
            this.setNorthSouth(current.z);

            if (deltaDistance >= this.config.cameraSampling) {
                this.lastCapture = Math.floor(currentDistance);
                this.capture();
            }

            requestAnimationFrame(this.move);
        }
        else {
            this.config.droneEastWest = this.goal.x;
            this.config.droneNorthSouth = this.goal.z;
        }
    }

    addCamera() {
        this.scene.add(this.camera.cone);

        const lineGroup = new THREE.Group();
        this.lines.forEach((line) => {
            lineGroup.add(line);
        });
        this.scene.add(lineGroup);
    }

    addPlane() {
        this.scene.add(this.plane.rectangle);
        this.scene.add(this.plane.border);
    }

    getViewParameters(height) {
        const alpha = this.camera.view / 2;
        const beta = 90 - alpha;

        const hypotenuse = height / Math.sin(radian(beta));
        const radius = Math.sqrt(hypotenuse ** 2 - height ** 2);

        return {
            radius: radius,
            height: height,
            hypotenuse: hypotenuse
        };
    }

    setSpeed(speed) {
        this.drone.speed = speed;
        this.update();
    }

    setHeight(height) {
        this.camera.height = height;
        this.camera.cone.position.y = height + .5;
        this.update();
    }

    setEastWest(ew) {
        this.camera.cone.position.x = ew;
        this.update();
    }

    setNorthSouth(ns) {
        this.camera.cone.position.z = ns;
        this.update();
    }

    setView(view) {
        this.camera.view = view;
        const viewParameters = this.getViewParameters(1);
        const viewGeometry = new THREE.ConeGeometry(viewParameters.radius, viewParameters.height, 30, 30);
        this.camera.cone.geometry.copy(viewGeometry);
        this.update();
    }

    setProcessing(speed) {
        this.cpu.speed = speed;
        this.update();
    }

    click(event) {
        if (event.which != 1) {
            return;
        }

        const mouse = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: (event.clientY / window.innerHeight) * -2 + 1
        };

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector3(mouse.x, mouse.y, 1), this.stage.camera);

        const intersects = ray.intersectObjects(this.forest.grounds);
        if (intersects.length > 0) {
            this.config.droneEastWest = this.camera.cone.position.x;
            this.config.droneNorthSouth = this.camera.cone.position.z;
            this.goal = intersects[0].point;

            this.move();
        }
    }

    update() {
        if (!isValid(this.drone.speed, this.cpu.speed, this.camera.height, this.camera.view)) {
            return;
        }

        const distance = this.drone.speed * this.cpu.speed;
        const coverage = 2 * this.camera.height * Math.tan(radian(this.camera.view / 2));
        const overlap = coverage / distance;
        const time = coverage / this.drone.speed;

        // log('debug', distance, coverage, overlap, time);

        const viewHeight = this.camera.height;
        const viewCorners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const viewParameters = this.getViewParameters(viewHeight);

        this.lines.forEach((line, index) => {
            const x = viewParameters.radius * viewCorners[index][0] + this.camera.cone.position.x;
            const z = viewParameters.radius * viewCorners[index][1] + this.camera.cone.position.z;

            line.geometry.copy(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(this.camera.cone.position.x, viewHeight, this.camera.cone.position.z),
                new THREE.Vector3(x, 0, z)
            ]));
        });

        const planeGeometry = new THREE.PlaneGeometry(coverage, coverage);
        planeGeometry.rotateX(-Math.PI / 2).translate(this.camera.cone.position.x, 0.05, this.camera.cone.position.z);
        this.plane.rectangle.geometry.copy(planeGeometry);
        this.plane.border.update();
    }

    capture() {
        const rectangle = this.plane.rectangle.clone();
        rectangle.material = this.plane.rectangle.material.clone();
        rectangle.geometry = this.plane.rectangle.geometry.clone();

        const border = this.plane.border.clone();
        border.material = this.plane.border.material.clone();
        border.geometry = this.plane.border.geometry.clone();

        const plane = new THREE.Group();
        plane.add(rectangle);
        plane.add(border);

        this.scene.add(plane);
        this.captures.push(plane);
    }

    clear() {
        this.captures.forEach((capture) => {
            this.scene.remove(capture);
        });
    }

    reset() {
        Object.assign(this.config, CONFIG);
        this.clear();
        this.update();
    }
}


class View {
    constructor(root, config) {
        this.root = root;
        this.config = config;

        this.stage = new Stage(this.root, this.config);
        this.forest = new Forest(this.stage);
        this.drone = new Drone(this.forest);

        this.addControls();
    }

    addControls() {
        this.gui = new dat.GUI({ autoPlace: true, width: 300 });
        // this.gui.close();

        // drone
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config, 'droneSpeed').min(1.).max(20.).onChange((v) => { this.drone.setSpeed(v) }).listen();
        droneFolder.add(this.config, 'droneHeight').min(0.).max(50.).onChange((v) => { this.drone.setHeight(v) }).listen();
        droneFolder.add(this.config, 'droneEastWest').min(-this.forest.groundSize / 2).max(this.forest.groundSize / 2.).onChange((v) => { this.drone.setEastWest(v) }).listen();
        droneFolder.add(this.config, 'droneNorthSouth').min(-this.forest.groundSize / 2.).max(this.forest.groundSize / 2.).onChange((v) => { this.drone.setNorthSouth(v) }).listen();

        // camera
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config, 'cameraView').min(15.).max(160.).onChange((v) => { this.drone.setView(v) }).listen();
        cameraFolder.add(this.config, 'cameraSampling').min(0.1).max(10.).listen();
        cameraFolder.add(this.config, 'cameraResolution').min(128).max(1024).listen();

        // cpu
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config, 'processingSpeed').min(.1).max(2.).onChange((v) => { this.drone.setProcessing(v) }).listen();

        // forest
        const forestFolder = this.gui.addFolder('forest');
        forestFolder.add(this.config, 'trees').min(1).max(1000).onFinishChange(() => {
            this.forest.update();
            this.forest.addTrees();
        }).listen();

        const treeFolder = forestFolder.addFolder('tree');
        const branchFolder = forestFolder.addFolder('branching');
        const trunkFolder = forestFolder.addFolder('trunk');

        const forestFolders = [

            // tree
            treeFolder.add(this.config, 'levels').min(0).max(10),
            treeFolder.add(this.config, 'twigScale').min(0).max(1),

            // branching
            branchFolder.add(this.config, 'initalBranchLength').min(0.1).max(1),
            branchFolder.add(this.config, 'lengthFalloffFactor').min(0.5).max(1),
            branchFolder.add(this.config, 'lengthFalloffPower').min(0.1).max(1.5),
            branchFolder.add(this.config, 'clumpMax').min(0).max(1),
            branchFolder.add(this.config, 'clumpMin').min(0).max(1),
            branchFolder.add(this.config, 'branchFactor').min(2).max(4),
            branchFolder.add(this.config, 'dropAmount').min(-1).max(1),
            branchFolder.add(this.config, 'growAmount').min(-0.5).max(1),
            branchFolder.add(this.config, 'sweepAmount').min(-1).max(1),

            // trunk
            trunkFolder.add(this.config, 'maxRadius').min(0.05).max(1.0),
            trunkFolder.add(this.config, 'climbRate').min(0.05).max(1.0),
            trunkFolder.add(this.config, 'trunkKink').min(0.0).max(0.5),
            trunkFolder.add(this.config, 'treeSteps').min(0).max(35).step(1),
            trunkFolder.add(this.config, 'taperRate').min(0.7).max(1.0),
            trunkFolder.add(this.config, 'radiusFalloffRate').min(0.5).max(0.8),
            trunkFolder.add(this.config, 'twistRate').min(0.0).max(10.0),
            trunkFolder.add(this.config, 'trunkLength').min(0.1).max(5.0)
        ];

        forestFolders.forEach((e) => { e.onChange(() => this.forest.addTrees()).listen() });

        // materials
        const matFolder = forestFolder.addFolder('materials');
        matFolder.addColor(this.config, 'treeColor').onChange((v) => this.forest.treeMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'twigColor').onChange((v) => this.forest.twigMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'groundColor').onChange((v) => this.forest.groundMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'backgroundColor').onChange((v) => this.stage.renderer.setClearColor(v)).listen();

        this.gui.add(this, 'reset');
    }

    reset() {
        Object.assign(this.config, CONFIG);
        this.forest.reset();
        this.drone.reset();
    }
}


function createFloatAttribute(array, itemSize) {
    const typedArray = new Float32Array(Tree.flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
}

function createIntAttribute(array, itemSize) {
    const typedArray = new Uint16Array(Tree.flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
}

function normalizeAttribute(attribute) {
    const v = new THREE.Vector3();
    for (let i = 0; i < attribute.count; i++) {
        v.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
        v.normalize();
        attribute.setXYZ(i, v.x, v.y, v.z);
    }
    return attribute;
}

function isValid() {
    Array.from(arguments).forEach((arg) => {
        if (typeof arg === 'undefined') {
            return false;
        }
    });
    return true;
}

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

function radian(degree) {
    return degree * Math.PI / 180;
}

function log(level) {
    const args = Array.from(arguments);
    switch (level) {
        case 'debug':
            console.debug.apply(console, args);
            break;
        case 'info':
            console.info.apply(console, args);
            break;
        case 'warn':
            console.warn.apply(console, args);
            break;
        case 'error':
            console.error.apply(console, args);
            break;
        default:
            console.log.apply(console, args);
    }
}


const view = new View(ROOT, Object.assign({}, CONFIG));