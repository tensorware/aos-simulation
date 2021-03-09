class Drone {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        this.drone = {};
        this.camera = {};
        this.cpu = {};
        this.image = {};
        this.goal = { x: 0, y: 0 };

        this.captures = [];

        const cameraGeometry = new THREE.ConeGeometry();
        const cameraMaterial = new THREE.MeshStandardMaterial({ color: 0xdddd88 });
        this.camera.cone = new THREE.Mesh(cameraGeometry, cameraMaterial);

        this.lines = [];
        for (let i = 0; i < 4; i++) {
            this.lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, this.camera.height, 0),
                new THREE.Vector3(0, 0, 0)
            ]), new THREE.LineBasicMaterial({ color: 0x990000 })));
        }

        const rectangleGeometry = new THREE.PlaneGeometry();
        rectangleGeometry.rotateX(-Math.PI / 2).translate(0, 0.05, 0);
        const rectangleMaterial = new THREE.MeshStandardMaterial({ color: 0xdddd88 });
        const rectangle = new THREE.Mesh(rectangleGeometry, rectangleMaterial);

        const wireGeometry = new THREE.WireframeGeometry(rectangleGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: 0x990000 });
        const wireFrame = new THREE.LineSegments(wireGeometry, wireMaterial);

        this.plane = {
            rectangle: rectangle,
            wire: wireFrame,
            border: new THREE.BoxHelper(rectangle, 0x990000)
        };

        this.setSpeed(this.config.droneSpeed);
        this.setHeight(this.config.droneHeight);
        this.setView(this.config.cameraView);
        this.setProcessing(this.config.processingSpeed);

        this.addCamera();
        this.addPlane();

        this.move = this.move.bind(this);
        window.addEventListener('dblclick', this.click.bind(this), false);
    }

    move(currentTime) {
        if (!currentTime) {
            requestAnimationFrame(this.move);
            this.startTime = 0;
            this.lastCapture = 0;
            return;
        }
        else if (!this.startTime) {
            this.startTime = currentTime;
        }

        const start = new THREE.Vector3(this.config.droneEastWest, this.config.droneHeight, this.config.droneNorthSouth);
        const end = new THREE.Vector3(this.goal.x, this.config.droneHeight, this.goal.z);

        const moveDuration = start.distanceTo(end) / this.drone.speed * 1000;
        const deltaTime = currentTime - this.startTime;
        const t = deltaTime / moveDuration;

        const currentDistance = deltaTime * this.drone.speed / 1000;
        const deltaDistance = currentDistance - this.lastCapture;

        // log('debug', moveDuration, deltaTime, start.distanceTo(end), currentDistance);

        if (deltaTime <= moveDuration) {
            const current = new THREE.Vector3();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(t, current);

            this.setEastWest(current.x);
            this.setNorthSouth(current.z);

            if (deltaDistance >= this.config.cameraSampling) {
                this.lastCapture = Math.floor(currentDistance);
                this.capture();
            }

            requestAnimationFrame(this.move);
        }
        else {
            this.config.droneEastWest = this.goal.x;
            this.config.droneNorthSouth = this.goal.z;
        }
    }

    addCamera() {
        this.scene.add(this.camera.cone);

        const lineGroup = new THREE.Group();
        this.lines.forEach((line) => {
            lineGroup.add(line);
        });
        this.scene.add(lineGroup);
    }

    addPlane() {
        this.scene.add(this.plane.rectangle);
        // this.scene.add(this.plane.wire);
        this.scene.add(this.plane.border);
    }

    getViewParameters(height) {
        const alpha = this.camera.view / 2;
        const beta = 90 - alpha;

        const hypotenuse = height / Math.sin(radian(beta));
        const radius = Math.sqrt(hypotenuse ** 2 - height ** 2);

        return {
            radius: radius,
            height: height,
            hypotenuse: hypotenuse
        };
    }

    setSpeed(speed) {
        this.drone.speed = speed;
        this.update();
    }

    setHeight(height) {
        this.camera.height = height;
        this.camera.cone.position.y = height + .5;
        this.update();
    }

    setEastWest(ew) {
        this.camera.cone.position.x = ew;
        this.update();
    }

    setNorthSouth(ns) {
        this.camera.cone.position.z = ns;
        this.update();
    }

    setView(view) {
        this.camera.view = view;
        const viewParameters = this.getViewParameters(1);
        const viewGeometry = new THREE.ConeGeometry(viewParameters.radius, viewParameters.height, 30, 30);
        this.camera.cone.geometry.copy(viewGeometry);
        this.update();
    }

    setProcessing(speed) {
        this.cpu.speed = speed;
        this.update();
    }

    click(event) {
        if (event.which != 1) {
            return;
        }

        const mouse = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: (event.clientY / window.innerHeight) * -2 + 1
        };

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector3(mouse.x, mouse.y, 1), this.stage.camera);

        const intersects = ray.intersectObjects(this.forest.grounds);
        if (intersects.length > 0) {
            this.config.droneEastWest = this.camera.cone.position.x;
            this.config.droneNorthSouth = this.camera.cone.position.z;
            this.goal = intersects[0].point;
            this.move();
        }
    }

    update() {
        if (!isValid(this.drone.speed, this.cpu.speed, this.camera.height, this.camera.view)) {
            return;
        }

        const distance = this.drone.speed * this.cpu.speed;
        const coverage = 2 * this.camera.height * Math.tan(radian(this.camera.view / 2));
        const overlap = coverage / distance;
        const time = coverage / this.drone.speed;

        // log('debug', distance, coverage, overlap, time);

        const viewHeight = this.camera.height;
        const viewCorners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const viewParameters = this.getViewParameters(viewHeight);

        this.lines.forEach((line, index) => {
            const x = viewParameters.radius * viewCorners[index][0] + this.camera.cone.position.x;
            const z = viewParameters.radius * viewCorners[index][1] + this.camera.cone.position.z;

            line.geometry.copy(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(this.camera.cone.position.x, viewHeight, this.camera.cone.position.z),
                new THREE.Vector3(x, 0, z)
            ]));
        });

        const resolution = 5; // this.config.cameraResolution;
        const rectangleGeometry = new THREE.PlaneGeometry(coverage, coverage, resolution, resolution);
        rectangleGeometry.rotateX(-Math.PI / 2).translate(this.camera.cone.position.x, 0.05, this.camera.cone.position.z);
        const wireGeometry = new THREE.WireframeGeometry(rectangleGeometry);

        this.plane.rectangle.geometry.copy(rectangleGeometry);
        this.plane.wire.geometry.copy(wireGeometry);
        this.plane.border.update();
    }

    capture() {
        const rectangle = this.plane.rectangle.clone();
        rectangle.material = this.plane.rectangle.material.clone();
        rectangle.geometry = this.plane.rectangle.geometry.clone();

        const border = this.plane.border.clone();
        border.material = this.plane.border.material.clone();
        border.geometry = this.plane.border.geometry.clone();

        const plane = new THREE.Group();
        plane.add(rectangle);
        plane.add(border);

        this.scene.add(plane);
        this.captures.push(plane);

        const persons = [];
        const obstacles = [];

        const viewParameters = this.getViewParameters(this.camera.height);
        const cornerDistance = Math.sqrt(viewParameters.radius ** 2 + viewParameters.radius ** 2) + 1;

        this.forest.persons.forEach((person) => {
            const start = new THREE.Vector3(this.camera.cone.position.x, 0, this.camera.cone.position.z);
            const end = new THREE.Vector3(person.position.x, 0, person.position.z);

            const personDistance = start.distanceTo(end);
            if (personDistance <= cornerDistance) {
                persons.push(person);
            }
        });

        this.forest.trees.forEach((tree) => {
            const start = new THREE.Vector3(this.camera.cone.position.x, 0, this.camera.cone.position.z);
            const end = new THREE.Vector3(tree.position.x, 0, tree.position.z);

            const treeDistance = start.distanceTo(end);
            if (treeDistance <= cornerDistance) {
                tree.children.every((children) => {
                    obstacles.push(children);
                });
            }
        });

        const cameraVector = new THREE.Vector3(this.camera.cone.position.x, this.camera.height, this.camera.cone.position.z);
        persons.forEach((person) => {
            const personPosition = person.geometry.attributes.position;
            const personVector = new THREE.Vector3();

            for (let i = 0; i < personPosition.count; i++) {
                personVector.fromBufferAttribute(personPosition, i);
                person.localToWorld(personVector);

                const radiations = ray(cameraVector, personVector, person);
                if (radiations.length) {
                    const radiation = radiations[0];
                    const intersectVector = new THREE.Vector3(radiation.point.x, radiation.point.y, radiation.point.z);
                    const intersectGeometry = new THREE.BufferGeometry().setFromPoints([cameraVector, intersectVector]);
                    const intersectLine = new THREE.Line(intersectGeometry, new THREE.LineBasicMaterial({ color: 0xd05bf5 }));

                    const groundVector = new THREE.Vector3(radiation.point.x, 0, radiation.point.z);
                    if (ray(intersectVector, groundVector, rectangle).length) {
                        if (!ray(cameraVector, intersectVector, obstacles).length) {
                            this.scene.add(intersectLine);
                        }
                    }
                }
            }
        });
    }

    clear() {
        this.captures.forEach((capture) => {
            this.scene.remove(capture);
        });
    }

    reset() {
        Object.assign(this.config, this.stage._config);
        this.setEastWest(0);
        this.setNorthSouth(0);
        this.clear();
        this.update();
    }
}
