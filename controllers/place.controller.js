const axios = require("axios");
const HttpError = require("../models/http-error.model");

const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function buildAddressFromTags(tags) {
  if (!tags) return null;
  if (tags["addr:full"]) return tags["addr:full"];
  const streetLine = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [streetLine, tags["addr:district"] || tags["addr:suburb"], tags["addr:city"] || tags["addr:province"]].filter(
    (p) => p && String(p).trim().length > 0
  );
  return parts.length ? parts.join(", ") : null;
}

/** First usable phone from common OSM contact tags (may contain multiple numbers separated by ; or ,). */
function pickPhoneFromTags(tags) {
  if (!tags) return null;
  const raw =
    tags.phone ||
    tags["contact:phone"] ||
    tags["contact:mobile"] ||
    tags["phone:mobile"] ||
    tags["contact:whatsapp"];
  if (!raw) return null;
  const first = String(raw).split(/[;|]/)[0].trim();
  return first.length > 0 ? first : null;
}

const getNearbyHospital = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (!lat || !lng) {
      return next(new HttpError("lat and lng are required", 400));
    }

    const userLat = Number(lat);
    const userLng = Number(lng);
    const searchRadiusMeters = radius ? Number(radius) : 20000;
    const maxDistanceKm = searchRadiusMeters / 1000;

    if (
      Number.isNaN(userLat) ||
      Number.isNaN(userLng) ||
      Number.isNaN(searchRadiusMeters) ||
      Number.isNaN(page) ||
      Number.isNaN(limit)
    ) {
      return next(new HttpError("lat, lng, radius, page and limit must be numbers", 400));
    }

    const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});
  way["amenity"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});
  relation["amenity"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});

  node["healthcare"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});
  way["healthcare"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});
  relation["healthcare"="hospital"](around:${searchRadiusMeters},${userLat},${userLng});
);
out center;
`;

    const body = new URLSearchParams();
    body.append("data", query);

    const response = await axios.post(OVERPASS_URL, body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json",
        "User-Agent": "ClickHealth/1.0 contact@example.com",
      },
    });

    const hospitals = response.data.elements
      .map((item) => {
        const hospitalLat = item.lat || item.center?.lat;
        const hospitalLng = item.lon || item.center?.lon;
        if (!hospitalLat || !hospitalLng) return null;

        const distanceKm = haversineDistanceKm(userLat, userLng, hospitalLat, hospitalLng);
        if (distanceKm > maxDistanceKm + 0.05) return null;

        const tags = item.tags || {};
        const address = buildAddressFromTags(tags);

        return {
          id: `${item.type}_${item.id}`,
          osmType: item.type,
          osmId: item.id,
          name: tags.name || "Bệnh viện (chưa có tên)",
          latitude: hospitalLat,
          longitude: hospitalLng,
          address: address || "Địa chỉ đang cập nhật",
          phone: pickPhoneFromTags(tags),
          distance: Math.round(distanceKm * 10) / 10,
          amenity: tags.amenity,
          healthcare: tags.healthcare,
        };
      })
      .filter(Boolean);

    hospitals.sort((a, b) => a.distance - b.distance);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedHospitals = hospitals.slice(startIndex, endIndex);

    return res.status(200).json({
      page,
      limit,
      radiusMeters: searchRadiusMeters,
      totalItems: hospitals.length,
      totalPages: Math.max(1, Math.ceil(hospitals.length / limit)),
      count: paginatedHospitals.length,
      hospitals: paginatedHospitals,
      hospitalsInRadius: hospitals,
    });
  } catch (error) {
    return next(
      new HttpError(
        error.response?.data || error.message || "Failed to fetch hospitals",
        500
      )
    );
  }
};

exports.getNearbyHospital = getNearbyHospital;
