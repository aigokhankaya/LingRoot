const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PaymentProvider Model
 * Ödeme sağlayıcılarının (iyzico, stripe vb.) yapılandırma bilgilerini saklar
 * API anahtarları şifreli olarak saklanır
 */
const PaymentProvider = sequelize.define('PaymentProvider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Sağlayıcı adı: iyzico, stripe, paytr vb.'
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Gösterim adı: iyzico, Stripe vb.'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Sağlayıcı aktif mi?'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Varsayılan sağlayıcı mı?'
  },
  environment: {
    type: DataTypes.ENUM('sandbox', 'production'),
    defaultValue: 'sandbox',
    comment: 'Çalışma ortamı'
  },
  // iyzico için
  apiKey: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'API Key (şifreli)'
  },
  secretKey: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Secret Key (şifreli)'
  },
  baseUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'API Base URL'
  },
  // Ek ayarlar JSON olarak
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Ek sağlayıcı ayarları (3D Secure, taksit vb.)'
  },
  // Desteklenen özellikler
  supportedFeatures: {
    type: DataTypes.JSONB,
    defaultValue: {
      creditCard: true,
      installment: false,
      threeDSecure: true,
      refund: true,
      partialRefund: false,
      recurring: false
    },
    comment: 'Desteklenen özellikler'
  },
  // Komisyon oranları
  commissionRates: {
    type: DataTypes.JSONB,
    defaultValue: {
      creditCard: 2.49,
      debitCard: 1.79,
      installment: {
        2: 3.49,
        3: 4.49,
        6: 5.99,
        9: 7.49,
        12: 8.99
      }
    },
    comment: 'Komisyon oranları (%)'
  },
  lastTestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Son test tarihi'
  },
  testResult: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Son test sonucu'
  }
}, {
  timestamps: true,
  tableName: 'payment_providers',
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['isActive'] },
    { fields: ['isDefault'] }
  ]
});

module.exports = PaymentProvider;
