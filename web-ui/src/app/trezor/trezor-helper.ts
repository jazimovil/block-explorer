import { UTXO } from '../models/utxo';

export class TrezorAddress {
  constructor(
    public address: string,
    public path: number[],
    public serializedPath: string) { }
}

export const getAddressType = (address: string) => {
  switch (address[0]) {
    case 'X': return 'ADDRESS';
    case 'x': return 'WITNESS';
    case '7': return 'P2SHWITNESS';
    default: throw new Error('Unknown address type');
  }
};

export const convertToSatoshis = (xsnAmount: number) => {
  const stringXSN = xsnAmount.toString();
  let stringSatoshi = '';
  let withDot = false;
  for (let i = 0; i < stringXSN.length; i++) {
    if (stringXSN[i] === '.') {
      stringSatoshi += stringXSN.substr(i + 1).padEnd(8, '0');
      withDot = true;
      break;
    }
    stringSatoshi += stringXSN[i];
  }

  if (!withDot) {
    stringSatoshi = stringSatoshi.padEnd(8, '0');
  }

  return Number(stringSatoshi);
};

export const toTrezorReferenceTransaction = (raw: any) => {
  const inputs = raw.vin.map(input => {
    return {
      prev_hash: input.txid,
      prev_index: input.vout,
      script_sig: input.scriptSig.hex,
      sequence: input.sequence
    };
  });

  const outputs = raw.vout.map(output => {
    return {
      amount: convertToSatoshis(output.value),
      script_pubkey: output.scriptPubKey.hex
    };
  });

  return {
    lock_time: Number(raw.locktime),
    version: raw.version,
    bin_outputs: outputs,
    inputs: inputs,
    hash: raw.txid
  };
};

export const selectUtxos = (available: UTXO[], satoshis: number) => {
  return available.reduce((acc, utxo) => {
    if (acc.total >= satoshis) {
      return acc;
    } else {
      return {
        total: acc.total + utxo.satoshis,
        utxos: acc.utxos.concat([utxo])
      };
    }
  }, { total: 0, utxos: [] });
};

export const toTrezorInput = (trezorAddresses: TrezorAddress[], utxo: UTXO) => {
  const trezorAddress = trezorAddresses.find(ta => ta.address === utxo.address);
  return {
    address_n: trezorAddress.path,
    prev_hash: utxo.txid,
    prev_index: utxo.outputIndex,
    amount: utxo.satoshis.toString(),
    script_type: 'SPEND' + getAddressType(trezorAddress.address)
  };
};
