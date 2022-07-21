let { runner } = require('./runner')

runner("./test_config.json", "./eth_log.txt").then(e=>{
    console.log("runner over!")
})

runner("./test_config.json", "./bnb_log.txt").then(e=>{
    console.log("runner over!")
})