'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, ArrowLeft, Search, Filter, Download, RefreshCw, Eye, 
  RotateCcw, TrendingUp, DollarSign, AlertCircle, CheckCircle, 
  XCircle, Clock, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

interface CardTransaction {
  id: string;
  userId: string;
  User?: { email: string };
  PaymentProvider?: { name: string; displayName: string };
  transactionType: 'payment' | 'refund' | 'partial_refund' | 'chargeback';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  cardLastFourDigits?: string;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  binNumber?: string;
  installmentCount: number;
  installmentAmount?: number;
  iyzicoPaymentId?: string;
  threeDSecure: boolean;
  commissionRate?: number;
  commissionAmount?: number;
  netAmount?: number;
  errorCode?: string;
  errorMessage?: string;
  refundedAmount: number;
  customerEmail?: string;
  createdAt: string;
  processedAt?: string;
}

interface TransactionSummary {
  byStatus: Array<{ status: string; count: number; totalAmount: number }>;
  dailyTransactions: Array<{ date: string; count: number; amount: number }>;
  totalCommission: number;
}

export default function CardTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ totalAmount: 0, totalNetAmount: 0, totalCount: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Refund Dialog
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundingTransaction, setRefundingTransaction] = useState<CardTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Detail Dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CardTransaction | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const res = await fetch(`/api/iyzico/admin/transactions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.data || []);
        setPagination(data.pagination || pagination);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const res = await fetch('/api/iyzico/admin/transactions/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [pagination.page, statusFilter, dateRange.start, dateRange.end]);

  const handleRefund = async () => {
    if (!refundingTransaction) return;
    
    try {
      setRefunding(true);
      const token = localStorage.getItem('lingroot_token');
      
      const res = await fetch('/api/iyzico/admin/refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: refundingTransaction.id,
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
          reason: refundReason
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('İade işlemi başarılı!');
        setShowRefundDialog(false);
        setRefundingTransaction(null);
        setRefundAmount('');
        setRefundReason('');
        fetchTransactions();
        fetchSummary();
      } else {
        alert(`İade başarısız: ${data.message}`);
      }
    } catch (err) {
      console.error('Refund error:', err);
      alert('İade işlemi sırasında hata oluştu');
    } finally {
      setRefunding(false);
    }
  };

  const openRefundDialog = (transaction: CardTransaction) => {
    setRefundingTransaction(transaction);
    setRefundAmount(transaction.amount.toString());
    setShowRefundDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Bekliyor' },
      processing: { variant: 'outline', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'İşleniyor' },
      completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Tamamlandı' },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Başarısız' },
      cancelled: { variant: 'secondary', icon: <XCircle className="h-3 w-3" />, label: 'İptal' },
      refunded: { variant: 'outline', icon: <RotateCcw className="h-3 w-3" />, label: 'İade Edildi' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Tarih', 'E-posta', 'Tutar', 'Durum', 'Kart', 'Taksit', 'İşlem ID'];
    const rows = transactions.map(t => [
      new Date(t.createdAt).toLocaleString('tr-TR'),
      t.customerEmail || t.User?.email || '-',
      t.amount,
      t.status,
      t.cardLastFourDigits ? `****${t.cardLastFourDigits}` : '-',
      t.installmentCount,
      t.iyzicoPaymentId || t.id
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `islemler_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-indigo-600" />
                Kredi Kartı İşlemleri
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tüm kredi kartı ödemelerini yönetin ve takip edin
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Toplam Gelir</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Gelir</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalNetAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Toplam İşlem</p>
                  <p className="text-2xl font-bold">{stats.totalCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Komisyon</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary?.totalCommission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="failed">Başarısız</SelectItem>
                    <SelectItem value="refunded">İade Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-40"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-40"
                />
              </div>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setDateRange({ start: '', end: '' });
                }}
              >
                Filtreleri Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz işlem bulunmuyor</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Kart</TableHead>
                      <TableHead>Taksit</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.customerEmail || transaction.User?.email || '-'}</p>
                            <p className="text-xs text-gray-500">{transaction.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                            {transaction.netAmount && (
                              <p className="text-xs text-gray-500">Net: {formatCurrency(transaction.netAmount)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                          {transaction.threeDSecure && (
                            <Badge variant="outline" className="ml-1 text-xs">3D</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.cardLastFourDigits ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">****{transaction.cardLastFourDigits}</span>
                              {transaction.cardType && (
                                <Badge variant="secondary" className="text-xs">
                                  {transaction.cardType}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.installmentCount > 1 ? (
                            <span>{transaction.installmentCount} Taksit</span>
                          ) : (
                            'Tek Çekim'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {transaction.status === 'completed' && transaction.refundedAmount < transaction.amount && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openRefundDialog(transaction)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Toplam {pagination.total} işlemden {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>İşlem Detayı</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">İşlem ID</Label>
                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">iyzico ID</Label>
                    <p className="font-mono text-sm">{selectedTransaction.iyzicoPaymentId || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Müşteri</Label>
                    <p>{selectedTransaction.customerEmail || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Tarih</Label>
                    <p>{new Date(selectedTransaction.createdAt).toLocaleString('tr-TR')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Tutar</Label>
                    <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Net Tutar</Label>
                    <p>{formatCurrency(selectedTransaction.netAmount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Komisyon</Label>
                    <p>%{selectedTransaction.commissionRate || 0} ({formatCurrency(selectedTransaction.commissionAmount || 0)})</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Durum</Label>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                  <div>
                    <Label className="text-gray-500">Kart</Label>
                    <p>****{selectedTransaction.cardLastFourDigits} ({selectedTransaction.cardType})</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Kart Ailesi</Label>
                    <p>{selectedTransaction.cardFamily || '-'}</p>
                  </div>
                </div>
                
                {selectedTransaction.errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <Label className="text-red-600">Hata</Label>
                    <p className="text-sm text-red-600">{selectedTransaction.errorMessage}</p>
                    {selectedTransaction.errorCode && (
                      <p className="text-xs text-red-500">Kod: {selectedTransaction.errorCode}</p>
                    )}
                  </div>
                )}
                
                {selectedTransaction.refundedAmount > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <Label className="text-orange-600">İade Bilgisi</Label>
                    <p className="text-sm">İade Edilen: {formatCurrency(selectedTransaction.refundedAmount)}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>İade İşlemi</DialogTitle>
              <DialogDescription>
                Bu işlem için iade başlatın. İade işlemi geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            {refundingTransaction && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Orijinal Tutar</p>
                  <p className="text-xl font-bold">{formatCurrency(refundingTransaction.amount)}</p>
                  {refundingTransaction.refundedAmount > 0 && (
                    <p className="text-sm text-orange-600">
                      Daha önce iade edilen: {formatCurrency(refundingTransaction.refundedAmount)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>İade Tutarı</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={refundingTransaction.amount - refundingTransaction.refundedAmount}
                  />
                  <p className="text-xs text-gray-500">
                    Maksimum: {formatCurrency(refundingTransaction.amount - refundingTransaction.refundedAmount)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>İade Sebebi</Label>
                  <Textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="İade sebebini girin..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                İptal
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRefund}
                disabled={refunding}
              >
                {refunding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    İade Ediliyor...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    İade Et
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
