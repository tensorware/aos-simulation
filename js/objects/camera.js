class Camera {
    constructor(drone) {
        this.root = drone.root;
        this.config = drone.config;
        this.scene = drone.scene;
        this.stage = drone.stage;
        this.forest = drone.forest;
        this.drone = drone;

        this.rays = [];
        this.boxes = [];

        this.planes = [];
        this.images = [];

        this.worker = getWorkers(1)[0];
        this.slider = new Slider(document.querySelector('#captures'), this.config);

        this.viewLines = [];
        for (let i = 0; i < 4; i++) {
            const viewLinePoints = [new THREE.Vector3(0, this.config.drone.height, 0), new THREE.Vector3(0, 0, 0)];
            const viewLineGeometry = new THREE.BufferGeometry().setFromPoints(viewLinePoints);
            this.viewLines.push(new THREE.Line(viewLineGeometry, new THREE.LineBasicMaterial({ color: 0x990000 })));
        }

        this.planeMaterial = new THREE.MeshStandardMaterial({
            color: this.config.material.color.plane,
            side: THREE.DoubleSide
        });
        this.textMaterial = new THREE.MeshPhongMaterial({
            color: 0x990000,
            specular: 0xff2222
        });

        const rectangleGeometry = new THREE.PlaneGeometry();
        rectangleGeometry.rotateX(-Math.PI / 2).translate(0, 0, 0);
        const rectangle = new THREE.Mesh(rectangleGeometry, this.planeMaterial);

        const textGeometry = new THREE.TextGeometry('', { font: this.stage.font });
        textGeometry.rotateX(-Math.PI / 2).translate(0, 0, 0);
        const text = new THREE.Mesh(textGeometry, this.textMaterial);

        this.plane = {
            rectangle: rectangle,
            border: new THREE.BoxHelper(rectangle, 0x990000),
            text: text
        };

        this.plane.border.layers.set(1);
        this.plane.text.layers.set(1);
        this.viewLines.forEach((viewLine) => {
            viewLine.layers.set(1);
        });

        this.addView();
        this.addPlane();
        this.addRenderer();
        this.addPreview();
        this.update();
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

    addRenderer() {
        this.camera = new THREE.PerspectiveCamera(this.config.drone.camera.view, 1, 0.1, 1000);
        this.camera.layers.enable(0);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    addPreview() {
        const resolution = this.getResolution();

        // preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image';

        // preview image
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = resolution.x;
        previewCanvas.height = resolution.z;

        // preview background
        const previewContext = previewCanvas.getContext('2d');
        previewContext.fillStyle = hexColor(this.config.material.color.plane);
        previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewContainer.append(previewCanvas);

        // render container
        const renderContainer = document.createElement('div');
        renderContainer.className = 'image';
        renderContainer.append(this.renderer.domElement);

        // append to slider
        this.slider.previews.append(previewContainer);
        this.slider.previews.append(renderContainer);
    }

    getResolution() {
        return new THREE.Vector3(this.config.drone.camera.resolution, 0, this.config.drone.camera.resolution);
    }

    capturePlane() {
        // rectangle
        const rectangle = this.plane.rectangle.clone();
        rectangle.material = this.plane.rectangle.material.clone();
        rectangle.geometry = this.plane.rectangle.geometry.clone();
        rectangle.translateY(0);

        // border
        const border = this.plane.border.clone();
        border.material = this.plane.border.material.clone();
        border.geometry = this.plane.border.geometry.clone();

        // plane group
        const plane = new THREE.Group();
        plane.add(rectangle);

        // DEBUG
        // plane.add(border);

        // add to scene
        this.scene.add(plane);
        this.planes.push(plane);

        return rectangle;
    }

    capture(preview) {
        const image = new Image(this);
        return image.capture(preview);
    }

    update() {
        const view = this.drone.getView();

        const distance = this.config.drone.speed * this.config.drone.cpu.speed;
        const coverage = 2 * this.config.drone.height * Math.tan(radian(this.config.drone.camera.view / 2));
        const overlap = coverage / distance;
        const time = coverage / this.config.drone.speed;

        // DEBUG
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
        const textGeometry = new THREE.TextGeometry(text, { font: this.stage.font, size: coverage / 10, height: 0.10 });
        textGeometry.rotateX(-Math.PI / 2);
        this.plane.text.geometry.copy(textGeometry);

        // update text position
        const textSize = new THREE.Vector3();
        new THREE.Box3().setFromObject(this.plane.text).getSize(textSize);
        textGeometry.translate(view.x - textSize.x / 2, 0.05, view.z + textSize.z / 2);
        this.plane.text.geometry.copy(textGeometry);

        // update camera position
        this.camera.fov = this.config.drone.camera.view;
        this.camera.position.set(view.x, view.y, view.z);
        this.camera.lookAt(view.x, 0, view.z);
        this.camera.updateProjectionMatrix();

        // render camera preview
        this.renderer.setSize(this.config.drone.camera.resolution, this.config.drone.camera.resolution);
        this.renderer.domElement.removeAttribute('style');
        this.renderer.render(this.scene, this.camera);
    }

    export(zip) {
        const camera = zip.folder('camera');

        const images = { captures: [] };
        this.images.forEach((image, index) => {
            const number = index + 1;

            images.captures.push({
                image: number,
                center: {
                    rendered: image.rendered.center,
                    processed: image.processed.center
                }
            });

            // export images
            // camera.file(`image-${number}.png`, image.rendered.base64, { base64: true });
            camera.file(`image-${number}-${this.config.drone.camera.type}.png`, image.processed.base64, { base64: true });
        });

        // export config
        camera.file('camera.json', JSON.stringify(images, null, 4));
    }

    clear() {
        // clear planes
        this.planes.forEach((capture) => { this.scene.remove(capture); });
        this.planes = [];

        // clear rays
        this.rays.forEach((ray) => { this.scene.remove(ray); });
        this.rays = [];

        // clear boxes
        this.boxes.forEach((ray) => { this.scene.remove(ray); });
        this.boxes = [];

        // clear images
        this.images = [];
        this.slider.clear();

        // add initial preview
        this.addPreview();
    }

    reset() {
        this.clear();
        this.update();
    }
}
