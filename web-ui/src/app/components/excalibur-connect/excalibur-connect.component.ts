import { Component, OnInit } from '@angular/core';
import * as TrezorConnect from '/home/katze/Desktop/trezor/vc/tmp/connect/build/trezor-connect';
import { AddressesService } from '../../services/addresses.service';
import { TransactionsService } from '../../services/transactions.service';

@Component({
  selector: 'app-excalibur-connect',
  templateUrl: './excalibur-connect.component.html',
  styleUrls: ['./excalibur-connect.component.css']
})
export class ExcaliburConnectComponent implements OnInit {

  addresses: Array<Object>;
  selectedFee = 'normal';
  originAddress = '';
  destinyAddress = '';
  amountSatoshi = '';

  constructor(
    private addressesService: AddressesService,
    private transactionsService: TransactionsService
  ) { }

  ngOnInit() {
    this.addresses = Array<Object>();
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
  }

  async getTrezorAddress(path: string) {
    console.log(path);
    const result = await TrezorConnect.getAddress({path: path, coin: 'Stakenet', showOnTrezor: false});
    // const result = await TrezorConnect.getAddress({path: "m/44'/5'/0'/0/1", coin: "DASH", showOnTrezor: false});
    console.log('result');
    console.log(result);
    return result;
  }

  getAddress() {
    const path = 'm/44\'/199\'/0\'/0/' + this.addresses.length;
    this.getTrezorAddress(path).then((result) => {
      this.addresses.push({
        hexAddress: result.payload.address,
        pathAddress: result.payload.serializedPath
      });
    });
  }

  async signTrezorTransaction(params) {
    console.log('sending...');
    console.log(params);
    return new Promise((succ, fail) => {
      succ('Testing');
    });
    const result = await TrezorConnect.signTransaction(params);
    return result;
  }

  private async generateInputs(address, requiredAmount, callback) {
    const inputs = [];
    let change = 0;

    await this.addressesService.getUtxos(address).subscribe(
      response => {
        response.forEach((utxo) => {
          if (requiredAmount > 0) {
            inputs.push({
              prev_hash: utxo.txid,
              prev_index: utxo.outputIndex,
              amount: utxo.satoshis.toString(),
              script_type: 'SPENDADDRESS'
            });
            change = utxo.satoshis - requiredAmount;
            requiredAmount -= utxo.satoshis;
          }
        });

        callback(
          {
            inputs: inputs,
            change: change
          }
        );
      }
    );
  }

  // https://xsnexplorer.io/api/transactions/70cd9123bcc0525574713a8297f68ad4a1450a0dd0bec468707b1de5ec4c5834/raw
  private async generateRefTxs(hashTransactions, callback) {
    console.log('generateRefTxs');
    console.log(hashTransactions);
    const refTxs = [];
    for (let i = 0; i < hashTransactions.length; i++) {
      await this.transactionsService.getRaw(hashTransactions[ i ]).subscribe(
        response => {
          const rtx = {
            lock_time: response.lock_time,
            version: response.version,
            bin_outputs: [],
            inputs: [],
            hash: response.txid
          };
          response.vin.forEach((input) => {
            rtx.inputs.push({
              prev_hash: input.txid,
              prev_index: input.vout,
              script_sig: input.scriptSig.hex,
              sequence: input.sequence
            });
          });
          response.vout.forEach((output) => {
            rtx.bin_outputs.push({
              amount: 0,
              script_pubkey: output.scriptPubKey.hex
            });
          });
          refTxs.push(rtx);
        });
    }

    callback(refTxs);
  }

  /**
   * example of transaction with bitcoin
   * INPUT
   * (on case to sign path) address_n: [44, 0, 0, 0, 0]
   * prev_hash(xsn): 70cd9123bcc0525574713a8297f68ad4a1450a0dd0bec468707b1de5ec4c5834
   * prev_hash: c14246639ff54b2bc626c6ee9063599ed0966e296036bb17522a6c00ffcbd688
   * prev_index: 0
   *
   * OUTPUT
   * address bitcoin: 1JYb731DDFgTBgwcoXVzf8AWsfrBcd9Lsy
   * address XSN: XfoZ6Dh8i5SYagpYDNi358kzF1wZowJzyD
   * satoshis: 490000000 (4.9 XSN)
   *
   * using emulator ./build/trezor-emulator-v1.7.3-107-g1b28618.elf
   *
   * XSN path [ 44, 0, 0, 0, 3 ]
   * from: XfoZ6Dh8i5SYagpYDNi358kzF1wZowJzyD (Has 1.3 XSN)
   * to: XyCiCasy7P4MHtQUknonBTiShBE45Gbbob (Has 1.0 XSN)
   * sending: 010000000 (0.1 XSN)
   */

  async signTransaction() {
    this.generateInputs(this.originAddress, this.amountSatoshi + this.getFeeAmount(), (generatedInputs) => {

      const outputs = [
        {
          address: this.destinyAddress,
          amount: this.amountSatoshi.toString(),
          script_type: 'PAYTOADDRESS'
        }
      ];

      if (generatedInputs.change > 0) {
        outputs.push({
          address: this.originAddress,
          amount: generatedInputs.change.toString(),
          script_type: 'PAYTOADDRESS'
        });
      }

      const hashTransactions = generatedInputs.inputs.map((x) => {
        return x.prev_hash;
      });
      this.generateRefTxs(hashTransactions, (refTxs) => {
        this.signTrezorTransaction({
          inputs: generatedInputs.inputs,
          // inputs: [{prev_hash: 'c14246639ff54b2bc626c6ee9063599ed0966e296036bb17522a6c00ffcbd688', prev_index: 0}],
          outputs: outputs,
          refTxs: refTxs,
          coin: 'Stakenet'
        }).then((result) => {
          console.log(result);
        });
      });
    });
  }

  getFeeAmount(): number {
    if (this.selectedFee === 'low') {
      return 100;
    }
    if (this.selectedFee === 'normal') {
      return 500;
    }
    if (this.selectedFee === 'high') {
      return 1000;
    }

    return 0;
  }
}
