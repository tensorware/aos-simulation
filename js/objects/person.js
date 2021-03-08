class Person {
    constructor(config) {
        this.config = config;

        const width = 1;
        const height = 2;
        const widthSegments = width * 10;
        const heightSegments = height * 10;

        const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        planeGeometry.rotateX(-Math.PI / 2).translate(0, 0.10, 0);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xd05bf5 });

        const wireGeometry = new THREE.WireframeGeometry(planeGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: 0x885b95 });

        this.wire = new THREE.LineSegments(wireGeometry, wireMaterial);
        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.mesh.add(this.wire);
    }
}
