# Auto_Deposit_Withdraw
### eth config
create eth_config.json in root path
```json
{
  "rpc":"https://mainnet.infura.io/v3",
  "chainId":1,
  "usdtContractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "myPrivateKey": "",
  "watchPrivateKey": "",
  "gasPriceLimit": 200,
  "depositLine": 30000,
  "depositTarget": 50000,
  "withdrawLine": 100000,
  "withdrawTarget": 50000
}
```

### bnb config
create a bnb_config.json file in root path
```json
{
  "rpc": "https://bsc-dataseed1.ninicoin.io",
  "chainId": 56,
  "usdtContractAddress": "0x55d398326f99059fF775485246999027B3197955",
  "myPrivateKey": "",
  "watchPrivateKey": "",
  "gasPriceLimit": 100,
  "depositLine": 30000,
  "depositTarget": 50000,
  "withdrawLine": 100000,
  "withdrawTarget": 50000
}
```

### run
```js
yarn
yarn start

npm install
npm start
```