Math.seedrandom('AOS-Simulation');

const CONFIG = {
    droneSpeed: 4,
    droneHeight: 35.,
    droneEastWest: .0,
    droneNorthSouth: .0,
    cameraView: 50,
    cameraSampling: 1,
    cameraResolution: 512,
    processingSpeed: 0.5,
    size: 32.6 * 2,
    trees: 40,
    persons: 4,
    levels: 5,
    vMultiplier: 2.36,
    twigScale: 0.39,
    homogeneity: 80,
    initalBranchLength: 0.49,
    lengthFalloffFactor: 0.85,
    lengthFalloffPower: 0.99,
    clumpMax: 0.454,
    clumpMin: 0.404,
    branchFactor: 2.45,
    dropAmount: -0.1,
    growAmount: 0.235,
    sweepAmount: 0.01,
    maxRadius: 0.1,
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
    planeColor: 0xdcdc69,
    backgroundColor: 0x8fbde8
};

class View {
    constructor(root, config) {
        this.root = root;
        this.config = config;

        this.stage = new Stage(this.root, this.config, () => {
            this.forest = new Forest(this.stage);
            this.drone = new Drone(this.forest);
            this.addControls();
        });
    }

    addControls() {
        this.gui = new dat.GUI({ autoPlace: true, width: 320 });
        this.gui.close();

        const clear = () => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear();
            this.forest.update();

            this.forest.addTrees();
            this.forest.addPersons();
        };

        // drone
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config, 'droneSpeed', 1, 20, 1).onChange(() => this.drone.update()).listen();
        droneFolder.add(this.config, 'droneHeight', 0, 100, 1).onChange((v) => this.drone.setHeight(v)).listen();
        droneFolder.add(this.config, 'droneEastWest', -this.forest.config.size / 2, this.forest.config.size / 2, 1).onChange((v) => this.drone.setEastWest(v)).listen();
        droneFolder.add(this.config, 'droneNorthSouth', -this.forest.config.size / 2, this.forest.config.size / 2, 1).onChange((v) => this.drone.setNorthSouth(v)).listen();

        // camera
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config, 'cameraView', 15, 160, 1).onChange((v) => this.drone.setView(v)).listen();
        cameraFolder.add(this.config, 'cameraSampling', .1, 10., .5).onChange(() => this.drone.update()).listen();
        cameraFolder.add(this.config, 'cameraResolution', 128, 1024, 1).onChange(() => this.drone.update()).listen();

        // cpu
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config, 'processingSpeed', .1, 2., .1).onChange(() => this.drone.update()).listen();

        // forest
        const forestFolder = this.gui.addFolder('forest');
        forestFolder.add(this.config, 'size', 30, 1000, 1).onFinishChange(clear.bind(this)).listen();
        forestFolder.add(this.config, 'trees', 1, 1000, 1).onFinishChange(clear.bind(this)).listen();
        forestFolder.add(this.config, 'persons', 1, 10, 1).onFinishChange(clear.bind(this)).listen();

        // tree
        const treeFolder = forestFolder.addFolder('tree');
        const treeFolders = [
            treeFolder.add(this.config, 'levels', 0, 10, 1),
            treeFolder.add(this.config, 'twigScale', 0., 1., .05),
            treeFolder.add(this.config, 'homogeneity', 50, 100, 1)
        ];

        // branching
        const branchFolder = treeFolder.addFolder('branching');
        const branchFolders = [
            branchFolder.add(this.config, 'initalBranchLength', 0.1, 1, .05),
            branchFolder.add(this.config, 'lengthFalloffFactor', 0.5, 1, .05),
            branchFolder.add(this.config, 'lengthFalloffPower', 0.1, 1.5, .05),
            branchFolder.add(this.config, 'clumpMax', 0, 1, .05),
            branchFolder.add(this.config, 'clumpMin', 0, 1, .05),
            branchFolder.add(this.config, 'branchFactor', 2, 4, .05),
            branchFolder.add(this.config, 'dropAmount', -1, 1, .05),
            branchFolder.add(this.config, 'growAmount', -0.5, 1, .05),
            branchFolder.add(this.config, 'sweepAmount', -1, 1, .05),
        ];

        // trunk
        const trunkFolder = treeFolder.addFolder('trunk');
        const trunkFolders = [
            trunkFolder.add(this.config, 'maxRadius', .05, 0.5, .05),
            trunkFolder.add(this.config, 'climbRate', .05, 1.0, .05),
            trunkFolder.add(this.config, 'trunkKink', 0.0, 0.5, .05),
            trunkFolder.add(this.config, 'treeSteps', 0, 35, 1),
            trunkFolder.add(this.config, 'taperRate', 0.7, 1.0, .05),
            trunkFolder.add(this.config, 'radiusFalloffRate', 0.5, 0.8, .05),
            trunkFolder.add(this.config, 'twistRate', 0.0, 10.0, 1),
            trunkFolder.add(this.config, 'trunkLength', 0.1, 5.0, .05),
        ];

        // forest
        [treeFolders, branchFolders, trunkFolders].forEach((folder) => {
            folder.forEach((value) => {
                value.onChange(() => {
                    this.forest.clear();
                    this.forest.addTrees();
                    this.forest.addPersons();
                }).listen();
            });
        });

        // materials
        const matFolder = this.gui.addFolder('materials');
        matFolder.addColor(this.config, 'treeColor').onChange((v) => this.forest.treeMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'twigColor').onChange((v) => this.forest.twigMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'groundColor').onChange((v) => this.forest.groundMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'planeColor').onChange((v) => this.drone.planeMaterial.color.setHex(v)).listen();
        matFolder.addColor(this.config, 'backgroundColor').onChange((v) => this.stage.renderer.setClearColor(v)).listen();

        this.gui.add(this, 'reset');
    }

    reset() {
        this.forest.reset();
        this.drone.reset();
    }
}

const view = new View(document.querySelector('#root'), Object.assign({}, CONFIG));
