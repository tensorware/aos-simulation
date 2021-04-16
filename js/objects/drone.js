class Drone {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        new THREE.STLLoader().load('stl/drone.stl', ((droneGeometry) => {
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
            this.drone = droneMesh;

            this.drone.position.x = this.config.drone.eastWest;
            this.drone.position.y = this.config.drone.height;
            this.drone.position.z = this.config.drone.northSouth;

            this.addDrone();
            this.addCamera();
            this.update();

            this.animate = this.animate.bind(this);
            this.doubleClick = doubleClick(this.doubleClick.bind(this));

            window.addEventListener('pointerdown', this.doubleClick);
            window.addEventListener('pointerup', this.doubleClick);

        }).bind(this));
    }

    addDrone() {
        this.scene.add(this.drone);
    }

    addCamera() {
        this.camera = new Camera(this);
    }

    setEastWest(position) {
        this.drone.position.x = position;
        this.update();
    }

    setNorthSouth(position) {
        this.drone.position.z = position;
        this.update();
    }

    getView() {
        // drone position on sky
        const x = this.drone.position.x;
        const y = this.drone.position.y;
        const z = this.drone.position.z;

        // angles from sky to ground
        const a = this.config.drone.camera.view / 2;
        const b = 90 - a;
        const c = y / Math.sin(radian(b));

        // field of view "radius" on ground
        const r = Math.sqrt(c ** 2 - y ** 2);

        return {
            x: x,
            y: y,
            z: z,
            r: r
        };
    }

    doubleClick(e) {
        if (e.target.parentElement.id !== 'stage' || e.which != 1) {
            return;
        }

        const mouse = {
            x: (e.clientX / this.root.clientWidth) * 2 - 1,
            y: (e.clientY / this.root.clientHeight) * -2 + 1
        };

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector3(mouse.x, mouse.y, 1), this.stage.camera);

        const intersects = ray.intersectObjects(this.forest.grounds);
        if (intersects.length) {
            this.config.drone.eastWest = this.drone.position.x;
            this.config.drone.northSouth = this.drone.position.z;
            this.goal = intersects[0].point;
            this.animate();
        }
    }

    animate(currentTime) {
        if (!currentTime) {
            this.startTime = 0;
            this.lastCapture = 0;
            requestAnimationFrame(this.animate);
            return;
        }
        else if (!this.startTime) {
            this.startTime = currentTime;
        }

        const start = new THREE.Vector3(this.config.drone.eastWest, this.config.drone.height, this.config.drone.northSouth);
        const end = new THREE.Vector3(this.goal.x, this.config.drone.height, this.goal.z);

        const moveDuration = start.distanceTo(end) / this.config.drone.speed * 1000;
        if (moveDuration <= 0) {
            return;
        }

        const deltaTime = currentTime - this.startTime;
        const trajectoryTime = deltaTime / moveDuration;

        const currentDistance = deltaTime * this.config.drone.speed / 1000;
        const deltaDistance = currentDistance - this.lastCapture;

        // DEBUG
        // log('debug', moveDuration, deltaTime, start.distanceTo(end), currentDistance);

        // TODO use distance based logic
        if (deltaTime <= moveDuration) {
            const current = new THREE.Vector3();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(trajectoryTime, current);

            this.drone.position.x = current.x;
            this.drone.position.z = current.z;

            this.update();

            if (deltaDistance >= this.config.drone.camera.sampling) {
                this.lastCapture = Math.floor(currentDistance);
                this.camera.capture();
            }

            requestAnimationFrame(this.animate);
        }
        else {
            this.config.drone.eastWest = this.goal.x;
            this.config.drone.northSouth = this.goal.z;
        }
    }

    update() {
        if (this.drone) {
            this.drone.position.y = this.config.drone.height;

            if (this.camera) {
                this.camera.update();
            }
        }
    }

    export(zip) {
        const drone = zip.folder('drone');

        if (this.camera) {
            this.camera.export(drone);
        }
    }

    clear() {
        if (this.camera) {
            this.camera.clear();
        }
    }

    reset() {
        this.clear();
        this.update();
    }
}
