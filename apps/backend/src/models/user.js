/**
 * User Model
 * MongoDB schema for user authentication
 * @description Handles user registration, authentication, and profile management
 */

const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  // Platform-level role (for super admins and support)
  platform_role: {
    type: String,
    enum: ['user', 'support', 'super_admin'],
    default: 'user'
  },
  // DEPRECATED: Use platform_role instead. Kept for migration compatibility.
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  // Current active organization context
  current_organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  // Quick lookup - organizations user belongs to (denormalized)
  organizations: [{
    organization_id: {
      type: Schema.Types.ObjectId,
      ref: 'Organization'
    },
    role: {
      type: String,
      enum: ['org_owner', 'org_admin', 'org_member', 'org_viewer']
    },
    joined_at: Date
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'active'
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: {
    type: String,
    select: false
  },
  email_verification_expires: {
    type: Date,
    select: false
  },
  password_reset_token: {
    type: String,
    select: false
  },
  password_reset_expires: {
    type: Date,
    select: false
  },
  last_login: {
    type: Date
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  lock_until: {
    type: Date
  },
  profile: {
    avatar_url: { type: String },
    phone: { type: String },
    timezone: { type: String, default: 'Asia/Bangkok' },
    language: { type: String, default: 'th' }
  },
  preferences: {
    notifications_email: { type: Boolean, default: true },
    notifications_push: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' }
  },
  // Link to Owner for LINE bot management (optional)
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'Owner'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ platform_role: 1 });
UserSchema.index({ current_organization_id: 1 });
UserSchema.index({ 'organizations.organization_id': 1 });
UserSchema.index({ created_at: -1 });

// Virtual for checking if account is locked
UserSchema.virtual('is_locked').get(function() {
  return !!(this.lock_until && this.lock_until > Date.now());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    console.log(`🔐 Hashing password for user: ${this.email}`);
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error(`❌ Error hashing password: ${error.message}`);
    next(error);
  }
});

// Pre-save middleware for logging
UserSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new user: ${this.email}`);
  } else {
    console.log(`📝 Updating user: ${this.email}`);
  }
  next();
});

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
UserSchema.methods.compare_password = async function(candidatePassword) {
  console.log(`🔍 Comparing password for user: ${this.email}`);
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log(`🔐 Password match result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error(`❌ Error comparing password: ${error.message}`);
    return false;
  }
};

/**
 * Generate password reset token
 * @returns {string} - Plain text reset token (hash is stored in DB)
 */
UserSchema.methods.generate_password_reset_token = function() {
  console.log(`🔑 Generating password reset token for: ${this.email}`);

  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and store in database
  this.password_reset_token = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 1 hour
  this.password_reset_expires = Date.now() + 60 * 60 * 1000;

  console.log(`✅ Password reset token generated, expires: ${this.password_reset_expires}`);

  // Return unhashed token (this is what gets sent to user)
  return resetToken;
};

/**
 * Generate email verification token
 * @returns {string} - Plain text verification token
 */
UserSchema.methods.generate_email_verification_token = function() {
  console.log(`📧 Generating email verification token for: ${this.email}`);

  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.email_verification_token = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Token expires in 24 hours
  this.email_verification_expires = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

/**
 * Increment login attempts and lock account if needed
 */
UserSchema.methods.increment_login_attempts = async function() {
  console.log(`⚠️ Incrementing login attempts for: ${this.email}`);

  // Reset attempts if lock has expired
  if (this.lock_until && this.lock_until < Date.now()) {
    this.login_attempts = 1;
    this.lock_until = undefined;
  } else {
    this.login_attempts += 1;

    // Lock account after 5 failed attempts for 2 hours
    if (this.login_attempts >= 5) {
      this.lock_until = Date.now() + 2 * 60 * 60 * 1000;
      console.log(`🔒 Account locked until: ${this.lock_until}`);
    }
  }

  return this.save();
};

/**
 * Reset login attempts after successful login
 */
UserSchema.methods.reset_login_attempts = async function() {
  console.log(`✅ Resetting login attempts for: ${this.email}`);

  this.login_attempts = 0;
  this.lock_until = undefined;
  this.last_login = new Date();

  return this.save();
};

/**
 * Get safe user object (without sensitive fields)
 * @returns {Object} - User object safe for client
 */
UserSchema.methods.to_safe_object = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    platform_role: this.platform_role,
    status: this.status,
    email_verified: this.email_verified,
    profile: this.profile,
    preferences: this.preferences,
    organizations: this.organizations,
    current_organization_id: this.current_organization_id,
    last_login: this.last_login,
    created_at: this.created_at
  };
};

/**
 * Get user's organizations with populated data
 * @returns {Promise<Array>} Array of organization memberships
 */
UserSchema.methods.get_organizations = async function() {
  console.log(`🏢 Getting organizations for user: ${this.email}`);
  const OrganizationMember = require('./organization_member');
  return OrganizationMember.get_user_memberships(this._id);
};

/**
 * Add organization to user's quick lookup array
 * @param {ObjectId} organizationId - Organization ID
 * @param {string} role - Organization role
 * @returns {Promise<User>} Updated user
 */
UserSchema.methods.add_organization = async function(organizationId, role) {
  console.log(`➕ Adding organization ${organizationId} to user ${this.email}`);

  // Check if already in array
  const exists = this.organizations.some(
    org => org.organization_id.toString() === organizationId.toString()
  );

  if (!exists) {
    this.organizations.push({
      organization_id: organizationId,
      role: role,
      joined_at: new Date()
    });

    // Set as current org if first one
    if (!this.current_organization_id) {
      this.current_organization_id = organizationId;
    }

    await this.save();
  }

  return this;
};

/**
 * Remove organization from user's quick lookup array
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<User>} Updated user
 */
UserSchema.methods.remove_organization = async function(organizationId) {
  console.log(`➖ Removing organization ${organizationId} from user ${this.email}`);

  this.organizations = this.organizations.filter(
    org => org.organization_id.toString() !== organizationId.toString()
  );

  // Clear current org if it was the removed one
  if (this.current_organization_id?.toString() === organizationId.toString()) {
    this.current_organization_id = this.organizations.length > 0
      ? this.organizations[0].organization_id
      : null;
  }

  return this.save();
};

/**
 * Update organization role in user's quick lookup array
 * @param {ObjectId} organizationId - Organization ID
 * @param {string} newRole - New organization role
 * @returns {Promise<User>} Updated user
 */
UserSchema.methods.update_organization_role = async function(organizationId, newRole) {
  console.log(`🔄 Updating org role for ${organizationId} to ${newRole}`);

  const orgIndex = this.organizations.findIndex(
    org => org.organization_id.toString() === organizationId.toString()
  );

  if (orgIndex >= 0) {
    this.organizations[orgIndex].role = newRole;
    return this.save();
  }

  return this;
};

/**
 * Switch current organization context
 * @param {ObjectId} organizationId - Organization ID to switch to
 * @returns {Promise<User>} Updated user
 */
UserSchema.methods.switch_organization = async function(organizationId) {
  console.log(`🔀 Switching org context to ${organizationId} for user ${this.email}`);

  // Verify user belongs to organization
  const isMember = this.organizations.some(
    org => org.organization_id.toString() === organizationId.toString()
  );

  if (!isMember && this.platform_role !== 'super_admin') {
    throw new Error('User is not a member of this organization');
  }

  this.current_organization_id = organizationId;
  return this.save();
};

/**
 * Get user's role in specific organization
 * @param {ObjectId} organizationId - Organization ID
 * @returns {string|null} Organization role or null if not a member
 */
UserSchema.methods.get_organization_role = function(organizationId) {
  const membership = this.organizations.find(
    org => org.organization_id.toString() === organizationId.toString()
  );
  return membership ? membership.role : null;
};

/**
 * Check if user is super admin
 * @returns {boolean} True if user is super admin
 */
UserSchema.methods.is_super_admin = function() {
  return this.platform_role === 'super_admin';
};

// Static methods

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<User>} - User document
 */
UserSchema.statics.find_by_email = function(email) {
  console.log(`🔍 Finding user by email: ${email}`);
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by email with password field
 * @param {string} email - User email
 * @returns {Promise<User>} - User document with password
 */
UserSchema.statics.find_by_email_with_password = function(email) {
  console.log(`🔍 Finding user by email (with password): ${email}`);
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find user by password reset token
 * @param {string} token - Plain text reset token
 * @returns {Promise<User>} - User document
 */
UserSchema.statics.find_by_reset_token = function(token) {
  console.log(`🔍 Finding user by reset token`);

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return this.findOne({
    password_reset_token: hashedToken,
    password_reset_expires: { $gt: Date.now() }
  }).select('+password_reset_token +password_reset_expires');
};

/**
 * Find user by email verification token
 * @param {string} token - Plain text verification token
 * @returns {Promise<User>} - User document
 */
UserSchema.statics.find_by_verification_token = function(token) {
  console.log(`🔍 Finding user by verification token`);

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return this.findOne({
    email_verification_token: hashedToken,
    email_verification_expires: { $gt: Date.now() }
  }).select('+email_verification_token +email_verification_expires');
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<User>} - Created user
 */
UserSchema.statics.create_user = async function(userData) {
  console.log(`🆕 Creating new user: ${userData.email}`);

  const user = new this({
    email: userData.email,
    password: userData.password,
    name: userData.name,
    role: userData.role || 'user',
    status: userData.status || 'active'
  });

  return user.save();
};

module.exports = model('User', UserSchema);
