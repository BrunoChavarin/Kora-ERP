import { supabase } from '../config/supabase';
import { BankAccount, Transaction } from '../types';

export const financeService = {
  async getAccounts(): Promise<BankAccount[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    // If no account exists for the company, create a default one
    if (!data || data.length === 0) {
      const { data: newAcc, error: insertErr } = await supabase
        .from('bank_accounts')
        .insert({
          company_id: profile.company_id,
          name: 'Santander Operativa',
          type: 'bank',
          balance: 10000,
          account_number: '•••• 1234'
        })
        .select()
        .single();

      if (insertErr || !newAcc) return [];
      return [{
        id: newAcc.id,
        companyId: newAcc.company_id,
        name: newAcc.name,
        type: newAcc.type,
        balance: Number(newAcc.balance),
        accountNumber: newAcc.account_number,
        createdAt: newAcc.created_at
      }];
    }

    return (data || []).map(a => ({
      id: a.id,
      companyId: a.company_id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      accountNumber: a.account_number,
      createdAt: a.created_at
    }));
  },

  async getTransactions(): Promise<Transaction[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(t => ({
      id: t.id,
      companyId: t.company_id,
      accountId: t.account_id,
      type: t.type,
      amount: Number(t.amount),
      category: t.category,
      description: t.description,
      referenceId: t.reference_id,
      date: t.date,
      createdAt: t.created_at
    }));
  },

  async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    // 1. Insert Transaction record
    const { data: newTx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        company_id: profile.company_id,
        account_id: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description || tx.category,
        reference_id: tx.referenceId || null,
        date: tx.date
      })
      .select()
      .single();

    if (txErr || !newTx) throw txErr;

    // 2. Adjust Balance for source account
    const { data: sourceAcc } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', tx.accountId)
      .single();

    if (sourceAcc) {
      let nextBalance = Number(sourceAcc.balance);
      if (tx.type === 'income') nextBalance += tx.amount;
      if (tx.type === 'expense') nextBalance -= tx.amount;
      if (tx.type === 'transfer') nextBalance -= tx.amount;

      await supabase
        .from('bank_accounts')
        .update({ balance: nextBalance })
        .eq('id', tx.accountId);
    }

    // 3. Adjust destination balance if type is Transfer
    if (tx.type === 'transfer' && tx.referenceId) {
      const { data: destAcc } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', tx.referenceId)
        .single();

      if (destAcc) {
        const nextBalance = Number(destAcc.balance) + tx.amount;
        await supabase
          .from('bank_accounts')
          .update({ balance: nextBalance })
          .eq('id', tx.referenceId);
      }
    }

    return {
      id: newTx.id,
      companyId: newTx.company_id,
      accountId: newTx.account_id,
      type: newTx.type,
      amount: Number(newTx.amount),
      category: newTx.category,
      description: newTx.description,
      referenceId: newTx.reference_id,
      date: newTx.date,
      createdAt: newTx.created_at
    };
  },

  async saveAccount(account: BankAccount): Promise<BankAccount> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    const isNew = account.id.startsWith('acc-');
    const payload = {
      company_id: profile.company_id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      account_number: account.accountNumber || null
    };

    if (!isNew) {
      const { error } = await supabase
        .from('bank_accounts')
        .update(payload)
        .eq('id', account.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('bank_accounts')
        .insert(payload);
      if (error) throw error;
    }

    return account;
  }
};
