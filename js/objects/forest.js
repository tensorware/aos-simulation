class Forest {
    constructor(stage) {
        this.root = stage.root;
        this.config = stage.config;
        this.scene = stage.scene;
        this.stage = stage;

        this.trees = [];
        this.persons = [];
        this.grounds = [];

        this.treePositions = [];
        this.personPositions = [];

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

    addGround() {
        const geometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
        geometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        const plane = new THREE.Mesh(geometry, this.groundMaterial);

        this.grounds.push(plane);
        this.scene.add(plane);
    }

    addTree(i) {
        const tree = new Tree({ ...this.config, seed: randomInt(0, 1000) });

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

        const scale = 3.5;
        treeGroup.position.x = this.treePositions[i].x;
        treeGroup.position.z = this.treePositions[i].z;
        treeGroup.scale.set(scale, scale, scale);

        this.trees.push(treeGroup);
        this.scene.add(treeGroup);
    }

    addTrees() {
        for (let i = 0; i < this.config.trees; i++) {
            this.addTree(i);
        }
    }

    addPerson(i) {
        const person = new Person(this.config).mesh;
        person.position.x = this.personPositions[i].x;
        person.position.z = this.personPositions[i].z;

        this.persons.push(person);
        this.scene.add(person);
    }

    addPersons() {
        for (let i = 0; i < this.config.persons; i++) {
            this.addPerson(i);
        }
    }

    update() {
        const treeMargin = 1;
        this.treePositions = [];
        for (let i = 0; i <= this.config.trees; i++) {
            this.treePositions.push({
                x: randomInt(-this.config.size / 2 + treeMargin, this.config.size / 2 - treeMargin),
                z: randomInt(-this.config.size / 2 + treeMargin, this.config.size / 2 - treeMargin)
            });
        }

        const personMargin = 2;
        this.personPositions = [];
        for (let i = 0; i <= this.config.persons; i++) {
            this.personPositions.push({
                x: randomInt(-this.config.size / 2 + personMargin, this.config.size / 2 - personMargin),
                z: randomInt(-this.config.size / 2 + personMargin, this.config.size / 2 - personMargin)
            });
        }

        const planeGeometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
        planeGeometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        this.grounds.forEach((ground) => {
            ground.geometry.copy(planeGeometry);
        });
    }

    clear() {
        this.trees.forEach((tree) => {
            this.scene.remove(tree);
        });
        this.trees = [];

        this.persons.forEach((person) => {
            this.scene.remove(person);
        });
        this.persons = [];
    }

    reset() {
        Object.assign(this.config, this.stage._config);
        this.treeMaterial.color.setHex(this.config.treeColor);
        this.twigMaterial.color.setHex(this.config.twigColor);
        this.groundMaterial.color.setHex(this.config.groundColor);
        this.update();
        this.clear();
        this.addTrees();
        this.addPersons();
    }
}
