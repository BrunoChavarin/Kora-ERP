import { db } from './db';
import { BankAccount, Transaction } from '../types';

export const financeService = {
  async getAccounts(): Promise<BankAccount[]> {
    return db.get('accounts');
  },

  async getTransactions(): Promise<Transaction[]> {
    return db.get('transactions');
  },

  async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const transactions: Transaction[] = db.get('transactions');
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    transactions.push(newTx);
    db.save('transactions', transactions);

    // Update account balances
    const accounts: BankAccount[] = db.get('accounts');
    const account = accounts.find(a => a.id === tx.accountId);
    if (account) {
      if (tx.type === 'income') {
        account.balance += tx.amount;
      } else if (tx.type === 'expense') {
        account.balance -= tx.amount;
      }
      db.save('accounts', accounts);
    }

    // Handle Transfer type
    if (tx.type === 'transfer' && tx.referenceId) {
      const destAccount = accounts.find(a => a.id === tx.referenceId);
      if (destAccount) {
        destAccount.balance += tx.amount;
        // Also subtract from source account if not already updated
        if (account) {
          account.balance -= tx.amount; // Transfers subtract from source, add to dest
        }
        db.save('accounts', accounts);
      }
    }

    return newTx;
  },

  async saveAccount(account: BankAccount): Promise<BankAccount> {
    const accounts: BankAccount[] = db.get('accounts');
    const index = accounts.findIndex(a => a.id === account.id);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    db.save('accounts', accounts);
    return account;
  }
};
