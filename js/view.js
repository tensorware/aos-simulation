class View {
    constructor(root, config) {
        this.root = root;
        this.config = config;

        // init canvas stage
        this.stage = new Stage(this.root, this.config, () => {
            this.background(this.config.material.color.background);
            this.controls(this.root.querySelector('#controls'));
            this.splitter(['#top', '#bottom']);

            this.forest = new Forest(this.stage);
            this.drone = new Drone(this.forest);
            this.forest.onUpdate(this.drone.update.bind(this.drone));
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
        cameraFolder.add(this.config.drone.camera, 'type', ['infrared', 'monochrome']).onChange(() => this.drone.update());

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
            folder.forEach((v) => {
                v.onChange(() => {
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

        // config preset
        this.gui.add(this.config, 'preset', ['sparse', 'broadleaf', 'needleleaf']).onChange((v) => {
            this.gui.load.preset = v;
            window.location.reload();
        });

        // simulation data
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

    export() {
        const zip = new JSZip();
        this.stage.export(zip);
        this.forest.export(zip);
        this.drone.export(zip);

        // add config file
        zip.file('config.json', JSON.stringify(this.config, null, 4));

        // generate zip
        zip.generateAsync({ type: 'blob' }).then((data) => {
            saveAs(data, `${document.title}-${new Date().yyyymmddhhmm()}.zip`);
        });
    }

    reset() {
        this.forest.reset();
        this.drone.reset();
    }
}

const getPreset = async () => {
    // load presets from local storage
    let load = JSON.parse(localStorage.getItem(getLocalStorageKey('gui')) || '{}');
    if (load.preset) {
        return load.preset;
    }

    // load presets from json
    const presets = (configRoot, config, guiRoot, gui) => {
        for (let key in config) {
            if (!config.hasOwnProperty(key)) {
                continue;
            }

            if (typeof config[key] == 'object') {
                // get config subfolder
                presets(configRoot, config[key], guiRoot, gui.addFolder(key));
            }
            else {
                // get config parent keys
                let guiParent = gui;
                let configParents = [];
                while (guiParent.parent) {
                    configParents.unshift(guiParent.name);
                    guiParent = guiParent.parent;
                }

                // set config target
                let configTarget = configRoot;
                let configSource = clone(configRoot);
                configParents.forEach((key) => {
                    configTarget = configTarget[key];
                    configSource = configSource[key];
                });

                // add config properties
                if (configParents.includes('color')) {
                    gui.addColor(configTarget, key);
                }
                else {
                    gui.add(configTarget, key);
                }

                // remember config value
                Object.assign(configTarget, configSource);
                guiRoot.remember(configTarget);
            }
        }
    };

    await Promise.all(['needleleaf', 'broadleaf', 'sparse'].map(getConfig)).then((configs) => {
        configs.forEach((config) => {
            const gui = new dat.GUI({ autoPlace: false });
            gui.useLocalStorage = true;

            // generate and save presets
            presets(config, config, gui, gui);
            gui.saveAs(config.preset);
            gui.destroy();
        });
    });

    return JSON.parse(localStorage.getItem(getLocalStorageKey('gui'))).preset;
}

const getConfig = async (preset) => {
    return new Promise((resolve) => {
        fetch(`config/${preset}.json`).then((response) => { return response.json(); }).then((config) => {
            config.preset = preset;
            for (key in config.material.color) {
                config.material.color[key] = parseInt(config.material.color[key], 16);
            }
            resolve(config);
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    Math.seedrandom(document.title);

    const preset = await getPreset();
    const config = await getConfig(preset);

    new View(document.querySelector('#top'), config);
});
