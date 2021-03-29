class Camera {
    constructor(drone) {
        this.root = drone.root;
        this.config = drone.config;
        this.scene = drone.scene;
        this.stage = drone.stage;
        this.forest = drone.forest;
        this.drone = drone;

        this.rays = [];
        this.planes = [];
        this.images = [];

        this.viewLines = [];
        for (let i = 0; i < 4; i++) {
            this.viewLines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, this.config.drone.height, 0),
                new THREE.Vector3(0, 0, 0)
            ]), new THREE.LineBasicMaterial({ color: 0x990000 })));
        }

        this.planeMaterial = new THREE.MeshStandardMaterial({ color: this.config.planeColor });

        const rectangleGeometry = new THREE.PlaneGeometry();
        rectangleGeometry.rotateX(-Math.PI / 2).translate(0, 0.05, 0);
        const rectangle = new THREE.Mesh(rectangleGeometry, this.planeMaterial);

        this.plane = {
            rectangle: rectangle,
            border: new THREE.BoxHelper(rectangle, 0x990000),
            text: new THREE.Mesh()
        };

        const textGeometry = new THREE.TextGeometry('', { font: this.stage.font });
        textGeometry.rotateX(-Math.PI / 2);
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0x990000, specular: 0xff2222 });
        this.plane.text = new THREE.Mesh(textGeometry, textMaterial);

        this.slider = new Slider(document.querySelector('#captures'), this.config);

        this.update();
        this.addView();
        this.addPlane();
    }

    addView() {
        const view = new THREE.Group();
        this.viewLines.forEach((viewLine) => {
            view.add(viewLine);
        });
        this.scene.add(view);
    }

    addPlane() {
        this.scene.add(this.plane.rectangle);
        this.scene.add(this.plane.border);
        this.scene.add(this.plane.text);
    }

    getResolution() {
        return new THREE.Vector3(this.config.camera.resolution, 0, this.config.camera.resolution);
    }

    capturePlane() {
        // rectangle
        const rectangle = this.plane.rectangle.clone();
        rectangle.material = this.plane.rectangle.material.clone();
        rectangle.geometry = this.plane.rectangle.geometry.clone();

        // border
        const border = this.plane.border.clone();
        border.material = this.plane.border.material.clone();
        border.geometry = this.plane.border.geometry.clone();

        // plane group
        const plane = new THREE.Group();
        plane.add(rectangle);
        plane.add(border);

        // add to scene
        this.scene.add(plane);
        this.planes.push(plane);

        return rectangle;
    }

    captureRays(plane) {
        const view = this.drone.getView();

        const cameraVector = new THREE.Vector3(view.x, view.y, view.z);
        const cornerDistance = Math.sqrt(view.r ** 2 + view.r ** 2) + 3;

        // nearby persons
        const persons = [];
        this.forest.persons.forEach((person) => {
            if (person) {
                const start = new THREE.Vector3(view.x, 0, view.z);
                const end = new THREE.Vector3(person.position.x, 0, view.z);

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
                const start = new THREE.Vector3(view.x, 0, view.z);
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
                if (rayCast(cameraVector, groundVector, plane).length) {

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
                            // this.scene.add(treeBox);
                            return true;
                        }
                    });

                    // check if obstacles are in between
                    const intersectVector = new THREE.Vector3(personVector.x, personVector.y, personVector.z);
                    if (!rayCast(cameraVector, intersectVector, obstacles).length) {
                        const intersectGeometry = new THREE.BufferGeometry().setFromPoints([cameraVector, intersectVector]);
                        const intersectLine = new THREE.Line(intersectGeometry, new THREE.LineBasicMaterial({ color: this.config.personColor }));

                        // append ray lines
                        rays.push(intersectLine);
                        this.rays.push(intersectLine);
                        this.scene.add(intersectLine);
                    }
                }
            });
        });

        return rays;
    }

    captureImage(rays) {
        const view = this.drone.getView();
        const resolution = this.getResolution();

        const rayPoints = rays.map(getPoints);
        const borderPoints = this.viewLines.map(getPoints);

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
            center: new THREE.Vector3(
                Math.round(view.x * resolution.x / max.x),
                0,
                Math.round(view.z * resolution.z / max.z)
            ),
            points: rayPointsGround.map((p) => {
                return new THREE.Vector3(
                    Math.round(p.x * resolution.x / max.x),
                    0,
                    Math.round(p.z * resolution.z / max.z)
                );
            })
        };

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // canvas image
        const canvas = document.createElement('canvas');
        canvas.className = 'canvas';
        canvas.width = resolution.x;
        canvas.height = resolution.z;

        // canvas background
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw pixel points
        image.points.forEach((p) => {
            ctx.fillStyle = '#' + this.config.personColor.toString(16);
            ctx.fillRect(p.x, p.z, 1, 1);
        });

        // append image
        container.appendChild(canvas);
        this.slider.addImage(container);

        // return last captured images
        this.images.push(image);
        return this.images.slice(Math.max(this.images.length - this.config.camera.images, 0));
    }

    integrateImages(images) {
        const resolution = this.getResolution();

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // canvas image
        const canvas = document.createElement('canvas');
        canvas.className = 'canvas';
        canvas.width = resolution.x;
        canvas.height = resolution.z;

        // canvas background
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw pixel points
        const center = images[images.length - 1].center;
        images.forEach((image) => {

            // delta from current center to captured images
            const delta = new THREE.Vector3();
            delta.copy(center).sub(image.center);

            image.points.forEach((p) => {
                ctx.fillStyle = '#' + this.config.personColor.toString(16);
                ctx.fillRect(p.x - delta.x, p.z - delta.z, 1, 1);
            });
        });

        // append preview
        container.appendChild(canvas);
        this.slider.addPreview(container);
    }

    capture() {
        const plane = this.capturePlane();
        const type = this.config.camera.type;

        if (type === 'infrared') {
            // infrared images
            const rays = this.captureRays(plane);
            const images = this.captureImage(rays);

            // integrate images
            this.integrateImages(images);
        }
        else if (type === 'monochrome') {
            // TODO monochrome images
        }
        else if (type === 'color') {
            // TODO color images
        }
    }

    update() {
        const view = this.drone.getView();

        const distance = this.config.drone.speed * this.config.cpu.speed;
        const coverage = 2 * this.config.drone.height * Math.tan(radian(this.config.camera.view / 2));
        const overlap = coverage / distance;
        const time = coverage / this.config.drone.speed;

        // log('debug', distance, coverage, overlap, time);

        // update view lines (camera to corner)
        const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        this.viewLines.forEach((viewLine, i) => {
            const x = view.r * corners[i][0] + view.x;
            const z = view.r * corners[i][1] + view.z;

            viewLine.geometry.copy(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(view.x, view.y, view.z),
                new THREE.Vector3(x, 0, z)
            ]));
        });

        // update plane
        const rectangleGeometry = new THREE.PlaneGeometry(coverage, coverage);
        rectangleGeometry.rotateX(-Math.PI / 2).translate(view.x, 0.05, view.z);
        this.plane.rectangle.geometry.copy(rectangleGeometry);
        this.plane.border.update();

        // update text
        const text = coverage.toFixed(2) + ' x ' + coverage.toFixed(2);
        const textGeometry = new THREE.TextGeometry(text, { font: this.stage.font, size: coverage / 10, height: 0.01 });
        textGeometry.rotateX(-Math.PI / 2);
        this.plane.text.geometry.copy(textGeometry);

        // update text position
        const textSize = new THREE.Vector3();
        new THREE.Box3().setFromObject(this.plane.text).getSize(textSize);
        textGeometry.translate(view.x - textSize.x / 2, 0.05, view.z + textSize.z / 2);
        this.plane.text.geometry.copy(textGeometry);
    }

    clear() {
        // clear planes
        this.planes.forEach((capture) => { this.scene.remove(capture); });
        this.planes = [];

        // clear rays
        this.rays.forEach((ray) => { this.scene.remove(ray); });
        this.rays = [];

        // clear images
        this.images = [];
        this.slider.clear();
    }

    reset() {
        this.clear();
        this.update();
    }
}
