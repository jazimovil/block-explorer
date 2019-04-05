import { UTXO } from '../models/utxo';

export class TrezorAddress {
  constructor(
    public address: string,
    public path: number[],
    public serializedPath: string) { }
  static LEGACY = 'ADDRESS';
  static SEGWIT = 'WITNESS';
  static P2SHSEGWIT = 'P2SHWITNESS';
}

export const getAddressTypeByAddress = (address: string) => {
  switch (address[0]) {
    case 'X': return TrezorAddress.LEGACY;
    case 'x': return TrezorAddress.SEGWIT;
    case '7': return TrezorAddress.P2SHSEGWIT;
    default: throw new Error('Unknown address type');
  }
};

export const getAddressTypeByPrefix = (prefix: number) => {
  switch (prefix) {
    case 44: return TrezorAddress.LEGACY;
    case 84: return TrezorAddress.SEGWIT;
    case 49: return TrezorAddress.P2SHSEGWIT;
    default: throw new Error('Unknown address type');
  }
};

export const convertToSatoshis = (xsnAmount: number) => {
  if (xsnAmount < 0) {
    throw new Error('Invalid negative amount');
  }
  const splitXSN = xsnAmount.toFixed(8).split('.');
  const num = splitXSN[ 0 ];
  const dec = splitXSN.length === 1 ? '' : splitXSN[ 1 ];
  return Number(num + dec.padEnd(8, '0'));
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
  const response = available.reduce((acc, utxo) => {
    if (acc.total >= satoshis) {
      return acc;
    } else {
      return {
        total: acc.total + utxo.satoshis,
        utxos: acc.utxos.concat([utxo])
      };
    }
  }, { total: 0, utxos: [] });

  if (response.total < satoshis) {
    return { total: 0, utxos: [] };
  } else {
    return response;
  }
};

export const toTrezorInput = (trezorAddresses: TrezorAddress[], utxo: UTXO) => {
  const trezorAddress = trezorAddresses.find(ta => ta.address === utxo.address);
  if (typeof(trezorAddress) === 'undefined') {
    throw new Error('Address not found');
  }
  return {
    address_n: trezorAddress.path,
    prev_hash: utxo.txid,
    prev_index: utxo.outputIndex,
    amount: utxo.satoshis.toString(),
    script_type: 'SPEND' + getAddressTypeByAddress(trezorAddress.address)
  };
};
