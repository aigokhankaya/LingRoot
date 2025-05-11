// AdminLog model for tracking admin activities
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Define association
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

module.exports = AdminLog;
