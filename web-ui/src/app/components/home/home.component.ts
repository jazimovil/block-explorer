import { Component, OnInit } from '@angular/core';

import TransportU2F from '@ledgerhq/hw-transport-u2f';
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

const getAddress = async (derivationPath, verify) => {
  const ledger = await getDevice();
  const params = { verify: verify, format: 'legacy' };
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
    this.f().then(() => console.log('done'));
  }

  async f() {
    const x = await getAddress(`m/44'/0'/0'/0/0`, true);
    console.log(x);
  }

  selectView(view: string) {
    this.currentView = view;
  }

  isSelected(view: string): boolean {
    return this.currentView === view;
  }
}
