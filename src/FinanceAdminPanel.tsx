import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Wallet, ArrowDown, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './utils';

interface FinanceAdminPanelProps {
  socket: Socket | null;
  onBack: () => void;
  deposits: any[];
  withdrawals: any[];
  handleUpdateDepositStatus: (id: number, status: 'APPROVED' | 'REJECTED') => void;
  handleUpdateWithdrawStatus: (id: number, status: 'APPROVED' | 'REJECTED') => void;
}

export const FinanceAdminPanel: React.FC<FinanceAdminPanelProps> = ({ 
  socket, onBack, deposits, withdrawals, handleUpdateDepositStatus, handleUpdateWithdrawStatus 
}) => {
  const [activeTab, setActiveTab] = useState<'DEPOSITS' | 'WITHDRAWALS'>('DEPOSITS');

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black">Finance Admin</h1>
          <button onClick={onBack} className="px-4 py-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-xs font-bold hover:bg-[var(--bg-tertiary)] transition">
            Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('DEPOSITS')}
            className={cn("px-6 py-3 rounded-xl text-sm font-bold transition", activeTab === 'DEPOSITS' ? "bg-blue-600 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
          >
            Deposits
          </button>
          <button 
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={cn("px-6 py-3 rounded-xl text-sm font-bold transition", activeTab === 'WITHDRAWALS' ? "bg-blue-600 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
          >
            Withdrawals
          </button>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] p-6 shadow-xl">
          {activeTab === 'DEPOSITS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {deposits.map((deposit: any) => (
                    <tr key={deposit.id}>
                      <td className="py-4">{deposit.email}</td>
                      <td className="py-4 font-bold">{deposit.currency} {deposit.amount}</td>
                      <td className="py-4">{deposit.method}</td>
                      <td className="py-4">{deposit.status}</td>
                      <td className="py-4 text-right">
                        {deposit.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleUpdateDepositStatus(deposit.id, 'APPROVED')} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white"><CheckCircle2 size={16} /></button>
                            <button onClick={() => handleUpdateDepositStatus(deposit.id, 'REJECTED')} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"><XCircle size={16} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'WITHDRAWALS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {withdrawals.map((withdraw: any) => (
                    <tr key={withdraw.id}>
                      <td className="py-4">{withdraw.email}</td>
                      <td className="py-4 font-bold">{withdraw.currency} {withdraw.amount}</td>
                      <td className="py-4">{withdraw.method}</td>
                      <td className="py-4">{withdraw.status}</td>
                      <td className="py-4 text-right">
                        {withdraw.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleUpdateWithdrawStatus(withdraw.id, 'APPROVED')} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white"><CheckCircle2 size={16} /></button>
                            <button onClick={() => handleUpdateWithdrawStatus(withdraw.id, 'REJECTED')} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"><XCircle size={16} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
