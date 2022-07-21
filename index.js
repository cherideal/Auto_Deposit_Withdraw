let { runner } = require('./runner')

runner("./eth_config.json", "./eth_log.txt").then(e=>{
    console.log("runner over!")
})

runner("./bnb_config.json", "./bnb_log.txt").then(e=>{
    console.log("runner over!")
})