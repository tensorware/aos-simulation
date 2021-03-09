const CONFIG = {
    droneSpeed: 4,
    droneHeight: 35.,
    droneEastWest: .0,
    droneNorthSouth: .0,
    cameraView: 50,
    cameraSampling: 1,
    cameraResolution: 512,
    processingSpeed: 0.5,
    size: 32.6 * 4,
    trees: 100,
    persons: 4,
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
        this.gui = new dat.GUI({ autoPlace: true, width: 320 });
        this.gui.close();

        // drone
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config, 'droneSpeed').min(1.).max(20.).onChange((v) => { this.drone.setSpeed(v) }).listen();
        droneFolder.add(this.config, 'droneHeight').min(0.).max(50.).onChange((v) => { this.drone.setHeight(v) }).listen();
        droneFolder.add(this.config, 'droneEastWest').min(-this.forest.config.size / 2).max(this.forest.config.size / 2.).onChange((v) => { this.drone.setEastWest(v) }).listen();
        droneFolder.add(this.config, 'droneNorthSouth').min(-this.forest.config.size / 2.).max(this.forest.config.size / 2.).onChange((v) => { this.drone.setNorthSouth(v) }).listen();

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
        forestFolder.add(this.config, 'size').min(30).max(1000).onFinishChange(() => {
            this.forest.update();
            this.forest.clear();
            this.forest.addTrees();
            this.forest.addPersons();
        }).listen();
        forestFolder.add(this.config, 'trees').min(1).max(1000).onFinishChange(() => {
            this.forest.update();
            this.forest.clear();
            this.forest.addTrees();
            this.forest.addPersons();
        }).listen();
        forestFolder.add(this.config, 'persons').min(1).max(100).onFinishChange(() => {
            this.forest.update();
            this.forest.clear();
            this.forest.addTrees();
            this.forest.addPersons();
        }).listen();

        const treeFolder = forestFolder.addFolder('tree');
        const treeFolders = [
            // tree
            treeFolder.add(this.config, 'levels').min(0).max(10),
            treeFolder.add(this.config, 'twigScale').min(0).max(1)
        ];

        const branchFolder = treeFolder.addFolder('branching');
        const trunkFolder = treeFolder.addFolder('trunk');

        const forestFolders = [].concat(treeFolders, [
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
        ]);

        forestFolders.forEach((e) => { e.onChange(() => this.forest.addTrees()).listen() });

        // materials
        const matFolder = this.gui.addFolder('materials');
        matFolder.addColor(this.config, 'treeColor').onChange((v) => this.forest.treeMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'twigColor').onChange((v) => this.forest.twigMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'groundColor').onChange((v) => this.forest.groundMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'backgroundColor').onChange((v) => this.stage.renderer.setClearColor(v)).listen();

        this.gui.add(this, 'reset');
    }

    reset() {
        Object.assign(this.config, this.stage._config);
        this.forest.reset();
        this.drone.reset();
    }
}

const view = new View(ROOT, Object.assign({}, CONFIG));
