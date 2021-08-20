const { join } = require('path');
const { app, BrowserWindow, Notification, Menu } = require('electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

app.whenReady().then(() => {

  // command arguments (url params)
  const args = process.argv.slice(2).map((arg) => arg.replace(/^-+/g, ''));
  const hash = (args.length ? '#' : '') + args.join('&');
  const url = `file://${__dirname}/index.html${hash}`;

  // main browser (index.html)
  const main = new BrowserWindow({
    show: true,
    width: 1280,
    height: 720,
    autoHideMenuBar: false,
    icon: join(__dirname, 'img', 'favicon.ico')
  });
  main.loadURL(url);
  main.maximize();

  // main browser menu (alt key)
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

  // data download (zip file)
  main.webContents.session.on('will-download', (event, item) => {
    const sessionUrl = new URL(main.webContents.getURL().replace(/#/g, '&').replace('&', '?'));
    const sessionParams = Object.fromEntries(sessionUrl.searchParams);

    const fileName = join(__dirname, 'data', sessionParams.preset || '', item.getFilename());
    const fileSize = (item.getTotalBytes() / (1024 * 1024)).toFixed(2);

    // data download path
    item.setSavePath(fileName);

    // data download notification
    new Notification({
      title: 'Download completed',
      icon: join(__dirname, 'img', 'favicon.ico'),
      body: `File with ${fileSize} MB exported to "${fileName}"`
    }).show();
  });

});