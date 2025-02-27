const { sleep } = require('../../../utils/getCode')
const fs = require('fs')
class HomePage {
  constructor (page) {
    this.page = page
  }

  // 标题栏
  get AppTitle () { return this.page.$('/Pane/Document/Group[1]/Text[1]') }
  get AppVersion () { return this.page.$('/Pane/Document/Group[1]/Text[2]') }
  // 菜单
  get menuBtn () { return this.page.$('//Button[@Name="Menu"]') }
  get homeLink () { return this.page.$('//*[@Name="Home"]') }
  get playerLink () { return this.page.$('//*[@Name="Player"]') }
  get creditsLink () { return this.page.$('//*[@Name="Credits"]') }
  get settingsLink () { return this.page.$('//*[@Name="Settings"]') }
  get basicLink () { return this.page.$('//*[@Name="Basic"]') }
  get accountLink () { return this.page.$('/Pane/Document/Group[2]/Group[9]') }
  get developmentLink () { return this.page.$('//*[@Name="Development Developer Mode for Internal Use"]') }
  // 种子状态tab
  get downloadingStatusTab () { return this.page.$('//*[starts-with(@Name,"Downloading (")]') }
  get uploadingStatusTab () { return this.page.$('//*[starts-with(@Name,"Uploading (")]') }
  get downloadedStatusTab () { return this.page.$('//*[starts-with(@Name,"Downloaded (")]') }
  // 下载bt功能
  get downloadTorrentBtn () { return this.page.$('[name="DOWNLOAD"]') }
  get downloadMagnetEdit () { return this.page.$('/Pane[@Name="Alphabiz"]//Edit[@Name="Download directory position"]/preceding::*[1]') }
  get downloadDirectoryEdit () { return this.page.$('/Pane[@Name="Alphabiz"]//Edit[@Name="Download directory position"]') }
  // get confirmDownloadBtn () { return this.page.$('//Button[@Name="CANCEL"]/following-sibling::Button[@Name="DOWNLOAD"]') }
  get confirmDownloadBtn () { return this.page.$('/Pane[@Name="Alphabiz"]//Button[@Name="CANCEL"]/following-sibling::Button[@Name="DOWNLOAD"]') }
  // get cancelDownloadBtn () { return this.page.$('//Button[@Name="CANCEL"]') }
  get cancelDownloadBtn () { return this.page.$('/Pane[@Name="Alphabiz"]//Button[@Name="CANCEL"]') }

  // 任务卡片信息

  // 上传bt功能
  get uploadTorrentBtn () { return this.page.$('[name="UPLOAD"]') }
  get torrentFileBtn () { return this.page.$('//*[@Name="File"]') }
  get fileNameEdit () { return this.page.$('//Edit[@ClassName="Edit"][@Name="File name:"]') }
  get confirmUploadBtn () { return this.page.$('//Button[@Name="CANCEL"]/following-sibling::Button[@Name="UPLOAD"]') }

  // 跳转菜单页面-支持跳转二级目录
  async jumpPage (firstTarget, secondTarget) {
    await sleep(1000)
    const menuLink = await this[secondTarget] || await this[firstTarget]
    if (!(await this[firstTarget].isDisplayed())) {
      // await this.page.$('/Button[@Name="Menu"]').click()
      await this.menuBtn.click()
    }
    if (secondTarget) {
      if (!(await menuLink.isDisplayed())) {
      // await this.page.$('/Button[@Name="Menu"]').click()
        await this[firstTarget].click()
      }
    }
    await menuLink.click()
  }

  async getAppTitle () {
    return await this.AppTitle.getText()
  }

  async getAppVersion () {
    return await this.AppVersion.getText()
  }

  async downloadTorrent (magnetLink, directory) {
    await this.downloadTorrentBtn.click()
    await this.downloadMagnetEdit.setValue(magnetLink)
    if (directory) {
      // setValue功能的自动清除内容不稳定，手动清除输入框内容
      const text = await this.page.$('//Edit[@Name="Download directory position"]').getText()
      const backSpaces = new Array(text.length).fill('\uE003')
      await sleep(1000)
      await this.downloadDirectoryEdit.setValue(backSpaces)
      await sleep(1000)
      await this.downloadDirectoryEdit.setValue(directory)
    }
    await this.confirmDownloadBtn.click()
  }

  async uploadTorrent (directory) {
    await this.uploadTorrentBtn.click()
    await this.torrentFileBtn.click()
    var dir = '../../output/release'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    await sleep(2000)
    await this.page.saveScreenshot('test/output/release/upload-file-selector.png')
    await this.fileNameEdit.setValue([directory, '\uE007'])
    await this.confirmUploadBtn.click()
  }

  async waitSeedFound (torrentName, time) {
    const taskTitle = await this.page.$('//Text[@Name="' + torrentName + '"]')
    await taskTitle.waitUntil(async function () {
      return (await this.isDisplayed()) === true
    }, {
      timeout: time,
      timeoutMsg: 'no seeds found'
    })
  }

  async waitSeedUpload (torrentName) {
    while (1) {
      try {
        await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[1]').click()
        const taskPeer = await this.page.$('//*[@Name="Peers"]')
        await taskPeer.waitUntil(async function () {
          return (await this.isDisplayed()) === true
        }, {
          timeout: 20000,
          timeoutMsg: 'no seeds found'
        })
      } catch (err) {
        await this.page.$('//Text[@Name="Uploading"]').click()
        await this.seedsStopAndSeed(torrentName)
        continue
      }
      break
    }
  }

  async seedsStopAndSeed (torrentName) {
    // stop种子
    if (!await this.page.$('//Text[@Name="Uploading"]').isDisplayed()) {
      await this.jumpPage('uploadingStatusTab')
    }
    if (await this.getTask(torrentName) !== null) {
      await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="STOP"]').click()
    }
    // seed种子
    await this.jumpPage('downloadedStatusTab')
    await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="SEED"]').click()
    console.log('await this.jumpPage("uploadingStatusTab")')
    await sleep(2000)
    await this.jumpPage('uploadingStatusTab')
  }

  async getTask (torrentName) {
    // console.log(await this.page.$('//Text[@Name="' + torrentName + '"]').isDisplayed())
    if (await this.page.$('//Text[@Name="' + torrentName + '"]').isDisplayed()) {
      return await this.page.$('//Text[@Name="' + torrentName + '"]')
    } else {
      return null
    }
  }

  async getTaskPeers (torrentName, timeout) {
    await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="DELETE"]/following-sibling::Button[1]').waitForDisplayed({ timeout: timeout })
    return await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="DELETE"]/following-sibling::Button[1]')
  }

  // status = 1  ->  wait display
  // status = 0  ->  wait hidden
  async waitTaskPeers (torrentName, timeout, status) {
    const taskPeers = await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="DELETE"]/following-sibling::Button[1]')
    console.log('waitTaskPeers')
    await this.page.$('//Text[@Name="' + torrentName + '"]').click()
    await taskPeers.waitUntil(async function () {
      return (status ? (await this.isDisplayed()) === true : (await this.isEnabled()) === false)
    }, {
      timeout: timeout,
      timeoutMsg: 'timeout'
    })
  }

  async getTaskStatus (torrentName) {
    await this.page.$('//Text[@Name="' + torrentName + '"]').click()
    const taskStatus = await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Text[starts-with(@Name,"Status:")]')
    console.log(await taskStatus.getText())
    return await taskStatus.getText()
  }

  async getTaskDownloadSpeed (torrentName) {
    await this.page.$('//Text[@Name="' + torrentName + '"]').click()
    const taskDownloadSpeed = await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Text[starts-with(@Name,"Status:")]/following-sibling::*[1]')
    console.log(await taskDownloadSpeed.getText())
    return await taskDownloadSpeed.getText()
  }

  async downloadPaymentDev (taskPeers, isAutoRenew) {
    await taskPeers.click()
    await this.page.$('//Button[@Name="PAY"]').click()
    if (isAutoRenew) await this.page.$('//CheckBox[@Name="Enable auto renew"]').click()
    await this.page.$('//Button[@Name="Pay 2 point for 20MB data"]').click()
    await sleep(2000)
    await this.page.$('//Text[@Name="Alphabiz"]').click()
  }

  async downloadPaymentProd (taskPeers, isAutoRenew) {
    await taskPeers.click()
    await this.page.$('//Button[@Name="OK"]').click()
  }

  async deleteTask (torrentName) {
    await this.page.$('//Text[@Name="' + torrentName + '"]/following-sibling::Button[@Name="DELETE"]').click()
    await this.page.$('//*[@Name="Also delete files"]').click()
    await this.page.$('//Button[@Name="NOT NOW"]/following-sibling::Button[@Name="DELETE"]').click()
  }
}

module.exports = { HomePage }
