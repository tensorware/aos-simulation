class Forest {
    constructor(stage) {
        this.root = stage.root;
        this.config = stage.config;
        this.scene = stage.scene;
        this.stage = stage;

        this.trees = [...new Array(this.config.forest.size)];
        this.persons = [... new Array(this.config.forest.persons)];

        this.grounds = [];
        this.treePositions = [];
        this.personPositions = [];

        this.workers = getWorkers();
        this.workersUpdate = [];

        this.groundMaterial = new THREE.MeshLambertMaterial({
            color: this.config.material.color.ground,
            side: THREE.DoubleSide
        });

        this.treeMaterial = new THREE.MeshStandardMaterial({
            color: this.config.material.color.tree,
            roughness: 1.0,
            metalness: 0.3
        });

        this.twigMaterial = new THREE.MeshStandardMaterial({
            map: new THREE.TextureLoader().load('img/leaf.png'),
            color: this.config.material.color.twig,
            roughness: 1.0,
            metalness: 0.3,
            alphaTest: 0.8
        });

        this.update();
        this.addGround();
        this.addTrees();
        this.addPersons();
    }

    getGround(size) {
        const geometry = new THREE.PlaneGeometry(size, size);
        geometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        return new THREE.Mesh(geometry, this.groundMaterial);
    }

    getTree(index) {
        const seed = random(0, 1000, index);

        const config = {
            levels: this.config.forest.trees.levels,
            twigScale: this.config.forest.trees.twigScale,
            ... this.config.forest.trees.branching,
            ... this.config.forest.trees.trunk
        };

        for (let key in config) {
            if (random(0, 100, seed) <= 50) {
                config[key] = config[key] * (random(this.config.forest.trees.homogeneity, 100, seed) / 100);
            }
        }

        config.index = index;
        config.seed = seed;

        return config;
    }

    getPerson(index) {
        const person = new Person(this).mesh;
        person.position.x = this.personPositions[index].x;
        person.position.z = this.personPositions[index].z;
        return person;
    }

    addGround() {
        const size = this.config.forest.ground;
        const coverage = 2 * this.config.drone.height * Math.tan(radian(this.config.drone.camera.view / 2));

        // inner ground
        const inner = this.getGround(size);
        this.grounds.push(inner);
        this.scene.add(inner);

        // outer ground
        const outer = this.getGround(size + 2 * coverage);
        outer.material.transparent = true;
        outer.material.opacity = 0.7;
        outer.position.y = -0.05

        this.grounds.push(outer);
        this.scene.add(outer);
    }

    addTrees() {
        const workerConfigs = [];
        for (let i = 0; i < this.config.forest.size; i++) {
            workerConfigs.push(this.getTree(i));
        }

        // init workers
        this.workers.forEach((worker) => { worker.terminate(); });
        this.workers = getWorkers();

        splitArray(workerConfigs, this.workers.length).forEach((configs, i) => {
            this.workers[i].postMessage({
                method: 'getTrees',
                params: {
                    configs: configs,
                    chunks: 10
                }
            });

            this.workers[i].onmessage = ((e) => {
                e.data.forEach((tree) => {
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

                    // tree trunk and twigs
                    const treeGroup = new THREE.Group();
                    treeGroup.add(new THREE.Mesh(treeGeometry, this.treeMaterial));
                    treeGroup.add(new THREE.Mesh(twigGeometry, this.twigMaterial));

                    // tree position
                    const scale = 3;
                    treeGroup.scale.set(scale, scale, scale);
                    treeGroup.position.x = this.treePositions[tree.index].x;
                    treeGroup.position.y = this.treePositions[tree.index].y;
                    treeGroup.position.z = this.treePositions[tree.index].z;

                    if (tree.index < this.trees.length) {
                        // update tree
                        if (this.trees[tree.index]) {
                            treeGroup.position.x = this.trees[tree.index].position.x;
                            treeGroup.position.y = this.trees[tree.index].position.y;
                            treeGroup.position.z = this.trees[tree.index].position.z;
                            this.scene.remove(this.trees[tree.index]);
                        }
                        this.trees[tree.index] = treeGroup;
                    } else {
                        // append tree
                        this.trees.push(treeGroup);
                    }
                    this.scene.add(treeGroup);
                });

                this.workersUpdate.forEach((cb) => { cb(); });
            }).bind(this);
        });
    }

    addPersons() {
        const persons = [];
        for (let i = 0; i < this.config.forest.persons; i++) {
            persons.push(this.getPerson(i));
        }

        // append persons
        persons.forEach((person, i) => {
            this.persons[i] = person;
            this.scene.add(person);
        });
    }

    onUpdate(cb) {
        this.workersUpdate.push(cb);
    }

    update() {
        const coverage = 2 * this.config.drone.height * Math.tan(radian(this.config.drone.camera.view / 2));
        const sizeOuter = this.config.forest.ground + 2 * coverage;
        const sizeInner = this.config.forest.ground;

        // update trees
        const treeMargin = 1;
        const treePositionMin = -sizeOuter / 2 + coverage / 2 + treeMargin;
        const treePositionMax = sizeOuter / 2 - coverage / 2 - treeMargin;

        this.treePositions = [];
        for (let i = 0; i <= 100000; i++) {
            this.treePositions.push({
                x: random(treePositionMin, treePositionMax),
                y: 0,
                z: random(treePositionMin, treePositionMax)
            });
        }

        // hide trees
        this.trees.forEach((tree) => {
            if (tree) {
                const treeInsideX = tree.position.x > treePositionMin && tree.position.x < treePositionMax;
                const treeInsideY = tree.position.z > treePositionMin && tree.position.z < treePositionMax;
                tree.visible = treeInsideX && treeInsideY;
            }
        });

        // update persons
        const personMargin = 2;
        const personPositionMin = -sizeInner / 2 + personMargin;
        const personPositionMax = sizeInner / 2 - personMargin;

        this.personPositions = [];
        for (let i = 0; i <= 100000; i++) {
            this.personPositions.push({
                x: random(personPositionMin, personPositionMax),
                y: 0,
                z: random(personPositionMin, personPositionMax)
            });
        }

        // hide persons
        this.persons.forEach((person) => {
            if (person) {
                const personInsideX = person.position.x > personPositionMin && person.position.x < personPositionMax;
                const personInsideY = person.position.z > personPositionMin && person.position.z < personPositionMax;
                person.visible = personInsideX && personInsideY;
            }
        });

        if (this.grounds.length == 2) {
            // inner ground
            const planeGeometryInner = new THREE.PlaneGeometry(sizeInner, sizeInner);
            planeGeometryInner.rotateX(Math.PI / 2).translate(0, 0, 0);
            this.grounds[0].geometry.copy(planeGeometryInner);

            // outer ground
            const planeGeometryOuter = new THREE.PlaneGeometry(sizeOuter, sizeOuter);
            planeGeometryOuter.rotateX(Math.PI / 2).translate(0, -0.05, 0);
            this.grounds[1].geometry.copy(planeGeometryOuter);
        }
    }

    export(zip) {
        const forest = zip.folder('forest');

        // export trees
        const trees = { positions: [] };
        for (let i = 0; i < this.trees.length; i++) {
            trees.positions.push(this.treePositions[i]);
        }
        forest.file('trees.json', JSON.stringify(trees, null, 4));

        // export persons
        const persons = { positions: [] };
        for (let i = 0; i < this.persons.length; i++) {
            persons.positions.push(this.personPositions[i]);
        }
        forest.file('persons.json', JSON.stringify(persons, null, 4));
    }

    clear(full) {
        if (full) {
            // remove all trees
            this.trees.forEach((tree) => { this.scene.remove(tree); });
            this.trees = [];

            // remove all persons
            this.persons.forEach((person) => { this.scene.remove(person); });
            this.persons = [];
        }

        // remove trees
        for (let i = (this.trees.length - 1); i >= this.config.forest.size; i--) {
            this.scene.remove(this.trees[i]);
            this.trees.splice(i, 1);
        }

        // remove persons
        for (let i = (this.persons.length - 1); i >= 0; i--) {
            this.scene.remove(this.persons[i]);
            this.persons.splice(i, 1);
        }

        const appendTrees = this.config.forest.size - this.trees.length;
        if (appendTrees > 0) {
            this.trees.push.apply(this.trees, [...new Array(appendTrees)]);
        }
    }

    reset() {
        this.clear();
        this.update();

        this.addPersons();
    }
}
