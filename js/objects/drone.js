class Drone {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        new THREE.STLLoader().load('objects/drone.stl', ((droneGeometry) => {
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

            this.update();
            this.addDrone();
            this.addCamera();

            this.animate = this.animate.bind(this);
            this.click = doubleClick(this.click.bind(this));

            window.addEventListener('pointerdown', this.click);
            window.addEventListener('pointerup', this.click);

        }).bind(this));
    }

    addDrone() {
        this.scene.add(this.drone);
    }

    addCamera() {
        this.camera = new Camera(this);
    }

    setEastWest(ew) {
        this.drone.position.x = ew;
        this.update();
    }

    setNorthSouth(ns) {
        this.drone.position.z = ns;
        this.update();
    }

    click(e) {
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
            this.config.droneEastWest = this.drone.position.x;
            this.config.droneNorthSouth = this.drone.position.z;
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
                this.camera.capture();
            }

            requestAnimationFrame(this.animate);
        }
        else {
            this.config.droneEastWest = this.goal.x;
            this.config.droneNorthSouth = this.goal.z;
        }
    }

    update() {
        this.drone.position.y = this.config.droneHeight;

        if (this.camera) {
            this.camera.update();
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
