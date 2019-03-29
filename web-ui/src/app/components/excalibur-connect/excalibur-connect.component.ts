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

  addresses: Array<{ hexAddress: string, pathAddress: string }>;
  selectedFee = 'normal';
  originAddress = '';
  destinyAddress = '';
  amountSatoshi = '';

  constructor(
    private addressesService: AddressesService,
    private transactionsService: TransactionsService
  ) { }

  ngOnInit() {
    this.addresses = [{ hexAddress: 'XfoZ6Dh8i5SYagpYDNi358kzF1wZowJzyD', pathAddress: 'm/44\'/0\'/0\'/0/3' }];
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
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

  /**
   * XSN path [ 44, 0, 0, 0, 3 ]
   * from: XfoZ6Dh8i5SYagpYDNi358kzF1wZowJzyD (Has 1.19999500 XSN)
   * to: XyCiCasy7P4MHtQUknonBTiShBE45Gbbob (Has 1.1 XSN)
   * sending: 002000000 (0.02 XSN)
   */

  async signTransaction() {
    this.generateInputs(this.originAddress, this.amountSatoshi + this.getFeeAmount(), (generatedInputs) => {

      const outputs = [{
        address: this.destinyAddress,
        amount: this.amountSatoshi.toString(),
        script_type: 'PAYTO' + this.typeOfAddress(this.destinyAddress)
      }];

      if (generatedInputs.change > 0) {
        outputs.push({
          address: this.originAddress,
          amount: generatedInputs.change.toString(),
          script_type: 'PAYTO' + this.typeOfAddress(this.originAddress)
        });
      }

      const hashTransactions = generatedInputs.inputs.map((x) => {
        return x.prev_hash;
      });
      this.generateRefTxs(hashTransactions, (refTxs) => {
        this.signTrezorTransaction({
          inputs: generatedInputs.inputs,
          outputs: outputs,
          refTxs: refTxs,
          coin: 'Stakenet'
        }).then((result) => {
          console.log(result);
        });
      });
    });
  }

  private getFeeAmount(): number {
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

  private typeOfAddress(address) {
    if ('X' === address[ 0 ]) {
      return 'ADDRESS';
    }
    if ('x' === address[ 0 ]) {
      return 'WITNESS';
    }
    if ('7' === address[ 0 ]) {
      return 'P2SHWITNESS';
    }
  }

  private async generateRefTxs(hashTransactions, callback) {
    const refTxs = [];
    for (let i = 0; i < hashTransactions.length; i++) {
      await this.transactionsService.getRaw(hashTransactions[ i ]).subscribe(
        response => {
          const rtx = {
            lock_time: Number(response.locktime),
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
              amount: this.convertToSatoshi(output.value),
              script_pubkey: output.scriptPubKey.hex
            });
          });
          refTxs.push(rtx);
        });
    }
    callback(refTxs);
  }

  private async getTrezorAddress(path: string) {
    const result = await TrezorConnect.getAddress({path: path, coin: 'Stakenet', showOnTrezor: false});
    return result;
  }

  private async signTrezorTransaction(params) {
    // return new Promise((succ, fail) => {
    //   succ('Testing');
    // });
    const result = await TrezorConnect.signTransaction(params);
    return result;
  }

  private getPathByAddress(address) {
    const path = this.addresses.filter(element => element.hexAddress === address);

    const pathBytes = [];
    path[ 0 ].pathAddress.split('\'').forEach( piece => {
      const num = piece.split('/');
      num.
      filter( n => n !== '' && ! isNaN(Number(n))).
      forEach( n => pathBytes.push(Number(n)) );
    });

    return pathBytes;
  }

  private async generateInputs(address, requiredAmount, callback) {
    const inputs = [];
    let change = 0;

    await this.addressesService.getUtxos(address).subscribe(
      response => {
        response.forEach((utxo) => {
          if (requiredAmount > 0) {
            inputs.push({
              address_n: this.getPathByAddress(address),
              prev_hash: utxo.txid,
              prev_index: utxo.outputIndex,
              amount: utxo.satoshis.toString(),
              script_type: 'SPEND' + this.typeOfAddress(address)
            });
            change = utxo.satoshis - requiredAmount;
            requiredAmount -= utxo.satoshis;
          }
        });

        callback({
          inputs: inputs,
          change: change
        });
      }
    );
  }

  private convertToSatoshi(xsnAmount) {
    const stringXSN = xsnAmount.toString();
    let stringSatoshi = '';
    for (let i = 0; i < stringXSN.length; i++) {
      if (stringXSN[ i ] === '.') {
        stringSatoshi += stringXSN.substr(i + 1).padEnd(8, '0');
        break;
      }
      stringSatoshi += stringXSN[ i ];
    }

    return Number(stringSatoshi);
  }
}
