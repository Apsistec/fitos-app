/**
 * Multi-Location & Franchise Management Models
 *
 * Sprint 40: Multi-Location Management
 */

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  organizationType: 'franchise' | 'multi_location' | 'single_location';
  logoUrl?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
  };
  billingEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  locationType: 'headquarters' | 'branch' | 'franchise';

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  timezone: string;

  // Contact
  phone?: string;
  email?: string;
  website?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;

  // Operating hours
  operatingHours?: {
    [day: string]: {
      open: string;
      close: string;
    };
  };

  // Status
  status: 'active' | 'inactive' | 'pending';
  openedDate?: string;
  closedDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface LocationStaff {
  id: string;
  locationId: string;
  userId: string;
  role: 'owner' | 'manager' | 'trainer' | 'front_desk';

  // Permissions
  permissions: Record<string, any>;
  canManageClients: boolean;
  canViewReports: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;

  // Employment
  employmentType?: 'full_time' | 'part_time' | 'contractor';
  hourlyRate?: number;
  startDate?: string;
  endDate?: string;

  status: 'active' | 'inactive';

  createdAt: string;
  updatedAt: string;
}

export interface FranchiseAgreement {
  id: string;
  organizationId: string;
  locationId: string;
  franchiseeId: string;

  // Agreement details
  agreementNumber: string;
  signedDate: string;
  startDate: string;
  endDate?: string;
  termYears: number;

  // Financial terms
  initialFranchiseFee: number;
  royaltyRate: number; // 0.07 = 7%
  marketingFeeRate: number; // 0.02 = 2%
  technologyFeeMonthly: number;

  // Territory
  territoryDescription?: string;
  exclusiveTerritory: boolean;
  territoryRadiusMiles?: number;

  status: 'draft' | 'active' | 'terminated' | 'expired';

  createdAt: string;
  updatedAt: string;
}

export interface RoyaltyPayment {
  id: string;
  organizationId: string;
  locationId: string;
  franchiseAgreementId?: string;

  // Payment period
  periodStart: string;
  periodEnd: string;

  // Revenue breakdown
  grossRevenue: number;
  membershipRevenue: number;
  trainingRevenue: number;
  retailRevenue: number;
  otherRevenue: number;

  // Fees
  royaltyRate: number;
  royaltyAmount: number;
  marketingFeeRate: number;
  marketingFeeAmount: number;
  technologyFee: number;
  totalFees: number;

  // Payment
  paymentStatus: 'pending' | 'processing' | 'paid' | 'overdue' | 'waived' | 'disputed';
  paymentDueDate: string;
  paymentDate?: string;
  paymentMethod?: 'ach' | 'wire' | 'check' | 'stripe' | 'manual';

  // Computed
  daysOverdue?: number;

  createdAt: string;
  updatedAt: string;
}

export interface LocationAnalytics {
  id: string;
  locationId: string;

  // Time period
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;

  // Membership metrics
  totalMembers: number;
  newMembers: number;
  canceledMembers: number;
  activeMembers: number;
  memberRetentionRate: number;

  // Revenue metrics
  grossRevenue: number;
  membershipRevenue: number;
  trainingRevenue: number;
  retailRevenue: number;
  otherRevenue: number;

  // Activity metrics
  totalWorkouts: number;
  totalClassesBooked: number;
  averageAttendanceRate: number;
  uniqueActiveClients: number;

  // Engagement metrics
  messagesSent: number;
  checkInsCompleted: number;
  nutritionLogs: number;

  // Staff metrics
  totalStaff: number;
  totalTrainers: number;

  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAnalytics {
  organizationId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  totalLocations: number;

  // Network-wide metrics
  totalMembers: number;
  totalNewMembers: number;
  totalCanceledMembers: number;
  totalActiveMembers: number;
  networkRetentionRate: number;

  // Network-wide revenue
  totalGrossRevenue: number;
  totalMembershipRevenue: number;
  totalTrainingRevenue: number;
  totalRetailRevenue: number;
  totalOtherRevenue: number;

  // Network-wide activity
  totalWorkouts: number;
  totalClassesBooked: number;
  averageAttendanceRate: number;
  totalUniqueActiveClients: number;

  // Network-wide engagement
  totalMessagesSent: number;
  totalCheckIns: number;
  totalNutritionLogs: number;

  // Network-wide staff
  totalStaff: number;
  totalTrainers: number;

  // Per-location breakdown
  locations: LocationAnalytics[];
}

export interface LocationComparison {
  metric: string;
  locations: Array<LocationAnalytics & { rank: number }>;
}

export interface RoyaltyCalculationRequest {
  locationId: string;
  periodStart: string;
  periodEnd: string;
  revenueBreakdown: {
    membershipRevenue: number;
    trainingRevenue: number;
    retailRevenue: number;
    otherRevenue: number;
  };
  royaltyRate?: number;
  marketingFeeRate?: number;
  technologyFee?: number;
}

export interface RoyaltyCalculationResponse {
  locationId: string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  membershipRevenue: number;
  trainingRevenue: number;
  retailRevenue: number;
  otherRevenue: number;
  royaltyRate: number;
  royaltyAmount: number;
  marketingFeeRate: number;
  marketingFeeAmount: number;
  technologyFee: number;
  totalFees: number;
  paymentDueDate: string;
  paymentStatus: string;
}
