import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import {
  LuPackage,
  LuTriangleAlert,
  LuArrowUpRight,
  LuRotateCcw,
  LuSearch,
  LuRefreshCw,
  LuHistory,
  LuPlus,
  LuSend,
  LuX,
  LuArrowDownLeft,
} from 'react-icons/lu';

const Storekeeper = () => {
  const { showToast } = useToast();

  // State
  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // UI State
  const [actionModal, setActionModal] = useState({ open: false, type: null, item: null });
  const [historyModal, setHistoryModal] = useState({ open: false, item: null });

  // Form State
  const [formData, setFormData] = useState({
    qty: '',
    reference: '',
    reason: '',
    remarks: '',
    rep_id: '',
  });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const calculateStatus = (qty, minLevel) => {
    if (qty === 0) return 'OUT';
    if (qty < minLevel) return 'LOW';
    return 'OK';
  };

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name');
      if (itemsError) throw itemsError;

      const { data: transData, error: transError } = await supabase
        .from('stock_transactions')
        .select('*');
      if (transError && transError.code !== 'PGRST116') throw transError;

      const { data: repsData, error: repsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'rep');
      if (repsError && repsError.code !== 'PGRST116') {
        console.error('Error fetching reps:', repsError);
      }
      if (repsData) setReps(repsData);

      const transactionsList = transData || [];

      const mergedStocks = (itemsData || []).map((item) => {
        const currentQty = item.quantity ?? 0;

        return {
          ...item,
          qty: currentQty,
          status: calculateStatus(currentQty, item.minimum_level || 10),
        };
      });

      setStocks(mergedStocks);
      setTransactions(transactionsList);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      if (!silent) {
        setError(`Failed to load ledger data: ${err.message || JSON.stringify(err)}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!actionModal.open && !historyModal.open) {
        fetchData(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [actionModal.open, historyModal.open, fetchData]);

  // Dashboard Stats
  const today = new Date().toISOString().split('T')[0];
  const todayTrans = transactions.filter((t) => t.created_at && t.created_at.startsWith(today));
  const stats = {
    totalItems: stocks.length,
    lowStock: stocks.filter((s) => s.status === 'LOW' || s.status === 'OUT').length,
    todayIssued: todayTrans.filter((t) => t.type === 'OUT').reduce((sum, t) => sum + (t.qty || 0), 0),
    todayReturned: todayTrans
      .filter((t) => t.type === 'RETURN')
      .reduce((sum, t) => sum + (t.qty || 0), 0),
  };

  // Filtered rows
  const filteredStocks = stocks.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleOpenAction = (type, item) => {
    setActionModal({ open: true, type, item });
    setFormData({
      qty: '',
      reference: '',
      reason: '',
      remarks: type === 'ADD' ? 'Added by storekeeper' : '',
      rep_id: '',
    });
    setError(null);
  };

  const handleCloseModal = () => {
    setActionModal({ open: false, type: null, item: null });
    setHistoryModal({ open: false, item: null });
  };

  const handleSubmitStock = async (e) => {
    e.preventDefault();
    const { type, item } = actionModal;
    const qty = parseInt(formData.qty, 10);

    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let typeDb = 'IN';
      let remarks = formData.remarks;
      let repId = null;

      if (type === 'ADD') {
        typeDb = 'IN';
        remarks = remarks || 'Added by storekeeper';
      } else if (type === 'RETURN') {
        typeDb = 'RETURN';
        remarks = `${formData.reason} - ${remarks}`;
      } else if (type === 'ISSUE') {
        typeDb = 'OUT';
        if (item.qty < qty) {
          throw new Error(`Insufficient stock. Available: ${item.qty}`);
        }
        if (!formData.rep_id) {
          throw new Error('Please select a Representative.');
        }
        const repName = reps.find((r) => r.id === formData.rep_id)?.name || 'Unknown Rep';
        remarks = `Issued to ${repName} - ${remarks}`;
        repId = formData.rep_id;
      }

      let newQty = item.qty ?? 0;
      if (type === 'ADD') {
        newQty += qty;
      } else if (type === 'ISSUE' || type === 'RETURN') {
        newQty = Math.max(0, newQty - qty);
      }

      const { error: itemUpdateError } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', item.id);
      if (itemUpdateError) throw itemUpdateError;

      const transactionRecord = {
        item_id: item.id,
        type: typeDb,
        qty,
        reference: formData.reference || null,
        remarks: remarks || null,
        rep_id: repId,
        created_at: new Date().toISOString(),
      };

      const { error: transError } = await supabase
        .from('stock_transactions')
        .insert([transactionRecord]);
      if (transError) {
        console.warn('Stock transaction log note:', transError);
      }

      await fetchData();
      showToast(
        `Successfully ${
          type === 'ADD' ? 'added' : type === 'ISSUE' ? 'issued' : 'returned'
        } stock for ${item.name}.`,
        'success'
      );
      handleCloseModal();
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  const getItemHistory = () => {
    if (!historyModal.item) return [];
    return transactions
      .filter((t) => t.item_id === historyModal.item.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Central Depot Ledger
              {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
            </span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Stock Ledger
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Record inward receipts, rep dispatches, returns, and audit item movement history.
          </p>
        </div>

        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-card transition-colors self-start md:self-auto"
        >
          <LuRefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Bento KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Items</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <LuPackage className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stats.totalItems}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Tracked ledger SKUs</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Low / Out Stock</span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <LuTriangleAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stats.lowStock}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Below minimum threshold</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Issued Today</span>
            <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <LuArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stats.todayIssued}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Units dispatched to reps</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Returned Today</span>
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <LuRotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white">
              {stats.todayReturned}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Damaged or expired units</div>
          </div>
        </div>
      </div>

      {/* Unified Data Surface Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search item name or SKU..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
            {['ALL', 'OK', 'LOW', 'OUT'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {status === 'ALL' ? 'All Status' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Item Name
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Current Stock
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Min Level
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
              {loading && stocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-sm">
                    Loading inventory ledger...
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-sm">
                    No matching items found.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item) => {
                  const statusBadge =
                    item.status === 'OUT'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : item.status === 'LOW'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div>{item.name}</div>
                        {item.sku && (
                          <div className="text-[11px] font-mono text-zinc-400 font-normal">
                            {item.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-950 dark:text-white">
                        {item.qty}{' '}
                        <span className="text-xs font-sans font-normal text-zinc-400">
                          {item.unit_of_measure || 'units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500 dark:text-zinc-400">
                        {item.minimum_level || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusBadge}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setHistoryModal({ open: true, item })}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                          >
                            <LuHistory className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={() => handleOpenAction('ADD', item)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          >
                            <LuPlus className="w-3.5 h-3.5" />
                            <span>Add (IN)</span>
                          </button>
                          <button
                            onClick={() => handleOpenAction('ISSUE', item)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors"
                          >
                            <LuSend className="w-3.5 h-3.5" />
                            <span>Issue (OUT)</span>
                          </button>
                          <button
                            onClick={() => handleOpenAction('RETURN', item)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-semibold transition-colors"
                          >
                            <LuRotateCcw className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION MODAL (ADD / RETURN / ISSUE) */}
      {actionModal.open && (
        <div
          className="fixed inset-0 !mt-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  {actionModal.type === 'ADD' && 'Add New Stock (IN)'}
                  {actionModal.type === 'RETURN' && 'Log Stock Return'}
                  {actionModal.type === 'ISSUE' && 'Issue Stock to Rep (OUT)'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Item: <strong className="text-zinc-900 dark:text-zinc-200">{actionModal.item?.name}</strong> · On-hand:{' '}
                  <span className="font-mono">{actionModal.item?.qty}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                />
              </div>

              {actionModal.type === 'ADD' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Reference (Invoice / GRN)
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
              )}

              {actionModal.type === 'ISSUE' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Select Representative
                  </label>
                  <select
                    required
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.rep_id}
                    onChange={(e) => setFormData({ ...formData, rep_id: e.target.value })}
                  >
                    <option value="">-- Select Rep --</option>
                    {reps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actionModal.type === 'RETURN' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Reason
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  >
                    <option value="">Select Reason</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Error">Order Error</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Remarks
                </label>
                <textarea
                  rows="3"
                  className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Submit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModal.open && (
        <div
          className="fixed inset-0 !mt-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Transaction History
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {historyModal.item?.name}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[460px] overflow-y-auto">
              {getItemHistory().length === 0 ? (
                <div className="py-14 px-6 text-center">
                  <LuHistory className="w-9 h-9 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No Transactions Yet
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Transaction history will appear here once you add, issue, or return stock.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/50">
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Date & Time
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Type
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-center">
                        Quantity
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Reference
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
                    {getItemHistory().map((t) => {
                      const date = new Date(t.created_at);
                      const isIn = t.type === 'IN';
                      const isOut = t.type === 'OUT';

                      return (
                        <tr key={t.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                              {date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {date.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isIn
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : isOut
                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {isIn ? (
                                <LuArrowDownLeft className="w-3 h-3" />
                              ) : isOut ? (
                                <LuArrowUpRight className="w-3 h-3" />
                              ) : (
                                <LuRotateCcw className="w-3 h-3" />
                              )}
                              {t.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span
                              className={
                                isIn
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isOut
                                  ? 'text-sky-600 dark:text-sky-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }
                            >
                              {isIn ? '+' : '-'}
                              {t.qty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                            {t.reference || '—'}
                          </td>
                          <td className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400 max-w-[260px] truncate">
                            {t.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storekeeper;
