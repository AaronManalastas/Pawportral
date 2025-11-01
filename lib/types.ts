export type Role = 'user' | 'admin';

export type Pet = {
  id: string;
  name: string;
  species: 'Dog' | 'Cat' | 'Other';
  breed: string | null;
  sex: 'Male' | 'Female' | 'Unknown';
  age_years: number | null;
  size: 'Small' | 'Medium' | 'Large';
  location: string;
  description: string | null;
  status: 'available' | 'reserved' | 'adopted';
  photo_url: string | null;
  created_at: string;
};

export type Application = {
  id: string;
  pet_id: string;
  applicant_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
};
