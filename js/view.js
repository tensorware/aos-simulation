class View {
    constructor(root, config, configs) {
        this.root = root;
        this.config = config;
        this.configs = configs;

        // load canvas stage
        this.stage = new Stage(this.root, this.config)
        this.stage.loaded.then(() => {
            this.background(this.config.material.color.background);
            this.controls(this.root.querySelector('#controls'));
            this.splitter(['#top', '#bottom']);

            // load objects
            this.forest = new Forest(this.stage);
            this.drone = new Drone(this.forest);
            this.forest.onUpdate(this.drone.update.bind(this.drone));
        });

        // update config from hash parameters
        window.addEventListener('hashchange', () => {
            // set config
            setConfig(this.config, getHash());

            // update drone
            this.drone.setEastWest(this.config.drone.eastWest);
            this.drone.setNorthSouth(this.config.drone.northSouth);
            this.drone.update();

            // update forest
            this.forest.update();
        });
    }

    background(color) {
        // canvas background
        this.stage.renderer.setClearColor(color);

        // document background
        document.body.style.backgroundColor = hexColor(color);
    }

    controls(root) {
        // init gui
        this.gui = new dat.GUI({ autoPlace: false, width: 320 });
        this.gui.useLocalStorage = true;
        root.append(this.gui.domElement);

        // drone folder
        const size = this.config.forest.ground / 2;
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config.drone, 'speed', 1, 20, 1).onChange(() => this.drone.update()).listen();
        droneFolder.add(this.config.drone, 'height', 1, 100, 1).onChange(() => this.drone.update()).onFinishChange(() => this.forest.update()).listen();
        droneFolder.add(this.config.drone, 'eastWest', -size, size, 0.5).onChange((v) => this.drone.setEastWest(v)).listen();
        droneFolder.add(this.config.drone, 'northSouth', -size, size, 0.5).onChange((v) => this.drone.setNorthSouth(v)).listen();

        // camera folder
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config.drone.camera, 'view', 10, 160, 1).onChange(() => this.drone.update()).onFinishChange(() => this.forest.update()).listen();
        cameraFolder.add(this.config.drone.camera, 'images', 0, 60, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'sampling', 0.1, 10.0, 0.1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'resolution', 128, 1024, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'type', ['infrared', 'monochrome']).onChange(() => this.drone.reset());

        // cpu folder
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config.drone.cpu, 'speed', 0.1, 2.0, 0.1).onChange(() => this.drone.update());

        // forest folder
        const forestFolder = this.gui.addFolder('forest');
        forestFolder.add(this.config.forest, 'size', 0, 2000, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear();
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();
        });

        forestFolder.add(this.config.forest, 'ground', 10, 500, 1).onFinishChange(() => {
            this.drone.clear();
            this.drone.update();

            this.forest.clear(true);
            this.forest.update();
            this.forest.addTrees();
            this.forest.addPersons();

            this.drone.setEastWest(0.0);
            this.drone.setNorthSouth(0.0);
        });

        // trees folder
        const treesFolder = forestFolder.addFolder('trees');
        const treesFolders = [
            treesFolder.add(this.config.forest.trees, 'levels', 0, 10, 1),
            treesFolder.add(this.config.forest.trees, 'twigScale', 0.0, 1.0, 0.05),
            treesFolder.add(this.config.forest.trees, 'homogeneity', 50, 100, 1),
            treesFolder.add(this.config.forest.trees, 'type', ['needle-leaf', 'broad-leaf', 'mixed-leaf'])
        ];

        // branching folder
        const branchingFolder = treesFolder.addFolder('branching');
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
        const trunkFolder = treesFolder.addFolder('trunk');
        const trunkFolders = [
            trunkFolder.add(this.config.forest.trees.trunk, 'maxRadius', 0.05, 0.5, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'climbRate', 0.05, 2.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'trunkKink', 0.0, 0.5, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'treeSteps', 0.0, 20.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'taperRate', 0.7, 1.0, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'radiusFalloffRate', 0.5, 0.9, 0.05),
            trunkFolder.add(this.config.forest.trees.trunk, 'twistRate', 0.0, 20.0, 1),
            trunkFolder.add(this.config.forest.trees.trunk, 'trunkLength', 0.1, 5.0, 0.05)
        ];

        // forest folder
        [treesFolders, branchingFolders, trunkFolders].forEach((folder) => {
            folder.forEach((v) => {
                v.onChange(() => {
                    this.forest.clear();
                    this.forest.addTrees();
                    this.forest.addPersons();
                });
            });
        });

        // persons folder
        const personsFolder = forestFolder.addFolder('persons');
        personsFolder.add(this.config.forest.persons, 'count', 0, 20, 1).onChange(() => { /* TODO */ });
        Object.keys(this.config.forest.persons.activities).forEach((k) => {
            personsFolder.add(this.config.forest.persons.activities, k).onChange(() => { /* TODO */ });
        })

        // materials folder
        const materialsFolder = this.gui.addFolder('material');

        // color folder
        const colorFolder = materialsFolder.addFolder('color');
        //colorFolder.addColor(this.config.material.color, 'tree').onChange((v) => this.forest.treeMaterial.color.setHex(v));
        //colorFolder.addColor(this.config.material.color, 'twig').onChange((v) => this.forest.twigMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'ground').onChange((v) => this.forest.groundMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'plane').onChange((v) => this.drone.camera.planeMaterial.color.setHex(v));
        colorFolder.addColor(this.config.material.color, 'person').onFinishChange(this.reset.bind(this));
        colorFolder.addColor(this.config.material.color, 'background').onChange(this.background.bind(this));

        // config preset
        this.gui.add(this.config, 'preset', this.configs).onChange((v) => {
            this.gui.load.preset = v;
            window.location.reload();
        });

        // simulation data
        this.gui.add(this, 'capture');
        this.gui.add(this, 'export');
        this.gui.add(this, 'reset');
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

    capture() {
        this.reset();

        // capture images and export
        this.drone.capture().then(() => {
            this.stage.reset();
            this.export();
        });
    }

    export() {
        const zip = new JSZip();
        const name = `${document.title}-${new Date().yyyymmddhhmm()}.zip`;

        // add folders
        this.stage.export(zip);
        this.forest.export(zip);
        this.drone.export(zip);

        // add config file
        zip.file('config.json', JSON.stringify(this.config, null, 4));

        // generate zip
        zip.generateAsync({ type: 'blob' }).then((data) => {
            saveAs(data, name);
        });
    }

    reset() {
        this.forest.reset();
        this.drone.reset();
    }
};

document.addEventListener('DOMContentLoaded', async () => {

    // make Math.random() predictable globally
    Math.seedrandom(document.title);

    // load preset and config
    const preset = await getPreset(configs);
    const config = await getConfig(preset);

    // init view
    new View(document.querySelector('#top'), config, configs);
});
