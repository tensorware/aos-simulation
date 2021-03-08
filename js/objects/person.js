class Person {
    constructor(config) {
        this.config = config;

        const margin = 1;
        this.position = {
            x: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin),
            z: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin)
        };

        const width = 1;
        const height = 2;
        const widthSegments = width * 5;
        const heightSegments = height * 5;

        const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        planeGeometry.rotateX(-Math.PI / 2).translate(this.position.x, 0.10, this.position.z);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xd05bf5 });

        const wireGeometry = new THREE.WireframeGeometry(planeGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: 0x885bf5 });
        const wireFrame = new THREE.LineSegments(wireGeometry, wireMaterial);

        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.mesh.add(wireFrame);
    }
}
