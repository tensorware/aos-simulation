class Image {
    constructor(camera, index) {
        this.root = camera.root;
        this.config = camera.config;
        this.scene = camera.scene;
        this.stage = camera.stage;
        this.forest = camera.forest;
        this.drone = camera.drone;
        this.camera = camera;
        this.index = index;

        this.center = this.camera.center;
        this.coverage = this.camera.coverage;
        this.rotation = this.camera.rotation;

        this.plane = this.camera.getPlane();
        this.resolution = this.camera.getResolution();
        this.type = this.config.drone.camera.type;

        this.borderPoints = this.camera.viewLines.map(getPoints);
        this.rendering = cloneCanvas(this.camera.renderer.domElement, true);

        this.loaded = new Promise(function (resolve) {
            resolve(this);
        }.bind(this));
    }

    async capture(preview) {
        if (this.type === 'infrared') {
            return this.captureInfraredImage(preview).then((images) => {
                if (preview) {
                    return this.integrateInfraredImages(images);
                }
            });
        }
        else if (this.type === 'monochrome') {
            return this.captureMonochromeImage(preview).then((images) => {
                if (preview) {
                    return this.integrateMonochromeImages(images);
                }
            });
        }
    }

    async getRays() {
        const cameraVector = this.center;
        const cornerDistance = Math.sqrt((this.coverage / 2) ** 2 + (this.coverage / 2) ** 2) + 3;

        // TODO remove or refactor person ray casting

        // nearby persons
        const persons = [];
        this.forest.persons.forEach((person) => {
            if (person && person.visible) {
                const start = new THREE.Vector3(this.center.x, 0, this.center.z);
                const end = new THREE.Vector3(person.position.x, 0, this.center.z);

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
            if (tree && tree.visible) {
                const start = new THREE.Vector3(this.center.x, 0, this.center.z);
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
                        treeBox.layers.set(1);

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
                        if (angle < rad(45) && (treeDistance - 3) < personDistance) {
                            // append boxes
                            this.camera.boxes.push(treeBox);

                            // DEBUG
                            this.scene.add(treeBox);
                            return true;
                        }
                    });

                    // check if obstacles are in between
                    const intersectVector = new THREE.Vector3(personVector.x, personVector.y, personVector.z);
                    if (!rayCast(cameraVector, intersectVector, obstacles).length) {
                        const intersectGeometry = new THREE.BufferGeometry().setFromPoints([cameraVector, intersectVector]);
                        const intersectLine = new THREE.Line(intersectGeometry, new THREE.LineBasicMaterial({ color: this.config.material.color.person }));
                        intersectLine.layers.set(1);

                        // append ray lines
                        rays.push(intersectLine);
                        this.camera.rays.push(intersectLine);

                        // DEBUG
                        this.scene.add(intersectLine);
                    }
                }
            });
        });

        return rays;
    }

    async captureInfraredImage(preview) {
        // get ray and border points
        const rayPoints = preview ? (await this.getRays()).map(getPoints) : [];

        // get min values for each axes
        const min = new THREE.Vector3(
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].x; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].y; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].z; }))
        );

        // subtract min point value for each border points axes
        const borderPointsGround = this.borderPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });

        // get max values for each axes
        const max = new THREE.Vector3(
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.x; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.y; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.z; }))
        );

        // subtract min point value for each ray points axes
        const rayPointsGround = rayPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });

        // convert simulation coordinates (meter) into image coordinates (pixel)
        const image = {
            index: this.index,
            rendered: {
                center: new THREE.Vector3(
                    this.center.x,
                    0,
                    this.center.z
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
                    Math.round(this.center.x * this.resolution.x / max.x),
                    0,
                    Math.round(this.center.z * this.resolution.z / max.z)
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
        image.base64 = canvasImage(canvas);

        if (preview) {
            // canvas container
            const container = document.createElement('div');
            container.className = 'image';

            // append image
            container.append(canvas);
            this.camera.slider.addImage(container);
        }

        // return last captured images
        this.camera.images.push(image);
        return this.camera.images.slice(Math.max(this.camera.images.length - this.config.drone.camera.images, 0));
    }

    async integrateInfraredImages(images) {
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

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // append preview
        container.append(canvas);
        this.camera.slider.addPreview(container);

        // return image index
        return images.length - 1;
    }

    async getPixels() {
        // get person pixel color
        const color = {
            r: (this.config.material.color.person & 0xff0000) >> 16,
            g: (this.config.material.color.person & 0x00ff00) >> 8,
            b: (this.config.material.color.person & 0x0000ff)
        };

        // get canvas pixel data
        const ctx = this.rendering.getContext('2d');
        const data = ctx.getImageData(0, 0, this.rendering.width, this.rendering.height);
        const pixels = data.data;

        // check canvas pixel color
        const visiblePixels = [];
        for (let i = 0; i < pixels.length; i += 4) {
            const pixelColor = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };

            // check if person color matches canvas pixel color 
            if (colorMatch(color, pixelColor, 1)) {
                visiblePixels.push(new THREE.Vector3(
                    (i / 4) % this.rendering.width,
                    0,
                    Math.floor((i / 4) / this.rendering.height)
                ));
            }
        }

        return visiblePixels;
    }

    async captureMonochromeImage(preview) {
        // get visible and border points
        const visiblePoints = preview ? await this.getPixels() : [];

        // get min values for each axes
        const min = new THREE.Vector3(
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].x; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].y; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].z; }))
        );

        // subtract min point value for each border points axes
        const borderPointsGround = this.borderPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });

        // get max values for each axes
        const max = new THREE.Vector3(
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.x; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.y; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.z; }))
        );

        // convert simulation coordinates (meter) into image coordinates (pixel)
        const image = {
            index: this.index,
            rendered: {
                center: new THREE.Vector3(
                    this.center.x,
                    0,
                    this.center.z
                ),
                points: visiblePoints.map((p) => {
                    return new THREE.Vector3(
                        p.x * max.x / this.resolution.x,
                        0,
                        p.z * max.z / this.resolution.z
                    );
                })
            },
            processed: {
                center: new THREE.Vector3(
                    Math.round(this.center.x * this.resolution.x / max.x),
                    0,
                    Math.round(this.center.z * this.resolution.z / max.z)
                ),
                points: visiblePoints
            }
        };

        // canvas image
        const canvas = this.rendering;

        // save base64 image
        image.base64 = canvasImage(canvas);

        if (preview) {
            // canvas container
            const container = document.createElement('div');
            container.className = 'image';

            // append image
            container.append(canvas);
            this.camera.slider.addImage(container);
        }

        // return last captured images
        this.camera.images.push(image);
        return this.camera.images.slice(Math.max(this.camera.images.length - this.config.drone.camera.images, 0));
    }

    async integrateMonochromeImages(images) {
        // canvas image
        const canvas = cloneCanvas(this.rendering, true);
        const ctx = canvas.getContext('2d');

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

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // append preview
        container.append(canvas);
        this.camera.slider.addPreview(container);

        // return image index
        return images.length - 1;
    }
};