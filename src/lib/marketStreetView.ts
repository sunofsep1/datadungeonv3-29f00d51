/**
 * Compute the bearing (heading in degrees, 0=N clockwise) from one lat/lng to another.
 * Used to point the Street View camera toward the target property address.
 */
function computeBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Open Street View panorama at lat/lng; returns panorama instance or null when unavailable. */
export function loadStreetViewPanorama(
  container: HTMLElement,
  lat: number,
  lng: number,
  radiusM = 50,
): Promise<google.maps.StreetViewPanorama | null> {
  return new Promise((resolve) => {
    const service = new google.maps.StreetViewService();
    service.getPanorama({ location: { lat, lng }, radius: radiusM }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
        resolve(null);
        return;
      }
      // Point the camera from the pano position toward the target property address.
      const panoLatLng = data.location.latLng;
      const heading = computeBearing(panoLatLng.lat(), panoLatLng.lng(), lat, lng);
      const pano = new google.maps.StreetViewPanorama(container, {
        position: panoLatLng,
        pov: { heading, pitch: 0 },
        addressControl: true,
        linksControl: true,
        panControl: true,
        enableCloseButton: true,
      });
      resolve(pano);
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

/** Build a static Street View image URL at a specific POV (for saving/downloading). */
export function streetViewStaticImageUrl(
  lat: number,
  lng: number,
  apiKey: string,
  heading: number,
  pitch: number,
  size = "640x480",
): string {
  const params = new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    heading: String(Math.round(heading)),
    pitch: String(Math.round(pitch)),
    fov: "90",
    key: apiKey,
    source: "outdoor",
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
