import { Component, OnInit } from '@angular/core';

// import TransportU2F from '@ledgerhq/hw-transport-u2f';
import buildOutputScript from 'build-output-script';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import Btc from '@ledgerhq/hw-app-btc';
import * as bitcoin from 'bitcoinjs-lib';
const regtestUtils = require('./_regtest');
const regtest = regtestUtils.network;
const {encode: numberToCompactSizeUInt} = require('varuint-bitcoin');
const {OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_RETURN} = require('bitcoin-ops');
const bs58check = require('bs58check');
const addressDecode = address => bs58check.decode(address).slice(1);

const getDevice = async () => {
  const transport = await TransportWebUSB.create();
  console.log('transport');
  console.log(transport);

  const ledger = new Btc(transport);
  console.log('ledger');
  console.log(ledger);

  ledger.close = () => transport.close();

  return ledger;
};

const isAvailable = async () => {
  const ledger = await getDevice();
  try {
    const address = await ledger.getWalletPublicKey(`m/44'/0'/0'/0/0`);
    await ledger.close();
    console.log(address);
    return true;
  } catch (error) {
    return false;
  }
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

const generateBuildOutputScript = (outputs) => {
  let outputScript = [...numberToCompactSizeUInt(outputs.length)];

	for (const {address, value} of outputs) {

    if (value > 0) {
      const pubKeyHash = addressDecode(address);
      console.log('pubKeyHash');
      console.log(pubKeyHash);
      const scriptPubKey = [
        OP_DUP,
        OP_HASH160,
        pubKeyHash.length,
        ...pubKeyHash,
        OP_EQUALVERIFY,
        OP_CHECKSIG
      ];

      outputScript = [
        ...outputScript,
        ...numberToUInt64(value),
        ...numberToCompactSizeUInt(scriptPubKey.length),
        ...scriptPubKey
      ];
    } else {
      // let tp = Buffer.from(address, 'hex');
      // let tp = new Uint8Array([88, 114, 121, 110]);

// expected: 58 72 79 6e 51 37 71 35 59
// [88, 114, 121, 110, 81, 55, 113, 53, 89]

// 5896a5b77770b9d8578f2a1f02f4d633c5dbbf
// 5896a5b77770b9d8578f2a1f02f4d633c5dbbfd7
// [88, 150, 165, 183, 119, 112, 185, 216, 87, 143, 42, 31, 2, 244, 214, 51, 197, 219, 191, 215]
      let tp = [
        34, 88, 114, 121, 110, 81, 55, 113, 53, 89, 114, 118, 68, 78, 50, 99, 71, 117, 82, 53, 119, 107, 114, 120, 82, 86, 118, 54, 107, 69, 90, 111, 70, 67, 78,
        34, 88, 110, 98, 76, 57, 77, 76, 89, 122, 81, 118, 68, 116, 82, 104, 120, 75, 50, 100, 97, 56, 113, 81, 53, 54, 88, 103, 74, 51, 110, 80, 83, 81, 100,
        1, 80,
        65, 32, 186, 74, 158, 78, 192, 74, 248, 148, 230, 229, 179, 200, 191, 216, 34, 41, 108, 76, 252, 122, 238, 164, 54, 89, 206, 139, 239, 120, 71, 72, 76, 19, 11, 5, 112, 228, 255, 141, 222, 126, 222, 5, 210, 151, 179, 163, 102, 72, 80, 45, 126, 110, 61, 206, 199, 203, 87, 119, 195, 245, 178, 11, 163, 167
      ]
      const scriptPubKey = [
        OP_RETURN,
        ...tp
      ];
      // const scriptPubKey = [
      //   OP_RETURN,
      //   tp.length,
      //   ...tp
      // ];
      outputScript = [
        ...outputScript,
        ...numberToUInt64(value),
        ...numberToCompactSizeUInt(scriptPubKey.length),
        ...scriptPubKey
      ];
    }
	}

	return Buffer.from(outputScript).toString('hex');
}

const createVarint = (value: number) => {
  if (value < 0xfd) {
    const buffer = Buffer.alloc(1);
    buffer[0] = value;
    return buffer;
  }
  if (value <= 0xffff) {
    const buffer = Buffer.alloc(3);
    buffer[0] = 0xfd;
    buffer[1] = value & 0xff;
    buffer[2] = (value >> 8) & 0xff;
    return buffer;
  }
  const buffer = Buffer.alloc(5);
  buffer[0] = 0xfe;
  buffer[1] = value & 0xff;
  buffer[2] = (value >> 8) & 0xff;
  buffer[3] = (value >> 16) & 0xff;
  buffer[4] = (value >> 24) & 0xff;
  return buffer;
}

const createTransaction = async function(utxos, outputs, opReturn) {
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
  
  const gbos = generateBuildOutputScript([
    {
      address: "XrynQ7q5YrvDN2cGuR5wkrxRVv6kEZoFCN",
      value: 100000000
    },
    {
      address: "5872796e51377135597276444e326347755235776b7278525676366b455a6f46434e586e624c394d4c597a517644745268784b326461387151353658674a336e5053516450209e7fc11ac688a4754b770aacf53affe7be614a68f07e475003d69697747c0f23688da99ab9afb31db03b7ffb732d431ba41ed2aa79e8a7df4cf90402553d5f62",
      value: 0
    }
  ])
  // Trying #1
  // const outputScript = Buffer.from(buildOutputScript(outputs), 'hex'); 
  // const outputScript = Buffer.from("01f87b1201000000001976a9148296a5b77770b9d8578f2a1f02f4d633c5dbbfd788ac")
  
  // console.log('outputScript');
  // console.log(outputScript.toString('hex'));
  // console.log('opReturn');
  // console.log(opReturn);
  // let fin = Buffer.alloc(0);
  // fin = Buffer.concat([
  //   fin,
  //   createVarint(2)
  // ])
  // fin = Buffer.concat([
  //   fin,
  //   outputScript
  // ]);
  // fin = Buffer.concat([
  //   fin,
  //   Buffer.from('0'),
  //   createVarint(opReturn.length),
  //   opReturn
  // ]);
  // console.log('outputScript');
  // console.log(outputScript);


  const unixtime = Math.floor(Date.now() / 1000);
  const lockTime = (unixtime - 777);
  const sigHashType = undefined;
  const segwit = undefined;
  const initialTimestamp = undefined;
  const additionals = [];
  const expiryHeight = undefined; // Buffer.from([0x00, 0x00, 0x00, 0x00]); changed

  const transaction = await ledger.createPaymentTransactionNew(
    inputs,
    associatedKeysets,
    changePath,
    gbos,
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

const getBufferOpReturn = async () => {
  // const keyPair = bitcoin.ECPair.makeRandom({ network: regtest })
    // const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: regtest })

    // const unspent = await regtestUtils.faucet(p2pkh.address, 2e5)

    // const txb = new bitcoin.TransactionBuilder(regtest)
    const data = Buffer.from('5872796e51377135597276444e326347755235776b7278525676366b455a6f46434e586e624c394d4c597a517644745268784b326461387151353658674a336e5053516450209e7fc11ac688a4754b770aacf53affe7be614a68f07e475003d69697747c0f23688da99ab9afb31db03b7ffb732d431ba41ed2aa79e8a7df4cf90402553d5f62', 'utf8')
    const embed = bitcoin.payments.embed({ data: [data] })
    console.log('embed:');
    console.log(embed.output);
    // txb.addInput("080bab3514f140bc38520878b0bfe2ee827240d9df572dcfe9381f0056b4f114", 0)

    const ledger = await getDevice();
    const buffSer = await ledger.serializeTransactionOutputs({
      outputs: [{
        script: embed.output,
        amount: Buffer.from('0')
      }]
    });
    console.log('buffSer');
    console.log(buffSer.toString('hex'));
    
    return buffSer;
    // const t = txb.build().toHex();
    // console.log('t:');
    // console.log(t);
    // build and broadcast to the RegTest network
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
    getBufferOpReturn().then((opReturn) => 
    {
      console.log('done');
      this.ft(opReturn).then(() => console.log('done')).catch((err) => console.log(err));
    }
    ).catch(err => console.log(err));
    // this.f().then(() => console.log('done')).catch(err => console.log(err));
    // this.ft().then(() => console.log('done')).catch((err) => console.log(err));
  }
  
  async ft(opReturn) {
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
          value: 17988600
        }
      ],
      opReturn
    );
    console.log(x);
  }

  async f() {
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
