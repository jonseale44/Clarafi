import fetch from 'node-fetch';

interface NPIPharmacy {
  number: string; // NPI number
  basic: {
    organization_name?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
  };
  addresses: Array<{
    address_purpose: string;
    address_type: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    telephone_number?: string;
    fax_number?: string;
  }>;
  taxonomies: Array<{
    desc: string;
    primary: boolean;
    code: string;
  }>;
}

export class NPIRegistryService {
  private readonly apiUrl = 'https://npiregistry.cms.hhs.gov/api';

  /**
   * Search for pharmacies in the NPI Registry
   */
  async searchPharmacies(params: {
    name?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    limit?: number;
  }): Promise<NPIPharmacy[]> {
    try {
      const queryParams = new URLSearchParams({
        version: '2.1',
        limit: (params.limit || 50).toString(),
        // Taxonomy code 3336C0003X is for Community/Retail Pharmacy
        taxonomy_description: '3336C0003X',
      });

      if (params.name) {
        queryParams.append('organization_name', params.name);
      }
      if (params.city) {
        queryParams.append('city', params.city);
      }
      if (params.state) {
        queryParams.append('state', params.state);
      }
      if (params.postalCode) {
        queryParams.append('postal_code', params.postalCode);
      }

      console.log('🔍 [NPI] Searching pharmacies with params:', queryParams.toString());
      
      const response = await fetch(`${this.apiUrl}?${queryParams}`);
      
      if (!response.ok) {
        console.error('❌ [NPI] API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const results = data.results || [];
      
      console.log(`✅ [NPI] Found ${results.length} pharmacies`);
      
      // Filter to only include actual pharmacies
      return results.filter((result: NPIPharmacy) => {
        const taxonomies = result.taxonomies || [];
        return taxonomies.some(t => 
          t.desc?.toLowerCase().includes('pharmacy') ||
          t.code?.startsWith('333') // Pharmacy taxonomy codes
        );
      });
    } catch (error) {
      console.error('❌ [NPI] Search error:', error);
      return [];
    }
  }

  /**
   * Convert NPI result to our pharmacy format
   */
  convertToPharmacy(npiResult: NPIPharmacy): {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string | null;
    fax: string | null;
    npiNumber: string;
  } | null {
    try {
      // Get the primary practice location
      const primaryAddress = npiResult.addresses?.find(
        addr => addr.address_purpose === 'LOCATION'
      ) || npiResult.addresses?.[0];

      if (!primaryAddress) {
        return null;
      }

      // Get pharmacy name
      const name = npiResult.basic.organization_name || 
                  `${npiResult.basic.first_name || ''} ${npiResult.basic.last_name || ''}`.trim();

      return {
        name,
        address: primaryAddress.address_1,
        city: primaryAddress.city,
        state: primaryAddress.state,
        zipCode: primaryAddress.postal_code,
        phone: this.formatPhoneNumber(primaryAddress.telephone_number),
        fax: this.formatPhoneNumber(primaryAddress.fax_number),
        npiNumber: npiResult.number,
      };
    } catch (error) {
      console.error('❌ [NPI] Conversion error:', error);
      return null;
    }
  }

  /**
   * Format phone/fax numbers to standard format
   */
  private formatPhoneNumber(number?: string | null): string | null {
    if (!number) return null;
    
    // Remove all non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return number;
  }

  /**
   * Search pharmacies by location using multiple search strategies
   */
  async searchByLocation(lat: number, lng: number, radiusMiles: number = 10): Promise<NPIPharmacy[]> {
    try {
      // For now, we'll use city/state search
      // In a real implementation, we'd use reverse geocoding to get city/state from lat/lng
      // Then search NPI by city/state
      
      // This is a placeholder - you'd need to implement reverse geocoding
      console.log('🔍 [NPI] Location-based search not fully implemented yet');
      return [];
    } catch (error) {
      console.error('❌ [NPI] Location search error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const npiRegistryService = new NPIRegistryService();