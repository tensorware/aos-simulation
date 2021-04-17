class Image {
    constructor(camera) {
        this.root = camera.root;
        this.config = camera.config;
        this.scene = camera.scene;
        this.stage = camera.stage;
        this.forest = camera.forest;
        this.drone = camera.drone;
        this.camera = camera;

        this.view = this.drone.getView();
        this.plane = this.camera.capturePlane();
        this.resolution = this.camera.getResolution();
    }

    capture(type) {
        if (type === 'infrared') {
            // infrared images
            const rays = this.captureInfraredRays();
            const images = this.captureInfraredImage(rays);

            // integrate images
            this.integrateInfraredImages(images);
        }
        else if (type === 'monochrome') {
            // TODO monochrome images
        }
    }

    captureInfraredRays() {
        const cameraVector = new THREE.Vector3(this.view.x, this.view.y, this.view.z);
        const cornerDistance = Math.sqrt(this.view.r ** 2 + this.view.r ** 2) + 3;

        // nearby persons
        const persons = [];
        this.forest.persons.forEach((person) => {
            if (person) {
                const start = new THREE.Vector3(this.view.x, 0, this.view.z);
                const end = new THREE.Vector3(person.position.x, 0, this.view.z);

                // distance from camera to person
                const personDistance = start.distanceTo(end);
                if (personDistance <= cornerDistance) {
                    persons.push(person);
                }
            }
        });

        // nearby trees
        const trees = [];
        this.forest.trees.forEach((tree) => {
            if (tree) {
                const start = new THREE.Vector3(this.view.x, 0, this.view.z);
                const end = new THREE.Vector3(tree.position.x, 0, tree.position.z);

                // distance from camera to tree
                const treeDistance = start.distanceTo(end);
                if (treeDistance <= cornerDistance) {
                    tree.children.every((children) => { trees.push(children); });
                }
            }
        });

        // raycast persons
        const rays = [];
        persons.forEach((person) => {
            getPoints(person).forEach((personVector) => {
                const groundVector = new THREE.Vector3(personVector.x, 0, personVector.z);
                if (rayCast(cameraVector, groundVector, this.plane).length) {

                    // obstacles near the person 
                    const obstacles = trees.filter((tree) => {
                        const treeBox = new THREE.BoxHelper(tree, 0xffffff);
                        const treeCenter = getCenter(treeBox);

                        // angle between tree and person
                        const treeAngle = new THREE.Vector3();
                        treeAngle.copy(cameraVector).sub(new THREE.Vector3(treeCenter.x, cameraVector.y, treeCenter.z));
                        const personAngle = new THREE.Vector3();
                        personAngle.copy(cameraVector).sub(new THREE.Vector3(personVector.x, cameraVector.y, personVector.z));

                        // distance from camera to tree and person
                        const treeDistance = treeAngle.length();
                        const personDistance = personAngle.length();

                        // filter obstacles by angle and distance
                        const angle = treeAngle.angleTo(personAngle);
                        if (angle < Math.PI / 4 && (treeDistance - 3) < personDistance) {
                            // DEBUG
                            // this.scene.add(treeBox);
                            return true;
                        }
                    });

                    // check if obstacles are in between
                    const intersectVector = new THREE.Vector3(personVector.x, personVector.y, personVector.z);
                    if (!rayCast(cameraVector, intersectVector, obstacles).length) {
                        const intersectGeometry = new THREE.BufferGeometry().setFromPoints([cameraVector, intersectVector]);
                        const intersectLine = new THREE.Line(intersectGeometry, new THREE.LineBasicMaterial({ color: this.config.material.color.person }));

                        // append ray lines
                        rays.push(intersectLine);
                        this.camera.rays.push(intersectLine);

                        // DEBUG
                        // this.scene.add(intersectLine);
                    }
                }
            });
        });

        return rays;
    }

    captureInfraredImage(rays) {
        // get ray and border points
        const rayPoints = rays.map(getPoints);
        const borderPoints = this.camera.viewLines.map(getPoints);

        // get min values for each axes
        const min = new THREE.Vector3(
            Math.min.apply(Math, borderPoints.map((p) => { return p[1].x; })),
            Math.min.apply(Math, borderPoints.map((p) => { return p[1].y; })),
            Math.min.apply(Math, borderPoints.map((p) => { return p[1].z; }))
        );

        // subtract min point value for each axes
        const rayPointsGround = rayPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });
        const borderPointsGround = borderPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });

        // get max values for each axes
        const max = new THREE.Vector3(
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.x; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.y; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.z; }))
        );

        // convert simulation coordinates (meter) into image coordinates (pixel)
        const image = {
            rendered: {
                center: new THREE.Vector3(
                    this.view.x,
                    0,
                    this.view.z
                ),
                points: rayPointsGround.map((p) => {
                    return new THREE.Vector3(
                        p.x,
                        0,
                        p.z
                    );
                })
            },
            processed: {
                center: new THREE.Vector3(
                    Math.round(this.view.x * this.resolution.x / max.x),
                    0,
                    Math.round(this.view.z * this.resolution.z / max.z)
                ),
                points: rayPointsGround.map((p) => {
                    return new THREE.Vector3(
                        Math.round(p.x * this.resolution.x / max.x),
                        0,
                        Math.round(p.z * this.resolution.z / max.z)
                    );
                })
            }
        };

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // canvas image
        const canvas = document.createElement('canvas');
        canvas.width = this.resolution.x;
        canvas.height = this.resolution.z;

        // canvas background
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw pixel points
        image.processed.points.forEach((p) => {
            ctx.fillStyle = hexColor(this.config.material.color.person);
            ctx.fillRect(p.x, p.z, 1, 1);
        });

        // save base64 image
        image.rendered.base64 = canvasImage(this.camera.renderer.domElement);
        image.processed.base64 = canvasImage(canvas);

        // append image
        container.append(canvas);
        this.camera.slider.addImage(container);

        // return last captured images
        this.camera.images.push(image);
        return this.camera.images.slice(Math.max(this.camera.images.length - this.config.drone.camera.images, 0));
    }

    integrateInfraredImages(images) {
        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // canvas image
        const canvas = document.createElement('canvas');
        canvas.width = this.resolution.x;
        canvas.height = this.resolution.z;

        // canvas background
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = hexColor(this.config.material.color.plane);
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw pixel points
        const center = images[images.length - 1].processed.center;
        images.forEach((image) => {

            // delta from current center to captured images
            const delta = new THREE.Vector3();
            delta.copy(center).sub(image.processed.center);

            image.processed.points.forEach((p) => {
                ctx.fillStyle = hexColor(this.config.material.color.person);
                ctx.fillRect(p.x - delta.x, p.z - delta.z, 1, 1);
            });
        });

        // append preview
        container.append(canvas);
        this.camera.slider.addPreview(container);
    }
}