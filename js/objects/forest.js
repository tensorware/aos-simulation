class Forest {
    constructor(stage) {
        this.root = stage.root;
        this.config = stage.config;
        this.scene = stage.scene;
        this.stage = stage;

        this.trees = [];
        this.persons = [];
        this.grounds = [];
        this.positions = [];

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

    addTree(index) {
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
        treeGroup.position.x = this.positions[index].x;
        treeGroup.position.z = this.positions[index].z;
        treeGroup.scale.set(scale, scale, scale);

        this.trees.push(treeGroup);
        this.scene.add(treeGroup);
    }

    addTrees() {        
        for (let i = 0; i < this.config.trees; i++) {
            this.addTree(i);
        }
    }

    addPerson(index) {
        const person = new Person(this.config);
        this.persons.push(person.mesh);
        this.scene.add(person.mesh);
    }

    addPersons() {
        for (let i = 0; i < this.config.persons; i++) {
            this.addPerson(i);
        }
    }

    update() {
        const margin = 1;

        this.positions = [];
        for (let i = 0; i < 1000; i++) {
            this.positions.push({
                x: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin),
                z: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin)
            });
        }

        const planeGeometry = new THREE.PlaneGeometry(this.config.size, this.config.size);
        planeGeometry.rotateX(Math.PI / 2).translate(0, 0, 0);
        this.grounds.forEach((ground) => {
            ground.geometry.copy(planeGeometry);
        });

        const position = {
            x: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin),
            z: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin)
        };
        const personGeometry = new THREE.PlaneGeometry(1, 2);
        personGeometry.rotateX(-Math.PI / 2).translate(position.x, 0.10, position.z);
        this.persons.forEach((person) => {
            person.geometry.copy(personGeometry);
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
