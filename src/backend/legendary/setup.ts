import { sendFrontendMessage } from './../main_window'
import { logInfo, LogPrefix } from './../logger/logger'
import axios from 'axios'
import { cachedUbisoftInstallerPath } from 'backend/constants'
import { logWarning } from 'backend/logger/logger'
import { existsSync, createWriteStream, statSync } from 'graceful-fs'
import { LegendaryGame } from './games'
import { Winetricks } from 'backend/tools'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import i18next from 'i18next'
import { getWinePath } from 'backend/launcher'

const UBISOFT_INSTALLER_URL =
  'https://ubistatic3-a.akamaihd.net/orbit/launcher_installer/UbisoftConnectInstaller.exe'

export const setupUbisoftConnect = async (appName: string) => {
  const game = LegendaryGame.get(appName)
  if (!game) {
    return
  }

  const gameInfo = game.getGameInfo()
  if (!gameInfo) {
    return
  }

  // if not a ubisoft game, do nothing
  if (gameInfo.install.executable !== 'UplayLaunch.exe') {
    return
  }

  if (await isUbisoftInstalled(game)) {
    // it's already installed, do nothing
    return
  }

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: game.runner,
    status: 'ubisoft'
  })

  const promise1 = installUbisoftConnect(game)
  const promise2 = installArialFontInPrefix(game)
  // running these 2 tasks in parallel, they are independent
  await Promise.all([promise1, promise2])
}

const installUbisoftConnect = async (game: LegendaryGame) => {
  try {
    await downloadIfNotCached(cachedUbisoftInstallerPath, UBISOFT_INSTALLER_URL)

    await game.runWineCommand({
      commandParts: [cachedUbisoftInstallerPath, '/S']
    })
  } catch (error) {
    logWarning(`Error installing Ubisoft Connect: ${error}`, LogPrefix.Backend)
  }

  if (await isUbisoftInstalled(game)) {
    return true
  } else {
    // it was not installed correctly, show an error
    showDialogBoxModalAuto({
      title: i18next.t('box.error.ubisoft-connect.title', 'Ubisoft Connect'),
      message: i18next.t(
        'box.error.ubisoft-connect.message',
        'Installation of Ubisoft Connect in the game prefix failed. Check our wiki page at https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/How-to-install-Ubisoft-Connect-on-Linux-and-Mac to install it maunally.'
      ),
      type: 'ERROR'
    })
    return false
  }
}

const installArialFontInPrefix = async (game: LegendaryGame) => {
  const settings = await game.getSettings()
  await Winetricks.runWithArgs(settings.wineVersion, settings.winePrefix, [
    'arial'
  ])
}

const downloadIfNotCached = async (cachePath: string, url: string) => {
  if (existsSync(cachePath)) {
    // if the cached file exist but it was cached more than a week ago, download a new one
    // an outdated installer can make the installation fail according to some report
    const cachedAt = statSync(cachePath).mtime
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    if (cachedAt > oneWeekAgo) {
      return true
    }
  }

  try {
    await download(cachePath, url)
    return true
  } catch {
    logWarning(`Failed to download ${url}`, LogPrefix.Backend)
    return false
  }
}

// snippet took from https://stackoverflow.com/a/61269447/1430810, maybe can be improved
const download = async (cachePath: string, url: string) => {
  logInfo('Downloading UbisoftConnectInstaller.exe', LogPrefix.Backend)
  const writer = createWriteStream(cachePath)

  return axios
    .get(url, {
      responseType: 'stream'
    })
    .then(async (response) => {
      return new Promise((resolve, reject) => {
        response.data.pipe(writer)
        let error: unknown = null
        writer.on('error', (err) => {
          error = err
          writer.close()
          reject(err)
        })
        writer.on('close', () => {
          if (!error) {
            resolve(true)
          }
        })
      })
    })
}

const isUbisoftInstalled = async (game: LegendaryGame) => {
  const gameSettings = await game.getSettings()

  const ubisoftExecPath = await getWinePath({
    path: 'C:/Program FIles (x86)/Ubisoft/Ubisoft Game Launcher/UbisoftConnect.exe',
    gameSettings
  })

  return existsSync(ubisoftExecPath)
}
