class Drone {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        new THREE.STLLoader().load('objects/drone.stl', ((droneGeometry) => {
            this.rays = [];
            this.captures = [];
            this.goal = { x: 0, y: 0 };

            droneGeometry.rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).translate(0, 0, 0);
            const droneMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.8,
                metalness: 0.8
            });

            const scale = 0.15;
            const droneMesh = new THREE.Mesh(droneGeometry, droneMaterial);
            droneMesh.scale.set(scale, scale, scale);
            this.camera = droneMesh;

            this.lines = [];
            for (let i = 0; i < 4; i++) {
                this.lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, this.config.droneHeight, 0),
                    new THREE.Vector3(0, 0, 0)
                ]), new THREE.LineBasicMaterial({ color: 0x990000 })));
            }

            this.planeMaterial = new THREE.MeshStandardMaterial({ color: 0xdddd88 });

            const rectangleGeometry = new THREE.PlaneGeometry();
            rectangleGeometry.rotateX(-Math.PI / 2).translate(0, 0.05, 0);
            const rectangle = new THREE.Mesh(rectangleGeometry, this.planeMaterial);

            const wireGeometry = new THREE.WireframeGeometry(rectangleGeometry);
            const wireMaterial = new THREE.LineBasicMaterial({ color: 0x990000 });
            const wireFrame = new THREE.LineSegments(wireGeometry, wireMaterial);

            this.plane = {
                rectangle: rectangle,
                wire: wireFrame,
                border: new THREE.BoxHelper(rectangle, 0x990000),
                text: new THREE.Mesh()
            };

            const textGeometry = new THREE.TextGeometry('', { font: this.stage.font });
            textGeometry.rotateX(-Math.PI / 2);
            const textMaterial = new THREE.MeshPhongMaterial({ color: 0x990000, specular: 0xff6666 });
            this.plane.text = new THREE.Mesh(textGeometry, textMaterial);

            this.update();
            this.addCamera();
            this.addPlane();

            this.move = this.move.bind(this);
            window.addEventListener('pointerdown', doubleClick(this.click.bind(this)), false);
        }).bind(this));
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

        const moveDuration = start.distanceTo(end) / this.config.droneSpeed * 1000;
        const deltaTime = currentTime - this.startTime;
        const trajectoryTime = deltaTime / moveDuration;

        const currentDistance = deltaTime * this.config.droneSpeed / 1000;
        const deltaDistance = currentDistance - this.lastCapture;

        // log('debug', moveDuration, deltaTime, start.distanceTo(end), currentDistance);

        if (deltaTime <= moveDuration) {
            const current = new THREE.Vector3();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(trajectoryTime, current);

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
        this.scene.add(this.camera);

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
        this.scene.add(this.plane.text);
    }

    getViewParameters(height) {
        const alpha = this.config.cameraView / 2;
        const beta = 90 - alpha;

        const hypotenuse = height / Math.sin(radian(beta));
        const radius = Math.sqrt(hypotenuse ** 2 - height ** 2);

        return {
            radius: radius,
            height: height,
            hypotenuse: hypotenuse
        };
    }

    setEastWest(ew) {
        this.camera.position.x = ew;
        this.update();
    }

    setNorthSouth(ns) {
        this.camera.position.z = ns;
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
        if (intersects.length) {
            this.config.droneEastWest = this.camera.position.x;
            this.config.droneNorthSouth = this.camera.position.z;
            this.goal = intersects[0].point;
            this.move();
        }
    }

    update() {
        this.camera.position.y = this.config.droneHeight;

        const distance = this.config.droneSpeed * this.config.processingSpeed;
        const coverage = 2 * this.config.droneHeight * Math.tan(radian(this.config.cameraView / 2));
        const overlap = coverage / distance;
        const time = coverage / this.config.droneSpeed;

        // log('debug', distance, coverage, overlap, time);

        const viewHeight = this.config.droneHeight;
        const viewCorners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const viewParameters = this.getViewParameters(viewHeight);

        this.lines.forEach((line, index) => {
            const x = viewParameters.radius * viewCorners[index][0] + this.camera.position.x;
            const z = viewParameters.radius * viewCorners[index][1] + this.camera.position.z;

            line.geometry.copy(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(this.camera.position.x, viewHeight, this.camera.position.z),
                new THREE.Vector3(x, 0, z)
            ]));
        });

        const x = this.camera.position.x;
        const y = 0.05;
        const z = this.camera.position.z;

        const rectangleGeometry = new THREE.PlaneGeometry(coverage, coverage);
        rectangleGeometry.rotateX(-Math.PI / 2).translate(x, y, z);
        const wireGeometry = new THREE.WireframeGeometry(rectangleGeometry);

        const text = coverage.toFixed(2) + ' x ' + coverage.toFixed(2);
        const textGeometry = new THREE.TextGeometry(text, { font: this.stage.font, size: coverage / 10, height: 0.01 });
        textGeometry.rotateX(-Math.PI / 2);

        this.plane.rectangle.geometry.copy(rectangleGeometry);
        this.plane.wire.geometry.copy(wireGeometry);
        this.plane.text.geometry.copy(textGeometry);
        this.plane.border.update();

        const textSize = new THREE.Vector3();
        new THREE.Box3().setFromObject(this.plane.text).getSize(textSize);
        textGeometry.translate(x - textSize.x / 2, y, z + textSize.z / 2);
        this.plane.text.geometry.copy(textGeometry);
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

        const viewParameters = this.getViewParameters(this.config.droneHeight);
        const cornerDistance = Math.sqrt(viewParameters.radius ** 2 + viewParameters.radius ** 2) + 1;

        this.forest.persons.forEach((person) => {
            if (person) {
                const start = new THREE.Vector3(this.camera.position.x, 0, this.camera.position.z);
                const end = new THREE.Vector3(person.position.x, 0, person.position.z);

                const personDistance = start.distanceTo(end);
                if (personDistance <= cornerDistance) {
                    persons.push(person);
                }
            }
        });

        this.forest.trees.forEach((tree) => {
            if (tree) {
                const start = new THREE.Vector3(this.camera.position.x, 0, this.camera.position.z);
                const end = new THREE.Vector3(tree.position.x, 0, tree.position.z);

                const treeDistance = start.distanceTo(end);
                if (treeDistance <= cornerDistance) {
                    tree.children.every((children) => {
                        obstacles.push(children);
                    });
                }
            }
        });

        const cameraVector = new THREE.Vector3(this.camera.position.x, this.config.droneHeight, this.camera.position.z);
        persons.forEach((person) => {
            const personPosition = person.geometry.attributes.position;
            const personVector = new THREE.Vector3();

            for (let i = 0; i < personPosition.count; i++) {
                personVector.fromBufferAttribute(personPosition, i);
                person.localToWorld(personVector);

                const radiations = raycast(cameraVector, personVector, person);
                if (radiations.length) {
                    const radiation = radiations[0];
                    const intersectVector = new THREE.Vector3(radiation.point.x, radiation.point.y, radiation.point.z);
                    const intersectGeometry = new THREE.BufferGeometry().setFromPoints([cameraVector, intersectVector]);
                    const intersectLine = new THREE.Line(intersectGeometry, new THREE.LineBasicMaterial({ color: 0xd05bf5 }));

                    const groundVector = new THREE.Vector3(radiation.point.x, 0, radiation.point.z);
                    if (raycast(intersectVector, groundVector, rectangle).length) {
                        if (!raycast(cameraVector, intersectVector, obstacles).length) {
                            this.rays.push(intersectLine);
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
        this.captures = [];

        this.rays.forEach((ray) => {
            this.scene.remove(ray);
        });
        this.rays = [];
    }

    reset() {
        this.clear();
        this.update();
    }
}
