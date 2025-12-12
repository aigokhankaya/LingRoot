/**
 * iyzico Payment Controller
 * Kredi kartı ödemeleri için iyzico entegrasyonu
 */
const crypto = require('crypto');
const { PaymentProvider, CardTransaction, User, Subscription } = require('../models');
const { supabase } = require('../config/db');

// iyzico API sınıfı
class IyzicoAPI {
  constructor(apiKey, secretKey, baseUrl) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = baseUrl;
  }

  generateAuthorizationString(request) {
    const randomString = this.generateRandomString(8);
    const hashString = randomString + this.secretKey;
    const hash = crypto.createHash('sha1').update(hashString).digest('base64');
    return 'IYZWS ' + this.apiKey + ':' + hash;
  }

  generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  generatePkiString(obj) {
    let result = '[';
    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          result += key + '=' + this.generatePkiString(obj[key]) + ',';
        } else if (Array.isArray(obj[key])) {
          result += key + '=[';
          for (const item of obj[key]) {
            if (typeof item === 'object') {
              result += this.generatePkiString(item) + ', ';
            } else {
              result += item + ', ';
            }
          }
          result = result.slice(0, -2) + '],';
        } else {
          result += key + '=' + obj[key] + ',';
        }
      }
    }
    result = result.slice(0, -1) + ']';
    return result;
  }

  generateHash(pkiString) {
    const hashString = this.apiKey + pkiString + this.secretKey;
    return crypto.createHash('sha1').update(hashString).digest('base64');
  }

  async makeRequest(endpoint, body) {
    const pkiString = this.generatePkiString(body);
    const hash = this.generateHash(pkiString);
    
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.generateAuthorizationString(body),
        'x-iyzi-rnd': body.locale || 'tr',
        'x-iyzi-client-version': 'iyzipay-node-2.0'
      },
      body: JSON.stringify(body)
    });

    return await response.json();
  }
}

// Helper: Aktif iyzico sağlayıcısını al
async function getActiveIyzicoProvider() {
  const provider = await PaymentProvider.findOne({
    where: { name: 'iyzico', isActive: true }
  });
  
  if (!provider) {
    throw new Error('iyzico sağlayıcısı bulunamadı veya aktif değil');
  }

  return provider;
}

// Helper: iyzico API instance oluştur
async function getIyzicoAPI() {
  const provider = await getActiveIyzicoProvider();
  
  const baseUrl = provider.environment === 'production'
    ? 'https://api.iyzipay.com'
    : 'https://sandbox-api.iyzipay.com';

  return {
    api: new IyzicoAPI(provider.apiKey, provider.secretKey, baseUrl),
    provider
  };
}

/**
 * 3D Secure ödeme başlat
 * POST /api/iyzico/checkout/init
 */
exports.initCheckout = async (req, res) => {
  try {
    const { planId, cardHolderName, cardNumber, expireMonth, expireYear, cvc, installment = 1 } = req.body;
    const userId = req.user.id;

    // Kullanıcı bilgilerini al
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name, phone_number')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ success: false, message: 'Kullanıcı bilgileri alınamadı' });
    }

    // Plan bilgilerini al
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      return res.status(400).json({ success: false, message: 'Plan bulunamadı' });
    }

    const { api, provider } = await getIyzicoAPI();

    // Conversation ID oluştur
    const conversationId = `LR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // iyzico 3D Secure Initialize Request
    const request = {
      locale: 'tr',
      conversationId: conversationId,
      price: planData.price.toString(),
      paidPrice: planData.price.toString(),
      currency: 'TRY',
      installment: installment,
      basketId: `basket-${conversationId}`,
      paymentChannel: 'WEB',
      paymentGroup: 'SUBSCRIPTION',
      callbackUrl: `${process.env.FRONTEND_URL || 'https://booklevel.store'}/api/iyzico/callback`,
      paymentCard: {
        cardHolderName: cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireMonth: expireMonth,
        expireYear: expireYear,
        cvc: cvc,
        registerCard: '0'
      },
      buyer: {
        id: userId,
        name: userData.full_name?.split(' ')[0] || 'Kullanıcı',
        surname: userData.full_name?.split(' ').slice(1).join(' ') || 'Lingroot',
        gsmNumber: userData.phone_number || '+905000000000',
        email: userData.email,
        identityNumber: '11111111111', // TC kimlik no zorunlu alan
        lastLoginDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].slice(0, 8),
        registrationDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toISOString().split('T')[1].slice(0, 8),
        registrationAddress: 'Türkiye',
        ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
        city: 'Istanbul',
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: userData.full_name || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Dijital Ürün - Kargo Yok'
      },
      billingAddress: {
        contactName: userData.full_name || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Dijital Ürün'
      },
      basketItems: [
        {
          id: planId,
          name: planData.name,
          category1: 'Abonelik',
          category2: 'Dijital Ürün',
          itemType: 'VIRTUAL',
          price: planData.price.toString()
        }
      ]
    };

    // İşlem kaydı oluştur (pending durumunda)
    const transaction = await CardTransaction.create({
      userId: userId,
      paymentProviderId: provider.id,
      planId: planId,
      transactionType: 'payment',
      status: 'pending',
      amount: planData.price,
      currency: 'TRY',
      installmentCount: installment,
      iyzicoConversationId: conversationId,
      threeDSecure: true,
      customerEmail: userData.email,
      customerIp: req.ip || req.connection.remoteAddress,
      metadata: { planName: planData.name }
    });

    // iyzico API çağrısı
    const response = await api.makeRequest('/payment/3dsecure/initialize', request);

    if (response.status === 'success') {
      // Transaction'ı güncelle
      await transaction.update({
        status: 'processing',
        threeDSecureId: response.paymentId
      });

      return res.json({
        success: true,
        threeDSHtmlContent: response.threeDSHtmlContent,
        transactionId: transaction.id,
        conversationId: conversationId
      });
    } else {
      // Hata durumunda transaction'ı güncelle
      await transaction.update({
        status: 'failed',
        errorCode: response.errorCode,
        errorMessage: response.errorMessage
      });

      return res.status(400).json({
        success: false,
        message: response.errorMessage || 'Ödeme başlatılamadı',
        errorCode: response.errorCode
      });
    }
  } catch (error) {
    console.error('iyzico init checkout error:', error);
    return res.status(500).json({ success: false, message: 'Ödeme işlemi başlatılamadı', error: error.message });
  }
};

/**
 * 3D Secure callback
 * POST /api/iyzico/callback
 */
exports.handleCallback = async (req, res) => {
  try {
    const { status, paymentId, conversationId, mdStatus } = req.body;

    console.log('iyzico callback received:', { status, paymentId, conversationId, mdStatus });

    // Transaction'ı bul
    const transaction = await CardTransaction.findOne({
      where: { iyzicoConversationId: conversationId }
    });

    if (!transaction) {
      console.error('Transaction not found for conversationId:', conversationId);
      return res.redirect(`${process.env.FRONTEND_URL}/checkout/result?status=error&message=Transaction_not_found`);
    }

    // mdStatus kontrolü
    if (mdStatus !== '1') {
      await transaction.update({
        status: 'failed',
        errorCode: 'MD_STATUS_FAILED',
        errorMessage: '3D Secure doğrulaması başarısız'
      });
      return res.redirect(`${process.env.FRONTEND_URL}/checkout/result?status=error&message=3D_verification_failed`);
    }

    // iyzico'dan ödeme tamamlama isteği
    const { api, provider } = await getIyzicoAPI();

    const completeRequest = {
      locale: 'tr',
      conversationId: conversationId,
      paymentId: paymentId
    };

    const response = await api.makeRequest('/payment/3dsecure/auth', completeRequest);

    if (response.status === 'success') {
      // Transaction'ı güncelle
      await transaction.update({
        status: 'completed',
        iyzicoPaymentId: response.paymentId,
        iyzicoPaymentTransactionId: response.paymentItems?.[0]?.paymentTransactionId,
        iyzicoFraudStatus: response.fraudStatus,
        cardLastFourDigits: response.lastFourDigits,
        cardType: response.cardType,
        cardAssociation: response.cardAssociation,
        cardFamily: response.cardFamily,
        binNumber: response.binNumber,
        installmentAmount: response.paidPrice / response.installment,
        commissionRate: provider.commissionRates?.creditCard || 2.49,
        processedAt: new Date(),
        rawResponse: response
      });

      // Net tutarı hesapla
      const commissionAmount = (transaction.amount * (provider.commissionRates?.creditCard || 2.49)) / 100;
      await transaction.update({
        commissionAmount: commissionAmount,
        netAmount: transaction.amount - commissionAmount
      });

      // Kullanıcı planını güncelle
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          plan: 'pro',
          plan_id: transaction.planId,
          plan_updated_at: new Date().toISOString()
        })
        .eq('id', transaction.userId);

      if (updateError) {
        console.error('Error updating user plan:', updateError);
      }

      // Subscription kaydı oluştur
      const subscription = await Subscription.create({
        userId: transaction.userId,
        planId: transaction.planId,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
        paymentMethod: 'credit_card',
        amount: transaction.amount
      });

      await transaction.update({ subscriptionId: subscription.id });

      return res.redirect(`${process.env.FRONTEND_URL}/checkout/result?status=success&transactionId=${transaction.id}`);
    } else {
      await transaction.update({
        status: 'failed',
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        rawResponse: response
      });

      return res.redirect(`${process.env.FRONTEND_URL}/checkout/result?status=error&message=${encodeURIComponent(response.errorMessage || 'Payment_failed')}`);
    }
  } catch (error) {
    console.error('iyzico callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/checkout/result?status=error&message=Server_error`);
  }
};

/**
 * İade işlemi
 * POST /api/iyzico/refund
 */
exports.refund = async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    // Transaction'ı bul
    const transaction = await CardTransaction.findByPk(transactionId);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'İşlem bulunamadı' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Sadece tamamlanmış işlemler iade edilebilir' });
    }

    const refundAmount = amount || transaction.amount;

    if (refundAmount > (transaction.amount - transaction.refundedAmount)) {
      return res.status(400).json({ success: false, message: 'İade tutarı kalan tutardan fazla olamaz' });
    }

    const { api, provider } = await getIyzicoAPI();

    const refundRequest = {
      locale: 'tr',
      conversationId: `refund-${Date.now()}`,
      paymentTransactionId: transaction.iyzicoPaymentTransactionId,
      price: refundAmount.toString(),
      currency: 'TRY',
      ip: req.ip || '127.0.0.1'
    };

    const response = await api.makeRequest('/payment/refund', refundRequest);

    if (response.status === 'success') {
      const newRefundedAmount = parseFloat(transaction.refundedAmount) + parseFloat(refundAmount);
      const newStatus = newRefundedAmount >= transaction.amount ? 'refunded' : transaction.status;

      await transaction.update({
        status: newStatus,
        refundedAmount: newRefundedAmount,
        refundedAt: new Date(),
        refundReason: reason
      });

      // Tam iade ise kullanıcı planını güncelle
      if (newStatus === 'refunded') {
        await supabase
          .from('profiles')
          .update({ plan: 'free', plan_id: null })
          .eq('id', transaction.userId);
      }

      return res.json({
        success: true,
        message: 'İade işlemi başarılı',
        refundedAmount: refundAmount,
        totalRefunded: newRefundedAmount
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.errorMessage || 'İade işlemi başarısız',
        errorCode: response.errorCode
      });
    }
  } catch (error) {
    console.error('iyzico refund error:', error);
    return res.status(500).json({ success: false, message: 'İade işlemi başarısız', error: error.message });
  }
};

/**
 * BIN sorgulama (kart tipi belirleme)
 * POST /api/iyzico/check-bin
 */
exports.checkBin = async (req, res) => {
  try {
    const { binNumber } = req.body;

    if (!binNumber || binNumber.length < 6) {
      return res.status(400).json({ success: false, message: 'Geçersiz BIN numarası' });
    }

    const { api } = await getIyzicoAPI();

    const request = {
      locale: 'tr',
      conversationId: `bin-${Date.now()}`,
      binNumber: binNumber.slice(0, 6)
    };

    const response = await api.makeRequest('/payment/bin/check', request);

    if (response.status === 'success') {
      return res.json({
        success: true,
        cardType: response.cardType,
        cardAssociation: response.cardAssociation,
        cardFamily: response.cardFamily,
        bankName: response.bankName,
        bankCode: response.bankCode,
        commercial: response.commercial
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.errorMessage || 'BIN sorgulanamadı'
      });
    }
  } catch (error) {
    console.error('iyzico check bin error:', error);
    return res.status(500).json({ success: false, message: 'BIN sorgulama hatası' });
  }
};

/**
 * Taksit seçeneklerini getir
 * POST /api/iyzico/installments
 */
exports.getInstallments = async (req, res) => {
  try {
    const { binNumber, price } = req.body;

    if (!binNumber || binNumber.length < 6) {
      return res.status(400).json({ success: false, message: 'Geçersiz BIN numarası' });
    }

    const { api } = await getIyzicoAPI();

    const request = {
      locale: 'tr',
      conversationId: `inst-${Date.now()}`,
      binNumber: binNumber.slice(0, 6),
      price: price.toString()
    };

    const response = await api.makeRequest('/payment/iyzipos/installment', request);

    if (response.status === 'success') {
      const installmentDetails = response.installmentDetails?.[0]?.installmentPrices || [];
      
      return res.json({
        success: true,
        installments: installmentDetails.map(inst => ({
          installmentNumber: inst.installmentNumber,
          totalPrice: inst.totalPrice,
          installmentPrice: inst.installmentPrice
        }))
      });
    } else {
      return res.json({
        success: true,
        installments: [{ installmentNumber: 1, totalPrice: price, installmentPrice: price }]
      });
    }
  } catch (error) {
    console.error('iyzico installments error:', error);
    return res.status(500).json({ success: false, message: 'Taksit seçenekleri alınamadı' });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * Tüm ödeme sağlayıcılarını listele
 * GET /api/admin/payment-providers
 */
exports.getAllProviders = async (req, res) => {
  try {
    const providers = await PaymentProvider.findAll({
      attributes: { exclude: ['apiKey', 'secretKey'] }, // API key'leri gizle
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Get providers error:', error);
    return res.status(500).json({ success: false, message: 'Sağlayıcılar alınamadı' });
  }
};

/**
 * Ödeme sağlayıcısı detayı
 * GET /api/admin/payment-providers/:id
 */
exports.getProviderById = async (req, res) => {
  try {
    const provider = await PaymentProvider.findByPk(req.params.id, {
      attributes: { exclude: ['secretKey'] } // Secret key'i gizle, apiKey'in bir kısmını göster
    });

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Sağlayıcı bulunamadı' });
    }

    // API key'in sadece son 4 karakterini göster
    const maskedProvider = provider.toJSON();
    if (maskedProvider.apiKey) {
      maskedProvider.apiKey = '****' + maskedProvider.apiKey.slice(-4);
    }

    return res.json({ success: true, data: maskedProvider });
  } catch (error) {
    console.error('Get provider error:', error);
    return res.status(500).json({ success: false, message: 'Sağlayıcı bilgisi alınamadı' });
  }
};

/**
 * Ödeme sağlayıcısı oluştur/güncelle
 * POST /api/admin/payment-providers
 * PUT /api/admin/payment-providers/:id
 */
exports.upsertProvider = async (req, res) => {
  try {
    const { id } = req.params || {};
    const { 
      name, displayName, isActive, isDefault, environment,
      apiKey, secretKey, baseUrl, settings, supportedFeatures, commissionRates 
    } = req.body;

    let provider;

    if (id) {
      // Güncelleme
      provider = await PaymentProvider.findByPk(id);
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Sağlayıcı bulunamadı' });
      }

      const updateData = { displayName, isActive, environment, settings, supportedFeatures, commissionRates };
      
      // API key'ler sadece değiştirilmişse güncelle
      if (apiKey && !apiKey.startsWith('****')) {
        updateData.apiKey = apiKey;
      }
      if (secretKey && !secretKey.startsWith('****')) {
        updateData.secretKey = secretKey;
      }
      if (baseUrl) {
        updateData.baseUrl = baseUrl;
      }

      await provider.update(updateData);
    } else {
      // Yeni oluştur
      provider = await PaymentProvider.create({
        name: name || 'iyzico',
        displayName: displayName || 'iyzico',
        isActive: isActive || false,
        isDefault: isDefault || false,
        environment: environment || 'sandbox',
        apiKey,
        secretKey,
        baseUrl,
        settings: settings || {},
        supportedFeatures: supportedFeatures || {},
        commissionRates: commissionRates || {}
      });
    }

    // isDefault true ise diğerlerini false yap
    if (provider.isDefault) {
      await PaymentProvider.update(
        { isDefault: false },
        { where: { id: { [require('sequelize').Op.ne]: provider.id } } }
      );
    }

    return res.json({ 
      success: true, 
      message: id ? 'Sağlayıcı güncellendi' : 'Sağlayıcı oluşturuldu',
      data: { id: provider.id }
    });
  } catch (error) {
    console.error('Upsert provider error:', error);
    return res.status(500).json({ success: false, message: 'Sağlayıcı kaydedilemedi', error: error.message });
  }
};

/**
 * Sağlayıcı bağlantı testi
 * POST /api/admin/payment-providers/:id/test
 */
exports.testProvider = async (req, res) => {
  try {
    const provider = await PaymentProvider.findByPk(req.params.id);
    
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Sağlayıcı bulunamadı' });
    }

    const baseUrl = provider.environment === 'production'
      ? 'https://api.iyzipay.com'
      : 'https://sandbox-api.iyzipay.com';

    const api = new IyzicoAPI(provider.apiKey, provider.secretKey, baseUrl);

    // Test için BIN sorgusu yap
    const testRequest = {
      locale: 'tr',
      conversationId: `test-${Date.now()}`,
      binNumber: '454360' // iyzico test BIN
    };

    const response = await api.makeRequest('/payment/bin/check', testRequest);
    const testResult = response.status === 'success';

    await provider.update({
      lastTestedAt: new Date(),
      testResult: testResult
    });

    return res.json({
      success: true,
      testResult: testResult,
      message: testResult ? 'Bağlantı başarılı' : 'Bağlantı başarısız',
      details: testResult ? { cardType: response.cardType } : { error: response.errorMessage }
    });
  } catch (error) {
    console.error('Test provider error:', error);
    return res.status(500).json({ success: false, message: 'Test başarısız', error: error.message });
  }
};

/**
 * Tüm kredi kartı işlemlerini listele (Admin)
 * GET /api/admin/card-transactions
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, userId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    const { count, rows } = await CardTransaction.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'email'] },
        { model: PaymentProvider, attributes: ['id', 'name', 'displayName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Özet istatistikler
    const stats = await CardTransaction.findAll({
      where,
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalAmount'],
        [require('sequelize').fn('SUM', require('sequelize').col('netAmount')), 'totalNetAmount'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalCount']
      ],
      raw: true
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      stats: stats[0] || {}
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ success: false, message: 'İşlemler alınamadı' });
  }
};

/**
 * İşlem detayı (Admin)
 * GET /api/admin/card-transactions/:id
 */
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await CardTransaction.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'email'] },
        { model: PaymentProvider, attributes: ['id', 'name', 'displayName'] },
        { model: Subscription }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'İşlem bulunamadı' });
    }

    return res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    return res.status(500).json({ success: false, message: 'İşlem bilgisi alınamadı' });
  }
};

/**
 * İşlem özeti/dashboard (Admin)
 * GET /api/admin/card-transactions/summary
 */
exports.getTransactionSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const Op = require('sequelize').Op;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // Duruma göre grupla
    const byStatus = await CardTransaction.findAll({
      where,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    });

    // Günlük işlemler (son 30 gün)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyTransactions = await CardTransaction.findAll({
      where: { createdAt: { [Op.gte]: last30Days } },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'amount']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']],
      raw: true
    });

    // Toplam komisyon
    const totalCommission = await CardTransaction.sum('commissionAmount', { where: { status: 'completed' } });

    return res.json({
      success: true,
      data: {
        byStatus,
        dailyTransactions,
        totalCommission: totalCommission || 0
      }
    });
  } catch (error) {
    console.error('Get transaction summary error:', error);
    return res.status(500).json({ success: false, message: 'Özet alınamadı' });
  }
};
