/**
 * Authentication Routes
 * @description API routes for user authentication
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Organization = require('../models/organization');
const OrganizationMember = require('../models/organization_member');
const jwt_service = require('../services/jwt_service');

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  console.log('📝 POST /api/auth/register - Registering new user');

  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.find_by_email(email);
    if (existingUser) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create_user({
      email,
      password,
      name
    });

    // Create default organization for new user
    const orgName = req.body.organization_name || `${name}'s Organization`;
    const organization = await Organization.create({
      name: orgName,
      status: 'active',
      plan: 'free',
      created_by: user._id
    });

    console.log(`🏢 Created organization: ${organization.name} (${organization.slug})`);

    // Generate Bot Activation Code for the organization
    await organization.generate_new_activation_code();
    console.log(`🔑 Generated bot activation code: ${organization.activation_code}`);

    // Generate Member Invite Code for the organization
    await organization.generate_new_member_invite_code();
    console.log(`🎟️ Generated member invite code: ${organization.member_invite_code}`);

    // Add user as org_owner
    await OrganizationMember.add_member(
      organization._id,
      user._id,
      'org_owner',
      null // No inviter for self-registration
    );

    // Update user with organization
    await user.add_organization(organization._id, 'org_owner');

    // Generate tokens
    const tokens = jwt_service.generate_token_pair(user);

    console.log(`✅ User registered successfully: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.to_safe_object(),
      organization: organization.get_summary(),
      ...tokens
    });
  } catch (error) {
    console.error('❌ Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @description Login user
 * @access Public
 * @returns {Object} User data with tokens on success, or error with specific code
 * @error_codes MISSING_CREDENTIALS, INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_INACTIVE, DATABASE_ERROR, SERVER_ERROR
 */
router.post('/login', async (req, res) => {
  console.log('🔐 POST /api/auth/login - User login attempt');

  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        error_code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user with password
    let user;
    try {
      user = await User.find_by_email_with_password(email);
    } catch (dbError) {
      console.error('❌ Database error finding user:', dbError.message);
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable. Please try again.',
        error_code: 'DATABASE_ERROR'
      });
    }

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'No account found with this email address',
        error_code: 'USER_NOT_FOUND'
      });
    }

    // Check if account is locked
    if (user.is_locked) {
      console.log(`🔒 Account is locked: ${email}`);
      const lockTime = Math.ceil((user.lock_until - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        error: `Account is locked due to too many failed attempts. Try again in ${lockTime} minutes.`,
        error_code: 'ACCOUNT_LOCKED',
        lock_minutes: lockTime
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      console.log(`❌ Account not active: ${email}, status: ${user.status}`);
      return res.status(403).json({
        success: false,
        error: 'Your account is not active. Please contact support.',
        error_code: 'ACCOUNT_INACTIVE',
        status: user.status
      });
    }

    // Verify password
    const isPasswordValid = await user.compare_password(password);

    if (!isPasswordValid) {
      console.log(`❌ Invalid password for: ${email}`);

      // Increment login attempts (non-blocking - don't fail login if this fails)
      try {
        await user.increment_login_attempts();
      } catch (updateError) {
        console.warn('⚠️ Failed to increment login attempts (non-critical):', updateError.message);
      }

      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.',
        error_code: 'INVALID_PASSWORD'
      });
    }

    // Reset login attempts on successful login (non-blocking)
    try {
      await user.reset_login_attempts();
    } catch (updateError) {
      console.warn('⚠️ Failed to reset login attempts (non-critical):', updateError.message);
    }

    // Get user's organizations
    let memberships = [];
    try {
      memberships = await OrganizationMember.get_user_memberships(user._id);
    } catch (membershipError) {
      console.warn('⚠️ Failed to fetch memberships (non-critical):', membershipError.message);
    }

    // Get current organization details (non-blocking)
    let currentOrganization = null;
    try {
      if (user.current_organization_id) {
        currentOrganization = await Organization.findById(user.current_organization_id);
      } else if (memberships.length > 0) {
        // Auto-select first organization if none set
        currentOrganization = memberships[0].organization_id;
        user.current_organization_id = currentOrganization._id;
        // Save is non-blocking - don't fail login if DB is full
        try {
          await user.save();
        } catch (saveError) {
          console.warn('⚠️ Failed to save user current org (non-critical):', saveError.message);
        }
      }
    } catch (orgError) {
      console.warn('⚠️ Failed to fetch organization (non-critical):', orgError.message);
    }

    // Generate tokens
    const tokens = jwt_service.generate_token_pair(user);

    console.log(`✅ User logged in successfully: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.to_safe_object(),
      organization: currentOrganization?.get_summary() || null,
      organizations: memberships.map(m => ({
        id: m.organization_id._id,
        name: m.organization_id.name,
        slug: m.organization_id.slug,
        role: m.role,
        is_current: m.organization_id._id.toString() === user.current_organization_id?.toString()
      })),
      ...tokens
    });
  } catch (error) {
    console.error('❌ Login error:', error);

    // Check for MongoDB quota error
    if (error.code === 8000 || error.message?.includes('space quota')) {
      return res.status(503).json({
        success: false,
        error: 'Database storage limit reached. Please contact support.',
        error_code: 'DATABASE_QUOTA_EXCEEDED'
      });
    }

    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      error_code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @description Logout user (client-side token removal)
 * @access Public
 */
router.post('/logout', (req, res) => {
  console.log('👋 POST /api/auth/logout - User logout');

  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint can be used for logging or future token blacklisting

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token
 * @access Public (with valid refresh token)
 */
router.post('/refresh', async (req, res) => {
  console.log('🔄 POST /api/auth/refresh - Refreshing token');

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      console.log('❌ Missing refresh token');
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const payload = jwt_service.verify_token(refresh_token);

    if (!payload || payload.type !== 'refresh') {
      console.log('❌ Invalid refresh token');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Find user
    const user = await User.findById(payload.user_id);

    if (!user || user.status !== 'active') {
      console.log('❌ User not found or not active');
      return res.status(401).json({
        success: false,
        error: 'User not found or account is not active'
      });
    }

    // Generate new token pair
    const tokens = jwt_service.generate_token_pair(user);

    console.log(`✅ Token refreshed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed. Please login again.'
    });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @description Request password reset
 * @access Public
 */
router.post('/forgot-password', async (req, res) => {
  console.log('🔑 POST /api/auth/forgot-password - Password reset request');

  try {
    const { email } = req.body;

    if (!email) {
      console.log('❌ Missing email');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user
    const user = await User.find_by_email(email);

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.generate_password_reset_token();
    await user.save();

    // In production, send email with reset link
    // For now, return the token (remove in production!)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log(`✅ Password reset token generated for: ${email}`);
    console.log(`📧 Reset URL: ${resetUrl}`);

    // TODO: Send email with reset link
    // await send_email({
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   template: 'password-reset',
    //   data: { resetUrl, name: user.name }
    // });

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove in production - only for development
      ...(process.env.NODE_ENV !== 'production' && {
        debug: { resetToken, resetUrl }
      })
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request. Please try again.'
    });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @description Reset password with token
 * @access Public
 */
router.post('/reset-password', async (req, res) => {
  console.log('🔐 POST /api/auth/reset-password - Resetting password');

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      console.log('❌ Missing token or password');
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Find user by reset token
    const user = await User.find_by_reset_token(token);

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Update password
    user.password = password;
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    user.login_attempts = 0;
    user.lock_until = undefined;

    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.'
    });
  }
});

/**
 * @route GET /api/auth/verify
 * @description Verify JWT token and return user info
 * @access Private (requires valid token)
 */
router.get('/verify', async (req, res) => {
  console.log('🔍 GET /api/auth/verify - Verifying token');

  try {
    // Get token from header or cookie
    let token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Try to get from cookie
      token = req.cookies?.access_token;
    }

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const payload = jwt_service.verify_token(token);

    if (!payload || payload.type !== 'access') {
      console.log('❌ Invalid token');
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Invalid or expired token'
      });
    }

    // Find user
    const user = await User.findById(payload.user_id);

    if (!user || user.status !== 'active') {
      console.log('❌ User not found or not active');
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'User not found or account is not active'
      });
    }

    // Get user's organizations
    const memberships = await OrganizationMember.get_user_memberships(user._id);

    // Get current organization details
    let currentOrganization = null;
    if (user.current_organization_id) {
      currentOrganization = await Organization.findById(user.current_organization_id);
    } else if (memberships.length > 0) {
      // Auto-select first organization if none set
      currentOrganization = memberships[0].organization_id;
      user.current_organization_id = currentOrganization._id;
      await user.save();
    }

    console.log(`✅ Token verified for: ${user.email}`);

    res.json({
      success: true,
      authenticated: true,
      user: user.to_safe_object(),
      organization: currentOrganization?.get_summary() || null,
      organizations: memberships.map(m => ({
        id: m.organization_id._id,
        name: m.organization_id.name,
        slug: m.organization_id.slug,
        logo_url: m.organization_id.logo_url,
        plan: m.organization_id.plan,
        role: m.role,
        is_current: m.organization_id._id.toString() === user.current_organization_id?.toString()
      }))
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Token verification failed'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @description Update user profile
 * @access Private
 */
router.put('/profile', async (req, res) => {
  console.log('📝 PUT /api/auth/profile - Updating profile');

  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const payload = jwt_service.verify_token(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { name, profile, preferences } = req.body;

    // Find and update user
    const user = await User.findById(payload.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    console.log(`✅ Profile updated for: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.to_safe_object()
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

/**
 * @route PUT /api/auth/change-password
 * @description Change user password (when logged in)
 * @access Private
 */
router.put('/change-password', async (req, res) => {
  console.log('🔐 PUT /api/auth/change-password - Changing password');

  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const payload = jwt_service.verify_token(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters'
      });
    }

    // Find user with password
    const user = await User.findById(payload.user_id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.compare_password(current_password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = new_password;
    await user.save();

    console.log(`✅ Password changed for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * @route POST /api/auth/switch-organization
 * @description Switch current organization context
 * @access Private
 */
router.post('/switch-organization', async (req, res) => {
  console.log('🔀 POST /api/auth/switch-organization - Switching organization');

  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const payload = jwt_service.verify_token(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { organization_id } = req.body;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    // Find user
    const user = await User.findById(payload.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify membership (or super admin)
    const membership = await OrganizationMember.find_active_membership(
      organization_id,
      user._id
    );

    if (!membership && user.platform_role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this organization'
      });
    }

    // Switch organization
    await user.switch_organization(organization_id);

    // Get organization details
    const organization = await Organization.findById(organization_id);

    console.log(`✅ Switched to organization: ${organization.name}`);

    res.json({
      success: true,
      message: `Switched to ${organization.name}`,
      organization: organization.get_summary(),
      role: membership?.role || 'super_admin'
    });
  } catch (error) {
    console.error('❌ Switch organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch organization'
    });
  }
});

/**
 * @route GET /api/auth/organizations
 * @description Get user's organizations
 * @access Private
 */
router.get('/organizations', async (req, res) => {
  console.log('🏢 GET /api/auth/organizations - Getting user organizations');

  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const payload = jwt_service.verify_token(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Find user
    const user = await User.findById(payload.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get memberships
    const memberships = await OrganizationMember.get_user_memberships(user._id);

    res.json({
      success: true,
      organizations: memberships.map(m => ({
        id: m.organization_id._id,
        name: m.organization_id.name,
        slug: m.organization_id.slug,
        logo_url: m.organization_id.logo_url,
        plan: m.organization_id.plan,
        role: m.role,
        status: m.status,
        is_current: m.organization_id._id.toString() === user.current_organization_id?.toString(),
        joined_at: m.joined_at
      })),
      current_organization_id: user.current_organization_id
    });
  } catch (error) {
    console.error('❌ Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organizations'
    });
  }
});

module.exports = router;
