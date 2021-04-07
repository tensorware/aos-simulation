const init = () => {
    Math.seedrandom(document.title);

    new View(document.querySelector('#top'), {
        drone: {
            speed: 10,
            height: 35.,
            eastWest: 0.0,
            northSouth: 0.0,
            camera: {
                view: 50,
                images: 30,
                sampling: 1,
                resolution: 512,
                type: 'infrared'
            },
            cpu: {
                speed: 0.50
            }
        },
        forest: {
            size: 100,
            persons: 3,
            ground: 100,
            trees: {
                levels: 5,
                twigScale: 0.40,
                homogeneity: 80,
                branching: {
                    initialBranchLength: 0.50,
                    lengthFalloffFactor: 0.85,
                    lengthFalloffPower: 0.85,
                    clumpMax: 0.45,
                    clumpMin: 0.40,
                    branchFactor: 2.45,
                    dropAmount: -0.10,
                    growAmount: 0.25,
                    sweepAmount: 0.00
                },
                trunk: {
                    maxRadius: 0.10,
                    climbRate: 0.60,
                    trunkKink: 0.10,
                    treeSteps: 8.00,
                    taperRate: 0.95,
                    radiusFalloffRate: 0.70,
                    twistRate: 3.00,
                    trunkLength: 2.50
                }
            }
        },
        material: {
            color: {
                tree: 0x613615,
                twig: 0x418c45,
                ground: 0x727272,
                plane: 0x7d5c5c,
                person: 0xfafafa,
                background: 0x8fbde8
            }
        }
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
            this.background(this.config.material.color.background);
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
        root.append(this.gui.domElement);

        // drone folder
        const size = this.config.forest.ground / 2;
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config.drone, 'speed', 1, 20, 1).onChange(() => this.drone.update());
        droneFolder.add(this.config.drone, 'height', 1, 100, 1).onChange(() => this.drone.update());
        droneFolder.add(this.config.drone, 'eastWest', -size, size, 0.5).onChange((v) => this.drone.setEastWest(v)).listen();
        droneFolder.add(this.config.drone, 'northSouth', -size, size, 0.5).onChange((v) => this.drone.setNorthSouth(v)).listen();

        // camera folder
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config.drone.camera, 'view', 15, 160, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'images', 1, 50, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'sampling', 0.5, 10.0, 0.5).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'resolution', 128, 1024, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'type', ['infrared', 'monochrome', 'color']).onChange(() => this.drone.update());

        // cpu folder
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config.drone.cpu, 'speed', 0.1, 2.0, 0.1).onChange(() => this.drone.update());

        // forest folder
        const forestFolder = this.gui.addFolder('forest');
        forestFolder.add(this.config.forest, 'size', 1, 1000, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear();
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();
        });
        forestFolder.add(this.config.forest, 'persons', 1, 20, 1).onFinishChange(this.reset.bind(this));
        forestFolder.add(this.config.forest, 'ground', 30, 1000, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear(true);
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();

            this.drone.setEastWest(0.0);
            this.drone.setNorthSouth(0.0);
        });

        // tree folder
        const treeFolder = forestFolder.addFolder('trees');
        const treeFolders = [
            treeFolder.add(this.config.forest.trees, 'levels', 0, 10, 1),
            treeFolder.add(this.config.forest.trees, 'twigScale', 0.0, 1.0, 0.05),
            treeFolder.add(this.config.forest.trees, 'homogeneity', 50, 100, 1)
        ];

        // branching folder
        const branchingFolder = treeFolder.addFolder('branching');
        const branchingFolders = [
            branchingFolder.add(this.config.forest.trees.branching, 'initialBranchLength', 0.1, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'lengthFalloffFactor', 0.1, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'lengthFalloffPower', 0.1, 1.5, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'clumpMax', 0.0, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'clumpMin', 0.0, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'branchFactor', 2.0, 4.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'dropAmount', -1.0, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'growAmount', -1.0, 1.0, 0.05),
            branchingFolder.add(this.config.forest.trees.branching, 'sweepAmount', -1.0, 1.0, 0.05)
        ];

        // trunk folder
        const trunkFolder = treeFolder.addFolder('trunk');
        const trunkFolders = [
            trunkFolder.add(this.config.forest.trees.trunk, 'maxRadius', 0.05, 0.5, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'climbRate', 0.05, 1.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'trunkKink', 0.0, 0.5, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'treeSteps', 0.0, 20.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'taperRate', 0.7, 1.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'radiusFalloffRate', 0.5, 0.8, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'twistRate', 0.0, 10.0, 1),
            trunkFolder.add(this.config.forest.trees.trunk, 'trunkLength', 0.1, 5.0, 0.05)
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
        const materialsFolder = this.gui.addFolder('material');

        // color folder
        const colorFolder = materialsFolder.addFolder('color');
        colorFolder.addColor(this.config.material.color, 'tree').onChange((v) => this.forest.treeMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'twig').onChange((v) => this.forest.twigMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'ground').onChange((v) => this.forest.groundMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'plane').onChange((v) => this.drone.camera.planeMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'person').onFinishChange(this.reset.bind(this));
        colorFolder.addColor(this.config.material.color, 'background').onChange(this.background.bind(this));

        this.gui.add(this, 'reset');
        // this.gui.close();
    }

    background(color) {
        this.stage.renderer.setClearColor(color);
        document.body.style.backgroundColor = hexColor(color);
    }

    reset() {
        this.forest.reset();
        this.drone.reset();
    }
}

document.addEventListener('DOMContentLoaded', init);
