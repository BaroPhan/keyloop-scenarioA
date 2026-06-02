/**
 * Centralized cache key builders and TTLs so producers and invalidators agree
 * on naming. Prefixes enable targeted invalidation via CacheService.delByPrefix.
 */
export const CacheKeys = {
  referencePrefix: 'ref:',
  dealerships: () => 'ref:dealerships',
  serviceTypes: () => 'ref:service-types',
  capabilities: () => 'ref:capabilities',
  baysByDealership: (id: number) => `ref:dealership:${id}:bays`,
  techniciansByDealership: (id: number) => `ref:dealership:${id}:technicians`,

  availabilityPrefix: 'availability:',
  availability: (dealershipId: number, serviceTypeId: number, startIso: string) =>
    `availability:${dealershipId}:${serviceTypeId}:${startIso}`,
  slots: (dealershipId: number, serviceTypeId: number, date: string) =>
    `availability:slots:${dealershipId}:${serviceTypeId}:${date}`,

  privilegesPrefix: 'privileges:',
  privileges: (adminId: number) => `privileges:${adminId}`,
};

export const CacheTtl = {
  reference: 300,
  availability: 15,
  privileges: 60,
};
