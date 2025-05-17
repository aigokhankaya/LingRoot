const sequelize = require('../config/database');
const User = require('./User');
const Subscription = require('./Subscription');
const Payment = require('./Payment');
const AdminLog = require('./AdminLog');

// Initialize models
const models = {
  User,
  Subscription,
  Payment,
  AdminLog
};

// Initialize associations
User.hasMany(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Payment, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });

// Tek değişiklik burada yapıldı:
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'logAdmin' });

module.exports = {
  sequelize,
  ...models
};
