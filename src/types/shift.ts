export interface ShiftReport {
  id: string;
  date: string;
  shiftType?: 'day' | 'night' | string;
  brigade: string;
  supervisorName: string;
  trucksLoaded: number;
  bullsSlaughtered: number;
  meatWeightKg: number;
  meatWeightTons: number;
  avgMeatPerBullKg: number;
  truckDetails?: string;
  notes?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoFileSize?: number;
  driveFileId?: string | null;
  driveFileUrl?: string | null;
  driveFolderUrl?: string | null;
  syncedToDrive: boolean;
  verifiedByBoss: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SortField = 'date' | 'trucks' | 'bulls' | 'meatWeight' | 'avgPerBull';
export type SortOrder = 'desc' | 'asc';

export interface ShiftFilterOptions {
  searchQuery: string;
  dateRange: 'all' | 'today' | 'last7' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  shiftType: 'all' | 'day' | 'night';
  onlyWithVideo: boolean;
  brigade: string;
}
