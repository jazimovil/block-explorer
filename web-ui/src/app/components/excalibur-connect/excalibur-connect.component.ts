import { Component, OnInit } from '@angular/core';
// import TrezorConnect from 'trezor-connect';
import * as TrezorConnect from './trezor-connect';
import { AddressesService } from '../../services/addresses.service';

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
    private addressesService: AddressesService
  ) { }

  ngOnInit() {
    this.addresses = Array<Object>();
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
  }

  async getTrezorAddress(path: string) {
    const result = await TrezorConnect.getAddress({path: path, coin: 'XSN', showOnTrezor: false});
    // const result = await TrezorConnect.getAddress({path: "m/44'/5'/0'/0/1", coin: "DASH", showOnTrezor: false});
    console.log('result');
    console.log(result);
    return result;
  }

  getAddress() {
    const path = 'm/44\'/0\'/0\'/0/' + this.addresses.length;
    this.getTrezorAddress(path).then((result) => {
      this.addresses.push({
        hexAddress: result.payload.address,
        pathAddress: result.payload.serializedPath
      });
    });
  }

  async signTrezorTransaction(params) {
    console.log('sign trezor tx:');
    console.log(params);
    // return new Promise((succ, fail) => {
    //   succ('Testing');
    // });
    const result = await TrezorConnect.signTransaction(params);
    return result;
  }

  private async generateInputs(address, requiredAmount) {
    console.log(`generate inputs: ${ address } and ${ requiredAmount }`);
    const inputs = [];
    let change = 0;

    await this.addressesService.getUtxos(address).subscribe(
      response => {
        response.forEach((utxo) => {
          if (requiredAmount > 0) {
            inputs.push({
              prev_hash: utxo.txid,
              prev_index: utxo.outputIndex
            });
            change = utxo.satoshis - requiredAmount;
            requiredAmount -= utxo.satoshis;
          }
        });
      }
    );
    console.log('return:');
    console.log(inputs);
    console.log(change);
    return {
      inputs: inputs,
      change: change
    };
  }

  /**
   * example of transaction with bitcoin
   * INPUT
   * (on case to sign path) address_n: [44, 0, 0, 0, 0]
   * prev_hash: c14246639ff54b2bc626c6ee9063599ed0966e296036bb17522a6c00ffcbd688
   * prev_index: 0
   *
   * OUTPUT
   * address bitcoin: 1JYb731DDFgTBgwcoXVzf8AWsfrBcd9Lsy
   * address XSN: XfoZ6Dh8i5SYagpYDNi358kzF1wZowJzyD
   * satoshis: 490000000 (4.9 XSN)
   */

  async signTransaction() {
    const generatedInputs = await this.generateInputs(this.originAddress, this.amountSatoshi + this.getFeeAmount());

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

    this.signTrezorTransaction({
      inputs: generatedInputs.inputs,
      // inputs: [{prev_hash: 'c14246639ff54b2bc626c6ee9063599ed0966e296036bb17522a6c00ffcbd688', prev_index: 0}],
      outputs: outputs,
      coin: 'stakenet'
    }).then((result) => {
      console.log(result);
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
