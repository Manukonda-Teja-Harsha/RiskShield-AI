import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'user' | 'brand_owner' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, activeBrandId } = useStore();
  const location = useLocation();

  // 1. Unauthenticated users -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Unverified email accounts -> redirect back to login verification screen
  if (user.isEmailVerified === false) {
    return <Navigate to="/login?verify=true" state={{ from: location }} replace />;
  }

  // 3. Enforce role & authorized BrandMembership separation (Personal vs Brand Workspace)
  if (allowedRole === 'brand_owner') {
    const isBrandAuthorizedRole = user.role === 'brand_owner' || user.role === 'admin';
    const memberships = user.authorizedBrands || [];
    const hasActiveMembership = memberships.length > 0;

    if (!isBrandAuthorizedRole || !hasActiveMembership) {
      // Personal-only user or user without an active BrandMembership cannot access Brand Workspace
      return <Navigate to="/dashboard" replace />;
    }

    // Ensure the activeBrandId belongs to the user's authorizedBrandIds when memberships exist
    if (
      activeBrandId &&
      memberships.length > 0 &&
      !memberships.some((m) => m.brandId === activeBrandId) &&
      user.role !== 'admin'
    ) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
