export interface CargoVanApiItem {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  status: string;
  [key: string]: unknown; // API may return additional fields
}

export interface CargoVanApiResponse {
  success: boolean;
  message?: string;
  data: CargoVanApiItem[];
}

export interface CargoVan {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
}
