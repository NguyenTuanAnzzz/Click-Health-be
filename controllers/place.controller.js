const axios = require("axios");
const HttpError = require("../models/http-error.model");

const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

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
    const searchRadius = radius ? Number(radius) : 7000;

    if (
      Number.isNaN(userLat) ||
      Number.isNaN(userLng) ||
      Number.isNaN(searchRadius) ||
      Number.isNaN(page) ||
      Number.isNaN(limit)
    ) {
      return next(new HttpError("lat, lng, radius, page and limit must be numbers", 400));
    }

    const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${searchRadius},${userLat},${userLng});
  way["amenity"="hospital"](around:${searchRadius},${userLat},${userLng});
  relation["amenity"="hospital"](around:${searchRadius},${userLat},${userLng});

  node["healthcare"="hospital"](around:${searchRadius},${userLat},${userLng});
  way["healthcare"="hospital"](around:${searchRadius},${userLat},${userLng});
  relation["healthcare"="hospital"](around:${searchRadius},${userLat},${userLng});
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

        return {
          id: item.id,
          type: item.type,
          name: item.tags?.name || "Unknown hospital",
          latitude: hospitalLat,
          longitude: hospitalLng,
          amenity: item.tags?.amenity,
          healthcare: item.tags?.healthcare,
        };
      })
      .filter((item) => item.latitude && item.longitude);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedHospitals = hospitals.slice(startIndex, endIndex);
    return res.status(200).json({
      page,
      limit,
      totalItems: hospitals.length,
      totalPages: Math.ceil(hospitals.length / limit),
      count: paginatedHospitals.length,
      hospitals: paginatedHospitals,
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