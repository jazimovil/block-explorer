import { Component, OnInit } from '@angular/core';
import TrezorConnect from 'trezor-connect';

@Component({
  selector: 'app-excalibur-connect',
  templateUrl: './excalibur-connect.component.html',
  styleUrls: ['./excalibur-connect.component.css']
})
export class ExcaliburConnectComponent implements OnInit {

  addresses: Array<Object>;
  selectedFee = 'normal';

  constructor() { }

  ngOnInit() {
    this.addresses = Array<Object>();
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
  }

  async getTrezorAddress(path: string) {
    const result = await TrezorConnect.getAddress({path: path, coin: 'bitcoin', showOnTrezor: false});
    // const result = await TrezorConnect.getAddress({path: "m/44'/5'/0'/0/1", coin: "DASH", showOnTrezor: false});
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

  getFeeAmount(feeType): number {
    if (feeType === 'low') {
      return 100;
    }
    if (feeType === 'normal') {
      return 500;
    }
    if (feeType === 'high') {
      return 1000;
    }

    return 0;
  }
}
