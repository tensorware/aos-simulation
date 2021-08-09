class View {
    constructor(root, config, presets) {
        this.root = root;
        this.config = config;
        this.presets = presets;
        this.loader = new Loader();

        // init stage
        this.stage = new Stage(this.root, this.config, this.loader);
        this.stage.loaded.then(() => {
            // init html
            this.background(this.config.material.color.background);
            this.controls(this.root.querySelector('#controls'), presets);
            this.splitter(['#top', '#bottom']);

            // init objects
            this.forest = new Forest(this.stage, 0);
            this.drone = new Drone(this.forest, 0);
            this.forest.loaded.then(() => {
                this.update();
            });

            // events
            window.addEventListener('hashchange', () => {
                this.update();
            });
        });
    }

    background(color) {
        // canvas background
        this.stage.renderer.setClearColor(color);

        // document background
        document.body.style.backgroundColor = hexColor(color);
    }

    controls(root) {
        // gui state
        const state = JSON.parse(localStorage.getItem(getLocalStorageKey('gui')) || '{}');

        // gui root
        this.gui = new dat.GUI({ autoPlace: false, width: 320 });
        this.gui.closed = state.closed || false;
        this.gui.useLocalStorage = true;
        root.append(this.gui.domElement);

        // drone folder
        const size = this.config.forest.ground / 2;
        const droneFolder = this.gui.addFolder('drone');
        droneFolder.add(this.config.drone, 'speed', 1, 20, 1).onChange(() => this.drone.update()).listen();
        droneFolder.add(this.config.drone, 'height', 1, 100, 1).onChange(() => this.drone.update()).onFinishChange(() => this.forest.update()).listen();
        droneFolder.add(this.config.drone, 'rotation', -180, 180, 1).onChange(() => this.drone.update());
        droneFolder.add(this.config.drone, 'eastWest', -size, size, 0.5).onChange((v) => this.drone.setEastWest(v)).listen();
        droneFolder.add(this.config.drone, 'northSouth', -size, size, 0.5).onChange((v) => this.drone.setNorthSouth(v)).listen();

        // camera folder
        const cameraFolder = droneFolder.addFolder('camera');
        cameraFolder.add(this.config.drone.camera, 'view', 10, 160, 1).onChange(() => this.drone.update()).onFinishChange(() => this.forest.update()).listen();
        cameraFolder.add(this.config.drone.camera, 'resolution', 128, 1024, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'sampling', 0.1, 10.0, 0.1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'images', 0, 60, 1).onChange(() => this.drone.update());
        cameraFolder.add(this.config.drone.camera, 'type', ['color', 'monochrome']).onChange(() => this.drone.reset());

        // cpu folder
        const cpuFolder = droneFolder.addFolder('cpu');
        cpuFolder.add(this.config.drone.cpu, 'speed', 0.1, 2.0, 0.1).onChange(() => this.drone.update());

        // forest folder
        const forestFolder = this.gui.addFolder('forest');
        const forestFolders = [
            forestFolder.add(this.config.forest, 'size', 0, 2000, 1),
            forestFolder.add(this.config.forest, 'ground', 10, 500, 1)
        ];

        // forest folders
        forestFolders.forEach((folder) => {
            folder.onFinishChange(() => {
                this.forest.removeTrees();
                this.forest.addTrees();
                this.forest.removePersons();
                this.forest.addPersons();
                this.drone.reset();
            });
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

        // trees folders
        [treesFolders, branchingFolders, trunkFolders].forEach((folders) => {
            folders.forEach((folder) => {
                folder.onChange(() => {
                    this.forest.addTrees();
                });
            });
        });

        // persons folder
        const personsFolder = forestFolder.addFolder('persons');
        personsFolder.add(this.config.forest.persons, 'count', 0, 20, 1).onFinishChange(() => {
            this.forest.removePersons();
            this.forest.addPersons();
        });

        // activities folder
        const activitiesFolder = personsFolder.addFolder('activities');
        Object.keys(this.config.forest.persons.activities).forEach((activity) => {
            activitiesFolder.add(this.config.forest.persons.activities, activity).onFinishChange(() => {
                this.forest.persons.forEach((person) => { person.setActivity(); });
            });
        });

        // material folder
        const materialFolder = this.gui.addFolder('material');

        // color folder
        const colorFolder = materialFolder.addFolder('color');
        colorFolder.addColor(this.config.material.color, 'tree').onChange((v) => {
            this.forest.treeMaterial.color.setHex(v);
        });
        colorFolder.addColor(this.config.material.color, 'twig').onChange((v) => {
            Object.values(this.forest.twigMaterials).forEach((material) => {
                material.color.setHex(v);
            });
        });
        colorFolder.addColor(this.config.material.color, 'ground').onChange((v) => {
            this.forest.groundMaterial.color.setHex(v);
            this.drone.update();
        });
        colorFolder.addColor(this.config.material.color, 'plane').onChange((v) => {
            this.drone.camera.planeMaterial.color.setHex(v);
            this.drone.camera.clear();
            this.drone.update();
        });
        colorFolder.addColor(this.config.material.color, 'person').onChange((v) => {
            this.forest.persons.forEach((person) => {
                person.surfaceMaterial.color.setHex(v);
                person.jointsMaterial.color.setHex(shadeColor(v, 0.5));
            });
        });
        colorFolder.addColor(this.config.material.color, 'background').onChange(this.background.bind(this));

        // config preset
        this.gui.add(this.config, 'preset', this.presets).onChange((preset) => {
            this.gui.load.preset = preset;
            window.location.reload();
        });

        // config actions
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

    async update() {
        // set config from hash
        const hash = getHash();
        setConfig(this.config, hash);

        // update forest
        await this.forest.update();

        // update drone
        await this.drone.setEastWest(this.config.drone.eastWest);
        await this.drone.setNorthSouth(this.config.drone.northSouth);

        // update persons
        this.forest.persons.forEach((person) => { person.setActivity(); });

        // execute capture
        if ('capture' in hash) {
            await sleep(100);
            await this.capture();
        }

        // execute export
        if ('export' in hash) {
            await sleep(100);
            await this.export();
        }

        // execute reset
        if ('reset' in hash) {
            await sleep(100);
            await this.reset();
        }
    }

    async capture() {
        const date = new Date().yyyymmddhhmmss();

        // reset persons
        await this.forest.clear();

        // reset drone
        await this.drone.reset();

        // capture images
        await this.drone.capture()

        // reset stage camera
        await this.stage.reset();

        // export zip file
        await this.export(date);
    }

    async export(date) {
        const zip = new JSZip();
        const zipName = `${this.stage.name}-${date || new Date().yyyymmddhhmmss()}.zip`;

        // export status
        this.stage.status('Exporting', 0);

        // add folders
        this.stage.export(zip);
        this.forest.export(zip);
        this.drone.export(zip);

        // add config file
        zip.file('config.json', JSON.stringify(this.config, null, 4));

        // generate zip
        zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (zipMeta) => {
            this.stage.status('Exporting', Math.round(zipMeta.percent));
        }).then((zipData) => {
            // export zip
            saveAs(zipData, zipName);

            // export finished
            this.stage.status('Exporting', 100);
            sleep(1000).then(() => {
                this.stage.status();
            });
        });
    }

    async reset() {
        await this.forest.reset();
        await this.drone.reset();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // make Math.random() globally predictable
    Math.seedrandom(document.title);

    // load preset and config
    const preset = await getPreset(configs);
    const config = await getConfig(preset);

    // init view
    new View(document.querySelector('#top'), config, configs);
});
