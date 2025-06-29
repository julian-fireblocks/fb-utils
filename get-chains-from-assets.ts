import * as axios from 'axios'
import { getFireblocksAuthorizationHeader } from './common/jwt';
import * as fs from 'fs'

const BASE_URL='https://api.fireblocks.io'
const VAULT_ACCOUNT='0'
const inputList = [
  'USDT',
  'ETH',
  'USDC',
  'TRX',
  'TON',
  'POL',
  'SOL',
  'XLM',
  'SHIB',
  'BTC',
  'LTC',
  'DOGE',
  'BCH',
  'BNB',
  'XRP',
  'EOS',
];


export async function getChainsAndAssetId(assetList: string[]){
    const blockchains: any = {}
    const assets = {}
    let outputJson: {
        asset: string, 
        legacyId: string, 
        assetId: string,
        blockchainId: string, 
        blockchainLegacyId: string, 
        blockchainDisplay: string, 
        deprecated: boolean,
        nativeAssetId: string,
        isNativeAsset: boolean
    }[] = []
    for (let i =0; i< assetList.length; i++){
        console.log(`Reading asset ${assetList[i]}`)
        const url = `/v1/assets?symbol=${assetList[i]}`
        const headers = await getFireblocksAuthorizationHeader({url})
        const assetSearch = await axios.default.get(BASE_URL + url, {headers})
        const result = (await assetSearch.data)?.['data'];
        result.forEach(asset => {
            if (assets[asset.id]) return;
            assets[asset.id] = asset
        })
        console.log(JSON.stringify(result))
        // Get the blockchain for the asset
        for (let j = 0; j < result.length; j++){
            let blockchainDetails
            if (blockchains[result[j].blockchainId]){
                blockchainDetails = blockchains[result[j].blockchainId]
            } else {
                const blockchainPath = `/v1/blockchains/${result[j].blockchainId}`
                const headers = await getFireblocksAuthorizationHeader({url: blockchainPath})
                const blockchainSearch = await axios.default.get(BASE_URL+ blockchainPath, {headers})
                blockchainDetails = await blockchainSearch.data
                blockchains[result[j].blockchainId] = blockchainDetails;
            }
            // check for assetId
            let asset: any = {}
            if (assets[blockchainDetails.nativeAssetId]){
                asset = assets[blockchainDetails.nativeAssetId]
            } else {
                const assetPath = `/v1/assets/${blockchainDetails.nativeAssetId}`
                const headers = await getFireblocksAuthorizationHeader({url: assetPath})
                const assetPull = await axios.default.get(BASE_URL+ assetPath, {headers})
                asset = await assetPull.data
                assets[blockchainDetails.nativeAssetId] = asset
            }

            console.log(JSON.stringify(blockchainDetails))
            outputJson.push({
                asset: assetList[i],
                legacyId: result[j].legacyId,
                assetId: result[j].id,
                blockchainLegacyId: blockchainDetails.legacyId,
                blockchainId: blockchainDetails.id,
                blockchainDisplay: blockchainDetails.displayName,
                deprecated: blockchainDetails.metadata.deprecated,
                nativeAssetId: asset.displaySymbol,
                isNativeAsset: asset.id == result[j].id
            })
        }
    }
    console.log(outputJson)
    if (outputJson.length > 0) {
    const headers = Object.keys(outputJson[0]);
    const csvRows = [
        headers.join(','), // header row
        ...outputJson.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ];
    fs.writeFileSync('output.csv', csvRows.join('\n'), 'utf8');
    console.log('Saved output.csv');
}
}

getChainsAndAssetId(inputList)