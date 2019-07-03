import { Component, OnInit } from '@angular/core';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
// import Btc from '@ledgerhq/hw-app-btc';
import Btc from './../../../../../../../conj/ledgerjs/packages/hw-app-btc';

const Buffer = require('buffer/').Buffer
const {encode: numberToCompactSizeUInt} = require('varuint-bitcoin');
const {OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_RETURN} = require('bitcoin-ops');
const bs58check = require('bs58check');
const addressDecode = address => bs58check.decode(address).slice(1);

const getDevice = async () => {
  const transport = await TransportWebUSB.create();
  const ledger = new Btc(transport);
  ledger.close = () => transport.close();

  return ledger;
};

const checkUInt53 = number => {
	if (number < 0 || !Number.isSafeInteger(number)) {
		throw new RangeError('value out of range');
	}
};

const numberToUInt64 = number => {
	checkUInt53(number);

	const buffer = Buffer.alloc(8);
	buffer.writeUInt32LE(number >>> 0, 0);
  buffer.writeUInt32LE((number / 0x100000000) | 0, 4);
  
	return buffer;
};

const hexToByteArray = (hex) => {
  const byteArray = [];
  for (let i = 0; i < hex.length; i += 2)
    byteArray.push(parseInt(hex.substr(i, 2), 16));
  return byteArray;
}

const generateScriptPubKey = (address, value) => {
  let scriptPubKey = [];
  const isOpReturn = value == 0 && address.length == 268;
  if (isOpReturn) {
    const bytesArray = hexToByteArray(address);
    const tposContract = []
    .concat([34]).concat(bytesArray.slice(0, 34))
    .concat([34]).concat(bytesArray.slice(34, 68))
    .concat([1]).concat(bytesArray.slice(68, 69))
    .concat([65]).concat(bytesArray.slice(69));

    scriptPubKey = [
      OP_RETURN,
      ...tposContract
    ];
  } else {
    const pubKeyHash = addressDecode(address);
    scriptPubKey = [
      OP_DUP,
      OP_HASH160,
      pubKeyHash.length,
      ...pubKeyHash,
      OP_EQUALVERIFY,
      OP_CHECKSIG
    ];
  }
  return scriptPubKey;
}

const generateBuildOutputScript = (outputs) => {
  let outputScript = [...numberToCompactSizeUInt(outputs.length)];

	for (const {address, value} of outputs) {
    const scriptPubKey = generateScriptPubKey(address, value)
    outputScript = [
      ...outputScript,
      ...numberToUInt64(value),
      ...numberToCompactSizeUInt(scriptPubKey.length),
      ...scriptPubKey
    ];
	}

	return Buffer.from(outputScript).toString('hex');
}

const createTransaction = async (utxos, outputs) => {
  const ledger = await getDevice();

  const inputs = await Promise.all(utxos.map(async utxo => {
    const transactionHex = utxo.rawtx;
    const isSegwitSupported = undefined;
    const hasTimestamp = undefined;
    const hasExtraData = true;
    const additionals = [];
    const tx = await ledger.splitTransaction(
      transactionHex,
      isSegwitSupported,
      hasTimestamp,
      hasExtraData,
      additionals
    );
    return [tx, utxo.vout];
  }));
  const associatedKeysets = utxos.map(utxo => utxo.derivationPath);
  const changePath = undefined;
  
  const formatedOutputs = generateBuildOutputScript(outputs)

  const unixtime = Math.floor(Date.now() / 1000);
  const lockTime = (unixtime - 777);
  const sigHashType = undefined;
  const segwit = undefined;
  const initialTimestamp = undefined;
  const additionals = [];
  const expiryHeight = undefined;

  const transaction = await ledger.createPaymentTransactionNew(
    inputs,
    associatedKeysets,
    changePath,
    formatedOutputs,
    lockTime,
    sigHashType,
    segwit,
    initialTimestamp,
    additionals,
    expiryHeight
  );

  await ledger.close();

  return transaction;
};

const getAddress = async (derivationPath, verify) => {
  const ledger = await getDevice();
  const params = { verify: verify, format: 'legacy' } // 'legacy' 'bech32' 'p2sh'
  const address = await ledger.getWalletPublicKey(derivationPath, params);
  await ledger.close();
  return address;
};

const createTPOSContract = async (bip32, tposAddress, merchantAddress, commission, txidvout) => {
  const ledger = await getDevice();

  const chunk1 = tposAddress.split('').map(letter => letter.charCodeAt(0).toString(16)).join('');
  
  const chunk2 = merchantAddress.split('').map(letter => letter.charCodeAt(0).toString(16)).join('');
  
  let chunk3 = commission.toString(16);
  chunk3 = chunk3.length == 1 ? '0' + chunk3 : chunk3;
  
  const response = await ledger.signUtxo(bip32, txidvout);
  const signature = (response['v'] + 27 + 4).toString(16) + response['r'] + response['s'];
  const chunk4 = Buffer.from(signature, 'hex').toString('hex');
  
  return chunk1 + chunk2 + chunk3 + chunk4;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  currentView = 'latestBlocks';

  constructor() { }

  ngOnInit() {
    console.log('init');
  }

  connect() {
    this.createXSNTransaction().then(() => console.log('done')).catch((err) => console.log(err));
  }
  
  async createXSNTransaction() {
    const x = await createTransaction(
      [
        {
          rawtx: "020000000190b066b7b2b8ed416408d3f100da2450a0ba72da32aaf60c458d3d2194666753000000006a47304402203d8db42453f89b2d7912353355e51ce8eef20081414a74c9d9ef36b708e1b72e022075275ca3542d94db684dfbc155918c52edf32b9e38a6fea73333d23eceecf1c70121030c47bc59a802529ce6b4214b0c56dc3d653adb68e378b1a56bfe45cc7db5ec15fdffffff01fc738e06000000001976a9146a610945c5e3465f84b740db8cdc39046e52eb2588ac00000000",
          vout: 0,
          derivationPath: "44'/384'/0'/0/0"
        }
      ],
      [
        {
          address: "XrynQ7q5YrvDN2cGuR5wkrxRVv6kEZoFCN",
          value: 100000000
        },
        {
          address: await createTPOSContract(
            "44'/384'/0'/0/1",
            'XrynQ7q5YrvDN2cGuR5wkrxRVv6kEZoFCN',
            'XnbL9MLYzQvDtRhxK2da8qQ56XgJ3nPSQd',
            80,
            '080bab3514f140bc38520878b0bfe2ee827240d9df572dcfe9381f0056b4f114:0'
          ),
          value: 0
        }
      ]
    );
    console.log(x);
  }

  async getXSNAddress() {
    const x = await getAddress(`44'/384'/0'/0/1`, false);
    console.log(x);
  }

  selectView(view: string) {
    this.currentView = view;
  }

  isSelected(view: string): boolean {
    return this.currentView === view;
  }
}
