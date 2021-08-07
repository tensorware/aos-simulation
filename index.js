const path = require('path');
const electron = require('electron');

const { app, dialog, BrowserWindow, Menu } = electron;
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

app.whenReady().then(() => {

  // command arguments (url-params)
  const args = process.argv.slice(2).map((arg) => arg.replace(/^\-+/g, ''));
  const hash = (args.length ? '#' : '') + args.join('&');

  // main browser window (index.html)
  const main = new BrowserWindow({
    show: true,
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'img', 'favicon.ico')
  });
  main.loadURL(`file://${__dirname}/index.html${hash}`);
  main.maximize();

  // main browser window menu (alt-key)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Exit',
      accelerator: 'Ctrl+E',
      click: () => main.close()
    },
    {
      label: 'Reset',
      accelerator: 'Ctrl+R',
      click: () => main.webContents.session.clearStorageData().then(() => main.reload())
    },
    {
      label: 'Debug',
      accelerator: 'Ctrl+D',
      click: () => main.webContents.toggleDevTools()
    }
  ]));

  // data download path
  main.webContents.session.on('will-download', (event, item) => {
    const fileName = path.join(__dirname, 'data', item.getFilename());
    const fileSize = (item.getTotalBytes() / (1024 * 1024)).toFixed(2);

    item.setSavePath(fileName);

    dialog.showMessageBox({
      title: 'Download completed',
      message: `File of size ${fileSize} MB saved to "${fileName}"`
    });
  });

});