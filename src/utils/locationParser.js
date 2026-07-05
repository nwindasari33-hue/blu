import { OpenLocationCode } from 'open-location-code';

const _olc = new OpenLocationCode();

/**
 * Parses a location query (Plus Code, raw coords, long URL) into { lat, lng, address }
 * Throws an error if invalid or if short URL is detected.
 */
export const parseLocationQuery = async (queryStr, tomtomApiKey) => {
  if (!queryStr || !queryStr.trim()) {
    throw new Error('Query lokasi kosong.');
  }
  const query = queryStr.trim();

  // 1. Check for Short URL
  if (query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
    throw new Error('Sistem mendeteksi URL pendek Google Maps. Mohon copy-paste Titik Koordinat (Angka) dari Google Maps untuk akurasi terbaik.');
  }

  let searchLat = null;
  let searchLng = null;
  let searchAddr = null;

  // 2. Check for Long URL coordinates
  const gmapsLongRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const gmapsMatch = query.match(gmapsLongRegex);
  if (gmapsMatch) {
    searchLat = parseFloat(gmapsMatch[1]);
    searchLng = parseFloat(gmapsMatch[2]);
  }

  // 3. Check for raw coordinates: lat, lng
  if (searchLat === null) {
    const coordMatch = query.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      searchLat = parseFloat(coordMatch[1]);
      searchLng = parseFloat(coordMatch[3]);
    }
  }

  // 4. Check for Plus Code (e.g., 2Q2W+JM Pekauman)
  const plusCodeRegex = /^([A-Z0-9]{4}\+[A-Z0-9]{2,3})\s+(.+)$/i;
  const plusCodeMatch = query.match(plusCodeRegex);
  if (plusCodeMatch && searchLat === null) {
    const codePart = plusCodeMatch[1].toUpperCase();
    const addressPart = plusCodeMatch[2];
    
    // Geocode the reference address to get refLat, refLng
    const refRes = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(addressPart)}.json?key=${tomtomApiKey}&limit=1&countrySet=ID`);
    const refData = await refRes.json();
    if (refData?.results?.length > 0) {
      const refLat = refData.results[0].position.lat;
      const refLng = refData.results[0].position.lon;
      
      // Recover full plus code and decode
      const fullCode = _olc.recoverNearest(codePart, refLat, refLng);
      const decoded = _olc.decode(fullCode);
      searchLat = decoded.latitudeCenter;
      searchLng = decoded.longitudeCenter;
      searchAddr = addressPart; // Use the reference address temporarily
    } else {
      throw new Error('Gagal menemukan referensi area dari Plus Code.');
    }
  }

  if (searchLat === null || searchLng === null) {
    throw new Error('Gagal mendeteksi koordinat. Pastikan format Plus Code lengkap atau masukkan Titik Koordinat yang valid.');
  }

  // 5. Reverse Geocode to get the precise address if not perfectly set
  try {
    const revRes = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${searchLat},${searchLng}.json?key=${tomtomApiKey}`);
    const revData = await revRes.json();
    if (revData?.addresses?.[0]?.address?.freeformAddress) {
      searchAddr = revData.addresses[0].address.freeformAddress;
    } else if (!searchAddr) {
      searchAddr = `${searchLat.toFixed(5)}, ${searchLng.toFixed(5)}`;
    }
  } catch (err) {
    if (!searchAddr) searchAddr = `${searchLat.toFixed(5)}, ${searchLng.toFixed(5)}`;
  }

  return { lat: searchLat, lng: searchLng, address: searchAddr };
};
