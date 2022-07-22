let Decimal = require("decimal.js");
const ethers = require('ethers')
const fs = require('fs')
let { loadConfig } = require('./config')
let ERC20Json = require('./abi/IERC20')

const runner = async (configPath, logPath) => {
    const file = fs.createWriteStream(logPath, { flags: 'a' })
    let logger = new console.Console(file, file)
    try {
        let once_global = 0
        let once_my = 0
        let once_watch = 0
        let lastMyUSDTBalance = new Decimal("0");
        let lastWatchUSDTBalance = new Decimal("0");
        let lastMyETHBalance = new Decimal("0")
        let lastWatchETHBalance = new Decimal("0")
        let sleepTime = 10
        while(true) {
            try {
                let config = loadConfig(configPath)
                let myPrivateKey = config.myPrivateKey
                let watchPrivateKey = config.watchPrivateKey
                let provider = new ethers.providers.StaticJsonRpcProvider(config.rpc, config.chainId)
                let myWallet = new ethers.Wallet(myPrivateKey, provider)
                let watchWallet = new ethers.Wallet(watchPrivateKey, provider)
                let myAddress = myWallet.address
                let watchAddress = watchWallet.address
                if (once_global === 0) logger.log("my address", myAddress)
                if (once_global === 0) logger.log("watch address", watchAddress)
                once_global = 1
                sleepTime = config.sleepTime

                let myUSDTContract = new ethers.Contract(config.usdtContractAddress, ERC20Json, provider).connect(myWallet)
                let watchUSDTContract = new ethers.Contract(config.usdtContractAddress, ERC20Json, provider).connect(watchWallet)
                let decimal = await myUSDTContract.decimals()
                let myUSDTBalanceRaw = await myUSDTContract.balanceOf(myAddress)
                let watchUSDTBalanceRaw = await watchUSDTContract.balanceOf(watchAddress)

                let myUSDTBalance = new Decimal(ethers.utils.formatUnits(myUSDTBalanceRaw, decimal))
                if (!lastMyUSDTBalance.eq(myUSDTBalance)) {
                    logger.log("my USDT balance", myUSDTBalance)
                    once_my = 0
                    lastMyUSDTBalance = myUSDTBalance
                }
                let watchUSDTBalance = new Decimal(ethers.utils.formatUnits(watchUSDTBalanceRaw, decimal))
                if (!lastWatchUSDTBalance.eq(watchUSDTBalance)) {
                    logger.log("watch USDT balance", watchUSDTBalance)
                    once_watch = 0
                    lastWatchUSDTBalance = watchUSDTBalance
                }
                let depositLine = new Decimal(config.depositLine)
                let depositTarget = new Decimal(config.depositTarget)
                let withdrawLine = new Decimal(config.withdrawLine)
                let withdrawTarget = new Decimal(config.withdrawTarget)
                let gasPriceLimit = new Decimal(config.gasPriceLimit)

                if (watchUSDTBalance.lte(depositLine)) {//deposit from my wallet to watch wallet
                    let depositValue = depositTarget.sub(watchUSDTBalance)
                    if (once_my == 0) {
                        logger.log("need deposit", depositValue)
                    }

                    if (depositValue.gt(myUSDTBalance)) {
                        if (once_my == 0) logger.log("my USDT balance is not enough for deposit, my balance =", myUSDTBalance)
                        once_my = 1
                        continue
                    }

                    let estimateGasPriceRaw = await provider.getGasPrice()
                    let estimateGasPrice = new Decimal(ethers.utils.formatUnits(estimateGasPriceRaw, 9))
                    if (estimateGasPrice.gt(gasPriceLimit)) {
                        if (once_my == 0) logger.log("current gas price is", estimateGasPrice, "GWEI, is over limit, wait for next time")
                        once_my = 1
                        continue
                    }

                    let depositValueRaw = ethers.utils.parseUnits(depositValue.toString(), decimal)
                    let myETHBalanceRaw = await myWallet.getBalance()
                    let myETHBalance = new Decimal(ethers.utils.formatEther(myETHBalanceRaw))
                    if (!myETHBalance.eq(lastMyETHBalance)) {
                        logger.log("current eth/bnb balance of my account", myETHBalance)
                        once_my = 0
                        lastMyETHBalance = myETHBalance
                    }
                    let estimateGasLimitRaw = await myUSDTContract.estimateGas.transfer(watchAddress, depositValueRaw)
                    let gasValueRaw = estimateGasLimitRaw.mul(estimateGasPriceRaw)
                    if (gasValueRaw.gt(myETHBalanceRaw)) {
                        if (once_my === 0) logger.log("not enough ETH/BNB for pay gas, please deposit ETH/BNB to", myAddress, "first")
                        once_my = 1
                        continue
                    }

                    let overrides = {
                        gasLimit: estimateGasLimitRaw,
                        gasPrice:  estimateGasPriceRaw
                    }

                    let tx = await myUSDTContract.transfer(watchAddress, depositValueRaw, overrides)
                    logger.log("commit deposit", depositValue, "USDT from", myAddress, "to", watchAddress, "tx=", tx.hash)
                    await tx.wait()
                    logger.log("confirm deposit", depositValue, "USDT from", myAddress, "to", watchAddress, "tx=", tx.hash)
                    once_my = 1
                } else if (watchUSDTBalance.gte(withdrawLine)) {//withdraw from watch account to my account
                    let withdrawValue = watchUSDTBalance.sub(withdrawTarget)
                    if (once_watch == 0) logger.log("need withdraw", withdrawValue)
                    let estimateGasPriceRaw = await provider.getGasPrice()
                    let estimateGasPrice = new Decimal(ethers.utils.formatUnits(estimateGasPriceRaw, 9))
                    if (estimateGasPrice.gt(gasPriceLimit)) {
                        if (once_watch == 0) logger.log("current gas price is", estimateGasPrice, "gwei, is over limit, wait for next time")
                        once_watch = 1
                        continue
                    }

                    let withdrawValueRaw = ethers.utils.parseUnits(withdrawValue.toString(), decimal)
                    let watchETHBalanceRaw = await watchWallet.getBalance()
                    let watchETHBalance = new Decimal(ethers.utils.formatEther(watchETHBalanceRaw))
                    if (!watchETHBalance.eq(lastWatchETHBalance)) {
                        logger.log("current eth/bnb balance of watch account", watchETHBalance)
                        once_watch = 0
                        lastWatchETHBalance = watchETHBalance
                    }
                    let estimateGasLimitRaw = await watchUSDTContract.estimateGas.transfer(myAddress, withdrawValueRaw)
                    let gasValueRaw = estimateGasLimitRaw.mul(estimateGasPriceRaw)
                    if (gasValueRaw.gt(watchETHBalanceRaw)) {
                        if (once_watch == 0) logger.log("not enough ETH/BNB for pay gas, please deposit ETH/BNB to", watchAddress, "first")
                        once_watch = 1
                        continue
                    }

                    let overrides = {
                        gasLimit: estimateGasLimitRaw,
                        gasPrice:  estimateGasPriceRaw
                    }

                    let tx = await watchUSDTContract.transfer(myAddress, withdrawValueRaw, overrides)
                    logger.log("commit withdraw", withdrawValue, "USDT from", watchAddress, "to", myAddress, "tx=", tx.hash)
                    await tx.wait()
                    logger.log("confirm withdraw", withdrawValue, "USDT from", watchAddress, "to", myAddress, "tx=", tx.hash)
                    once_watch = 1
                }
            } catch (e) {
                console.log(e);
            }

            await new Promise(r => setTimeout(() => r(), 1000 * sleepTime));
        }
    } catch (e) {
        console.log(e);
    }
};

module.exports = {
    runner
}
