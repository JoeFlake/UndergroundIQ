import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Next.js
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  lat: number;
  lng: number;
  height?: string;
  width?: string;
  zoom?: number;
  workAreaGeoJSON?: any; // GeoJSON Feature or FeatureCollection
  showTooltips?: boolean;
  onPolygonClick?: (ticketNumber: string) => void;
}

// Helper: Haversine distance in meters between two lat/lng
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Bearing from center to point (degrees from north, clockwise)
function bearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

export function Map({
  lat,
  lng,
  height = "350px",
  width = "100%",
  zoom = 17,
  workAreaGeoJSON,
  showTooltips = true,
  onPolygonClick,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: false,
      }).setView([lat, lng], zoom);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri",
          maxZoom: 19,
        }
      ).addTo(mapRef.current);

      if (workAreaGeoJSON && workAreaGeoJSON.type) {
        shapeRef.current = L.geoJSON(workAreaGeoJSON, {
          style: {
            color: "blue",
            fillColor: "#0000ff",
            fillOpacity: 0.3,
            weight: 2,
            lineJoin: "round",
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const ticketNumber = feature.properties.ticketNumber;
              
              // Add tooltip if enabled
              if (showTooltips) {
                layer.bindTooltip(
                  `<div class="text-sm font-medium">Ticket: ${ticketNumber}</div>`,
                  {
                    sticky: false,
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10],
                    opacity: 0.9,
                    className: 'custom-tooltip'
                  }
                );
              }

              // Add click handler if provided
              if (onPolygonClick) {
                layer.on('click', () => {
                  onPolygonClick(ticketNumber);
                });
                // Add cursor style to indicate clickable
                layer.setStyle({ cursor: 'pointer' });
              }
            }
          }
        }).addTo(mapRef.current);
        mapRef.current.fitBounds(shapeRef.current.getBounds());
      } else {
        L.marker([lat, lng]).addTo(mapRef.current);
      }
    } else {
      // Remove previous shape if it exists
      if (shapeRef.current) {
        shapeRef.current.remove();
        shapeRef.current = null;
      }
      if (workAreaGeoJSON && workAreaGeoJSON.type) {
        shapeRef.current = L.geoJSON(workAreaGeoJSON, {
          style: {
            color: "blue",
            fillColor: "#0000ff",
            fillOpacity: 0.3,
            weight: 2,
            lineJoin: "round",
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const ticketNumber = feature.properties.ticketNumber;
              
              // Add tooltip if enabled
              if (showTooltips) {
                layer.bindTooltip(
                  `<div class="text-sm font-medium">Ticket: ${ticketNumber}</div>`,
                  {
                    sticky: false,
                    permanent: false,
                    direction: 'top',
                    offset: [0, -10],
                    opacity: 0.9,
                    className: 'custom-tooltip'
                  }
                );
              }

              // Add click handler if provided
              if (onPolygonClick) {
                layer.on('click', () => {
                  onPolygonClick(ticketNumber);
                });
                // Add cursor style to indicate clickable
                layer.setStyle({ cursor: 'pointer' });
              }
            }
          }
        }).addTo(mapRef.current);
        mapRef.current.fitBounds(shapeRef.current.getBounds());
      } else {
        mapRef.current.setView([lat, lng], zoom);
      }
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        shapeRef.current = null;
      }
    };
  }, [lat, lng, zoom, workAreaGeoJSON, showTooltips, onPolygonClick]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        height,
        width,
        borderRadius: "0.5rem",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <style>
        {`
          .leaflet-control-attribution { display: none !important; }
          .custom-tooltip {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.375rem;
            padding: 0.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            pointer-events: none;
          }
          .custom-tooltip:before {
            border-top-color: #e5e7eb !important;
            border-right-color: transparent !important;
            left: 50% !important;
            top: 100% !important;
            transform: translateX(-50%) !important;
          }
        `}
      </style>
    </div>
  );
}
