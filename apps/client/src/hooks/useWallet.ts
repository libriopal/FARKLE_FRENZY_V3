import { useState, useEffect, useCallback } from 'react';
import {
  PlayerWallet,
  WalletTransaction,
  DEFAULT_WALLET,
  DAILY_PDX_BONUS,
  PDX_PLAYTHROUGH_RATE,
  FD_TO_PDX_GIFT_RATE,
  CurrencyMode,
  TransactionType
} from '@farkle/shared/types';

const WALLET_STORAGE_KEY = 'farkle_wallet';
const TRANSACTIONS_STORAGE_KEY = 'farkle_transactions';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export interface UseWalletReturn {
  wallet: PlayerWallet;
  transactions: WalletTransaction[];
  claimDailyBonus: () => void;
  purchaseFD: (fdAmount: number) => void;
  wager: (currency: CurrencyMode, amount: number, sessionId?: string) => boolean;
  award: (currency: CurrencyMode, amount: number, sessionId?: string) => void;
  canRedeemPDX: () => boolean;
  resetWallet: () => void;
  isDailyBonusAvailable: boolean;
}

export function useWallet(): UseWalletReturn {
  const [wallet, setWallet] = useState<PlayerWallet>(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as PlayerWallet;
      } catch (e) {
        console.error('Failed to parse stored wallet', e);
      }
    }
    return { ...DEFAULT_WALLET };
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as WalletTransaction[];
      } catch (e) {
        console.error('Failed to parse stored transactions', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const recordTransaction = useCallback((
    type: TransactionType,
    currency: 'CC' | 'SC',
    amount: number,
    balanceAfter: number,
    sessionId?: string,
    notes?: string
  ) => {
    const newTx: WalletTransaction = {
      id: generateId(),
      type,
      currency,
      amount,
      balanceAfter,
      timestamp: new Date().toISOString(),
      sessionId,
      notes
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  /**
   * Claims the daily PDX bonus if it hasn't been claimed today.
   */
  const claimDailyBonus = useCallback(() => {
    const today = getTodayISO();
    if (wallet.lastDailyBonus === today) {
      return; // Already claimed today
    }

    setWallet(prev => {
      const newPdx = prev.pdx + DAILY_PDX_BONUS;
      recordTransaction('PDX_DAILY_BONUS', 'PDX', DAILY_PDX_BONUS, newPdx, undefined, 'Daily Login Bonus');
      return {
        ...prev,
        pdx: newPdx,
        lastDailyBonus: today
      };
    });
  }, [wallet.lastDailyBonus, recordTransaction]);

  /**
   * Stubs a FD purchase, adding FD and gifting PDX based on the rate.
   */
  const purchaseFD = useCallback((fdAmount: number) => {
    if (fdAmount <= 0) return;

    setWallet(prev => {
      const newFd = prev.fd + fdAmount;
      recordTransaction('FD_PURCHASE', 'FD', fdAmount, newFd, undefined, 'Purchased FD package');

      const pdxGift = Math.floor(fdAmount * FD_TO_PDX_GIFT_RATE);
      const newPdx = prev.pdx + pdxGift;
      recordTransaction('PDX_GIFT', 'PDX', pdxGift, newPdx, undefined, 'Gifted PDX with FD purchase');

      return {
        ...prev,
        fd: newFd,
        pdx: newPdx
      };
    });
  }, [recordTransaction]);

  /**
   * Attempts to wager a specific amount of currency.
   * Returns true if successful, false if insufficient funds.
   */
  const wager = useCallback((currency: CurrencyMode, amount: number, sessionId?: string): boolean => {
    if (amount <= 0) return true;

    if (currency === 'FD') {
      if (wallet.fd < amount) return false;
      setWallet(prev => {
        const newFd = prev.fd - amount;
        recordTransaction('FD_WAGER', 'FD', -amount, newFd, sessionId, 'Game wager');
        return { ...prev, fd: newFd };
      });
      return true;
    } else {
      if (wallet.pdx < amount) return false;
      setWallet(prev => {
        const newPdx = prev.pdx - amount;
        const newPlaythroughTotal = prev.pdxPlaythroughTotal + amount;
        recordTransaction('PDX_WAGER', 'PDX', -amount, newPdx, sessionId, 'Game wager');
        return { 
          ...prev, 
          pdx: newPdx,
          pdxPlaythroughTotal: newPlaythroughTotal
        };
      });
      return true;
    }
  }, [wallet.fd, wallet.pdx, recordTransaction]);

  /**
   * Awards winnings to the specified currency balance.
   */
  const award = useCallback((currency: CurrencyMode, amount: number, sessionId?: string) => {
    if (amount <= 0) return;

    if (currency === 'FD') {
      setWallet(prev => {
        const newFd = prev.fd + amount;
        recordTransaction('FD_AWARD', 'FD', amount, newFd, sessionId, 'Game winnings');
        return { ...prev, fd: newFd };
      });
    } else {
      setWallet(prev => {
        const newPdx = prev.pdx + amount;
        // Adjust required playthrough if needed (e.g. if we awarded promotional PDX directly)
        // But typically awards from gameplay don't increase playthrough requirement.
        recordTransaction('PDX_AWARD', 'PDX', amount, newPdx, sessionId, 'Game winnings');
        return { ...prev, pdx: newPdx };
      });
    }
  }, [recordTransaction]);

  /**
   * Checks if the user is eligible to redeem PDX.
   */
  const canRedeemPDX = useCallback((): boolean => {
    // Stub: KYC is always UNVERIFIED for now, so this will always be false in a real check.
    // However, we check the playthrough requirement as requested.
    const isPlaythroughMet = wallet.pdxPlaythroughTotal >= wallet.pdxPlaythroughRequired;
    const isKycVerified = false; // Stub
    
    return isPlaythroughMet && isKycVerified;
  }, [wallet.pdxPlaythroughTotal, wallet.pdxPlaythroughRequired]);

  /**
   * Resets the wallet to default state (for dev/testing).
   */
  const resetWallet = useCallback(() => {
    setWallet({ ...DEFAULT_WALLET });
    setTransactions([]);
  }, []);

  const isDailyBonusAvailable = wallet.lastDailyBonus !== getTodayISO();

  return {
    wallet,
    transactions,
    claimDailyBonus,
    purchaseFD,
    wager,
    award,
    canRedeemPDX,
    resetWallet,
    isDailyBonusAvailable
  };
}
