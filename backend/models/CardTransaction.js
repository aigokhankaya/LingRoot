const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * CardTransaction Model
 * Kredi kartı ile yapılan tüm işlemleri kaydeder
 */
const CardTransaction = sequelize.define('CardTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // İlişkiler
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'İşlemi yapan kullanıcı'
  },
  paymentProviderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'payment_providers',
      key: 'id'
    },
    comment: 'Ödeme sağlayıcısı'
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Subscriptions',
      key: 'id'
    },
    comment: 'İlişkili abonelik (varsa)'
  },
  planId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Satın alınan plan ID'
  },
  // İşlem bilgileri
  transactionType: {
    type: DataTypes.ENUM('payment', 'refund', 'partial_refund', 'chargeback'),
    defaultValue: 'payment',
    comment: 'İşlem türü'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    comment: 'İşlem durumu'
  },
  // Tutar bilgileri
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'İşlem tutarı'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'TRY',
    comment: 'Para birimi'
  },
  // Kart bilgileri (maskelenmiş)
  cardLastFourDigits: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'Kart son 4 hanesi'
  },
  cardType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Kart tipi: VISA, MASTERCARD, TROY vb.'
  },
  cardAssociation: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Kart markası'
  },
  cardFamily: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Kart ailesi: Bonus, Maximum, World vb.'
  },
  binNumber: {
    type: DataTypes.STRING(6),
    allowNull: true,
    comment: 'Kart BIN numarası'
  },
  // Taksit bilgileri
  installmentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Taksit sayısı (1 = tek çekim)'
  },
  installmentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Taksit tutarı'
  },
  // iyzico özel alanları
  iyzicoConversationId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'iyzico conversation ID'
  },
  iyzicoPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'iyzico payment ID'
  },
  iyzicoPaymentTransactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'iyzico payment transaction ID'
  },
  iyzicoFraudStatus: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'iyzico fraud durumu'
  },
  // Stripe özel alanları
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Payment Intent ID'
  },
  stripePaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Payment ID (charge)'
  },
  stripeSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Checkout Session ID'
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Subscription ID'
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stripe Customer ID'
  },
  // 3D Secure
  threeDSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '3D Secure kullanıldı mı?'
  },
  threeDSecureId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '3D Secure işlem ID'
  },
  // Komisyon ve net tutar
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Uygulanan komisyon oranı (%)'
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Komisyon tutarı'
  },
  netAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Net tutar (komisyon sonrası)'
  },
  // Hata bilgileri
  errorCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hata kodu'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Hata mesajı'
  },
  // İade bilgileri
  refundedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'İade edilen tutar'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'İade tarihi'
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'İade sebebi'
  },
  // Müşteri bilgileri (snapshot)
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Müşteri email'
  },
  customerIp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Müşteri IP adresi'
  },
  // Meta bilgiler
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Ek meta veriler'
  },
  // Ham yanıt (debug için)
  rawResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Sağlayıcıdan gelen ham yanıt'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'İşlem tamamlanma tarihi'
  }
}, {
  timestamps: true,
  tableName: 'card_transactions',
  indexes: [
    { fields: ['userId'] },
    { fields: ['paymentProviderId'] },
    { fields: ['status'] },
    { fields: ['transactionType'] },
    { fields: ['iyzicoPaymentId'], unique: true },
    { fields: ['createdAt'] },
    { fields: ['cardLastFourDigits'] }
  ]
});

module.exports = CardTransaction;
