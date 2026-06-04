/** Open Street View panorama at lat/lng; returns false when unavailable. */
export function loadStreetViewPanorama(
  container: HTMLElement,
  lat: number,
  lng: number,
  radiusM = 50,
): Promise<boolean> {
  return new Promise((resolve) => {
    const service = new google.maps.StreetViewService();
    service.getPanorama({ location: { lat, lng }, radius: radiusM }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
        resolve(false);
        return;
      }
      new google.maps.StreetViewPanorama(container, {
        position: data.location.latLng,
        pov: { heading: 0, pitch: 0 },
        addressControl: true,
        linksControl: true,
        panControl: true,
        enableCloseButton: true,
      });
      resolve(true);
    });
  });
}

export function streetViewStaticThumbnailUrl(
  lat: number,
  lng: number,
  apiKey: string,
  size = "200x120",
): string {
  const params = new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    key: apiKey,
    source: "outdoor",
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
