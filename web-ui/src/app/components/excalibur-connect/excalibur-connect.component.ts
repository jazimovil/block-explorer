import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import TrezorConnect from 'trezor-connect';

import { AddressesService } from '../../services/addresses.service';
import { TransactionsService } from '../../services/transactions.service';
import { UTXO } from '../../models/utxo';
import { TrezorAddress, getAddressType, selectUtxos, toTrezorInput, toTrezorReferenceTransaction } from '../../trezor/trezor-helper';

@Component({
  selector: 'app-excalibur-connect',
  templateUrl: './excalibur-connect.component.html',
  styleUrls: ['./excalibur-connect.component.css']
})
export class ExcaliburConnectComponent implements OnInit {

  trezorAddresses: TrezorAddress[] = [];
  utxos: UTXO[] = [];

  constructor(
    private addressesService: AddressesService,
    private transactionsService: TransactionsService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
  }

  getAvailableSatoshis() {
    this.utxos.map(u => u.satoshis).reduce((a, b) => a + b, 0);
  }

  private onTrezorAddressGenerated(trezorAddress: TrezorAddress) {
    this.trezorAddresses.push(trezorAddress);

    this.addressesService
      .getUtxos(trezorAddress.address)
      .subscribe( utxos => this.utxos = this.utxos.concat(utxos) );
  }

  generateNextAddress(addressType: string): void {
    const path = `m/${addressType}'/199'/0'/0/${this.trezorAddresses.length}`;
    this.getTrezorAddress(path)
      .then(this.onTrezorAddressGenerated.bind(this));
  }

  signTransaction(destinationAddress: string, satoshis: number) {
    const generatedInputs = this.generateInputs(satoshis);

    const outputs = [{
      address: destinationAddress,
      amount: satoshis.toString(),
      script_type: 'PAYTO' + getAddressType(destinationAddress)
    }];

    if (generatedInputs.change > 0) {
      outputs.push({
        address: generatedInputs.addressToChange,
        amount: generatedInputs.change.toString(),
        script_type: 'PAYTO' + getAddressType(generatedInputs.addressToChange)
      });
    }

    const hashTransactions = generatedInputs.inputs.map((x) => {
      return x.prev_hash;
    });

    this.getRefTransactions(hashTransactions).subscribe( txs => {
      this.signTrezorTransaction({
        inputs: generatedInputs.inputs,
        outputs: outputs,
        refTxs: txs,
        coin: 'Stakenet'
      }).then((result) => {
        if (result.payload.error) {
          console.log(result);
        } else {
          this.pushTransaction(result.payload.serializedTx);
        }
      });
    });
  }

  sendTPOS() {
    console.log('sending tpos');
  }

  private getRefTransactions(txids: string[]): Observable<any[]> {
    const observables = txids.map( txid => this.transactionsService.getRaw(txid) );
    const result = forkJoin(observables).pipe(
      map( rawTxs => rawTxs.map(toTrezorReferenceTransaction) )
    );

    return result;
  }

  private async getTrezorAddress(path: string): Promise<TrezorAddress> {
    const result = await TrezorConnect.getAddress({path: path, coin: 'Stakenet', showOnTrezor: false});
    console.log(result);
    return result.payload;
  }

  private async signTrezorTransaction(params) {
    console.log('sending to sign');
    console.log(params);
    // return new Promise((succ, fail) => {
    //   succ('Testing');
    // });
    const result = await TrezorConnect.signTransaction(params);
    return result;
  }

  private pushTransaction(hex) {
    console.log('push hex');
    console.log(hex);
    this.transactionsService
      .push(hex)
      .subscribe(response => console.log(response));
  }

  private generateInputs(satoshis: number) {
    const selectedUtxos = selectUtxos(this.utxos, satoshis);
    const change = selectedUtxos.total - satoshis;
    const inputs = selectedUtxos.utxos.map(utxo => toTrezorInput(this.trezorAddresses, utxo));
    const addressToChange = selectedUtxos.utxos[selectedUtxos.utxos.length - 1].address;

    return {
      inputs: inputs,
      addressToChange: addressToChange,
      change: change
    };
  }

  renderSatoshis(amount: number) {
    return amount / 100000000;
  }
}
