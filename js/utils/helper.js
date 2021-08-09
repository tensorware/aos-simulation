const setLayer = (object, layer) => {
    object.layers.set(layer);
    object.traverse((o) => { o.layers.set(layer); });
};

const createFloatAttribute = (array, itemSize) => {
    const typedArray = new Float32Array(flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
};

const createIntAttribute = (array, itemSize) => {
    const typedArray = new Uint16Array(flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
};

const normalizeAttribute = (attribute) => {
    const v = new THREE.Vector3();
    for (let i = 0; i < attribute.count; i++) {
        v.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
        v.normalize();
        attribute.setXYZ(i, v.x, v.y, v.z);
    }
    return attribute;
};

const rayCast = (from, to, intersects) => {
    const rayVector = new THREE.Vector3();
    rayVector.subVectors(to, from);
    const ray = new THREE.Raycaster(from, rayVector.normalize());
    return Array.isArray(intersects) ? ray.intersectObjects(intersects) : ray.intersectObject(intersects);
};

const flattenArray = (input) => {
    const result = [];
    for (let i = 0; i < input.length; i++) {
        for (let j = 0; j < input[i].length; j++) {
            result.push(input[i][j]);
        }
    }
    return result;
};

const splitArray = (items, chunks) => {
    const result = [];
    const length = Math.ceil(items.length / chunks);
    for (let j = 0; j < chunks; j++) {
        result.push([]);
        for (let i = 0; i < length; i++) {
            let v = items[i + j * length];
            if (v == undefined) {
                continue;
            }
            result[j].push(v);
        }
    }
    return result;
};

const doubleClick = (callback) => {
    let states = ['pointerdown', 'pointerup', 'pointerdown', 'pointerup'];
    let click, which, state;
    let reset = () => {
        click = false;
        which = -1;
        state = 0;
    };
    reset();
    return (e) => {
        if (state === 0) {
            which = e.which;
        }
        if (e.type === states[state] && which === e.which) {
            state = state < 3 ? state + 1 : 0;
        }
        else {
            reset();
        }
        if (states[state] === 'pointerup') {
            if (!click) {
                click = true;
                setTimeout(reset, 300);
            }
            else {
                reset();
                callback(e);
            }
        }
    }
};

const getWorkers = (size) => {
    const workers = [];
    for (let i = 0; i < (size || navigator.hardwareConcurrency); i++) {
        workers.push(new Worker('js/utils/worker.js'));
    }
    return workers;
};

const getCenter = (mesh) => {
    const center = new THREE.Vector3();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(center);
    mesh.localToWorld(center);
    return center;
};

const getPoints = (mesh) => {
    const points = [];
    const vector = new THREE.Vector3();
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        vector.fromBufferAttribute(position, i);
        mesh.localToWorld(vector);
        points.push(new THREE.Vector3().copy(vector));
    }
    return points;
};

const getLocalStorageKey = (key) => {
    return `${document.location.href}.${key}`;
};

const getHash = (key) => {
    const query = new URL(window.location.href.replace(/#/g, '?'));
    const params = Object.fromEntries(query.searchParams);
    return key ? params[key] : params;
};

const getType = (obj) => {
    if (typeof obj == 'undefined') return 'undefined';
    if (typeof obj == 'object') return 'object';
    if (typeof obj == 'string') return 'string';
    if (Array.isArray(obj)) return 'array';
    if (!isNaN(obj - 0)) return 'number';
    if (obj == null) return 'null';
    return 'other';
};

const setProperty = (object, path, value) => {
    if (path.length === 1) {
        object[path[0]] = value;
    }
    else if (path.length === 0) {
        throw error;
    }
    else {
        if (object[path[0]]) {
            return setProperty(object[path[0]], path.slice(1), value);
        }
        else {
            object[path[0]] = {};
            return setProperty(object[path[0]], path.slice(1), value);
        }
    }
};

const hexColor = (color) => {
    return '#' + color.toString(16).padStart(6, '0');
};

const intColor = (color) => {
    if (getType(color) === 'string') {
        return parseInt(color.replace('#', '0x'), 16);
    }
    else if (getType(color) === 'object') {
        return ((color.r & 0x0ff) << 16) | ((color.g & 0x0ff) << 8) | (color.b & 0x0ff);
    }
    return parseInt(color);
};

const rgbColor = (color) => {
    return {
        r: (color & 0xff0000) >> 16,
        g: (color & 0x00ff00) >> 8,
        b: (color & 0x0000ff)
    };
};

const shadeColor = (color, percent) => {
    const rgb = rgbColor(color);
    rgb.r = parseInt(clamp(rgb.r * percent, 0, 255));
    rgb.g = parseInt(clamp(rgb.g * percent, 0, 255));
    rgb.b = parseInt(clamp(rgb.b * percent, 0, 255));
    return intColor(rgb);
};

const colorMatch = (c1, c2, delta) => {
    let match = true;
    ['r', 'g', 'b'].forEach((k) => {
        match = match && c1[k] <= (c2[k] + delta) && c1[k] >= (c2[k] - delta);
    });
    return match;
};

const canvasImage = (canvas) => {
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.substr(dataUrl.indexOf(',') + 1);
};

const cloneCanvas = (canvas, grayscale) => {
    const cloned = document.createElement('canvas');
    cloned.width = canvas.width;
    cloned.height = canvas.height;
    const ctx = cloned.getContext('2d');
    if (grayscale) {
        ctx.filter = 'grayscale(1)';
    }
    ctx.drawImage(canvas, 0, 0);
    return cloned;
};

const interpolate = (v0, v1, t) => {
    return v0 * (1 - t) + v1 * t;
};

const randomGenerator = (seed) => {
    return seed === void (0) ? Math.random : new Math.seedrandom(seed);
};

const randomFloat = (min, max, seed) => {
    const rng = randomGenerator(seed);
    return rng() * (max - min) + min;
};

const randomInt = (min, max, seed) => {
    const rng = randomGenerator(seed);
    return Math.floor(rng() * (1 + max - min) + min);
};

const shuffle = (array, seed) => {
    const rng = randomGenerator(seed);
    return array.sort(() => rng() - 0.5);
};

const rad = (deg) => {
    return deg * Math.PI / 180;
};

const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

const clone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const log = (...arguments) => {
    let level = 'log';
    let args = Array.from(arguments);
    if (args.length > 0 && getType(args[0]) === 'string') {
        if (['debug', 'info', 'warn', 'error'].includes(args[0])) {
            level = args.shift();
        }
    }
    switch (level) {
        case 'debug':
            console.debug.apply(console, args);
            break;
        case 'info':
            console.info.apply(console, args);
            break;
        case 'warn':
            console.warn.apply(console, args);
            break;
        case 'error':
            console.error.apply(console, args);
            break;
        default:
            console.log.apply(console, args);
    }
};

Date.prototype.yyyymmddhhmmss = function () {
    const yyyy = this.getFullYear();
    const mm = this.getMonth() < 9 ? '0' + (this.getMonth() + 1) : (this.getMonth() + 1);
    const dd = this.getDate() < 10 ? '0' + this.getDate() : this.getDate();
    const hh = this.getHours() < 10 ? '0' + this.getHours() : this.getHours();
    const min = this.getMinutes() < 10 ? '0' + this.getMinutes() : this.getMinutes();
    const sec = this.getSeconds() < 10 ? '0' + this.getSeconds() : this.getSeconds();
    return yyyy + '-' + mm + '-' + dd + '-' + hh + '-' + min + '-' + sec;
};
