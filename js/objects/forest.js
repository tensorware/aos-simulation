class Forest {
    constructor(stage, index) {
        this.root = stage.root;
        this.config = stage.config;
        this.loader = stage.loader;
        this.scene = stage.scene;
        this.stage = stage;
        this.index = index;

        this.trees = [...new Array(this.config.forest.size)];
        this.persons = [... new Array(this.config.forest.persons.count)];

        this.grounds = [];
        this.treePositions = [];

        this.workers = getWorkers();
        this.workersSubscriber = [];

        this.groundMaterial = new THREE.MeshLambertMaterial({
            color: this.config.material.color.ground,
            side: THREE.DoubleSide
        });

        this.treeMaterial = new THREE.MeshStandardMaterial({
            color: this.config.material.color.tree,
            roughness: 1.0,
            metalness: 0.3
        });

        this.twigMaterials = {
            'needle-leaf': new THREE.MeshStandardMaterial({
                color: this.config.material.color.twig,
                roughness: 1.0,
                metalness: 0.3,
                alphaTest: 0.1
            }),
            'broad-leaf': new THREE.MeshStandardMaterial({
                color: this.config.material.color.twig,
                roughness: 1.0,
                metalness: 0.3,
                alphaTest: 0.1
            })
        };

        this.loaded = new Promise(async function (resolve) {
            for (const type in this.twigMaterials) {
                this.twigMaterials[type].map = await this.loader.load('texture', `img/${type}.png`);
            }

            this.init();

            this.addGround();
            this.addTrees();
            this.addPersons();
            this.update();

            this.workersMessage((finished) => {
                if (finished) {
                    resolve(this);
                }
            });
        }.bind(this));
    }

    init() {
        // TODO refactor position logic

        const coverage = 2 * this.config.drone.height * Math.tan(rad(this.config.drone.camera.view / 2));
        const sizeOuter = this.config.forest.ground + 2 * coverage;

        // ground position constraints
        const treeMargin = 1;
        const treePositionMin = -sizeOuter / 2 + coverage / 2 + treeMargin;
        const treePositionMax = sizeOuter / 2 - coverage / 2 - treeMargin;

        // divide ground into grids
        const gridCount = Math.floor(Math.sqrt(this.config.forest.size));
        const gridSize = 2 * treePositionMax / gridCount;

        // calculate tree positions
        this.treePositions = [];
        for (let k = 0; k < 2; k++) {
            const treePositions = [];
            for (let i = 0; i < gridCount; i++) {
                for (let j = 0; j < gridCount; j++) {
                    // calculate min and max values within grid
                    const gridPositionMinX = treePositionMin + j * gridSize;
                    const gridPositionMaxX = treePositionMin + (j + 1) * gridSize;
                    const gridPositionMinZ = treePositionMin + i * gridSize;
                    const gridPositionMaxZ = treePositionMin + (i + 1) * gridSize;

                    // apply random position within grid
                    treePositions.push(new THREE.Vector3(
                        randomFloat(gridPositionMinX, gridPositionMaxX),
                        0.01,
                        randomFloat(gridPositionMinZ, gridPositionMaxZ)
                    ));
                }
            }

            // shuffle grid positions and append to existing
            this.treePositions = this.treePositions.concat(shuffle(treePositions, k));
        }
    }

    workersMessage(callback) {
        this.workersSubscriber.push(callback);
    }

    getGround(size) {
        const geometry = new THREE.PlaneGeometry(size, size);
        geometry.rotateX(rad(90)).translate(0, 0, 0);
        const ground = new THREE.Mesh(geometry, this.groundMaterial);
        return ground;
    }

    getTree(index) {
        const seed = randomInt(0, this.config.forest.trees.homogeneity * 100, index);

        // merge config
        const config = {
            levels: this.config.forest.trees.levels,
            twigScale: this.config.forest.trees.twigScale,
            ... this.config.forest.trees.branching,
            ... this.config.forest.trees.trunk
        };

        // add random config value noise 
        for (let key in config) {
            if (randomFloat(0.0, 1.0, seed) < 0.5) {
                config[key] = config[key] * randomFloat(this.config.forest.trees.homogeneity / 100, 1.0, seed);
            }
        }

        // set index and seed
        config.index = index;
        config.seed = seed;

        return config;
    }

    getPerson(index) {
        return new Person(this, index);
    }

    addGround() {
        const size = this.config.forest.ground;
        const coverage = 2 * this.config.drone.height * Math.tan(rad(this.config.drone.camera.view / 2));

        // inner ground
        const inner = this.getGround(size);
        this.grounds.push(inner);
        this.scene.add(inner);

        // outer ground
        const outer = this.getGround(size + 2 * coverage);
        outer.material.transparent = true;
        outer.material.opacity = 0.7;
        outer.position.y = -0.01;
        this.grounds.push(outer);
        this.scene.add(outer);
    }

    addTrees() {
        const workerConfigs = [];
        for (let i = 0; i < this.trees.length; i++) {
            workerConfigs.push(this.getTree(i));
        }

        // init workers
        this.workers.forEach((worker) => { worker.terminate(); });
        this.workers = getWorkers();

        // worker status
        let done = 0;
        this.stage.status('Loading', 0);

        // start workers
        splitArray(workerConfigs, this.workers.length).forEach((configs, i) => {
            this.workers[i].postMessage({
                method: 'getTrees',
                params: {
                    configs: configs,
                    chunks: 10
                }
            });

            this.workers[i].onmessage = ((e) => {
                const { trees } = e.data;

                trees.forEach((tree) => {
                    // tree trunk
                    const treeGeometry = new THREE.BufferGeometry();
                    treeGeometry.setAttribute('position', createFloatAttribute(tree.verts, 3));
                    treeGeometry.setAttribute('normal', normalizeAttribute(createFloatAttribute(tree.normals, 3)));
                    treeGeometry.setAttribute('uv', createFloatAttribute(tree.UV, 2));
                    treeGeometry.setIndex(createIntAttribute(tree.faces, 1));

                    // tree twigs
                    const twigGeometry = new THREE.BufferGeometry();
                    twigGeometry.setAttribute('position', createFloatAttribute(tree.vertsTwig, 3));
                    twigGeometry.setAttribute('normal', normalizeAttribute(createFloatAttribute(tree.normalsTwig, 3)));
                    twigGeometry.setAttribute('uv', createFloatAttribute(tree.uvsTwig, 2));
                    twigGeometry.setIndex(createIntAttribute(tree.facesTwig, 1));

                    // tree twigs leaf type
                    let twigLeafType = this.config.forest.trees.type;
                    if (twigLeafType == 'mixed-leaf') {
                        twigLeafType = ['needle-leaf', 'broad-leaf'][randomInt(0, 1, tree.index)];
                    }

                    // tree trunk and twigs
                    const treeGroup = new THREE.Group();
                    treeGroup.add(new THREE.Mesh(treeGeometry, this.treeMaterial));
                    treeGroup.add(new THREE.Mesh(twigGeometry, this.twigMaterials[twigLeafType]));

                    // tree position
                    treeGroup.scale.multiplyScalar(3);
                    treeGroup.position.set(
                        this.treePositions[tree.index].x,
                        this.treePositions[tree.index].y,
                        this.treePositions[tree.index].z
                    );
                    treeGroup.rotateY(rad(randomInt(0, 360, tree.index)));

                    // update tree
                    if (this.trees[tree.index]) {
                        treeGroup.position.set(
                            this.trees[tree.index].position.x,
                            this.trees[tree.index].position.y,
                            this.trees[tree.index].position.z
                        );
                        this.scene.remove(this.trees[tree.index]);
                    }

                    // add tree
                    this.trees[tree.index] = treeGroup;
                    this.scene.add(treeGroup);

                    // update workers status
                    this.stage.status('Loading', Math.round(++done * 100 / this.trees.length));
                });

                // workers finished
                const finished = this.trees.length == done;
                if (finished) {
                    this.stage.status('Loading', 100);
                    sleep(1000).then(() => {
                        this.stage.status();
                    });
                }
                this.workersSubscriber.forEach((callback) => { callback(finished); });
            }).bind(this);
        });

        // update ground
        this.update();
    }

    addPersons() {
        for (let i = 0; i < this.persons.length; i++) {
            this.persons[i] = this.getPerson(i);
        }
    }

    removeTrees() {
        // remove all trees
        this.trees.forEach((tree) => { this.scene.remove(tree); });
        this.trees = [...new Array(this.config.forest.size)];

        // update positions
        this.init();
    }

    removePersons() {
        // remove all persons
        this.persons.forEach(async (person) => { this.scene.remove(person.person); });
        this.persons = [... new Array(this.config.forest.persons.count)];
    }

    async update() {
        const coverage = 2 * this.config.drone.height * Math.tan(rad(this.config.drone.camera.view / 2));
        const sizeOuter = this.config.forest.ground + 2 * coverage;

        // ground position constraints
        const treeMargin = 1;
        const treePositionMin = -sizeOuter / 2 + coverage / 2 + treeMargin;
        const treePositionMax = sizeOuter / 2 - coverage / 2 - treeMargin;

        // hide trees outside margin area
        this.trees.forEach((tree) => {
            if (tree) {
                const treeInsideX = tree.position.x >= treePositionMin && tree.position.x <= treePositionMax;
                const treeInsideY = tree.position.z >= treePositionMin && tree.position.z <= treePositionMax;
                tree.visible = treeInsideX && treeInsideY;
            }
        });

        // inner ground
        const planeGeometryInner = new THREE.PlaneGeometry(this.config.forest.ground, this.config.forest.ground);
        planeGeometryInner.rotateX(rad(90)).translate(0, 0, 0);
        this.grounds[0].geometry.copy(planeGeometryInner);

        // outer ground
        const planeGeometryOuter = new THREE.PlaneGeometry(sizeOuter, sizeOuter);
        planeGeometryOuter.rotateX(rad(90)).translate(0, -0.01, 0);
        this.grounds[1].geometry.copy(planeGeometryOuter);
    }

    async export(zip) {
        const forest = zip.folder('forest');

        // export trees
        const trees = { positions: [] };
        for (let i = 0; i < this.trees.length; i++) {
            const tree = this.trees[i];
            if (tree.visible) {
                trees.positions.push(tree.position);
            }
        }
        forest.file('trees.json', JSON.stringify(trees, null, 4));

        // export persons
        const persons = { positions: [] };
        for (let i = 0; i < this.persons.length; i++) {
            const person = this.persons[i];
            persons.positions.push(person.positions);
        }
        forest.file('persons.json', JSON.stringify(persons, null, 4));
    }

    async clear() {
        // clear all persons
        this.persons.forEach(async (person) => { await person.clear(); });
    }

    async reset() {
        await this.clear();
        await this.update();

        await sleep(100);
    }
};
