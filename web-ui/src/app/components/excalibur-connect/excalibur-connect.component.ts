import { Component, OnInit } from '@angular/core';
import TrezorConnect from 'trezor-connect';

@Component({
  selector: 'app-excalibur-connect',
  templateUrl: './excalibur-connect.component.html',
  styleUrls: ['./excalibur-connect.component.css']
})
export class ExcaliburConnectComponent implements OnInit {

  trezor: TrezorConnect;

  constructor() { }

  ngOnInit() {
    TrezorConnect.manifest({
      email: 'developer@xyz.com',
      appUrl: 'http://your.application.com'
    });
    this.getAddress();
  }

  async getAddress() {
    console.log('getAddress');
    const result = await TrezorConnect.getAddress({path: "m/44'/0'/0'/0/1", coin: "bitcoin", showOnTrezor: false});
    console.log(result);
  }
}
