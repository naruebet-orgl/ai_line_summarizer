'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

/**
 * Organization role types
 * @type OrganizationRole
 */
export type OrganizationRole = 'org_owner' | 'org_admin' | 'org_member' | 'org_viewer';

/**
 * Platform role types
 * @type PlatformRole
 */
export type PlatformRole = 'user' | 'support' | 'super_admin';

/**
 * Organization interface
 * @interface Organization
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  limits?: {
    max_users: number;
    max_line_accounts: number;
    max_groups: number;
    max_messages_per_month: number;
    ai_summaries_enabled: boolean;
  };
  usage?: {
    current_users: number;
    current_line_accounts: number;
    current_groups: number;
    messages_this_month: number;
  };
}

/**
 * Organization membership summary
 * @interface OrganizationMembership
 */
export interface OrganizationMembership {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: string;
  role: OrganizationRole;
  is_current: boolean;
  joined_at?: string;
}

/**
 * User interface representing authenticated user data
 * @interface User
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  platform_role: PlatformRole;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  avatar_url?: string;
  organizations?: Array<{
    organization_id: string;
    role: OrganizationRole;
    joined_at?: string;
  }>;
  current_organization_id?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Authentication state interface
 * @interface AuthState
 */
export interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: OrganizationMembership[];
  is_authenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Authentication hook return type
 * @interface UseAuthReturn
 */
export interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, organization_name?: string) => Promise<{ success: boolean; error?: string }>;
  check_auth_status: () => Promise<void>;
  require_auth: () => boolean;
  clear_error: () => void;
  switch_organization: (organization_id: string) => Promise<{ success: boolean; error?: string }>;
  get_organization_role: () => OrganizationRole | null;
  is_org_admin: () => boolean;
  is_org_owner: () => boolean;
}

/**
 * Custom hook for authentication management
 * @description Provides authentication state and methods for login, logout, registration
 * @returns {UseAuthReturn} Authentication state and methods
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    organizations: [],
    is_authenticated: false,
    loading: true,
    error: null,
  });
  const router = useRouter();

  /**
   * Check authentication status by verifying token
   * @description Calls verify endpoint to check if user is authenticated
   */
  const check_auth_status = useCallback(async () => {
    console.log('🔐 Checking authentication status');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        console.log('✅ User authenticated:', data.user.email);
        setState({
          user: data.user,
          organization: data.organization || null,
          organizations: data.organizations || [],
          is_authenticated: true,
          loading: false,
          error: null,
        });
      } else {
        console.log('❌ User not authenticated');
        setState({
          user: null,
          organization: null,
          organizations: [],
          is_authenticated: false,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setState({
        user: null,
        organization: null,
        organizations: [],
        is_authenticated: false,
        loading: false,
        error: 'Failed to verify authentication',
      });
    }
  }, []);

  /**
   * Login user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise with success status and optional error message
   */
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 Attempting login for:', email);

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login successful');
        setState({
          user: data.user,
          organization: data.organization || null,
          organizations: data.organizations || [],
          is_authenticated: true,
          loading: false,
          error: null,
        });
        return { success: true };
      } else {
        console.log('❌ Login failed:', data.error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed',
        }));
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const error_message = 'Network error. Please check your connection.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: error_message,
      }));
      return { success: false, error: error_message };
    }
  }, []);

  /**
   * Register new user
   * @param name - User full name
   * @param email - User email address
   * @param password - User password
   * @param organization_name - Optional organization name
   * @returns Promise with success status and optional error message
   */
  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    organization_name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 Attempting registration for:', email);

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, organization_name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Registration successful');
        setState({
          user: data.user,
          organization: data.organization || null,
          organizations: data.organization ? [{
            id: data.organization.id,
            name: data.organization.name,
            slug: data.organization.slug,
            plan: data.organization.plan,
            role: 'org_owner' as OrganizationRole,
            is_current: true,
          }] : [],
          is_authenticated: true,
          loading: false,
          error: null,
        });
        return { success: true };
      } else {
        console.log('❌ Registration failed:', data.error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Registration failed',
        }));
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const error_message = 'Network error. Please check your connection.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: error_message,
      }));
      return { success: false, error: error_message };
    }
  }, []);

  /**
   * Logout current user
   * @description Clears authentication state and redirects to login
   */
  const logout = useCallback(async () => {
    console.log('🚪 Logging out');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setState({
        user: null,
        organization: null,
        organizations: [],
        is_authenticated: false,
        loading: false,
        error: null,
      });
      router.push('/login');
    }
  }, [router]);

  /**
   * Switch organization context
   * @param organization_id - Organization ID to switch to
   * @returns Promise with success status and optional error message
   */
  const switch_organization = useCallback(async (
    organization_id: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('🔀 Switching organization to:', organization_id);

    try {
      const response = await fetch('/api/auth/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ organization_id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Organization switched to:', data.organization?.name);
        setState(prev => ({
          ...prev,
          organization: data.organization,
          organizations: prev.organizations.map(org => ({
            ...org,
            is_current: org.id === organization_id,
          })),
        }));
        return { success: true };
      } else {
        console.log('❌ Switch organization failed:', data.error);
        return { success: false, error: data.error || 'Failed to switch organization' };
      }
    } catch (error) {
      console.error('❌ Switch organization error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  /**
   * Get current organization role
   * @returns Organization role or null if not in organization
   */
  const get_organization_role = useCallback((): OrganizationRole | null => {
    const currentOrg = state.organizations.find(org => org.is_current);
    return currentOrg?.role || null;
  }, [state.organizations]);

  /**
   * Check if user is organization admin or owner
   * @returns true if user is org_admin or org_owner
   */
  const is_org_admin = useCallback((): boolean => {
    const role = get_organization_role();
    return role === 'org_admin' || role === 'org_owner';
  }, [get_organization_role]);

  /**
   * Check if user is organization owner
   * @returns true if user is org_owner
   */
  const is_org_owner = useCallback((): boolean => {
    return get_organization_role() === 'org_owner';
  }, [get_organization_role]);

  /**
   * Check if user is authenticated, redirect to login if not
   * @returns true if authenticated or still loading, false otherwise
   */
  const require_auth = useCallback((): boolean => {
    if (state.loading) {
      return true; // Still checking
    }
    if (!state.is_authenticated) {
      router.push('/login');
      return false;
    }
    return true;
  }, [state.loading, state.is_authenticated, router]);

  /**
   * Clear current error state
   */
  const clear_error = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check auth status on mount
  useEffect(() => {
    check_auth_status();
  }, [check_auth_status]);

  return {
    user: state.user,
    organization: state.organization,
    organizations: state.organizations,
    is_authenticated: state.is_authenticated,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    register,
    check_auth_status,
    require_auth,
    clear_error,
    switch_organization,
    get_organization_role,
    is_org_admin,
    is_org_owner,
  };
}

