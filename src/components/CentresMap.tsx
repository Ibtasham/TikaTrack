import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  CollisionBehavior,
  InfoWindow,
  Map as GoogleMapView,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  Hospital,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import type { VaccinationCentre } from '../data/vaccinationCentres';
import { formatDistanceKm, haversineDistanceKm, type Coordinates } from '../lib/geo';
import {
  CENTRE_PIN_COLORS,
  formatRouteDistance,
  formatRouteDuration,
  GMP_ATTRIBUTION_ID,
  isMapsQuotaError,
  notifyMapsQuotaExceeded,
  TRAVEL_MODES,
  type NearbyGoogleClinic,
  type RouteOrigin,
  type RouteSummary,
  type TravelModeKey,
} from '../lib/googleMaps';

const BANGLADESH_DEFAULT_CENTER: Coordinates = { lat: 23.78, lng: 90.4 };
const Z_INDEX_HOVER = 999;
const Z_INDEX_SELECTED = 1000;
const LIBRARIES = ['marker', 'places', 'routes'] as const;

type SelectedItem =
  | { kind: 'centre'; centre: VaccinationCentre; distanceKm: number | null }
  | { kind: 'nearby'; clinic: NearbyGoogleClinic };

export interface CentresMapProps {
  apiKey: string;
  centres: Array<{ centre: VaccinationCentre; distanceKm: number | null }>;
  activeOrigin: RouteOrigin | null;
  selectedCentreId: string | null;
  focusTrigger: number;
  routeTarget: VaccinationCentre | null;
  travelMode: TravelModeKey;
  routeSummary: RouteSummary | null;
  onSelectCentre: (centreId: string | null) => void;
  onAreaOriginSelect: (origin: RouteOrigin | null) => void;
  onRequestRoute: (centre: VaccinationCentre) => void;
  onClearRoute: () => void;
  onTravelModeChange: (mode: TravelModeKey) => void;
  onRouteSummaryChange: (summary: RouteSummary | null) => void;
  className?: string;
}

interface CentreMarkerProps {
  centre: VaccinationCentre;
  zIndex: number;
  selected: boolean;
  onRegisterMarker: (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
  title: string;
}

function CentreMarker({
  centre,
  zIndex,
  selected,
  onRegisterMarker,
  onHoverChange,
  onSelect,
  title,
}: CentreMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    onRegisterMarker(centre.id, marker);
    return () => onRegisterMarker(centre.id, null);
  }, [centre.id, marker, onRegisterMarker]);

  if (!centre.coordinates) return null;

  const pinPalette = CENTRE_PIN_COLORS[centre.type] ?? CENTRE_PIN_COLORS.government;

  return (
    <AdvancedMarker
      ref={markerRef}
      position={centre.coordinates}
      zIndex={zIndex}
      title={title}
      collisionBehavior={CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY}
      onClick={() => onSelect(centre.id, marker)}
      onMouseEnter={() => onHoverChange(centre.id)}
      onMouseLeave={() => onHoverChange(null)}
    >
      <Pin
        background={selected ? '#111827' : pinPalette.background}
        borderColor={selected ? '#10b981' : pinPalette.borderColor}
        glyphColor={selected ? '#34d399' : pinPalette.glyphColor}
        scale={selected ? 1.2 : 1}
      />
    </AdvancedMarker>
  );
}

interface NearbyClinicMarkerProps {
  clinic: NearbyGoogleClinic;
  selected: boolean;
  onRegisterMarker: (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
  onSelect: (clinic: NearbyGoogleClinic, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
}

function NearbyClinicMarker({
  clinic,
  selected,
  onRegisterMarker,
  onSelect,
}: NearbyClinicMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    onRegisterMarker(clinic.id, marker);
    return () => onRegisterMarker(clinic.id, null);
  }, [clinic.id, marker, onRegisterMarker]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={clinic.location}
      zIndex={selected ? Z_INDEX_SELECTED : 950}
      title={clinic.name}
      onClick={() => onSelect(clinic, marker)}
    >
      <Pin
        background={selected ? '#9f1239' : '#e11d48'}
        borderColor="#881337"
        glyphColor="#fff1f2"
        scale={selected ? 1.15 : 0.9}
      />
    </AdvancedMarker>
  );
}

interface AreaAutocompleteControlProps {
  language: 'en' | 'bn';
  activeOrigin: RouteOrigin | null;
  onOriginSelect: (origin: RouteOrigin | null, viewport?: google.maps.LatLngBounds | null) => void;
}

function AreaAutocompleteControl({
  language,
  activeOrigin,
  onOriginSelect,
}: AreaAutocompleteControlProps) {
  const { t } = useI18n();
  const isBangla = language === 'bn';
  const placesLib = useMapsLibrary('places');

  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['bd'],
          language,
        });
        if (requestId !== requestIdRef.current) return;
        setSuggestions(response.suggestions ?? []);
        setIsOpen((response.suggestions ?? []).length > 0);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        if (isMapsQuotaError(error)) {
          notifyMapsQuotaExceeded();
        }
        setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [placesLib, inputValue, language]);

  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    const fallbackLabel = suggestion.placePrediction.text?.text ?? '';
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'viewport', 'formattedAddress', 'displayName'],
      });
      if (place.location) {
        const coords: Coordinates = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const label =
          (typeof place.displayName === 'string' && place.displayName) ||
          place.formattedAddress ||
          fallbackLabel;
        onOriginSelect({ coords, label, kind: 'area' }, place.viewport ?? null);
        setInputValue('');
      }
      resetSession();
    } catch (error) {
      if (isMapsQuotaError(error)) {
        notifyMapsQuotaExceeded();
      }
      resetSession();
    }
  };

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="centres-area-autocomplete">
        {t('centres.areaSearch.label')}
      </label>
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
          aria-hidden="true"
        />
        <input
          id="centres-area-autocomplete"
          type="text"
          className={`input-field pr-9 pl-9 ${isBangla ? 'font-bangla' : ''}`}
          placeholder={t('centres.areaSearch.placeholder')}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2
            className="absolute right-3 h-4 w-4 animate-spin text-emerald-600"
            aria-hidden="true"
          />
        ) : inputValue ? (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              resetSession();
            }}
            className="absolute right-2.5 rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label={t('centres.areaSearch.clearOrigin')}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label={t('centres.areaSearch.label')}
          className="absolute right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;
            const mainText = prediction.mainText?.text ?? prediction.text?.text ?? '';
            const secondaryText = prediction.secondaryText?.text ?? '';
            return (
              <li key={prediction.placeId || index}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                >
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {mainText}
                    </span>
                    {secondaryText && (
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {secondaryText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeOrigin?.kind === 'area' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="badge-done max-w-full truncate">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('centres.areaSearch.originBadge', activeOrigin.label)}</span>
          </span>
          <button
            type="button"
            className="btn-ghost btn-sm text-xs"
            onClick={() => onOriginSelect(null)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {t('centres.areaSearch.clearOrigin')}
          </button>
        </div>
      )}
    </div>
  );
}

interface RouteLayerProps {
  origin: RouteOrigin | null;
  destinationCentre: VaccinationCentre | null;
  travelMode: TravelModeKey;
  language: 'en' | 'bn';
  isDark: boolean;
  onComputingChange: (loading: boolean) => void;
  onErrorChange: (hasError: boolean) => void;
  onRouteSummaryChange: (summary: RouteSummary | null) => void;
}

function RouteLayer({
  origin,
  destinationCentre,
  travelMode,
  language,
  isDark,
  onComputingChange,
  onErrorChange,
  onRouteSummaryChange,
}: RouteLayerProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearPolylines = useCallback(() => {
    for (const poly of polylinesRef.current) {
      poly.setMap(null);
    }
    polylinesRef.current = [];
  }, []);

  useEffect(() => {
    if (!map || !routesLib || !origin || !destinationCentre?.coordinates) {
      clearPolylines();
      onComputingChange(false);
      onErrorChange(false);
      onRouteSummaryChange(null);
      return;
    }

    let cancelled = false;
    clearPolylines();
    onComputingChange(true);
    onErrorChange(false);

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin: origin.coords,
      destination: destinationCentre.coordinates,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'localizedValues'],
      language,
      region: 'BD',
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    };

    routesLib.Route.computeRoutes(request)
      .then((response) => {
        if (cancelled) return;
        const route = response?.routes?.[0];
        if (!route) {
          onComputingChange(false);
          onErrorChange(true);
          onRouteSummaryChange(null);
          return;
        }

        const polylines = route.createPolylines({
          colorScheme: isDark ? 'DARK' : 'LIGHT',
          polylineOptions: {
            strokeColor: '#059669',
            strokeOpacity: 0.92,
            strokeWeight: 5,
          },
        });
        for (const poly of polylines) {
          poly.setMap(map);
        }
        polylinesRef.current = polylines;

        if (route.viewport) {
          map.fitBounds(route.viewport, 48);
        }

        const distanceText =
          route.localizedValues?.distance ||
          formatRouteDistance(route.distanceMeters, language);
        const durationText =
          route.localizedValues?.duration ||
          formatRouteDuration(route.durationMillis, language);

        onRouteSummaryChange({
          centreId: destinationCentre.id,
          centreName: destinationCentre.name[language] || destinationCentre.name.en,
          travelMode,
          distanceText,
          durationText,
        });
        onErrorChange(false);
        onComputingChange(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isMapsQuotaError(error)) {
          notifyMapsQuotaExceeded();
        }
        onComputingChange(false);
        onErrorChange(true);
        onRouteSummaryChange(null);
      });

    return () => {
      cancelled = true;
      clearPolylines();
    };
  }, [
    map,
    routesLib,
    origin,
    destinationCentre,
    travelMode,
    language,
    isDark,
    clearPolylines,
    onComputingChange,
    onErrorChange,
    onRouteSummaryChange,
  ]);

  return null;
}

interface InnerMapProps extends CentresMapProps {
  onStatusError: () => void;
}

function InnerCentresMap({
  centres,
  activeOrigin,
  selectedCentreId,
  focusTrigger,
  routeTarget,
  travelMode,
  routeSummary,
  onSelectCentre,
  onAreaOriginSelect,
  onRequestRoute,
  onClearRoute,
  onTravelModeChange,
  onRouteSummaryChange,
  onStatusError,
}: InnerMapProps) {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isBangla = language === 'bn';

  const status = useApiLoadingStatus();
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedNearby, setSelectedNearby] = useState<NearbyGoogleClinic | null>(null);
  const [anchorMarker, setAnchorMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyClinics, setNearbyClinics] = useState<NearbyGoogleClinic[]>([]);
  const [nearbySearchedOnce, setNearbySearchedOnce] = useState(false);
  const [routeComputing, setRouteComputing] = useState(false);
  const [routeError, setRouteError] = useState(false);

  // Use plain object dict rather than `new Map()` so there is zero global identifier conflict.
  const markerDictRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      notifyMapsQuotaExceeded();
      onStatusError();
    } else if (status === APILoadingStatus.FAILED) {
      onStatusError();
    }
  }, [status, onStatusError]);

  const registerMarker = useCallback(
    (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
      if (marker) {
        markerDictRef.current[id] = marker;
      } else {
        delete markerDictRef.current[id];
      }
    },
    [],
  );

  // Sort northernmost first so southern pins layer visually in front, mirroring GMP guidance.
  const mappableCentres = useMemo(
    () =>
      centres
        .filter((item) => Boolean(item.centre.coordinates))
        .slice()
        .sort(
          (a, b) =>
            (b.centre.coordinates?.lat ?? 0) - (a.centre.coordinates?.lat ?? 0),
        ),
    [centres],
  );

  const selectedCentreEntry = useMemo(() => {
    if (!selectedCentreId) return null;
    return mappableCentres.find((item) => item.centre.id === selectedCentreId) ?? null;
  }, [mappableCentres, selectedCentreId]);

  const selectedItem: SelectedItem | null = useMemo(() => {
    if (selectedNearby) return { kind: 'nearby', clinic: selectedNearby };
    if (selectedCentreEntry) {
      return {
        kind: 'centre',
        centre: selectedCentreEntry.centre,
        distanceKm: selectedCentreEntry.distanceKm,
      };
    }
    return null;
  }, [selectedNearby, selectedCentreEntry]);

  // Sync card click ("Show on map") or initial selection with marker pan + InfoWindow anchor.
  useEffect(() => {
    if (!selectedCentreId) {
      if (!selectedNearby) setAnchorMarker(null);
      return;
    }
    const entry = mappableCentres.find((item) => item.centre.id === selectedCentreId);
    if (!entry?.centre.coordinates) return;
    setSelectedNearby(null);
    const marker = markerDictRef.current[selectedCentreId] ?? null;
    setAnchorMarker(marker);
    if (map && focusTrigger > 0) {
      map.panTo(entry.centre.coordinates);
      const currentZoom = map.getZoom() ?? 7;
      if (currentZoom < 13) {
        map.setZoom(14);
      }
    }
  }, [selectedCentreId, focusTrigger, mappableCentres, map, selectedNearby]);

  const fitBoundsToResults = useCallback(
    (viewportOverride?: google.maps.LatLngBounds | null) => {
      if (!map) return;
      if (viewportOverride) {
        map.fitBounds(viewportOverride, 40);
        return;
      }
      if (typeof google === 'undefined' || !google.maps?.LatLngBounds) return;
      const points: Coordinates[] = mappableCentres
        .map((item) => item.centre.coordinates)
        .filter((coords): coords is Coordinates => Boolean(coords));
      if (activeOrigin) points.push(activeOrigin.coords);
      if (showNearby) {
        for (const clinic of nearbyClinics) points.push(clinic.location);
      }
      if (points.length === 0) {
        map.setCenter(BANGLADESH_DEFAULT_CENTER);
        map.setZoom(7);
        return;
      }
      if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(13);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      for (const point of points) {
        bounds.extend(point);
      }
      map.fitBounds(bounds, 44);
    },
    [map, mappableCentres, activeOrigin, showNearby, nearbyClinics],
  );

  // Fit bounds when filtered centres change significantly (without disrupting an active route).
  const centreFilterKey = useMemo(
    () => mappableCentres.map((item) => item.centre.id).join(','),
    [mappableCentres],
  );

  useEffect(() => {
    if (!map || routeTarget) return;
    fitBoundsToResults();
  }, [map, centreFilterKey, routeTarget, fitBoundsToResults]);

  const handleToggleNearbyHospitals = async () => {
    if (showNearby) {
      setShowNearby(false);
      setSelectedNearby(null);
      return;
    }
    if (!placesLib) return;

    const mapCenter = map?.getCenter();
    const center: Coordinates =
      activeOrigin?.coords ??
      (mapCenter ? { lat: mapCenter.lat(), lng: mapCenter.lng() } : BANGLADESH_DEFAULT_CENTER);

    setNearbyLoading(true);
    setShowNearby(true);
    try {
      const response = await placesLib.Place.searchNearby({
        locationRestriction: { center, radius: 5000 },
        includedPrimaryTypes: ['hospital'],
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI'],
        maxResultCount: 10,
        language,
        region: 'BD',
        internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
      });

      const mapped: NearbyGoogleClinic[] = (response.places ?? [])
        .filter((place) => Boolean(place.location))
        .map((place) => ({
          id: place.id || `${place.location!.lat()}-${place.location!.lng()}`,
          name:
            (typeof place.displayName === 'string' && place.displayName) ||
            place.formattedAddress ||
            'Hospital',
          address: place.formattedAddress || '',
          location: {
            lat: place.location!.lat(),
            lng: place.location!.lng(),
          },
          googleMapsUri: place.googleMapsURI ?? undefined,
        }));

      setNearbyClinics(mapped);
      setNearbySearchedOnce(true);
    } catch (error) {
      if (isMapsQuotaError(error)) {
        notifyMapsQuotaExceeded();
      }
      setNearbyClinics([]);
      setNearbySearchedOnce(true);
    } finally {
      setNearbyLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* --- Map Toolbar: Place Autocomplete + Fit + Nearby Hospitals --- */}
      <div className="card-padded space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-start">
          <AreaAutocompleteControl
            language={language}
            activeOrigin={activeOrigin}
            onOriginSelect={(origin, viewport) => {
              onAreaOriginSelect(origin);
              if (origin && map) {
                if (viewport) map.fitBounds(viewport, 48);
                else {
                  map.panTo(origin.coords);
                  map.setZoom(13);
                }
              }
            }}
          />

          <button
            type="button"
            className="btn-secondary btn-sm whitespace-nowrap shrink-0"
            onClick={() => fitBoundsToResults()}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {t('centres.map.recenter')}
          </button>

          <button
            type="button"
            className={`${
              showNearby ? 'btn-primary' : 'btn-secondary'
            } btn-sm whitespace-nowrap shrink-0`}
            onClick={() => void handleToggleNearbyHospitals()}
            disabled={nearbyLoading || !placesLib}
          >
            {nearbyLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Hospital className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {showNearby ? t('centres.map.hideNearby') : t('centres.map.showNearby')}
          </button>
        </div>

        {/* Route summary & travel mode selector */}
        {routeTarget && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <Navigation
              className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
              aria-hidden="true"
            />
            <span className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
              {t(
                'centres.map.routeTitle',
                routeTarget.name[language] || routeTarget.name.en,
              )}
            </span>

            {!activeOrigin ? (
              <span className="text-xs text-amber-800 dark:text-amber-300">
                {t('centres.map.routeNoOrigin')}
              </span>
            ) : routeComputing ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t('centres.map.computingRoute')}
              </span>
            ) : routeError ? (
              <span className="text-xs text-amber-800 dark:text-amber-300">
                {t('centres.map.routeError')}
              </span>
            ) : routeSummary ? (
              <span className="badge-done tabular-nums">
                {routeSummary.durationText} · {routeSummary.distanceText}
              </span>
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-1">
              {TRAVEL_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onTravelModeChange(mode)}
                  className={`chip ${
                    travelMode === mode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {t(`centres.map.mode.${mode}`)}
                </button>
              ))}
              <button
                type="button"
                className="btn-ghost btn-sm ml-1"
                onClick={onClearRoute}
                aria-label={t('centres.map.clearRoute')}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t('centres.map.clearRoute')}
              </button>
            </div>
          </div>
        )}

        {showNearby && !nearbyLoading && nearbySearchedOnce && nearbyClinics.length === 0 && (
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            {t('centres.map.nearbyEmpty')}
          </p>
        )}
      </div>

      {/* --- Interactive Map Viewport (explicit non-zero height per CF2) --- */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div
          className="h-[440px] w-full lg:h-[580px]"
          role="region"
          aria-label={t('centres.map.heading')}
        >
          <GoogleMapView
            mapId="DEMO_MAP_ID"
            defaultCenter={BANGLADESH_DEFAULT_CENTER}
            defaultZoom={7}
            gestureHandling="greedy"
            colorScheme={isDark ? 'DARK' : 'LIGHT'}
            internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
            className="h-full w-full"
            onClick={() => {
              onSelectCentre(null);
              setSelectedNearby(null);
              setAnchorMarker(null);
            }}
          >
            {activeOrigin && (
              <AdvancedMarker
                position={activeOrigin.coords}
                zIndex={Z_INDEX_SELECTED + 10}
                title={activeOrigin.label || t('centres.map.userLocation')}
              >
                <Pin background="#0ea5e9" borderColor="#0369a1" glyphColor="#f0f9ff" scale={1.05} />
              </AdvancedMarker>
            )}

            {mappableCentres.map(({ centre }, index) => {
              let zIndex = index;
              if (hoveredId === centre.id) zIndex = Z_INDEX_HOVER;
              if (selectedCentreId === centre.id) zIndex = Z_INDEX_SELECTED;
              return (
                <CentreMarker
                  key={centre.id}
                  centre={centre}
                  zIndex={zIndex}
                  selected={selectedCentreId === centre.id}
                  title={centre.name[language] || centre.name.en}
                  onRegisterMarker={registerMarker}
                  onHoverChange={setHoveredId}
                  onSelect={(id, marker) => {
                    setSelectedNearby(null);
                    onSelectCentre(id);
                    setAnchorMarker(marker);
                  }}
                />
              );
            })}

            {showNearby &&
              nearbyClinics.map((clinic) => (
                <NearbyClinicMarker
                  key={clinic.id}
                  clinic={clinic}
                  selected={selectedNearby?.id === clinic.id}
                  onRegisterMarker={registerMarker}
                  onSelect={(item, marker) => {
                    onSelectCentre(null);
                    setSelectedNearby(item);
                    setAnchorMarker(marker);
                  }}
                />
              ))}

            <RouteLayer
              origin={activeOrigin}
              destinationCentre={routeTarget}
              travelMode={travelMode}
              language={language}
              isDark={isDark}
              onComputingChange={setRouteComputing}
              onErrorChange={setRouteError}
              onRouteSummaryChange={onRouteSummaryChange}
            />

            {selectedItem && anchorMarker && (
              <InfoWindow
                anchor={anchorMarker}
                pixelOffset={[0, -4]}
                onCloseClick={() => {
                  onSelectCentre(null);
                  setSelectedNearby(null);
                  setAnchorMarker(null);
                }}
              >
                {selectedItem.kind === 'centre' ? (
                  <div className="max-w-xs space-y-2 p-1 text-neutral-900">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <div>
                        <h3 className={`text-sm font-bold leading-snug ${isBangla ? 'font-bangla' : ''}`}>
                          {selectedItem.centre.name[language] || selectedItem.centre.name.en}
                        </h3>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
                          <span>{t(`centres.type.${selectedItem.centre.type}`)}</span>
                          {selectedItem.centre.verified && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {t('centres.verified')}
                            </span>
                          )}
                          {selectedItem.distanceKm !== null && (
                            <span className="font-semibold text-sky-700 tabular-nums">
                              · {t('centres.away', formatDistanceKm(selectedItem.distanceKm, language))}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <p className={`text-xs text-neutral-700 ${isBangla ? 'font-bangla' : ''}`}>
                      {selectedItem.centre.address[language] || selectedItem.centre.address.en}
                    </p>

                    {selectedItem.centre.phone[0] && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                        <a
                          href={`tel:${selectedItem.centre.phone[0].replace(/[^\d+]/g, '')}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {selectedItem.centre.phone[0]}
                        </a>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRequestRoute(selectedItem.centre)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Navigation className="h-3 w-3" aria-hidden="true" />
                        {t('centres.map.getRoute')}
                      </button>
                      <a
                        href={
                          selectedItem.centre.coordinates
                            ? `https://www.google.com/maps/search/?api=1&query=${selectedItem.centre.coordinates.lat},${selectedItem.centre.coordinates.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedItem.centre.address.en)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {t('centres.openMaps')}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xs space-y-1.5 p-1 text-neutral-900">
                    <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                      {t('centres.map.nearbyBadge')}
                    </span>
                    <h3 className="text-sm font-bold leading-snug">{selectedItem.clinic.name}</h3>
                    {selectedItem.clinic.address && (
                      <p className="text-xs text-neutral-700">{selectedItem.clinic.address}</p>
                    )}
                    {activeOrigin && (
                      <p className="text-xs font-medium text-sky-700 tabular-nums">
                        {t(
                          'centres.away',
                          formatDistanceKm(
                            haversineDistanceKm(activeOrigin.coords, selectedItem.clinic.location),
                            language,
                          ),
                        )}
                      </p>
                    )}
                    <a
                      href={
                        selectedItem.clinic.googleMapsUri ||
                        `https://www.google.com/maps/search/?api=1&query=${selectedItem.clinic.location.lat},${selectedItem.clinic.location.lng}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      {t('centres.openMaps')}
                    </a>
                  </div>
                )}
              </InfoWindow>
            )}
          </GoogleMapView>
        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-neutral-200 bg-white px-4 py-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          {(
            [
              { key: 'government', dotClass: 'bg-emerald-600' },
              { key: 'hospital', dotClass: 'bg-sky-600' },
              { key: 'private', dotClass: 'bg-indigo-600' },
              { key: 'ngo', dotClass: 'bg-amber-600' },
            ] as const
          ).map(({ key, dotClass }) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
              {t(`centres.type.${key}`)}
            </span>
          ))}
          {showNearby && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-hidden="true" />
              {t('centres.map.nearbyBadge')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CentresMap(props: CentresMapProps) {
  const { t, language } = useI18n();
  const [loadFailed, setLoadFailed] = useState(false);

  if (!props.apiKey || loadFailed) {
    return (
      <div className="card-padded flex items-start gap-3 border-amber-200 bg-amber-50/70 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <p>{t('centres.map.unavailable')}</p>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={props.apiKey}
      language={language}
      region="BD"
      libraries={[...LIBRARIES]}
    >
      <InnerCentresMap {...props} onStatusError={() => setLoadFailed(true)} />
    </APIProvider>
  );
}
