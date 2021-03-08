class Person {
    constructor(config) {
        this.config = config;

        const margin = 1;
        this.position = {
            x: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin),
            z: randomInt(-this.config.size / 2 + margin, this.config.size / 2 - margin)
        };

        const planeGeometry = new THREE.PlaneGeometry(1, 2);
        planeGeometry.rotateX(-Math.PI / 2).translate(this.position.x, 0.10, this.position.z);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x990000 });

        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
    }
}
