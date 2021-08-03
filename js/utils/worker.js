importScripts('../utils/helper.js', '../objects/tree.js');

const getTrees = (configs, chunks) => {
    const trees = [];

    configs.forEach((config, i) => {
        trees.push(new Tree(config));

        // chunk results for continuity
        if (!((i + 1) % chunks)) {
            self.postMessage(trees);
            trees.splice(0, trees.length);
        }
    });

    self.postMessage(trees);
};

self.onmessage = (e) => {
    const method = e.data.method;
    const params = e.data.params;

    // call methods
    if (method === 'getTrees') {
        getTrees(params.configs || [], params.chunks);
    }
};
