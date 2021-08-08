class Drone {
    constructor(forest, index) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;
        this.index = index;

        this.flying = false;
        this.goal = new THREE.Vector3();

        this.loaded = new Promise(function (resolve) {
            new THREE.STLLoader().load('model/drone.stl', ((stl) => {
                const droneGeometry = stl;
                droneGeometry.rotateX(rad(-90)).rotateY(rad(-90)).translate(0, 0, 0);

                const droneMaterial = new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    roughness: 0.8,
                    metalness: 0.8
                });

                this.drone = new THREE.Mesh(droneGeometry, droneMaterial);
                this.drone.scale.multiplyScalar(15 / 100);
                this.drone.position.set(
                    this.config.drone.eastWest,
                    this.config.drone.height,
                    this.config.drone.northSouth
                );
                this.drone.setRotationFromEuler(new THREE.Euler(0, rad(this.config.drone.rotation), 0));

                this.addDrone();
                this.addCamera();
                this.update();

                // update preview
                this.forest.workersMessage(() => {
                    this.update();
                });

                // animations
                this.animate = this.animate.bind(this);
                this.click = doubleClick(this.click.bind(this));

                // events
                window.addEventListener('pointerdown', this.click);
                window.addEventListener('pointerup', this.click);

                resolve(this);
            }).bind(this));
        }.bind(this));
    }

    addDrone() {
        this.scene.add(this.drone);
    }

    addCamera() {
        this.camera = new Camera(this, this.index);
    }

    getView() {
        // center
        const center = this.drone.position.clone();

        // coverage
        const coverage = 2 * center.y * Math.tan(rad(this.config.drone.camera.view / 2));

        // rotation
        const rotation = rad(this.config.drone.rotation);

        return {
            center: center,
            coverage: coverage,
            rotation: rotation
        };
    }

    click(e) {
        if (e.target.parentElement.id !== 'stage' || e.which != 1) {
            return;
        }

        // mouse click coordinates
        const mouse = {
            x: (e.clientX / this.root.clientWidth) * 2 - 1,
            y: (e.clientY / this.root.clientHeight) * -2 + 1
        };

        // raycast target
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector3(mouse.x, mouse.y, 1), this.stage.camera);

        const intersects = ray.intersectObject(this.forest.grounds[0]);
        if (intersects.length) {
            // set goal position
            this.goal = intersects[0].point;

            // update config position
            this.config.drone.eastWest = this.drone.position.x;
            this.config.drone.northSouth = this.drone.position.z;

            // flight start
            this.flying = true;

            // animate movement
            this.animate();
        }
    }

    async setEastWest(position) {
        this.drone.position.x = position;
        await this.update();
    }

    async setNorthSouth(position) {
        this.drone.position.z = position;
        await this.update();
    }

    async animate(currentTime) {
        if (!currentTime) {
            this.startTime = 0;
            this.lastCapture = 0;
            requestAnimationFrame(this.animate);
            return;
        }
        else if (!this.startTime) {
            this.startTime = currentTime;
        }

        // trajectory coordinates
        const start = new THREE.Vector3(this.config.drone.eastWest, this.config.drone.height, this.config.drone.northSouth);
        const end = new THREE.Vector3(this.goal.x, this.config.drone.height, this.goal.z);

        const moveDuration = start.distanceTo(end) / this.config.drone.speed * 1000;
        if (moveDuration <= 0) {
            return;
        }

        // calculate time
        const deltaTime = currentTime - this.startTime;
        const trajectoryTime = deltaTime / moveDuration;

        // calculate distance
        const currentDistance = deltaTime * this.config.drone.speed / 1000;
        const deltaDistance = currentDistance - this.lastCapture;

        // DEBUG
        // log('debug', moveDuration, deltaTime, start.distanceTo(end), currentDistance);

        // TODO use distance based logic
        if (deltaTime <= moveDuration) {
            const current = new THREE.Vector3();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(trajectoryTime, current);

            // update drone position
            this.drone.position.x = current.x;
            this.drone.position.z = current.z;
            await this.update();

            // capture image
            if (deltaDistance >= this.config.drone.camera.sampling) {
                this.lastCapture = Math.floor(currentDistance);
                await this.camera.capture(true);
            }

            if (this.flying) {
                // next animation
                requestAnimationFrame(this.animate);
            }
            else {
                // reset position
                await this.setEastWest(0.0);
                await this.setNorthSouth(0.0);
            }
        }
        else {
            // goal reached
            this.config.drone.eastWest = this.goal.x;
            this.config.drone.northSouth = this.goal.z;

            // flight stop
            this.flying = false;
        }
    }

    async capture() {
        const { coverage } = this.getView();

        const start = {
            x: Math.round(-this.config.forest.ground / 2 - coverage / 2),
            y: 0,
            z: Math.round(-this.config.forest.ground / 2 + coverage / 2)
        };

        const end = {
            x: Math.round(this.config.forest.ground / 2 + coverage / 2),
            y: 0,
            z: Math.round(this.config.forest.ground / 2 + coverage / 2)
        };

        const step = {
            x: this.config.drone.camera.sampling,
            y: 0,
            z: coverage
        };

        // flight start
        this.flying = true;
        this.stage.status('Capturing', 0);

        // approximate number of images
        const imageCount = Math.ceil((end.z - start.z) / step.z) * Math.ceil((end.x - start.x) / step.x) + 1;

        // update drone position
        let i = 0;
        let dir = 1;
        for (let z = start.z; z <= end.z && this.flying; z += step.z) {
            // set north/south position
            await this.setNorthSouth(z);

            for (let x = start.x; x <= end.x && this.flying; x += step.x) {
                // set east/west position
                await this.setEastWest(x * dir);

                // capture image
                await this.camera.capture(false);
                await sleep();

                // update capture status
                this.stage.status('Capturing', Math.round(++i * 100 / imageCount));
            }

            // swap direction
            dir = dir * -1;
        }

        // reset drone position
        this.drone.position.x = 0.0;
        this.drone.position.z = 0.0;

        // reset config position
        this.config.drone.eastWest = this.drone.position.x;
        this.config.drone.northSouth = this.drone.position.z;

        // flight stop
        this.flying = false;
        await this.update();

        // capture finished
        this.stage.status('Capturing', 100);
        sleep(1000).then(() => {
            this.stage.status();
        });
    }

    async update() {
        if (!this.drone) {
            return;
        }

        const { rotation } = this.getView();

        // set height
        this.drone.position.y = this.config.drone.height;

        // set rotation
        this.drone.setRotationFromEuler(new THREE.Euler(0, rotation, 0));

        // update camera
        if (this.camera) {
            await this.camera.update();
        }
    }

    async export(zip) {
        const drone = zip.folder('drone');

        // export drone
        drone.file('drone.json', JSON.stringify(this.getView(), null, 4));

        // export camera
        if (this.camera) {
            await this.camera.export(drone);
        }
    }

    async clear() {
        // flight abort
        this.flying = false;

        // reset position
        await this.setEastWest(0.0);
        await this.setNorthSouth(0.0);

        if (this.camera) {
            await this.camera.clear();
        }
    }

    async reset() {
        await this.clear();
        await this.update();

        await sleep(100);
    }
};
