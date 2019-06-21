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
          rawtx: "0100000001979d2e1befd150fbd4b2e6d75df02d5f294a217a3a16736b791cafee8db27026000000006a4730440220571bd8a793cb87f5ff4a0dadfa83ce24f70166e78efb2b00715840f4d7ba568002202ac12a195c191e78423a2ae6b40173c3ae84eb0514088aeddbc2c60b23b0c8be01210336c22a8007c29c2964c8f79154f14a8343c57783ba392ca600c9c0a2f228f8ecffffffff01ec7d1201000000001976a914279f4fd9dfabbc50175642b109487404978f2fb588ac97840d5d",
          vout: 0,
          derivationPath: "44'/384'/0'/0/1"
        }
      ],
      [
        {
          address: "XkPKhnKxCghRk3Ygtt19PqskX2ctVpeqE5",
          value: 17988600
        }
      ]
    );
    console.log(x);
  }

  async f() {
    const x = await getAddress(`44'/384'/0'/0/2`, false);
    console.log(x);
  }

  selectView(view: string) {
    this.currentView = view;
  }

  isSelected(view: string): boolean {
    return this.currentView === view;
  }
}
