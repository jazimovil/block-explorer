import { Component, OnInit } from '@angular/core';

// import TransportU2F from '@ledgerhq/hw-transport-u2f';
import buildOutputScript from 'build-output-script';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import Btc from '@ledgerhq/hw-app-btc';

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

const createTransaction = async function(utxos, outputs) {
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
  const outputScript = buildOutputScript(outputs);
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
    outputScript,
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
    this.f().then(() => console.log('done')).catch(err => console.log(err));
    // this.ft().then(() => console.log('done')).catch((err) => console.log(err));
  }
  
  async ft() {
    const x = await createTransaction(
      [
        {
          rawtx: "02000000015fa768a1cb66bf6b4344e31bdb2ff27aeef6b7affe45c06c788a464c6fb5fe31010000006a47304402206d479c19037f40271c66cee7d15e499113a15e59e2d4e98b8bc02a3b979f81a90220775eae1c535a771bed8a361e371b48cae1ebac81b5aa6d3eef00300a17227433012102135ec6c2e464e37b792aa57ad2548b7d7d43dca35638d8dc311994209a911149fdffffff01e07f1201000000001976a914ea9373233bfe6cf7b9b195f7b335766efb3243a288ac00000000",
          vout: 0,
          derivationPath: "44'/199'/0'/0/0"
        }
      ],
      [
        {
          address: "7W29xQV9p5jT1LuXpo86gyZ147VQE36Nm5",
          value: 17989100
        }
      ]
    );
    console.log(x);
  }

  async f() {
    const x = await getAddress(`49'/384'/0'/0/1`, false);
    console.log(x);
  }

  selectView(view: string) {
    this.currentView = view;
  }

  isSelected(view: string): boolean {
    return this.currentView === view;
  }
}
