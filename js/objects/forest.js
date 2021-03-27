class Forest {
    constructor(stage) {
        this.root = stage.root;
        this.config = stage.config;
        this.scene = stage.scene;
        this.stage = stage;

        this.trees = [...new Array(this.config.trees)];
        this.persons = [... new Array(this.config.persons)];

        this.grounds = [];
        this.treePositions = [];
        this.personPositions = [];

        this.workers = getWorkers();

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
            map: new THREE.TextureLoader().load('img/leaf.png'),
            color: this.config.twigColor,
            roughness: 1.0,
            metalness: 0.3,
            alphaTest: 0.8
        });

        this.update();
        this.addGround();
        this.addTrees();
        this.addPersons();
    }

    getGround() {
        const geometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
        geometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        return new THREE.Mesh(geometry, this.groundMaterial);
    }

    getTree(index) {
        const seed = random(0, 1000, index);
        const config = { ... this.config };
        for (let key in config) {
            if (random(0, 100, seed) <= 50) {
                config[key] = config[key] * (random(this.config.homogeneity, 100, seed) / 100);
            }
        }
        config.seed = seed;
        config.index = index;
        return config;
    }

    getPerson(index) {
        const person = new Person(this.config).mesh;
        person.position.x = this.personPositions[index].x;
        person.position.z = this.personPositions[index].z;
        return person;
    }

    addGround() {
        const ground = this.getGround();
        this.grounds.push(ground);
        this.scene.add(ground);
    }

    addTrees() {
        const workerConfigs = [];
        for (let i = 0; i < this.config.trees; i++) {
            workerConfigs.push(this.getTree(i));
        }

        this.workers.forEach((worker) => { worker.terminate() });
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

                    const scale = 3;
                    treeGroup.scale.set(scale, scale, scale);
                    treeGroup.position.x = this.treePositions[tree.index].x;
                    treeGroup.position.z = this.treePositions[tree.index].z;

                    if (tree.index < this.trees.length) {
                        if (this.trees[tree.index]) {
                            treeGroup.position.x = this.trees[tree.index].position.x;
                            treeGroup.position.z = this.trees[tree.index].position.z;
                            this.scene.remove(this.trees[tree.index]);
                        }
                        this.trees[tree.index] = treeGroup;
                    } else {
                        this.trees.push(treeGroup);
                    }
                    this.scene.add(treeGroup);
                });
            }).bind(this);
        });
    }

    addPersons() {
        const persons = [];
        for (let i = 0; i < this.config.persons; i++) {
            persons.push(this.getPerson(i));
        }

        persons.forEach((person, i) => {
            this.persons[i] = person;
            this.scene.add(person);
        });
    }

    update() {
        const treeMargin = 1;
        this.treePositions = [];
        for (let i = 0; i <= 100000; i++) {
            this.treePositions.push({
                x: random(-this.config.size / 2 + treeMargin, this.config.size / 2 - treeMargin),
                z: random(-this.config.size / 2 + treeMargin, this.config.size / 2 - treeMargin)
            });
        }

        const personMargin = 2;
        this.personPositions = [];
        for (let i = 0; i <= 100000; i++) {
            this.personPositions.push({
                x: random(-this.config.size / 2 + personMargin, this.config.size / 2 - personMargin),
                z: random(-this.config.size / 2 + personMargin, this.config.size / 2 - personMargin)
            });
        }

        const planeGeometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
        planeGeometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        this.grounds.forEach((ground) => {
            ground.geometry.copy(planeGeometry);
        });
    }

    clear(full) {
        if (full) {
            this.trees.forEach((tree) => {
                this.scene.remove(tree);
            });
            this.trees = [];

            this.persons.forEach((person) => {
                this.scene.remove(person);
            });
            this.persons = [];
        }

        for (let i = (this.trees.length - 1); i >= this.config.trees; i--) {
            this.scene.remove(this.trees[i]);
            this.trees.splice(i, 1);
        }

        for (let i = (this.persons.length - 1); i >= 0; i--) {
            this.scene.remove(this.persons[i]);
            this.persons.splice(i, 1);
        }

        const appendTrees = this.config.trees - this.trees.length;
        if (appendTrees > 0) {
            this.trees.push.apply(this.trees, [...new Array(appendTrees)]);
        }
    }

    reset() {
        this.clear();
        this.update();

        // this.addTrees();
        this.addPersons();
    }
}
