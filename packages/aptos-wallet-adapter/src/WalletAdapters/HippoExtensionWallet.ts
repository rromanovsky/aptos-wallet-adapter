import { MaybeHexString } from 'aptos';
import {
  TransactionPayload,
  SubmitTransactionRequest,
  HexEncodedBytes
} from 'aptos/dist/generated';
import {
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletSignTransactionError
} from '../WalletProviders/errors';
import {
  AccountKeys,
  BaseWalletAdapter,
  scopePollingDetectionStrategy,
  WalletName,
  WalletReadyState
} from './BaseAdapter';

interface IHippoWallet {
  connect: () => Promise<{
    address: MaybeHexString;
    publicKey: MaybeHexString;
    authKey: MaybeHexString;
  }>;
  account: () => Promise<string>;
  isConnected: () => Promise<boolean>;
  signAndSubmitTransaction(transaction: any): Promise<any>;
  signTransaction(transaction: any): Promise<void>;
  disconnect(): Promise<void>;
}

interface HippoWindow extends Window {
  hippoWallet?: IHippoWallet;
}

declare const window: HippoWindow;

export const HippoExtensionWalletName = 'Hippo Wallet' as WalletName<'Hippo Wallet'>;

export interface HippoExtensionWalletAdapterConfig {
  provider?: IHippoWallet;
  // network?: WalletAdapterNetwork;
  timeout?: number;
}

export class HippoExtensionWalletAdapter extends BaseWalletAdapter {
  name = HippoExtensionWalletName;

  url = 'https://github.com/hippospace/hippo-wallet';

  icon = 'https://ui-test1-22e7c.web.app/static/media/hippo_logo.ecded6bf411652de9b7f.png';

  protected _provider: IHippoWallet | undefined;

  // protected _network: WalletAdapterNetwork;
  protected _timeout: number;

  protected _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;

  protected _connecting: boolean;

  protected _wallet: any | null;

  constructor({
    // provider,
    // network = WalletAdapterNetwork.Mainnet,
    timeout = 10000
  }: HippoExtensionWalletAdapterConfig = {}) {
    super();

    this._provider = typeof window !== 'undefined' ? window.hippoWallet : undefined;
    // this._network = network;
    this._timeout = timeout;
    this._connecting = false;
    this._wallet = null;

    if (typeof window !== 'undefined' && this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (window.hippoWallet) {
          this._readyState = WalletReadyState.Installed;
          this.emit('readyStateChange', this._readyState);
          return true;
        }
        return false;
      });
    }
  }

  get publicAccount(): AccountKeys {
    return {
      publicKey: this._wallet?.publicKey || null,
      address: this._wallet?.address || null,
      authKey: this._wallet?.authKey || null
    };
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._wallet?.isConnected;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;
      if (
        !(
          this._readyState === WalletReadyState.Loadable ||
          this._readyState === WalletReadyState.Installed
        )
      )
        throw new WalletNotReadyError();
      this._connecting = true;

      const provider = this._provider || window.hippoWallet;
      const response = await provider?.connect();

      this._wallet = {
        ...response,
        isConnected: true
      };

      this.emit('connect', this._wallet.publicKey);
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    if (wallet) {
      this._wallet = null;

      try {
        const provider = this._provider || window.hippoWallet;
        await provider?.disconnect();
      } catch (error: any) {
        this.emit('error', new WalletDisconnectionError(error?.message, error));
      }
    }

    this.emit('disconnect');
  }

  async signTransaction(transaction: TransactionPayload): Promise<SubmitTransactionRequest> {
    try {
      const wallet = this._wallet;
      if (!wallet) throw new WalletNotConnectedError();

      try {
        const provider = this._provider || window.hippoWallet;
        const response = await provider?.signTransaction(transaction);
        if (response) {
          return response;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signAndSubmitTransaction(
    transaction: TransactionPayload
  ): Promise<{ hash: HexEncodedBytes }> {
    try {
      const wallet = this._wallet;
      if (!wallet) throw new WalletNotConnectedError();

      try {
        const provider = this._provider || window.hippoWallet;
        const response = await provider?.signAndSubmitTransaction(transaction);
        if (response) {
          return response.detail.hash;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        // console.log('transact err', error, error.message);
        throw new WalletSignTransactionError(error.message || error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }
}
