const init = () => {
    Math.seedrandom(document.title);

    new View(document.querySelector('#top'), {
        drone: {
            speed: 10,
            height: 35.,
            eastWest: 0.0,
            northSouth: 0.0
        },
        camera: {
            view: 50,
            images: 30,
            sampling: 1,
            resolution: 512,
            type: 'infrared'
        },
        cpu: {
            speed: 0.50
        },
        forest: {
            ground: 100,
            trees: 30,
            persons: 3
        },

        // forest.tree
        levels: 5,
        twigScale: 0.40,
        homogeneity: 80,

        // forest.tree.branching
        initialBranchLength: 0.50,
        lengthFalloffFactor: 0.85,
        lengthFalloffPower: 0.85,
        clumpMax: 0.45,
        clumpMin: 0.40,
        branchFactor: 2.45,
        dropAmount: -0.10,
        growAmount: 0.25,
        sweepAmount: 0.00,

        // forest.tree.trunk
        maxRadius: 0.10,
        climbRate: 0.60,
        trunkKink: 0.10,
        treeSteps: 8.00,
        taperRate: 0.95,
        radiusFalloffRate: 0.70,
        twistRate: 3.00,
        trunkLength: 2.50,

        // materials
        treeColor: 0x613615,
        twigColor: 0x418c45,
        groundColor: 0x727272,
        planeColor: 0x7d5c5c,
        personColor: 0xfafafa,
        backgroundColor: 0x8fbde8
    });
};


class View {
    constructor(root, config) {
        this.root = root;
        this.config = config;

        // init canvas stage
        this.stage = new Stage(this.root, this.config, () => {
            this.forest = new Forest(this.stage);
            this.drone = new Drone(this.forest);

            this.splitter(['#top', '#bottom']);
            this.controls(this.root.querySelector('#controls'));
            this.background(this.config.backgroundColor);
        });
    }

    splitter(elements) {
        // init split
        Split(elements, {
            gutterSize: 5,
            sizes: [80, 20],
            minSize: [0, 0],
            cursor: 'ns-resize',
            direction: 'vertical',
            onDrag: () => { this.stage.update(); },
            gutter: () => {
                const gutter = document.createElement('div');
                gutter.id = 'gutter';
                return gutter;
            }
        });

        // update stage canvas
        this.stage.update();
    }

    controls(root) {
        // init gui
        this.gui = new dat.GUI({ autoPlace: false, width: 320 });
        root.appendChild(this.gui.domElement);

        // drone folder
        const size = this.forest.config.forest.ground / 2;
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config.drone, 'speed', 1, 20, 1).onChange(() => this.drone.update());
        droneFolder.add(this.config.drone, 'height', 1, 100, 1).onChange(() => this.drone.update());
        droneFolder.add(this.config.drone, 'eastWest', -size, size, 0.5).onChange((v) => this.drone.setEastWest(v)).listen();
        droneFolder.add(this.config.drone, 'northSouth', -size, size, 0.5).onChange((v) => this.drone.setNorthSouth(v)).listen();

        // camera folder
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config.camera, 'view', 15, 160, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.camera, 'images', 1, 50, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.camera, 'sampling', 0.5, 10.0, 0.5).onChange(() => this.drone.update());
        cameraFolder.add(this.config.camera, 'resolution', 128, 1024, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.camera, 'type', ['infrared', 'monochrome', 'color']).onChange(() => this.drone.update());

        // cpu folder
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config.cpu, 'speed', 0.1, 2.0, 0.1).onChange(() => this.drone.update());

        // forest folder
        const forestFolder = this.gui.addFolder('forest');
        forestFolder.add(this.config.forest, 'ground', 30, 1000, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear(true);
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();

            this.drone.setEastWest(0);
            this.drone.setNorthSouth(0);
        });
        forestFolder.add(this.config.forest, 'trees', 1, 1000, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear();
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();
        });
        forestFolder.add(this.config.forest, 'persons', 1, 20, 1).onFinishChange(this.reset.bind(this));

        // tree folder
        const treeFolder = forestFolder.addFolder('tree');
        const treeFolders = [
            treeFolder.add(this.config, 'levels', 0, 10, 1),
            treeFolder.add(this.config, 'twigScale', 0.0, 1.0, 0.05),
            treeFolder.add(this.config, 'homogeneity', 50, 100, 1)
        ];

        // branching folder
        const branchingFolder = treeFolder.addFolder('branching');
        const branchingFolders = [
            branchingFolder.add(this.config, 'initialBranchLength', 0.1, 1.0, 0.05),
            branchingFolder.add(this.config, 'lengthFalloffFactor', 0.1, 1.0, 0.05),
            branchingFolder.add(this.config, 'lengthFalloffPower', 0.1, 1.5, 0.05),
            branchingFolder.add(this.config, 'clumpMax', 0.0, 1.0, 0.05),
            branchingFolder.add(this.config, 'clumpMin', 0.0, 1.0, 0.05),
            branchingFolder.add(this.config, 'branchFactor', 2.0, 4.0, 0.05),
            branchingFolder.add(this.config, 'dropAmount', -1.0, 1.0, 0.05),
            branchingFolder.add(this.config, 'growAmount', -1.0, 1.0, 0.05),
            branchingFolder.add(this.config, 'sweepAmount', -1.0, 1.0, 0.05)
        ];

        // trunk folder
        const trunkFolder = treeFolder.addFolder('trunk');
        const trunkFolders = [
            trunkFolder.add(this.config, 'maxRadius', 0.05, 0.5, 0.05),
            trunkFolder.add(this.config, 'climbRate', 0.05, 1.0, 0.05),
            trunkFolder.add(this.config, 'trunkKink', 0.0, 0.5, 0.05),
            trunkFolder.add(this.config, 'treeSteps', 0.0, 20.0, 0.05),
            trunkFolder.add(this.config, 'taperRate', 0.7, 1.0, 0.05),
            trunkFolder.add(this.config, 'radiusFalloffRate', 0.5, 0.8, 0.05),
            trunkFolder.add(this.config, 'twistRate', 0.0, 10.0, 1),
            trunkFolder.add(this.config, 'trunkLength', 0.1, 5.0, 0.05)
        ];

        // forest folder
        [treeFolders, branchingFolders, trunkFolders].forEach((folder) => {
            folder.forEach((value) => {
                value.onChange(() => {
                    this.forest.clear();
                    this.forest.addTrees();
                    this.forest.addPersons();
                });
            });
        });

        // materials folder
        const materialsFolder = this.gui.addFolder('materials');
        materialsFolder.addColor(this.config, 'treeColor').onChange((v) => this.forest.treeMaterial.color.setHex(v));
        materialsFolder.addColor(this.config, 'twigColor').onChange((v) => this.forest.twigMaterial.color.setHex(v));
        materialsFolder.addColor(this.config, 'groundColor').onChange((v) => this.forest.groundMaterial.color.setHex(v));
        materialsFolder.addColor(this.config, 'planeColor').onChange((v) => this.drone.camera.planeMaterial.color.setHex(v));
        materialsFolder.addColor(this.config, 'personColor').onFinishChange(this.reset.bind(this));
        materialsFolder.addColor(this.config, 'backgroundColor').onChange(this.background.bind(this));

        this.gui.add(this, 'reset');
        // this.gui.close();
    }

    background(color) {
        this.stage.renderer.setClearColor(color);
        this.root.parentElement.style.backgroundColor = '#' + color.toString(16);
    }

    reset() {
        this.forest.reset();
        this.drone.reset();
    }
}

document.addEventListener('DOMContentLoaded', init);
