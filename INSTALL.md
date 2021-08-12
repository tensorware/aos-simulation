# Requirements

A simple http server is sufficient to run the simulation, no other backend is required.  
Additional a standalone application is available that runs on [Electron](https://www.electronjs.org) and requires [Node.js](https://nodejs.org).

## Setup [![github](https://img.shields.io/badge/github-gray?logo=github&logoColor=white)](#Setup)

Download this repository code or use

```
git clone https://github.com/tensorware/aos-simulation.git
```

### Basic [![html](https://img.shields.io/badge/html-gray?logo=html5&logoColor=white)](#Basic)

Browse into the repository root folder and start a webserver: (e.g. builtin python webserver)

```
python3 -m http.server 8080
```

The simulation should be now available at http://127.0.0.1:8080.

### Additional [![nodejs](https://img.shields.io/badge/nodejs-gray?logo=nodedotjs&logoColor=white)](#Additional)

First [install Node.js](https://nodejs.org/en/download) and run `npm install` from the repository root folder. This [installs Electron](https://www.electronjs.org/docs/latest/tutorial/installation) with the version defined in **package.json**.
The application can be started with:

```
npx electron .
```

## Parameters [![console](https://img.shields.io/badge/console-gray?logo=gnu-bash&logoColor=white)](#Parameters)

Settings of the simulation can also be defined by url and command line parameters. Here some examples:

Move drone to position:
https://aos.tensorware.app/#preset=demo&drone.eastWest=-35&drone.northSouth=-35

```
npx electron . --preset=demo --drone.eastWest=-35 --drone.northSouth=-35
```

Overwrite preset values:
https://aos.tensorware.app/#preset=demo&forest.size=10&forest.persons.count=2

```
npx electron . --preset=demo --forest.size=10 --forest.persons.count=2
```

Capture and export data:
https://aos.tensorware.app/#preset=demo&capture=true

```
npx electron . --preset=demo --capture=true
```

## Development [![vscode](https://img.shields.io/badge/made%20with-VSCode-blue)](#Development)

Source code is written in plain JavaScript, no additional build is required.

Presets for VSCode are available in **launch.json**, **settings.json** and **tasks.json**.  
Used VSCode extensions:

- [Live Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server)
- [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)
- [Debugger for Firefox](https://marketplace.visualstudio.com/items?itemName=firefox-devtools.vscode-firefox-debug)
