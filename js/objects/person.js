class Person {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        const width = 1;
        const height = 2;

        const segments = 4;
        const widthSegments = width * segments;
        const heightSegments = height * segments;

        const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        planeGeometry.rotateX(-Math.PI / 2).translate(0, 0.10, 0);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: this.config.personColor });

        const wireGeometry = new THREE.WireframeGeometry(planeGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: this.config.personColor });

        this.wire = new THREE.LineSegments(wireGeometry, wireMaterial);
        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.mesh.add(this.wire);
    }
}
