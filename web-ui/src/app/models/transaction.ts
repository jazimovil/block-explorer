
export class Transaction {
  id: string;
  size: number;
  blockhash: string;
  time: number;
  blocktime: number;
  confirmations: number;
  input: TransactionValue[];
  output: TransactionValue[];
  sent: number;
  received: number;
}

export class TransactionValue {
  address: string;
  value: number;
}

export class UTXO {
  satoshis: number;
  txid: string;
  outputIndex: number;
  address: string;
  script: string;
}
