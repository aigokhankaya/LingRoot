const sequelize = require('../config/database');
const User = require('./User');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const AdminLog = require('./AdminLog');
const PaymentProvider = require('./PaymentProvider');
const CardTransaction = require('./CardTransaction');

// Initialize models
const models = {
  User,
  Subscription,
  Payment,
  AdminLog,
  PaymentProvider,
  CardTransaction
};

// Initialize associations
User.hasMany(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Payment, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });

// Tek değişiklik burada yapıldı:
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'logAdmin' });

// CardTransaction associations
User.hasMany(CardTransaction, { foreignKey: 'userId' });
CardTransaction.belongsTo(User, { foreignKey: 'userId' });

PaymentProvider.hasMany(CardTransaction, { foreignKey: 'paymentProviderId' });
CardTransaction.belongsTo(PaymentProvider, { foreignKey: 'paymentProviderId' });

Subscription.hasMany(CardTransaction, { foreignKey: 'subscriptionId' });
CardTransaction.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

module.exports = {
  sequelize,
  ...models
};
