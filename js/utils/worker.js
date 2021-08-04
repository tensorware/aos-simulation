importScripts(
    '../utils/helper.js',
    '../objects/tree.js'
);

const getTrees = (configs, caller, chunks) => {
    const trees = [];

    configs.forEach((config, i) => {
        trees.push(new Tree(config));

        if (!((i + 1) % chunks)) {
            // continuous message
            self.postMessage(trees);
            trees.splice(0, trees.length);
        }
    });

    // final message
    self.postMessage(trees);
};


self.onmessage = (e) => {
    const method = e.data.method;
    const params = e.data.params;

    // execute methods
    switch (method) {
        case 'getTrees':
            getTrees(params.configs || [], params.caller, params.chunks);
            break;
        default:
            self.postMessage();
    }
};
