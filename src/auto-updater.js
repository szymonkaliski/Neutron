const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

autoUpdater.allowPrerelease = true;
autoUpdater.autoDownload = true;

module.exports = () => {
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(
      {
        type: 'question',
        buttons: ['Install and Relaunch', 'Later'],
        defaultId: 0,
        message: 'A new version of Neutron has been downloaded',
        detail: 'It will be installed the next time you restart the application'
      },
      response => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      }
    );
  });

  autoUpdater.checkForUpdates();
};
