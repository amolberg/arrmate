export type DiscoveryMediaType = "movie" | "series";

export interface DiscoveryItem {
  id: number;
  mediaType: DiscoveryMediaType;
  title: string;
  overview: string;
  year: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;
  availability: number | null;
}

export interface DiscoveryPage {
  page: number;
  totalPages: number;
  totalResults: number;
  items: DiscoveryItem[];
}

export interface SeerrUser {
  id: number;
  displayName: string;
  permissions: number;
  avatarPath: string | null;
}

export interface SeerrQuotaWindow {
  days: number | null;
  limit: number | null;
  used: number;
  remaining: number | null;
  restricted: boolean;
}

export interface SeerrQuota {
  movie: SeerrQuotaWindow;
  series: SeerrQuotaWindow;
}

export interface SeerrRequestReceipt {
  id: number;
  status: "pending" | "approved" | "declined" | "unknown";
}
